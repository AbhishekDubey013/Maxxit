import { ethers } from 'ethers';

const ORIGINAL_SAFE = '0xE9ECBddB6308036f5470826A1fdfc734cFE866b1';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

async function diagnoseOriginalSafe() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    console.log('🔍 DIAGNOSING ORIGINAL SAFE ON-CHAIN STATUS');
    console.log('═'.repeat(70));
    console.log('Safe:', ORIGINAL_SAFE);
    console.log('Module:', MODULE_ADDRESS);
    console.log('');
    
    // CHECK 1: Is module enabled on the Safe?
    console.log('📋 CHECK 1: Module Enabled Status');
    console.log('─'.repeat(70));
    
    const safeAbi = [
      'function isModuleEnabled(address module) view returns (bool)',
      'function getModulesPaginated(address start, uint256 pageSize) view returns (address[], address)'
    ];
    const safeContract = new ethers.Contract(ORIGINAL_SAFE, safeAbi, provider);
    
    try {
      const isEnabled = await safeContract.isModuleEnabled(MODULE_ADDRESS);
      console.log('Module Enabled:', isEnabled ? '✅ YES' : '❌ NO');
      
      if (!isEnabled) {
        console.log('⚠️  MODULE NOT ENABLED - This is the problem!');
      }
    } catch (error: any) {
      console.log('❌ Cannot check module status:', error.message);
    }
    
    // Check all enabled modules
    try {
      const [modules] = await safeContract.getModulesPaginated(
        '0x0000000000000000000000000000000000000001',
        10
      );
      console.log('All Enabled Modules:', modules.length > 0 ? modules : 'None');
    } catch (error: any) {
      console.log('Cannot list modules:', error.message);
    }
    console.log('');
    
    // CHECK 2: Safe balances
    console.log('📋 CHECK 2: Safe Token Balances');
    console.log('─'.repeat(70));
    
    const erc20Abi = [
      'function balanceOf(address) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)'
    ];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
    const usdcBalance = await usdcContract.balanceOf(ORIGINAL_SAFE);
    console.log('USDC Balance:', ethers.utils.formatUnits(usdcBalance, 6), 'USDC');
    
    if (usdcBalance.lt(ethers.utils.parseUnits('1', 6))) {
      console.log('⚠️  Insufficient USDC for trade (need at least 1 USDC)');
    }
    console.log('');
    
    // CHECK 3: USDC approval to Uniswap Router
    console.log('📋 CHECK 3: USDC Approval to Uniswap Router');
    console.log('─'.repeat(70));
    
    const usdcApprovalToRouter = await usdcContract.allowance(ORIGINAL_SAFE, UNISWAP_ROUTER);
    console.log('USDC → Uniswap Router:', ethers.utils.formatUnits(usdcApprovalToRouter, 6), 'USDC');
    
    if (usdcApprovalToRouter.eq(0)) {
      console.log('❌ NO APPROVAL - Safe cannot swap USDC on Uniswap');
      console.log('   This must be done through the module\'s approveTokenForDex function');
    } else if (usdcApprovalToRouter.lt(ethers.utils.parseUnits('1', 6))) {
      console.log('⚠️  Insufficient approval (need at least 1 USDC approved)');
    } else {
      console.log('✅ USDC approved to router');
    }
    console.log('');
    
    // CHECK 4: Capital initialized in module
    console.log('📋 CHECK 4: Capital Initialized in Module');
    console.log('─'.repeat(70));
    
    const moduleAbi = [
      'function getCapital(address safe) view returns (uint256)'
    ];
    const moduleContract = new ethers.Contract(MODULE_ADDRESS, moduleAbi, provider);
    
    try {
      const capital = await moduleContract.getCapital(ORIGINAL_SAFE);
      console.log('Capital in Module:', ethers.utils.formatUnits(capital, 6), 'USDC');
      
      if (capital.eq(0)) {
        console.log('❌ CAPITAL NOT INITIALIZED - Must call initializeCapital() first');
      } else {
        console.log('✅ Capital initialized');
      }
    } catch (error: any) {
      console.log('❌ Cannot check capital:', error.message);
    }
    console.log('');
    
    // CHECK 5: Executor authorization
    console.log('📋 CHECK 5: Executor Authorization in Module');
    console.log('─'.repeat(70));
    
    if (!process.env.EXECUTOR_PRIVATE_KEY) {
      console.log('⚠️  EXECUTOR_PRIVATE_KEY not found in .env');
    } else {
      const executorWallet = new ethers.Wallet(process.env.EXECUTOR_PRIVATE_KEY);
      console.log('Executor Address:', executorWallet.address);
      
      const executorAbi = [
        'function isExecutorAuthorized(address executor) view returns (bool)'
      ];
      const executorCheck = new ethers.Contract(MODULE_ADDRESS, executorAbi, provider);
      
      try {
        const isAuthorized = await executorCheck.isExecutorAuthorized(executorWallet.address);
        console.log('Executor Authorized:', isAuthorized ? '✅ YES' : '❌ NO');
      } catch (error: any) {
        console.log('Cannot check executor authorization:', error.message);
      }
    }
    console.log('');
    
    // SUMMARY
    console.log('═'.repeat(70));
    console.log('📊 DIAGNOSIS SUMMARY\n');
    
    const issues: string[] = [];
    
    try {
      const isEnabled = await safeContract.isModuleEnabled(MODULE_ADDRESS);
      if (!isEnabled) {
        issues.push('❌ Module NOT enabled on Safe');
      }
    } catch (e) {
      issues.push('⚠️  Cannot verify module status');
    }
    
    if (usdcBalance.lt(ethers.utils.parseUnits('1', 6))) {
      issues.push('❌ Insufficient USDC balance');
    }
    
    if (usdcApprovalToRouter.eq(0)) {
      issues.push('❌ USDC not approved to Uniswap Router');
    }
    
    try {
      const capital = await moduleContract.getCapital(ORIGINAL_SAFE);
      if (capital.eq(0)) {
        issues.push('❌ Capital not initialized in module');
      }
    } catch (e) {
      issues.push('⚠️  Cannot verify capital status');
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed - Safe should be able to trade');
      console.log('   The issue might be elsewhere (slippage, pool liquidity, etc)');
    } else {
      console.log('⚠️  Found', issues.length, 'issue(s):\n');
      issues.forEach(issue => console.log('  ', issue));
      console.log('\n💡 These issues prevent the Original Safe from trading.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Script Error:', error.message);
  }
}

diagnoseOriginalSafe();


import { ethers } from 'ethers';

const ORIGINAL_SAFE = '0xE9ECBddB6308036f5470826A1fdfc734cFE866b1';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const YOUR_SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';

async function checkOtherSafe() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    console.log('🔍 Checking Original Safe Address...\n');
    console.log('Original Safe:', ORIGINAL_SAFE);
    console.log('Your Safe:', YOUR_SAFE);
    console.log('Module:', MODULE_ADDRESS);
    console.log('');
    
    // Check if Safe exists
    const code = await provider.getCode(ORIGINAL_SAFE);
    if (code === '0x') {
      console.log('❌ Original Safe does NOT exist on-chain!');
      console.log('   This was probably a test/demo address.');
      return;
    }
    
    console.log('✅ Original Safe exists on-chain');
    console.log('');
    
    // Check module status
    const safeAbi = [
      'function isModuleEnabled(address module) view returns (bool)',
      'function getOwners() view returns (address[])',
      'function getThreshold() view returns (uint256)',
    ];
    
    const safeContract = new ethers.Contract(ORIGINAL_SAFE, safeAbi, provider);
    
    const isModuleEnabled = await safeContract.isModuleEnabled(MODULE_ADDRESS);
    const owners = await safeContract.getOwners();
    const threshold = await safeContract.getThreshold();
    
    console.log('📋 Module Status:');
    console.log('   Module Enabled:', isModuleEnabled ? '✅ YES' : '❌ NO');
    console.log('');
    
    console.log('👥 Safe Owners:');
    owners.forEach((owner: string, idx: number) => {
      console.log(`   ${idx + 1}. ${owner}`);
    });
    console.log('   Threshold:', threshold.toString());
    console.log('');
    
    // Check balances
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const ARB_ADDRESS = '0x912CE59144191C1204E64559FE8253a0e49E6548';
    const WETH_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
    
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
    const arbContract = new ethers.Contract(ARB_ADDRESS, erc20Abi, provider);
    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);
    
    const usdcBalance = await usdcContract.balanceOf(ORIGINAL_SAFE);
    const arbBalance = await arbContract.balanceOf(ORIGINAL_SAFE);
    const wethBalance = await wethContract.balanceOf(ORIGINAL_SAFE);
    const ethBalance = await provider.getBalance(ORIGINAL_SAFE);
    
    console.log('💰 Token Balances:');
    console.log('   USDC:', ethers.utils.formatUnits(usdcBalance, 6));
    console.log('   ARB:', ethers.utils.formatEther(arbBalance));
    console.log('   WETH:', ethers.utils.formatEther(wethBalance));
    console.log('   ETH:', ethers.utils.formatEther(ethBalance));
    console.log('');
    
    // Check if capital is initialized in module
    const moduleAbi = [
      'function getCapital(address safe) view returns (uint256 initialCapital, uint256 currentCapital, bool isInitialized)',
    ];
    
    const moduleContract = new ethers.Contract(MODULE_ADDRESS, moduleAbi, provider);
    const capital = await moduleContract.getCapital(ORIGINAL_SAFE);
    
    console.log('📊 Module Capital Status:');
    console.log('   Initialized:', capital.isInitialized ? '✅ YES' : '❌ NO');
    console.log('   Initial Capital:', ethers.utils.formatUnits(capital.initialCapital, 6), 'USDC');
    console.log('   Current Capital:', ethers.utils.formatUnits(capital.currentCapital, 6), 'USDC');
    console.log('');
    
    console.log('🎯 VERDICT:');
    if (isModuleEnabled && capital.isInitialized && usdcBalance.gt(0)) {
      console.log('   ✅ This Safe CAN trade!');
      console.log('   ✅ Module enabled');
      console.log('   ✅ Capital initialized');
      console.log('   ✅ Has USDC balance');
      console.log('');
      console.log('   💡 To test trading, you would need:');
      console.log('      1. Create a deployment record in DB for this Safe');
      console.log('      2. Create a test signal');
      console.log('      3. Execute trade via module');
    } else {
      console.log('   ⚠️ This Safe might NOT be ready to trade:');
      if (!isModuleEnabled) console.log('      - Module not enabled');
      if (!capital.isInitialized) console.log('      - Capital not initialized');
      if (usdcBalance.eq(0)) console.log('      - No USDC balance');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkOtherSafe();


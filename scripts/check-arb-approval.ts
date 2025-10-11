import { ethers } from 'ethers';

async function checkARBApproval() {
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
    const ARB_TOKEN = '0x912CE59144191C1204E64559FE8253a0e49E6548';
    const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
    const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';

    const erc20Abi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function balanceOf(address owner) view returns (uint256)',
    ];

    const arbToken = new ethers.Contract(ARB_TOKEN, erc20Abi, provider);

    console.log('🔍 Checking ARB token approval status...\n');
    
    // Check Safe's ARB balance
    const balance = await arbToken.balanceOf(SAFE_ADDRESS);
    console.log('💰 Safe ARB Balance:', ethers.utils.formatEther(balance), 'ARB');
    console.log('');

    // Check if Safe has approved Uniswap Router
    const safeToRouter = await arbToken.allowance(SAFE_ADDRESS, UNISWAP_ROUTER);
    console.log('📋 Safe → Uniswap Router:');
    console.log('   Approval:', ethers.utils.formatEther(safeToRouter), 'ARB');
    console.log('   Status:', safeToRouter.gt(0) ? '✅ APPROVED' : '❌ NOT APPROVED');
    console.log('');

    // Check if Safe has approved Module
    const safeToModule = await arbToken.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
    console.log('📋 Safe → Module:');
    console.log('   Approval:', ethers.utils.formatEther(safeToModule), 'ARB');
    console.log('   Status:', safeToModule.gt(0) ? '✅ APPROVED' : '❌ NOT APPROVED');
    console.log('');

    console.log('💡 DIAGNOSIS:');
    if (safeToRouter.eq(0)) {
      console.log('   ❌ ARB is NOT approved to Uniswap Router');
      console.log('   ⚠️  Module needs to approve ARB → Router before swapping');
    } else {
      console.log('   ✅ ARB is approved to Uniswap Router');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkARBApproval();


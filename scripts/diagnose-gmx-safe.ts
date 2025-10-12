import { ethers } from 'ethers';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

async function diagnose() {
  console.log('\n🔍 Diagnosing GMX Safe Setup\n');
  console.log('═'.repeat(60));

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

  // Check if module is enabled
  const safeAbi = ['function isModuleEnabled(address) view returns (bool)'];
  const safe = new ethers.Contract(SAFE_ADDRESS, safeAbi, provider);
  const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);

  console.log(`✅ Module Enabled: ${isEnabled ? 'YES' : 'NO ❌'}`);

  // Check USDC approval to module
  const usdcAbi = ['function allowance(address,address) view returns (uint256)'];
  const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);
  const allowance = await usdc.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
  const allowanceFormatted = ethers.utils.formatUnits(allowance, 6);

  console.log(`USDC Approval to Module: ${allowanceFormatted} USDC`);
  if (allowance.gt(0)) {
    console.log('  ✅ USDC is approved');
  } else {
    console.log('  ❌ USDC is NOT approved to module');
    console.log('  💡 This is why fee collection is failing!');
  }

  // Check module initialization status
  const moduleAbi = [
    'function getSafeStats(address) view returns (bool initialized, uint256 initialCapital, uint256 currentCapital, int256 profitLoss, uint256 profitTaken, uint256 unrealizedProfit)',
  ];
  const module = new ethers.Contract(MODULE_ADDRESS, moduleAbi, provider);
  try {
    const stats = await module.getSafeStats(SAFE_ADDRESS);
    console.log(`\nModule Status:`);
    console.log(`  Initialized: ${stats.initialized ? 'YES ✅' : 'NO ❌'}`);
    if (stats.initialized) {
      console.log(`  Initial Capital: ${ethers.utils.formatUnits(stats.initialCapital, 6)} USDC`);
    }
  } catch (error) {
    console.log('\n❌ Cannot query module stats');
  }

  console.log('\n═'.repeat(60));
  console.log('\n💡 Solution:');
  console.log('The V2 module should auto-initialize on first trade, but it\'s not working.');
  console.log('Try manually calling completeSetup() via Safe Transaction Builder.');
}

diagnose();


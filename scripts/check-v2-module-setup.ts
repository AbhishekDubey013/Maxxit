/**
 * Check V2 Module Setup Status
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = process.argv[2] || '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x20cfdc15501AF5F3B7C6cb8c067310f817904691';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY || '';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log('\n🔍 ═══════════════════════════════════════════════════════');
  console.log('   V2 MODULE SETUP CHECK');
  console.log('═══════════════════════════════════════════════════════\n');

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  
  let executorAddress = '';
  if (EXECUTOR_PRIVATE_KEY) {
    const wallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY);
    executorAddress = wallet.address;
  }

  console.log('📋 Configuration:');
  console.log(`├─ Safe: ${SAFE_ADDRESS}`);
  console.log(`├─ V2 Module: ${MODULE_ADDRESS}`);
  console.log(`└─ Executor: ${executorAddress || 'NOT SET'}\n`);

  let allGood = true;

  // Check 1: Module enabled
  console.log('═══════════════════════════════════════════════════════');
  console.log('1️⃣  Checking if V2 Module is enabled...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];
    const safe = new ethers.Contract(SAFE_ADDRESS, safeAbi, provider);
    const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);

    if (isEnabled) {
      console.log('✅ V2 Module is enabled on Safe\n');
    } else {
      console.log('❌ V2 Module is NOT enabled on Safe');
      console.log('   Fix: Enable module via Safe Settings → Modules\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check: ${error.message}\n`);
  }

  // Check 2: Capital initialized (via completeSetup)
  console.log('═══════════════════════════════════════════════════════');
  console.log('2️⃣  Checking if completeSetup() was called...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const moduleAbi = [
      'function getSafeStats(address safe) view returns (bool initialized, uint256 initial, uint256 current, int256 profitLoss, uint256 profitTaken, uint256 unrealizedProfit)'
    ];
    const module = new ethers.Contract(MODULE_ADDRESS, moduleAbi, provider);
    const stats = await module.getSafeStats(SAFE_ADDRESS);

    if (stats.initialized) {
      console.log('✅ completeSetup() was called successfully!');
      console.log(`   Initial Capital: ${ethers.utils.formatUnits(stats.initial, 6)} USDC\n`);
    } else {
      console.log('❌ completeSetup() has NOT been called yet!');
      console.log('\n   ⚠️  YOU NEED TO CALL completeSetup()!');
      console.log('\n   📋 How to call completeSetup():');
      console.log('   1. Go to Safe Transaction Builder');
      console.log(`   2. To: ${MODULE_ADDRESS}`);
      console.log('   3. ABI: completeSetup()');
      console.log('   4. Value: 0');
      console.log('   5. Execute transaction');
      console.log('\n   ✨ What this does automatically:');
      console.log('      - Approves USDC to module');
      console.log('      - Approves USDC to Uniswap');
      console.log('      - Authorizes executor as GMX subaccount');
      console.log('      - Initializes capital tracking\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check: ${error.message}\n`);
  }

  // Check 3: USDC balance
  console.log('═══════════════════════════════════════════════════════');
  console.log('3️⃣  Checking USDC balance...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract('0xaf88d065e77c8cC2239327C5EDb3A432268e5831', usdcAbi, provider);
    const balance = await usdc.balanceOf(SAFE_ADDRESS);
    const balanceFormatted = ethers.utils.formatUnits(balance, 6);

    console.log(`💰 USDC Balance: ${balanceFormatted} USDC\n`);

    if (parseFloat(balanceFormatted) < 2.2) {
      console.log('⚠️  Low balance! Need at least 2.2 USDC for testing (2 USDC + 0.2 fee)\n');
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check: ${error.message}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  if (allGood) {
    console.log('✅ ALL SETUP COMPLETE - Ready to test GMX trading!');
    console.log('\n🧪 Test with:');
    console.log(`   npx tsx scripts/test-gmx-complete-flow.ts ${SAFE_ADDRESS}\n`);
  } else {
    console.log('❌ SETUP INCOMPLETE - Complete the steps above first');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });


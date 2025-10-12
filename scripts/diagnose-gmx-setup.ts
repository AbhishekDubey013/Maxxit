/**
 * Diagnose GMX Setup Issues
 * Checks all prerequisites for GMX trading
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = process.argv[2] || '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const EXECUTOR_ADDRESS = process.env.EXECUTOR_ADDRESS || '';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6'; // GMX SubaccountRouter
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log('\n🔍 ═══════════════════════════════════════════════════════');
  console.log('   GMX SETUP DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════\n');

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

  console.log('📋 Configuration:');
  console.log(`├─ Safe: ${SAFE_ADDRESS}`);
  console.log(`├─ Module: ${MODULE_ADDRESS}`);
  console.log(`├─ Executor: ${EXECUTOR_ADDRESS || 'NOT SET'}`);
  console.log(`└─ GMX Router: ${GMX_ROUTER}\n`);

  let allGood = true;

  // Check 1: Module enabled on Safe
  console.log('═══════════════════════════════════════════════════════');
  console.log('1️⃣  Checking if Module is enabled on Safe...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];
    const safe = new ethers.Contract(SAFE_ADDRESS, safeAbi, provider);
    const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);

    if (isModuleEnabled) {
      console.log('✅ Module is enabled on Safe\n');
    } else {
      console.log('❌ Module is NOT enabled on Safe');
      console.log('   Fix: Enable module via Safe Transaction Builder\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check: ${error.message}\n`);
  }

  // Check 2: Executor authorized as GMX subaccount
  console.log('═══════════════════════════════════════════════════════');
  console.log('2️⃣  Checking if Executor is authorized as GMX subaccount...');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!EXECUTOR_ADDRESS) {
    console.log('❌ EXECUTOR_ADDRESS not set in environment');
    console.log('   Fix: Set EXECUTOR_ADDRESS in .env\n');
    allGood = false;
  } else {
    try {
      const routerAbi = ['function isSubaccount(address account, address subaccount) view returns (bool)'];
      const router = new ethers.Contract(GMX_ROUTER, routerAbi, provider);
      const isAuthorized = await router.isSubaccount(SAFE_ADDRESS, EXECUTOR_ADDRESS);

      if (isAuthorized) {
        console.log('✅ Executor is authorized as GMX subaccount\n');
      } else {
        console.log('❌ Executor is NOT authorized as GMX subaccount');
        console.log('   Fix: Run authorization script:');
        console.log(`   npx tsx scripts/authorize-gmx-subaccount.ts ${SAFE_ADDRESS}\n`);
        allGood = false;
      }
    } catch (error: any) {
      console.log(`⚠️  Could not check: ${error.message}\n`);
    }
  }

  // Check 3: USDC approved
  console.log('═══════════════════════════════════════════════════════');
  console.log('3️⃣  Checking USDC approval...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const usdcAbi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function balanceOf(address) view returns (uint256)'
    ];
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);
    
    const allowance = await usdc.allowance(SAFE_ADDRESS, MODULE_ADDRESS);
    const balance = await usdc.balanceOf(SAFE_ADDRESS);

    console.log(`USDC Balance: ${ethers.utils.formatUnits(balance, 6)} USDC`);
    console.log(`USDC Allowance: ${ethers.utils.formatUnits(allowance, 6)} USDC\n`);

    if (allowance.gt(0)) {
      console.log('✅ USDC is approved to module\n');
    } else {
      console.log('❌ USDC is NOT approved to module');
      console.log('   Fix: Approve USDC via Safe\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check: ${error.message}\n`);
  }

  // Check 4: Capital initialized
  console.log('═══════════════════════════════════════════════════════');
  console.log('4️⃣  Checking if capital is initialized...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const moduleAbi = [
      'function getSafeStats(address safe) view returns (bool initialized, uint256 initial, uint256 current, int256 profitLoss, uint256 profitTaken, uint256 unrealizedProfit)'
    ];
    const module = new ethers.Contract(MODULE_ADDRESS, moduleAbi, provider);
    const stats = await module.getSafeStats(SAFE_ADDRESS);

    if (stats.initialized) {
      console.log('✅ Capital is initialized');
      console.log(`   Initial: ${ethers.utils.formatUnits(stats.initial, 6)} USDC\n`);
    } else {
      console.log('❌ Capital is NOT initialized');
      console.log('   Fix: Call initializeCapital() via module\n');
      allGood = false;
    }
  } catch (error: any) {
    console.log(`⚠️  Could not check: ${error.message}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════');
  if (allGood) {
    console.log('✅ ALL CHECKS PASSED - Ready for GMX trading!');
  } else {
    console.log('❌ SETUP INCOMPLETE - Fix the issues above');
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error.message);
    process.exit(1);
  });


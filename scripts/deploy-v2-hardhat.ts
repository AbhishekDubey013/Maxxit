/**
 * Hardhat deployment script for MaxxitTradingModuleV2
 * 
 * Usage: npx hardhat run scripts/deploy-v2-hardhat.ts --network arbitrum
 */

import { ethers } from "hardhat";

async function main() {
  console.log('\n🚀 ═══════════════════════════════════════════════════════');
  console.log('   MAXXIT TRADING MODULE V2 DEPLOYMENT');
  console.log('═══════════════════════════════════════════════════════\n');

  const [deployer] = await ethers.getSigners();
  const balance = await deployer.getBalance();

  console.log('📋 Deploying with account:', deployer.address);
  console.log('💰 Account balance:', ethers.utils.formatEther(balance), 'ETH\n');

  if (balance.lt(ethers.utils.parseEther('0.001'))) {
    throw new Error('Insufficient balance for deployment');
  }

  // Get constructor parameters
  const executorAddress = process.env.EXECUTOR_ADDRESS || deployer.address;
  const feeReceiver = process.env.PLATFORM_FEE_RECEIVER || deployer.address;

  console.log('📋 Constructor Parameters:');
  console.log(`├─ Executor: ${executorAddress}`);
  console.log(`└─ Fee Receiver: ${feeReceiver}\n`);

  // Deploy
  console.log('⏳ Deploying MaxxitTradingModuleV2...\n');

  const MaxxitTradingModuleV2 = await ethers.getContractFactory("MaxxitTradingModuleV2");
  const module = await MaxxitTradingModuleV2.deploy(executorAddress, feeReceiver);

  await module.deployed();

  console.log('✅ MaxxitTradingModuleV2 deployed to:', module.address);
  console.log('📝 Transaction hash:', module.deployTransaction.hash);
  console.log('⛽ Gas used:', (await module.deployTransaction.wait()).gasUsed.toString(), '\n');

  // Verification info
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 VERIFY CONTRACT ON ARBISCAN:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`npx hardhat verify --network arbitrum ${module.address} ${executorAddress} ${feeReceiver}\n`);

  // Save deployment info
  const deployment = {
    address: module.address,
    txHash: module.deployTransaction.hash,
    deployer: deployer.address,
    executor: executorAddress,
    feeReceiver: feeReceiver,
    timestamp: new Date().toISOString(),
    network: 'arbitrum',
    chainId: 42161,
  };

  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 DEPLOYMENT INFO:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(JSON.stringify(deployment, null, 2));
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯 USER ONBOARDING (NEW SIMPLIFIED FLOW!):');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('OLD FLOW (4 steps):');
  console.log('  1. Enable module');
  console.log('  2. Approve USDC to module');
  console.log('  3. Initialize capital');
  console.log('  4. Authorize GMX subaccount');
  console.log('');
  console.log('NEW FLOW (2 steps!):');
  console.log('  1. Enable module on Safe');
  console.log('  2. Call completeSetup() → DONE! ✅');
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 STEP-BY-STEP INSTRUCTIONS:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('STEP 1: Enable Module');
  console.log('  1. Go to https://app.safe.global');
  console.log('  2. Select your Safe');
  console.log('  3. Settings → Modules');
  console.log('  4. Add Module:', module.address);
  console.log('  5. Confirm transaction');
  console.log('');
  console.log('STEP 2: Complete Setup (ONE TRANSACTION!)');
  console.log('  1. Go to Safe Transaction Builder app');
  console.log('  2. Enter contract interaction:');
  console.log('     To:', module.address);
  console.log('     ABI: completeSetup()');
  console.log('  3. Execute transaction');
  console.log('  4. ✅ DONE! Start trading immediately!');
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 TEST THE DEPLOYMENT:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('After onboarding, test with:');
  console.log(`  npx tsx scripts/test-gmx-complete-flow.ts <SAFE_ADDRESS>\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔧 UPDATE ENV VARIABLES:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Add to your .env file:');
  console.log(`MODULE_ADDRESS_V2=${module.address}`);
  console.log('');
  console.log('Update Railway/Vercel:');
  console.log(`  MODULE_ADDRESS=${module.address}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });


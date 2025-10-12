/**
 * Deploy MaxxitTradingModuleV2
 * 
 * NEW IN V2:
 * - completeSetup() function - ONE-CLICK setup!
 * - No more manual USDC approvals
 * - No more manual GMX authorization
 * - Better UX: Enable → Setup → Trade!
 */

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.EXECUTOR_PRIVATE_KEY;
const EXECUTOR_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const PLATFORM_FEE_RECEIVER = process.env.PLATFORM_FEE_RECEIVER;

async function main() {
  console.log('\n🚀 ═══════════════════════════════════════════════════════');
  console.log('   MAXXIT TRADING MODULE V2 DEPLOYMENT');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!DEPLOYER_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY or EXECUTOR_PRIVATE_KEY not set');
  }

  if (!EXECUTOR_KEY) {
    throw new Error('EXECUTOR_PRIVATE_KEY not set');
  }

  // Setup
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const deployer = new ethers.Wallet(DEPLOYER_KEY, provider);
  const executor = new ethers.Wallet(EXECUTOR_KEY, provider);
  
  const feeReceiver = PLATFORM_FEE_RECEIVER || executor.address;

  console.log('📋 Configuration:');
  console.log(`├─ Network: Arbitrum One`);
  console.log(`├─ Deployer: ${deployer.address}`);
  console.log(`├─ Executor: ${executor.address}`);
  console.log(`├─ Fee Receiver: ${feeReceiver}`);
  
  const balance = await deployer.getBalance();
  console.log(`└─ Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.lt(ethers.utils.parseEther('0.001'))) {
    throw new Error('Insufficient balance for deployment (need at least 0.001 ETH)');
  }

  // Read contract
  const contractPath = path.join(__dirname, '../contracts/MaxxitTradingModuleV2.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');

  console.log('📦 Compiling contract...\n');

  // In production, use Hardhat or Foundry
  // For now, we'll output the deployment parameters
  console.log('⚠️  CONTRACT COMPILATION REQUIRED\n');
  console.log('Please compile using Hardhat or Foundry:\n');
  console.log('Option A - Hardhat:');
  console.log('  npx hardhat compile');
  console.log('  npx hardhat run scripts/deploy-module-v2-hardhat.ts --network arbitrum\n');
  console.log('Option B - Foundry:');
  console.log('  forge build');
  console.log(`  forge create contracts/MaxxitTradingModuleV2.sol:MaxxitTradingModuleV2 \\`);
  console.log(`    --rpc-url ${ARBITRUM_RPC} \\`);
  console.log(`    --private-key $DEPLOYER_PRIVATE_KEY \\`);
  console.log(`    --constructor-args ${executor.address} ${feeReceiver}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 CONSTRUCTOR PARAMETERS:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`_executor: ${executor.address}`);
  console.log(`_platformFeeReceiver: ${feeReceiver}\n`);

  console.log('═══════════════════════════════════════════════════════');
  console.log('🎯 AFTER DEPLOYMENT - USER ONBOARDING:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Step 1: Enable Module on Safe');
  console.log('  - Go to Safe → Settings → Modules');
  console.log('  - Add new module: <deployed_address>');
  console.log('');
  console.log('Step 2: Complete Setup (ONE TRANSACTION!)');
  console.log('  - Go to Safe Transaction Builder');
  console.log('  - To: <deployed_address>');
  console.log('  - Data (ABI): completeSetup()');
  console.log('  - Execute transaction');
  console.log('');
  console.log('Step 3: Start Trading! 🚀');
  console.log('  - SPOT: Ready immediately');
  console.log('  - GMX: Ready immediately');
  console.log('  - No more manual approvals needed!');
  console.log('');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🔍 What completeSetup() Does:');
  console.log('✅ 1. Approves USDC to module (for fee collection)');
  console.log('✅ 2. Approves USDC to Uniswap Router (for swaps)');
  console.log('✅ 3. Authorizes executor as GMX subaccount');
  console.log('✅ 4. Initializes capital tracking\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('📚 DOCUMENTATION:');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Contract Features:');
  console.log('├─ SPOT Trading: Uniswap V3');
  console.log('├─ GMX Trading: GMX V2 Perpetuals');
  console.log('├─ Platform Fee: 0.2 USDC per trade');
  console.log('├─ Profit Share: 20% to agent owner');
  console.log('├─ Token Whitelist: Agent-specific');
  console.log('└─ Security: Non-custodial, executor can\'t steal funds\n');

  console.log('Key Functions:');
  console.log('├─ completeSetup() - One-click setup (NEW!)');
  console.log('├─ executeTrade() - Execute SPOT trade');
  console.log('├─ closePosition() - Close SPOT position');
  console.log('├─ executeFromModule() - Generic module execution (GMX)');
  console.log('├─ setTokenWhitelist() - Manage agent tokens');
  console.log('└─ getSafeStats() - Get capital stats\n');

  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('✅ Deployment script complete!\n');
    console.log('Next: Compile and deploy using Hardhat or Foundry\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });

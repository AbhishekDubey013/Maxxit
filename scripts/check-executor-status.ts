#!/usr/bin/env tsx
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';

const MODULE_ABI = [
  'function authorizedExecutor() view returns (address)',
  'function platformFeeReceiver() view returns (address)',
  'function TRADE_FEE() view returns (uint256)',
];

async function checkExecutorStatus() {
  console.log('⛽ Gasless Execution - Executor Status Check\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if EXECUTOR_PRIVATE_KEY is set
    const executorKey = process.env.EXECUTOR_PRIVATE_KEY;
    
    if (!executorKey) {
      console.log('❌ EXECUTOR_PRIVATE_KEY not found in environment\n');
      console.log('How to fix:');
      console.log('  1. Create/check .env file');
      console.log('  2. Add: EXECUTOR_PRIVATE_KEY="0x..."');
      console.log('  3. Never commit .env to git!\n');
      return;
    }

    console.log('✅ EXECUTOR_PRIVATE_KEY is configured\n');

    // Create provider and wallet
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const executorWallet = new ethers.Wallet(executorKey, provider);

    console.log('🔑 Executor Wallet:\n');
    console.log(`   Address: ${executorWallet.address}`);

    // Check ETH balance
    const ethBalance = await provider.getBalance(executorWallet.address);
    const ethFormatted = parseFloat(ethers.utils.formatEther(ethBalance));

    console.log(`   ETH Balance: ${ethFormatted.toFixed(6)} ETH\n`);

    if (ethFormatted < 0.001) {
      console.log('⚠️  Low ETH Balance!');
      console.log('   Executor needs ETH to pay gas for user trades');
      console.log('   Recommended: 0.1+ ETH for multiple trades');
      console.log(`   Get Sepolia ETH: https://sepoliafaucet.com/\n`);
    } else if (ethFormatted < 0.01) {
      console.log('⚠️  Moderate ETH Balance');
      console.log(`   Can execute ~${Math.floor(ethFormatted / 0.002)} trades`);
      console.log('   Consider adding more for sustained operation\n');
    } else {
      console.log('✅ Good ETH Balance');
      console.log(`   Can execute ~${Math.floor(ethFormatted / 0.002)} trades\n`);
    }

    // Check module configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📜 Module Configuration:\n');
    console.log(`   Module Address: ${MODULE_ADDRESS}`);

    const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, provider);

    try {
      const authorizedExecutor = await module.authorizedExecutor();
      const platformFeeReceiver = await module.platformFeeReceiver();
      const tradeFee = await module.TRADE_FEE();

      console.log(`   Authorized Executor: ${authorizedExecutor}`);
      console.log(`   Platform Fee Receiver: ${platformFeeReceiver}`);
      console.log(`   Trade Fee: ${ethers.utils.formatUnits(tradeFee, 6)} USDC\n`);

      // Check if executor is authorized
      const isAuthorized = authorizedExecutor.toLowerCase() === executorWallet.address.toLowerCase();

      if (isAuthorized) {
        console.log('✅ Executor is AUTHORIZED in module');
        console.log('   Can execute gasless trades! 🎉\n');
      } else {
        console.log('❌ Executor is NOT AUTHORIZED in module\n');
        console.log('   Module expects: ' + authorizedExecutor);
        console.log('   Your executor:  ' + executorWallet.address + '\n');
        console.log('   Action needed:');
        console.log('   1. Use the authorized executor address, OR');
        console.log('   2. Update module to authorize your executor\n');
      }

    } catch (error: any) {
      console.log('⚠️  Could not read module contract');
      console.log(`   Error: ${error.message}\n`);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Gasless Trading Summary:\n');
    console.log('   How it works:');
    console.log('   1. Users deposit USDC only (no ETH needed!) ✨');
    console.log('   2. Executor pays gas fees for all trades');
    console.log('   3. Module charges 0.2 USDC per trade');
    console.log('   4. Platform covers gas, users get perfect UX!\n');

    const tradesCapacity = Math.floor(ethFormatted / 0.002);
    console.log(`   Current Capacity: ~${tradesCapacity} trades`);
    console.log(`   Est. Gas per Trade: ~0.002 ETH (~$5-10 on mainnet)\n`);

    // Next steps
    if (ethFormatted < 0.001) {
      console.log('⚠️  Next Step: Fund executor wallet with ETH');
    } else {
      console.log('✅ Next Step: Execute trades via /api/admin/execute-trade');
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkExecutorStatus();

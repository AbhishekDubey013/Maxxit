/**
 * Check executor wallet balance
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY || '';

async function main() {
  try {
    console.log('💰 Checking Executor Wallet Balance\n');
    console.log('═══════════════════════════════════════════════\n');

    if (!EXECUTOR_PRIVATE_KEY) {
      console.log('❌ EXECUTOR_PRIVATE_KEY not found in .env');
      return;
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const executor = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);

    console.log('Executor Address:', executor.address);
    console.log('');

    // Get ETH balance
    const ethBalance = await provider.getBalance(executor.address);
    const ethBalanceFormatted = ethers.utils.formatEther(ethBalance);

    console.log('💎 ETH Balance:');
    console.log(`   ${ethBalanceFormatted} ETH`);
    
    const ethBalanceNum = parseFloat(ethBalanceFormatted);
    
    if (ethBalanceNum === 0) {
      console.log('   ❌ NO ETH! Executor cannot pay gas fees!');
    } else if (ethBalanceNum < 0.001) {
      console.log('   ⚠️  VERY LOW! Will run out soon!');
    } else if (ethBalanceNum < 0.01) {
      console.log('   ⚠️  Low - consider topping up');
    } else {
      console.log('   ✅ Sufficient for gas fees');
    }
    console.log('');

    // Estimate required ETH for upcoming trades
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    const estimatedGasPerTrade = 1000000; // ~1M gas per complex trade
    const ethPerTrade = parseFloat(ethers.utils.formatEther(gasPrice.mul(estimatedGasPerTrade)));
    const tradesRemaining = Math.floor(ethBalanceNum / ethPerTrade);

    console.log('⛽ Gas Price:', `${gasPriceGwei} gwei`);
    console.log('📊 Estimated Trades Remaining:', tradesRemaining);
    console.log('');

    console.log('═══════════════════════════════════════════════');
    console.log('💡 RECOMMENDATION');
    console.log('═══════════════════════════════════════════════\n');

    if (ethBalanceNum < 0.001) {
      console.log('🚨 URGENT: Top up executor with at least 0.01 ETH!');
      console.log(`   Send ETH to: ${executor.address}`);
    } else if (ethBalanceNum < 0.01) {
      console.log('⚠️  Consider topping up executor with 0.01-0.05 ETH');
      console.log(`   Send ETH to: ${executor.address}`);
    } else {
      console.log('✅ Executor has sufficient ETH for operations');
    }
    console.log('');

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();


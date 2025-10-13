/**
 * Check where USDC went in a close position transaction
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// From Safe UI: module_0x9A85f7140776477F1A79Ea29b7A32495636f5e20_i7577c46390f38177d5ec6897308c552ee6d05b574c0172fdf4894790814f0e5b15
// This is a module transaction, we need to find the actual executor tx

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  
  const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
  const EXECUTOR = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
  
  console.log('🔍 Checking recent close position transactions...\n');
  
  // Get latest block
  const latestBlock = await provider.getBlockNumber();
  console.log(`Latest block: ${latestBlock}`);
  
  // Check last 1000 blocks for USDC transfers
  const usdcContract = new ethers.Contract(
    USDC,
    ['event Transfer(address indexed from, address indexed to, uint256 value)'],
    provider
  );
  
  // Filter for USDC transfers FROM the Safe (these happen during closes)
  const filter = usdcContract.filters.Transfer(SAFE, null);
  
  console.log(`\n📊 USDC Transfers FROM Safe in last 10000 blocks:\n`);
  
  const events = await usdcContract.queryFilter(filter, latestBlock - 10000, latestBlock);
  
  for (const event of events.slice(-10)) {
    const { from, to, value } = event.args!;
    const amount = ethers.utils.formatUnits(value, 6);
    const isToExecutor = to.toLowerCase() === EXECUTOR.toLowerCase();
    
    console.log(`Block ${event.blockNumber}:`);
    console.log(`  From: ${from}`);
    console.log(`  To: ${to} ${isToExecutor ? '⚠️ EXECUTOR!' : '✅'}`);
    console.log(`  Amount: ${amount} USDC`);
    console.log(`  Tx: https://arbiscan.io/tx/${event.transactionHash}`);
    console.log();
  }
  
  // Also check transfers TO the Safe (profit/swaps coming back)
  const filterToSafe = usdcContract.filters.Transfer(null, SAFE);
  
  console.log(`\n📊 USDC Transfers TO Safe in last 10000 blocks:\n`);
  
  const eventsToSafe = await usdcContract.queryFilter(filterToSafe, latestBlock - 10000, latestBlock);
  
  for (const event of eventsToSafe.slice(-10)) {
    const { from, to, value } = event.args!;
    const amount = ethers.utils.formatUnits(value, 6);
    
    console.log(`Block ${event.blockNumber}:`);
    console.log(`  From: ${from}`);
    console.log(`  To: ${to}`);
    console.log(`  Amount: ${amount} USDC`);
    console.log(`  Tx: https://arbiscan.io/tx/${event.transactionHash}`);
    console.log();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


#!/usr/bin/env tsx
/**
 * Initialize capital tracking in the module
 * This is a simpler operation to test if execTransactionFromModule works
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';

const MODULE_ABI = [
  'function initializeCapital(address safe) external',
  'function isInitialized(address) view returns (bool)',
  'function initialCapital(address) view returns (uint256)',
];

async function initializeCapital() {
  console.log('🔧 Initializing capital tracking\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const executorKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!executorKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const executor = new ethers.Wallet(executorKey, provider);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, executor);

  console.log('Module:', MODULE_ADDRESS);
  console.log('Safe:', SAFE_ADDRESS);
  console.log('Executor:', executor.address);
  console.log('');

  // Check current status
  const initialized = await module.isInitialized(SAFE_ADDRESS);
  console.log('Currently Initialized:', initialized ? 'YES' : 'NO');

  if (initialized) {
    const capital = await module.initialCapital(SAFE_ADDRESS);
    console.log('Initial Capital:', ethers.utils.formatUnits(capital, 6), 'USDC');
    console.log('');
    console.log('✅ Already initialized');
    return;
  }

  console.log('');
  console.log('📝 Initializing capital...');
  
  try {
    const tx = await module.initializeCapital(SAFE_ADDRESS, {
      gasLimit: 500000,
    });
    
    console.log('   Tx sent:', tx.hash);
    console.log('   Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('   ✅ Confirmed in block', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('');
    
    // Check new status
    const newCapital = await module.initialCapital(SAFE_ADDRESS);
    console.log('✅ Capital initialized:', ethers.utils.formatUnits(newCapital, 6), 'USDC');
    
  } catch (error: any) {
    console.log('');
    console.log('❌ Transaction failed:', error.message);
    
    if (error.transaction) {
      console.log('   View on Etherscan:');
      console.log(`   https://sepolia.etherscan.io/tx/${error.transaction.hash}`);
    }
  }
}

initializeCapital().catch(console.error);

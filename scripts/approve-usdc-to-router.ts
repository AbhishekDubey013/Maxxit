#!/usr/bin/env tsx
/**
 * Pre-approve USDC to Uniswap Router
 * This is a one-time operation that allows the router to spend USDC from the Safe
 * Standard DeFi pattern: approve once, trade many times
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ROUTER_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

// Module ABI - we'll call execTransactionFromModule directly through a helper function
const MODULE_ABI = [
  'function authorizedExecutors(address) view returns (bool)',
];

const SAFE_ABI = [
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) external returns (bool success)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function approveUSDC() {
  console.log('💰 Pre-Approving USDC to Uniswap Router\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const executorKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!executorKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const executor = new ethers.Wallet(executorKey, provider);
  
  console.log('Safe:', SAFE_ADDRESS);
  console.log('USDC:', USDC_ADDRESS);
  console.log('Router:', ROUTER_ADDRESS);
  console.log('Executor:', executor.address);
  console.log('');

  // Check current allowance
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const currentAllowance = await usdc.allowance(SAFE_ADDRESS, ROUTER_ADDRESS);
  
  console.log('Current Allowance:', ethers.utils.formatUnits(currentAllowance, 6), 'USDC');
  
  if (currentAllowance.gt(ethers.utils.parseUnits('100', 6))) {
    console.log('✅ Already approved with sufficient allowance');
    console.log('');
    return;
  }

  console.log('');
  console.log('📝 Approving USDC to router...');
  console.log('   This allows the router to spend USDC from the Safe');
  console.log('   Approving: 1,000,000 USDC (effectively unlimited for testing)');
  console.log('');

  // Build approval transaction data
  const usdcInterface = new ethers.utils.Interface(ERC20_ABI);
  const approvalAmount = ethers.utils.parseUnits('1000000', 6); // 1 million USDC
  const approvalData = usdcInterface.encodeFunctionData('approve', [
    ROUTER_ADDRESS,
    approvalAmount,
  ]);

  // Execute approval through Safe's execTransactionFromModule
  // The executor can call this because the module is enabled on the Safe
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, executor);

  try {
    console.log('   Sending transaction...');
    const tx = await safe.execTransactionFromModule(
      USDC_ADDRESS,  // to: USDC contract
      0,             // value: 0 (no ETH)
      approvalData,  // data: approve(router, amount)
      0,             // operation: 0 = Call
      {
        gasLimit: 200000,
      }
    );

    console.log('   Tx sent:', tx.hash);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('   ✅ Transaction confirmed!');
      console.log('   Block:', receipt.blockNumber);
      console.log('   Gas used:', receipt.gasUsed.toString());
      console.log('');

      // Verify new allowance
      const newAllowance = await usdc.allowance(SAFE_ADDRESS, ROUTER_ADDRESS);
      console.log('✅ New Allowance:', ethers.utils.formatUnits(newAllowance, 6), 'USDC');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🎉 SUCCESS! USDC approved to Uniswap router!');
      console.log('');
      console.log('You can now execute trades without needing approval');
      console.log('in each transaction. Try the trade again! 🚀');
    } else {
      console.log('   ❌ Transaction reverted');
      console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
    }

  } catch (error: any) {
    console.log('');
    console.log('❌ Transaction failed:', error.message);
    
    if (error.transaction) {
      console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${error.transaction.hash}`);
    }
    
    console.log('');
    console.log('Possible issues:');
    console.log('  - Executor not authorized to use execTransactionFromModule');
    console.log('  - Module not enabled on Safe');
    console.log('  - Insufficient gas');
  }
}

approveUSDC().catch(console.error);

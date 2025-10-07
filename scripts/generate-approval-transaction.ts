#!/usr/bin/env tsx
/**
 * Generate USDC Approval Transaction Data
 * 
 * This creates the transaction data that can be executed through:
 * 1. Safe UI (app.safe.global)
 * 2. Or we can have the MODULE execute it
 * 
 * The issue: Only MODULES can call execTransactionFromModule, not arbitrary addresses
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ROUTER_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
];

function generateApprovalTransaction() {
  console.log('📋 USDC Approval Transaction Data\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Build approval transaction
  const usdcInterface = new ethers.utils.Interface(ERC20_ABI);
  const approvalAmount = ethers.constants.MaxUint256; // Unlimited approval
  
  const data = usdcInterface.encodeFunctionData('approve', [
    ROUTER_ADDRESS,
    approvalAmount,
  ]);

  console.log('Contract Address (to):', USDC_ADDRESS);
  console.log('Function:', 'approve(address,uint256)');
  console.log('Spender:', ROUTER_ADDRESS);
  console.log('Amount:', 'MAX_UINT256 (unlimited)');
  console.log('');
  console.log('Transaction Data:', data);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🔧 How to Execute:\n');
  console.log('Option 1: Via Safe UI (Recommended)');
  console.log('  1. Go to https://app.safe.global/');
  console.log(`  2. Connect to Safe: ${SAFE_ADDRESS}`);
  console.log('  3. Click "New Transaction" → "Contract Interaction"');
  console.log(`  4. Contract Address: ${USDC_ADDRESS}`);
  console.log('  5. ABI: Use ERC20 ABI or paste: ["function approve(address,uint256)"]');
  console.log('  6. Function: approve');
  console.log(`  7. spender: ${ROUTER_ADDRESS}`);
  console.log(`  8. amount: ${approvalAmount.toString()}`);
  console.log('  9. Submit and sign with Safe owners');
  console.log('');
  
  console.log('Option 2: Via Module (if we add a helper function)');
  console.log('  We would need to add a function to the module that allows');
  console.log('  authorized executors to approve tokens');
  console.log('');
  
  console.log('Option 3: Remove approval requirement');
  console.log('  Modify the module to not require separate approval');
  console.log('  (The swap might handle approval internally)');
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚡ Quick Summary:\n');
  console.log('The Safe needs to approve USDC to the Uniswap router.');
  console.log('This is a standard one-time operation in DeFi.');
  console.log('Once approved, all trades will work without needing');
  console.log('approval in each transaction!');
  console.log('');
  console.log('Easiest path: Use Safe UI to approve (takes 2 minutes)');
}

generateApprovalTransaction();

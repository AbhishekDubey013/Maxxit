#!/usr/bin/env tsx
/**
 * Approve USDC as Safe Owner
 * 
 * If the executor is an OWNER of the Safe (not just authorized for the module),
 * we can execute transactions directly through the Safe, not via the module.
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const ROUTER_ADDRESS = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

const SAFE_ABI = [
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes signatures) payable returns (bool)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

async function approveAsOwner() {
  console.log('🔑 Approving USDC as Safe Owner\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const executorKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!executorKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const executor = new ethers.Wallet(executorKey, provider);
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

  console.log('Safe:', SAFE_ADDRESS);
  console.log('Executor:', executor.address);
  console.log('');

  // Check if executor is an owner
  const owners = await safe.getOwners();
  const threshold = await safe.getThreshold();
  
  console.log('Safe Owners:', owners);
  console.log('Threshold:', threshold.toString());
  console.log('');

  const isOwner = owners.map((o: string) => o.toLowerCase()).includes(executor.address.toLowerCase());
  
  if (!isOwner) {
    console.log('❌ Executor is NOT a Safe owner!');
    console.log('');
    console.log('Options:');
    console.log('  1. Use Safe UI with actual owner wallet');
    console.log('  2. Add executor as Safe owner');
    console.log('  3. Use module (but need to add approval function)');
    return;
  }

  console.log('✅ Executor IS a Safe owner!');
  console.log('');

  if (threshold.gt(1)) {
    console.log('⚠️  This is a multi-sig Safe (threshold > 1)');
    console.log('   Need', threshold.toString(), 'signatures');
    console.log('   Use Safe UI for multi-sig transactions');
    console.log('');
    return;
  }

  console.log('✅ This is a 1/1 Safe - can execute directly!');
  console.log('');

  // Check current allowance
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const currentAllowance = await usdc.allowance(SAFE_ADDRESS, ROUTER_ADDRESS);
  console.log('Current Allowance:', ethers.utils.formatUnits(currentAllowance, 6), 'USDC');

  if (currentAllowance.gt(ethers.utils.parseUnits('100', 6))) {
    console.log('✅ Already approved');
    return;
  }

  console.log('');
  console.log('📝 Approving USDC...');

  // Build approval data
  const usdcInterface = new ethers.utils.Interface(ERC20_ABI);
  const approvalAmount = ethers.constants.MaxUint256;
  const approvalData = usdcInterface.encodeFunctionData('approve', [
    ROUTER_ADDRESS,
    approvalAmount,
  ]);

  // For a 1/1 Safe, we can create a signature ourselves
  const safeWithSigner = safe.connect(executor);

  try {
    // Build Safe transaction hash
    const nonce = await provider.getTransactionCount(SAFE_ADDRESS);
    
    // Create the signature (for 1/1 Safe, we sign as the sole owner)
    // This is simplified - for production use Safe SDK
    const safeTxHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
        [USDC_ADDRESS, 0, approvalData, 0, 0, 0, 0, ethers.constants.AddressZero, ethers.constants.AddressZero, nonce]
      )
    );

    const signature = await executor.signMessage(ethers.utils.arrayify(safeTxHash));

    console.log('   Executing Safe transaction...');
    const tx = await safeWithSigner.execTransaction(
      USDC_ADDRESS,
      0,
      approvalData,
      0, // CALL
      0, // safeTxGas
      0, // baseGas
      0, // gasPrice
      ethers.constants.AddressZero, // gasToken
      ethers.constants.AddressZero, // refundReceiver
      signature,
      {
        gasLimit: 300000,
      }
    );

    console.log('   Tx sent:', tx.hash);
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log('   ✅ Approved!');
      const newAllowance = await usdc.allowance(SAFE_ADDRESS, ROUTER_ADDRESS);
      console.log('');
      console.log('✅ New Allowance:', ethers.utils.formatUnits(newAllowance, 6), 'USDC');
      console.log('');
      console.log('🎉 Ready to trade!');
    } else {
      console.log('   ❌ Transaction reverted');
    }

  } catch (error: any) {
    console.log('');
    console.log('❌ Error:', error.message);
    console.log('');
    console.log('Note: Safe transaction execution is complex.');
    console.log('Easiest solution: Use Safe UI at https://app.safe.global/');
  }
}

approveAsOwner().catch(console.error);

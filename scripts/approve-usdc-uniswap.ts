/**
 * Approve USDC to Uniswap Router from Safe via Module
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const SAFE_ADDRESS = '0xe9ecbddb6308036f5470826a1fdfc734cfe866b1';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const MODULE_ABI = [
  'function approveTokenForDex(address token, address dex, uint256 amount) external returns (bool)',
];

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
];

async function main() {
  if (!EXECUTOR_PRIVATE_KEY) {
    throw new Error('EXECUTOR_PRIVATE_KEY not found in .env');
  }

  console.log('💰 Approving USDC to Uniswap Router\n');
  console.log('Safe:', SAFE_ADDRESS);
  console.log('Module:', MODULE_ADDRESS);
  console.log('Router:', UNISWAP_ROUTER);
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

  // Check current approval
  console.log('📊 Current Status:');
  const currentApproval = await usdc.allowance(SAFE_ADDRESS, UNISWAP_ROUTER);
  const usdcBalance = await usdc.balanceOf(SAFE_ADDRESS);
  console.log(`   USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`   Current Approval: ${ethers.utils.formatUnits(currentApproval, 6)} USDC`);
  console.log('');

  if (currentApproval.gt(ethers.utils.parseUnits('1000', 6))) {
    console.log('✅ Already has sufficient approval (>1000 USDC)');
    return;
  }

  // Approve unlimited amount (max uint256)
  const approvalAmount = ethers.constants.MaxUint256;
  console.log('⏳ Sending approval transaction...');
  console.log(`   Approving: Unlimited (${ethers.constants.MaxUint256.toString()})`);
  console.log('');

  const tx = await module.approveTokenForDex(USDC_ADDRESS, UNISWAP_ROUTER, approvalAmount, {
    gasLimit: 200000,
  });

  console.log(`📤 Transaction sent: ${tx.hash}`);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log('✅ Approval successful!');
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log('');

    // Verify
    const newApproval = await usdc.allowance(SAFE_ADDRESS, UNISWAP_ROUTER);
    console.log('📊 New Approval Status:');
    console.log(`   Approval: ${newApproval.eq(ethers.constants.MaxUint256) ? 'Unlimited ♾️' : ethers.utils.formatUnits(newApproval, 6) + ' USDC'}`);
    console.log('');
    console.log('✅ Ready to trade!');
  } else {
    console.log('❌ Transaction failed');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });


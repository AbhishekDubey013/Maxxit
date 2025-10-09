#!/usr/bin/env tsx
/**
 * Approve USDC for trading via the module
 * The module has a built-in function to approve tokens to DEXes
 */

import { ethers } from 'ethers';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔓 APPROVING USDC FOR TRADING');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
  const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY;
  const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
  const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
  const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

  if (!EXECUTOR_PRIVATE_KEY) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not set');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  const executor = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);

  console.log('Module:', MODULE_ADDRESS);
  console.log('Safe:', SAFE_ADDRESS);
  console.log('USDC:', USDC_ADDRESS);
  console.log('Router:', UNISWAP_ROUTER);
  console.log('Executor:', executor.address);
  console.log('');

  const moduleAbi = [
    'function approveTokenForDex(address safe, address token, address dexRouter) external',
  ];

  const module = new ethers.Contract(MODULE_ADDRESS, moduleAbi, executor);

  console.log('⚡ Calling approveTokenForDex...\n');

  try {
    const tx = await module.approveTokenForDex(
      SAFE_ADDRESS,
      USDC_ADDRESS,
      UNISWAP_ROUTER,
      {
        gasLimit: 200000,
      }
    );

    console.log('📤 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...\n');

    const receipt = await tx.wait();

    console.log('✅ APPROVED!\n');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('');
    console.log('🔗 View on Arbiscan:');
    console.log(`   https://arbiscan.io/tx/${tx.hash}`);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ READY TO TRADE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
  }
}

main();


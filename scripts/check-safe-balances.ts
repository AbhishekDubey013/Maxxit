#!/usr/bin/env tsx

/**
 * Check USDC balance in Safe wallets
 */

import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Arbitrum USDC

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function checkBalance(safeAddress: string) {
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  
  const [balance, decimals, symbol] = await Promise.all([
    usdc.balanceOf(safeAddress),
    usdc.decimals(),
    usdc.symbol(),
  ]);

  const formatted = ethers.utils.formatUnits(balance, decimals);
  
  return {
    raw: balance.toString(),
    formatted,
    symbol,
    hasBalance: balance.gt(0),
  };
}

async function main() {
  console.log('🔍 Checking USDC Balances in Safe Wallets');
  console.log('='.repeat(80));
  console.log();

  const safes = [
    { name: 'Agentic GMX', address: '0x9A85f7140776477F1A79Ea29b7A32495636f5e20' },
    { name: 'Ring', address: '0x49396C773238F01e6AbCc0182D01e3363Fe4d320' },
  ];

  for (const safe of safes) {
    console.log(`Safe: ${safe.name}`);
    console.log(`Address: ${safe.address}`);
    
    try {
      const balance = await checkBalance(safe.address);
      
      if (balance.hasBalance) {
        console.log(`✅ Balance: ${balance.formatted} ${balance.symbol}`);
      } else {
        console.log(`❌ Balance: 0 ${balance.symbol}`);
        console.log(`   → No USDC to trade! Fund this Safe first.`);
      }
    } catch (error: any) {
      console.log(`❌ Error checking balance: ${error.message}`);
    }
    
    console.log();
  }

  console.log('='.repeat(80));
  console.log('\n💡 To fund a Safe:');
  console.log('   1. Send USDC (Arbitrum One) to the Safe address');
  console.log('   2. Wait for confirmation');
  console.log('   3. Trade executor will automatically use it');
  console.log();
  console.log('   USDC Contract (Arbitrum): 0xaf88d065e77c8cC2239327C5EDb3A432268e5831');
}

main().catch(console.error);


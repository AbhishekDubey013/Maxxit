#!/usr/bin/env tsx
import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
  
  const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
  const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
  const MODULE = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
  
  const usdcAbi = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
  ];
  
  const usdc = new ethers.Contract(USDC, usdcAbi, provider);
  
  const balance = await usdc.balanceOf(SAFE);
  const allowance = await usdc.allowance(SAFE, MODULE);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  💰 SAFE USDC STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Safe:', SAFE);
  console.log('Module:', MODULE);
  console.log('');
  console.log('USDC Balance:', ethers.utils.formatUnits(balance, 6), 'USDC');
  console.log('Approved to Module:', ethers.utils.formatUnits(allowance, 6), 'USDC');
  console.log('');
  
  if (allowance.eq(0)) {
    console.log('❌ PROBLEM: Safe has NOT approved USDC to module!');
    console.log('');
    console.log('SOLUTION: The Safe owners need to approve USDC spending');
    console.log('          by the trading module.');
    console.log('');
    console.log('This requires a Safe transaction to call:');
    console.log(`  USDC.approve(${MODULE}, <amount>)`);
  } else {
    console.log('✅ Module has USDC approval');
  }
}

main();


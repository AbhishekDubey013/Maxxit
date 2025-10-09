#!/usr/bin/env tsx
/**
 * Check if Safe and Module are properly linked
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const SAFE = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const MODULE = '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19';

const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
  'function getModules() view returns (address[])',
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function VERSION() view returns (string)',
];

async function check() {
  console.log('🔍 Checking Safe ↔ Module Link\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const safe = new ethers.Contract(SAFE, SAFE_ABI, provider);
  
  console.log('Safe:', SAFE);
  console.log('Module:', MODULE);
  console.log('');
  
  // Check Safe version
  try {
    const version = await safe.VERSION();
    console.log('Safe Version:', version);
  } catch (e) {
    console.log('Safe Version: Unable to determine');
  }
  console.log('');
  
  // Check if module is enabled
  const isEnabled = await safe.isModuleEnabled(MODULE);
  console.log('Module Enabled:', isEnabled ? '✅ YES' : '❌ NO');
  
  // Get all modules
  const modules = await safe.getModules();
  console.log('All Enabled Modules:', modules.length);
  modules.forEach((m, i) => {
    const isOurs = m.toLowerCase() === MODULE.toLowerCase();
    console.log(`  ${i + 1}. ${m} ${isOurs ? '← OUR NEW MODULE' : ''}`);
  });
  console.log('');
  
  // Get owners
  const owners = await safe.getOwners();
  console.log('Owners:', owners.length);
  owners.forEach((o, i) => {
    console.log(`  ${i + 1}. ${o}`);
  });
  console.log('');
  
  // Get threshold
  const threshold = await safe.getThreshold();
  console.log('Threshold:', threshold.toString(), 'signatures required');
  console.log('');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!isEnabled) {
    console.log('❌ FOUND THE ISSUE!');
    console.log('   Module is NOT enabled on the Safe!');
    console.log('   This explains the 67k gas early revert.\n');
    console.log('   The transaction tries to call execTransactionFromModule');
    console.log('   but fails immediately because module is not enabled.\n');
    console.log('📋 Solution:');
    console.log('   1. Visit: http://localhost:3000/enable-new-module');
    console.log('   2. Enable module via Safe Transaction Builder\n');
  } else {
    console.log('✅ Module IS enabled. Issue is elsewhere.\n');
    console.log('🤔 Other possible issues:');
    console.log('   1. Gas forwarding in execTransactionFromModule');
    console.log('   2. Module internal validation failing');
    console.log('   3. Safe version compatibility');
    console.log('   4. Uniswap router compatibility with module calls\n');
    console.log('💡 Next step: Check if we can do a simple test transaction');
    console.log('   from module (not a swap) to isolate the issue.\n');
  }
}

check().catch(console.error);


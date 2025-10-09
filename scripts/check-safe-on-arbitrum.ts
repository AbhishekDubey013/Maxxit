#!/usr/bin/env tsx

import { ethers } from 'ethers';

const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';
const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const SAFE_ABI = [
  'function isModuleEnabled(address module) external view returns (bool)',
  'function getModules() external view returns (address[])',
  'function getOwners() external view returns (address[])',
];

async function checkSafe() {
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  
  console.log('🔍 Checking Safe on Arbitrum...\n');
  console.log('Safe Address:', SAFE_ADDRESS);
  console.log('Module Address:', MODULE_ADDRESS);
  console.log('');
  
  // Check if contract exists
  const code = await provider.getCode(SAFE_ADDRESS);
  if (code === '0x' || code === '0x0') {
    console.log('❌ Safe does NOT exist on Arbitrum');
    console.log('   You need to create a new Safe on Arbitrum!\n');
    return;
  }
  
  console.log('✅ Safe EXISTS on Arbitrum!\n');
  
  // Get Safe details
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);
  
  try {
    const owners = await safe.getOwners();
    console.log('👥 Owners:');
    owners.forEach((owner: string, i: number) => {
      console.log(`   ${i + 1}. ${owner}`);
    });
    console.log('');
    
    const modules = await safe.getModules();
    console.log('🔌 Enabled Modules:', modules.length > 0 ? modules : 'None');
    console.log('');
    
    const isModuleEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 MODULE STATUS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Module:', MODULE_ADDRESS);
    console.log('   Status:', isModuleEnabled ? '✅ ENABLED' : '❌ NOT ENABLED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (isModuleEnabled) {
      console.log('✅ Module is ENABLED! You can trade immediately.');
    } else {
      console.log('❌ Module NOT enabled yet.');
      console.log('   Enable it via: https://app.safe.global');
    }
    
  } catch (error: any) {
    console.error('❌ Error checking Safe:', error.message);
  }
}

checkSafe();


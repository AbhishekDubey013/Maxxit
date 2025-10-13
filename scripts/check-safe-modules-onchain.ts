/**
 * Check which modules are enabled on-chain for the Safe
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';

const SAFE_ABI = [
  'function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] array, address next)',
  'function isModuleEnabled(address module) external view returns (bool)',
];

const SENTINEL_MODULES = '0x0000000000000000000000000000000000000001';

async function main() {
  console.log('🔍 Checking modules enabled on Safe (on-chain)...\n');
  console.log(`Safe: ${SAFE_ADDRESS}\n`);
  
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);
  
  try {
    // Get all enabled modules
    const [modules, next] = await safe.getModulesPaginated(SENTINEL_MODULES, 100);
    
    console.log(`📋 Found ${modules.length} enabled module(s):\n`);
    
    if (modules.length === 0) {
      console.log('   ✅ No modules enabled (clean)\n');
      return;
    }
    
    for (const module of modules) {
      console.log(`   • ${module}`);
      
      // Check which known modules this is
      const knownModules = {
        '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D': 'Old V2 Module (buggy)',
        '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46': 'New V2 Module (FIXED) ✅',
        '0x20cfdc15501AF5F3B7C6cb8c067310f817904691': 'Old V2 Module (older)',
      };
      
      const moduleName = knownModules[module as keyof typeof knownModules];
      if (moduleName) {
        console.log(`     → ${moduleName}`);
      }
    }
    
    console.log('\n');
    
    // Check specific new module
    const newModule = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
    const isNewEnabled = await safe.isModuleEnabled(newModule);
    
    console.log('🎯 New Fixed Module Status:');
    console.log(`   Address: ${newModule}`);
    console.log(`   Enabled: ${isNewEnabled ? '✅ YES' : '❌ NO'}\n`);
    
    if (!isNewEnabled && modules.length > 0) {
      console.log('⚠️  You have OLD modules enabled!');
      console.log('   → Disable old modules and enable the new one:\n');
      console.log(`   New Module: ${newModule}\n`);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main();


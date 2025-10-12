/**
 * Check which modules are enabled on Safe
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = process.argv[2] || '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const OLD_MODULE = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const NEW_V2_MODULE = '0x20cfdc15501AF5F3B7C6cb8c067310f817904691';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log('\n🔍 Checking enabled modules on Safe...\n');
  console.log(`Safe: ${SAFE_ADDRESS}\n`);

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];
  const safe = new ethers.Contract(SAFE_ADDRESS, safeAbi, provider);

  // Check old module
  const oldEnabled = await safe.isModuleEnabled(OLD_MODULE);
  console.log(`OLD Module (V1): ${OLD_MODULE}`);
  console.log(`Status: ${oldEnabled ? '✅ ENABLED' : '❌ NOT ENABLED'}\n`);

  // Check new V2 module
  const newEnabled = await safe.isModuleEnabled(NEW_V2_MODULE);
  console.log(`NEW Module (V2): ${NEW_V2_MODULE}`);
  console.log(`Status: ${newEnabled ? '✅ ENABLED' : '❌ NOT ENABLED'}\n`);

  if (!newEnabled) {
    console.log('⚠️  You need to enable the NEW V2 module!');
    console.log('\n📋 Steps:');
    console.log('1. Go to Safe → Settings → Modules');
    console.log(`2. Add module: ${NEW_V2_MODULE}`);
    console.log('3. Sign and execute transaction\n');
  } else {
    console.log('✅ V2 Module is enabled! Ready to test!\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });


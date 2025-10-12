/**
 * Check if the NEWEST V2 module is enabled
 */

import { ethers } from 'ethers';

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const NEWEST_MODULE = '0x61cF55A0983eE311ECe219c089C7AA9Df51BE75f';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log('\n🔍 Checking if NEWEST V2 module is enabled...\n');
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`NEWEST Module (V2 with auto-init): ${NEWEST_MODULE}\n`);

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];
  const safe = new ethers.Contract(SAFE_ADDRESS, safeAbi, provider);

  const isEnabled = await safe.isModuleEnabled(NEWEST_MODULE);

  if (isEnabled) {
    console.log('✅ NEWEST V2 Module is ENABLED!');
    console.log('   Ready to test! 🚀\n');
  } else {
    console.log('❌ NEWEST V2 Module is NOT enabled yet!');
    console.log('\n⚠️  You need to enable it!');
    console.log('\n📋 Steps:');
    console.log('1. Go to Safe → Settings → Modules');
    console.log(`2. Add module: ${NEWEST_MODULE}`);
    console.log('3. Sign and execute transaction');
    console.log('\n✨ This is the module with AUTO-INITIALIZATION!');
    console.log('   No completeSetup() needed - first trade auto-initializes!\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });


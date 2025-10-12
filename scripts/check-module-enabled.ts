/**
 * Check if specific module is enabled
 */

import { ethers } from 'ethers';

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
];

async function main() {
  try {
    console.log('🔍 Checking module status...\n');
    console.log('Safe:', SAFE_ADDRESS);
    console.log('Module:', MODULE_ADDRESS);
    console.log('');

    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
    const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, provider);

    const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);

    console.log('Module Enabled:', isEnabled ? '✅ YES' : '❌ NO');

    if (!isEnabled) {
      console.log('\n⚠️  You need to complete Step 1 (Enable Module) first!');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

main();


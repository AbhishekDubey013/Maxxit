/**
 * Check if WETH is whitelisted for the Safe
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

const MODULE_ABI = [
  'function isTokenWhitelisted(address safe, address token) external view returns (bool)',
  'function setTokenWhitelist(address safe, address token, bool enabled) external',
];

async function main() {
  console.log('🔍 Checking if WETH is whitelisted...\n');
  
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const module = new ethers.Contract(MODULE, MODULE_ABI, provider);
  
  const isWhitelisted = await module.isTokenWhitelisted(SAFE, WETH);
  
  console.log(`Safe: ${SAFE}`);
  console.log(`Module: ${MODULE}`);
  console.log(`WETH: ${WETH}`);
  console.log(`\nIs WETH Whitelisted: ${isWhitelisted ? '✅ YES' : '❌ NO'}\n`);
  
  if (!isWhitelisted) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('❌ WETH is NOT whitelisted!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('To fix, the MODULE OWNER must call:');
    console.log(`setTokenWhitelist(${SAFE}, ${WETH}, true)\n`);
    console.log('⚠️  Only the module owner can whitelist tokens!\n');
  }
}

main();


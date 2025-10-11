/**
 * Whitelist tokens in the trading module
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
const PRIVATE_KEY = process.env.MODULE_OWNER_PRIVATE_KEY || process.env.EXECUTOR_PRIVATE_KEY;
const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

// Token addresses on Arbitrum One
const TOKENS = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
};

const MODULE_ABI = [
  'function setTokenWhitelist(address token, bool status) external',
  'function whitelistedTokens(address) external view returns (bool)',
  'function moduleOwner() external view returns (address)',
];

async function main() {
  if (!PRIVATE_KEY) {
    throw new Error('MODULE_OWNER_PRIVATE_KEY or EXECUTOR_PRIVATE_KEY not found in .env');
  }

  console.log('[TokenWhitelist] Connecting to Arbitrum...');
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('[TokenWhitelist] Wallet address:', wallet.address);
  console.log('[TokenWhitelist] Module address:', MODULE_ADDRESS);
  
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, wallet);
  
  // Check module owner
  const moduleOwner = await module.moduleOwner();
  console.log('[TokenWhitelist] Module owner:', moduleOwner);
  console.log('[TokenWhitelist] Our wallet:', wallet.address);
  
  if (moduleOwner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.warn('[TokenWhitelist] ⚠️  WARNING: You are not the module owner!');
    console.warn('[TokenWhitelist] Owner:', moduleOwner);
    console.warn('[TokenWhitelist] You:', wallet.address);
    return;
  }
  
  // Check current whitelist status
  console.log('\n[TokenWhitelist] Current whitelist status:');
  for (const [name, address] of Object.entries(TOKENS)) {
    const isWhitelisted = await module.whitelistedTokens(address);
    console.log(`  ${name} (${address}): ${isWhitelisted ? '✅ Whitelisted' : '❌ Not whitelisted'}`);
  }
  
  // Whitelist tokens that aren't already whitelisted
  console.log('\n[TokenWhitelist] Whitelisting tokens...');
  for (const [name, address] of Object.entries(TOKENS)) {
    const isWhitelisted = await module.whitelistedTokens(address);
    
    if (isWhitelisted) {
      console.log(`  ${name}: Already whitelisted ✅`);
      continue;
    }
    
    console.log(`  ${name}: Whitelisting...`);
    const tx = await module.setTokenWhitelist(address, true);
    console.log(`  ${name}: TX sent: ${tx.hash}`);
    await tx.wait();
    console.log(`  ${name}: Confirmed ✅`);
  }
  
  // Verify final status
  console.log('\n[TokenWhitelist] Final whitelist status:');
  for (const [name, address] of Object.entries(TOKENS)) {
    const isWhitelisted = await module.whitelistedTokens(address);
    console.log(`  ${name}: ${isWhitelisted ? '✅' : '❌'}`);
  }
  
  console.log('\n[TokenWhitelist] ✅ All done!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[TokenWhitelist] ❌ Error:', error);
    process.exit(1);
  });


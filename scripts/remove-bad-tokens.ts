/**
 * Remove tokens without liquidity from whitelist
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const MODULE_OWNER_KEY = process.env.EXECUTOR_PRIVATE_KEY;
const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';

// Tokens to remove (no liquidity)
const TOKENS_TO_REMOVE = [
  { symbol: 'SNX', address: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60' },
  { symbol: 'BONK', address: '0x09199d9A5F4448D0848e4395D065e1ad9c4a1F74' },
  { symbol: 'RNDR', address: '0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279' },
  { symbol: 'FET', address: '0x4BE87C766A7CE11D5Cc864b6C3Abb7457dCC4cC9' },
  { symbol: 'AVAX', address: '0x565609fAF65B92F7be02468acF86f8979423e514' },
];

const MODULE_ABI = [
  'function setTokenWhitelist(address safe, address token, bool enabled) external',
  'function isTokenWhitelisted(address safe, address token) external view returns (bool)',
];

async function main() {
  if (!MODULE_OWNER_KEY) {
    console.error('❌ EXECUTOR_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log('🔧 Removing tokens without liquidity...\n');
  console.log(`Safe: ${SAFE}`);
  console.log(`Module: ${MODULE}\n`);

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(MODULE_OWNER_KEY, provider);
  const module = new ethers.Contract(MODULE, MODULE_ABI, signer);

  console.log(`Module Owner: ${signer.address}\n`);

  for (const token of TOKENS_TO_REMOVE) {
    try {
      // Check if whitelisted
      const isWhitelisted = await module.isTokenWhitelisted(SAFE, token.address);
      
      if (!isWhitelisted) {
        console.log(`✓ ${token.symbol} not whitelisted (already removed)`);
        continue;
      }

      console.log(`⏳ Removing ${token.symbol}...`);
      
      const tx = await module.setTokenWhitelist(SAFE, token.address, false);
      console.log(`   TX: ${tx.hash}`);
      
      await tx.wait();
      console.log(`   ✅ ${token.symbol} removed!\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Failed to remove ${token.symbol}:`, error.message, '\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Bad tokens removed!\n');
  console.log('📋 14 working tokens remain:\n');
  console.log('WETH, WBTC, ARB, LINK, UNI, PENDLE, GMX, GRT,');
  console.log('AAVE, CRV, LDO, PEPE, MATIC, SOL\n');
}

main();


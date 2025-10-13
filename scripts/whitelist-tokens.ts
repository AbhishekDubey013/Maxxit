/**
 * Whitelist trading tokens for the Safe
 */

import { ethers } from 'ethers';

const RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
const MODULE_OWNER_KEY = process.env.EXECUTOR_PRIVATE_KEY; // Module owner
const SAFE = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';

// Tokens to whitelist (Arbitrum addresses)
const TOKENS_TO_WHITELIST = [
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
  { symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  { symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
  { symbol: 'LINK', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  { symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  { symbol: 'PENDLE', address: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8' },
  { symbol: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a' },
  { symbol: 'GRT', address: '0x9623063377AD1B27544C965cCd7342f7EA7e88C7' },
  { symbol: 'AAVE', address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' },
  { symbol: 'CRV', address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978' },
  { symbol: 'SNX', address: '0xcBA56Cd8216FCBBF3fA6DF6137F3147cBcA37D60' },
  { symbol: 'LDO', address: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60' },
  { symbol: 'PEPE', address: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00' },
  { symbol: 'WIF', address: '0x3a1429d50E0cBBc45c9f3e8Da072C7473A84193D' },
  { symbol: 'BONK', address: '0x09199d9A5F4448D0848e4395D065e1ad9c4a1F74' },
  { symbol: 'RNDR', address: '0xC8a4EeA31E9B6b61c406DF013DD4FEc76f21E279' },
  { symbol: 'FET', address: '0x4BE87C766A7CE11D5Cc864b6C3Abb7457dCC4cC9' },
  { symbol: 'AVAX', address: '0x565609fAF65B92F7be02468acF86f8979423e514' },
  { symbol: 'MATIC', address: '0x561877b6b3DD7651313794e5F2894B2F18bE0766' },
  { symbol: 'SOL', address: '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07' },
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

  console.log('🔧 Whitelisting tokens for Safe...\n');
  console.log(`Safe: ${SAFE}`);
  console.log(`Module: ${MODULE}\n`);

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(MODULE_OWNER_KEY, provider);
  const module = new ethers.Contract(MODULE, MODULE_ABI, signer);

  console.log(`Module Owner: ${signer.address}\n`);

  for (const token of TOKENS_TO_WHITELIST) {
    try {
      // Check if already whitelisted
      const isWhitelisted = await module.isTokenWhitelisted(SAFE, token.address);
      
      if (isWhitelisted) {
        console.log(`✅ ${token.symbol} already whitelisted`);
        continue;
      }

      console.log(`⏳ Whitelisting ${token.symbol}...`);
      
      const tx = await module.setTokenWhitelist(SAFE, token.address, true);
      console.log(`   TX: ${tx.hash}`);
      
      await tx.wait();
      console.log(`   ✅ ${token.symbol} whitelisted!\n`);
      
    } catch (error: any) {
      console.error(`   ❌ Failed to whitelist ${token.symbol}:`, error.message, '\n');
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Token whitelisting complete!\n');
  console.log('You can now trade these tokens via Telegram! 🚀\n');
}

main();

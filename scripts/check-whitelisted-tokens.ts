/**
 * Check which tokens are whitelisted in MaxxitTradingModule
 * Run: npx tsx scripts/check-whitelisted-tokens.ts
 */

import { ethers } from 'ethers';

const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA'; // Arbitrum
const MODULE_ABI = [
  'function whitelistedTokens(address token) view returns (bool)',
];

// Tokens to check
const TOKENS: Record<string, string> = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
  AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
  GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
  SOL: '0xb74Da9FE2F96B9E0a5f4A3cf0b92dd2bEC617124',
  AVAX: '0x565609fAF65B92F7be02468acF86f8979423e514',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  PEPE: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00',
  DOGE: '0xC4da4c24fd591125c3F47b340b6f4f76111883d8',
};

async function main() {
  const rpc = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, provider);

  console.log(`🔍 Checking whitelisted tokens...`);
  console.log(`   Module: ${MODULE_ADDRESS}`);
  console.log(`   Chain: Arbitrum One\n`);

  const whitelisted: string[] = [];
  const notWhitelisted: string[] = [];

  for (const [symbol, address] of Object.entries(TOKENS)) {
    const isWhitelisted = await module.whitelistedTokens(address);
    
    if (isWhitelisted) {
      whitelisted.push(symbol);
      console.log(`✅ ${symbol.padEnd(6)} ${address}`);
    } else {
      notWhitelisted.push(symbol);
      console.log(`❌ ${symbol.padEnd(6)} ${address}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Whitelisted: ${whitelisted.length} tokens`);
  console.log(`   ${whitelisted.join(', ')}`);
  console.log();
  console.log(`   Not whitelisted: ${notWhitelisted.length} tokens`);
  console.log(`   ${notWhitelisted.join(', ')}`);

  if (notWhitelisted.length > 0) {
    console.log(`\n💡 To whitelist a token, run:`);
    console.log(`   npx tsx scripts/whitelist-token.ts ${notWhitelisted[0]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });


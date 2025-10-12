/**
 * Whitelist a new token in MaxxitTradingModule
 * Run: npx tsx scripts/whitelist-token.ts <TOKEN_SYMBOL> <TOKEN_ADDRESS>
 */

import { ethers } from 'ethers';

const MODULE_ADDRESS = '0x74437d894C8E8A5ACf371E10919c688ae79E89FA'; // Arbitrum
const MODULE_ABI = [
  'function setTokenWhitelist(address token, bool status) external',
  'function whitelistedTokens(address token) view returns (bool)',
  'event TokenWhitelisted(address indexed token, bool status)',
];

// Popular tokens on Arbitrum
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
};

async function main() {
  const tokenSymbol = process.argv[2];
  const tokenAddress = process.argv[3] || TOKENS[tokenSymbol];

  if (!tokenAddress) {
    console.log('Usage: npx tsx scripts/whitelist-token.ts <SYMBOL> [ADDRESS]');
    console.log('\nAvailable tokens:');
    Object.entries(TOKENS).forEach(([symbol, addr]) => {
      console.log(`  ${symbol.padEnd(6)} ${addr}`);
    });
    process.exit(1);
  }

  // Setup
  const rpc = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const moduleOwnerKey = process.env.MODULE_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;

  if (!moduleOwnerKey) {
    throw new Error('MODULE_OWNER_PRIVATE_KEY not set in .env');
  }

  const signer = new ethers.Wallet(moduleOwnerKey, provider);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, signer);

  console.log(`🔧 Whitelisting token on module...`);
  console.log(`   Module: ${MODULE_ADDRESS}`);
  console.log(`   Token: ${tokenAddress} (${tokenSymbol})`);
  console.log(`   Owner: ${signer.address}`);
  console.log();

  // Check current status
  const isWhitelisted = await module.whitelistedTokens(tokenAddress);
  console.log(`   Current status: ${isWhitelisted ? '✅ Whitelisted' : '❌ Not whitelisted'}`);

  if (isWhitelisted) {
    console.log('\n✅ Token is already whitelisted!');
    process.exit(0);
  }

  // Whitelist the token
  console.log('\n📝 Sending transaction...');
  const tx = await module.setTokenWhitelist(tokenAddress, true);
  console.log(`   TX: ${tx.hash}`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();
  console.log(`   Confirmed in block ${receipt.blockNumber}`);

  // Verify
  const newStatus = await module.whitelistedTokens(tokenAddress);
  console.log(`\n✅ Token whitelisted successfully!`);
  console.log(`   Status: ${newStatus ? '✅ Whitelisted' : '❌ Failed'}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`\n🎉 All Safes can now trade ${tokenSymbol}!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });


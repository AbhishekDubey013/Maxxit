/**
 * Complete setup: Token Registry + Venue Status
 * Run: npx tsx scripts/setup-tokens-and-venues.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Token data with actual contract addresses
const tokenData = [
  // === ARBITRUM TOKENS ===
  { chain: 'arbitrum', symbol: 'WBTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f' },
  { chain: 'arbitrum', symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
  { chain: 'arbitrum', symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  { chain: 'arbitrum', symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
  { chain: 'arbitrum', symbol: 'ARB', address: '0x912CE59144191C1204E64559FE8253a0e49E6548' },
  { chain: 'arbitrum', symbol: 'GMX', address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a' },
  { chain: 'arbitrum', symbol: 'LINK', address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4' },
  { chain: 'arbitrum', symbol: 'UNI', address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0' },
  { chain: 'arbitrum', symbol: 'AAVE', address: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196' },
  { chain: 'arbitrum', symbol: 'SOL', address: '0xb74Da9FE2F96B9E0a5f4A3cf0b92dd2bEC617124' },
  { chain: 'arbitrum', symbol: 'AVAX', address: '0x565609fAF65B92F7be02468acF86f8979423e514' },
  { chain: 'arbitrum', symbol: 'OP', address: '0x6f620EC89B8479e97A6985792d0c64F237566746' },
  { chain: 'arbitrum', symbol: 'MATIC', address: '0x7c9f4C87d911613Fe9ca58b579f737911AAD2D43' },
  { chain: 'arbitrum', symbol: 'DOGE', address: '0xC4da4c24fd591125c3F47b340b6f4f76111883d8' },
  { chain: 'arbitrum', symbol: 'PEPE', address: '0x25d887Ce7a35172C62FeBFD67a1856F20FaEbB00' },
  { chain: 'arbitrum', symbol: 'LDO', address: '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60' },
  { chain: 'arbitrum', symbol: 'CRV', address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978' },
  { chain: 'arbitrum', symbol: 'MKR', address: '0x2e9a6Df78E42a30712c10a9Dc4b1C8656f8F2879' },
  
  // === BASE TOKENS ===
  { chain: 'base', symbol: 'cbBTC', address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c' },
  { chain: 'base', symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' },
  { chain: 'base', symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { chain: 'base', symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' },
  { chain: 'base', symbol: 'OP', address: '0x4200000000000000000000000000000000000042' },
  { chain: 'base', symbol: 'LINK', address: '0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196' },
  { chain: 'base', symbol: 'UNI', address: '0xc3De830EA07524a0761646a6a4e4be0e114a3C83' },
  { chain: 'base', symbol: 'AERO', address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' },
  { chain: 'base', symbol: 'PEPE', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
];

// Venue availability - Which tokens can be traded on which venues
const venueAvailability = {
  SPOT: [
    // Arbitrum & Base - Any token with contract address
    'WBTC', 'WETH', 'USDC', 'USDT', 'ARB', 'GMX', 'LINK', 'UNI', 'AAVE',
    'SOL', 'AVAX', 'OP', 'MATIC', 'DOGE', 'PEPE', 'LDO', 'CRV', 'MKR',
    'AERO', 'cbBTC',
  ],
  
  GMX: [
    // GMX V2 Perpetuals on Arbitrum
    // Source: https://app.gmx.io/#/trade
    'BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'LINK', 'UNI', 'AAVE', 'OP', 'MATIC',
    'DOGE', 'LTC', 'XRP', 'ATOM', 'NEAR',
  ],
  
  HYPERLIQUID: [
    // Hyperliquid Perpetuals
    // Source: https://app.hyperliquid.xyz/trade
    'BTC', 'ETH', 'SOL', 'AVAX', 'ARB', 'OP', 'MATIC', 'SUI', 'APT', 'SEI',
    'DOGE', 'PEPE', 'WIF', 'LINK', 'UNI', 'AAVE', 'LDO', 'CRV', 'MKR',
    'ATOM', 'NEAR', 'INJ', 'TIA', 'JUP', 'BONK', 'JTO', 'PYTH',
  ],
};

// Normalized token symbols for venue trading
// Maps display symbols to trading symbols
const tokenMapping: Record<string, string> = {
  'WBTC': 'BTC',
  'cbBTC': 'BTC',
  'WETH': 'ETH',
  'MATIC': 'POL', // Polygon rebranded
};

async function main() {
  console.log('🚀 Setting up Token Registry and Venue Status\n');
  console.log('=' .repeat(60));
  
  // === STEP 1: Populate Token Registry ===
  console.log('\n📝 STEP 1: Token Registry\n');
  
  let registryCreated = 0;
  let registryUpdated = 0;
  
  for (const token of tokenData) {
    try {
      const existing = await prisma.tokenRegistry.findUnique({
        where: {
          chain_tokenSymbol: {
            chain: token.chain,
            tokenSymbol: token.symbol,
          },
        },
      });
      
      if (existing) {
        await prisma.tokenRegistry.update({
          where: {
            chain_tokenSymbol: {
              chain: token.chain,
              tokenSymbol: token.symbol,
            },
          },
          data: {
            tokenAddress: token.address,
          },
        });
        registryUpdated++;
      } else {
        await prisma.tokenRegistry.create({
          data: {
            chain: token.chain,
            tokenSymbol: token.symbol,
            tokenAddress: token.address,
          },
        });
        registryCreated++;
      }
      
      console.log(`✅ ${token.chain.padEnd(10)} ${token.symbol.padEnd(8)} ${token.address}`);
    } catch (error: any) {
      console.error(`❌ Error: ${token.chain} ${token.symbol} - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Token Registry:`);
  console.log(`   Created: ${registryCreated}`);
  console.log(`   Updated: ${registryUpdated}`);
  console.log(`   Total: ${registryCreated + registryUpdated}`);
  
  // === STEP 2: Populate Venue Status ===
  console.log('\n📝 STEP 2: Venue Status\n');
  
  let venueCreated = 0;
  let venueUpdated = 0;
  const venueSummary: Record<string, number> = { SPOT: 0, GMX: 0, HYPERLIQUID: 0 };
  
  for (const [venue, tokens] of Object.entries(venueAvailability)) {
    console.log(`\n📍 ${venue}:`);
    
    for (const symbol of tokens) {
      // Get the normalized symbol for trading
      const tradingSymbol = tokenMapping[symbol] || symbol;
      
      try {
        const existing = await prisma.venueStatus.findUnique({
          where: {
            venue_tokenSymbol: {
              venue: venue as any,
              tokenSymbol: tradingSymbol,
            },
          },
        });
        
        if (existing) {
          venueUpdated++;
        } else {
          await prisma.venueStatus.create({
            data: {
              venue: venue as any,
              tokenSymbol: tradingSymbol,
            },
          });
          venueCreated++;
        }
        
        venueSummary[venue]++;
        console.log(`   ✅ ${tradingSymbol}`);
      } catch (error: any) {
        console.error(`   ❌ ${tradingSymbol}: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 Venue Status:`);
  console.log(`   Created: ${venueCreated}`);
  console.log(`   Updated: ${venueUpdated}`);
  console.log(`   Total: ${venueCreated + venueUpdated}`);
  
  console.log(`\n📍 By Venue:`);
  console.log(`   SPOT (Arbitrum + Base): ${venueSummary.SPOT} tokens`);
  console.log(`   GMX (Arbitrum Perps):   ${venueSummary.GMX} tokens`);
  console.log(`   Hyperliquid (Perps):    ${venueSummary.HYPERLIQUID} tokens`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup Complete!\n');
  
  console.log('💡 Next Steps:');
  console.log('   1. Users deposit USDC');
  console.log('   2. Agents generate signals for available tokens');
  console.log('   3. Execute trades on respective venues');
  console.log('   4. SPOT: Swap USDC → Token on Arbitrum/Base');
  console.log('   5. GMX/HL: Open perpetual positions');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

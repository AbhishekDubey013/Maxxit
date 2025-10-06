/**
 * Populate Venue Status - Mark which tokens are available on which venues
 * Run: npx tsx scripts/populate-venue-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Token availability by venue
// Sources: GMX docs, Hyperliquid docs, DEX data

const venueAvailability = {
  // SPOT: Arbitrum and Base - Any token with contract address on these chains
  SPOT: [
    'BTC', 'ETH', 'USDC', 'USDT', 'SOL', 'AVAX',
    'ARB', 'GMX', 'OP', 'MATIC', 'LINK', 'UNI', 'AAVE',
    'DOGE', 'PEPE', 'LDO', 'CRV', 'MKR', 'AERO',
  ],
  
  // GMX V2 (Arbitrum) - Perpetuals
  // Source: https://app.gmx.io/#/trade
  GMX: [
    'BTC',    // Bitcoin perpetual
    'ETH',    // Ethereum perpetual
    'SOL',    // Solana perpetual
    'ARB',    // Arbitrum perpetual
    'LINK',   // Chainlink perpetual
    'UNI',    // Uniswap perpetual
    'AVAX',   // Avalanche perpetual
    'DOGE',   // Dogecoin perpetual
    'LTC',    // Litecoin perpetual
    'XRP',    // Ripple perpetual
    'AAVE',   // Aave perpetual
    'ATOM',   // Cosmos perpetual
    'NEAR',   // Near perpetual
    'OP',     // Optimism perpetual
    'MATIC',  // Polygon perpetual
  ],
  
  // Hyperliquid - Perpetuals
  // Source: https://app.hyperliquid.xyz/trade
  HYPERLIQUID: [
    'BTC',    // Bitcoin perpetual
    'ETH',    // Ethereum perpetual
    'SOL',    // Solana perpetual
    'AVAX',   // Avalanche perpetual
    'ARB',    // Arbitrum perpetual
    'OP',     // Optimism perpetual
    'MATIC',  // Polygon perpetual
    'SUI',    // Sui perpetual
    'APT',    // Aptos perpetual
    'SEI',    // Sei perpetual
    'DOGE',   // Dogecoin perpetual
    'PEPE',   // Pepe perpetual
    'WIF',    // dogwifhat perpetual
    'LINK',   // Chainlink perpetual
    'UNI',    // Uniswap perpetual
    'AAVE',   // Aave perpetual
    'LDO',    // Lido perpetual
    'CRV',    // Curve perpetual
    'MKR',    // Maker perpetual
    'ATOM',   // Cosmos perpetual
    'NEAR',   // Near perpetual
    'INJ',    // Injective perpetual
    'TIA',    // Celestia perpetual
    'JUP',    // Jupiter perpetual
  ],
};

// Additional tokens for completeness
const additionalTokens = [
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'NEAR', name: 'Near Protocol' },
  { symbol: 'INJ', name: 'Injective' },
  { symbol: 'TIA', name: 'Celestia' },
  { symbol: 'JUP', name: 'Jupiter' },
];

async function main() {
  console.log('🔧 Populating Venue Status...\n');

  // First, ensure additional tokens exist in registry
  for (const token of additionalTokens) {
    try {
      await prisma.tokenRegistry.upsert({
        where: { symbol: token.symbol },
        update: {},
        create: {
          symbol: token.symbol,
          name: token.name,
          decimals: 18,
          coingeckoId: token.symbol.toLowerCase(),
          contractAddresses: {},
        },
      });
    } catch (error) {
      // Token might already exist, continue
    }
  }

  let created = 0;
  let updated = 0;
  const summary: Record<string, number> = { SPOT: 0, GMX: 0, HYPERLIQUID: 0 };

  for (const [venue, tokens] of Object.entries(venueAvailability)) {
    console.log(`\n📍 ${venue}:`);
    
    for (const tokenSymbol of tokens) {
      try {
        // Check if token exists in registry
        const token = await prisma.tokenRegistry.findUnique({
          where: { symbol: tokenSymbol },
        });

        if (!token) {
          console.log(`   ⚠️  Skipping ${tokenSymbol} - not in registry`);
          continue;
        }

        // Upsert venue status
        const existing = await prisma.venueStatus.findUnique({
          where: {
            venue_tokenSymbol: {
              venue: venue as any,
              tokenSymbol,
            },
          },
        });

        if (existing) {
          updated++;
        } else {
          await prisma.venueStatus.create({
            data: {
              venue: venue as any,
              tokenSymbol,
            },
          });
          created++;
        }

        summary[venue]++;
        console.log(`   ✅ ${tokenSymbol}`);
      } catch (error: any) {
        console.error(`   ❌ Error for ${tokenSymbol}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${created + updated}`);
  console.log(`\n📍 By Venue:`);
  console.log(`   SPOT (Arbitrum/Base): ${summary.SPOT} tokens`);
  console.log(`   GMX (Arbitrum Perps): ${summary.GMX} tokens`);
  console.log(`   Hyperliquid (Perps): ${summary.HYPERLIQUID} tokens`);
  console.log('\n✅ Venue Status populated!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

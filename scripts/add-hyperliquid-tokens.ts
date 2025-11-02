/**
 * Add Hyperliquid Perpetual Tokens to venue_status
 * 
 * Usage:
 * npx ts-node scripts/add-hyperliquid-tokens.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Common perpetual tokens on Hyperliquid
// Based on Hyperliquid's available markets
const HYPERLIQUID_TOKENS = [
  // Major cryptocurrencies
  { symbol: 'BTC', minSize: 0.001, tickSize: 1 },
  { symbol: 'ETH', minSize: 0.01, tickSize: 0.1 },
  { symbol: 'SOL', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'ARB', minSize: 1, tickSize: 0.0001 },
  { symbol: 'AVAX', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'BNB', minSize: 0.01, tickSize: 0.1 },
  { symbol: 'MATIC', minSize: 1, tickSize: 0.0001 },
  { symbol: 'OP', minSize: 1, tickSize: 0.001 },
  
  // Layer 1s
  { symbol: 'ATOM', minSize: 0.1, tickSize: 0.001 },
  { symbol: 'DOT', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'ADA', minSize: 1, tickSize: 0.0001 },
  { symbol: 'NEAR', minSize: 1, tickSize: 0.001 },
  { symbol: 'APT', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'SUI', minSize: 1, tickSize: 0.001 },
  
  // DeFi
  { symbol: 'UNI', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'AAVE', minSize: 0.01, tickSize: 0.1 },
  { symbol: 'LINK', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'MKR', minSize: 0.001, tickSize: 1 },
  { symbol: 'CRV', minSize: 1, tickSize: 0.001 },
  { symbol: 'LDO', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'PENDLE', minSize: 0.1, tickSize: 0.01 },
  
  // Memes & Popular
  { symbol: 'DOGE', minSize: 10, tickSize: 0.00001 },
  { symbol: 'SHIB', minSize: 100000, tickSize: 0.00000001 },
  { symbol: 'PEPE', minSize: 100000, tickSize: 0.0000001 },
  { symbol: 'WIF', minSize: 1, tickSize: 0.001 },
  { symbol: 'BONK', minSize: 10000, tickSize: 0.000001 },
  
  // AI & Tech
  { symbol: 'FET', minSize: 1, tickSize: 0.001 },
  { symbol: 'RNDR', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'WLD', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'AGIX', minSize: 1, tickSize: 0.001 },
  
  // Gaming & Metaverse
  { symbol: 'IMX', minSize: 1, tickSize: 0.001 },
  { symbol: 'AXS', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'SAND', minSize: 1, tickSize: 0.001 },
  { symbol: 'MANA', minSize: 1, tickSize: 0.001 },
  
  // Others
  { symbol: 'XRP', minSize: 1, tickSize: 0.0001 },
  { symbol: 'LTC', minSize: 0.01, tickSize: 0.1 },
  { symbol: 'BCH', minSize: 0.01, tickSize: 0.1 },
  { symbol: 'TRX', minSize: 10, tickSize: 0.00001 },
  { symbol: 'TON', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'INJ', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'TIA', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'SEI', minSize: 1, tickSize: 0.001 },
  { symbol: 'STRK', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'JTO', minSize: 0.1, tickSize: 0.01 },
  { symbol: 'JUP', minSize: 1, tickSize: 0.001 },
  { symbol: 'WEN', minSize: 1000, tickSize: 0.00001 },
  { symbol: 'PYTH', minSize: 1, tickSize: 0.001 },
  { symbol: 'DYM', minSize: 0.1, tickSize: 0.01 },
];

async function addHyperliquidTokens() {
  console.log('🚀 Adding Hyperliquid perpetual tokens to venue_status...\n');

  let addedCount = 0;
  let skippedCount = 0;

  for (const token of HYPERLIQUID_TOKENS) {
    try {
      // Check if token already exists
      const existing = await prisma.venues_status.findUnique({
        where: {
          venue_token_symbol: {
            venue: 'HYPERLIQUID',
            token_symbol: token.symbol,
          },
        },
      });

      if (existing) {
        console.log(`⏭️  ${token.symbol}: Already exists`);
        skippedCount++;
        continue;
      }

      // Add token
      await prisma.venues_status.create({
        data: {
          venue: 'HYPERLIQUID',
          token_symbol: token.symbol,
          min_size: token.minSize,
          tick_size: token.tickSize,
          slippage_limit_bps: 100, // 1% default slippage for perps
        },
      });

      console.log(`✅ ${token.symbol}: Added (min: ${token.minSize}, tick: ${token.tickSize})`);
      addedCount++;
    } catch (error: any) {
      console.error(`❌ ${token.symbol}: Error - ${error.message}`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Added: ${addedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Total: ${HYPERLIQUID_TOKENS.length}`);
}

async function main() {
  try {
    await addHyperliquidTokens();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


/**
 * Add mock market indicators for testing signal generation
 * Run: npx tsx scripts/add-mock-indicators.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mockIndicators = {
  BTC: {
    price: 45000,
    rsi: 52,
    macd: { value: 120, signal: 100, histogram: 20 },
    ma: { ma20: 44500, ma50: 43800, ma200: 42000 },
    priceChange24h: 2.5,
    volume24h: 28000000000,
  },
  ETH: {
    price: 2800,
    rsi: 48,
    macd: { value: 15, signal: 12, histogram: 3 },
    ma: { ma20: 2750, ma50: 2680, ma200: 2500 },
    priceChange24h: 1.8,
    volume24h: 12000000000,
  },
  SOL: {
    price: 110,
    rsi: 62,
    macd: { value: 2.5, signal: 2.0, histogram: 0.5 },
    ma: { ma20: 105, ma50: 98, ma200: 85 },
    priceChange24h: 5.2,
    volume24h: 2000000000,
  },
  SUI: {
    price: 3.8,
    rsi: 58,
    macd: { value: 0.08, signal: 0.06, histogram: 0.02 },
    ma: { ma20: 3.65, ma50: 3.45, ma200: 3.2 },
    priceChange24h: 3.5,
    volume24h: 450000000,
  },
  APT: {
    price: 12.5,
    rsi: 55,
    macd: { value: 0.15, signal: 0.12, histogram: 0.03 },
    ma: { ma20: 12.0, ma50: 11.5, ma200: 10.8 },
    priceChange24h: 2.8,
    volume24h: 180000000,
  },
  MATIC: {
    price: 0.85,
    rsi: 45,
    macd: { value: -0.01, signal: -0.008, histogram: -0.002 },
    ma: { ma20: 0.88, ma50: 0.92, ma200: 0.95 },
    priceChange24h: -1.5,
    volume24h: 320000000,
  },
};

async function main() {
  console.log('🔧 Adding mock market indicators...\n');

  const now = new Date();
  // Round down to nearest 6-hour window
  const windowStart = new Date(Math.floor(now.getTime() / (6 * 60 * 60 * 1000)) * (6 * 60 * 60 * 1000));

  let created = 0;
  let updated = 0;

  for (const [symbol, indicators] of Object.entries(mockIndicators)) {
    try {
      const existing = await prisma.marketIndicators6h.findUnique({
        where: {
          tokenSymbol_windowStart: {
            tokenSymbol: symbol,
            windowStart,
          },
        },
      });

      if (existing) {
        await prisma.marketIndicators6h.update({
          where: {
            tokenSymbol_windowStart: {
              tokenSymbol: symbol,
              windowStart,
            },
          },
          data: {
            indicators: indicators as any,
          },
        });
        updated++;
        console.log(`✅ Updated indicators for ${symbol}`);
      } else {
        await prisma.marketIndicators6h.create({
          data: {
            tokenSymbol: symbol,
            windowStart,
            indicators: indicators as any,
          },
        });
        created++;
        console.log(`✅ Created indicators for ${symbol}`);
      }

      console.log(`   Price: $${indicators.price}, RSI: ${indicators.rsi}, MACD: ${indicators.macd.histogram > 0 ? '📈' : '📉'}`);
    } catch (error) {
      console.error(`❌ Error for ${symbol}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Window: ${windowStart.toISOString()}`);
  console.log('\n✅ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

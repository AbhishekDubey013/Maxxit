/**
 * Update VenueStatus to only include tokens with liquidity
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Only tokens with confirmed Uniswap V3 liquidity
const WORKING_TOKENS = [
  'WETH', 'WBTC', 'ARB', 'LINK', 'UNI', 'PENDLE', 'GMX', 
  'GRT', 'AAVE', 'CRV', 'LDO', 'PEPE', 'MATIC', 'SOL'
];

// Tokens to remove (no liquidity)
const TOKENS_TO_REMOVE = [
  'SNX', 'BONK', 'RNDR', 'FET', 'AVAX', 'BTC', 'ETH',
  'USDC', 'USDT', 'DAI', 'OP', 'POL', 'DOGE', 'MKR', 
  'AERO', 'BAL', 'COMP', 'YFI', 'SUSHI'
];

async function main() {
  console.log('🔄 Syncing VenueStatus with working tokens...\n');

  // 1. Remove tokens without liquidity
  console.log('❌ Removing tokens without liquidity...');
  for (const token of TOKENS_TO_REMOVE) {
    try {
      await prisma.venueStatus.deleteMany({
        where: {
          tokenSymbol: token,
          venue: 'SPOT'
        }
      });
      console.log(`   ✓ Removed ${token}`);
    } catch (error) {
      // Token doesn't exist, skip
    }
  }

  // 2. Ensure all working tokens exist
  console.log('\n✅ Ensuring working tokens exist...');
  for (const token of WORKING_TOKENS) {
    const exists = await prisma.venueStatus.findFirst({
      where: {
        tokenSymbol: token,
        venue: 'SPOT'
      }
    });

    if (!exists) {
      await prisma.venueStatus.create({
        data: {
          tokenSymbol: token,
          venue: 'SPOT'
        }
      });
      console.log(`   + Added ${token}`);
    } else {
      console.log(`   ✓ ${token} exists`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ VenueStatus synced! ${WORKING_TOKENS.length} tokens available.\n`);

  await prisma.$disconnect();
}

main();


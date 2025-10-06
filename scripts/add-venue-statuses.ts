/**
 * Add venue status for common tokens
 * Run: npx tsx scripts/add-venue-statuses.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tokens = ['BTC', 'ETH', 'SOL', 'SUI', 'APT', 'AVAX', 'ARB', 'OP', 'MATIC'];
const venues: ('SPOT' | 'GMX' | 'HYPERLIQUID')[] = ['SPOT', 'GMX', 'HYPERLIQUID'];

async function main() {
  console.log('🔧 Adding venue statuses...\n');

  let created = 0;

  for (const venue of venues) {
    for (const token of tokens) {
      try {
        await prisma.venueStatus.upsert({
          where: {
            venue_tokenSymbol: {
              venue,
              tokenSymbol: token,
            },
          },
          update: {},
          create: {
            venue,
            tokenSymbol: token,
          },
        });
        created++;
        console.log(`✅ ${venue} - ${token}`);
      } catch (error) {
        console.error(`❌ Error for ${venue} - ${token}:`, error);
      }
    }
  }

  console.log(`\n📊 Summary: Created/Updated ${created} venue statuses`);
  console.log('✅ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Deleting Old Signals (before Oct 31, 2025)');
  console.log('='.repeat(80));
  console.log();

  // First, count how many we'll delete
  const oldSignals = await prisma.signals.findMany({
    where: {
      created_at: { lt: new Date('2025-10-31T00:00:00Z') },
      positions: { none: {} }, // Only delete signals without positions
    },
    select: {
      id: true,
      token_symbol: true,
      created_at: true,
      agents: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`Found ${oldSignals.length} old signals without positions to delete:\n`);
  
  if (oldSignals.length === 0) {
    console.log('✅ No old signals to delete!');
    return;
  }

  // Show what we're deleting
  oldSignals.slice(0, 10).forEach(s => {
    console.log(`  - ${s.id.substring(0, 8)}... (${s.agents?.name}): ${s.token_symbol}, ${s.created_at.toISOString()}`);
  });
  
  if (oldSignals.length > 10) {
    console.log(`  ... and ${oldSignals.length - 10} more`);
  }

  console.log();
  console.log('Deleting...');

  // Delete them
  const result = await prisma.signals.deleteMany({
    where: {
      created_at: { lt: new Date('2025-10-31T00:00:00Z') },
      positions: { none: {} },
    },
  });

  console.log(`✅ Deleted ${result.count} old signals`);
  console.log();
  console.log('='.repeat(80));
  console.log('\n🎯 Oct 31 signals are now at the front of the queue!');
  console.log('   Run the trade executor worker and they should execute immediately.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


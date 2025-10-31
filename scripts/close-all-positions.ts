#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Closing All Open Positions');
  console.log('='.repeat(80));
  console.log();

  const openPositions = await prisma.positions.findMany({
    where: {
      closed_at: null,
    },
    select: {
      id: true,
      token_symbol: true,
      side: true,
      entry_price: true,
      opened_at: true,
    },
  });

  console.log(`Found ${openPositions.length} open positions:\n`);
  
  if (openPositions.length === 0) {
    console.log('✅ No open positions to close!');
    return;
  }

  for (const pos of openPositions) {
    console.log(`  - ${pos.id.substring(0, 8)}... (${pos.token_symbol} ${pos.side}), entry: ${pos.entry_price}, opened: ${pos.opened_at.toISOString()}`);
  }

  console.log('\nClosing all positions...');

  // Close all positions by setting closed_at to now
  const result = await prisma.positions.updateMany({
    where: {
      closed_at: null,
    },
    data: {
      closed_at: new Date(),
      exit_price: 0, // Mark as manual close
      pnl: 0,
    },
  });

  console.log(`\n✅ Closed ${result.count} positions`);
  console.log();
  console.log('='.repeat(80));
  console.log('🎯 Ready for fresh start with new strategy:');
  console.log('   - 10% Hard Stop Loss');
  console.log('   - 3% Baseline Profit');
  console.log('   - 1% Trailing Stop');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


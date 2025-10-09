#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const signalId = process.argv[2];
  
  const positions = await prisma.position.findMany({
    where: { signalId },
    orderBy: { openedAt: 'desc' },
  });

  console.log('Positions for signal:', positions.length);
  if (positions.length > 0) {
    positions.forEach(p => {
      console.log('  Position:', p.id);
      console.log('  Status:', p.status);
      console.log('  TX Hash:', p.openTxHash || 'N/A');
      console.log('  Size:', p.sizeUSD, 'USD');
    });
  } else {
    console.log('  No positions created - likely validation failed or simulation mode');
  }

  await prisma.$disconnect();
}

main();


/**
 * Check if positions were manual (Telegram) or auto (signal)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking position source (manual vs auto)...\n');

  const positions = await prisma.position.findMany({
    where: {
      tokenSymbol: { in: ['CRV', 'GMX'] },
      closedAt: { not: null },
      openedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
    },
    include: {
      signal: true
    },
    orderBy: {
      closedAt: 'desc'
    },
    take: 3
  });

  for (const pos of positions) {
    console.log(`${pos.tokenSymbol} Position`);
    console.log(`   Signal Source: ${pos.signal.source}`);
    console.log(`   Signal Token: ${pos.signal.tokenSymbol}`);
    
    // Check if signal token has _MANUAL_ suffix
    if (pos.signal.tokenSymbol.includes('_MANUAL_')) {
      console.log(`   🤖 MANUAL TRADE (via Telegram)`);
    } else {
      console.log(`   🎯 AUTO TRADE (from signal generator)`);
    }
    
    console.log(`   Risk Model: ${JSON.stringify(pos.signal.riskModel)}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════\n');
  
  await prisma.$disconnect();
}

main();


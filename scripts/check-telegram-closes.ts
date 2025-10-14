/**
 * Check if CRV/GMX were closed manually via Telegram or automatically by monitor
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking if CRV/GMX were closed via Telegram...\n');

  // Get recent closed CRV/GMX positions
  const positions = await prisma.position.findMany({
    where: {
      tokenSymbol: { in: ['CRV', 'GMX'] },
      closedAt: { not: null },
      openedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
    },
    orderBy: {
      closedAt: 'desc'
    },
    take: 5
  });

  if (positions.length === 0) {
    console.log('❌ No closed CRV/GMX positions found.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${positions.length} closed position(s):\n`);

  for (const pos of positions) {
    console.log(`${pos.tokenSymbol} Position (${pos.id.substring(0, 12)}...)`);
    console.log(`   Opened: ${new Date(pos.openedAt).toLocaleString()}`);
    console.log(`   Closed: ${pos.closedAt ? new Date(pos.closedAt).toLocaleString() : 'N/A'}`);
    
    // Check if there's a Telegram trade for this close
    const telegramClose = await prisma.telegramTrade.findFirst({
      where: {
        parsedIntent: {
          path: ['action'],
          equals: 'CLOSE'
        },
        status: 'completed',
        createdAt: {
          gte: new Date(pos.openedAt),
          lte: pos.closedAt || new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (telegramClose) {
      console.log(`   🤖 MANUAL CLOSE via Telegram!`);
      console.log(`      Command: "${telegramClose.command}"`);
      console.log(`      Time: ${new Date(telegramClose.createdAt).toLocaleString()}`);
    } else {
      console.log(`   ⚙️  AUTOMATIC CLOSE by position monitor`);
    }
    
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════\n');
  
  await prisma.$disconnect();
}

main();


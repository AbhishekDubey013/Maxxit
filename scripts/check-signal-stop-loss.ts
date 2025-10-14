/**
 * Check if signals have default stop loss set
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking signals for default stop loss...\n');

  // Get the CRV and UNI positions
  const positions = await prisma.position.findMany({
    where: {
      tokenSymbol: { in: ['CRV', 'UNI'] },
      closedAt: { not: null },
      openedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
    },
    include: {
      signal: true
    },
    orderBy: {
      closedAt: 'desc'
    },
    take: 2
  });

  if (positions.length === 0) {
    console.log('❌ No recent CRV/UNI positions found.\n');
    await prisma.$disconnect();
    return;
  }

  for (const pos of positions) {
    console.log(`\n${pos.tokenSymbol} Position (${pos.id.substring(0, 8)}...):`);
    console.log(`   Position Stop Loss: ${pos.stopLoss || 'null'}`);
    console.log(`   Position Take Profit: ${pos.takeProfit || 'null'}`);
    console.log(`   Signal ID: ${pos.signal.id.substring(0, 8)}...`);
    console.log(`   Signal Risk Model:`);
    console.log(`   ${JSON.stringify(pos.signal.riskModel, null, 2)}`);
    
    const riskModel = pos.signal.riskModel as any;
    if (riskModel?.stopLoss) {
      const entryPrice = parseFloat(pos.entryPrice.toString());
      const stopLossPrice = riskModel.stopLoss;
      const stopLossPercent = ((entryPrice - stopLossPrice) / entryPrice * 100).toFixed(2);
      console.log(`\n   ⚠️  SIGNAL HAS STOP LOSS: $${stopLossPrice}`);
      console.log(`   → ${stopLossPercent}% below entry ($${entryPrice.toFixed(6)})`);
      console.log(`   → This would trigger at -${stopLossPercent}% loss!`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  
  await prisma.$disconnect();
}

main();


/**
 * Debug trailing stop logic for recently closed positions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analyzing recent exits with trailing stop logic...\n');

  // Get recently closed positions
  const recentExits = await prisma.position.findMany({
    where: {
      closedAt: {
        not: null,
        gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
      }
    },
    orderBy: {
      closedAt: 'desc'
    },
    take: 10
  });

  if (recentExits.length === 0) {
    console.log('❌ No recent exits found in last 30 minutes.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${recentExits.length} recent exit(s):\n`);
  console.log('═══════════════════════════════════════════════════════\n');

  for (const pos of recentExits) {
    const openTime = new Date(pos.openedAt);
    const closeTime = pos.closedAt ? new Date(pos.closedAt) : null;
    const durationMs = closeTime ? closeTime.getTime() - openTime.getTime() : 0;
    const durationMin = Math.floor(durationMs / 60000);
    const durationSec = Math.floor((durationMs % 60000) / 1000);

    const entryPrice = parseFloat(pos.entryPrice.toString());
    const exitPrice = pos.exitPrice ? parseFloat(pos.exitPrice.toString()) : 0;
    const pnlPercent = exitPrice && entryPrice 
      ? ((exitPrice - entryPrice) / entryPrice * 100)
      : 0;

    console.log(`🔹 ${pos.tokenSymbol} Position`);
    console.log(`   Duration: ${durationMin}m ${durationSec}s`);
    console.log(`   Entry: $${entryPrice.toFixed(6)}`);
    console.log(`   Exit: $${exitPrice.toFixed(6)}`);
    console.log(`   PnL: ${pnlPercent.toFixed(2)}%`);
    console.log(`   Trailing Params: ${JSON.stringify(pos.trailingParams || {})}`);
    
    // Calculate what SHOULD have happened
    const activationThreshold = entryPrice * 1.03;
    console.log(`\n   📊 Trailing Stop Analysis:`);
    console.log(`      Activation threshold: $${activationThreshold.toFixed(6)} (+3%)`);
    
    if (exitPrice >= activationThreshold) {
      const trailingStop = exitPrice * 0.99; // 1% trailing
      console.log(`      Exit price WAS above threshold`);
      console.log(`      Trailing stop would be: $${trailingStop.toFixed(6)} (1% below exit)`);
      console.log(`      ⚠️  Should NOT have closed yet!`);
    } else {
      console.log(`      Exit price below activation threshold`);
      console.log(`      ✅ Trailing stop was NOT active (correct)`);
    }
    
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  
  await prisma.$disconnect();
}

main();


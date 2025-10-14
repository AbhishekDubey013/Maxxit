/**
 * Analyze recent CRV and UNI exits to debug quick closes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analyzing recent CRV and UNI exits...\n');

  // Get recent CRV and UNI positions (including closed)
  const positions = await prisma.position.findMany({
    where: {
      tokenSymbol: {
        in: ['CRV', 'UNI']
      },
      openedAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last 1 hour
      }
    },
    orderBy: {
      openedAt: 'desc'
    }
  });

  if (positions.length === 0) {
    console.log('❌ No CRV or UNI positions found in last hour.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${positions.length} CRV/UNI position(s):\n`);
  console.log('═══════════════════════════════════════════════════════\n');

  for (const pos of positions) {
    const openTime = new Date(pos.openedAt);
    const closeTime = pos.closedAt ? new Date(pos.closedAt) : null;
    const status = pos.closedAt ? '🔴 CLOSED' : '🟢 OPEN';
    
    let durationStr = 'N/A';
    if (closeTime) {
      const durationMs = closeTime.getTime() - openTime.getTime();
      const durationMin = Math.floor(durationMs / 60000);
      const durationSec = Math.floor((durationMs % 60000) / 1000);
      durationStr = `${durationMin}m ${durationSec}s`;
    }

    const entryPrice = parseFloat(pos.entryPrice.toString());
    const exitPrice = pos.exitPrice ? parseFloat(pos.exitPrice.toString()) : null;
    const pnlPercent = exitPrice && entryPrice 
      ? ((exitPrice - entryPrice) / entryPrice * 100)
      : null;

    console.log(`${status} ${pos.tokenSymbol} Position`);
    console.log(`   ID: ${pos.id}`);
    console.log(`   Opened: ${openTime.toLocaleString()}`);
    if (closeTime) {
      console.log(`   Closed: ${closeTime.toLocaleString()}`);
      console.log(`   Duration: ${durationStr}`);
    }
    console.log(`   Entry: $${entryPrice.toFixed(6)}`);
    if (exitPrice) {
      console.log(`   Exit: $${exitPrice.toFixed(6)}`);
      console.log(`   PnL: ${pnlPercent?.toFixed(2)}%`);
    }
    console.log(`   Trailing Params: ${JSON.stringify(pos.trailingParams || {})}`);
    
    // Check if trailing stop was enabled
    const trailingParams = pos.trailingParams as any;
    if (!trailingParams || !trailingParams.enabled) {
      console.log(`   ⚠️  TRAILING STOP WAS DISABLED!`);
      console.log(`   → Position created BEFORE the fix was deployed`);
    } else {
      console.log(`   ✅ Trailing stop was ENABLED`);
      
      // Check if it should have closed
      const activationThreshold = entryPrice * 1.03;
      console.log(`\n   📊 Trailing Stop Analysis:`);
      console.log(`      Activation threshold: $${activationThreshold.toFixed(6)} (+3%)`);
      
      if (exitPrice) {
        if (exitPrice >= activationThreshold) {
          const trailingStop = exitPrice * 0.99; // 1% trailing
          console.log(`      Exit price: $${exitPrice.toFixed(6)} (above threshold)`);
          console.log(`      Trailing stop should be: $${trailingStop.toFixed(6)} (1% below exit)`);
          console.log(`      ⚠️  Should NOT have closed yet - this is a BUG!`);
        } else {
          const dropPercent = ((entryPrice - exitPrice) / entryPrice * 100).toFixed(2);
          console.log(`      Exit price: $${exitPrice.toFixed(6)} (below activation)`);
          console.log(`      Price dropped ${dropPercent}% from entry`);
          console.log(`      ⚠️  Trailing stop was NOT active, but position closed anyway!`);
          console.log(`      → Check if fixed stop loss or other trigger was active`);
        }
      }
    }
    
    console.log('\n' + '─'.repeat(55) + '\n');
  }

  await prisma.$disconnect();
}

main();


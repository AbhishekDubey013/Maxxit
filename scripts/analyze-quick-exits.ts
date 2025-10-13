/**
 * Analyze why WETH and ARB positions closed quickly
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Analyzing recent quick exits (WETH, ARB)...\n');

  // Get recently closed WETH and ARB positions
  const recentExits = await prisma.position.findMany({
    where: {
      tokenSymbol: {
        in: ['WETH', 'ARB']
      },
      closedAt: {
        not: null
      }
    },
    include: {
      deployment: {
        include: {
          agent: true
        }
      }
    },
    orderBy: {
      closedAt: 'desc'
    },
    take: 10
  });

  if (recentExits.length === 0) {
    console.log('❌ No closed WETH or ARB positions found.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${recentExits.length} recent WETH/ARB exit(s):\n`);
  console.log('═══════════════════════════════════════════════════════\n');

  for (const pos of recentExits) {
    const openTime = new Date(pos.openedAt);
    const closeTime = pos.closedAt ? new Date(pos.closedAt) : null;
    const durationMs = closeTime ? closeTime.getTime() - openTime.getTime() : 0;
    const durationMin = Math.floor(durationMs / 60000);
    const durationSec = Math.floor((durationMs % 60000) / 1000);

    const pnlPercent = pos.exitPrice && pos.entryPrice 
      ? ((pos.exitPrice - pos.entryPrice) / pos.entryPrice * 100).toFixed(2)
      : 'N/A';

    console.log(`🔹 ${pos.tokenSymbol} Position`);
    console.log(`   Agent: ${pos.deployment.agent.name}`);
    console.log(`   Amount: ${pos.amountUSDC} USDC`);
    console.log(`   Entry Price: $${pos.entryPrice}`);
    console.log(`   Exit Price: $${pos.exitPrice || 'N/A'}`);
    console.log(`   PnL: ${pnlPercent}%`);
    console.log(`   Duration: ${durationMin}m ${durationSec}s`);
    console.log(`   Stop Loss: $${pos.stopLoss || 'None'}`);
    console.log(`   Take Profit: $${pos.takeProfit || 'None'}`);
    console.log(`   Trailing Params: ${JSON.stringify(pos.trailingParams || {})}`);
    console.log(`   Opened: ${openTime.toLocaleString()}`);
    console.log(`   Closed: ${closeTime?.toLocaleString() || 'Still Open'}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📊 Analysis:\n');
  
  // Check trailing stop loss settings
  console.log('🔍 Trailing Stop Loss Logic (from position-monitor-v2.ts):');
  console.log('   1. Initial buffer: 3% above entry price');
  console.log('   2. If current price > initial highest:');
  console.log('      → Update highest price');
  console.log('      → Set stop at (highest * 0.97) = 3% trailing');
  console.log('   3. If current price <= trailing stop:');
  console.log('      → EXIT position\n');

  // Calculate what the initial stop would be for each
  for (const pos of recentExits.slice(0, 2)) {
    const initialHighest = pos.entryPrice * 1.03;
    const trailingStop = initialHighest * 0.97; // Back to entry price
    
    console.log(`${pos.tokenSymbol}:`);
    console.log(`   Entry: $${pos.entryPrice}`);
    console.log(`   Initial highest (entry * 1.03): $${initialHighest.toFixed(6)}`);
    console.log(`   Trailing stop (highest * 0.97): $${trailingStop.toFixed(6)}`);
    
    if (pos.exitPrice) {
      const dropFromEntry = ((pos.entryPrice - pos.exitPrice) / pos.entryPrice * 100).toFixed(2);
      console.log(`   Exit: $${pos.exitPrice} (${dropFromEntry}% drop from entry)`);
      
      if (pos.exitPrice <= trailingStop) {
        console.log(`   ❌ Triggered trailing stop loss!`);
      }
    }
    console.log('');
  }

  await prisma.$disconnect();
}

main();


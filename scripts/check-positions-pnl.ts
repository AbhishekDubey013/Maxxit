/**
 * Check all positions and their P&L to verify risk management
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getHyperliquidOpenPositions } from '../lib/hyperliquid-utils';

const prisma = new PrismaClient();

async function checkPositionsPnL() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              POSITION P&L VERIFICATION                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Get active deployment
    const deployment = await prisma.agent_deployments.findFirst({
      where: { 
        status: 'ACTIVE',
        hyperliquid_agent_address: { not: null }
      },
      include: { agents: true }
    });

    if (!deployment) {
      console.log('❌ No active deployment found');
      return;
    }

    console.log(`Agent: ${deployment.agents.name}`);
    console.log(`User Wallet: ${deployment.user_wallet}\n`);

    // Get live positions from Hyperliquid
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 LIVE POSITIONS ON HYPERLIQUID (Real-time)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const livePositions = await getHyperliquidOpenPositions(deployment.user_wallet);

    if (livePositions.length === 0) {
      console.log('✅ No open positions on Hyperliquid\n');
    } else {
      let hasStopLossViolations = false;

      for (const pos of livePositions) {
        const symbol = pos.coin;
        const side = parseFloat(pos.szi) > 0 ? 'LONG' : 'SHORT';
        const entryPrice = parseFloat(pos.entryPx);
        const size = Math.abs(parseFloat(pos.szi));
        const unrealizedPnl = parseFloat(pos.unrealizedPnl);
        const positionValue = parseFloat(pos.positionValue);
        
        // Calculate P&L percentage
        const pnlPercent = (unrealizedPnl / Math.abs(positionValue)) * 100;

        // Check if violates stop loss
        const violatesStopLoss = pnlPercent < -10;
        
        const statusIcon = violatesStopLoss ? '🔴' : (pnlPercent < 0 ? '🟡' : '🟢');
        
        console.log(`${statusIcon} ${symbol} ${side}`);
        console.log(`   Entry: $${entryPrice.toFixed(4)}`);
        console.log(`   Size: ${size}`);
        console.log(`   Unrealized P&L: $${unrealizedPnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
        
        if (violatesStopLoss) {
          console.log(`   ⚠️  CRITICAL: Below -10% stop loss! Should be closed!`);
          hasStopLossViolations = true;
        } else if (pnlPercent < -5) {
          console.log(`   ⚠️  Warning: Approaching stop loss threshold`);
        } else if (pnlPercent < 0) {
          console.log(`   ✅ Within acceptable loss range`);
        } else {
          console.log(`   ✅ In profit`);
        }
        console.log();
      }

      if (hasStopLossViolations) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔴 STOP LOSS VIOLATIONS DETECTED!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Run position monitor to auto-close these positions:');
        console.log('npx tsx workers/position-monitor-hyperliquid.ts\n');
      } else {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ALL POSITIONS WITHIN RISK PARAMETERS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }

    // Get database positions
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 DATABASE POSITIONS (Historical)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Open positions in DB
    const openPositions = await prisma.positions.findMany({
      where: {
        deployment_id: deployment.id,
        closed_at: null
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`Open Positions in DB: ${openPositions.length}`);
    openPositions.forEach(pos => {
      console.log(`  • ${pos.token_symbol} ${pos.side}: $${pos.entry_price} x ${pos.qty}`);
    });
    console.log();

    // Recently closed positions
    const closedPositions = await prisma.positions.findMany({
      where: {
        deployment_id: deployment.id,
        closed_at: { not: null }
      },
      orderBy: { closed_at: 'desc' },
      take: 5
    });

    console.log(`Recently Closed Positions: ${closedPositions.length}`);
    closedPositions.forEach(pos => {
      const pnl = pos.pnl || 0;
      const pnlPercent = pos.entry_price ? (pnl / (pos.entry_price * pos.qty)) * 100 : 0;
      const icon = pnl >= 0 ? '💚' : '💔';
      console.log(`  ${icon} ${pos.token_symbol} ${pos.side}: P&L $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
      console.log(`     Closed: ${pos.closed_at?.toLocaleString()}`);
    });
    console.log();

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Live on Hyperliquid: ${livePositions.length} positions`);
    console.log(`Open in Database: ${openPositions.length} positions`);
    console.log(`Closed (last 5): ${closedPositions.length} positions\n`);

    const totalPnL = closedPositions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
    console.log(`Total Realized P&L: $${totalPnL.toFixed(2)}\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPositionsPnL();


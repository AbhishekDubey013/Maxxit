/**
 * Check Open Positions
 * 
 * Shows all open positions across all venues
 * 
 * Usage:
 * npx tsx scripts/check-positions.ts [venue]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPositions(venueFilter?: string) {
  console.log('📊 Checking Open Positions\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Build query
    const where: any = {
      closed_at: null, // Only open positions
    };
    
    if (venueFilter) {
      where.venue = venueFilter.toUpperCase();
    }
    
    // Get open positions
    const positions = await prisma.positions.findMany({
      where,
      include: {
        agent_deployments: {
          include: {
            agents: true,
          },
        },
        signals: true,
      },
      orderBy: {
        opened_at: 'desc',
      },
    });
    
    if (positions.length === 0) {
      console.log('📭 No open positions found.\n');
      
      if (venueFilter) {
        console.log(`   Filter: ${venueFilter}`);
      }
      
      console.log('\n💡 Tips:');
      console.log('   - Create a test signal: npx tsx scripts/create-test-signal.ts');
      console.log('   - Make sure trade executor is running: npm run worker:trade-executor');
      console.log('   - Check agent has funds: npx tsx scripts/check-agent-balance.ts\n');
      return;
    }
    
    console.log(`Found ${positions.length} open position(s):\n`);
    
    // Calculate totals
    let totalValue = 0;
    
    positions.forEach((pos, index) => {
      const agent = pos.agent_deployments.agents;
      const signal = pos.signals;
      
      const entryPrice = parseFloat(pos.entry_price?.toString() || '0');
      const qty = parseFloat(pos.qty?.toString() || '0');
      const positionValue = entryPrice * qty;
      totalValue += positionValue;
      
      console.log(`${index + 1}. ${pos.token_symbol} ${pos.side} [${pos.venue}]`);
      console.log(`   Agent: ${agent.name}`);
      console.log(`   Safe: ${pos.agent_deployments.safe_wallet.substring(0, 10)}...`);
      console.log(`   Entry Price: $${entryPrice.toLocaleString()}`);
      console.log(`   Quantity: ${qty.toFixed(8)}`);
      console.log(`   Position Value: $${positionValue.toLocaleString()}`);
      console.log(`   Opened: ${pos.opened_at.toLocaleString()}`);
      
      if (pos.entry_tx_hash) {
        console.log(`   Tx Hash: ${pos.entry_tx_hash}`);
      }
      
      if (pos.trailing_params) {
        const params = pos.trailing_params as any;
        console.log(`   Trailing Stop: ${params.enabled ? '✓' : '✗'} (${params.trailingPercent || 1}%)`);
      }
      
      console.log('');
    });
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📈 Summary:\n');
    console.log(`   Total Positions: ${positions.length}`);
    console.log(`   Total Value: $${totalValue.toLocaleString()}\n`);
    
    // Breakdown by venue
    const byVenue: Record<string, number> = {};
    positions.forEach(pos => {
      byVenue[pos.venue] = (byVenue[pos.venue] || 0) + 1;
    });
    
    console.log('   By Venue:');
    Object.entries(byVenue).forEach(([venue, count]) => {
      console.log(`   - ${venue}: ${count}`);
    });
    
    console.log('\n💡 Next Steps:');
    console.log('   - Monitor positions: tail -f logs/position-monitor.log');
    console.log('   - View on Hyperliquid: https://app.hyperliquid-testnet.xyz');
    console.log('   - Check P&L: Position monitor updates every 30s\n');
    
  } catch (error: any) {
    console.log('❌ Error checking positions:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const venueFilter = process.argv[2]?.toUpperCase();
  
  if (venueFilter && !['SPOT', 'GMX', 'HYPERLIQUID'].includes(venueFilter)) {
    console.log('⚠️  Unknown venue. Valid options: SPOT, GMX, HYPERLIQUID');
  }
  
  await checkPositions(venueFilter);
}

main();


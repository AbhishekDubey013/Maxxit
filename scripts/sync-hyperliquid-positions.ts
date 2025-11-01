/**
 * Sync Hyperliquid Positions
 * Reconcile database positions with actual Hyperliquid positions
 * Mark orphan DB records (positions not on HL) as closed
 */

import { PrismaClient } from '@prisma/client';
import { getHyperliquidOpenPositions } from '../lib/hyperliquid-utils';

const prisma = new PrismaClient();

async function syncHyperliquidPositions(userAddress: string, dryRun: boolean = true) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🔄 HYPERLIQUID POSITION SYNC                             ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✅ LIVE (will update DB)'}\n`);
  console.log(`User Address: ${userAddress}\n`);

  // Get positions from Hyperliquid
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 STEP 1: Fetch from Hyperliquid');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const hlPositions = await getHyperliquidOpenPositions(userAddress);
  console.log(`Found ${hlPositions.length} open positions on Hyperliquid:\n`);
  
  const hlTokens = new Set(hlPositions.map(p => p.coin));
  hlPositions.forEach(p => {
    const side = parseFloat(p.szi) > 0 ? 'LONG' : 'SHORT';
    console.log(`  ✅ ${p.coin} ${side} - PnL: $${parseFloat(p.unrealizedPnl).toFixed(2)}`);
  });

  // Get positions from database
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 STEP 2: Fetch from Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const dbPositions = await prisma.positions.findMany({
    where: {
      venue: 'HYPERLIQUID',
      closed_at: null,
    },
    include: {
      agent_deployments: {
        select: {
          safe_wallet: true,
        },
      },
    },
  });

  // Filter to only positions for this user
  const userDbPositions = dbPositions.filter(
    p => p.agent_deployments.safe_wallet.toLowerCase() === userAddress.toLowerCase()
  );

  console.log(`Found ${userDbPositions.length} open positions in database for this user:\n`);
  userDbPositions.forEach(p => {
    console.log(`  📝 ${p.token_symbol} ${p.side} - Entry: $${p.entry_price}`);
  });

  // Find orphan positions (in DB but not on HL)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🔍 STEP 3: Identify Orphan Positions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const orphanPositions = userDbPositions.filter(
    p => !hlTokens.has(p.token_symbol)
  );

  if (orphanPositions.length === 0) {
    console.log('  ✅ No orphan positions found. All DB records match Hyperliquid!\n');
    return { orphansFound: 0, orphansClosed: 0 };
  }

  console.log(`Found ${orphanPositions.length} orphan positions:\n`);
  
  for (const orphan of orphanPositions) {
    console.log(`  ❌ ${orphan.token_symbol} ${orphan.side}`);
    console.log(`     DB ID: ${orphan.id.substring(0, 8)}...`);
    console.log(`     Entry: $${orphan.entry_price}`);
    console.log(`     Opened: ${orphan.opened_at.toISOString()}`);
    console.log(`     Reason: Not found on Hyperliquid (likely failed to open or already closed)\n`);
  }

  // Close orphan positions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ${dryRun ? '🔍 STEP 4: Preview Changes (Dry Run)' : '✅ STEP 4: Close Orphan Positions'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let closedCount = 0;

  for (const orphan of orphanPositions) {
    if (dryRun) {
      console.log(`  🔍 WOULD CLOSE: ${orphan.token_symbol} ${orphan.side} (ID: ${orphan.id.substring(0, 8)}...)`);
      console.log(`     Would mark: closed_at = NOW, pnl = 0 (no trade occurred)\n`);
    } else {
      console.log(`  ✅ CLOSING: ${orphan.token_symbol} ${orphan.side}...`);
      
      await prisma.positions.update({
        where: { id: orphan.id },
        data: {
          closed_at: new Date(),
          pnl: 0, // Position never actually opened or was closed by HL
          exit_price: orphan.entry_price, // Set exit = entry (no price change)
        },
      });
      
      closedCount++;
      console.log(`     ✅ Closed!\n`);
    }
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`  Hyperliquid Positions:  ${hlPositions.length}`);
  console.log(`  Database Positions:     ${userDbPositions.length}`);
  console.log(`  Orphan Positions Found: ${orphanPositions.length}`);
  console.log(`  ${dryRun ? 'Would Close' : 'Closed'}:            ${dryRun ? orphanPositions.length : closedCount}\n`);

  if (dryRun && orphanPositions.length > 0) {
    console.log('  💡 To actually close these positions, run:');
    console.log(`     npx tsx scripts/sync-hyperliquid-positions.ts ${userAddress} --live\n`);
  } else if (closedCount > 0) {
    console.log('  ✅ Database is now synced with Hyperliquid!\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return { orphansFound: orphanPositions.length, orphansClosed: closedCount };
}

// Main
const args = process.argv.slice(2);
const userAddress = args[0] || '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3';
const isLive = args.includes('--live');

syncHyperliquidPositions(userAddress, !isLive)
  .then(result => {
    if (result.orphansFound === 0) {
      console.log('✅ All positions are synced. Nothing to do!\n');
    } else if (!isLive) {
      console.log('🔍 Dry run complete. Review changes above.\n');
    } else {
      console.log(`✅ Successfully closed ${result.orphansClosed} orphan positions.\n`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });


/**
 * Check the LATEST CRV and GMX exits to see if they're still closing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking LATEST CRV and GMX exits...\n');

  // Get the most recent CRV and GMX positions
  const positions = await prisma.position.findMany({
    where: {
      tokenSymbol: { in: ['CRV', 'GMX'] },
      openedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last 1 hour
    },
    orderBy: {
      openedAt: 'desc'
    },
    take: 5
  });

  if (positions.length === 0) {
    console.log('❌ No CRV/GMX positions found in last hour.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${positions.length} recent CRV/GMX position(s):\n`);

  for (const pos of positions) {
    const openTime = new Date(pos.openedAt);
    const closeTime = pos.closedAt ? new Date(pos.closedAt) : null;
    const status = pos.closedAt ? '🔴 CLOSED' : '🟢 OPEN';
    
    console.log(`${status} ${pos.tokenSymbol} Position`);
    console.log(`   ID: ${pos.id.substring(0, 12)}...`);
    console.log(`   Opened: ${openTime.toLocaleString()}`);
    
    if (closeTime) {
      const durationMs = closeTime.getTime() - openTime.getTime();
      const durationMin = Math.floor(durationMs / 60000);
      const durationSec = Math.floor((durationMs % 60000) / 1000);
      console.log(`   Closed: ${closeTime.toLocaleString()}`);
      console.log(`   Duration: ${durationMin}m ${durationSec}s`);
      
      const entryPrice = parseFloat(pos.entryPrice.toString());
      const exitPrice = pos.exitPrice ? parseFloat(pos.exitPrice.toString()) : 0;
      const pnlPercent = exitPrice && entryPrice 
        ? ((exitPrice - entryPrice) / entryPrice * 100)
        : 0;
      
      console.log(`   Entry: $${entryPrice.toFixed(6)}`);
      console.log(`   Exit: $${exitPrice.toFixed(6)}`);
      console.log(`   PnL: ${pnlPercent.toFixed(2)}%`);
    } else {
      const ageMs = Date.now() - openTime.getTime();
      const ageMin = Math.floor(ageMs / 60000);
      console.log(`   Age: ${ageMin} minutes (still open)`);
    }
    
    console.log(`   Trailing Params: ${JSON.stringify(pos.trailingParams || {})}`);
    
    // Check if this was created AFTER the fix
    const fixDeployTime = new Date('2025-10-14T02:30:00Z'); // Approximate time of fix
    const createdAfterFix = openTime > fixDeployTime;
    
    if (pos.closedAt) {
      if (createdAfterFix) {
        console.log(`   ⚠️  Created AFTER fix but still closed - Railway not restarted?`);
      } else {
        console.log(`   ✓ Created BEFORE fix - expected to close with old logic`);
      }
    }
    
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('\n💡 If positions are STILL closing after Railway restart:');
  console.log('   → Check Railway logs for actual close reason');
  console.log('   → Verify Railway pulled latest code (commit: db7943e)');
  console.log('   → Check if monitor worker is running new code\n');
  
  await prisma.$disconnect();
}

main();


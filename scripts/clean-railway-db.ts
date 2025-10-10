/**
 * Clean Railway Database
 * Removes all fake test positions from production database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Cleaning Railway Database...\n');

  try {
    // 1. Delete all fake positions (entry price = $100 or $0)
    const deletedPositions = await prisma.position.deleteMany({
      where: {
        OR: [
          { entryPrice: '100' },
          { entryPrice: '100.00' },
          { entryPrice: '0' },
          { entryPrice: '0.00' },
        ]
      }
    });
    console.log(`✅ Deleted ${deletedPositions.count} fake positions`);

    // 2. Delete old signals without positions
    const oldSignals = await prisma.signal.deleteMany({
      where: {
        positions: { none: {} },
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // older than 24h
      }
    });
    console.log(`✅ Deleted ${oldSignals.count} old signals`);

    // 3. Check remaining data
    const remainingPositions = await prisma.position.count();
    const remainingSignals = await prisma.signal.count();
    const ctPosts = await prisma.ctPost.count();
    
    console.log('\n📊 Database Summary:');
    console.log(`   Positions: ${remainingPositions}`);
    console.log(`   Signals: ${remainingSignals}`);
    console.log(`   Tweets: ${ctPosts}`);
    
    console.log('\n✅ Railway database cleaned!');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();


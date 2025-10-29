/**
 * Delete Test Tweets
 * Removes all test tweets with IDs starting with "test_"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestTweets() {
  console.log('🗑️  Deleting test tweets from database...\n');
  
  try {
    // Delete ALL test tweets
    const result = await prisma.ctPost.deleteMany({
      where: {
        tweetId: { startsWith: 'test_' }
      }
    });
    
    console.log(`✅ Deleted ${result.count} test tweet(s)`);
    console.log();
    
    if (result.count > 0) {
      console.log('🎉 Success! Tweet ingestion should work now.');
      console.log('   The worker will use real tweet IDs going forward.');
    } else {
      console.log('ℹ️  No test tweets found (already clean)');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestTweets();


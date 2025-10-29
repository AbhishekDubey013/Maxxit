/**
 * Delete Test Tweets
 * Removes all test tweets with IDs starting with "test_"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestTweets() {
  console.log('🗑️  Deleting test tweets from database...\n');
  
  try {
    // Delete ALL fake tweets:
    // 1. Test tweets: test_*
    // 2. Mock tweets: contain underscores (format: timestamp_uuid_number)
    // Real Twitter IDs are numeric only (e.g., "1983520353801691336")
    
    const result = await prisma.ctPost.deleteMany({
      where: {
        OR: [
          { tweetId: { startsWith: 'test_' } },
          { tweetId: { contains: '_' } }  // Catches mock tweets with underscores
        ]
      }
    });
    
    console.log(`✅ Deleted ${result.count} fake tweet(s) (test + mock)`);
    console.log();
    
    if (result.count > 0) {
      console.log('🎉 Success! Tweet ingestion should work now.');
      console.log('   The worker will use real tweet IDs going forward.');
      console.log();
      console.log('💡 Deleted tweets include:');
      console.log('   - Test tweets (test_*)');
      console.log('   - Mock tweets (timestamp_uuid_number)');
    } else {
      console.log('ℹ️  No fake tweets found (already clean)');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestTweets();


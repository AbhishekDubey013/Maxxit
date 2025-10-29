import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * DELETE /api/admin/delete-test-tweets
 * Removes all test tweets with IDs starting with "test_"
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[DeleteTestTweets] Starting cleanup...');
    
    // Delete ALL test tweets
    const result = await prisma.ctPost.deleteMany({
      where: {
        tweetId: { startsWith: 'test_' }
      }
    });
    
    console.log(`[DeleteTestTweets] Deleted ${result.count} test tweet(s)`);
    
    return res.status(200).json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} test tweet(s)`
    });
    
  } catch (error: any) {
    console.error('[DeleteTestTweets] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}


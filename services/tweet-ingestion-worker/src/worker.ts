/**
 * Tweet Ingestion Worker (Microservice)
 * Fetches tweets from X API and stores them in the database
 * Interval: 5 minutes (configurable via WORKER_INTERVAL)
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5003;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '300000'); // 5 minutes default

// Health check server
const app = express();
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tweet-ingestion-worker',
    interval: INTERVAL,
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🏥 Tweet Ingestion Worker health check on port ${PORT}`);
});

/**
 * Ingest tweets from X accounts
 */
async function ingestTweets() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📥 TWEET INGESTION WORKER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  try {
    // Get active CT accounts
    const accounts = await prisma.ct_accounts.findMany({
      where: { is_active: true }
    });

    if (accounts.length === 0) {
      console.log('⚠️  No active CT accounts found. Set is_active=true for accounts to monitor.\n');
      return;
    }

    console.log(`📋 Found ${accounts.length} active CT account(s) to process`);

    // Check if Twitter proxy is available
    const TWITTER_PROXY_URL = process.env.X_API_PROXY_URL || process.env.TWITTER_PROXY_URL || 'https://maxxit.onrender.com';
    let proxyAvailable = false;

    try {
      console.log(`\n🔍 Checking Twitter proxy at: ${TWITTER_PROXY_URL}`);
      const proxyCheck = await fetch(`${TWITTER_PROXY_URL}/health`, { 
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (proxyCheck.ok) {
        const healthData = await proxyCheck.json();
        console.log(`✅ Twitter proxy is available (client: ${healthData.client_initialized ? 'ready' : 'not initialized'})\n`);
        proxyAvailable = true;
      } else {
        console.log('⚠️  Twitter proxy not responding - will process existing tweets\n');
      }
    } catch (error: any) {
      console.log(`⚠️  Twitter proxy not available (${error.message}) - will process existing tweets\n`);
    }

    let totalFetched = 0;
    let totalProcessed = 0;

    // Process each account
    for (const account of accounts) {
      console.log(`\n[${account.x_username}] Processing...`);
      
      if (!proxyAvailable) {
        console.log(`[${account.x_username}] ⏭️  Skipping (proxy not available)`);
        continue;
      }

      try {
        // Get the last tweet we've seen for this account
        const lastTweet = await prisma.ct_posts.findFirst({
          where: { ct_account_id: account.id },
          orderBy: { tweet_created_at: 'desc' },
        });

        console.log(`[${account.x_username}] Fetching recent tweets...`);
        if (lastTweet) {
          console.log(`[${account.x_username}] Last seen: ${lastTweet.tweet_id}`);
        }

        // Call Twitter proxy to get tweets
        const queryParams = new URLSearchParams({
          username: account.x_username,
          max_results: '15',
        });
        
        if (lastTweet) {
          queryParams.append('since_id', lastTweet.tweet_id);
        }

        const response = await fetch(`${TWITTER_PROXY_URL}/fetch-tweets?${queryParams}`, {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`Twitter proxy returned ${response.status}`);
        }

        const data = await response.json();
        const tweets = data.tweets || [];

        console.log(`[${account.x_username}] ✅ Fetched ${tweets.length} new tweets`);
        totalFetched += tweets.length;

        // Store tweets in database
        for (const tweet of tweets) {
          try {
            await prisma.ct_posts.create({
              data: {
                ct_account_id: account.id,
                tweet_id: tweet.id,
                tweet_text: tweet.text,
                tweet_created_at: new Date(tweet.created_at),
              },
            });
            totalProcessed++;
          } catch (error: any) {
            // Tweet might already exist (duplicate), skip
            if (error.code !== 'P2002') {
              console.error(`[${account.x_username}] Error storing tweet ${tweet.id}:`, error.message);
            }
          }
        }

        console.log(`[${account.x_username}] ✅ Stored ${tweets.length} tweets`);
      } catch (error: any) {
        console.error(`[${account.x_username}] ❌ Error:`, error.message);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 INGESTION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Accounts Processed: ${accounts.length}`);
    console.log(`  Tweets Fetched: ${totalFetched}`);
    console.log(`  Tweets Stored: ${totalProcessed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('[TweetIngestion] ❌ Fatal error:', error.message);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Tweet Ingestion Worker starting...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000}s)`);
  console.log(`🔗 X API Proxy: ${process.env.X_API_PROXY_URL || process.env.TWITTER_PROXY_URL || 'https://maxxit.onrender.com'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await ingestTweets();
  
  // Then run on interval
  setInterval(async () => {
    await ingestTweets();
  }, INTERVAL);
}

// Start worker
if (require.main === module) {
  runWorker().catch(error => {
    console.error('[TweetIngestion] ❌ Worker failed to start:', error);
    process.exit(1);
  });
}

export { ingestTweets };

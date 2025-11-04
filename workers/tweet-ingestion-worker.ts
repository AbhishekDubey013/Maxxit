/**
 * Tweet Ingestion Worker
 * Fetches tweets from X API and stores them in the database
 * Runs every 6 hours
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createMultiMethodXApiClient } from '../lib/x-api-multi';
import { classifyTweet } from '../lib/llm-classifier';

const prisma = new PrismaClient();

async function ingestTweets() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📥 TWEET INGESTION WORKER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`[DEBUG] GAME_API_KEY: ${process.env.GAME_API_KEY ? process.env.GAME_API_KEY.substring(0,10)+'...' : 'NOT SET'}`);
  console.log(`[DEBUG] Prisma models available:`, Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).sort());
  console.log();

  try {
    // Get only active CT accounts (optimized to reduce API calls)
    const accounts = await prisma.ct_accounts.findMany({
      where: { is_active: true }
    });

    if (accounts.length === 0) {
      console.log('⚠️  No active CT accounts found. Set is_active=true for accounts to monitor.');
      return;
    }

    console.log(`📋 Found ${accounts.length} active CT account(s) to process\n`);

    const xApiClient = createMultiMethodXApiClient();
    const results = [];

    for (const account of accounts) {
      console.log(`[${account.x_username}] Processing...`);
      
      let tweets: Array<{ tweetId: string; tweetText: string; tweetCreatedAt: Date }> = [];
      
      // Try to fetch from X API (Python proxy with GAME API)
      if (xApiClient) {
        try {
          // Get the last tweet we've seen for this account
          const lastTweet = await prisma.ct_posts.findFirst({
            where: { ct_account_id: account.id },
            orderBy: { tweet_created_at: 'desc' },
          });

          console.log(`[${account.x_username}] Fetching tweets from X API...`);
          if (lastTweet) {
            console.log(`[${account.x_username}] Last seen: ${lastTweet.tweet_id}`);
          }

          const xTweets = await xApiClient.getUserTweets(account.x_username, {
            maxResults: 15, // Optimized: reduced from 50 (most users don't tweet that much)
            sinceId: lastTweet?.tweetId,
          });

          tweets = xTweets.map(tweet => ({
            tweetId: tweet.id,
            tweetText: tweet.text,
            tweetCreatedAt: new Date(tweet.created_at),
          }));

          console.log(`[${account.x_username}] ✅ Fetched ${tweets.length} tweets from X API`);
        } catch (error: any) {
          console.log(`[${account.x_username}] ⚠️  X API unavailable:`, error.message);
          
          // Check if proxy is down
          if (error.message.includes('Cannot connect to proxy')) {
            console.log(`[${account.x_username}] Twitter proxy not running - will process existing tweets from database`);
            tweets = []; // No new tweets, will process existing ones
          } else {
            // Other errors - use mock tweets as fallback for testing
            console.log(`[${account.x_username}] Using existing tweets from database...`);
            tweets = []; // Don't generate mock tweets in production
          }
        }
      } else {
        // Use mock data if X API is not configured
        console.log(`[${account.x_username}] ⚠️  No X API configured, using mock tweets`);
        tweets = [
          {
            tweetId: `${Date.now()}_${account.id}_1`,
            tweetText: `$BTC showing strong bullish momentum. Breakout imminent? #Bitcoin #Crypto`,
            tweetCreatedAt: new Date(),
          },
          {
            tweetId: `${Date.now()}_${account.id}_2`,
            tweetText: `$ETH breaking key resistance. Bulls in control. Target: $2,500. #Ethereum`,
            tweetCreatedAt: new Date(),
          },
          {
            tweetId: `${Date.now()}_${account.id}_3`,
            tweetText: `$WETH trading volume increasing. Accumulation phase? Watch closely. #DeFi`,
            tweetCreatedAt: new Date(),
          },
        ];
      }

      // Create posts in database
      let createdCount = 0;
      let skippedCount = 0;

      for (const tweet of tweets) {
        try {
          // Classify tweet using LLM
          console.log(`[${account.x_username}] Classifying tweet: "${tweet.tweetText.substring(0, 50)}..."`);
          const classification = await classifyTweet(tweet.tweetText);
          
          console.log(`[${account.x_username}] → Signal: ${classification.isSignalCandidate}, Tokens: ${classification.extractedTokens.join(', ') || 'none'}, Sentiment: ${classification.sentiment}`);
          
          // Create post with classification
          await prisma.ct_posts.create({
            data: {
              ct_account_id: account.id,
              tweet_id: tweet.tweetId,
              tweet_text: tweet.tweetText,
              tweet_created_at: tweet.tweetCreatedAt,
              is_signal_candidate: classification.isSignalCandidate,
              extracted_tokens: classification.extractedTokens,
            },
          });
          createdCount++;
        } catch (error: any) {
          if (error.code === 'P2002') {
            // Duplicate tweet, skip
            skippedCount++;
          } else {
            console.error(`[${account.x_username}] Error creating post:`, error.message);
          }
        }
      }

      // Update last seen timestamp
      await prisma.ct_accounts.update({
        where: { id: account.id },
        data: { last_seen_at: new Date() },
      });

      results.push({
        accountId: account.id,
        username: account.x_username,
        fetched: tweets.length,
        created: createdCount,
        skipped: skippedCount,
      });

      console.log(`[${account.x_username}] ✅ ${createdCount} created, ${skippedCount} skipped\n`);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 INGESTION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const totalFetched = results.reduce((sum, r) => sum + r.fetched, 0);
    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    console.log(`Accounts processed: ${accounts.length}`);
    console.log(`Tweets fetched: ${totalFetched}`);
    console.log(`New posts created: ${totalCreated}`);
    console.log(`Duplicates skipped: ${totalSkipped}`);
    console.log(`\nCompleted at: ${new Date().toISOString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return {
      success: true,
      processed: accounts.length,
      totalFetched,
      totalCreated,
      totalSkipped,
    };
  } catch (error: any) {
    console.error('\n❌ ERROR during tweet ingestion:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  ingestTweets()
    .then(() => {
      console.log('✅ Tweet ingestion worker completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tweet ingestion worker failed:', error);
      process.exit(1);
    });
}

export { ingestTweets };


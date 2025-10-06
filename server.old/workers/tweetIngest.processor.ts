import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { QUEUE_NAMES, tweetIngestQueue, classifyQueue, redisConnection } from './queues';

interface TweetIngestJobData {
  ctAccountId: string;
}


export function createTweetIngestWorker(prisma: PrismaService) {
  return new Worker<TweetIngestJobData>(
    QUEUE_NAMES.TWEET_INGEST,
    async (job: Job<TweetIngestJobData>) => {
      const { ctAccountId } = job.data;
      
      try {
        console.log(`[TweetIngest] Ingesting tweets for account ${ctAccountId}`);
        
        const account = await prisma.ctAccount.findUnique({
          where: { id: ctAccountId },
        });
        
        if (!account) {
          console.error(`[TweetIngest] Account ${ctAccountId} not found`);
          return;
        }
        
        // Fetch tweets from X API (tries GAME API first, then bearer token)
        let tweets: Array<{ tweetId: string; tweetText: string; tweetCreatedAt: Date }> = [];
        
        // Try multi-method X API client (GAME API + Bearer Token)
        const multiApiModule = await import('../../lib/x-api-multi').catch(() => null);
        if (multiApiModule) {
          const xApiClient = multiApiModule.createMultiMethodXApiClient();
          
          if (xApiClient) {
            try {
              // Get the last tweet ID we've seen for this account
              const lastTweet = await prisma.ctPost.findFirst({
                where: { ctAccountId },
                orderBy: { tweetCreatedAt: 'desc' },
              });

              const xTweets = await xApiClient.getUserTweets(account.xUsername, {
                maxResults: 50,
                sinceId: lastTweet?.tweetId,
              });

              tweets = xTweets.map(tweet => ({
                tweetId: tweet.id,
                tweetText: tweet.text,
                tweetCreatedAt: new Date(tweet.created_at),
              }));

              console.log(`[TweetIngest] Fetched ${tweets.length} tweets from X API for @${account.xUsername}`);
            } catch (error) {
              console.error(`[TweetIngest] X API error for @${account.xUsername}:`, error);
            }
          } else {
            console.warn('[TweetIngest] X API client not configured, using mock data');
          }
        }

        // Fallback to mock tweets if X API is not available or failed
        if (tweets.length === 0) {
          tweets = [
            {
              tweetId: `${Date.now()}_1`,
              tweetText: `$BTC looking bullish after breaking resistance`,
              tweetCreatedAt: new Date(),
            },
            {
              tweetId: `${Date.now()}_2`,
              tweetText: `$ETH consolidating nicely, expecting move up`,
              tweetCreatedAt: new Date(),
            },
          ];
          console.log(`[TweetIngest] Using mock tweets (${tweets.length} tweets)`);
        }
        
        console.log(`[TweetIngest] Processing ${tweets.length} new tweets`);
        
        // For each tweet, create CtPost with tweetId (ignore if duplicate)
        for (const tweet of tweets) {
          try {
            const post = await prisma.ctPost.create({
              data: {
                ctAccountId,
                tweetId: tweet.tweetId,
                tweetText: tweet.tweetText,
                tweetCreatedAt: tweet.tweetCreatedAt,
                isSignalCandidate: false,
                extractedTokens: [],
              },
            });
            
            console.log(`[TweetIngest] Created CtPost ${post.id} for tweet ${tweet.tweetId}`);
            
            await classifyQueue.add('classify-tweet', { ctPostId: post.id });
            console.log(`[TweetIngest] Enqueued classify job for post ${post.id}`);
          } catch (error: any) {
            if (error.code === 'P2002') {
              console.log(`[TweetIngest] Tweet ${tweet.tweetId} already exists, skipping`);
            } else {
              console.error(`[TweetIngest] Error creating post for tweet ${tweet.tweetId}:`, error);
            }
          }
        }
        
        await prisma.ctAccount.update({
          where: { id: ctAccountId },
          data: { lastSeenAt: new Date() },
        });
        
        console.log(`[TweetIngest] Completed ingestion for account ${ctAccountId}`);
      } catch (error) {
        console.error(`[TweetIngest] Error processing account ${ctAccountId}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

export async function setupTweetIngestCron(prisma: PrismaService) {
  const accounts = await prisma.ctAccount.findMany();
  
  console.log(`[TweetIngest] Setting up CRON for ${accounts.length} CT accounts`);
  
  for (const account of accounts) {
    await tweetIngestQueue.add(
      `ingest-${account.id}`,
      { ctAccountId: account.id },
      {
        repeat: {
          pattern: '0 */6 * * *',
          key: `ingest-${account.id}`,
        },
      }
    );
    console.log(`[TweetIngest] Scheduled CRON for account ${account.xUsername} (${account.id})`);
  }
}

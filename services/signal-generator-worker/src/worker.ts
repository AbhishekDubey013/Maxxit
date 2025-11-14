/**
 * Signal Generator Worker (Microservice)
 * Generates trading signals from classified tweets using LLM + LunarCrush
 * Interval: 5 minutes (configurable via WORKER_INTERVAL)
 */

import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './lib/prisma-client';
import { setupGracefulShutdown, registerCleanup } from './lib/graceful-shutdown';
import { checkDatabaseHealth } from './lib/prisma-client';
import { getLunarCrushScore, canUseLunarCrush } from './lib/lunarcrush-wrapper';

dotenv.config();

const PORT = process.env.PORT || 5008;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '300000'); // 5 minutes default

let workerInterval: NodeJS.Timeout | null = null;

// Health check server
const app = express();
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    service: 'signal-generator-worker',
    interval: INTERVAL,
    database: dbHealthy ? 'connected' : 'disconnected',
    isRunning: workerInterval !== null,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🏥 Signal Generator Worker health check server listening on port ${PORT}`);
});

/**
 * Generate signals from classified tweets
 */
async function generateSignals() {
  try {
    console.log('\n🔍 Signal Generator Worker - Starting cycle...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get unprocessed signal candidates
    const unprocessedTweets = await prisma.ct_posts.findMany({
      where: {
        is_signal_candidate: true,
        processed_for_signals: false,
      },
      include: {
        ct_accounts: {
          include: {
            agent_accounts: {
              include: {
                agents: true,
              },
            },
          },
        },
      },
      orderBy: {
        tweet_created_at: 'desc',
      },
      take: 20, // Process 20 tweets per cycle
    });

    console.log(`📊 Found ${unprocessedTweets.length} unprocessed signal candidate(s)\n`);

    if (unprocessedTweets.length === 0) {
      console.log('✅ No signals to generate\n');
      return;
    }

    let signalsGenerated = 0;

    // Process each tweet
    for (const tweet of unprocessedTweets) {
      try {
        console.log(`[Tweet ${tweet.tweet_id}] Processing...`);
        console.log(`  Text: ${tweet.tweet_text.substring(0, 60)}...`);
        console.log(`  Tokens: ${tweet.extracted_tokens.join(', ')}`);
        console.log(`  Sentiment: ${tweet.signal_type || 'unknown'}`);

        // Get agents subscribed to this account
        const subscribedAgents = tweet.ct_accounts.agent_accounts
          .map(aa => aa.agents)
          .filter(agent => agent.status === 'PUBLIC');

        if (subscribedAgents.length === 0) {
          console.log(`  ⏭️  No active agents subscribed\n`);
          continue;
        }

        console.log(`  🤖 ${subscribedAgents.length} agent(s) subscribed`);

        // Generate signal for each subscribed agent
        for (const agent of subscribedAgents) {
          try {
            // Generate signals for each extracted token
            for (const token of tweet.extracted_tokens) {
              await generateSignalForAgentAndToken(
                tweet,
                agent,
                token
              );
              signalsGenerated++;
            }
          } catch (error: any) {
            console.log(`  ❌ Error generating signal for agent ${agent.name}:`, error.message);
          }
        }

        // Mark tweet as processed
        await prisma.ct_posts.update({
          where: { id: tweet.id },
          data: { processed_for_signals: true },
        });

        console.log(`  ✅ Tweet processed\n`);
      } catch (error: any) {
        console.error(`[Tweet ${tweet.tweet_id}] ❌ Error:`, error.message);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SIGNAL GENERATION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Tweets Processed: ${unprocessedTweets.length}`);
    console.log(`  Signals Generated: ${signalsGenerated}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error: any) {
    console.error('[SignalGenerator] ❌ Fatal error:', error.message);
  }
}

/**
 * Generate a signal for a specific agent and token
 * Matches monolith flow: LLM classification (already done) + LunarCrush scoring + simple rules
 */
async function generateSignalForAgentAndToken(
  tweet: any,
  agent: any,
  token: string
) {
  try {
    // Stablecoins should NOT be traded (they are base currency)
    const EXCLUDED_TOKENS = ['USDC', 'USDT', 'DAI', 'USDC.E', 'BUSD', 'FRAX'];
    if (EXCLUDED_TOKENS.includes(token.toUpperCase())) {
      console.log(`    ⏭️  Skipping stablecoin ${token} - base currency only`);
      return;
    }

    // Determine side from tweet sentiment (already classified by LLM)
    const side = tweet.signal_type === 'SHORT' ? 'SHORT' : 'LONG';
    
    // Default position size (will be overridden by LunarCrush if available)
    let positionSizePercent = 5; // Default 5%
    let lunarcrushScore: number | null = null;
    let lunarcrushReasoning: string | null = null;
    let lunarcrushBreakdown: any = null;

    // Get LunarCrush score for dynamic position sizing (0-10%)
    if (canUseLunarCrush()) {
      try {
        const lcResult = await getLunarCrushScore(token, tweet.confidence_score || 0.5);
        if (lcResult.success && lcResult.score) {
          lunarcrushScore = lcResult.score;
          lunarcrushReasoning = lcResult.reasoning;
          lunarcrushBreakdown = lcResult.breakdown;
          
          // LunarCrush determines position size (0-10%)
          // Score > 0 means tradeable, score <= 0 means skip
          if (lunarcrushScore > 0) {
            // Convert score (-1 to 1) to position size (0-10%)
            positionSizePercent = Math.max(0, Math.min(10, lunarcrushScore * 10));
            console.log(`    📊 LunarCrush: ${token} score=${lunarcrushScore.toFixed(3)}, position=${positionSizePercent.toFixed(2)}%`);
          } else {
            console.log(`    ⏭️  LunarCrush: ${token} score=${lunarcrushScore.toFixed(3)} - NOT TRADEABLE`);
            return; // Skip this signal
          }
        }
      } catch (lcError: any) {
        console.log(`    ⚠️  LunarCrush scoring failed: ${lcError.message} - using default 5%`);
      }
    } else {
      console.log(`    ⚠️  LunarCrush not configured - using default 5% position size`);
    }

    // Create signal (risk_model is just metadata, not used by executor or monitor)
    const signal = await prisma.signals.create({
      data: {
        agent_id: agent.id,
        token_symbol: token,
        venue: agent.venue,
        side: side,
        size_model: {
          type: 'balance-percentage',
          value: positionSizePercent, // Dynamic from LunarCrush!
          impactFactor: tweet.ct_accounts.impact_factor || 0,
        },
        risk_model: {}, // Empty - not used by any service, just kept for schema compliance
        source_tweets: [tweet.tweet_id],
        lunarcrush_score: lunarcrushScore,
        lunarcrush_reasoning: lunarcrushReasoning,
        lunarcrush_breakdown: lunarcrushBreakdown,
      },
    });

    console.log(`    ✅ Signal created: ${side} ${token} on ${agent.venue} (${positionSizePercent.toFixed(2)}% position)`);
  } catch (error: any) {
    throw error;
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Signal Generator Worker starting...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000 / 60} minutes)`);
  console.log('');
  console.log('📋 Signal Generation Flow:');
  console.log('   1. Tweet classified by LLM (in tweet-ingestion-worker)');
  console.log('   2. LunarCrush scores market data → position size (0-10%)');
  console.log('   3. Signal created with side (LONG/SHORT) + size');
  console.log('   Note: Stop loss & take profit NOT used by any service');
  console.log('');
  
  // Check LunarCrush availability
  if (canUseLunarCrush()) {
    console.log('✅ LunarCrush Scoring: ENABLED');
  } else {
    console.log('⚠️  LunarCrush Scoring: DISABLED');
    console.log('   Set LUNARCRUSH_API_KEY for dynamic position sizing');
    console.log('   Will use default 5% position size without it');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await generateSignals();
  
  // Then run on interval
  workerInterval = setInterval(async () => {
    await generateSignals();
  }, INTERVAL);
}

// Register cleanup to stop worker interval
registerCleanup(async () => {
  console.log('🛑 Stopping Signal Generator Worker interval...');
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
});

// Setup graceful shutdown
setupGracefulShutdown('Signal Generator Worker', server);

// Start worker
if (require.main === module) {
  runWorker().catch(error => {
    console.error('[SignalGenerator] ❌ Worker failed to start:', error);
    process.exit(1);
  });
}

export { generateSignals };


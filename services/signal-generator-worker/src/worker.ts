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
import { SignalGenerator } from './lib/signal-generator';
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

    // Initialize signal generator
    let signalGenerator: SignalGenerator | null = null;
    try {
      signalGenerator = new SignalGenerator();
      console.log('🤖 Signal Generator: ENABLED\n');
    } catch (error: any) {
      console.log('⚠️  Signal Generator: DISABLED (no LLM API key)');
      console.log('   Signals will use fallback logic\n');
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
                token,
                signalGenerator
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
 */
async function generateSignalForAgentAndToken(
  tweet: any,
  agent: any,
  token: string,
  signalGenerator: SignalGenerator | null
) {
  try {
    // Determine side from tweet
    const side = tweet.signal_type === 'SHORT' ? 'SHORT' : 'LONG';
    
    let sizePercent = 10; // Default 10%
    let confidence = tweet.confidence_score || 0.5;
    let stopLossPercent = 5;
    let takeProfitPercent = 10;

    // If we have LLM signal generator, use it for better signals
    if (signalGenerator) {
      try {
        const signal = await signalGenerator.generateSignal({
          tweetText: tweet.tweet_text,
          tweetSentiment: tweet.signal_type === 'SHORT' ? 'bearish' : tweet.signal_type === 'LONG' ? 'bullish' : 'neutral',
          tweetConfidence: confidence,
          tokenSymbol: token,
          venue: agent.venue,
          ctAccountImpactFactor: tweet.ct_accounts.impact_factor || 0,
        });

        confidence = signal.confidence;
        stopLossPercent = signal.stopLoss.type === 'percentage' ? signal.stopLoss.value : 5;
        takeProfitPercent = signal.takeProfit.type === 'percentage' ? signal.takeProfit.value : 10;
        
        // Adjust size based on confidence
        if (confidence >= 0.8) sizePercent = 15;
        else if (confidence >= 0.6) sizePercent = 10;
        else sizePercent = 5;
      } catch (llmError: any) {
        console.log(`    ⚠️  LLM generation failed, using fallback: ${llmError.message}`);
      }
    }

    // Get LunarCrush score if available
    let lunarcrushScore: number | null = null;
    let lunarcrushReasoning: string | null = null;
    let lunarcrushBreakdown: any = null;

    if (canUseLunarCrush()) {
      try {
        const lcResult = await getLunarCrushScore(token);
        if (lcResult.success) {
          lunarcrushScore = lcResult.score;
          lunarcrushReasoning = lcResult.reasoning;
          lunarcrushBreakdown = lcResult.breakdown;
          
          // Adjust confidence based on LunarCrush score
          if (lunarcrushScore) {
            confidence = (confidence + lunarcrushScore) / 2;
          }
        }
      } catch (lcError: any) {
        console.log(`    ⚠️  LunarCrush scoring failed: ${lcError.message}`);
      }
    }

    // Create signal
    const signal = await prisma.signals.create({
      data: {
        agent_id: agent.id,
        token_symbol: token,
        venue: agent.venue,
        side: side,
        size_model: {
          position_size_percent: sizePercent,
          confidence: confidence,
        },
        risk_model: {
          stop_loss_percent: stopLossPercent,
          take_profit_percent: takeProfitPercent,
          leverage: agent.venue === 'SPOT' ? 1 : 2,
        },
        source_tweets: [tweet.tweet_id],
        lunarcrush_score: lunarcrushScore,
        lunarcrush_reasoning: lunarcrushReasoning,
        lunarcrush_breakdown: lunarcrushBreakdown,
      },
    });

    console.log(`    ✅ Signal created: ${side} ${token} on ${agent.venue} (${Math.round(confidence * 100)}% confidence)`);
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
  
  // Check LLM availability
  try {
    new SignalGenerator();
    console.log('🤖 LLM Signal Generator: ENABLED');
  } catch {
    console.log('⚠️  LLM Signal Generator: DISABLED (using fallback)');
    console.log('   Set PERPLEXITY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY to enable');
  }
  
  // Check LunarCrush availability
  if (canUseLunarCrush()) {
    console.log('📊 LunarCrush Scoring: ENABLED');
  } else {
    console.log('⚠️  LunarCrush Scoring: DISABLED');
    console.log('   Set LUNARCRUSH_API_KEY to enable');
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


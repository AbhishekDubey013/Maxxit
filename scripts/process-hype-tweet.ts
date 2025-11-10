/**
 * Process HYPE Test Tweet
 * Manually classify and generate signals for the test tweet
 */

import { PrismaClient } from '@prisma/client';
import { LLMTweetClassifier } from '../lib/llm-classifier';

const prisma = new PrismaClient();

// Use Perplexity (already configured)
const classifier = new LLMTweetClassifier({
  provider: 'perplexity',
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  model: 'sonar',
});

const TWEET_ID = '19872736228673';

async function processHypeTweet() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║        🐦 PROCESSING HYPE TEST TWEET                         ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Get the tweet
    const tweet = await prisma.ct_posts.findFirst({
      where: { tweet_id: TWEET_ID },
      include: {
        ct_accounts: true,
      },
    });

    if (!tweet) {
      console.error('❌ Tweet not found:', TWEET_ID);
      return;
    }

    console.log('📝 Tweet Details:');
    console.log(`   ID: ${tweet.tweet_id}`);
    console.log(`   Author: @${tweet.ct_accounts.x_username}`);
    console.log(`   Text: ${tweet.tweet_text}`);
    console.log('');

    // 2. Classify tweet using LLM (Perplexity)
    console.log('🤖 Classifying tweet with Perplexity LLM...');
    
    const result = await classifier.classifyTweet(tweet.tweet_text);
    
    console.log('✅ Classification Result:');
    console.log(`   Is Signal: ${result.isSignalCandidate}`);
    console.log(`   Tokens: ${JSON.stringify(result.extractedTokens)}`);
    console.log(`   Sentiment: ${result.sentiment}`);
    console.log(`   Confidence: ${Math.round(result.confidence * 100)}%`);
    if (result.reasoning) {
      console.log(`   Reasoning: ${result.reasoning}`);
    }
    console.log('');

    // Map sentiment to signal type
    const signalType = result.sentiment === 'bullish' ? 'LONG' : result.sentiment === 'bearish' ? 'SHORT' : null;
    
    const classification = {
      isSignal: result.isSignalCandidate,
      tokens: result.extractedTokens,
      signalType,
      confidence: Math.round(result.confidence * 100),
    };

    // 3. Update tweet in database
    await prisma.ct_posts.update({
      where: { id: tweet.id },
      data: {
        is_signal_candidate: classification.isSignal,
        extracted_tokens: classification.tokens,
        signal_type: classification.signalType,
        confidence_score: classification.confidence,
        processed_for_signals: false,
      },
    });

    console.log('✅ Tweet updated in database\n');

    if (!classification.isSignal) {
      console.log('⚠️  Tweet is not a trading signal. Stopping here.');
      return;
    }

    // 4. Find agents following this CT account (Ostium only)
    const agents = await prisma.agents.findMany({
      where: {
        venue: 'OSTIUM',
        status: 'ACTIVE',
        agent_accounts: {
          some: {
            ct_account_id: tweet.ct_account_id,
          },
        },
      },
      include: {
        agent_deployments: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    console.log(`📊 Found ${agents.length} Ostium agents following @${tweet.ct_accounts.x_username}:\n`);

    let signalsCreated = 0;

    // 5. Create signals for each agent and token
    for (const agent of agents) {
      console.log(`   🤖 Agent: ${agent.name} (${agent.agent_deployments.length} deployments)`);
      
      for (const token of classification.tokens) {
        try {
          // Check for duplicate (same agent, token, 6h bucket)
          const now = new Date();
          const bucket6hStart = new Date(
            Math.floor(now.getTime() / (6 * 60 * 60 * 1000)) * 6 * 60 * 60 * 1000
          );

          const existing = await prisma.signals.findFirst({
            where: {
              agent_id: agent.id,
              token_symbol: token,
              created_at: {
                gte: bucket6hStart,
              },
            },
          });

          if (existing) {
            console.log(`      ⏭️  ${token}: Signal already exists in current bucket`);
            continue;
          }

          // Create signal with FIXED 5% position size
          const signal = await prisma.signals.create({
            data: {
              agent_id: agent.id,
              venue: 'OSTIUM',
              token_symbol: token,
              side: classification.signalType,
              size_model: {
                type: 'balance-percentage',
                value: 5, // FIXED 5%
              },
              risk_model: {
                stopLoss: 0.05, // 5% stop loss
                takeProfit: 0.15, // 15% take profit
                trailingPercent: 1, // 1% trailing stop
                leverage: 3, // 3x leverage (from tweet)
              },
              source_tweets: [TWEET_ID],
              proof_verified: true,
            },
          });

          console.log(`      ✅ ${token}: Signal created (${signal.id.substring(0, 8)}...)`);
          signalsCreated++;
        } catch (error: any) {
          console.error(`      ❌ ${token}: Failed - ${error.message}`);
        }
      }
      console.log('');
    }

    // 6. Mark tweet as processed
    await prisma.ct_posts.update({
      where: { id: tweet.id },
      data: { processed_for_signals: true },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📊 Summary:`);
    console.log(`   Signals Created: ${signalsCreated}`);
    console.log(`   Agents Processed: ${agents.length}`);
    console.log(`   Tokens: ${classification.tokens.join(', ')}`);
    console.log('\n✅ Processing complete!\n');
    console.log('🚀 Next: Trade Executor will pick up these signals and execute positions\n');

    return { success: true, signalsCreated };
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

processHypeTweet()
  .then(result => {
    console.log('[ProcessHypeTweet] Result:', result);
    process.exit(result?.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[ProcessHypeTweet] Fatal error:', error);
    process.exit(1);
  });


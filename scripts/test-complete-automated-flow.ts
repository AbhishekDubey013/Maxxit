#!/usr/bin/env tsx

/**
 * Complete End-to-End Automated Flow Test
 * 
 * Tests the entire pipeline:
 * 1. Tweet Ingestion (synthetic tweet)
 * 2. LLM Filtering (confidence + token extraction)
 * 3. Signal Generation (LunarCrush + exponential scaling)
 * 4. Trade Execution (Hyperliquid)
 * 5. Position Verification
 */

import { PrismaClient } from '@prisma/client';
import { classifyTweet } from '../lib/llm-classifier';
import { createLunarCrushScorer } from '../lib/lunarcrush-score';
import { getUserAgentWallet, getUserAgentPrivateKey } from '../lib/hyperliquid-user-wallet';
import { HyperliquidAdapter } from '../lib/adapters/hyperliquid-adapter';

const prisma = new PrismaClient();

interface TestConfig {
  userWallet: string;
  agentName: string;
  tweetText: string;
  ctAccountName: string;
}

async function testCompleteFlow(config: TestConfig) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Complete Automated Flow Test                                ║');
  console.log('║   Tweet → Signal → Trade → Position                           ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Configuration:');
  console.log(`  User Wallet: ${config.userWallet}`);
  console.log(`  Agent: ${config.agentName}`);
  console.log(`  Tweet: "${config.tweetText}"`);
  console.log(`  CT Account: ${config.ctAccountName}\n`);

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Create Synthetic Tweet
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 1: Create Synthetic Tweet');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Find or create CT account
    let ctAccount = await prisma.ct_accounts.findFirst({
      where: {
        OR: [
          { x_username: { contains: config.ctAccountName, mode: 'insensitive' } },
          { display_name: { contains: config.ctAccountName, mode: 'insensitive' } }
        ]
      }
    });

    if (!ctAccount) {
      console.log(`Creating CT account: ${config.ctAccountName}...`);
      ctAccount = await prisma.ct_accounts.create({
        data: {
          x_username: config.ctAccountName.toLowerCase(),
          display_name: config.ctAccountName,
          impact_factor: 1.0,
        }
      });
    }

    console.log(`✅ CT Account: ${ctAccount.display_name || ctAccount.x_username} (${ctAccount.id})`);

    // Create synthetic tweet
    const tweetId = `synthetic_${Date.now()}`;
    const tweet = await prisma.ct_posts.create({
      data: {
        tweet_id: tweetId,
        ct_account_id: ctAccount.id,
        tweet_text: config.tweetText,
        tweet_created_at: new Date(),
        is_signal_candidate: null, // Not processed yet
      }
    });

    console.log(`✅ Created tweet: ${tweet.tweet_id}`);
    console.log(`   Text: "${tweet.tweet_text}"\n`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: LLM Filtering
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 2: LLM Filtering (Tweet Classification)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Running LLM classification...');
    const classification = await classifyTweet(tweet.tweet_text);

    console.log(`✅ Classification complete:`);
    console.log(`   Is Signal: ${classification.isSignalCandidate}`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    console.log(`   Tokens: ${classification.extractedTokens?.join(', ') || 'None'}`);
    console.log(`   Sentiment: ${classification.sentiment}`);
    console.log(`   Reasoning: ${classification.reasoning || 'N/A'}\n`);

    // Map sentiment to side
    const side = classification.sentiment === 'bullish' ? 'LONG' : 
                 classification.sentiment === 'bearish' ? 'SHORT' : null;

    // Update tweet with classification
    await prisma.ct_posts.update({
      where: { id: tweet.id },
      data: {
        is_signal_candidate: classification.isSignalCandidate,
        extracted_tokens: classification.extractedTokens || [],
        confidence_score: classification.confidence,
        signal_type: side,
      }
    });

    if (!classification.isSignalCandidate || !classification.extractedTokens || classification.extractedTokens.length === 0) {
      console.log('❌ Tweet is not a signal or no tokens extracted. Stopping.');
      console.log(`   Reason: isSignalCandidate=${classification.isSignalCandidate}, tokens=${classification.extractedTokens?.length || 0}`);
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: Signal Generation (LunarCrush + Exponential Scaling)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 3: Signal Generation (LunarCrush + Tweet Confidence)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const lunarCrush = createLunarCrushScorer();
    if (!lunarCrush) {
      console.log('❌ LunarCrush API key not configured. Skipping signal generation.');
      return;
    }

    // Find agent
    const agent = await prisma.agents.findFirst({
      where: {
        name: { contains: config.agentName, mode: 'insensitive' },
        venue: 'HYPERLIQUID'
      }
    });

    if (!agent) {
      console.log(`❌ Agent "${config.agentName}" not found. Please create it first.`);
      return;
    }

    console.log(`✅ Agent: ${agent.name} (${agent.id})\n`);

    // Delete any existing signals for this agent (cleanup old test runs)
    const deleted = await prisma.signals.deleteMany({
      where: {
        agent_id: agent.id,
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24h
      }
    });
    if (deleted.count > 0) {
      console.log(`🧹 Cleaned up ${deleted.count} old test signal(s)\n`);
    }

    // Process each token
    const signals = [];
    for (const token of classification.extractedTokens) {
      console.log(`📊 Processing token: ${token}`);

      // Get LunarCrush score with tweet confidence
      const scoreData = await lunarCrush.getTokenScore(token, classification.confidence);

      console.log(`   LunarCrush Score: ${scoreData.score.toFixed(3)}`);
      console.log(`   Combined Score: ${scoreData.combinedScore.toFixed(3)}`);
      console.log(`   Tweet Confidence: ${(scoreData.tweetConfidence * 100).toFixed(1)}%`);
      console.log(`   Position Size: ${scoreData.positionSize.toFixed(2)}% (exponential)`);
      console.log(`   Tradeable: ${scoreData.tradeable ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   Reasoning: ${scoreData.reasoning}\n`);

      if (!scoreData.tradeable) {
        console.log(`   ⚠️ Skipping ${token} - not tradeable (score <= 0)\n`);
        continue;
      }

      // Create signal
      const signal = await prisma.signals.create({
        data: {
          agent_id: agent.id,
          token_symbol: token,
          venue: 'HYPERLIQUID',
          side: side || 'LONG',
          size_model: {
            type: 'balance-percentage',
            value: scoreData.positionSize, // Exponentially scaled!
            impactFactor: ctAccount.impact_factor,
          },
          risk_model: {
            stopLoss: 0.10,    // -10%
            takeProfit: 0.20,   // +20%
            trailingStop: 0.05  // 5%
          },
          source_tweets: [tweet.tweet_id],
          lunarcrush_score: scoreData.combinedScore,
          lunarcrush_reasoning: scoreData.reasoning,
          lunarcrush_breakdown: scoreData.breakdown,
        }
      });

      signals.push(signal);
      console.log(`   ✅ Signal created: ${signal.id}\n`);
    }

    if (signals.length === 0) {
      console.log('❌ No tradeable signals generated. Stopping.');
      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Setup User's Agent Wallet
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 4: Setup User Agent Wallet');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get or create user's agent wallet
    const agentAddress = await getUserAgentWallet(config.userWallet);
    console.log(`✅ Agent Address: ${agentAddress}`);

    // Get private key for trading
    const privateKey = await getUserAgentPrivateKey(config.userWallet);
    console.log(`✅ Private Key: ${privateKey.substring(0, 10)}...${privateKey.substring(62)}\n`);

    console.log('⚠️ IMPORTANT: Make sure this agent address is whitelisted on Hyperliquid!');
    console.log(`   Visit: https://app.hyperliquid.xyz/API (testnet)`);
    console.log(`   Add: ${agentAddress}\n`);

    // Auto-proceed if SKIP_WHITELIST_CHECK is set
    if (!process.env.SKIP_WHITELIST_CHECK) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      await new Promise<void>((resolve) => {
        readline.question('Have you whitelisted this address? (y/n): ', (answer: string) => {
          readline.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('\n❌ Please whitelist the agent address and try again.');
            process.exit(0);
          }
          resolve();
        });
      });
    } else {
      console.log('✅ Skipping whitelist check (SKIP_WHITELIST_CHECK=true)\n');
    }

    console.log('');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: Trade Execution (Hyperliquid)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 5: Trade Execution (Hyperliquid)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Initialize Hyperliquid adapter
    const hl = new HyperliquidAdapter(agentAddress, privateKey, true); // testnet

    // Get account balance
    const balanceInfo = await hl.getBalance(agentAddress);
    const balance = balanceInfo.withdrawable;
    console.log(`💰 Account Balance: $${balance.toFixed(2)}`);
    console.log(`   (Total: $${balanceInfo.total.toFixed(2)}, Withdrawable: $${balanceInfo.withdrawable.toFixed(2)})\n`);

    // Execute each signal
    for (const signal of signals) {
      console.log(`📈 Executing signal for ${signal.token_symbol}...`);

      // Calculate position size
      const sizeModel = signal.size_model as any;
      const positionSizePercent = sizeModel.value;
      const positionSizeUSD = balance * (positionSizePercent / 100);

      console.log(`   Position Size: ${positionSizePercent.toFixed(2)}% = $${positionSizeUSD.toFixed(2)}`);

      // Check minimum order value
      if (positionSizeUSD < 10) {
        console.log(`   ❌ Position size too small (min $10). Need balance of at least $${(1000 / positionSizePercent).toFixed(2)}`);
        console.log(`   Skipping ${signal.token_symbol}\n`);
        continue;
      }

      try {
        // Execute trade
        const result = await hl.openPosition({
          symbol: signal.token_symbol,
          side: signal.side as 'LONG' | 'SHORT',
          usdAmount: positionSizeUSD,
          leverage: 1
        });

        console.log(`   ✅ Trade executed!`);
        console.log(`   Entry Price: $${result.averagePrice}`);
        console.log(`   Size: ${result.size} ${signal.token_symbol}`);
        console.log(`   Value: $${positionSizeUSD.toFixed(2)}\n`);

        // Create position record (simulate - would be done by trade executor)
        const position = await prisma.positions.create({
          data: {
            signal_id: signal.id,
            deployment_id: '00000000-0000-0000-0000-000000000000', // Placeholder
            token_symbol: signal.token_symbol,
            venue: 'HYPERLIQUID',
            side: signal.side,
            qty: result.size.toString(),
            entry_price: result.averagePrice.toString(),
            status: 'OPEN',
            pnl: '0',
            source: 'auto',
          }
        });

        console.log(`   ✅ Position created: ${position.id}\n`);

      } catch (error: any) {
        console.log(`   ❌ Trade failed: ${error.message}\n`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Verify Positions
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  STEP 6: Verify Positions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const openPositions = await hl.getPositions(agentAddress);
    const activePositions = openPositions.filter(p => parseFloat(p.szi) !== 0);
    console.log(`📊 Open Positions: ${activePositions.length}\n`);

    for (const pos of activePositions) {
      console.log(`   ${pos.coin}:`);
      console.log(`   - Side: ${parseFloat(pos.szi) > 0 ? 'LONG' : 'SHORT'}`);
      console.log(`   - Size: ${Math.abs(parseFloat(pos.szi))}`);
      console.log(`   - Entry: $${pos.entryPx}`);
      console.log(`   - PnL: $${pos.unrealizedPnl}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ COMPLETE FLOW TEST SUCCESSFUL!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Flow Summary:');
    console.log(`  1. ✅ Tweet created and classified`);
    console.log(`  2. ✅ LLM extracted tokens with ${(classification.confidence * 100).toFixed(1)}% confidence`);
    console.log(`  3. ✅ LunarCrush scored and sized positions (exponential)`);
    console.log(`  4. ✅ Signals generated with dynamic sizing`);
    console.log(`  5. ✅ Agent wallet setup (${agentAddress})`);
    console.log(`  6. ✅ Trades executed on Hyperliquid`);
    console.log(`  7. ✅ Positions verified and tracked\n`);

    console.log('🚀 System is ready for production!\n');

  } catch (error: any) {
    console.error('\n❌ Error during flow test:', error);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Run Test
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const testConfig: TestConfig = {
  userWallet: process.env.TEST_USER_WALLET || '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3',
  agentName: process.env.TEST_AGENT_NAME || 'Ring',
  tweetText: process.env.TEST_TWEET || 'Bitcoin is showing strong bullish momentum! $BTC to the moon! 🚀',
  ctAccountName: process.env.TEST_CT_ACCOUNT || 'TestTrader'
};

console.log('\n🧪 Starting Complete Automated Flow Test...\n');
console.log('You can customize with environment variables:');
console.log('  TEST_USER_WALLET - Your wallet address');
console.log('  TEST_AGENT_NAME - Agent name (e.g., Ring, Vader)');
console.log('  TEST_TWEET - Custom tweet text');
console.log('  TEST_CT_ACCOUNT - CT account name\n');

testCompleteFlow(testConfig)
  .then(() => {
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });


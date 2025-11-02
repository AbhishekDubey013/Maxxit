#!/usr/bin/env npx tsx
/**
 * Test LunarCrush Integration with Signal Generation
 * 
 * This script demonstrates the complete flow:
 * 1. Create test CT post (tweet)
 * 2. Call signal generation API (which uses LunarCrush)
 * 3. Show signal created with dynamic position size
 */

import { PrismaClient } from '@prisma/client';
import { createLunarCrushScorer } from '../lib/lunarcrush-score';

const prisma = new PrismaClient();

async function testLunarCrushSignalFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   LunarCrush Signal Generation Flow - Test                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Check LunarCrush API is configured
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Checking LunarCrush Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const scorer = createLunarCrushScorer();
    if (!scorer) {
      console.error('❌ LUNARCRUSH_API_KEY not configured in .env');
      console.log('Please add: LUNARCRUSH_API_KEY=your-key-here\n');
      process.exit(1);
    }
    console.log('✅ LunarCrush API configured\n');

    // 2. Test scoring for sample tokens
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: Testing LunarCrush Scoring');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testTokens = ['BTC', 'ETH', 'SOL'];
    const scores: any[] = [];

    for (const token of testTokens) {
      try {
        console.log(`Fetching score for ${token}...`);
        const score = await scorer.getTokenScore(token);
        scores.push({ token, ...score });
        
        console.log(`✅ ${token}: Score ${score.score.toFixed(3)} → ${score.positionSize.toFixed(2)}% position\n`);
      } catch (error: any) {
        console.log(`❌ ${token}: ${error.message}\n`);
      }
    }

    // 3. Display scoring results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3: LunarCrush Scoring Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (scores.length === 0) {
      console.log('❌ No scores retrieved. Check LunarCrush API connectivity.\n');
      process.exit(1);
    }

    console.log('Token  Score    Position  Tradeable  Reasoning');
    console.log('─────────────────────────────────────────────────────────────');
    for (const s of scores) {
      const emoji = s.tradeable ? '✅' : '❌';
      const scoreStr = s.score.toFixed(3).padEnd(7);
      const posStr = `${s.positionSize.toFixed(2)}%`.padEnd(9);
      console.log(`${s.token.padEnd(5)}  ${scoreStr} ${posStr} ${emoji}     ${s.reasoning.substring(0, 40)}...`);
    }
    console.log();

    // 4. Find or create test agent
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 4: Finding Active Agent');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const agent = await prisma.agents.findFirst({
      where: {
        status: 'ACTIVE',
        venue: 'HYPERLIQUID'
      },
      include: {
        agent_deployments: {
          where: {
            status: 'ACTIVE'
          }
        }
      }
    });

    if (!agent) {
      console.log('❌ No active HYPERLIQUID agent found');
      console.log('Please create an agent first.\n');
      process.exit(1);
    }

    console.log(`✅ Found agent: ${agent.name} (${agent.id})`);
    console.log(`   Venue: ${agent.venue}`);
    console.log(`   Deployments: ${agent.agent_deployments.length}\n`);

    // 5. Find or create test CT account
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 5: Setting Up Test CT Account');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let ctAccount = await prisma.ct_accounts.findFirst({
      where: {
        username: 'lunarcrush_test'
      }
    });

    if (!ctAccount) {
      ctAccount = await prisma.ct_accounts.create({
        data: {
          username: 'lunarcrush_test',
          platform: 'X',
          name: 'LunarCrush Test Account',
          impact_factor: 1.0,
          follower_count: 10000
        }
      });
      console.log('✅ Created test CT account: lunarcrush_test\n');
    } else {
      console.log('✅ Using existing CT account: lunarcrush_test\n');
    }

    // 6. Link agent to CT account if not already linked
    const existingLink = await prisma.agent_accounts.findFirst({
      where: {
        agent_id: agent.id,
        ct_account_id: ctAccount.id
      }
    });

    if (!existingLink) {
      await prisma.agent_accounts.create({
        data: {
          agent_id: agent.id,
          ct_account_id: ctAccount.id
        }
      });
      console.log('✅ Linked agent to CT account\n');
    }

    // 7. Create test CT posts for each scored token
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 6: Creating Test Tweets');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testToken = scores[0].token; // Use best scoring token
    const tweetId = `test_${testToken.toLowerCase()}_${Date.now()}`;

    const post = await prisma.ct_posts.create({
      data: {
        tweet_id: tweetId,
        ct_account_id: ctAccount.id,
        content: `${testToken} looking bullish! 🚀 #crypto #${testToken}`,
        is_signal_candidate: true,
        extracted_tokens: [testToken],
        tweet_created_at: new Date()
      }
    });

    console.log(`✅ Created test tweet:`);
    console.log(`   ID: ${tweetId}`);
    console.log(`   Token: ${testToken}`);
    console.log(`   Content: "${post.content}"\n`);

    // 8. Call signal generation API
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 7: Generating Signal (with LunarCrush)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    console.log(`Calling: ${apiBaseUrl}/api/admin/run-signal-once?agentId=${agent.id}\n`);

    const response = await fetch(`${apiBaseUrl}/api/admin/run-signal-once?agentId=${agent.id}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Signal generation failed: ${error}\n`);
      process.exit(1);
    }

    const result = await response.json();
    console.log(`✅ Signal generation completed`);
    console.log(`   Signals created: ${result.signalsCreated}\n`);

    // 9. Query and display created signals
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 8: Checking Created Signals');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const signals = await prisma.signals.findMany({
      where: {
        agent_id: agent.id,
        token_symbol: testToken,
        created_at: {
          gte: new Date(Date.now() - 60000) // Last minute
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 1
    });

    if (signals.length === 0) {
      console.log('⚠️  No signals created. This could mean:');
      console.log('   - Token already has a signal in this 6h bucket');
      console.log('   - LunarCrush score was ≤ 0 (not tradeable)');
      console.log('   - Token not available on venue');
      console.log();
    } else {
      const signal = signals[0];
      const sizeModel = signal.size_model as any;
      
      console.log('✅ Signal Created Successfully!\n');
      console.log('Signal Details:');
      console.log('───────────────────────────────────────────────────────────────');
      console.log(`ID:              ${signal.id}`);
      console.log(`Token:           ${signal.token_symbol}`);
      console.log(`Venue:           ${signal.venue}`);
      console.log(`Side:            ${signal.side}`);
      console.log();
      console.log('📊 LunarCrush Analysis:');
      console.log('───────────────────────────────────────────────────────────────');
      console.log(`Score:           ${signal.lunarcrush_score?.toFixed(3) || 'N/A'}`);
      console.log(`Position Size:   ${sizeModel.value.toFixed(2)}% ⭐`);
      console.log(`Reasoning:       ${signal.lunarcrush_reasoning || 'N/A'}`);
      console.log();
      
      if (signal.lunarcrush_breakdown) {
        const breakdown = signal.lunarcrush_breakdown as any;
        console.log('Breakdown:');
        console.log(`  Galaxy Score:   ${(breakdown.galaxy * 100).toFixed(1)}%`);
        console.log(`  Sentiment:      ${(breakdown.sentiment * 100).toFixed(1)}%`);
        console.log(`  Social Volume:  ${(breakdown.social * 100).toFixed(1)}%`);
        console.log(`  Momentum:       ${(breakdown.momentum * 100).toFixed(1)}%`);
        console.log(`  Market Rank:    ${(breakdown.rank * 100).toFixed(1)}%`);
        console.log();
      }

      console.log('💰 Trade Calculation (Example with $1000 fund):');
      console.log('───────────────────────────────────────────────────────────────');
      const fundSize = 1000;
      const tradeAmount = fundSize * (sizeModel.value / 100);
      console.log(`Fund Balance:    $${fundSize.toFixed(2)}`);
      console.log(`Position Size:   ${sizeModel.value.toFixed(2)}%`);
      console.log(`Trade Amount:    $${tradeAmount.toFixed(2)} ✅`);
      console.log();
    }

    // 10. Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Complete Flow Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Flow Completed:');
    console.log('  1. ✅ LunarCrush API configured');
    console.log('  2. ✅ Token scores fetched');
    console.log(`  3. ✅ Test tweet created for ${testToken}`);
    console.log('  4. ✅ Signal generation called');
    console.log(`  5. ${signals.length > 0 ? '✅' : '⚠️ '} Signal ${signals.length > 0 ? 'created' : 'skipped (see reasons above)'}`);
    console.log();

    if (signals.length > 0) {
      console.log('🎉 LunarCrush integration is WORKING!');
      console.log();
      console.log('Next Steps:');
      console.log('  1. Run trade executor: npx tsx workers/trade-executor-worker.ts');
      console.log('  2. Check position created with dynamic position size');
      console.log('  3. Monitor performance by LunarCrush score ranges');
    } else {
      console.log('⚠️  Signal was skipped. Check logs above for reasons.');
      console.log('    This is normal if:');
      console.log('    - Token already has recent signal (6h bucket)');
      console.log('    - LunarCrush score ≤ 0 (safety filter)');
      console.log('    - Token not available on venue');
    }
    console.log();

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testLunarCrushSignalFlow()
  .then(() => {
    console.log('Test completed successfully! ✅\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });


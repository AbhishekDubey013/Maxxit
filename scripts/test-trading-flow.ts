#!/usr/bin/env tsx

/**
 * Test Complete Trading Flow on Arbitrum
 * 
 * This script:
 * 1. Finds the agent and its CT account subscription
 * 2. Creates a test tweet/post
 * 3. Generates a signal
 * 4. Executes a trade via the module
 * 5. Shows the position
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Complete Trading Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. Find the agent
    const agent = await prisma.agent.findFirst({
      where: {
        name: {
          contains: 'Jay',
          mode: 'insensitive',
        },
      },
      include: {
        agentAccounts: {
          include: {
            ctAccount: true,
          },
        },
        deployments: {
          where: {
            moduleEnabled: true,
          },
          orderBy: {
            subStartedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!agent) {
      console.log('❌ Agent not found. Looking for all agents...\n');
      
      const allAgents = await prisma.agent.findMany({
        include: {
          agentAccounts: true,
          deployments: true,
        },
        take: 5,
      });

      console.log('📋 Available agents:');
      allAgents.forEach((a) => {
        console.log(`  - ${a.name} (ID: ${a.id})`);
        console.log(`    Venue: ${a.venue}`);
        console.log(`    CT Accounts: ${a.agentAccounts.length}`);
        console.log(`    Deployments: ${a.deployments.length}`);
        console.log('');
      });
      
      return;
    }

    console.log('✅ Found Agent:', agent.name);
    console.log('   ID:', agent.id);
    console.log('   Venue:', agent.venue);
    console.log('   Status:', agent.status);
    console.log('');

    // 2. Check CT account subscription
    if (agent.agentAccounts.length === 0) {
      console.log('❌ Agent has no CT account subscriptions!');
      console.log('   Add a subscription first.');
      return;
    }

    const ctAccount = agent.agentAccounts[0].ctAccount;
    console.log('✅ Subscribed to CT Account:', ctAccount.xUsername);
    console.log('   Display Name:', ctAccount.displayName);
    console.log('');

    // 3. Check deployment
    if (agent.deployments.length === 0) {
      console.log('❌ Agent has no active deployment with module enabled!');
      return;
    }

    const deployment = agent.deployments[0];
    console.log('✅ Active Deployment Found:');
    console.log('   Safe:', deployment.safeWallet);
    console.log('   Module Enabled:', deployment.moduleEnabled);
    console.log('   Status:', deployment.status);
    console.log('');

    // 4. Create test tweet
    console.log('📝 Creating test trading signal tweet...\n');
    
    const testTweet = await prisma.ctPost.create({
      data: {
        ctAccountId: ctAccount.id,
        tweetId: `test_${Date.now()}`,
        tweetText: '$ETH breaking resistance at $2400! Looking for a move to $2600. LONG setup with tight stop at $2350. 🚀',
        tweetCreatedAt: new Date(),
        isSignalCandidate: true,
        extractedTokens: ['ETH'],
      },
    });

    console.log('✅ Test Tweet Created:');
    console.log('   ID:', testTweet.id);
    console.log('   Text:', testTweet.tweetText.substring(0, 80) + '...');
    console.log('   Tokens:', testTweet.extractedTokens);
    console.log('');

    // 5. Create signal
    console.log('📊 Creating trading signal...\n');

    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        tokenSymbol: 'WETH',
        venue: agent.venue,
        side: 'BUY',
        sourceTweets: [testTweet.tweetId],
        sizeModel: {
          tier: 'MEDIUM',
          percentage: 10, // 10% of capital
          confidence: 75,
        },
        riskModel: {
          stopLoss: 2350,
          takeProfit: 2600,
          riskRewardRatio: 5,
        },
      },
    });

    console.log('✅ Signal Created:');
    console.log('   ID:', signal.id);
    console.log('   Token:', signal.tokenSymbol);
    console.log('   Side:', signal.side);
    console.log('   Venue:', signal.venue);
    console.log('   Confidence:', signal.confidence);
    console.log('   Position Size:', signal.sizeModel.value + '%');
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ TEST DATA READY!\n');
    console.log('Next step: Execute the signal\n');
    console.log('Run this command:');
    console.log(`npx tsx scripts/execute-test-signal.ts ${signal.id}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();


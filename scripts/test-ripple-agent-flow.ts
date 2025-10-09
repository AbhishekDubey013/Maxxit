/**
 * Test complete trading flow for Ripple agent
 * Creates a mock tweet → signal → trade → position
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRippleFlow() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🧪 TESTING RIPPLE AGENT FLOW');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Find Ripple agent
    console.log('STEP 1: Finding Ripple agent...');
    const rippleAgent = await prisma.agent.findFirst({
      where: {
        name: {
          contains: 'Ripple',
          mode: 'insensitive',
        },
      },
      include: {
        deployments: {
          where: { moduleEnabled: true },
          orderBy: { subStartedAt: 'desc' },
          take: 1,
        },
        agentAccounts: {
          include: {
            ctAccount: true,
          },
        },
      },
    });

    if (!rippleAgent) {
      console.log('❌ Ripple agent not found in database');
      console.log('   Please create a Ripple agent first via the UI\n');
      return;
    }

    console.log(`✅ Found agent: ${rippleAgent.name} (${rippleAgent.id})`);
    console.log(`   Deployments: ${rippleAgent.deployments.length}`);
    console.log(`   CT Accounts: ${rippleAgent.agentAccounts.length}\n`);

    // Check if agent has active deployment
    if (rippleAgent.deployments.length === 0 || !rippleAgent.deployments[0].moduleEnabled) {
      console.log('⚠️  Agent has no active deployment with module enabled');
      console.log('   Module needs to be enabled on Safe first\n');
    }

    // Step 2: Get or create link to @Abhishe42402615
    console.log('STEP 2: Linking to @Abhishe42402615...');
    const ctAccount = await prisma.ctAccount.findUnique({
      where: { xUsername: 'Abhishe42402615' },
    });

    if (!ctAccount) {
      console.log('❌ @Abhishe42402615 account not found');
      return;
    }

    // Check if already linked
    let agentAccount = await prisma.agentAccount.findUnique({
      where: {
        agentId_ctAccountId: {
          agentId: rippleAgent.id,
          ctAccountId: ctAccount.id,
        },
      },
    });

    if (!agentAccount) {
      console.log('   Creating link...');
      agentAccount = await prisma.agentAccount.create({
        data: {
          agentId: rippleAgent.id,
          ctAccountId: ctAccount.id,
        },
      });
      console.log(`✅ Linked agent to @${ctAccount.xUsername}\n`);
    } else {
      console.log(`✅ Already linked to @${ctAccount.xUsername}\n`);
    }

    // Step 3: Create mock tweet
    console.log('STEP 3: Creating mock tweet...');
    const tweetText = `🚀 $XRP breaking out! Ripple showing strong momentum at $0.52. 
Target: $0.60 (+15%)
Stop: $0.48 (-8%)
Buy zone active! #XRP #Ripple #Crypto`;

    const tweet = await prisma.ctPost.create({
      data: {
        ctAccountId: ctAccount.id,
        tweetId: `test_ripple_${Date.now()}`,
        tweetText: tweetText,
        tweetCreatedAt: new Date(),
        isSignalCandidate: false,
        extractedTokens: [],
      },
    });

    console.log(`✅ Tweet created: ${tweet.id}`);
    console.log(`   "${tweetText.substring(0, 60)}..."\n`);

    // Step 4: Create signal from tweet
    console.log('STEP 4: Creating trading signal...');
    
    // Check if agent has deployment
    if (rippleAgent.deployments.length === 0) {
      console.log('❌ Cannot create signal - no deployment found');
      return;
    }

    const deployment = rippleAgent.deployments[0];

    const signal = await prisma.signal.create({
      data: {
        agentId: rippleAgent.id,
        tokenSymbol: 'WETH', // Using WETH as proxy for XRP testing
        venue: 'SPOT',
        side: 'BUY',
        sizeModel: {
          baseSize: 1.5,
          percentage: 10,
        },
        riskModel: {
          stopLoss: 0.48,
          takeProfit: 0.60,
        },
        sourceTweets: [tweet.id],
      },
    });

    console.log(`✅ Signal created: ${signal.id}`);
    console.log(`   Token: ${signal.tokenSymbol}`);
    console.log(`   Side: ${signal.side}`);
    console.log(`   Venue: ${signal.venue}\n`);

    // Step 5: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ TEST SETUP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Agent: ${rippleAgent.name}`);
    console.log(`CT Account: @${ctAccount.xUsername}`);
    console.log(`Tweet ID: ${tweet.id}`);
    console.log(`Signal ID: ${signal.id}`);
    console.log(`\nNext steps:`);
    console.log(`1. Execute signal: npx tsx scripts/execute-real-trade.ts ${signal.id}`);
    console.log(`2. Monitor position: npx tsx workers/position-monitor-v2.ts`);
    console.log('');

    return {
      agent: rippleAgent,
      tweet,
      signal,
    };

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run
testRippleFlow()
  .then(() => {
    console.log('✅ Complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


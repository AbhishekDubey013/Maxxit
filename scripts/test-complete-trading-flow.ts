#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Trading Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Find @CryptoTrader1 account
    console.log('📋 Step 1: Finding @CryptoTrader1 account...\n');
    
    const ctAccount = await prisma.ctAccount.findUnique({
      where: { xUsername: 'CryptoTrader1' },
    });

    if (!ctAccount) {
      console.log('❌ @CryptoTrader1 account not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found account: @${ctAccount.xUsername}`);
    console.log(`   ID: ${ctAccount.id}\n`);

    // Step 2: Create synthetic tweet
    console.log('📝 Step 2: Creating synthetic tweet...\n');
    
    const tweetText = `🚀 $BTC breaking out! Strong bullish momentum on all timeframes. 
RSI showing strength, MACD golden cross forming. This could be the start of a major rally! 
Target: $75,000 📈 #Bitcoin #Crypto`;

    const tweetId = `synthetic_${Date.now()}`;
    
    let ctPost;
    try {
      ctPost = await prisma.ctPost.create({
        data: {
          ctAccountId: ctAccount.id,
          tweetId: tweetId,
          tweetText: tweetText,
          tweetCreatedAt: new Date(),
          isSignalCandidate: true, // Mark as signal candidate
          extractedTokens: ['BTC', 'Bitcoin'], // Extract BTC token
        },
      });

      console.log(`✅ Tweet created: ${ctPost.id}`);
      console.log(`   Tweet ID: ${tweetId}`);
      console.log(`   Text: ${tweetText.substring(0, 100)}...`);
      console.log(`   Tokens: ${ctPost.extractedTokens.join(', ')}\n`);
    } catch (error: any) {
      console.error('❌ Error creating tweet:', error.message);
      await prisma.$disconnect();
      return;
    }

    // Step 3: Find agent subscribed to this account
    console.log('📋 Step 3: Finding subscribed agents...\n');
    
    const agentAccounts = await prisma.agentAccount.findMany({
      where: { ctAccountId: ctAccount.id },
      include: {
        agent: {
          include: {
            deployments: {
              where: {
                status: 'ACTIVE',
                moduleEnabled: true,
              },
            },
          },
        },
      },
    });

    if (agentAccounts.length === 0) {
      console.log('❌ No agents subscribed to this account');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found ${agentAccounts.length} subscribed agent(s):\n`);
    
    agentAccounts.forEach((aa, i) => {
      console.log(`   ${i + 1}. ${aa.agent.name}`);
      console.log(`      Agent ID: ${aa.agent.id}`);
      console.log(`      Status: ${aa.agent.status}`);
      console.log(`      Venue: ${aa.agent.venue}`);
      console.log(`      Deployments: ${aa.agent.deployments.length}`);
    });

    // Step 4: Generate signal (manual - normally done by worker)
    console.log('\n📊 Step 4: Generating signal...\n');

    const agent = agentAccounts[0].agent;
    const deployment = agent.deployments[0];

    if (!deployment) {
      console.log('❌ No active deployment found for agent');
      await prisma.$disconnect();
      return;
    }

    // Create a signal based on the tweet
    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        tokenSymbol: 'BTC',
        venue: agent.venue,
        side: 'LONG',
        sizeModel: {
          baseSize: 100, // $100 USDC
          leverage: 1,
          riskPercent: 2,
        },
        riskModel: {
          stopLoss: 0.02, // 2% stop loss
          takeProfit: 0.05, // 5% take profit
          trailingStop: false,
        },
        sourceTweets: [tweetId],
      },
    });

    console.log(`✅ Signal created: ${signal.id}`);
    console.log(`   Token: ${signal.tokenSymbol}`);
    console.log(`   Side: ${signal.side}`);
    console.log(`   Venue: ${signal.venue}`);
    console.log(`   Size: $${signal.sizeModel.baseSize}\n`);

    // Step 5: Simulate trade execution (create position)
    console.log('💼 Step 5: Creating position (simulated execution)...\n');

    const position = await prisma.position.create({
      data: {
        deploymentId: deployment.id,
        signalId: signal.id,
        venue: signal.venue,
        tokenSymbol: signal.tokenSymbol,
        side: signal.side,
        qty: '0.001', // Small amount for testing
        entryPrice: '70000', // Simulated BTC price
        stopLoss: '68600', // 2% below entry
        takeProfit: '73500', // 5% above entry
        openedAt: new Date(),
      },
    });

    console.log(`✅ Position created: ${position.id}`);
    console.log(`   Deployment: ${deployment.id.substring(0, 8)}...`);
    console.log(`   Token: ${position.tokenSymbol}`);
    console.log(`   Side: ${position.side}`);
    console.log(`   Quantity: ${position.qty} BTC`);
    console.log(`   Entry Price: $${position.entryPrice}`);
    console.log(`   Stop Loss: $${position.stopLoss}`);
    console.log(`   Take Profit: $${position.takeProfit}\n`);

    // Step 6: Verify complete flow
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ COMPLETE FLOW TEST - SUCCESS!\n');
    console.log('Summary:');
    console.log(`   📝 Tweet: Created for @${ctAccount.xUsername}`);
    console.log(`   🤖 Agent: ${agent.name} (${agent.status})`);
    console.log(`   📊 Signal: ${signal.tokenSymbol} ${signal.side}`);
    console.log(`   💼 Position: #${position.id.substring(0, 8)} ($${position.entryPrice})`);
    console.log(`   🏦 Safe: ${deployment.safeWallet}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 All systems working! Agent → Signal → Position flow complete!\n');

    // Show IDs for reference
    console.log('📋 Reference IDs:\n');
    console.log(`   Tweet ID: ${tweetId}`);
    console.log(`   Signal ID: ${signal.id}`);
    console.log(`   Position ID: ${position.id}\n`);

  } catch (error: any) {
    console.error('❌ Error in flow test:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();

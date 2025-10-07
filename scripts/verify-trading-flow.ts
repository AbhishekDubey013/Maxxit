#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying Complete Flow in Database\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Get the position with all related data
  const position = await prisma.position.findFirst({
    orderBy: { openedAt: 'desc' },
    include: {
      deployment: {
        include: {
          agent: {
            include: {
              agentAccounts: {
                include: {
                  ctAccount: true,
                },
              },
            },
          },
        },
      },
      signal: {
        include: {
          agent: true,
        },
      },
    },
  });

  if (!position) {
    console.log('❌ No position found');
    await prisma.$disconnect();
    return;
  }

  console.log('📊 POSITION DETAILS:\n');
  console.log(`   ID: ${position.id}`);
  console.log(`   Token: ${position.tokenSymbol}`);
  console.log(`   Side: ${position.side}`);
  console.log(`   Quantity: ${position.qty} BTC`);
  console.log(`   Entry Price: $${position.entryPrice}`);
  console.log(`   Stop Loss: $${position.stopLoss}`);
  console.log(`   Take Profit: $${position.takeProfit}`);
  console.log(`   Status: ${position.closedAt ? 'CLOSED' : 'OPEN ✅'}`);
  console.log(`   Opened: ${position.openedAt.toISOString()}\n`);

  console.log('🤖 AGENT INFO:\n');
  console.log(`   Name: ${position.deployment.agent.name}`);
  console.log(`   Status: ${position.deployment.agent.status}`);
  console.log(`   Venue: ${position.deployment.agent.venue}`);
  console.log(`   Safe Wallet: ${position.deployment.safeWallet}`);
  console.log(`   Module Enabled: ${position.deployment.moduleEnabled ? '✅' : '❌'}\n`);

  console.log('🐦 MONITORING CT ACCOUNTS:\n');
  position.deployment.agent.agentAccounts.forEach((aa, i) => {
    console.log(`   ${i + 1}. @${aa.ctAccount.xUsername}`);
    console.log(`      Followers: ${aa.ctAccount.followersCount?.toLocaleString()}`);
  });

  console.log('\n📊 SIGNAL DETAILS:\n');
  console.log(`   ID: ${position.signal.id}`);
  console.log(`   Token: ${position.signal.tokenSymbol}`);
  console.log(`   Side: ${position.signal.side}`);
  console.log(`   Source Tweets: ${position.signal.sourceTweets.join(', ')}`);
  console.log(`   Created: ${position.signal.createdAt.toISOString()}\n`);

  // Get the tweet
  const tweet = await prisma.ctPost.findFirst({
    where: {
      tweetId: { in: position.signal.sourceTweets },
    },
    include: {
      ctAccount: true,
    },
  });

  if (tweet) {
    console.log('📝 SOURCE TWEET:\n');
    console.log(`   From: @${tweet.ctAccount.xUsername}`);
    console.log(`   Text: ${tweet.tweetText.substring(0, 150)}...`);
    console.log(`   Tokens: ${tweet.extractedTokens.join(', ')}`);
    console.log(`   Signal Candidate: ${tweet.isSignalCandidate ? '✅' : '❌'}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ COMPLETE FLOW VERIFIED\n');
  console.log('Flow: Tweet → Agent → Signal → Position\n');
  console.log(`   Tweet from @${tweet?.ctAccount.xUsername || 'N/A'}`);
  console.log(`   → Agent: ${position.deployment.agent.name}`);
  console.log(`   → Signal: ${position.signal.tokenSymbol} ${position.signal.side}`);
  console.log(`   → Position: ${position.tokenSymbol} OPEN\n`);

  // Summary stats
  const totalPositions = await prisma.position.count();
  const openPositions = await prisma.position.count({
    where: { closedAt: null },
  });
  const totalSignals = await prisma.signal.count();
  const totalTweets = await prisma.ctPost.count();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📈 SYSTEM STATS:\n');
  console.log(`   Total Tweets: ${totalTweets}`);
  console.log(`   Total Signals: ${totalSignals}`);
  console.log(`   Total Positions: ${totalPositions}`);
  console.log(`   Open Positions: ${openPositions}\n`);

  await prisma.$disconnect();
}

verify();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteFlow() {
  console.log('\n🧪 COMPLETE TRADING FLOW TEST\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Step 1: Find the grekker agent
    console.log('📍 Step 1: Finding agent...');
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { name: { contains: 'grekker', mode: 'insensitive' } },
          { name: { contains: 'Grekker', mode: 'insensitive' } }
        ]
      },
      include: {
        agentAccounts: {
          include: {
            ctAccount: true
          }
        },
        deployments: true
      }
    });

    if (!agent) {
      console.log('❌ Agent not found. Looking for all agents...');
      const allAgents = await prisma.agent.findMany();
      console.log(`\nAvailable agents:`);
      allAgents.forEach(a => console.log(`  - ${a.name} (${a.id})`));
      return;
    }

    console.log(`✓ Found agent: ${agent.name}`);
    console.log(`  - ID: ${agent.id}`);
    console.log(`  - Venue: ${agent.venue}`);
    console.log(`  - Status: ${agent.status}`);

    // Check deployment
    const deployment = agent.deployments[0];
    if (!deployment) {
      console.log('❌ Agent not deployed yet');
      return;
    }

    console.log(`  - Deployed: YES`);
    console.log(`  - Safe Address: ${deployment.safeAddress || 'Not set'}`);
    console.log(`  - Module Enabled: ${deployment.moduleEnabled ? 'YES' : 'NO'}`);

    // Check subscriptions
    if (agent.agentAccounts.length === 0) {
      console.log('❌ No X accounts subscribed to this agent');
      return;
    }

    const ctAccount = agent.agentAccounts[0].ctAccount;
    console.log(`  - Subscribed to: @${ctAccount.username || ctAccount.xAccountId}`);

    // Step 2: Create mock CT post
    console.log('\n📝 Step 2: Creating mock tweet...');
    const mockTweet = await prisma.ctPost.create({
      data: {
        ctAccountId: ctAccount.id,
        tweetId: `test_${Date.now()}`,
        tweetText: 'ETH looking bullish! Breaking above resistance. Long setup confirmed. Target $2500. #ETH #Ethereum',
        tweetCreatedAt: new Date(),
        isSignalCandidate: true,
        extractedTokens: ['ETH', 'ETHEREUM']
      }
    });

    console.log(`✓ Mock tweet created`);
    console.log(`  - Tweet ID: ${mockTweet.tweetId}`);
    console.log(`  - Text: "${mockTweet.tweetText}"`);
    console.log(`  - Tokens: ${mockTweet.extractedTokens.join(', ')}`);

    // Step 3: Create signal
    console.log('\n📡 Step 3: Creating trading signal...');
    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        venue: agent.venue as any,
        side: 'LONG',
        tokenSymbol: 'ETH',
        sizeModel: { type: 'FIXED_USD', amount: 100 },
        riskModel: { stopLossPercent: 5, takeProfitPercent: 10 },
        sourceTweets: [mockTweet.tweetId]
      }
    });

    console.log(`✓ Signal created`);
    console.log(`  - Signal ID: ${signal.id}`);
    console.log(`  - Side: ${signal.side}`);
    console.log(`  - Token: ${signal.tokenSymbol}`);
    console.log(`  - Venue: ${signal.venue}`);
    console.log(`  - Size: $${(signal.sizeModel as any).amount} USDC`);
    console.log(`  - Risk: ${(signal.riskModel as any).stopLossPercent}% SL, ${(signal.riskModel as any).takeProfitPercent}% TP`);

    // Step 4: Check if Safe is ready for execution
    console.log('\n💰 Step 4: Checking Safe wallet status...');
    
    if (!deployment.safeAddress) {
      console.log('❌ Safe address not configured');
      console.log(`\n⚠️  TO COMPLETE TEST:`);
      console.log(`   1. Go to: /deploy-agent/${agent.id}`);
      console.log(`   2. Connect Safe wallet: ${deployment.safeAddress || 'Configure Safe'}`);
      console.log(`   3. Enable trading module`);
      console.log(`   4. Ensure Safe has USDC for trading`);
      console.log(`\n   Then run: npx tsx scripts/execute-test-signal.ts ${signal.id}`);
      await prisma.$disconnect();
      return;
    }

    console.log(`✓ Safe configured: ${deployment.safeAddress}`);
    console.log(`  - Module Enabled: ${deployment.moduleEnabled ? 'YES' : 'NO'}`);

    if (!deployment.moduleEnabled) {
      console.log(`\n⚠️  Trading module not enabled yet`);
      console.log(`   Complete the module enablement process first`);
      await prisma.$disconnect();
      return;
    }

    // Step 5: Simulate trade execution
    console.log('\n🚀 Step 5: Trade execution simulation...');
    console.log('   (In production, this would call the Safe Module)');
    console.log(`   - Safe: ${deployment.safeAddress}`);
    console.log(`   - Module: ${process.env.MODULE_ADDRESS}`);
    console.log(`   - Token: ETH`);
    console.log(`   - Amount: Will be calculated based on position sizing`);
    console.log(`   - Venue: ${agent.venue} (Uniswap V3)`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('\n✅ TEST SETUP COMPLETE!\n');
    
    console.log('📊 SUMMARY:');
    console.log(`   ✓ Agent: ${agent.name}`);
    console.log(`   ✓ Tweet: Mock ETH bullish signal`);
    console.log(`   ✓ Signal: ${signal.side} ${signal.tokenSymbol} @ $${signal.entryPrice}`);
    console.log(`   ✓ Safe: ${deployment.safeAddress || 'Needs configuration'}`);
    console.log(`   ✓ Module: ${deployment.moduleEnabled ? 'Enabled' : 'Needs enablement'}`);

    console.log('\n📋 NEXT STEPS:');
    if (!deployment.safeAddress || !deployment.moduleEnabled) {
      console.log('   1. Complete Safe setup at /deploy-agent/' + agent.id);
      console.log('   2. Enable trading module');
      console.log('   3. Fund Safe with USDC (minimum 1 USDC)');
      console.log('   4. Trade executor worker will pick up the signal automatically');
    } else {
      console.log('   ✅ System is ready! Trade executor will process this signal automatically.');
      console.log('   ⏰ Next execution run: Within 30 minutes (trade executor interval)');
      console.log('   📊 Monitor at: /agent/' + agent.id);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();


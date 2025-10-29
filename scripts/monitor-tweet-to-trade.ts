import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RING_AGENT_ID = 'e103e0e9-afd1-443a-9ad9-afbb64f57ac5';
const RING_SAFE = '0x49396C773238F01e6AbCc0182D01e3363Fe4d320';
const CT_ACCOUNT_USERNAME = 'Abhishe42402615';

async function monitorFlow() {
  try {
    console.log('🔍 Monitoring Tweet → Signal → Trade Flow for Ring Agent\n');
    console.log('━'.repeat(60));
    
    // 1. Check CT Account
    console.log('\n📱 STEP 1: CT Account Status');
    const ctAccount = await prisma.ctAccount.findUnique({
      where: { xUsername: CT_ACCOUNT_USERNAME },
      include: {
        ctPosts: {
          orderBy: { tweetCreatedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!ctAccount) {
      console.log('❌ CT Account not found');
      return;
    }

    console.log(`✅ Account: @${ctAccount.xUsername}`);
    console.log(`   Impact Factor: ${ctAccount.impactFactor}`);
    console.log(`   Total Tweets: ${ctAccount.ctPosts.length}`);
    
    if (ctAccount.ctPosts.length > 0) {
      console.log('\n   Recent Tweets:');
      ctAccount.ctPosts.forEach((post, i) => {
        console.log(`   ${i + 1}. [${post.tweetCreatedAt.toISOString()}]`);
        console.log(`      ${post.tweetText.substring(0, 80)}...`);
        console.log(`      Signal Candidate: ${post.isSignalCandidate ? '✅' : '❌'}`);
        console.log(`      Tokens: ${post.extractedTokens.join(', ') || 'None'}`);
      });
    } else {
      console.log('   ⚠️  No tweets ingested yet');
    }

    // 2. Check Signals
    console.log('\n━'.repeat(60));
    console.log('\n📊 STEP 2: Signal Generation');
    const signals = await prisma.signal.findMany({
      where: { agentId: RING_AGENT_ID },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        positions: true,
      },
    });

    console.log(`✅ Total Signals: ${signals.length}`);
    
    if (signals.length > 0) {
      console.log('\n   Recent Signals:');
      signals.forEach((signal, i) => {
        console.log(`   ${i + 1}. [${signal.createdAt.toISOString()}]`);
        console.log(`      Token: ${signal.token}`);
        console.log(`      Direction: ${signal.direction}`);
        console.log(`      Confidence: ${signal.confidence}`);
        console.log(`      Status: ${signal.status}`);
        console.log(`      Positions Created: ${signal.positions.length}`);
      });
    } else {
      console.log('   ⚠️  No signals generated yet');
    }

    // 3. Check Positions
    console.log('\n━'.repeat(60));
    console.log('\n💰 STEP 3: Trade Execution & Positions');
    const deployment = await prisma.agentDeployment.findFirst({
      where: {
        agentId: RING_AGENT_ID,
        safeWallet: RING_SAFE,
      },
    });

    if (!deployment) {
      console.log('❌ No deployment found for Ring agent');
      return;
    }

    const positions = await prisma.position.findMany({
      where: { deploymentId: deployment.id },
      orderBy: { openedAt: 'desc' },
      take: 10,
      include: {
        signal: true,
      },
    });

    console.log(`✅ Deployment ID: ${deployment.id}`);
    console.log(`✅ Safe Address: ${deployment.safeWallet}`);
    console.log(`✅ Module Enabled: ${deployment.moduleEnabled}`);
    console.log(`✅ Total Positions: ${positions.length}`);

    if (positions.length > 0) {
      console.log('\n   Recent Positions:');
      positions.forEach((pos, i) => {
        console.log(`   ${i + 1}. [${pos.openedAt.toISOString()}]`);
        console.log(`      Token: ${pos.tokenSymbol}`);
        console.log(`      Side: ${pos.side}`);
        console.log(`      Qty: ${pos.qty}`);
        console.log(`      Entry Price: ${pos.entryPrice}`);
        console.log(`      Status: ${pos.closedAt ? 'CLOSED' : 'OPEN'}`);
        console.log(`      Entry TX: ${pos.entryTxHash || 'Pending...'}`);
        if (pos.signal) {
          console.log(`      Signal Confidence: ${pos.signal.confidence}`);
        }
      });
    } else {
      console.log('   ⚠️  No positions created yet');
    }

    // 4. Check Safe Balance
    console.log('\n━'.repeat(60));
    console.log('\n💵 STEP 4: Safe Balance Check');
    
    const ethers = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc'
    );
    
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);
    
    const balance = await usdc.balanceOf(RING_SAFE);
    const usdcBalance = ethers.utils.formatUnits(balance, 6);
    
    console.log(`✅ Safe USDC Balance: ${usdcBalance} USDC`);
    
    if (parseFloat(usdcBalance) === 0) {
      console.log('⚠️  WARNING: Safe has 0 USDC. Fund it to enable trading!');
    }

    // 5. Summary
    console.log('\n━'.repeat(60));
    console.log('\n📋 SUMMARY:');
    console.log(`   Tweets Ingested: ${ctAccount.ctPosts.length}`);
    console.log(`   Signals Generated: ${signals.length}`);
    console.log(`   Trades Executed: ${positions.length}`);
    console.log(`   USDC Balance: ${usdcBalance}`);
    
    console.log('\n💡 NEXT STEPS:');
    if (ctAccount.ctPosts.length === 0) {
      console.log('   → Wait for tweet ingestion worker to pick up your tweet');
      console.log('   → Check Twitter API service is running');
    } else if (signals.length === 0) {
      console.log('   → Run signal generation: npm run admin:generate-signals');
    } else if (positions.length === 0) {
      console.log('   → Run trade executor: npm run admin:execute-trade');
      if (parseFloat(usdcBalance) === 0) {
        console.log('   → Fund Safe with USDC first!');
      }
    } else {
      console.log('   → System is working! Check position status above.');
    }

    console.log('\n━'.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

monitorFlow();


/**
 * Complete End-to-End Flow Test
 * Tweet → Signal → Trade → Position
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function testCompleteFlow() {
  console.log('\n🚀 COMPLETE AUTOMATION FLOW TEST\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Setup
    console.log('\n📋 STEP 1: Setup & Configuration');
    console.log('-'.repeat(60));

    const DEPLOYMENT_ID = 'e799295d-7684-4f10-809a-d2e4f2c8b383';
    const AGENT_ID = 'e103e0e9-afd1-443a-9ad9-afbb64f57ac5';
    const USER_ACCOUNT = '0xA10846a81528D429b50b0DcBF8968938A572FAC5';

    const deployment = await prisma.agent_deployments.findUnique({
      where: { id: DEPLOYMENT_ID },
      include: { agents: true }
    });

    if (!deployment) {
      throw new Error('Deployment not found');
    }

    console.log('Agent:', deployment.agents.name);
    console.log('User Account:', USER_ACCOUNT);
    console.log('HL Agent:', deployment.hyperliquid_agent_address);

    // Step 2: Create Synthetic Tweet
    console.log('\n' + '='.repeat(60));
    console.log('🐦 STEP 2: Create Synthetic Tweet');
    console.log('-'.repeat(60));

    const tweetText = 'LONG ETH - Strong bullish momentum. Entry at market, target +10%. High conviction! #crypto';

    const tweet = await prisma.tweets.create({
      data: {
        tweet_id: `synthetic-flow-test-${Date.now()}`,
        ct_account_id: 'f52ef1d5-6379-416d-92c5-fdaf79f8f7dc', // MarcusPalqDev
        tweet_text: tweetText,
        created_at: new Date(),
        processed: false,
        embedding: null
      }
    });

    console.log('\n✅ Tweet Created:');
    console.log('  ID:', tweet.id);
    console.log('  Text:', tweetText);

    // Step 3: Process Tweet → Generate Signal
    console.log('\n' + '='.repeat(60));
    console.log('📊 STEP 3: Process Tweet → Generate Signal');
    console.log('-'.repeat(60));

    // Manually create signal (simulating signal generator)
    const signal = await prisma.signals.create({
      data: {
        agent_id: AGENT_ID,
        token_symbol: 'ETH',
        side: 'LONG',
        confidence: 0.85,
        venue: 'HYPERLIQUID', // Target Hyperliquid
        reasoning: 'Automated test signal from synthetic tweet',
        created_at: new Date(),
        size_model: 'STANDARD',
        risk_model: 'MODERATE'
      }
    });

    console.log('\n✅ Signal Created:');
    console.log('  ID:', signal.id);
    console.log('  Token:', signal.token_symbol);
    console.log('  Side:', signal.side);
    console.log('  Venue:', signal.venue);
    console.log('  Confidence:', signal.confidence);

    // Mark tweet as processed
    await prisma.tweets.update({
      where: { id: tweet.id },
      data: { processed: true }
    });

    // Step 4: Execute Trade
    console.log('\n' + '='.repeat(60));
    console.log('💼 STEP 4: Execute Trade on Hyperliquid');
    console.log('-'.repeat(60));

    const executor = new TradeExecutor();
    console.log('\nExecuting signal...');

    const result = await executor.executeSignalForDeployment(signal.id, DEPLOYMENT_ID);

    if (result.success) {
      console.log('\n✅ TRADE EXECUTED!');
      if (result.positionId) {
        console.log('  Position ID:', result.positionId);
      }
    } else {
      console.log('\n❌ TRADE FAILED');
      console.log('  Error:', result.error);
    }

    // Step 5: Verify Position on Hyperliquid
    console.log('\n' + '='.repeat(60));
    console.log('🔍 STEP 5: Verify Position on Hyperliquid');
    console.log('-'.repeat(60));

    await new Promise(resolve => setTimeout(resolve, 3000));

    const posResponse = await fetch('http://localhost:5001/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: USER_ACCOUNT })
    });

    const posData = await posResponse.json();
    const positions = posData.positions || [];

    console.log('\nOpen Positions:', positions.length);

    if (positions.length > 0) {
      const ethPosition = positions.find((p: any) => p.coin === 'ETH');
      if (ethPosition) {
        console.log('\n🎉 ETH POSITION FOUND!');
        console.log('  Size:', ethPosition.szi);
        console.log('  Entry Price: $' + ethPosition.entryPx);
        console.log('  PnL: $' + ethPosition.unrealizedPnl);
        console.log('  Leverage:', ethPosition.leverage + 'x');
      } else {
        console.log('\n⚠️  No ETH position found');
      }

      // List all positions
      console.log('\nAll positions:');
      positions.forEach((pos: any) => {
        console.log(`  - ${pos.coin}: ${pos.szi} (PnL: $${pos.unrealizedPnl})`);
      });
    } else {
      console.log('\n⚠️  No positions on Hyperliquid');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FLOW SUMMARY');
    console.log('='.repeat(60));
    console.log('\n✅ Tweet Created:', tweet.id);
    console.log('✅ Signal Generated:', signal.id);
    console.log(result.success ? '✅ Trade Executed' : '❌ Trade Failed');
    console.log(positions.length > 0 ? '✅ Position Verified' : '⚠️  Position Not Found');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testCompleteFlow().catch(console.error);

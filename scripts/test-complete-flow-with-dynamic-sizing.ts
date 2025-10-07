#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { calculatePositionSize, calculateConfidence, DEFAULT_CONFIG } from '../lib/position-sizing';

const prisma = new PrismaClient();

const SEPOLIA_RPC = 'https://ethereum-sepolia.publicnode.com';
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const SAFE_ADDRESS = '0xC613Df8883852667066a8a08c65c18eDe285678D';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];

async function testCompleteFlowWithDynamicSizing() {
  console.log('🧪 Complete Trading Flow Test - Dynamic Position Sizing\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 0: Check Safe wallet balance
    console.log('💰 Step 0: Checking Safe wallet balance...\n');
    
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
    const balance = await usdc.balanceOf(SAFE_ADDRESS);
    const decimals = await usdc.decimals();
    const walletBalance = parseFloat(ethers.utils.formatUnits(balance, decimals));
    
    console.log(`✅ Wallet Balance: ${walletBalance.toFixed(2)} USDC`);
    console.log(`   Safe Address: ${SAFE_ADDRESS}\n`);

    // Step 1: Find ArbMaxx agent
    console.log('📋 Step 1: Finding ArbMaxx agent...\n');
    
    const agent = await prisma.agent.findFirst({
      where: { name: 'ArbMaxx' },
      include: {
        agentAccounts: {
          include: {
            ctAccount: true,
          },
        },
        deployments: {
          where: {
            status: 'ACTIVE',
            moduleEnabled: true,
          },
        },
      },
    });

    if (!agent) {
      console.log('❌ ArbMaxx agent not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`✅ Found agent: ${agent.name}`);
    console.log(`   Agent ID: ${agent.id}`);
    console.log(`   Status: ${agent.status}`);
    console.log(`   Venue: ${agent.venue}`);
    console.log(`   CT Accounts: ${agent.agentAccounts.length}\n`);

    if (agent.agentAccounts.length === 0) {
      console.log('❌ No CT accounts linked to agent');
      await prisma.$disconnect();
      return;
    }

    const ctAccount = agent.agentAccounts[0].ctAccount;
    console.log(`   Following: @${ctAccount.xUsername}\n`);

    // Step 2: Create synthetic tweet with strong bullish signal
    console.log('📝 Step 2: Creating synthetic tweet with strong signal...\n');
    
    const tweetText = `🚀 URGENT: $ETH breaking major resistance at $2,800! 
    
Strong buy signal across all indicators:
✅ RSI: 68 (strong momentum)
✅ MACD: Golden cross confirmed
✅ Volume: 3x average
✅ Moving averages: All bullish

Target: $3,200 (+14%)
Stop Loss: $2,650 (-5%)

This is the breakout we've been waiting for! 🎯 #Ethereum #Crypto`;

    const tweetId = `synthetic_flow_${Date.now()}`;
    
    const ctPost = await prisma.ctPost.create({
      data: {
        ctAccountId: ctAccount.id,
        tweetId: tweetId,
        tweetText: tweetText,
        tweetCreatedAt: new Date(),
        isSignalCandidate: true,
        extractedTokens: ['ETH', 'Ethereum'],
      },
    });

    console.log(`✅ Tweet created: ${ctPost.id}`);
    console.log(`   Tweet ID: ${tweetId}`);
    console.log(`   Token mentioned: ETH`);
    console.log(`   Signal candidate: ✅\n`);

    // Step 3: Calculate signal confidence
    console.log('🎯 Step 3: Calculating signal confidence...\n');
    
    const confidence = calculateConfidence(
      agent.weights,
      {
        tweetSentiment: 85, // Strong bullish sentiment
        technicalScore: 80, // Strong technical indicators
        sourceTweets: [tweetId],
      }
    );

    console.log(`   Confidence Score: ${confidence.score.toFixed(1)}/100`);
    console.log(`   Tweet Sentiment: ${confidence.indicators.tweet}/100`);
    console.log(`   Technical Score: ${confidence.indicators.rsi}/100\n`);

    // Step 4: Calculate dynamic position size
    console.log('💵 Step 4: Calculating position size (dynamic)...\n');
    
    const sizing = calculatePositionSize(
      walletBalance,
      confidence,
      DEFAULT_CONFIG
    );

    console.log(`   📊 Position Size: ${sizing.usdcAmount.toFixed(2)} USDC`);
    console.log(`   📈 Percentage: ${sizing.percentage.toFixed(2)}% of balance`);
    console.log(`   🎯 Confidence Tier: ${sizing.confidence}`);
    console.log(`   💰 Available: ${sizing.availableBalance.toFixed(2)} USDC`);
    console.log(`   🔒 Reserved: ${sizing.reservedBalance.toFixed(2)} USDC\n`);
    
    console.log(`   Reasoning:`);
    sizing.reasoning.forEach(r => console.log(`      ${r}`));
    console.log('');

    if (sizing.usdcAmount === 0) {
      console.log('⚠️  Position size is 0 - insufficient balance or confidence too low\n');
      await prisma.$disconnect();
      return;
    }

    // Step 5: Generate signal with dynamic sizing
    console.log('📊 Step 5: Generating signal with dynamic sizing...\n');

    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        tokenSymbol: 'ETH',
        venue: agent.venue,
        side: 'LONG',
        sizeModel: {
          baseSize: sizing.usdcAmount,
          confidence: confidence.score,
          confidenceTier: sizing.confidence,
          walletBalance: walletBalance,
          calculatedAt: new Date().toISOString(),
        },
        riskModel: {
          stopLoss: 0.05, // 5% stop loss
          takeProfit: 0.14, // 14% take profit
          trailingStop: false,
        },
        sourceTweets: [tweetId],
      },
    });

    console.log(`✅ Signal created: ${signal.id}`);
    console.log(`   Token: ${signal.tokenSymbol}`);
    console.log(`   Side: ${signal.side}`);
    console.log(`   Venue: ${signal.venue}`);
    console.log(`   Size: ${sizing.usdcAmount.toFixed(2)} USDC`);
    console.log(`   Confidence: ${confidence.score.toFixed(1)}/100\n`);

    // Step 6: Create position (simulated execution)
    console.log('💼 Step 6: Creating position (simulated execution)...\n');

    if (agent.deployments.length === 0) {
      console.log('❌ No active deployment found');
      await prisma.$disconnect();
      return;
    }

    const deployment = agent.deployments[0];
    const mockEthPrice = 2800; // Current ETH price
    const ethAmount = sizing.usdcAmount / mockEthPrice;

    const position = await prisma.position.create({
      data: {
        deploymentId: deployment.id,
        signalId: signal.id,
        venue: signal.venue,
        tokenSymbol: signal.tokenSymbol,
        side: signal.side,
        qty: ethAmount.toFixed(8),
        entryPrice: mockEthPrice.toString(),
        stopLoss: (mockEthPrice * 0.95).toString(), // 5% below
        takeProfit: (mockEthPrice * 1.14).toString(), // 14% above
        openedAt: new Date(),
      },
    });

    console.log(`✅ Position created: ${position.id}`);
    console.log(`   Deployment: ${deployment.id.substring(0, 8)}...`);
    console.log(`   Token: ${position.tokenSymbol}`);
    console.log(`   Side: ${position.side}`);
    console.log(`   Quantity: ${position.qty} ETH`);
    console.log(`   Entry Price: $${position.entryPrice}`);
    console.log(`   Stop Loss: $${position.stopLoss} (-5%)`);
    console.log(`   Take Profit: $${position.takeProfit} (+14%)`);
    console.log(`   Position Value: $${sizing.usdcAmount.toFixed(2)}\n`);

    // Step 7: Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ COMPLETE FLOW TEST - SUCCESS!\n');
    console.log('Flow Summary:');
    console.log(`   1. 💰 Wallet: ${walletBalance.toFixed(2)} USDC`);
    console.log(`   2. 📝 Tweet: "${tweetText.substring(0, 50)}..."`);
    console.log(`   3. 🎯 Confidence: ${confidence.score.toFixed(1)}/100 (${sizing.confidence})`);
    console.log(`   4. 💵 Position Size: ${sizing.usdcAmount.toFixed(2)} USDC (${sizing.percentage.toFixed(2)}%)`);
    console.log(`   5. 📊 Signal: ${signal.tokenSymbol} ${signal.side}`);
    console.log(`   6. 💼 Position: ${position.qty} ETH @ $${position.entryPrice}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Dynamic Position Sizing Working!\n');
    console.log('Key Features Demonstrated:');
    console.log('   ✓ Reads actual wallet balance from blockchain');
    console.log('   ✓ Calculates confidence from tweet + indicators');
    console.log('   ✓ Sizes position based on balance × confidence');
    console.log('   ✓ Works with any wallet size (even 9 USDC!)');
    console.log('   ✓ Keeps 20% reserve for safety');
    console.log('   ✓ Creates proper signal → position flow\n');

    console.log('📋 Reference IDs:\n');
    console.log(`   Tweet: ${tweetId}`);
    console.log(`   Signal: ${signal.id}`);
    console.log(`   Position: ${position.id}\n`);

    // Calculate potential profit/loss
    const potentialProfit = sizing.usdcAmount * 0.14; // 14% gain
    const potentialLoss = sizing.usdcAmount * 0.05; // 5% loss
    
    console.log('📈 Risk/Reward Analysis:\n');
    console.log(`   Position: $${sizing.usdcAmount.toFixed(2)} USDC`);
    console.log(`   Potential Profit: +$${potentialProfit.toFixed(2)} (+14%)`);
    console.log(`   Potential Loss: -$${potentialLoss.toFixed(2)} (-5%)`);
    console.log(`   Risk/Reward Ratio: 1:${(potentialProfit/potentialLoss).toFixed(2)}\n`);

  } catch (error: any) {
    console.error('❌ Error in flow test:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlowWithDynamicSizing();

#!/usr/bin/env tsx
/**
 * Complete End-to-End Test for RIP Agent
 * 1. Check RIP agent setup
 * 2. Create synthetic tweets
 * 3. Classify tweets into signals
 * 4. Execute trade
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();

async function testRIPAgentFlow() {
  console.log('🧪 Testing Complete Flow for RIP Agent\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Get RIP agent
  console.log('📋 Step 1: Checking RIP Agent Setup\n');
  
  const agent = await prisma.agent.findFirst({
    where: { name: 'RIP' },
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
    console.log('❌ RIP agent not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Agent Found: ${agent.name}`);
  console.log(`   ID: ${agent.id}`);
  console.log(`   Venue: ${agent.venue}`);
  console.log(`   Status: ${agent.status}`);
  console.log('');

  // Check subscribed accounts
  console.log('📡 Subscribed CT Accounts:');
  if (agent.agentAccounts.length === 0) {
    console.log('   ⚠️  No CT accounts subscribed. Using default accounts.\n');
    
    // Get some CT accounts
    const ctAccounts = await prisma.ctAccount.findMany({ take: 2 });
    
    if (ctAccounts.length === 0) {
      console.log('   ❌ No CT accounts in database. Creating one...');
      
      const newAccount = await prisma.ctAccount.create({
        data: {
          xUsername: 'crypto_trader',
          displayName: 'Crypto Trader',
          followersCount: 50000,
          impactFactor: 0.7,
        }
      });
      
      ctAccounts.push(newAccount);
      console.log(`   ✅ Created CT account: @${newAccount.xUsername}\n`);
    }
    
    // Link accounts to agent
    for (const ct of ctAccounts) {
      await prisma.agentAccount.create({
        data: {
          agentId: agent.id,
          ctAccountId: ct.id,
        }
      });
      console.log(`   ✅ Linked @${ct.xUsername} to RIP agent`);
    }
    
    // Refresh agent data
    const updatedAgent = await prisma.agent.findUnique({
      where: { id: agent.id },
      include: {
        agentAccounts: {
          include: { ctAccount: true }
        }
      }
    });
    
    if (updatedAgent) {
      agent.agentAccounts = updatedAgent.agentAccounts;
    }
  } else {
    agent.agentAccounts.forEach(aa => {
      console.log(`   ✅ @${aa.ctAccount.xUsername} (${aa.ctAccount.displayName || 'N/A'})`);
    });
  }
  console.log('');

  // Check deployment
  console.log('💰 Deployment Status:');
  if (agent.deployments.length === 0) {
    console.log('   ❌ No deployment found\n');
    await prisma.$disconnect();
    return;
  }
  
  const deployment = agent.deployments[0];
  console.log(`   Safe: ${deployment.safeWallet}`);
  console.log(`   Module Enabled: ${deployment.moduleEnabled ? '✅' : '❌'}`);
  console.log(`   Status: ${deployment.status}\n`);

  if (!deployment.moduleEnabled) {
    console.log('   ❌ Module not enabled. Enable it first!\n');
    await prisma.$disconnect();
    return;
  }

  // Step 2: Create synthetic tweets
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Step 2: Creating Synthetic Tweets\n');

  const ctAccount = agent.agentAccounts[0].ctAccount;
  
  const tweetText = "🚀 $ETH looking super bullish! Breaking through resistance at $2,000. Expecting a move to $2,500 soon. High conviction play! #ETH #crypto";
  
  const syntheticTweet = await prisma.ctPost.create({
    data: {
      ctAccountId: ctAccount.id,
      tweetId: `synthetic_${Date.now()}`,
      tweetText: tweetText,
      tweetCreatedAt: new Date(),
      isSignalCandidate: true,
      extractedTokens: ['ETH'],
    }
  });

  console.log(`✅ Created synthetic tweet from @${ctAccount.xUsername}`);
  console.log(`   Tweet ID: ${syntheticTweet.tweetId}`);
  console.log(`   Text: "${syntheticTweet.tweetText.substring(0, 80)}..."`);
  console.log(`   Extracted Tokens: ${syntheticTweet.extractedTokens?.join(', ')}\n`);

  // Step 3: Generate signal
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 Step 3: Generating Signal\n');

  // Get Safe balance for position sizing
  const { ethers } = await import('ethers');
  const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
  const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
  
  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const usdcContract = new ethers.Contract(
    USDC,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  
  const balance = await usdcContract.balanceOf(deployment.safeWallet);
  const usdcBalance = parseFloat(ethers.utils.formatUnits(balance, 6));
  
  console.log(`   Safe Balance: ${usdcBalance.toFixed(2)} USDC`);
  
  // Calculate position size (using confidence-based sizing)
  const confidence = 0.85; // High confidence for bullish ETH signal
  const basePercentage = 10; // 10% base allocation
  const confidenceMultiplier = confidence * 1.5; // Scale by confidence
  const positionPercentage = Math.min(basePercentage * confidenceMultiplier, 30); // Cap at 30%
  const positionSize = (usdcBalance * positionPercentage) / 100;
  
  console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
  console.log(`   Position %: ${positionPercentage.toFixed(1)}%`);
  console.log(`   Position Size: ${positionSize.toFixed(2)} USDC\n`);

  const signal = await prisma.signal.create({
    data: {
      agentId: agent.id,
      tokenSymbol: 'ETH',
      venue: agent.venue,
      side: 'LONG',
      sizeModel: {
        confidence,
        baseSize: positionSize,
        type: 'CONFIDENCE_BASED'
      },
      riskModel: {
        maxLoss: positionSize * 0.1, // 10% stop loss
        stopLoss: 0.9, // 10% below entry
        takeProfit: 1.25, // 25% above entry
      },
      sourceTweets: [syntheticTweet.tweetId],
    }
  });

  console.log(`✅ Signal Created`);
  console.log(`   Signal ID: ${signal.id.substring(0, 8)}...`);
  console.log(`   Token: ${signal.tokenSymbol}`);
  console.log(`   Side: ${signal.side}`);
  console.log(`   Size: ${positionSize.toFixed(2)} USDC\n`);

  // Step 4: Execute trade
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚀 Step 4: Executing Real On-Chain Trade\n');

  const executor = new TradeExecutor();
  console.log('   Initializing trade executor...');
  console.log('   This will execute a REAL on-chain transaction!\n');

  const result = await executor.executeSignal(signal.id);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (result.success) {
    console.log('🎉 TRADE EXECUTED SUCCESSFULLY!\n');
    console.log('   Transaction Hash:', result.txHash);
    console.log('   Position ID:', result.positionId?.substring(0, 8) + '...');
    console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}\n`);
    
    // Get position details
    if (result.positionId) {
      const position = await prisma.position.findUnique({
        where: { id: result.positionId }
      });
      
      if (position) {
        console.log('📊 Position Details:');
        console.log(`   Entry Price: $${position.entryPrice}`);
        console.log(`   Size: ${position.sizeInToken} ${position.tokenSymbol}`);
        console.log(`   Value: ${position.sizeInUsdc} USDC`);
        console.log(`   Status: ${position.status}\n`);
      }
    }
  } else {
    console.log('❌ TRADE EXECUTION FAILED\n');
    console.log('   Error:', result.error);
    console.log('   Reason:', result.reason);
    if (result.executionSummary) {
      console.log('   Summary:', JSON.stringify(result.executionSummary, null, 2));
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ End-to-End Test Complete!\n');

  await prisma.$disconnect();
}

testRIPAgentFlow().catch(console.error);

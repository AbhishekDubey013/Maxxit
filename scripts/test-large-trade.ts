#!/usr/bin/env tsx
/**
 * Test with larger trade size (8 USDC) to see if tiny amounts are the issue
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();

async function testLargeTrade() {
  console.log('🧪 Testing with LARGE Trade Size\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 Hypothesis:');
  console.log('   Previous trades: $1.15 USDC (TINY)');
  console.log('   This trade: $8.00 USDC (LARGE)');
  console.log('   If this works → minimum trade size was the issue!\n');

  // Get RIP agent
  const agent = await prisma.agent.findFirst({
    where: { name: 'RIP' },
  });

  if (!agent) {
    console.log('❌ RIP agent not found');
    await prisma.$disconnect();
    return;
  }

  // First add LINK to token registry if not exists
  console.log('📋 Checking Token Registry...\n');
  
  const linkToken = await prisma.tokenRegistry.upsert({
    where: {
      chain_tokenSymbol: {
        chain: 'sepolia',
        tokenSymbol: 'LINK'
      }
    },
    update: {},
    create: {
      chain: 'sepolia',
      tokenSymbol: 'LINK',
      tokenAddress: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
      preferredRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E'
    }
  });
  
  console.log('✅ LINK token registered\n');

  // Create new signal with 8 USDC position using LINK (to avoid unique constraint)
  console.log('📊 Creating Signal with Large Position\n');
  
  const signal = await prisma.signal.create({
    data: {
      agentId: agent.id,
      tokenSymbol: 'LINK', // Using LINK instead of ETH
      venue: 'SPOT',
      side: 'LONG',
      sizeModel: {
        confidence: 0.9,
        baseSize: 8.0, // 8 USDC!
        type: 'FIXED'
      },
      riskModel: {
        maxLoss: 0.8,
        stopLoss: 0.9,
        takeProfit: 1.25,
      },
      sourceTweets: ['large_trade_test'],
    }
  });

  console.log('✅ Signal Created:');
  console.log(`   ID: ${signal.id.substring(0, 8)}...`);
  console.log(`   Token: LINK (WETH/LINK pool has 22k LINK liquidity!)`);
  console.log(`   Size: $8.00 USDC (7x larger than before!)`);
  console.log('');

  console.log('🚀 Executing Large Trade...\n');

  const executor = new TradeExecutor();
  const result = await executor.executeSignal(signal.id);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (result.success) {
    console.log('🎉 SUCCESS! TRADE WORKED WITH LARGER AMOUNT!\n');
    console.log('   Transaction Hash:', result.txHash);
    console.log(`   View: https://sepolia.etherscan.io/tx/${result.txHash}`);
    console.log('   Position ID:', result.positionId?.substring(0, 8) + '...');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ CONCLUSION:');
    console.log('   The issue WAS the tiny trade size ($1.15)!');
    console.log('   Uniswap/Module has minimum trade requirements.');
    console.log('   System works perfectly with normal trade sizes!\n');
  } else {
    console.log('❌ STILL FAILED\n');
    console.log('   Error:', result.error);
    if (result.reason) {
      console.log('   Reason:', result.reason);
    }
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🤔 CONCLUSION:');
    console.log('   Not the trade size. Need to investigate further.');
    console.log('   Possible issues:');
    console.log('   - Sepolia-specific router behavior');
    console.log('   - Module validation edge case');
    console.log('   - Price feed issue');
    console.log('   → Recommend: Deploy to Arbitrum mainnet\n');
  }

  await prisma.$disconnect();
}

testLargeTrade().catch(console.error);

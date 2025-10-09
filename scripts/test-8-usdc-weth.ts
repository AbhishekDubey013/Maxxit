#!/usr/bin/env tsx
/**
 * Test 8 USDC trade with WETH
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();

async function test() {
  console.log('🧪 Testing 8 USDC Trade (USDC → WETH)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Delete old ETH signals first
  await prisma.signal.deleteMany({
    where: {
      agent: { name: 'RIP' },
      tokenSymbol: 'ETH',
      positions: { none: {} }
    }
  });
  
  console.log('✅ Cleaned up old signals\n');
  
  // Get RIP agent
  const agent = await prisma.agent.findFirst({
    where: { name: 'RIP' }
  });
  
  if (!agent) {
    console.log('❌ Agent not found');
    await prisma.$disconnect();
    return;
  }
  
  // Create new signal with 8 USDC
  console.log('📊 Creating Signal:\n');
  console.log('   Token: ETH (WETH)');
  console.log('   Pool: USDC/WETH 1% fee (11.6M USDC + 999 WETH)');
  console.log('   Size: $8.00 USDC (vs previous $1.15)\n');
  
  const signal = await prisma.signal.create({
    data: {
      agentId: agent.id,
      tokenSymbol: 'ETH',
      venue: 'SPOT',
      side: 'LONG',
      sizeModel: {
        confidence: 0.9,
        baseSize: 8.0,
        type: 'FIXED'
      },
      riskModel: {
        maxLoss: 0.8,
        stopLoss: 0.9,
        takeProfit: 1.25,
      },
      sourceTweets: ['test_8_usdc'],
    }
  });
  
  console.log('✅ Signal created:', signal.id.substring(0, 8) + '...\n');
  console.log('🚀 Executing Trade...\n');
  
  const executor = new TradeExecutor();
  const result = await executor.executeSignal(signal.id);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (result.success) {
    console.log('🎉 SUCCESS! LARGER TRADE WORKED!\n');
    console.log('   TX:', result.txHash);
    console.log('   https://sepolia.etherscan.io/tx/' + result.txHash);
    console.log('\n✅ PROOF: The issue WAS the tiny trade size!');
    console.log('   $1.15 = too small');
    console.log('   $8.00 = works!\n');
  } else {
    console.log('❌ Failed even with 8 USDC\n');
    console.log('   Error:', result.error);
    console.log('   Not trade size issue then.\n');
  }
  
  await prisma.$disconnect();
}

test().catch(console.error);


/**
 * Create Test Signal for Hyperliquid
 * 
 * Creates a test trading signal to verify workers are processing correctly
 * 
 * Usage:
 * npx tsx scripts/create-test-signal.ts [BTC|ETH|SOL] [LONG|SHORT]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSignal(token: string = 'BTC', side: 'LONG' | 'SHORT' = 'LONG') {
  console.log('🧪 Creating Test Signal for Hyperliquid\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Find an active HYPERLIQUID agent
    const agent = await prisma.agents.findFirst({
      where: {
        venue: 'HYPERLIQUID',
        status: 'ACTIVE',
      },
    });
    
    if (!agent) {
      console.log('❌ No active HYPERLIQUID agent found!');
      console.log('\n💡 Create an agent:');
      console.log('   1. Go to http://localhost:3000/create-agent');
      console.log('   2. Select HYPERLIQUID venue');
      console.log('   3. Deploy agent');
      process.exit(1);
    }
    
    console.log('✅ Found agent:', agent.name);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Venue: ${agent.venue}\n`);
    
    // Check if agent has active deployments
    const deployments = await prisma.agent_deployments.findMany({
      where: {
        agent_id: agent.id,
        status: 'ACTIVE',
        module_enabled: true,
      },
    });
    
    console.log(`📊 Active deployments: ${deployments.length}`);
    if (deployments.length === 0) {
      console.log('\n⚠️  No active deployments with module enabled!');
      console.log('   Deploy agent and enable module first.');
    }
    console.log('');
    
    // Create test signal
    const signal = await prisma.signals.create({
      data: {
        agent_id: agent.id,
        tweet_id: `TEST_${Date.now()}`,
        tweet_text: `[TEST] ${token} looking ${side === 'LONG' ? 'bullish' : 'bearish'}, going ${side}`,
        tweet_author: 'TEST_USER',
        tweet_created_at: new Date(),
        confidence: 0.85,
        side: side,
        venue: 'HYPERLIQUID',
        token_symbol: token,
        stop_loss: null,
        take_profit: null,
        size_model: {
          type: 'percentage',
          value: 5, // 5% of balance
          leverage: 2, // 2x leverage
        },
        reasoning: `Test signal for ${token} ${side} on Hyperliquid testnet`,
        posted_at: new Date(),
      },
    });
    
    console.log('✅ Test signal created!\n');
    console.log('📋 Signal Details:');
    console.log(`   ID: ${signal.id}`);
    console.log(`   Token: ${token}`);
    console.log(`   Side: ${side}`);
    console.log(`   Venue: HYPERLIQUID`);
    console.log(`   Size: 5% of balance`);
    console.log(`   Leverage: 2x`);
    console.log(`   Confidence: 85%\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 Next Steps:\n');
    console.log('1. Watch trade executor logs:');
    console.log('   tail -f logs/trade-executor.log\n');
    console.log('2. The worker should pick up this signal within 10 seconds\n');
    console.log('3. Check if position opens:');
    console.log('   npx tsx scripts/check-positions.ts\n');
    console.log('4. View on Hyperliquid:');
    console.log('   https://app.hyperliquid-testnet.xyz\n');
    
    // Show query to check signal status
    console.log('💡 Check signal status:');
    console.log(`   SELECT * FROM signals WHERE id = '${signal.id}';`);
    console.log('');
    
  } catch (error: any) {
    console.log('❌ Error creating test signal:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const token = (args[0] || 'BTC').toUpperCase();
  const side = (args[1] || 'LONG').toUpperCase() as 'LONG' | 'SHORT';
  
  if (!['BTC', 'ETH', 'SOL', 'ARB', 'AVAX'].includes(token)) {
    console.log('⚠️  Token not in common list. Using anyway...');
  }
  
  if (!['LONG', 'SHORT'].includes(side)) {
    console.log('❌ Side must be LONG or SHORT');
    process.exit(1);
  }
  
  await createTestSignal(token, side);
}

main();


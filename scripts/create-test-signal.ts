/**
 * Create a test signal manually for testing the complete flow
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSignal() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              CREATE TEST SIGNAL FOR ARB                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Find ARES agent
    const agent = await prisma.agents.findFirst({
      where: { 
        name: 'ARES',
        status: 'ACTIVE'
      }
    });

    if (!agent) {
      console.error('❌ ARES agent not found');
      return;
    }

    console.log(`✅ Found agent: ${agent.name} (${agent.id})`);

    // Check if signal already exists
    const existingSignal = await prisma.signals.findFirst({
      where: {
        agent_id: agent.id,
        token_symbol: 'ARB',
        created_at: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // Last 6 hours
        }
      }
    });

    if (existingSignal) {
      console.log(`\n⚠️  Signal already exists for ARB: ${existingSignal.id}`);
      console.log(`   Side: ${existingSignal.side}, Created: ${existingSignal.created_at}`);
      return;
    }

    // Create test signal
    const signal = await prisma.signals.create({
      data: {
        agent_id: agent.id,
        token_symbol: 'ARB',
        venue: 'HYPERLIQUID',
        side: 'LONG',
        size_model: {
          type: 'balance-percentage',
          value: 5, // 5% of balance
        },
        risk_model: {
          stopLoss: 0.05, // 5% stop loss
          takeProfit: 0.15, // 15% take profit
          trailingStop: 0.01, // 1% trailing stop
        },
        source_tweets: ['test-tweet-manual'],
        proof_verified: true,
        executor_agreement_verified: true,
      }
    });

    console.log(`\n✅ Test signal created successfully!`);
    console.log(`   Signal ID: ${signal.id}`);
    console.log(`   Token: ${signal.token_symbol}`);
    console.log(`   Side: ${signal.side}`);
    console.log(`   Venue: ${signal.venue}`);
    console.log(`   Position Size: 5% of balance`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('📝 NEXT: Run trade executor to execute this signal');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   npx tsx workers/trade-executor-worker.ts\n');

  } catch (error: any) {
    console.error('\n❌ Error creating signal:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestSignal();


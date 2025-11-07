/**
 * Create test signal for BTC (available on Hyperliquid)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSignal() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              CREATE TEST SIGNAL FOR BTC                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const agent = await prisma.agents.findFirst({
      where: { name: 'ARES', status: 'ACTIVE' }
    });

    if (!agent) {
      console.error('❌ ARES agent not found');
      return;
    }

    // Delete any existing BTC signals
    await prisma.signals.deleteMany({
      where: { token_symbol: 'BTC' }
    });

    const signal = await prisma.signals.create({
      data: {
        agent_id: agent.id,
        token_symbol: 'BTC',
        venue: 'HYPERLIQUID',
        side: 'LONG',
        size_model: {
          type: 'balance-percentage',
          value: 5,
        },
        risk_model: {
          stopLoss: 0.05,
          takeProfit: 0.15,
          trailingStop: 0.01,
        },
        source_tweets: ['test-tweet-manual'],
        proof_verified: true,
        executor_agreement_verified: true,
      }
    });

    console.log(`✅ Test signal created: ${signal.id}`);
    console.log(`   Token: BTC (available on Hyperliquid)`);
    console.log(`   Side: LONG\n`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSignal();


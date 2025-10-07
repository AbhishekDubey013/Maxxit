import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSignal() {
  console.log('🧪 CREATING SYNTHETIC TEST SIGNAL\n');
  
  try {
    // Find Tripster
    const agent = await prisma.agent.findFirst({
      where: { name: { contains: 'Tripster', mode: 'insensitive' } },
      include: { deployments: true }
    });
    
    if (!agent) {
      console.log('❌ Tripster not found');
      return;
    }
    
    console.log('✅ Agent:', agent.name);
    console.log('   - ID:', agent.id);
    console.log('   - Venue:', agent.venue);
    console.log('   - Safe:', agent.deployments[0]?.safeWallet || 'Not configured');
    console.log('   - Module Enabled:', agent.deployments[0]?.moduleEnabled ? '✅ YES' : '❌ NO');
    console.log('');
    
    // Create a test LONG signal for ETH on SPOT
    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        venue: agent.venue as any,
        side: 'LONG',
        tokenSymbol: 'ETH',
        sizeModel: {
          type: 'FIXED_USD',
          amount: 10  // $10 test trade
        },
        riskModel: {
          stopLossPercent: 5,
          takeProfitPercent: 10
        },
        sourceTweets: ['synthetic-test-signal-' + Date.now()]
      }
    });
    
    console.log('🎯 TEST SIGNAL CREATED:\n');
    console.log('   Signal ID:', signal.id);
    console.log('   Agent:', agent.name, '(' + agent.id + ')');
    console.log('   Action: 🟢 LONG ETH');
    console.log('   Size: $10 USD');
    console.log('   Stop Loss: -5%');
    console.log('   Take Profit: +10%');
    console.log('   Venue:', signal.venue);
    console.log('   Created:', signal.createdAt);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔄 WHAT HAPPENS NEXT:\n');
    console.log('   1. Trade Executor Worker picks up this signal');
    console.log('   2. Validates Safe wallet has sufficient USDC');
    console.log('   3. Builds swap transaction (USDC → ETH)');
    console.log('   4. Executes via Safe Module (gasless for user)');
    console.log('   5. Creates Position record in database');
    console.log('   6. Deducts 0.2 USDC platform fee');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT:\n');
    console.log('   - Safe wallet must have at least 10 USDC');
    console.log('   - Module must be enabled (currently:', agent.deployments[0]?.moduleEnabled ? '✅' : '❌', ')');
    console.log('   - ETH must be available on', agent.venue);
    console.log('');
    
    // Check if there are existing signals
    const existingSignals = await prisma.signal.count({
      where: { agentId: agent.id }
    });
    
    console.log('📊 Agent now has', existingSignals, 'total signal(s)\n');
    console.log('✅ Test signal ready for execution!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSignal();



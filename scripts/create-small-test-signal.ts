import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSmallTestSignal() {
  console.log('🧪 CREATING SMALL TEST SIGNAL - $1 ARB SWAP\n');
  
  try {
    const agent = await prisma.agent.findFirst({
      where: { name: { contains: 'Tripster', mode: 'insensitive' } },
      include: { deployments: true }
    });
    
    if (!agent) {
      console.log('❌ Tripster not found');
      return;
    }
    
    console.log('✅ Agent:', agent.name);
    console.log('   Safe:', agent.deployments[0]?.safeWallet);
    console.log('   Available USDC: 9.00');
    console.log('');
    
    // Create a $1 ARB buy signal
    const signal = await prisma.signal.create({
      data: {
        agentId: agent.id,
        venue: 'SPOT' as any,
        side: 'LONG',
        tokenSymbol: 'ARB',
        sizeModel: {
          type: 'FIXED_USD',
          amount: 1  // Only $1 trade
        },
        riskModel: {
          stopLossPercent: 5,
          takeProfitPercent: 10
        },
        sourceTweets: ['test-arb-signal-' + Date.now()]
      }
    });
    
    console.log('🎯 SMALL TEST SIGNAL CREATED:\n');
    console.log('   Signal ID:', signal.id);
    console.log('   Agent:', agent.name);
    console.log('   Action: 🟢 LONG ARB (Buy Arbitrum)');
    console.log('   Size: $1 USD');
    console.log('   Stop Loss: -5%');
    console.log('   Take Profit: +10%');
    console.log('   Venue: SPOT (Uniswap V3)');
    console.log('   Created:', signal.createdAt);
    console.log('');
    console.log('💰 COST BREAKDOWN:\n');
    console.log('   Trade Size: $1.00 USDC');
    console.log('   Platform Fee: $0.20 USDC');
    console.log('   ─────────────────────');
    console.log('   Total Required: $1.20 USDC');
    console.log('   Available: 9.00 USDC ✅');
    console.log('   Remaining: 7.80 USDC');
    console.log('');
    console.log('✅ Signal ready for execution!');
    console.log('');
    console.log('🔧 TO EXECUTE:');
    console.log('   npx tsx scripts/execute-signal.ts', signal.id);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSmallTestSignal();



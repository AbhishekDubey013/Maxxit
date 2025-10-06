import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGrekkerStatus() {
  console.log('\n🔍 CHECKING GREKKER AGENT STATUS\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Find grekker agent
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { name: { contains: 'grekker', mode: 'insensitive' } },
          { name: { contains: 'Grekker', mode: 'insensitive' } }
        ]
      },
      include: {
        agentAccounts: {
          include: {
            ctAccount: true
          }
        },
        deployments: true,
        signals: true
      }
    });

    if (!agent) {
      console.log('❌ Grekker agent not found');
      return;
    }

    console.log(`✓ Agent: ${agent.name}`);
    console.log(`  - ID: ${agent.id}`);
    console.log(`  - Status: ${agent.status}`);
    console.log(`  - Venue: ${agent.venue}`);
    console.log(`  - Created: ${agent.createdAt}`);

    // Check weights (market indicators)
    console.log(`\n📊 Market Indicator Weights:`);
    if (Array.isArray(agent.weights) && agent.weights.length > 0) {
      const indicators = ['Tweet Sentiment', 'RSI', 'MACD', 'Bollinger', 'Volume', 'MA Cross', 'Momentum', 'Volatility'];
      agent.weights.forEach((weight, idx) => {
        if (indicators[idx]) {
          console.log(`  - ${indicators[idx]}: ${weight}%`);
        }
      });
    } else {
      console.log(`  ⚠️  No weights configured`);
    }

    // Check subscriptions
    console.log(`\n🐦 X Account Subscriptions: ${agent.agentAccounts.length}`);
    if (agent.agentAccounts.length > 0) {
      agent.agentAccounts.forEach((aa, idx) => {
        console.log(`  ${idx + 1}. @${aa.ctAccount.xUsername || 'Unknown'} (${aa.ctAccount.id})`);
        console.log(`     - Display Name: ${aa.ctAccount.displayName || 'N/A'}`);
        console.log(`     - Followers: ${aa.ctAccount.followersCount || 0}`);
        console.log(`     - Created: ${aa.createdAt}`);
      });
    } else {
      console.log(`  ⚠️  No subscriptions found`);
    }

    // Check deployment
    console.log(`\n🚀 Deployment Status:`);
    if (agent.deployments.length > 0) {
      const dep = agent.deployments[0];
      console.log(`  - Deployed: YES`);
      console.log(`  - Safe Address: ${dep.safeAddress || 'Not set'}`);
      console.log(`  - Module Enabled: ${dep.moduleEnabled ? 'YES' : 'NO'}`);
      console.log(`  - Created: ${dep.createdAt}`);
    } else {
      console.log(`  ⚠️  Not deployed`);
    }

    // Check signals
    console.log(`\n📡 Signals: ${agent.signals.length}`);
    if (agent.signals.length > 0) {
      agent.signals.slice(0, 5).forEach((sig, idx) => {
        console.log(`  ${idx + 1}. ${sig.side} ${sig.tokenSymbol} (${sig.venue})`);
        console.log(`     - Created: ${sig.createdAt}`);
        console.log(`     - Source: ${sig.sourceTweets.length} tweets`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════');
    
    // Check if there's a UI vs DB mismatch
    console.log('\n🔍 DIAGNOSIS:');
    
    if (agent.agentAccounts.length === 0) {
      console.log('  ❌ No X account subscriptions saved in database');
      console.log('  → Possible UI issue: subscription form not saving');
      console.log('  → Check API endpoint: POST /api/agents/[id]/accounts');
    }
    
    if (!agent.weights || agent.weights.length === 0 || agent.weights.every(w => w === 0)) {
      console.log('  ❌ Market indicator weights not saved');
      console.log('  → Default weights should be set during agent creation');
      console.log('  → Check agent creation flow');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGrekkerStatus();


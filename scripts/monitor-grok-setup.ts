import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function monitorGrokSetup() {
  console.log('\n👁️  MONITORING GROK AGENT SETUP\n');
  console.log('═══════════════════════════════════════════════════\n');
  console.log('🔄 Checking backend every 5 seconds...\n');
  console.log('Press Ctrl+C to stop\n');

  let iteration = 0;
  
  const checkStatus = async () => {
    iteration++;
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Check #${iteration} - ${new Date().toLocaleTimeString()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      // Find Grok agent
      const agent = await prisma.agent.findFirst({
        where: {
          OR: [
            { name: { contains: 'grok', mode: 'insensitive' } },
            { name: { contains: 'Grok', mode: 'insensitive' } }
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
        console.log('⏳ Agent Status: NOT CREATED YET');
        console.log('   Waiting for agent creation...\n');
        return;
      }

      // Agent found
      console.log('✅ AGENT FOUND');
      console.log(`   - Name: ${agent.name}`);
      console.log(`   - ID: ${agent.id}`);
      console.log(`   - Venue: ${agent.venue}`);
      console.log(`   - Status: ${agent.status}`);

      // Check market indicators
      console.log('\n📊 Market Indicators:');
      if (Array.isArray(agent.weights) && agent.weights.length > 0 && agent.weights.some(w => w > 0)) {
        console.log('   ✅ Configured');
        const indicators = ['Tweet', 'RSI', 'MACD', 'BB', 'Vol', 'MA', 'Mom', 'Volat'];
        const weights = agent.weights.slice(0, 8);
        console.log(`   - Weights: [${weights.map((w, i) => `${indicators[i]}:${w}`).join(', ')}]`);
      } else {
        console.log('   ⏳ Not configured yet');
      }

      // Check X account subscriptions
      console.log('\n🐦 X Account Subscriptions:');
      if (agent.agentAccounts.length === 0) {
        console.log('   ⏳ NOT SUBSCRIBED YET');
        console.log('   Waiting for X account subscription...');
      } else {
        console.log(`   ✅ SUBSCRIBED (${agent.agentAccounts.length} accounts)`);
        agent.agentAccounts.forEach((aa, idx) => {
          console.log(`   ${idx + 1}. @${aa.ctAccount.xUsername || 'Unknown'}`);
          console.log(`      - Display: ${aa.ctAccount.displayName || 'N/A'}`);
          console.log(`      - Followers: ${aa.ctAccount.followersCount?.toLocaleString() || 0}`);
        });
      }

      // Check deployment
      console.log('\n🚀 Deployment Status:');
      if (agent.deployments.length === 0) {
        console.log('   ⏳ NOT DEPLOYED YET');
        console.log('   Waiting for deployment...');
      } else {
        const dep = agent.deployments[0];
        console.log('   ✅ DEPLOYED');
        
        console.log('\n💰 Safe Wallet:');
        if (!dep.safeWallet) {
          console.log('   ⏳ NOT CONFIGURED');
          console.log('   Waiting for Safe address...');
        } else {
          console.log(`   ✅ CONFIGURED`);
          console.log(`   - Address: ${dep.safeWallet}`);
          console.log(`   - Module Enabled: ${dep.moduleEnabled ? '✅ YES' : '⏳ PENDING'}`);
          
          if (!dep.moduleEnabled) {
            console.log('   - Action: Enable module in Safe Transaction Builder');
          }
        }
      }

      // Check signals
      console.log('\n📡 Trading Signals:');
      if (agent.signals.length === 0) {
        console.log('   ⏳ No signals generated yet');
      } else {
        console.log(`   ✅ ${agent.signals.length} signal(s) generated`);
        agent.signals.slice(0, 3).forEach((sig, idx) => {
          console.log(`   ${idx + 1}. ${sig.side} ${sig.tokenSymbol} @ ${sig.venue}`);
        });
      }

      // Overall readiness
      console.log('\n🎯 OVERALL READINESS:');
      const checks = {
        'Agent Created': !!agent,
        'Market Indicators': agent.weights && agent.weights.some(w => w > 0),
        'X Account Subscribed': agent.agentAccounts.length > 0,
        'Deployed': agent.deployments.length > 0,
        'Safe Configured': agent.deployments[0]?.safeWallet,
        'Module Enabled': agent.deployments[0]?.moduleEnabled
      };

      Object.entries(checks).forEach(([check, passed]) => {
        console.log(`   ${passed ? '✅' : '⏳'} ${check}`);
      });

      const allReady = Object.values(checks).every(v => v);
      
      if (allReady) {
        console.log('\n🎉 ═══════════════════════════════════════════════');
        console.log('🎉 GROK AGENT FULLY CONFIGURED & READY TO TRADE!');
        console.log('🎉 ═══════════════════════════════════════════════\n');
        console.log('✅ System will now automatically:');
        console.log('   - Ingest tweets from subscribed accounts (every 6h)');
        console.log('   - Generate trading signals (every 6h)');
        console.log('   - Execute trades via Safe Module (every 30min)');
        console.log('   - Monitor positions (every 5min)\n');
        console.log(`📊 View agent performance:`);
        console.log(`   https://maxxit-mzkastngp-abhisheks-projects-74a6b2ad.vercel.app/agent/${agent.id}\n`);
        
        // Stop monitoring after success
        clearInterval(monitorInterval);
        await prisma.$disconnect();
        process.exit(0);
      }

    } catch (error) {
      console.error('❌ Error checking status:', error);
    }
  };

  // Initial check
  await checkStatus();

  // Check every 5 seconds
  const monitorInterval = setInterval(checkStatus, 5000);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Monitoring stopped\n');
  await prisma.$disconnect();
  process.exit(0);
});

monitorGrokSetup();


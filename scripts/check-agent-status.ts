import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAgentStatus(agentName: string) {
  console.log(`\n🔍 CHECKING ${agentName.toUpperCase()} AGENT STATUS\n`);
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        name: { contains: agentName, mode: 'insensitive' }
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
      console.log(`❌ Agent "${agentName}" not found\n`);
      return;
    }

    console.log('✅ AGENT FOUND\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 BASIC INFO:');
    console.log(`  - Name: ${agent.name}`);
    console.log(`  - ID: ${agent.id}`);
    console.log(`  - Venue: ${agent.venue}`);
    console.log(`  - Status: ${agent.status}`);
    console.log(`  - Creator: ${agent.creatorWallet || 'N/A'}`);
    console.log(`  - Profit Receiver: ${agent.profitReceiverAddress || 'N/A'}`);
    console.log(`  - Created: ${agent.createdAt}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 MARKET INDICATORS:');
    if (Array.isArray(agent.weights) && agent.weights.length > 0) {
      const indicators = ['Tweet', 'RSI', 'MACD', 'BB', 'Vol', 'MA', 'Mom', 'Volat'];
      const weights = agent.weights.slice(0, 8);
      console.log('  ✅ Configured');
      weights.forEach((w, i) => {
        if (indicators[i]) {
          console.log(`  - ${indicators[i]}: ${w}%`);
        }
      });
    } else {
      console.log('  ⏳ Not configured');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🐦 X ACCOUNT SUBSCRIPTIONS:\n');
    console.log(`Count: ${agent.agentAccounts.length}\n`);
    
    if (agent.agentAccounts.length === 0) {
      console.log('❌ NO SUBSCRIPTIONS');
      console.log('   BUG STILL EXISTS - X accounts not saving!\n');
    } else {
      console.log('✅ SUBSCRIPTIONS FOUND (BUG FIXED!):\n');
      agent.agentAccounts.forEach((aa, idx) => {
        console.log(`${idx + 1}. @${aa.ctAccount.xUsername || 'Unknown'}`);
        console.log(`   - Display: ${aa.ctAccount.displayName || 'N/A'}`);
        console.log(`   - Followers: ${aa.ctAccount.followersCount?.toLocaleString() || 0}`);
        console.log(`   - Subscribed: ${aa.createdAt}\n`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💰 SAFE WALLET DEPLOYMENT:\n');
    console.log(`Deployments: ${agent.deployments.length}\n`);
    
    if (agent.deployments.length === 0) {
      console.log('⏳ NOT DEPLOYED YET\n');
    } else {
      const dep = agent.deployments[0];
      console.log('✅ DEPLOYED\n');
      console.log('Deployment Details:');
      console.log(`  - User Wallet: ${dep.userWallet}`);
      console.log(`  - Safe Address: ${dep.safeWallet || 'NULL'}`);
      console.log(`  - Module Enabled: ${dep.moduleEnabled === true ? '✅ YES' : dep.moduleEnabled === false ? '❌ NO' : 'undefined'}`);
      console.log(`  - Status: ${dep.status}`);
      console.log(`  - Deployed: ${dep.subStartedAt}\n`);
      
      if (!dep.safeWallet) {
        console.log('⚠️  Safe address is NULL - deployment incomplete\n');
      } else if (!dep.moduleEnabled) {
        console.log('⚠️  Module not enabled - user needs to complete Safe Transaction Builder\n');
      } else {
        console.log('🎉 FULLY CONFIGURED - Ready to trade!\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📡 TRADING SIGNALS:\n');
    if (agent.signals.length === 0) {
      console.log('  ⏳ No signals generated yet\n');
    } else {
      console.log(`  ✅ ${agent.signals.length} signal(s)\n`);
      agent.signals.slice(0, 5).forEach((sig, idx) => {
        console.log(`  ${idx + 1}. ${sig.side} ${sig.tokenSymbol} @ ${sig.venue}`);
        console.log(`     Created: ${sig.createdAt}`);
      });
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎯 OVERALL READINESS:\n');
    
    const checks = {
      'Agent Created': true,
      'Market Indicators': agent.weights && agent.weights.some(w => w > 0),
      'X Account Subscribed': agent.agentAccounts.length > 0,
      'Deployed': agent.deployments.length > 0,
      'Safe Configured': agent.deployments[0]?.safeWallet,
      'Module Enabled': agent.deployments[0]?.moduleEnabled === true
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    });

    const readyCount = Object.values(checks).filter(v => v).length;
    const totalChecks = Object.keys(checks).length;
    const percentage = Math.round((readyCount / totalChecks) * 100);

    console.log(`\n  📊 Readiness: ${readyCount}/${totalChecks} (${percentage}%)\n`);

    if (readyCount === totalChecks) {
      console.log('🎉 ═══════════════════════════════════════════════');
      console.log('🎉 AGENT FULLY CONFIGURED & READY TO TRADE!');
      console.log('🎉 ═══════════════════════════════════════════════\n');
    } else {
      console.log('⚠️  Agent needs additional configuration\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const agentName = process.argv[2] || 'Tripster';
checkAgentStatus(agentName);


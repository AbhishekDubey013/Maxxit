import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSystemStatus() {
  console.log('\n📊 MAXXIT SYSTEM STATUS CHECK\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Check CT accounts
    const ctAccounts = await prisma.ctAccount.findMany();
    console.log(`🐦 X (Twitter) Accounts: ${ctAccounts.length}`);
    if (ctAccounts.length > 0) {
      ctAccounts.forEach(acc => {
        console.log(`   ✓ @${acc.username} (${acc.xAccountId})`);
      });
    } else {
      console.log('   ⚠️  No X accounts added yet');
    }

    // Check agents
    const agents = await prisma.agent.findMany({
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

    console.log(`\n🤖 Trading Agents: ${agents.length}`);
    for (const agent of agents) {
      console.log(`\n   Agent: ${agent.name}`);
      console.log(`   - ID: ${agent.id}`);
      console.log(`   - Venue: ${agent.venue}`);
      console.log(`   - Status: ${agent.status}`);
      console.log(`   - Deployments: ${agent.deployments.length}`);
      
      if (agent.deployments.length > 0) {
        const dep = agent.deployments[0];
        console.log(`   - Safe Address: ${dep.safeAddress || 'Not set'}`);
        console.log(`   - Module Enabled: ${dep.moduleEnabled ? 'YES' : 'NO'}`);
      }
      
      console.log(`   - Subscribed to: ${agent.agentAccounts.length} X accounts`);
      if (agent.agentAccounts.length > 0) {
        agent.agentAccounts.forEach(aa => {
          console.log(`     • @${aa.ctAccount.username}`);
        });
      } else {
        console.log(`     ⚠️  No X accounts subscribed`);
      }
      
      console.log(`   - Signals generated: ${agent.signals.length}`);
    }

    // Check tweets
    const totalPosts = await prisma.ctPost.count();
    const candidatePosts = await prisma.ctPost.count({
      where: { isCandidate: true }
    });
    
    console.log(`\n📝 Tweets:`);
    console.log(`   - Total ingested: ${totalPosts}`);
    console.log(`   - Filtered (trading candidates): ${candidatePosts}`);

    // Check signals
    const signals = await prisma.signal.findMany({
      include: {
        agent: true
      }
    });
    console.log(`\n📡 Trading Signals: ${signals.length}`);
    if (signals.length > 0) {
      signals.slice(0, 3).forEach(sig => {
        console.log(`   - ${sig.agent.name}: ${sig.side} ${sig.tokenSymbol} @ ${sig.entryPrice}`);
      });
    }

    // Check positions
    const totalPositions = await prisma.position.count();
    const openPositions = await prisma.position.count({
      where: { closedAt: null }
    });
    
    console.log(`\n💰 Positions:`);
    console.log(`   - Total: ${totalPositions}`);
    console.log(`   - Open: ${openPositions}`);
    console.log(`   - Closed: ${totalPositions - openPositions}`);

    console.log('\n═══════════════════════════════════════════════════\n');
    
    // Diagnosis
    console.log('🔍 SYSTEM DIAGNOSIS:\n');
    
    const issues = [];
    const ready = [];
    
    if (ctAccounts.length === 0) {
      issues.push('❌ No X accounts added - need to add CT accounts');
    } else {
      ready.push('✅ X accounts configured');
    }
    
    if (agents.length === 0) {
      issues.push('❌ No agents created');
    } else if (agents.every(a => a.agentAccounts.length === 0)) {
      issues.push('❌ Agents exist but not subscribed to X accounts');
    } else {
      ready.push('✅ Agents subscribed to X accounts');
    }
    
    if (agents.some(a => a.deployments.length === 0)) {
      issues.push('⚠️  Some agents not deployed');
    } else if (agents.length > 0) {
      ready.push('✅ All agents deployed');
    }
    
    if (totalPosts === 0) {
      issues.push('❌ No tweets ingested yet - workers need to run');
    } else {
      ready.push('✅ Tweets being ingested');
    }

    if (ready.length > 0) {
      console.log('READY:');
      ready.forEach(r => console.log(`   ${r}`));
      console.log('');
    }
    
    if (issues.length > 0) {
      console.log('NEEDS ATTENTION:');
      issues.forEach(i => console.log(`   ${i}`));
      console.log('');
    }
    
    if (issues.length === 0 && ready.length > 0) {
      console.log('🎉 SYSTEM IS FULLY OPERATIONAL!\n');
    } else {
      console.log('⚠️  SYSTEM NEEDS SETUP\n');
    }

  } catch (error) {
    console.error('Error checking system status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemStatus();


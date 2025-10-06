import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGrok() {
  console.log('\n🔍 GROK AGENT DEBUG - RAW DATABASE DUMP\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Find Grok
    const agent = await prisma.agent.findFirst({
      where: {
        name: { contains: 'Grok', mode: 'insensitive' }
      },
      include: {
        agentAccounts: {
          include: {
            ctAccount: true
          }
        },
        deployments: true
      }
    });

    if (!agent) {
      console.log('❌ Grok agent not found\n');
      return;
    }

    console.log('✅ AGENT FOUND\n');
    console.log('Basic Info:');
    console.log(`  - Name: ${agent.name}`);
    console.log(`  - ID: ${agent.id}`);
    console.log(`  - Venue: ${agent.venue}`);
    console.log(`  - Status: ${agent.status}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 X ACCOUNT SUBSCRIPTIONS:\n');
    console.log(`Count: ${agent.agentAccounts.length}\n`);
    
    if (agent.agentAccounts.length === 0) {
      console.log('❌ NO SUBSCRIPTIONS IN DATABASE');
      console.log('   This means the UI did NOT save the subscription');
      console.log('   BUG: Check the subscription API endpoint\n');
    } else {
      console.log('✅ SUBSCRIPTIONS FOUND:\n');
      agent.agentAccounts.forEach((aa, idx) => {
        console.log(`${idx + 1}. AgentAccount Record:`);
        console.log(`   - ID: ${aa.id}`);
        console.log(`   - Agent ID: ${aa.agentId}`);
        console.log(`   - CT Account ID: ${aa.ctAccountId}`);
        console.log(`   - Created: ${aa.createdAt}\n`);
        
        console.log(`   CT Account Details:`);
        console.log(`   - Username: ${aa.ctAccount.xUsername || 'NULL'}`);
        console.log(`   - Display: ${aa.ctAccount.displayName || 'NULL'}`);
        console.log(`   - Followers: ${aa.ctAccount.followersCount || 0}\n`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💰 SAFE WALLET CONFIGURATION:\n');
    console.log(`Deployments Count: ${agent.deployments.length}\n`);
    
    if (agent.deployments.length === 0) {
      console.log('❌ NO DEPLOYMENT RECORD');
      console.log('   Agent was never deployed\n');
    } else {
      const dep = agent.deployments[0];
      console.log('Deployment Record:');
      console.log(`  - ID: ${dep.id}`);
      console.log(`  - Agent ID: ${dep.agentId}`);
      console.log(`  - User Wallet: ${dep.userWallet || 'NULL'}`);
      console.log(`  - Safe Address: ${dep.safeWallet || 'NULL'}`);
      console.log(`  - Module Enabled: ${dep.moduleEnabled}`);
      console.log(`  - Created: ${dep.createdAt}\n`);
      
      if (!dep.safeWallet) {
        console.log('❌ SAFE ADDRESS IS NULL');
        console.log('   This means the Safe config API did NOT save');
        console.log('   BUG: Check /api/safe/status or deployment update API\n');
      } else {
        console.log(`✅ SAFE ADDRESS CONFIGURED: ${dep.safeWallet}\n`);
        
        if (!dep.moduleEnabled) {
          console.log('⚠️  MODULE NOT ENABLED');
          console.log('   User needs to complete Safe Transaction Builder\n');
        } else {
          console.log('✅ MODULE ENABLED\n');
        }
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🐛 BUG SUMMARY:\n');
    
    const bugs = [];
    
    if (agent.agentAccounts.length === 0) {
      bugs.push('❌ X Account subscription not saving from UI');
      bugs.push('   → Check: POST /api/agents/[id]/accounts API');
      bugs.push('   → Check: Browser console for errors');
    }
    
    if (agent.deployments.length > 0 && !agent.deployments[0].safeAddress) {
      bugs.push('❌ Safe address not saving from UI');
      bugs.push('   → Check: Safe wallet validation/update API');
      bugs.push('   → Check: Deployment update logic');
    }
    
    if (bugs.length === 0) {
      console.log('✅ NO BUGS FOUND - All data saved correctly!\n');
    } else {
      bugs.forEach(bug => console.log(bug));
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGrok();


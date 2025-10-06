import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupAgentDemo() {
  console.log('\n🚀 Setting up Agent Demo Configuration\n');

  try {
    // Get first agent
    const agent = await prisma.agent.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!agent) {
      console.log('❌ No active agents found. Create an agent first.');
      return;
    }

    console.log(`✓ Found agent: ${agent.name} (${agent.id})`);

    // Get available CT accounts
    const ctAccounts = await prisma.ctAccount.findMany();
    
    if (ctAccounts.length === 0) {
      console.log('\n❌ No X accounts found in database.');
      console.log('   Run this first: npm run ingest-tweets');
      return;
    }

    console.log(`✓ Found ${ctAccounts.length} X accounts`);

    // Subscribe agent to first 3 CT accounts
    const accountsToSubscribe = ctAccounts.slice(0, 3);
    
    console.log(`\n📝 Subscribing ${agent.name} to X accounts:`);
    
    for (const ctAccount of accountsToSubscribe) {
      // Check if subscription already exists
      const existing = await prisma.agentAccount.findFirst({
        where: {
          agentId: agent.id,
          ctAccountId: ctAccount.id
        }
      });

      if (existing) {
        console.log(`   ⏭️  Already subscribed to @${ctAccount.username || ctAccount.xAccountId}`);
        continue;
      }

      // Create subscription
      await prisma.agentAccount.create({
        data: {
          agentId: agent.id,
          ctAccountId: ctAccount.id,
          weight: 50 // Default weight
        }
      });

      console.log(`   ✓ Subscribed to @${ctAccount.username || ctAccount.xAccountId}`);
    }

    // Update agent deployment
    const deployment = await prisma.agentDeployment.findFirst({
      where: { agentId: agent.id }
    });

    if (deployment && !deployment.safeAddress) {
      console.log(`\n⚠️  Agent deployed but Safe wallet not configured`);
      console.log(`   Go to: ${process.env.VERCEL_URL || 'your-app-url'}/deploy-agent/${agent.id}`);
      console.log(`   Complete the Safe wallet setup to enable trading`);
    }

    console.log('\n✅ Agent configuration updated!');
    console.log('\n📊 Next steps:');
    console.log('   1. Workers will ingest tweets from subscribed accounts (every 6h)');
    console.log('   2. LLM will filter trading candidates');
    console.log('   3. Signals will be generated based on agent strategy');
    console.log('   4. Complete Safe wallet setup to enable trade execution');
    console.log('\n🔍 Check status: npm run check:system\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAgentDemo();


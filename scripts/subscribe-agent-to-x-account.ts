import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function subscribeAgent() {
  console.log('\n🔗 SUBSCRIBE AGENT TO X ACCOUNT\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Find grekker agent
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [
          { name: { contains: 'grekker', mode: 'insensitive' } },
          { name: { contains: 'Grekker', mode: 'insensitive' } }
        ]
      }
    });

    if (!agent) {
      console.log('❌ Grekker agent not found');
      return;
    }

    console.log(`✓ Agent: ${agent.name} (${agent.id})`);

    // Get available CT accounts
    const ctAccounts = await prisma.ctAccount.findMany();
    
    if (ctAccounts.length === 0) {
      console.log('\n❌ No X accounts in database');
      console.log('   Run tweet ingestion first to add X accounts');
      return;
    }

    console.log(`\n📋 Available X Accounts (${ctAccounts.length}):`);
    ctAccounts.forEach((acc, idx) => {
      console.log(`   ${idx + 1}. @${acc.username || acc.xAccountId} (${acc.id})`);
    });

    // Subscribe to first CT account
    const ctAccount = ctAccounts[0];
    
    // Check if already subscribed
    const existing = await prisma.agentAccount.findFirst({
      where: {
        agentId: agent.id,
        ctAccountId: ctAccount.id
      }
    });

    if (existing) {
      console.log(`\n✓ Already subscribed to @${ctAccount.username || ctAccount.xAccountId}`);
    } else {
      await prisma.agentAccount.create({
        data: {
          agentId: agent.id,
          ctAccountId: ctAccount.id
        }
      });
      console.log(`\n✓ Subscribed ${agent.name} to @${ctAccount.username || ctAccount.xAccountId}`);
    }

    console.log('\n✅ Agent subscription complete!');
    console.log('\n📋 Next: Run the complete flow test again:');
    console.log('   npx tsx scripts/test-complete-flow.ts\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

subscribeAgent();


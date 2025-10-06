/**
 * Delete All Agents Script
 * Cleans up old agents that may be missing new fields
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllAgents() {
  console.log('🗑️  Deleting all agents...\n');

  try {
    // Get count before deletion
    const countBefore = await prisma.agent.count();
    console.log(`Found ${countBefore} agents to delete\n`);

    if (countBefore === 0) {
      console.log('✅ No agents to delete - database is clean!');
      return;
    }

    // List agents to be deleted
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        venue: true,
        creatorWallet: true,
      },
    });

    console.log('Agents to be deleted:');
    agents.forEach((agent, i) => {
      console.log(`  ${i + 1}. ${agent.name} (${agent.venue}) - ${agent.id}`);
    });
    console.log('');

    // Delete all agents (cascade will delete related records)
    console.log('Deleting agents and all related data...');
    const result = await prisma.agent.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} agents\n`);

    // Verify deletion
    const countAfter = await prisma.agent.count();
    console.log(`Remaining agents: ${countAfter}\n`);

    if (countAfter === 0) {
      console.log('🎉 All agents successfully deleted!');
      console.log('📝 Related data also deleted:');
      console.log('   - Agent accounts (CT links)');
      console.log('   - Agent deployments');
      console.log('   - Signals');
      console.log('   - Positions');
      console.log('   - Billing events');
      console.log('   - PnL snapshots');
      console.log('   - Impact factor history');
    }

  } catch (error) {
    console.error('❌ Error deleting agents:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllAgents()
  .then(() => {
    console.log('\n✨ Cleanup complete! You can now create new agents with profitReceiverAddress.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
    process.exit(1);
  });

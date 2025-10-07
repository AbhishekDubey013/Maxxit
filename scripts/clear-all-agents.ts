#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllAgents() {
  console.log('🗑️  Clearing all agents from database...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get count before deletion
    const agentCount = await prisma.agent.count();
    const deploymentCount = await prisma.agentDeployment.count();
    const agentAccountCount = await prisma.agentAccount.count();
    const signalCount = await prisma.signal.count();
    const positionCount = await prisma.position.count();

    console.log('📊 Current Database State:\n');
    console.log(`   Agents: ${agentCount}`);
    console.log(`   Agent Accounts (links): ${agentAccountCount}`);
    console.log(`   Deployments: ${deploymentCount}`);
    console.log(`   Signals: ${signalCount}`);
    console.log(`   Positions: ${positionCount}\n`);

    if (agentCount === 0) {
      console.log('✅ No agents to delete. Database is already clean.\n');
      return;
    }

    console.log('⚠️  WARNING: This will delete all agents and related data!\n');
    console.log('   The following will be deleted due to CASCADE:');
    console.log('   - All agent accounts (links to CT accounts)');
    console.log('   - All agent deployments');
    console.log('   - All signals');
    console.log('   - All positions');
    console.log('   - All PNL snapshots');
    console.log('   - All billing events\n');

    // Delete all agents (cascade will handle related records)
    console.log('🗑️  Deleting all agents...\n');
    const result = await prisma.agent.deleteMany({});

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Successfully deleted ${result.count} agents\n`);
    
    // Verify deletion
    const remainingAgents = await prisma.agent.count();
    const remainingAccounts = await prisma.agentAccount.count();
    const remainingDeployments = await prisma.agentDeployment.count();
    const remainingSignals = await prisma.signal.count();
    const remainingPositions = await prisma.position.count();

    console.log('📊 Database State After Cleanup:\n');
    console.log(`   Agents: ${remainingAgents}`);
    console.log(`   Agent Accounts: ${remainingAccounts}`);
    console.log(`   Deployments: ${remainingDeployments}`);
    console.log(`   Signals: ${remainingSignals}`);
    console.log(`   Positions: ${remainingPositions}\n`);

    if (remainingAgents === 0) {
      console.log('✅ All agents successfully removed!\n');
      console.log('💡 You can now test creating a new agent to verify the CT account linking fix.\n');
    } else {
      console.log('⚠️  Warning: Some agents remain in the database.\n');
    }

  } catch (error: any) {
    console.error('❌ Error clearing agents:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllAgents();


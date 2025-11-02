#!/usr/bin/env tsx

/**
 * Drop All Agents - Fresh Start
 * Deletes all agents and related data for clean deployment testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropAllAgents() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   🗑️  DROP ALL AGENTS - FRESH START                          ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('⚠️  WARNING: This will delete ALL agents and related data!\n');
    console.log('This includes:');
    console.log('  - All agents');
    console.log('  - All agent deployments');
    console.log('  - All signals');
    console.log('  - All positions');
    console.log('  - All user Hyperliquid wallets');
    console.log('\n');

    // Count current data
    const agentCount = await prisma.agents.count();
    const deploymentCount = await prisma.agent_deployments.count();
    const signalCount = await prisma.signals.count();
    const positionCount = await prisma.positions.count();
    const userWalletCount = await prisma.user_hyperliquid_wallets.count();

    console.log('Current Database State:');
    console.log(`  Agents: ${agentCount}`);
    console.log(`  Deployments: ${deploymentCount}`);
    console.log(`  Signals: ${signalCount}`);
    console.log(`  Positions: ${positionCount}`);
    console.log(`  User Wallets: ${userWalletCount}`);
    console.log('\n');

    if (agentCount === 0) {
      console.log('✅ Database already empty! Nothing to delete.\n');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Starting Deletion (in correct order)...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Delete in order to respect foreign key constraints
    
    // 1. Delete positions (references agent_deployments)
    console.log('1️⃣  Deleting positions...');
    const deletedPositions = await prisma.positions.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPositions.count} position(s)\n`);

    // 2. Delete signals (references agents)
    console.log('2️⃣  Deleting signals...');
    const deletedSignals = await prisma.signals.deleteMany({});
    console.log(`   ✅ Deleted ${deletedSignals.count} signal(s)\n`);

    // 3. Delete agent deployments (references agents)
    console.log('3️⃣  Deleting agent deployments...');
    const deletedDeployments = await prisma.agent_deployments.deleteMany({});
    console.log(`   ✅ Deleted ${deletedDeployments.count} deployment(s)\n`);

    // 4. Delete user Hyperliquid wallets (independent)
    console.log('4️⃣  Deleting user Hyperliquid wallets...');
    const deletedWallets = await prisma.user_hyperliquid_wallets.deleteMany({});
    console.log(`   ✅ Deleted ${deletedWallets.count} wallet(s)\n`);

    // 5. Delete agents (main table)
    console.log('5️⃣  Deleting agents...');
    const deletedAgents = await prisma.agents.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAgents.count} agent(s)\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ DELETION COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Summary:');
    console.log(`  ✓ ${deletedAgents.count} agents deleted`);
    console.log(`  ✓ ${deletedDeployments.count} deployments deleted`);
    console.log(`  ✓ ${deletedSignals.count} signals deleted`);
    console.log(`  ✓ ${deletedPositions.count} positions deleted`);
    console.log(`  ✓ ${deletedWallets.count} user wallets deleted`);
    console.log('\n');

    // Verify cleanup
    const finalAgentCount = await prisma.agents.count();
    const finalDeploymentCount = await prisma.agent_deployments.count();
    const finalSignalCount = await prisma.signals.count();
    const finalPositionCount = await prisma.positions.count();

    console.log('Final Database State:');
    console.log(`  Agents: ${finalAgentCount}`);
    console.log(`  Deployments: ${finalDeploymentCount}`);
    console.log(`  Signals: ${finalSignalCount}`);
    console.log(`  Positions: ${finalPositionCount}`);
    console.log('\n');

    if (finalAgentCount === 0) {
      console.log('✅ Database is now clean! Ready for fresh deployment.\n');
      console.log('Next steps:');
      console.log('  1. Deploy to Railway');
      console.log('  2. Create new agents via UI');
      console.log('  3. Connect Hyperliquid');
      console.log('  4. Monitor overnight\n');
    } else {
      console.log('⚠️  Warning: Some data remains. May need manual cleanup.\n');
    }

  } catch (error: any) {
    console.error('\n❌ Error dropping agents:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
dropAllAgents().catch(console.error);


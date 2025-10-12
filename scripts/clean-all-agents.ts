/**
 * Clean All Agents
 * Delete everything and start fresh
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧹 Cleaning ALL agents and related data...\n');

    // Delete in correct order to respect foreign key constraints

    // 1. Telegram trades
    const telegramTrades = await prisma.telegramTrade.deleteMany({});
    console.log(`✅ Deleted ${telegramTrades.count} Telegram trades`);

    // 2. Telegram users
    const telegramUsers = await prisma.telegramUser.deleteMany({});
    console.log(`✅ Deleted ${telegramUsers.count} Telegram users`);

    // 3. Positions
    const positions = await prisma.position.deleteMany({});
    console.log(`✅ Deleted ${positions.count} positions`);

    // 4. Signals
    const signals = await prisma.signal.deleteMany({});
    console.log(`✅ Deleted ${signals.count} signals`);

    // 5. Agent deployments
    const deployments = await prisma.agentDeployment.deleteMany({});
    console.log(`✅ Deleted ${deployments.count} agent deployments`);

    // 6. Agent account links
    const agentAccounts = await prisma.agentAccount.deleteMany({});
    console.log(`✅ Deleted ${agentAccounts.count} agent account links`);

    // 7. Agents
    const agents = await prisma.agent.deleteMany({});
    console.log(`✅ Deleted ${agents.count} agents`);

    // 8. Audit logs related to agents
    const auditLogs = await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { subjectType: 'Agent' },
          { subjectType: 'AgentDeployment' },
        ],
      },
    });
    console.log(`✅ Deleted ${auditLogs.count} audit logs`);

    console.log('\n✅ Database cleaned! Ready for fresh start! 🎉');
    console.log('\n📝 What to do next:');
    console.log('   1. Create new agents in the UI');
    console.log('   2. Deploy agents with your Safe wallet');
    console.log('   3. Complete ONE-CLICK GMX setup');
    console.log('   4. Start trading!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


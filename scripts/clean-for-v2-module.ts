/**
 * Clean Database for V2 Module
 * 
 * Drops all agents, deployments, and related data
 * to start fresh with the new MaxxitTradingModuleV2
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🧹 ═══════════════════════════════════════════════════════');
  console.log('   CLEANING DATABASE FOR V2 MODULE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('⚠️  This will delete:');
  console.log('   - All agents');
  console.log('   - All deployments');
  console.log('   - All positions');
  console.log('   - All signals');
  console.log('   - All CT accounts');
  console.log('   - All tweets');
  console.log('   - All Telegram users');
  console.log('   - All Telegram trades');
  console.log('   - All venue status');
  console.log('   - All token registry');
  console.log('   - All impact factor history\n');

  console.log('Starting cleanup...\n');

  // Delete in correct order (respecting foreign keys)
  
  // 1. Telegram trades
  const telegramTrades = await prisma.telegramTrade.deleteMany({});
  console.log(`✅ Deleted ${telegramTrades.count} Telegram trades`);

  // 2. Telegram users
  const telegramUsers = await prisma.telegramUser.deleteMany({});
  console.log(`✅ Deleted ${telegramUsers.count} Telegram users`);

  // 3. Impact factor history
  const impactHistory = await prisma.impactFactorHistory.deleteMany({});
  console.log(`✅ Deleted ${impactHistory.count} impact factor history records`);

  // 4. Positions
  const positions = await prisma.position.deleteMany({});
  console.log(`✅ Deleted ${positions.count} positions`);

  // 5. Signals
  const signals = await prisma.signal.deleteMany({});
  console.log(`✅ Deleted ${signals.count} signals`);

  // 6. CT Accounts (if exists)
  try {
    const ctAccounts = await prisma.cTAccount.deleteMany({});
    console.log(`✅ Deleted ${ctAccounts.count} CT accounts`);
  } catch (e) {
    console.log(`⚠️  CT accounts table not found, skipping`);
  }

  // 7. Venue status (if exists)
  try {
    const venueStatus = await prisma.venueStatus.deleteMany({});
    console.log(`✅ Deleted ${venueStatus.count} venue status records`);
  } catch (e) {
    console.log(`⚠️  Venue status table not found, skipping`);
  }

  // 8. Token registry (if exists)
  try {
    const tokenRegistry = await prisma.tokenRegistry.deleteMany({});
    console.log(`✅ Deleted ${tokenRegistry.count} token registry records`);
  } catch (e) {
    console.log(`⚠️  Token registry table not found, skipping`);
  }

  // 9. Agent deployments
  const deployments = await prisma.agentDeployment.deleteMany({});
  console.log(`✅ Deleted ${deployments.count} agent deployments`);

  // 10. Agents
  const agents = await prisma.agent.deleteMany({});
  console.log(`✅ Deleted ${agents.count} agents`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ DATABASE CLEANED!');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Next Steps:');
  console.log('1. Update Railway environment variable:');
  console.log('   TRADING_MODULE_ADDRESS=0x20cfdc15501AF5F3B7C6cb8c067310f817904691');
  console.log('');
  console.log('2. Update Vercel environment variable:');
  console.log('   NEXT_PUBLIC_TRADING_MODULE_ADDRESS=0x20cfdc15501AF5F3B7C6cb8c067310f817904691');
  console.log('');
  console.log('3. Create a new agent with the new module!');
  console.log('');
  console.log('4. Test the simplified onboarding:');
  console.log('   a. Enable module on Safe');
  console.log('   b. Call completeSetup()');
  console.log('   c. Start trading! 🚀\n');
}

main()
  .then(() => {
    console.log('✅ Cleanup complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


/**
 * Clean all test data for fresh Railway start
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              CLEAN TEST DATA FOR FRESH START                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Delete positions
    const positions = await prisma.positions.deleteMany({});
    console.log(`✅ Deleted ${positions.count} positions`);

    // Delete signals
    const signals = await prisma.signals.deleteMany({});
    console.log(`✅ Deleted ${signals.count} signals`);

    // Delete deployments
    const deployments = await prisma.agent_deployments.deleteMany({});
    console.log(`✅ Deleted ${deployments.count} deployments`);

    // Delete user hyperliquid wallets
    const userWallets = await prisma.user_hyperliquid_wallets.deleteMany({});
    console.log(`✅ Deleted ${userWallets.count} user wallets`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST DATA CLEANED - READY FOR FRESH START');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Keeping:');
    console.log('  • Agents (ARES)');
    console.log('  • CT Accounts (@Abhishe42402615)');
    console.log('  • Tweets (34 posts)\n');
    console.log('When user connects on Railway:');
    console.log('  1. Connect wallet → Agent wallet generated');
    console.log('  2. Authorize on Hyperliquid → Deployment created automatically');
    console.log('  3. System starts trading automatically!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTestData();


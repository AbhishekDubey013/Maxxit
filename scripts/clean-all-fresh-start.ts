/**
 * Clean ALL data for fresh start with new V2 module
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 FRESH START - Cleaning all data...\n');
  
  // Delete in order to respect foreign key constraints
  console.log('1️⃣  Deleting Telegram trades...');
  const telegramTrades = await prisma.telegramTrade.deleteMany({});
  console.log(`   ✅ Deleted ${telegramTrades.count} telegram trades\n`);
  
  console.log('2️⃣  Deleting Telegram users...');
  const telegramUsers = await prisma.telegramUser.deleteMany({});
  console.log(`   ✅ Deleted ${telegramUsers.count} telegram users\n`);
  
  console.log('3️⃣  Deleting positions...');
  const positions = await prisma.position.deleteMany({});
  console.log(`   ✅ Deleted ${positions.count} positions\n`);
  
  console.log('4️⃣  Deleting signals...');
  const signals = await prisma.signal.deleteMany({});
  console.log(`   ✅ Deleted ${signals.count} signals\n`);
  
  console.log('5️⃣  Deleting deployments...');
  const deployments = await prisma.agentDeployment.deleteMany({});
  console.log(`   ✅ Deleted ${deployments.count} deployments\n`);
  
  console.log('6️⃣  Deleting agents...');
  const agents = await prisma.agent.deleteMany({});
  console.log(`   ✅ Deleted ${agents.count} agents\n`);
  
  console.log('7️⃣  Deleting CT accounts...');
  const ctAccounts = await prisma.ctAccount.deleteMany({});
  console.log(`   ✅ Deleted ${ctAccounts.count} CT accounts\n`);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ CLEAN SLATE! Ready for fresh start with new V2 module');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 New V2 Module Address:');
  console.log('   0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46\n');
  
  console.log('🎯 Next Steps:');
  console.log('   1. Create new agent in UI');
  console.log('   2. Enable module: 0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46');
  console.log('   3. Start trading! 🚀\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


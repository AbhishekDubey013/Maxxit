/**
 * Check if there are open positions that need monitoring
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking open positions for monitoring...\n');

  const openPositions = await prisma.position.findMany({
    where: {
      closedAt: null
    },
    include: {
      deployment: {
        include: {
          agent: true
        }
      }
    },
    orderBy: {
      openedAt: 'desc'
    }
  });

  if (openPositions.length === 0) {
    console.log('✅ No open positions. Monitoring not needed.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`⚠️  Found ${openPositions.length} open position(s):\n`);

  for (const pos of openPositions) {
    const age = Date.now() - new Date(pos.openedAt).getTime();
    const ageMinutes = Math.floor(age / 60000);

    console.log(`${pos.tokenSymbol.padEnd(8)} | ${pos.side.padEnd(5)} | ${pos.qty.toString().substring(0, 10).padEnd(12)} | Opened ${ageMinutes}m ago`);
    console.log(`   Agent: ${pos.deployment.agent.name}`);
    console.log(`   Safe: ${pos.deployment.safeWallet}`);
    console.log(`   Entry: $${pos.entryPrice}`);
    if (pos.stopLoss) console.log(`   Stop Loss: $${pos.stopLoss}`);
    if (pos.takeProfit) console.log(`   Take Profit: $${pos.takeProfit}`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n🚨 Position monitoring SHOULD BE RUNNING on Railway!\n`);
  console.log('Check: https://railway.app/project/[your-project]/deployments\n');

  await prisma.$disconnect();
}

main();


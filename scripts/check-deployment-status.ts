/**
 * Check deployment status in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking deployment status...\n');
  
  const deployments = await prisma.agentDeployment.findMany({
    include: {
      agent: {
        select: { name: true, venue: true },
      },
    },
    orderBy: { subStartedAt: 'desc' },
  });
  
  if (deployments.length === 0) {
    console.log('✅ No deployments found (clean slate)\n');
    return;
  }
  
  console.log(`Found ${deployments.length} deployment(s):\n`);
  
  deployments.forEach((d, i) => {
    console.log(`${i + 1}. ${d.agent.name} (${d.agent.venue})`);
    console.log(`   Safe: ${d.safeWallet}`);
    console.log(`   Module Enabled: ${d.moduleEnabled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Module Address: ${d.moduleAddress || 'NULL'}`);
    console.log(`   User Wallet: ${d.userWallet}`);
    console.log(`   Started: ${d.subStartedAt}\n`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


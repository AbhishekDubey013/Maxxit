/**
 * Update all deployments to use the new V2 module address
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';

async function main() {
  console.log('🔄 Updating module address for all deployments...\n');
  
  const result = await prisma.agentDeployment.updateMany({
    where: {
      moduleEnabled: true,
    },
    data: {
      moduleAddress: NEW_MODULE,
    },
  });
  
  console.log(`✅ Updated ${result.count} deployment(s) to new module: ${NEW_MODULE}\n`);
  
  // Show updated deployments
  const deployments = await prisma.agentDeployment.findMany({
    where: {
      moduleAddress: NEW_MODULE,
    },
    include: {
      agent: {
        select: { name: true },
      },
    },
  });
  
  console.log('📋 Updated deployments:');
  deployments.forEach((d) => {
    console.log(`  • ${d.agent.name} (${d.safeWallet})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


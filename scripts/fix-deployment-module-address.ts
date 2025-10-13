/**
 * Update deployment moduleAddress to new V2 module
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';

async function main() {
  console.log('🔧 Updating deployment moduleAddress...\n');
  
  // Find deployments with NULL or old moduleAddress
  const deployments = await prisma.agentDeployment.findMany({
    where: {
      safeWallet: {
        equals: '0x9A85f7140776477F1A79Ea29b7A32495636f5e20',
        mode: 'insensitive',
      },
    },
    include: {
      agent: true,
    },
  });
  
  console.log(`Found ${deployments.length} deployment(s) for this Safe:\n`);
  
  for (const deployment of deployments) {
    console.log(`Deployment: ${deployment.agent.name}`);
    console.log(`  Current moduleAddress: ${deployment.moduleAddress || 'NULL'}`);
    
    if (deployment.moduleAddress !== NEW_MODULE) {
      const result = await prisma.agentDeployment.update({
        where: { id: deployment.id },
        data: { moduleAddress: NEW_MODULE },
      });
      
      console.log(`  ✅ Updated to: ${NEW_MODULE}\n`);
    } else {
      console.log(`  ✅ Already correct\n`);
    }
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ All deployments updated with new module address!\n');
  console.log('You can now close positions via Telegram! 🚀\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());


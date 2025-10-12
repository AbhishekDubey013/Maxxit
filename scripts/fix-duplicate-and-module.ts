/**
 * Fix duplicate agents and update module address
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const NEW_MODULE = '0x61cF55A0983eE311ECe219c089C7AA9Df51BE75f';

async function main() {
  console.log('\n🔧 Fixing duplicate agents and module address...\n');

  // Delete agent with 0 deployments
  const deletedAgent = await prisma.agent.delete({
    where: {
      id: '1ee59719-01e8-4dc0-84b4-cd50e9165b9e',
    },
  });
  console.log(`✅ Deleted duplicate agent: ${deletedAgent.name} (0 deployments)\n`);

  // Update deployment with new module address
  const updatedDeployment = await prisma.agentDeployment.updateMany({
    where: {
      agentId: '5515d00a-1b7d-4cd6-a424-b4be8d4acda9',
    },
    data: {
      moduleAddress: NEW_MODULE,
    },
  });
  console.log(`✅ Updated ${updatedDeployment.count} deployment(s) with new module address\n`);

  // Verify
  const agent = await prisma.agent.findUnique({
    where: {
      id: '5515d00a-1b7d-4cd6-a424-b4be8d4acda9',
    },
    include: {
      deployments: true,
    },
  });

  if (agent) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ FINAL STATE:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Agent: ${agent.name}`);
    console.log(`Venue: ${agent.venue}`);
    console.log(`Status: ${agent.status}`);
    console.log(`Deployments: ${agent.deployments.length}\n`);
    
    agent.deployments.forEach((dep, i) => {
      console.log(`${i + 1}. Deployment:`);
      console.log(`   Safe: ${dep.safeWallet}`);
      console.log(`   Module: ${dep.moduleAddress}`);
      console.log(`   Link Code: ${dep.linkCode || 'Not generated yet'}\n`);
    });
  }

  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('✅ Fix complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


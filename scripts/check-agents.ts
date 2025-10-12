/**
 * Check all agents in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 Checking all agents in database...\n');

  const agents = await prisma.agent.findMany({
    include: {
      deployments: true,
    },
  });

  if (agents.length === 0) {
    console.log('No agents found in database.\n');
    return;
  }

  console.log(`Found ${agents.length} agent(s):\n`);

  agents.forEach((agent, index) => {
    console.log(`${index + 1}. Agent: ${agent.name}`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Venue: ${agent.venue}`);
    console.log(`   Status: ${agent.status}`);
    console.log(`   Creator: ${agent.creatorWallet}`);
    console.log(`   Deployments: ${agent.deployments.length}`);
    
    if (agent.deployments.length > 0) {
      agent.deployments.forEach((dep, i) => {
        console.log(`     ${i + 1}) Safe: ${dep.safeWallet}`);
        console.log(`        Module: ${dep.moduleAddress || 'NULL'}`);
        console.log(`        Link Code: ${dep.linkCode || 'NULL'}`);
      });
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


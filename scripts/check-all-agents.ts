/**
 * Check All Agents
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking All Agents\n');

    const agents = await prisma.agent.findMany({
      include: {
        deployments: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (agents.length === 0) {
      console.log('❌ No agents found\n');
      return;
    }

    console.log(`Found ${agents.length} agent(s):\n`);

    for (const agent of agents) {
      console.log('═══════════════════════════════════════════════');
      console.log(`Agent: ${agent.name}`);
      console.log(`ID: ${agent.id}`);
      console.log(`Venue: ${agent.venue || '(not set)'}`);
      console.log(`Status: ${agent.status}`);
      console.log(`Deployments: ${agent.deployments.length}`);
      
      if (agent.deployments.length > 0) {
        console.log('\nDeployments:');
        for (const dep of agent.deployments) {
          console.log(`  • ID: ${dep.id}`);
          console.log(`    Safe: ${dep.safe_wallet}`);
          console.log(`    Module Enabled: ${dep.moduleEnabled ? '✅' : '❌'}`);
          console.log(`    Module Address: ${dep.moduleAddress || '(not set)'}`);
        }
      }
      console.log('');
    }

    console.log('═══════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


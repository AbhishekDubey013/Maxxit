/**
 * Check GMX Deployments Status
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking GMX Agent Deployments\n');

    const gmxDeployments = await prisma.agentDeployment.findMany({
      where: {
        agent: {
          venue: 'GMX',
        },
      },
      include: {
        agent: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (gmxDeployments.length === 0) {
      console.log('❌ No GMX deployments found');
      console.log('   Please create a GMX agent first\n');
      return;
    }

    console.log(`Found ${gmxDeployments.length} GMX deployment(s):\n`);

    for (const dep of gmxDeployments) {
      console.log('═══════════════════════════════════════════════');
      console.log(`Agent: ${dep.agent.name} (${dep.agent.status})`);
      console.log(`Deployment ID: ${dep.id}`);
      console.log(`Safe: ${dep.safe_wallet}`);
      console.log(`User: ${dep.userWallet}`);
      console.log(`Module Enabled: ${dep.moduleEnabled ? '✅ YES' : '❌ NO'}`);
      console.log(`Module Address: ${dep.moduleAddress || '(not set)'}`);
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


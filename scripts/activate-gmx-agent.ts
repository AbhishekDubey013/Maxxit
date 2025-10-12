/**
 * Activate GMX Agent
 * Set status to ACTIVE so it can be deployed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Finding GMX agent to activate...\n');

    // Get one GMX agent in DRAFT status
    const agent = await prisma.agent.findFirst({
      where: {
        venue: 'GMX',
        status: 'DRAFT',
      },
    });

    if (!agent) {
      console.log('No DRAFT GMX agents found');
      return;
    }

    console.log('📊 Current Status:');
    console.log(`   Name: ${agent.name}`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Venue: ${agent.venue}`);
    console.log(`   Status: ${agent.status}`);
    console.log('');

    // Activate it
    console.log('✏️  Activating agent...');
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'ACTIVE' },
    });

    console.log('✅ Agent activated!');
    console.log(`   Name: ${updated.name}`);
    console.log(`   ID: ${updated.id}`);
    console.log(`   Status: ${updated.status}`);
    console.log('');
    console.log('🚀 Ready to deploy!');
    console.log(`   Go to: https://maxxit.vercel.app/deploy-agent/${updated.id}`);

    // Delete duplicate agents
    console.log('');
    console.log('🧹 Cleaning up duplicate agents...');
    const deleted = await prisma.agent.deleteMany({
      where: {
        id: { not: updated.id },
        name: updated.name,
        venue: 'GMX',
      },
    });
    console.log(`✅ Deleted ${deleted.count} duplicate agent(s)`);

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

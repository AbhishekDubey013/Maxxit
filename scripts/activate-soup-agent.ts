/**
 * Activate Soup Agent
 * Set status to ACTIVE so it's visible to all users
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Finding Soup agent to activate...\n');

    // Get the Soup agent
    const agent = await prisma.agent.findFirst({
      where: {
        name: { contains: 'soup', mode: 'insensitive' },
      },
      include: {
        deployments: true,
      }
    });

    if (!agent) {
      console.log('❌ Soup agent not found');
      return;
    }

    console.log('📊 Current Status:');
    console.log(`   Name: ${agent.name}`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Venue: ${agent.venue}`);
    console.log(`   Status: ${agent.status}`);
    console.log(`   Creator: ${agent.creatorWallet}`);
    console.log(`   Deployments: ${agent.deployments.length}`);
    console.log('');

    if (agent.status === 'ACTIVE') {
      console.log('✅ Agent is already ACTIVE!');
      console.log(`   Visible at: https://maxxit.vercel.app/`);
      return;
    }

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
    console.log('🚀 Now visible to all users!');
    console.log(`   Marketplace: https://maxxit.vercel.app/`);
    console.log(`   Deploy page: https://maxxit.vercel.app/deploy-agent/${updated.id}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


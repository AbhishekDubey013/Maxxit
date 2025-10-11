import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkNewAgentDeployments() {
  try {
    console.log('🔍 Checking NEW AGENT deployments...\n');
    
    // Find the NEW AGENT
    const newAgent = await prisma.agent.findFirst({
      where: {
        name: 'NEW AGENT',
      },
      include: {
        deployments: {
          include: {
            _count: {
              select: {
                positions: true,
              },
            },
          },
        },
      },
    });

    if (!newAgent) {
      console.log('❌ NEW AGENT not found in database');
      return;
    }

    console.log('🤖 NEW AGENT Details:');
    console.log('   Agent ID:', newAgent.id);
    console.log('   X Account:', newAgent.xAccountHandle || 'N/A');
    console.log('   Total Deployments:', newAgent.deployments.length);
    console.log('');

    if (newAgent.deployments.length === 0) {
      console.log('📭 No deployments found for NEW AGENT');
    } else {
      console.log('📊 DEPLOYMENTS:\n');
      
      newAgent.deployments.forEach((deployment, idx) => {
        console.log(`${idx + 1}. Deployment ID: ${deployment.id}`);
        console.log(`   Safe Address: ${deployment.safeWallet}`);
        console.log(`   Module Address: ${deployment.moduleAddress}`);
        console.log(`   Module Enabled: ${deployment.moduleEnabled ? '✅ YES' : '❌ NO'}`);
        console.log(`   Status: ${deployment.status}`);
        console.log(`   Total Positions: ${deployment._count.positions}`);
        console.log(`   Created: ${deployment.subStartedAt}`);
        console.log('');
      });
      
      // Count open vs closed positions
      const allPositions = await prisma.position.findMany({
        where: {
          deployment: {
            agentId: newAgent.id,
          },
        },
      });
      
      const openCount = allPositions.filter(p => !p.closedAt).length;
      const closedCount = allPositions.filter(p => p.closedAt).length;
      
      console.log('📈 Position Summary:');
      console.log(`   Open: ${openCount}`);
      console.log(`   Closed: ${closedCount}`);
      console.log(`   Total: ${allPositions.length}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkNewAgentDeployments();


/**
 * Fix GMX Deployment Module Status
 * Update DB to reflect that the NEW V2 module is NOT yet enabled
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_V2_MODULE = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';

async function main() {
  try {
    console.log('🔧 Fixing GMX Deployment Module Status...\n');

    // Get GMX deployment
    const deployment = await prisma.agentDeployment.findFirst({
      where: {
        agent: {
          venue: 'GMX',
        },
      },
      include: {
        agent: true,
      },
    });

    if (!deployment) {
      console.log('No GMX deployment found');
      return;
    }

    console.log('📊 Current Status:');
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   moduleEnabled: ${deployment.moduleEnabled}`);
    console.log(`   moduleAddress: ${deployment.moduleAddress || 'NULL'}`);
    console.log('');

    // Update to correct status
    console.log('✏️  Updating to correct status...');
    const updated = await prisma.agentDeployment.update({
      where: { id: deployment.id },
      data: {
        moduleEnabled: false, // NOT enabled yet
        moduleAddress: NEW_V2_MODULE, // Point to NEW V2 module
      },
    });

    console.log('✅ Updated!');
    console.log(`   moduleEnabled: ${updated.moduleEnabled}`);
    console.log(`   moduleAddress: ${updated.moduleAddress}`);
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. User should see "Setup GMX Trading" button in UI');
    console.log('   2. User clicks button and signs ONE transaction');
    console.log('   3. Batch transaction enables module + authorizes GMX');
    console.log('   4. Ready to trade!');
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


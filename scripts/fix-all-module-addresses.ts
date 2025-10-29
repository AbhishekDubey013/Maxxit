/**
 * Fix ALL Module Addresses
 * Update all deployments from V2 to V3
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const V2_MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const V3_MODULE = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';

async function fixAllModuleAddresses() {
  console.log('🔧 Fixing ALL Module Addresses');
  console.log('━'.repeat(60));
  console.log(`V2 Module (OLD): ${V2_MODULE}`);
  console.log(`V3 Module (NEW): ${V3_MODULE}`);
  console.log('━'.repeat(60));
  console.log('');

  try {
    // Find all deployments with V2 module or null module
    const deployments = await prisma.agentDeployment.findMany({
      where: {
        OR: [
          { moduleAddress: V2_MODULE },
          { moduleAddress: null },
        ],
      },
      include: {
        agent: true,
      },
    });

    console.log(`📊 Found ${deployments.length} deployment(s) to update`);
    console.log('');

    if (deployments.length === 0) {
      console.log('✅ All deployments already using V3 module!');
      return;
    }

    for (const deployment of deployments) {
      console.log(`📝 Updating: ${deployment.agent.name}`);
      console.log(`   Safe: ${deployment.safeWallet}`);
      console.log(`   Old module: ${deployment.moduleAddress || 'NULL'}`);
      
      await prisma.agentDeployment.update({
        where: { id: deployment.id },
        data: {
          moduleAddress: V3_MODULE,
        },
      });
      
      console.log(`   ✅ Updated to V3 module`);
      console.log('');
    }

    console.log('━'.repeat(60));
    console.log(`✅ SUCCESS! Updated ${deployments.length} deployment(s)`);
    console.log('');
    console.log('🧪 Telegram trades will now use V3 module for all agents');

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllModuleAddresses().catch(console.error);


/**
 * Fix Module Address in Deployment
 * Updates from V2 to V3 module
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const V2_MODULE = '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const V3_MODULE = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';

async function fixModuleAddress() {
  console.log('🔧 Fixing Module Address in Database');
  console.log('━'.repeat(60));
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`V2 Module (OLD): ${V2_MODULE}`);
  console.log(`V3 Module (NEW): ${V3_MODULE}`);
  console.log('━'.repeat(60));
  console.log('');

  try {
    // Find deployment
    const deployment = await prisma.agentDeployment.findFirst({
      where: { safeWallet: SAFE_ADDRESS },
      include: { agent: true },
    });

    if (!deployment) {
      console.log('❌ No deployment found for this Safe');
      return;
    }

    console.log(`✅ Found deployment for agent: ${deployment.agent.name}`);
    console.log(`   Current module address: ${deployment.moduleAddress || 'NULL'}`);
    console.log('');

    if (deployment.moduleAddress === V3_MODULE) {
      console.log('✅ Already using V3 module! No update needed.');
      return;
    }

    console.log('🔄 Updating to V3 module...');
    
    await prisma.agentDeployment.update({
      where: { id: deployment.id },
      data: {
        moduleAddress: V3_MODULE,
      },
    });

    console.log('✅ Module address updated successfully!');
    console.log('');
    console.log('━'.repeat(60));
    console.log('✅ FIXED! Telegram trades will now use V3 module.');
    console.log('');
    console.log('🧪 Try your Telegram trade again:');
    console.log('   "Buy 2 USDC of WETH"');

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixModuleAddress().catch(console.error);


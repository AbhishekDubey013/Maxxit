import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RING_DEPLOYMENT_ID = '338c5f51-49fb-4039-aa6c-7e09fffc50f5';

async function fixModuleStatus() {
  try {
    console.log('🔧 Fixing Ring deployment module status...');

    const updated = await prisma.agentDeployment.update({
      where: { id: RING_DEPLOYMENT_ID },
      data: {
        moduleEnabled: true,
        moduleAddress: '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb', // V3
      },
    });

    console.log('✅ Updated deployment:');
    console.log(JSON.stringify(updated, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixModuleStatus();


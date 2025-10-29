/**
 * Verify Module Configuration
 * Check what module address will be used for trades
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const V3_MODULE = '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';

async function verifyConfig() {
  console.log('🔍 Verifying Module Configuration');
  console.log('━'.repeat(60));
  
  try {
    // Check all deployments
    const deployments = await prisma.agentDeployment.findMany({
      where: { safeWallet: SAFE_ADDRESS },
      include: { agent: true },
    });

    console.log(`Found ${deployments.length} deployment(s) for Safe: ${SAFE_ADDRESS}`);
    console.log('');

    deployments.forEach((d, i) => {
      console.log(`${i + 1}. Agent: ${d.agent.name}`);
      console.log(`   Module: ${d.moduleAddress || 'NULL'}`);
      console.log(`   Match V3: ${d.moduleAddress === V3_MODULE ? '✅' : '❌'}`);
      console.log('');
    });

    // Check env variable
    console.log('Environment Variables:');
    console.log(`   TRADING_MODULE_ADDRESS: ${process.env.TRADING_MODULE_ADDRESS || 'NOT SET'}`);
    console.log(`   MODULE_ADDRESS: ${process.env.MODULE_ADDRESS || 'NOT SET'}`);
    console.log('');

    console.log('━'.repeat(60));
    const allV3 = deployments.every(d => d.moduleAddress === V3_MODULE);
    if (allV3) {
      console.log('✅ ALL DEPLOYMENTS CONFIGURED FOR V3 MODULE');
    } else {
      console.log('⚠️  SOME DEPLOYMENTS NOT USING V3 MODULE');
    }

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyConfig().catch(console.error);


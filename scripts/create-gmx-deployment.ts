/**
 * Create GMX Deployment
 * 
 * Manually create a deployment for the GMX agent
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20'; // Your Safe
const USER_WALLET = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20'; // Your wallet
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D'; // V2 Module

async function main() {
  try {
    console.log('📝 Creating GMX Deployment\n');

    // Find the GMX agent
    const gmxAgent = await prisma.agent.findFirst({
      where: {
        venue: 'GMX',
        status: 'ACTIVE',
      },
    });

    if (!gmxAgent) {
      console.log('❌ No active GMX agent found');
      console.log('   Please create a GMX agent first\n');
      return;
    }

    console.log(`Found GMX Agent: ${gmxAgent.name} (ID: ${gmxAgent.id})\n`);

    // Check if deployment already exists
    const existing = await prisma.agentDeployment.findFirst({
      where: {
        agentId: gmxAgent.id,
        safeWallet: SAFE_ADDRESS.toLowerCase(),
      },
    });

    if (existing) {
      console.log('✅ Deployment already exists!');
      console.log(`   Deployment ID: ${existing.id}`);
      console.log(`   Safe: ${existing.safeWallet}`);
      console.log(`   Module Enabled: ${existing.moduleEnabled ? 'YES' : 'NO'}`);
      console.log('');
      
      if (!existing.moduleEnabled) {
        console.log('📝 Updating moduleEnabled to TRUE (you said you enabled it)...\n');
        
        const updated = await prisma.agentDeployment.update({
          where: { id: existing.id },
          data: {
            moduleEnabled: true,
            moduleAddress: MODULE_ADDRESS,
          },
        });
        
        console.log('✅ Deployment updated!');
        console.log(`   Module Enabled: ${updated.moduleEnabled}`);
        console.log(`   Module Address: ${updated.moduleAddress}`);
        console.log('');
      }
      
      return;
    }

    // Create new deployment
    console.log('📝 Creating new deployment...\n');
    
    const deployment = await prisma.agentDeployment.create({
      data: {
        agentId: gmxAgent.id,
        userWallet: USER_WALLET.toLowerCase(),
        safeWallet: SAFE_ADDRESS.toLowerCase(),
        moduleAddress: MODULE_ADDRESS,
        moduleEnabled: true, // You said you enabled it
        subActive: false,
      },
    });

    console.log('✅ GMX Deployment Created!');
    console.log('');
    console.log('Deployment Details:');
    console.log(`  • ID: ${deployment.id}`);
    console.log(`  • Agent: ${gmxAgent.name}`);
    console.log(`  • Safe: ${deployment.safeWallet}`);
    console.log(`  • Module: ${deployment.moduleAddress}`);
    console.log(`  • Module Enabled: ${deployment.moduleEnabled ? '✅ YES' : '❌ NO'}`);
    console.log('');
    console.log('🎉 Ready to test GMX trading!');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


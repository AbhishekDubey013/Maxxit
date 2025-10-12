import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixModuleAddresses() {
  console.log('\n🔧 Fixing Module Addresses in Production DB\n');
  console.log('═'.repeat(60));

  try {
    // Update all deployments with null moduleAddress to V2 module
    const result = await prisma.agentDeployment.updateMany({
      where: {
        OR: [
          { moduleAddress: null },
          { moduleAddress: '' },
          { 
            moduleAddress: {
              not: '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D'
            }
          }
        ],
      },
      data: {
        moduleAddress: '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D',
      },
    });

    console.log(`✅ Updated ${result.count} deployment(s) with V2 module address`);
    console.log(`   Module: 0x07627aef95CBAD4a17381c4923Be9B9b93526d3D`);
    
    // Verify
    const deployments = await prisma.agentDeployment.findMany({
      where: {
        moduleEnabled: true,
      },
      select: {
        id: true,
        safeWallet: true,
        moduleAddress: true,
        moduleEnabled: true,
        agent: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`\n📊 Active Deployments: ${deployments.length}\n`);
    deployments.forEach(d => {
      console.log(`  ${d.agent.name}`);
      console.log(`    Safe: ${d.safeWallet}`);
      console.log(`    Module: ${d.moduleAddress || 'NULL ❌'}`);
      console.log(`    Enabled: ${d.moduleEnabled ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('═'.repeat(60));
    console.log('✅ Fix complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixModuleAddresses();


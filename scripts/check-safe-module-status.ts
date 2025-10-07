#!/usr/bin/env tsx
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';

const SAFE_ABI = [
  'function isModuleEnabled(address module) external view returns (bool)',
  'function getModules() external view returns (address[])',
  'function nonce() external view returns (uint256)',
];

async function checkModuleStatus() {
  console.log('🔍 Checking Safe Module Status\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get all deployments
    const deployments = await prisma.agentDeployment.findMany({
      include: {
        agent: true,
      },
      orderBy: { subStartedAt: 'desc' },
    });

    if (deployments.length === 0) {
      console.log('❌ No deployments found\n');
      return;
    }

    console.log(`📊 Found ${deployments.length} deployment(s)\n`);
    console.log(`🔧 Module Address: ${MODULE_ADDRESS}`);
    console.log(`🌐 RPC: ${SEPOLIA_RPC}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);

    for (const deployment of deployments) {
      console.log(`\n🤖 Agent: ${deployment.agent.name}`);
      console.log(`   Deployment ID: ${deployment.id}`);
      console.log(`   Safe Wallet: ${deployment.safeWallet}`);
      console.log(`   User Wallet: ${deployment.userWallet}`);
      console.log(`   DB Status - Module Enabled: ${deployment.moduleEnabled ? '✅' : '❌'}\n`);

      try {
        // Check if Safe exists
        const code = await provider.getCode(deployment.safeWallet);
        if (code === '0x') {
          console.log('   ⚠️  Safe wallet not found on Sepolia (not deployed yet)\n');
          continue;
        }

        // Create Safe contract instance
        const safe = new ethers.Contract(deployment.safeWallet, SAFE_ABI, provider);

        // Check if module is enabled
        const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
        console.log(`   🔗 On-Chain Status - Module Enabled: ${isEnabled ? '✅ YES' : '❌ NO'}`);

        // Get all enabled modules
        try {
          const modules = await safe.getModules();
          console.log(`   📋 Enabled Modules: ${modules.length}`);
          if (modules.length > 0) {
            modules.forEach((mod: string, i: number) => {
              const isOurModule = mod.toLowerCase() === MODULE_ADDRESS.toLowerCase();
              console.log(`      ${i + 1}. ${mod} ${isOurModule ? '← Our Module ✅' : ''}`);
            });
          }
        } catch (e) {
          console.log('   ⚠️  Could not fetch module list');
        }

        // Get nonce
        try {
          const nonce = await safe.nonce();
          console.log(`   🔢 Safe Nonce: ${nonce.toString()}`);
        } catch (e) {
          console.log('   ⚠️  Could not fetch nonce');
        }

        // Compare DB status with on-chain status
        if (deployment.moduleEnabled !== isEnabled) {
          console.log(`\n   ⚠️  MISMATCH DETECTED!`);
          console.log(`   Database says: ${deployment.moduleEnabled ? 'Enabled' : 'Disabled'}`);
          console.log(`   Blockchain says: ${isEnabled ? 'Enabled' : 'Disabled'}`);
          console.log(`   → Database needs to be updated!\n`);

          // Update database to match on-chain status
          if (isEnabled) {
            await prisma.agentDeployment.update({
              where: { id: deployment.id },
              data: { moduleEnabled: true },
            });
            console.log('   ✅ Database updated to match on-chain status\n');
          }
        } else {
          console.log(`\n   ✅ Database and blockchain are in sync\n`);
        }

      } catch (error: any) {
        console.log(`   ❌ Error checking Safe: ${error.message}\n`);
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    console.log('\n\n📝 Summary:\n');
    
    const enabledCount = deployments.filter(d => d.moduleEnabled).length;
    const totalCount = deployments.length;
    
    console.log(`   Total Deployments: ${totalCount}`);
    console.log(`   Module Enabled (DB): ${enabledCount}`);
    console.log(`   Module Disabled (DB): ${totalCount - enabledCount}\n`);

    if (enabledCount === 0) {
      console.log('⚠️  NO MODULES ARE ENABLED YET!\n');
      console.log('📋 Next Steps:\n');
      console.log('   1. Go to https://app.safe.global');
      console.log('   2. Open your Safe wallet');
      console.log('   3. Navigate to Apps → Transaction Builder');
      console.log('   4. Execute enableModule transaction');
      console.log(`   5. Module Address: ${MODULE_ADDRESS}\n`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModuleStatus();


/**
 * Fix All Deployment Issues
 * 1. Update all deployments to have correct moduleAddress
 * 2. Check and update module enabled status based on env
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46';
const ARBITRUM_RPC = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

async function main() {
  console.log('\n🔧 FIXING ALL DEPLOYMENT ISSUES\n');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Using Module Address: ${MODULE_ADDRESS}\n`);

  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  const safeAbi = ['function isModuleEnabled(address module) view returns (bool)'];

  // Get all deployments
  const deployments = await prisma.agentDeployment.findMany({
    include: {
      agent: true,
    }
  });

  console.log(`Found ${deployments.length} deployments\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const deployment of deployments) {
    console.log(`\n📦 Deployment: ${deployment.id}`);
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   DB Module Address: ${deployment.moduleAddress || 'NULL'}`);
    console.log(`   DB Module Enabled: ${deployment.moduleEnabled}`);

    let needsUpdate = false;
    const updates: any = {};

    // Fix 1: Update moduleAddress if NULL or wrong
    if (!deployment.moduleAddress || deployment.moduleAddress !== MODULE_ADDRESS) {
      console.log(`   → Will update moduleAddress to ${MODULE_ADDRESS}`);
      updates.moduleAddress = MODULE_ADDRESS;
      needsUpdate = true;
    }

    // Fix 2: Check on-chain module status
    try {
      const safe = new ethers.Contract(deployment.safeWallet, safeAbi, provider);
      const isEnabled = await safe.isModuleEnabled(MODULE_ADDRESS);
      
      console.log(`   On-Chain Module Enabled: ${isEnabled}`);

      if (deployment.moduleEnabled !== isEnabled) {
        console.log(`   → Will sync moduleEnabled to ${isEnabled}`);
        updates.moduleEnabled = isEnabled;
        needsUpdate = true;
      }
    } catch (error: any) {
      console.log(`   ⚠️  Could not check on-chain status: ${error.message}`);
    }

    // Apply updates
    if (needsUpdate) {
      await prisma.agentDeployment.update({
        where: { id: deployment.id },
        data: updates,
      });
      console.log(`   ✅ Updated!`);
    } else {
      console.log(`   ✅ Already correct`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('\n🎉 All deployments fixed!\n');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });


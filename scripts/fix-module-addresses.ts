#!/usr/bin/env tsx
/**
 * Fix module addresses in database
 * - Check which module is actually enabled on-chain
 * - Update database records accordingly
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const OLD_MODULE = '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const NEW_MODULE = '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19';
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
];

async function fixModuleAddresses() {
  console.log('🔧 Fixing Module Addresses\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);

  // Get all deployments
  const deployments = await prisma.agentDeployment.findMany({
    include: {
      agent: {
        select: { name: true }
      }
    }
  });

  console.log(`Found ${deployments.length} deployments\n`);

  for (const deployment of deployments) {
    console.log(`📦 Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   Current DB: moduleEnabled=${deployment.moduleEnabled}, moduleAddress=${deployment.moduleAddress || 'NULL'}`);

    const safe = new ethers.Contract(deployment.safeWallet, SAFE_ABI, provider);

    try {
      // Check both modules
      const oldModuleEnabled = await safe.isModuleEnabled(OLD_MODULE);
      const newModuleEnabled = await safe.isModuleEnabled(NEW_MODULE);

      console.log(`   On-Chain Check:`);
      console.log(`     Old Module (${OLD_MODULE}): ${oldModuleEnabled ? '✅ ENABLED' : '❌ NOT ENABLED'}`);
      console.log(`     New Module (${NEW_MODULE}): ${newModuleEnabled ? '✅ ENABLED' : '❌ NOT ENABLED'}`);

      // Update database based on which module is enabled
      let updateData: any = {};

      if (newModuleEnabled) {
        updateData = {
          moduleEnabled: true,
          moduleAddress: NEW_MODULE,
        };
        console.log(`   ✅ Updating DB to NEW MODULE`);
      } else if (oldModuleEnabled) {
        updateData = {
          moduleEnabled: true,
          moduleAddress: OLD_MODULE,
        };
        console.log(`   ⚠️  Updating DB to OLD MODULE (needs upgrade!)`);
      } else {
        updateData = {
          moduleEnabled: false,
          moduleAddress: null,
        };
        console.log(`   ❌ No module enabled`);
      }

      await prisma.agentDeployment.update({
        where: { id: deployment.id },
        data: updateData,
      });

      console.log(`   ✅ Database updated\n`);

    } catch (error: any) {
      console.log(`   ❌ Error checking Safe: ${error.message}\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Summary:\n');
  
  const updated = await prisma.agentDeployment.findMany({
    include: {
      agent: { select: { name: true } }
    }
  });

  updated.forEach(d => {
    console.log(`${d.agent.name}:`);
    console.log(`  Module: ${d.moduleAddress === NEW_MODULE ? '✅ NEW' : d.moduleAddress === OLD_MODULE ? '⚠️  OLD' : '❌ NONE'}`);
    console.log(`  Enabled: ${d.moduleEnabled ? 'Yes' : 'No'}`);
    console.log('');
  });

  console.log('\n💡 Next Steps:\n');
  console.log('1. Update .env with new module:');
  console.log(`   MODULE_ADDRESS=${NEW_MODULE}`);
  console.log('');
  console.log('2. For agents with OLD module, enable NEW module:');
  console.log('   Visit: http://localhost:3000/enable-new-module');
  console.log('');
  console.log('3. Run setup for NEW module:');
  console.log('   npx tsx scripts/approve-and-init-new-module.ts');

  await prisma.$disconnect();
}

fixModuleAddresses().catch(console.error);

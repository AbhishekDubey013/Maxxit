/**
 * Check GMX Deployment Status
 * Compare DB status vs on-chain reality
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const MODULE_V2_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
  'function getModules() view returns (address[])',
];

async function main() {
  try {
    console.log('🔍 Checking GMX Deployment Status...\n');
    console.log('Module V2 Address:', MODULE_V2_ADDRESS);
    console.log('');

    // Get all GMX deployments
    const deployments = await prisma.agentDeployment.findMany({
      where: {
        agent: {
          venue: 'GMX',
        },
      },
      include: {
        agent: true,
      },
      orderBy: {
        subStartedAt: 'desc',
      },
    });

    if (deployments.length === 0) {
      console.log('No GMX deployments found');
      return;
    }

    console.log(`Found ${deployments.length} GMX deployment(s)\n`);

    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);

    for (const deployment of deployments) {
      console.log('━'.repeat(80));
      console.log(`📊 Deployment: ${deployment.agent.name}`);
      console.log(`   ID: ${deployment.id}`);
      console.log(`   Safe: ${deployment.safeWallet}`);
      console.log(`   User: ${deployment.userWallet}`);
      console.log('');

      // Check DB status
      console.log('💾 DATABASE Status:');
      console.log(`   moduleEnabled: ${deployment.moduleEnabled}`);
      console.log(`   moduleAddress: ${deployment.moduleAddress || 'NULL'}`);
      console.log('');

      // Check on-chain status
      console.log('⛓️  ON-CHAIN Status:');
      try {
        const safe = new ethers.Contract(deployment.safeWallet, SAFE_ABI, provider);
        
        // Check V2 module
        const isV2Enabled = await safe.isModuleEnabled(MODULE_V2_ADDRESS);
        console.log(`   V2 Module (${MODULE_V2_ADDRESS}): ${isV2Enabled ? '✅ ENABLED' : '❌ NOT ENABLED'}`);

        // Get all enabled modules
        const enabledModules = await safe.getModules();
        console.log(`   All enabled modules (${enabledModules.length}):`);
        if (enabledModules.length === 0) {
          console.log('     (none)');
        } else {
          enabledModules.forEach((addr: string) => {
            console.log(`     - ${addr}`);
          });
        }

        // Compare
        console.log('');
        console.log('🔍 COMPARISON:');
        if (deployment.moduleEnabled && !isV2Enabled) {
          console.log('   ⚠️  MISMATCH: DB says enabled, but V2 module NOT enabled on-chain!');
        } else if (!deployment.moduleEnabled && isV2Enabled) {
          console.log('   ⚠️  MISMATCH: DB says not enabled, but V2 module IS enabled on-chain!');
        } else if (deployment.moduleEnabled && isV2Enabled) {
          console.log('   ✅ MATCH: Both DB and on-chain show enabled');
        } else {
          console.log('   ✅ MATCH: Both DB and on-chain show NOT enabled');
        }

      } catch (error: any) {
        console.log(`   ❌ Error checking on-chain: ${error.message}`);
      }

      console.log('');
    }

    console.log('━'.repeat(80));
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();


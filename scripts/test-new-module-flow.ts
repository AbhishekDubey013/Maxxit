#!/usr/bin/env tsx
/**
 * Complete test flow for new module
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const NEW_MODULE = process.env.MODULE_ADDRESS || '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19';
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
];

async function testFlow() {
  console.log('🧪 Testing New Module Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Step 1: Environment Check\n');
  console.log(`   MODULE_ADDRESS: ${NEW_MODULE}`);
  console.log(`   Expected: 0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19`);
  
  if (NEW_MODULE === '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19') {
    console.log('   ✅ Correct module address!\n');
  } else {
    console.log('   ❌ Wrong module address!\n');
    return;
  }

  console.log('📋 Step 2: Check Safe and Module Status\n');

  const deployment = await prisma.agentDeployment.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      agent: { select: { name: true } }
    }
  });

  if (!deployment) {
    console.log('   ❌ No active deployment found\n');
    return;
  }

  console.log(`   Agent: ${deployment.agent.name}`);
  console.log(`   Safe: ${deployment.safeWallet}`);
  console.log(`   Current DB Module: ${deployment.moduleAddress || 'NULL'}`);
  console.log(`   Current DB Status: ${deployment.moduleEnabled ? 'Enabled' : 'Not Enabled'}\n`);

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const safe = new ethers.Contract(deployment.safeWallet, SAFE_ABI, provider);

  try {
    const isEnabled = await safe.isModuleEnabled(NEW_MODULE);
    console.log(`   On-Chain Status: ${isEnabled ? '✅ NEW MODULE ENABLED' : '❌ NEW MODULE NOT ENABLED YET'}\n`);

    if (!isEnabled) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('⏸️  PAUSED: New module not enabled yet\n');
      console.log('📋 Next Steps:\n');
      console.log('1. Visit: http://localhost:3000/enable-new-module');
      console.log('2. Follow the wizard to enable the module');
      console.log('3. Run this test again\n');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 Module is enabled! Ready for setup.\n');
    console.log('📋 Next Steps:\n');
    console.log('1. Run setup script:');
    console.log('   npx tsx scripts/approve-and-init-new-module.ts\n');
    console.log('2. Execute first trade:');
    console.log('   npx tsx pages/api/admin/execute-trade.ts\n');

  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  await prisma.$disconnect();
}

testFlow().catch(console.error);

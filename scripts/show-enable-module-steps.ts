#!/usr/bin/env tsx
/**
 * Show steps to enable module
 */

import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const NEW_MODULE = process.env.MODULE_ADDRESS || '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19';

const SAFE_ABI = [
  'function enableModule(address module) external',
];

async function showSteps() {
  console.log('📝 Enable New Module - Quick Guide\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const deployment = await prisma.agentDeployment.findFirst({
    where: { status: 'ACTIVE' },
  });

  if (!deployment) {
    console.log('❌ No active deployment found');
    await prisma.$disconnect();
    return;
  }

  const safeAddress = deployment.safeWallet;

  // Generate transaction data
  const iface = new ethers.utils.Interface(SAFE_ABI);
  const txData = iface.encodeFunctionData('enableModule', [NEW_MODULE]);

  console.log('🎯 Method 1: Use Safe Transaction Builder (Easiest)\n');
  console.log('1. Visit: http://localhost:3000/enable-new-module');
  console.log('2. Click "Check Module Status"');
  console.log('3. Follow the wizard\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🎯 Method 2: Direct Safe UI\n');
  console.log('Transaction Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('To:', safeAddress);
  console.log('Value: 0');
  console.log('Data:');
  console.log(txData);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Steps:');
  console.log('1. Go to: https://app.safe.global');
  console.log('2. Connect your wallet');
  console.log(`3. Select Safe: ${safeAddress}`);
  console.log('4. Go to "Apps" → "Transaction Builder"');
  console.log('5. Click "New Batch"');
  console.log(`6. Enter Address To: ${safeAddress}`);
  console.log('7. Paste the data above');
  console.log('8. Click "Add Transaction" → "Create Batch"');
  console.log('9. Sign and execute\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎯 After Module is Enabled:\n');
  console.log('Run: npx tsx scripts/test-new-module-flow.ts');
  console.log('Then: npx tsx scripts/approve-and-init-new-module.ts\n');

  await prisma.$disconnect();
}

showSteps().catch(console.error);

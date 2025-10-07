#!/usr/bin/env tsx
/**
 * Call approveTokenForDex and initializeCapital on new module
 * (Module must already be enabled on Safe via Safe UI)
 */

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const NEW_MODULE_ADDRESS = '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19';
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const UNISWAP_ROUTER = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

const MODULE_ABI = [
  'function approveTokenForDex(address safe, address token, address dexRouter) external',
  'function initializeCapital(address safe) external',
  'function isInitialized(address) view returns (bool)',
  'function initialCapital(address) view returns (uint256)',
];

const SAFE_ABI = [
  'function isModuleEnabled(address module) view returns (bool)',
];

async function setupModule() {
  console.log('🔧 Setting Up New Module\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found');
    return;
  }

  // Get Safe address from database
  const deployment = await prisma.agentDeployment.findFirst({
    where: {
      status: 'ACTIVE',
    },
  });

  if (!deployment) {
    console.log('❌ No active deployment found');
    return;
  }

  const safeAddress = deployment.safeWallet;
  console.log('Safe Address:', safeAddress);
  console.log('Module Address:', NEW_MODULE_ADDRESS);
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const executor = new ethers.Wallet(privateKey, provider);
  const module = new ethers.Contract(NEW_MODULE_ADDRESS, MODULE_ABI, executor);
  const safe = new ethers.Contract(safeAddress, SAFE_ABI, provider);

  try {
    // Check if module is enabled
    const isEnabled = await safe.isModuleEnabled(NEW_MODULE_ADDRESS);
    if (!isEnabled) {
      console.log('❌ Module not enabled on Safe yet!');
      console.log('');
      console.log('Please enable module via Safe UI:');
      console.log('1. Go to https://app.safe.global');
      console.log(`2. Select Safe: ${safeAddress}`);
      console.log('3. Settings → Modules');
      console.log(`4. Add module: ${NEW_MODULE_ADDRESS}`);
      console.log('');
      console.log('Then run this script again.');
      return;
    }

    console.log('✅ Module is enabled on Safe\n');

    // 1. Approve USDC for Uniswap Router
    console.log('1️⃣  Approving USDC for Uniswap Router (MAX_UINT256)...');
    try {
      const approveTx = await module.approveTokenForDex(
        safeAddress,
        USDC,
        UNISWAP_ROUTER,
        {
          gasLimit: 300000,
        }
      );
      console.log('   Transaction:', approveTx.hash);
      console.log('   Waiting for confirmation...');
      await approveTx.wait();
      console.log('   ✅ USDC approved!\n');
    } catch (error: any) {
      if (error.message.includes('already')) {
        console.log('   ✅ Already approved\n');
      } else {
        throw error;
      }
    }

    // 2. Initialize capital tracking
    console.log('2️⃣  Initializing capital tracking...');
    const isInit = await module.isInitialized(safeAddress);
    if (isInit) {
      const capital = await module.initialCapital(safeAddress);
      console.log(`   ✅ Already initialized (${ethers.utils.formatUnits(capital, 6)} USDC)\n`);
    } else {
      const initTx = await module.initializeCapital(safeAddress, {
        gasLimit: 200000,
      });
      console.log('   Transaction:', initTx.hash);
      console.log('   Waiting for confirmation...');
      await initTx.wait();
      const capital = await module.initialCapital(safeAddress);
      console.log(`   ✅ Capital initialized: ${ethers.utils.formatUnits(capital, 6)} USDC\n`);
    }

    // 3. Update database
    console.log('3️⃣  Updating database...');
    await prisma.agentDeployment.update({
      where: { id: deployment.id },
      data: {
        moduleAddress: NEW_MODULE_ADDRESS,
        moduleEnabled: true,
      },
    });
    console.log('   ✅ Database updated\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🎉 COMPLETE SETUP DONE!\n');
    console.log('✅ Module enabled');
    console.log('✅ USDC approved (one-time, unlimited)');
    console.log('✅ Capital initialized');
    console.log('✅ Database updated\n');
    console.log('🚀 Ready to execute first real trade!\n');
    console.log('Run: npx tsx pages/api/admin/execute-trade.ts\n');

  } catch (error: any) {
    console.log('❌ Error:', error.message);
    if (error.error) {
      console.log('   Details:', error.error.message);
    }
  }
}

setupModule().catch(console.error);

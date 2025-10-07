#!/usr/bin/env tsx
/**
 * Enable the new module on Safe and do initial setup
 */

import { ethers } from 'ethers';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
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
];

async function enableAndSetup() {
  console.log('🔧 Enabling New Module and Setting Up\n');
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!deployment) {
    console.log('❌ No active deployment found');
    return;
  }

  const safeAddress = deployment.safeWallet;
  console.log('Safe Address:', safeAddress);
  console.log('New Module:', NEW_MODULE_ADDRESS);
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const executor = new ethers.Wallet(privateKey, provider);

  try {
    // Initialize Safe SDK
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: executor,
    });

    const safe = await Safe.default.create({
      ethAdapter,
      safeAddress,
    });

    console.log('📋 Safe initialized\n');

    // Check if module is already enabled
    const isEnabled = await safe.isModuleEnabled(NEW_MODULE_ADDRESS);
    
    if (isEnabled) {
      console.log('✅ Module already enabled\n');
    } else {
      console.log('1️⃣  Enabling module on Safe...');
      console.log('   Note: This requires Safe owner signature');
      console.log('   You may need to use Safe UI instead\n');
      
      const tx = await safe.createEnableModuleTx(NEW_MODULE_ADDRESS);
      const txResponse = await safe.executeTransaction(tx);
      console.log('   Transaction:', txResponse.hash);
      await txResponse.transactionResponse?.wait();
      console.log('   ✅ Module enabled\n');
    }

    // Now call approveTokenForDex
    const module = new ethers.Contract(NEW_MODULE_ADDRESS, MODULE_ABI, executor);

    console.log('2️⃣  Approving USDC for Uniswap Router (one-time)...');
    const approveTx = await module.approveTokenForDex(
      safeAddress,
      USDC,
      UNISWAP_ROUTER,
      {
        gasLimit: 300000,
      }
    );
    console.log('   Transaction:', approveTx.hash);
    await approveTx.wait();
    console.log('   ✅ USDC approved to Uniswap (MAX_UINT256)\n');

    // Initialize capital
    console.log('3️⃣  Initializing capital tracking...');
    const isInit = await module.isInitialized(safeAddress);
    if (isInit) {
      console.log('   ✅ Already initialized\n');
    } else {
      const initTx = await module.initializeCapital(safeAddress, {
        gasLimit: 200000,
      });
      console.log('   Transaction:', initTx.hash);
      await initTx.wait();
      console.log('   ✅ Capital initialized\n');
    }

    // Update database
    console.log('4️⃣  Updating database...');
    await prisma.agentDeployment.update({
      where: { id: deployment.id },
      data: {
        moduleAddress: NEW_MODULE_ADDRESS,
        moduleEnabled: true,
      },
    });
    console.log('   ✅ Database updated\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ COMPLETE SETUP DONE!\n');
    console.log('🚀 Ready to execute first real trade!\n');
    console.log('Run: npx tsx scripts/execute-first-trade.ts\n');

  } catch (error: any) {
    console.log('❌ Error:', error.message);
    if (error.message.includes('owner signature')) {
      console.log('');
      console.log('ℹ️  Module enablement requires Safe owner approval');
      console.log('   Please use Safe UI to enable module:');
      console.log(`   ${NEW_MODULE_ADDRESS}`);
      console.log('');
      console.log('   Or run the following scripts separately:');
      console.log('   - npx tsx scripts/approve-token-for-dex.ts');
      console.log('   - npx tsx scripts/initialize-capital.ts');
    }
  }
}

enableAndSetup().catch(console.error);

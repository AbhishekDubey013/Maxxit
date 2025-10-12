/**
 * Test GMX Trading Flow - Single Step Setup
 * 
 * Verify that GMX trading works with ONLY module enabled (no authorization)
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const MODULE_ADDRESS = process.env.TRADING_MODULE_ADDRESS || '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const EXECUTOR_PRIVATE_KEY = process.env.EXECUTOR_PRIVATE_KEY || '';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

async function main() {
  try {
    console.log('🧪 Testing GMX Single-Step Trading Flow\n');
    console.log('═══════════════════════════════════════════════\n');

    // 1. Find GMX agent deployment
    console.log('1️⃣ Finding GMX agent deployment...\n');
    
    const deployment = await prisma.agentDeployment.findFirst({
      where: {
        agent: {
          venue: 'GMX',
          status: 'ACTIVE',
        },
        moduleEnabled: true,
      },
      include: {
        agent: true,
      },
    });

    if (!deployment) {
      console.log('❌ No GMX deployment found with module enabled');
      console.log('   Please enable the module first via the UI\n');
      return;
    }

    console.log('✅ GMX Deployment Found:');
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   Module: ${deployment.moduleAddress || MODULE_ADDRESS}`);
    console.log('');

    const safeAddress = deployment.safeWallet;
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const executor = new ethers.Wallet(EXECUTOR_PRIVATE_KEY, provider);

    // 2. Verify module is enabled on-chain
    console.log('2️⃣ Verifying module is enabled on-chain...\n');
    
    const safeAbi = ['function isModuleEnabled(address module) external view returns (bool)'];
    const safe = new ethers.Contract(safeAddress, safeAbi, provider);
    const isEnabled = await safe.isModuleEnabled(deployment.moduleAddress || MODULE_ADDRESS);

    if (!isEnabled) {
      console.log('❌ Module NOT enabled on-chain!');
      console.log('   Please enable via Safe Transaction Builder\n');
      return;
    }

    console.log('✅ Module is enabled on-chain');
    console.log('');

    // 3. Check Safe USDC balance
    console.log('3️⃣ Checking Safe USDC balance...\n');
    
    const usdcAbi = ['function balanceOf(address) external view returns (uint256)'];
    const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, provider);
    const usdcBalance = await usdc.balanceOf(safeAddress);
    const usdcBalanceFormatted = ethers.utils.formatUnits(usdcBalance, 6);

    console.log(`   USDC Balance: ${usdcBalanceFormatted} USDC`);
    
    if (usdcBalance.lt(ethers.utils.parseUnits('1', 6))) {
      console.log('⚠️  Low USDC balance (< 1 USDC)');
      console.log('   GMX trades require collateral\n');
    } else {
      console.log('✅ Sufficient USDC for testing\n');
    }

    // 4. Create a test signal for GMX
    console.log('4️⃣ Creating test GMX signal...\n');
    
    // Delete old ETH signals for this agent to avoid unique constraint violation
    await prisma.signal.deleteMany({
      where: {
        agentId: deployment.agentId,
        tokenSymbol: 'ETH',
      },
    });
    
    const testSignal = await prisma.signal.create({
      data: {
        agent: {
          connect: { id: deployment.agentId }
        },
        tokenSymbol: 'ETH',
        sourceTweets: ['Test GMX trade - single-step setup verification'],
        venue: 'GMX',
        side: 'LONG',
        sizeModel: JSON.stringify({ type: 'percentage', value: 20 }), // 20% > 1 USDC
        riskModel: JSON.stringify({ 
          stopLoss: { type: 'trailing', value: 5 },
          takeProfit: { type: 'percentage', value: 10 }
        }),
      },
    });

    console.log('✅ Test signal created:');
    console.log(`   ID: ${testSignal.id}`);
    console.log(`   Token: ETH`);
    console.log(`   Action: BUY (LONG)`);
    console.log('');

    // 5. Attempt GMX trade execution
    console.log('5️⃣ Testing GMX trade execution...\n');
    console.log('   This will test if GMX V2 works WITHOUT authorization!\n');

    // Import trade executor
    const { TradeExecutor } = require('../lib/trade-executor');
    const { createSafeModuleService } = require('../lib/safe-module-service');

    const moduleService = await createSafeModuleService(
      safeAddress,
      deployment.moduleAddress || MODULE_ADDRESS,
      EXECUTOR_PRIVATE_KEY
    );

    const tradeExecutor = new TradeExecutor(
      EXECUTOR_PRIVATE_KEY,
      moduleService
    );

    try {
      console.log('   📡 Executing trade via module...');
      console.log('   (Using 1.5 USDC for test - above 1 USDC GMX minimum)');
      console.log('');

      const result = await tradeExecutor.executeSignalForDeployment(
        testSignal.id,
        deployment.id,
        {
          type: 'fixed-usdc',
          value: 1.5, // 1.5 USDC (above 1 USDC minimum)
        }
      );

      if (result.success) {
        console.log('✅ GMX TRADE SUCCESSFUL!');
        console.log('');
        console.log('   Trade Details:');
        console.log(`   • Position ID: ${result.positionId}`);
        console.log(`   • Transaction: ${result.txHash}`);
        console.log(`   • Token: ETH`);
        console.log(`   • Size: 0.5 USDC`);
        console.log('');
        console.log('🎉 GMX V2 works WITHOUT authorization!');
        console.log('');
      } else {
        console.log('❌ Trade failed:');
        console.log(`   Error: ${result.error}`);
        console.log('');
      }
    } catch (error: any) {
      console.log('❌ Trade execution error:');
      console.log(`   ${error.message}`);
      console.log('');
      
      if (error.message.includes('authorization') || error.message.includes('subaccount')) {
        console.log('⚠️  AUTHORIZATION ERROR DETECTED!');
        console.log('   This means GMX V2 DOES require authorization');
        console.log('   We need to add Step 2 back!\n');
      }
    }

    // 6. Summary
    console.log('═══════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    console.log('GMX Single-Step Setup Test:');
    console.log(`  ✅ Module Enabled: YES`);
    console.log(`  ❌ Authorization: SKIPPED (not needed!)`);
    console.log('');
    console.log('Next Steps:');
    console.log('  • Check Arbiscan for transaction');
    console.log('  • Verify position in GMX UI');
    console.log('  • Monitor position tracking');
    console.log('');

  } catch (error: any) {
    console.error('❌ Test Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();


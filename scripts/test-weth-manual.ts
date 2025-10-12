import { PrismaClient } from '@prisma/client';
import { createSafeModuleService } from '../lib/safe-module-service';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH_ADDRESS = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';

async function testWETHTrade() {
  console.log('\n🧪 Manual WETH Trade Test (V2 Module)\n');
  console.log('═'.repeat(60));

  try {
    // 1. Get deployment
    const deployment = await prisma.agentDeployment.findFirst({
      where: {
        userWallet: {
          equals: '0x9A85f7140776477F1A79Ea29b7A32495636f5e20',
          mode: 'insensitive',
        },
        moduleEnabled: true,
      },
      include: {
        agent: true,
      },
    });

    if (!deployment) {
      throw new Error('No enabled deployment found');
    }

    console.log('\n✅ Deployment found:');
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   Module: ${deployment.moduleAddress}`);

    // 2. Create module service
    const moduleService = createSafeModuleService(
      deployment.moduleAddress!,
      42161,
      process.env.EXECUTOR_PRIVATE_KEY!
    );

    // 3. Check Safe USDC balance
    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    
    const usdcBalance = await usdcContract.balanceOf(deployment.safeWallet);
    console.log(`\n💰 Safe USDC Balance: ${ethers.utils.formatUnits(usdcBalance, 6)} USDC`);

    if (usdcBalance.lt(ethers.utils.parseUnits('1', 6))) {
      throw new Error('Insufficient USDC balance (need at least 1 USDC)');
    }

    // 4. Prepare trade params
    // NOTE: Contract collects 0.2 USDC fee FIRST, then swaps full amountIn (BUG!)
    // So we need amountIn + 0.2 USDC available. Testing with smaller amount:
    const amountIn = ethers.utils.parseUnits('0.5', 6); // 0.5 USDC (Safe has 1.19 USDC)
    const minAmountOut = '0'; // Accept any amount (for testing)
    
    console.log('\n📊 Trade Parameters:');
    console.log(`   From: USDC (${USDC_ADDRESS})`);
    console.log(`   To: WETH (${WETH_ADDRESS})`);
    console.log(`   Amount In: ${ethers.utils.formatUnits(amountIn, 6)} USDC`);
    console.log(`   Min Out: Any amount (testing)`);
    console.log(`   Profit Receiver: ${deployment.agent.profitReceiverAddress}`);

    // 5. Execute trade
    console.log('\n🚀 Executing trade via V2 module...\n');
    
    const result = await moduleService.executeTrade({
      safeAddress: deployment.safeWallet,
      fromToken: USDC_ADDRESS,
      toToken: WETH_ADDRESS,
      amountIn: amountIn.toString(),
      minAmountOut,
      dexRouter: '', // Not used in V2
      swapData: '', // Not used in V2
      profitReceiver: deployment.agent.profitReceiverAddress,
    });

    if (!result.success) {
      throw new Error(result.error || 'Trade failed');
    }

    console.log('\n✅ TRADE SUCCESSFUL!\n');
    console.log('═'.repeat(60));
    console.log(`\n📍 Transaction Hash: ${result.txHash}`);
    console.log(`🔗 View on Arbiscan: https://arbiscan.io/tx/${result.txHash}`);
    
    if (result.amountOut) {
      console.log(`\n💎 Amount Out: ${ethers.utils.formatEther(result.amountOut)} WETH`);
    }
    
    console.log(`💵 Fee Charged: 0.2 USDC (${result.feeCharged})`);
    console.log('\n═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWETHTrade();


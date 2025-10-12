import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { createSafeModuleService } from '../lib/safe-module-service';

dotenv.config();

const prisma = new PrismaClient();

async function testCloseARBPosition() {
  console.log('\n🧪 Testing ARB Position Close Locally\n');
  console.log('═'.repeat(60));

  try {
    // 1. Find the open ARB position
    const position = await prisma.position.findFirst({
      where: {
        tokenSymbol: 'ARB',
        closedAt: null,
      },
      include: {
        deployment: {
          include: {
            agent: true,
          },
        },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    if (!position) {
      console.log('❌ No open ARB position found');
      return;
    }

    console.log('✅ Open ARB Position Found:\n');
    console.log(`   Position ID: ${position.id}`);
    console.log(`   Token: ${position.tokenSymbol}`);
    console.log(`   Quantity: ${position.qty} ARB`);
    console.log(`   Entry Price: $${position.entryPrice}`);
    console.log(`   Entry Value: $${Number(position.entryPrice) * Number(position.qty)} USDC`);
    console.log(`   Agent: ${position.deployment.agent.name}`);
    console.log(`   Safe: ${position.deployment.safeWallet}`);
    console.log(`   Module: ${position.deployment.moduleAddress}`);

    // 2. Get token registry
    const tokenRegistry = await prisma.tokenRegistry.findUnique({
      where: {
        chain_tokenSymbol: {
          chain: 'arbitrum',
          tokenSymbol: 'ARB',
        },
      },
    });

    if (!tokenRegistry) {
      console.log('❌ ARB not found in token registry');
      return;
    }

    console.log(`\n   Token Address: ${tokenRegistry.tokenAddress}`);

    // 3. Check actual ARB balance in Safe
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const arbContract = new ethers.Contract(
      tokenRegistry.tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const arbBalance = await arbContract.balanceOf(position.deployment.safeWallet);
    const arbBalanceFormatted = ethers.utils.formatEther(arbBalance);
    
    console.log(`\n   Actual ARB Balance: ${arbBalanceFormatted} ARB`);
    
    // Use actual balance (not DB qty) to close
    const amountToClose = arbBalance;
    const amountFormatted = parseFloat(arbBalanceFormatted).toFixed(6);
    
    console.log(`   Amount to Close: ${amountFormatted} ARB`);

    // 4. Calculate entry value in USDC (wei, 6 decimals)
    const totalEntryValueUSD = Number(position.entryPrice) * Number(arbBalanceFormatted);
    const entryValueUSDC = ethers.utils.parseUnits(
      totalEntryValueUSD.toFixed(6),
      6
    ).toString();

    console.log(`   Entry Value (USDC wei): ${entryValueUSDC}`);
    console.log(`   Entry Value (USDC): ${totalEntryValueUSD.toFixed(6)} USDC`);

    // 5. Setup module service
    const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY!;
    if (!executorPrivateKey) {
      console.log('❌ EXECUTOR_PRIVATE_KEY not found in .env');
      return;
    }

    const moduleService = createSafeModuleService(
      position.deployment.moduleAddress!,
      42161,
      executorPrivateKey
    );

    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

    console.log('\n═'.repeat(60));
    console.log('📤 Executing closePosition via V2 Module...\n');

    // 6. Call closePosition
    const result = await moduleService.closePosition({
      safeAddress: position.deployment.safeWallet,
      tokenIn: tokenRegistry.tokenAddress,
      tokenOut: USDC_ADDRESS,
      amountIn: amountToClose.toString(),
      minAmountOut: '0',
      profitReceiver: position.deployment.agent.profitReceiverAddress,
      entryValueUSDC: entryValueUSDC,
    });

    console.log('═'.repeat(60));
    
    if (result.success) {
      console.log('\n✅ Position closed successfully!\n');
      console.log(`   Transaction: ${result.txHash}`);
      console.log(`   View on Arbiscan: https://arbiscan.io/tx/${result.txHash}`);
      
      // Update database
      await prisma.position.update({
        where: { id: position.id },
        data: {
          closedAt: new Date(),
          exitTxHash: result.txHash,
        },
      });
      
      console.log('\n   ✅ Database updated');
    } else {
      console.log('\n❌ Position close failed!\n');
      console.log(`   Error: ${result.error}`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.error) {
      console.error('Contract Error:', error.error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCloseARBPosition();


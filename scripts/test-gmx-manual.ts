import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { createSafeModuleService } from '../lib/safe-module-service';
import { createGMXDirectAdapter } from '../lib/adapters/gmx-direct';

dotenv.config();

const prisma = new PrismaClient();

async function testGMXManual() {
  console.log('\n🧪 Testing GMX Manual Trade\n');
  console.log('═'.repeat(60));

  try {
    // Find GMX deployment
    const deployment = await prisma.agentDeployment.findFirst({
      where: {
        agent: {
          venue: 'GMX',
        },
        moduleEnabled: true,
      },
      include: {
        agent: true,
      },
    });

    if (!deployment) {
      console.log('❌ No GMX deployment found with module enabled');
      console.log('\n💡 Create a GMX agent and enable the module first!');
      return;
    }

    console.log('✅ Found GMX Deployment:\n');
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   Module: ${deployment.moduleAddress}`);

    // Check balances
    const provider = new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );

    const [usdcBalance, ethBalance] = await Promise.all([
      usdcContract.balanceOf(deployment.safeWallet),
      provider.getBalance(deployment.safeWallet),
    ]);

    const usdcFormatted = ethers.utils.formatUnits(usdcBalance, 6);
    const ethFormatted = ethers.utils.formatEther(ethBalance);

    console.log(`\n💰 Safe Balances:`);
    console.log(`   USDC: ${usdcFormatted}`);
    console.log(`   ETH: ${ethFormatted}`);

    if (parseFloat(usdcFormatted) < 1.5) {
      console.log('\n❌ Insufficient USDC (need at least 1.5 USDC)');
      console.log('   Required: 0.2 USDC fee + 1 USDC collateral + buffer');
      return;
    }

    if (parseFloat(ethFormatted) < 0.001) {
      console.log('\n❌ Insufficient ETH in Safe (need at least 0.001 ETH for GMX execution fee)');
      console.log(`   Send ETH to Safe: ${deployment.safeWallet}`);
      return;
    }

    // Setup GMX adapter
    const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY!;
    if (!executorPrivateKey) {
      console.log('❌ EXECUTOR_PRIVATE_KEY not found in .env');
      return;
    }

    const moduleService = createSafeModuleService(
      deployment.moduleAddress!,
      42161,
      executorPrivateKey
    );

    const gmxAdapter = createGMXDirectAdapter(moduleService, provider);

    // Test trade parameters
    const tradeParams = {
      safeAddress: deployment.safeWallet,
      tokenSymbol: 'ETH',
      collateralUSDC: 1, // 1 USDC collateral
      leverage: 2, // 2x leverage = 2 USD position size
      isLong: true,
      slippagePercent: 1, // 1% slippage for testing
    };

    console.log('\n═'.repeat(60));
    console.log('📤 Opening GMX Position:\n');
    console.log(`   Token: ${tradeParams.tokenSymbol}`);
    console.log(`   Collateral: ${tradeParams.collateralUSDC} USDC`);
    console.log(`   Leverage: ${tradeParams.leverage}x`);
    console.log(`   Position Size: ${tradeParams.collateralUSDC * tradeParams.leverage} USD`);
    console.log(`   Direction: ${tradeParams.isLong ? 'LONG 📈' : 'SHORT 📉'}`);
    console.log(`   Slippage: ${tradeParams.slippagePercent}%`);
    console.log('\n═'.repeat(60));

    console.log('\n⏳ Executing trade...\n');

    // Open position
    const result = await gmxAdapter.openPosition(tradeParams);

    console.log('\n═'.repeat(60));

    if (result.success) {
      console.log('\n✅ GMX Position Opened Successfully!\n');
      console.log(`   Transaction: ${result.txHash}`);
      console.log(`   View on Arbiscan: https://arbiscan.io/tx/${result.txHash}`);
      console.log('\n📊 Trade Summary:');
      console.log(`   - Fee Collected: 0.2 USDC`);
      console.log(`   - Collateral Used: ${tradeParams.collateralUSDC} USDC`);
      console.log(`   - Position Size: ${tradeParams.collateralUSDC * tradeParams.leverage} USD`);
      console.log(`   - Execution Fee: 0.001 ETH`);
      console.log('\n💡 Next Steps:');
      console.log('   1. Wait 30-60 seconds for GMX keepers to execute order');
      console.log('   2. Check position on GMX: https://app.gmx.io/#/trade');
      console.log('   3. Test closing: npx tsx scripts/test-gmx-close.ts');
    } else {
      console.log('\n❌ GMX Position Failed!\n');
      console.log(`   Error: ${result.error}`);
      
      // Common errors and solutions
      console.log('\n🔍 Common Issues:');
      console.log('   1. Module not enabled → Enable V2 module on Safe');
      console.log('   2. Insufficient USDC → Add USDC to Safe');
      console.log('   3. Insufficient ETH → Add ETH to Safe for execution fees');
      console.log('   4. Nonce collision → Wait a few seconds and retry');
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

testGMXManual();


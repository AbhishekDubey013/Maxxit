import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testSpotTradeLocal() {
  console.log('\n🧪 Local SPOT Trade Test\n');
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

    console.log('\n✅ Deployment:');
    console.log(`   Agent: ${deployment.agent.name}`);
    console.log(`   Safe: ${deployment.safeWallet}`);
    console.log(`   Module: ${deployment.moduleAddress}`);

    // 2. Check which tokens are available
    const availableTokens = await prisma.venueStatus.findMany({
      where: {
        venue: 'SPOT',
      },
      select: {
        tokenSymbol: true,
      },
    });

    console.log(`\n📊 Available Tokens (${availableTokens.length}):`);
    console.log(availableTokens.map(t => t.tokenSymbol).join(', '));

    // 3. Create a manual signal for testing
    const tokenSymbol = 'ARB'; // Test with ARB
    const amountUSDC = 0.25; // Safe has ~0.49 USDC, so 0.25 + 0.2 fee = 0.45 total

    console.log(`\n🔄 Creating test signal: ${amountUSDC} USDC → ${tokenSymbol}\n`);

    // Check if token exists in registry
    const tokenInfo = await prisma.tokenRegistry.findFirst({
      where: {
        tokenSymbol: tokenSymbol,
      },
    });

    if (!tokenInfo) {
      throw new Error(`Token ${tokenSymbol} not found in registry`);
    }

    console.log(`   Token Address: ${tokenInfo.tokenAddress}`);

    // Delete old test signals
    await prisma.signal.deleteMany({
      where: {
        agentId: deployment.agentId,
        tokenSymbol: {
          contains: tokenSymbol,
        },
      },
    });

    // Create signal (matching Telegram format)
    const signal = await prisma.signal.create({
      data: {
        agentId: deployment.agentId,
        venue: 'SPOT',
        tokenSymbol: `${tokenSymbol}_MANUAL_${Date.now()}`, // Manual trade
        side: 'LONG',
        sizeModel: {
          type: 'fixed-usdc',
          value: amountUSDC,
        },
        riskModel: {
          stopLoss: 0.05,
          takeProfit: 0.15,
        },
        sourceTweets: [`local_test_${Date.now()}`],
      },
    });

    console.log(`   ✅ Signal created: ${signal.id}\n`);

    // 4. Execute trade
    console.log('🚀 Executing trade...\n');

    const executor = new TradeExecutor();
    const result = await executor.executeSignalForDeployment(signal.id, deployment.id);

    if (result.success) {
      console.log('\n✅ TRADE SUCCESSFUL!\n');
      console.log('═'.repeat(60));
      console.log(`\n📍 Transaction: ${result.txHash}`);
      console.log(`🔗 Arbiscan: https://arbiscan.io/tx/${result.txHash}`);
      
      if (result.position) {
        console.log(`\n💰 Position Created:`);
        console.log(`   Token: ${result.position.tokenSymbol}`);
        console.log(`   Quantity: ${result.position.qty}`);
        console.log(`   Entry Price: ${result.position.avgEntryPriceUsd}`);
        console.log(`   Value: ${result.position.currentValueUsd} USDC`);
      }
      
      console.log('\n═'.repeat(60));
    } else {
      console.error('\n❌ TRADE FAILED!\n');
      console.error('Error:', result.error);
      console.error('\nDiagnostic Info:');
      console.error(JSON.stringify(result, null, 2));
    }

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSpotTradeLocal();


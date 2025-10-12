import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';
const SAFE_ADDRESS = '0x9A85f7140776477F1A79Ea29b7A32495636f5e20';
const MODULE_ADDRESS = '0x07627aef95CBAD4a17381c4923Be9B9b93526d3D';
const USDC_ADDRESS = '0xaf88d065e77c8cc2239327c5edb3a432268e5831';

async function testWETHTrade() {
  console.log('\n🧪 Manual V2 WETH Trade Test\n');
  console.log('═'.repeat(60));

  try {
    // 1. Find the ArbMaxx deployment
    const deployment = await prisma.agentDeployment.findFirst({
      where: {
        safeWallet: SAFE_ADDRESS,
        moduleEnabled: true,
      },
      include: {
        agent: true,
      },
    });

    if (!deployment) {
      console.log('❌ No deployment found for', SAFE_ADDRESS);
      return;
    }

    console.log('\n✅ Found Deployment:');
    console.log('   Agent:', deployment.agent.name);
    console.log('   Safe:', deployment.safeWallet);
    console.log('   Module:', deployment.moduleAddress);

    // 2. Check USDC balance
    const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const balance = await usdcContract.balanceOf(SAFE_ADDRESS);
    console.log('\n💰 Safe USDC Balance:', ethers.utils.formatUnits(balance, 6), 'USDC');

    if (balance.lt(ethers.utils.parseUnits('1.5', 6))) {
      console.log('❌ Insufficient USDC balance (need at least 1.5 USDC)');
      return;
    }

    // 3. Clean up old WETH signals
    const deleted = await prisma.signal.deleteMany({
      where: {
        agentId: deployment.agentId,
        tokenSymbol: 'WETH',
      },
    });
    console.log('\n🧹 Cleaned up', deleted.count, 'old WETH signals');

    // 4. Create a test signal
    const signal = await prisma.signal.create({
      data: {
        agentId: deployment.agentId,
        tokenSymbol: 'WETH',
        venue: 'SPOT',
        side: 'LONG',
        sizeModel: JSON.stringify({ type: 'fixed-usdc', value: 1.5 }),
        riskModel: JSON.stringify({
          stopLoss: { type: 'trailing', value: 5 },
          takeProfit: { type: 'percentage', value: 10 },
        }),
        sourceTweets: JSON.stringify([{ id: 'manual_test', text: 'Manual V2 test' }]),
        createdAt: new Date(),
      },
      include: {
        agent: {
          include: {
            deployments: {
              where: { moduleEnabled: true },
            },
          },
        },
      },
    });

    console.log('\n✅ Created Signal:', signal.id);
    console.log('   Token: WETH');
    console.log('   Size: 1.5 USDC (fixed)');

    // 5. Execute the trade
    console.log('\n🚀 Executing Trade via V2 Module...\n');
    const executor = new TradeExecutor();
    
    const result = await executor.executeSignalForDeployment(
      signal.id,
      deployment.id
    );

    console.log('\n═'.repeat(60));
    if (result.success) {
      console.log('\n✅ TRADE SUCCESSFUL!');
      console.log('   Position ID:', result.positionId);
      console.log('   TX Hash:', result.txHash);
      console.log('   Entry Price:', result.entryPrice);
      console.log('   Quantity:', result.qty);
      
      // Fetch the position details
      const position = await prisma.position.findUnique({
        where: { id: result.positionId },
      });
      
      if (position) {
        console.log('\n📊 Position Details:');
        console.log('   Token:', position.tokenSymbol);
        console.log('   Entry Value:', position.entryValueUSDC, 'USDC');
        console.log('   Status:', position.status);
      }
    } else {
      console.log('\n❌ TRADE FAILED');
      console.log('   Error:', result.error);
    }
    console.log('\n═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testWETHTrade();


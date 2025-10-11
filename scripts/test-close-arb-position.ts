import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();

async function testCloseARBPosition() {
  try {
    console.log('🔍 Finding latest ARB position...\n');

    // Find the latest open ARB position
    const position = await prisma.position.findFirst({
      where: {
        tokenSymbol: 'ARB',
        closedAt: null,
        deploymentId: '35c4f2d1-318c-420a-b3b0-abbd8bf847ff',
      },
      include: {
        deployment: true,
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    if (!position) {
      console.log('❌ No open ARB position found');
      return;
    }

    console.log('📊 Position Details:');
    console.log('   ID:', position.id);
    console.log('   Token:', position.tokenSymbol);
    console.log('   Side:', position.side);
    console.log('   Entry Price:', position.entryPrice);
    console.log('   Amount:', position.amount);
    console.log('   Entry USDC:', position.entryValueUsdc);
    console.log('   Safe:', position.deployment.safeWallet);
    console.log('   Module:', position.deployment.moduleAddress);
    console.log('   Opened:', position.openedAt);
    console.log('');

    console.log('⚡ Attempting to close position via TradeExecutor...\n');

    const executor = new TradeExecutor();
    const result = await executor.closePosition(position.id);

    if (result.success) {
      console.log('✅ Position closed successfully!');
      console.log('   TX Hash:', result.txHash);
      console.log('   Exit Price:', result.exitPrice);
      console.log('   PnL:', result.pnl);
    } else {
      console.log('❌ Failed to close position');
      console.log('   Error:', result.error);
      console.log('   Reason:', result.reason);
      
      if (result.error?.includes('EthersAdapter')) {
        console.log('\n🔧 DIAGNOSIS: EthersAdapter import issue - need to fix safe-wallet.ts');
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCloseARBPosition();


#!/usr/bin/env tsx
/**
 * Retry executing the last signal with fixed fee tier
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();

async function retryTrade() {
  console.log('🔄 Retrying Last Signal with Fixed Fee Tier\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('✅ Fix Applied:');
  console.log('   Changed from: 0.3% fee tier (37 WETH liquidity)');
  console.log('   Changed to: 1% fee tier (999 WETH liquidity)\n');

  // Get the last signal
  const signal = await prisma.signal.findFirst({
    where: {
      positions: { none: {} } // No position yet
    },
    orderBy: { createdAt: 'desc' },
    include: {
      agent: true,
    }
  });

  if (!signal) {
    console.log('❌ No unexecuted signal found');
    await prisma.$disconnect();
    return;
  }

  console.log('📊 Signal Found:');
  console.log(`   ID: ${signal.id.substring(0, 8)}...`);
  console.log(`   Agent: ${signal.agent.name}`);
  console.log(`   Token: ${signal.tokenSymbol}`);
  console.log(`   Side: ${signal.side}`);
  console.log('');

  console.log('🚀 Executing Trade...\n');

  const executor = new TradeExecutor();
  const result = await executor.executeSignal(signal.id);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (result.success) {
    console.log('🎉 TRADE EXECUTED SUCCESSFULLY!\n');
    console.log('   Transaction Hash:', result.txHash);
    console.log(`   View on Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}`);
    console.log('   Position ID:', result.positionId?.substring(0, 8) + '...');
    console.log('');
  } else {
    console.log('❌ TRADE FAILED\n');
    console.log('   Error:', result.error);
    if (result.reason) {
      console.log('   Reason:', result.reason);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

retryTrade().catch(console.error);

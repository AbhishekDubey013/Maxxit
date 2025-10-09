#!/usr/bin/env tsx
/**
 * Execute a real trade on Arbitrum via the Safe Module
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();
const executor = new TradeExecutor();

async function main() {
  const signalId = process.argv[2];
  
  if (!signalId) {
    console.log('❌ Usage: npx tsx scripts/execute-real-trade.ts <signal-id>');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🚀 EXECUTING REAL TRADE ON ARBITRUM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Fetch signal with deployment
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: {
        agent: {
          include: {
            deployments: {
              where: {
                moduleEnabled: true,
                status: 'ACTIVE',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!signal) {
      console.log('❌ Signal not found');
      return;
    }

    if (signal.agent.deployments.length === 0) {
      console.log('❌ No active deployment with module enabled');
      return;
    }

    const deployment = signal.agent.deployments[0];

    console.log('📊 Signal Details:');
    console.log('   Token:', signal.tokenSymbol);
    console.log('   Side:', signal.side);
    console.log('   Venue:', signal.venue);
    console.log('   Size Model:', signal.sizeModel);
    console.log('');

    console.log('💰 Deployment:');
    console.log('   Safe:', deployment.safeWallet);
    console.log('   Module Enabled:', deployment.moduleEnabled);
    console.log('');

    console.log('⚡ Executing trade...\n');

    // Execute the trade
    const result = await executor.executeSignal(signalId);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ TRADE EXECUTED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.txHash) {
      console.log('🔗 Transaction Hash:', result.txHash);
      console.log('🌐 View on Arbiscan:');
      console.log(`   https://arbiscan.io/tx/${result.txHash}`);
      console.log('');
    }

    if (result.positionId) {
      console.log('📊 Position ID:', result.positionId);
      console.log('');
    }

    console.log('✨ Done!\n');

  } catch (error: any) {
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('  ❌ TRADE EXECUTION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
    if (error.code) console.error('Code:', error.code);
    console.error('');
  } finally {
    await prisma.$disconnect();
  }
}

main();


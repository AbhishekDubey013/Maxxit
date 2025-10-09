#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();

async function main() {
  const signalId = '4fb19953-338d-40b2-a4ef-4fed0c952028';
  
  console.log('🔍 DEBUG: Starting trade execution...\n');
  
  // Check signal exists
  const signal = await prisma.signal.findUnique({
    where: { id: signalId },
    include: {
      agent: {
        include: {
          deployments: {
            where: { status: 'ACTIVE', moduleEnabled: true },
          },
        },
      },
    },
  });

  if (!signal) {
    console.log('❌ Signal not found');
    return;
  }

  console.log('✅ Signal found:');
  console.log('   Token:', signal.tokenSymbol);
  console.log('   Side:', signal.side);
  console.log('   Venue:', signal.venue);
  console.log('');

  console.log('📊 Agent:', signal.agent.name);
  console.log('   Deployments:', signal.agent.deployments.length);
  if (signal.agent.deployments.length > 0) {
    const d = signal.agent.deployments[0];
    console.log('   Safe:', d.safeWallet);
    console.log('   Module Enabled:', d.moduleEnabled);
    console.log('   Profit Receiver:', signal.agent.profitReceiverAddress);
  }
  console.log('');

  console.log('🔧 Environment:');
  console.log('   MODULE_ADDRESS:', process.env.MODULE_ADDRESS);
  console.log('   TRADING_MODULE_ADDRESS:', process.env.TRADING_MODULE_ADDRESS);
  console.log('   EXECUTOR_PRIVATE_KEY:', process.env.EXECUTOR_PRIVATE_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('   ARBITRUM_RPC:', process.env.ARBITRUM_RPC);
  console.log('');

  console.log('⚡ Executing with TradeExecutor...\n');
  
  const executor = new TradeExecutor();
  const result = await executor.executeSignal(signalId);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📋 EXECUTION RESULT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(JSON.stringify(result, null, 2));
  console.log('');

  await prisma.$disconnect();
}

main();


import { Worker } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { RelayerService } from '../adapters/relayer.service';
import { GmxAdapter } from '../adapters/gmx.adapter';
import { HyperliquidAdapter } from '../adapters/hyperliquid.adapter';
import { SpotAdapter } from '../adapters/spot.adapter';

import { createTweetIngestWorker, setupTweetIngestCron } from './tweetIngest.processor';
import { createClassifyWorker } from './classify.processor';
import { createIndicatorsWorker, setupIndicatorsCron } from './indicators.processor';
import { createSignalCreateWorker } from './signalCreate.processor';
import { createExecuteTradeWorker } from './executeTrade.processor';
import { createRiskExitWorker } from './riskExit.processor';
import { createMetricsWorker } from './metrics.processor';
import { createBillingWorker, setupBillingCron } from './billing.processor';

let workers: Worker[] = [];

export async function startWorkers() {
  console.log('🚀 Starting BullMQ workers...');
  
  const { config } = await import('../config/config');
  
  if (config.REDIS_URL === 'redis://localhost:6379') {
    console.log('⚠️  Workers disabled - Redis not configured (using default localhost)');
    console.log('💡 To enable workers, configure REDIS_URL in your secrets');
    return;
  }
  
  try {
    const prisma = new PrismaService();
    await prisma.$connect();
    
    const relayerService = new RelayerService();
    const gmxAdapter = new GmxAdapter();
    const hyperliquidAdapter = new HyperliquidAdapter();
    const spotAdapter = new SpotAdapter();
    
    const tweetIngestWorker = createTweetIngestWorker(prisma);
    const classifyWorker = createClassifyWorker(prisma);
    const indicatorsWorker = createIndicatorsWorker(prisma);
    const signalCreateWorker = createSignalCreateWorker(prisma);
    const executeTradeWorker = createExecuteTradeWorker(
      prisma,
      relayerService,
      gmxAdapter,
      hyperliquidAdapter,
      spotAdapter
    );
    const riskExitWorker = createRiskExitWorker(prisma);
    const metricsWorker = createMetricsWorker(prisma);
    const billingWorker = createBillingWorker(prisma);
    
    workers = [
      tweetIngestWorker,
      classifyWorker,
      indicatorsWorker,
      signalCreateWorker,
      executeTradeWorker,
      riskExitWorker,
      metricsWorker,
      billingWorker,
    ];
    
    workers.forEach((worker) => {
      worker.on('completed', (job) => {
        console.log(`✅ Job ${job.id} in ${job.queueName} completed`);
      });
      
      worker.on('failed', (job, err) => {
        console.error(`❌ Job ${job?.id} in ${job?.queueName} failed:`, err.message);
      });
      
      worker.on('error', (err) => {
        console.error(`🔥 Worker error:`, err);
      });
    });
    
    console.log('⏰ Setting up CRON jobs...');
    try {
      await setupTweetIngestCron(prisma);
      await setupIndicatorsCron();
      await setupBillingCron(prisma);
      console.log('✅ CRON jobs configured');
    } catch (cronError: any) {
      console.warn('⚠️  CRON setup failed (database tables may not exist yet):', cronError.message);
    }
    
    console.log('✅ All workers started successfully');
    console.log('📋 Active workers:', workers.map(w => w.name).join(', '));
    
    setupGracefulShutdown();
  } catch (error: any) {
    console.error('❌ Failed to start workers:', error.message);
    console.log('⚠️  Workers disabled. API and frontend will continue to run.');
    console.log('💡 To enable workers:');
    console.log('   1. Configure REDIS_URL in your secrets');
    console.log('   2. Push database schema: npx prisma db push');
  }
}

function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down workers gracefully...`);
    
    try {
      await Promise.all(workers.map(worker => worker.close()));
      console.log('✅ All workers closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export {
  createTweetIngestWorker,
  createClassifyWorker,
  createIndicatorsWorker,
  createSignalCreateWorker,
  createExecuteTradeWorker,
  createRiskExitWorker,
  createMetricsWorker,
  createBillingWorker,
};

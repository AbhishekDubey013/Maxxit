/**
 * Trade Execution Worker (Microservice)
 * Runs automatically to execute pending signals
 * Interval: 30 seconds (configurable via WORKER_INTERVAL)
 */

import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './lib/prisma-client';
import { setupGracefulShutdown, registerCleanup } from './lib/graceful-shutdown';
import { checkDatabaseHealth } from './lib/prisma-client';

dotenv.config();

const PORT = process.env.PORT || 5001;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '30000'); // 30 seconds default

let workerInterval: NodeJS.Timeout | null = null;

// Health check server
const app = express();
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    service: 'trade-executor-worker',
    interval: INTERVAL,
    database: dbHealthy ? 'connected' : 'disconnected',
    isRunning: workerInterval !== null,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🏥 Trade Executor Worker health check on port ${PORT}`);
});

/**
 * Execute all pending signals
 * Finds signals without positions and tries to execute them
 */
async function executeAllPendingSignals() {
  console.log('[TradeExecutor] ⏰ Running trade execution cycle...');
  
  try {
    // Fetch pending signals (signals without positions, not skipped)
    const pendingSignals = await prisma.signals.findMany({
      where: {
        positions: {
          none: {}, // No positions created yet
        },
        skipped_reason: null, // Not skipped
        agents: {
          status: 'PUBLIC', // Only execute for public agents
          agent_deployments: {
            some: {
              status: 'ACTIVE'
            },
          },
        },
      },
      include: {
        agents: {
          include: {
            agent_deployments: {
              where: { 
                status: 'ACTIVE'
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
      take: 20, // Process 20 signals per run
    });

    console.log(`[TradeExecutor] 📊 Found ${pendingSignals.length} pending signals`);

    if (pendingSignals.length === 0) {
      console.log('[TradeExecutor] ✅ No pending signals to process');
      return;
    }

    // Process each signal
    for (const signal of pendingSignals) {
      try {
        const deployment = (signal as any).agents?.agent_deployments?.[0];
        
        if (!deployment) {
          console.log(`[TradeExecutor] ⚠️  Signal ${signal.id}: No deployment found`);
          continue;
        }

        console.log(`[TradeExecutor] 🔄 Processing signal ${signal.id.substring(0, 8)}...`);
        console.log(`[TradeExecutor]    Agent: ${(signal as any).agents?.name}`);
        console.log(`[TradeExecutor]    Token: ${signal.token_symbol}`);
        console.log(`[TradeExecutor]    Side: ${signal.side}`);
        console.log(`[TradeExecutor]    Venue: ${signal.venue}`);
        console.log(`[TradeExecutor]    Deployment: ${deployment.id.substring(0, 8)}...`);

        // Execute the signal
        await executeSignal(signal.id, deployment.id);
        
        // Small delay between executions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`[TradeExecutor] ❌ Error processing signal ${signal.id}:`, error.message);
      }
    }

    console.log('[TradeExecutor] ✅ Trade execution cycle complete');
  } catch (error: any) {
    console.error('[TradeExecutor] ❌ Fatal error in execution cycle:', error);
  }
}

/**
 * Execute a single signal by calling external venue services
 */
async function executeSignal(signalId: string, deploymentId: string) {
  try {
    // Get signal and deployment
    const signal = await prisma.signals.findUnique({
      where: { id: signalId },
      include: {
        agents: true,
      },
    });

    const deployment = await prisma.agent_deployments.findUnique({
      where: { id: deploymentId },
    });

    if (!signal || !deployment) {
      console.log(`[TradeExecutor] ⚠️  Signal or deployment not found`);
      return;
    }

    // Execute trade via external service
    const { executeTrade } = await import('./lib/trade-executor');
    const result = await executeTrade(signal, deployment);

    if (result.success) {
      // Create position record
      const sizeModel = typeof signal.size_model === 'string' 
        ? JSON.parse(signal.size_model) 
        : signal.size_model;
      
      const riskModel = typeof signal.risk_model === 'string'
        ? JSON.parse(signal.risk_model)
        : signal.risk_model;

      await prisma.positions.create({
        data: {
          deployment_id: deploymentId,
          signal_id: signalId,
          venue: signal.venue,
          token_symbol: signal.token_symbol,
          side: signal.side,
          qty: 0, // Will be updated from actual execution
          entry_price: 0, // Will be updated from actual execution
          stop_loss: riskModel.stop_loss_percent ? 0 : undefined,
          take_profit: riskModel.take_profit_percent ? 0 : undefined,
          entry_tx_hash: result.txHash,
          status: 'OPEN',
        },
      });

      console.log(`[TradeExecutor] ✅ Trade executed successfully`);
      console.log(`[TradeExecutor]    TX Hash: ${result.txHash || 'N/A'}`);
    } else {
      // Mark signal as skipped
      await prisma.signals.update({
        where: { id: signalId },
        data: {
          skipped_reason: result.error || result.reason || 'Execution failed',
        },
      });

      console.log(`[TradeExecutor] ❌ Trade failed: ${result.error || result.reason}`);
    }
  } catch (error: any) {
    console.error(`[TradeExecutor] ❌ Error executing signal:`, error.message);
    
    // Mark signal as skipped on error
    try {
      await prisma.signals.update({
        where: { id: signalId },
        data: {
          skipped_reason: `Execution error: ${error.message}`,
        },
      });
    } catch (updateError) {
      console.error(`[TradeExecutor] ❌ Failed to update signal:`, updateError);
    }
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Trade Executor Worker starting...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000}s)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await executeAllPendingSignals();
  
  // Then run on interval
  workerInterval = setInterval(async () => {
    await executeAllPendingSignals();
  }, INTERVAL);
}

// Register cleanup to stop worker interval
registerCleanup(async () => {
  console.log('🛑 Stopping Trade Executor Worker interval...');
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
});

// Setup graceful shutdown
setupGracefulShutdown('Trade Executor Worker', server);

// Start worker
if (require.main === module) {
  runWorker().catch(error => {
    console.error('[TradeExecutor] ❌ Worker failed to start:', error);
    process.exit(1);
  });
}

export { executeAllPendingSignals, executeSignal };

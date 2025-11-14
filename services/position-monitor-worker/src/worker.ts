/**
 * Position Monitor Worker (Microservice)
 * Monitors open positions and closes them when TP/SL is hit
 * Interval: 60 seconds (configurable via WORKER_INTERVAL)
 */

import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './lib/prisma-client';
import { setupGracefulShutdown, registerCleanup } from './lib/graceful-shutdown';
import { checkDatabaseHealth } from './lib/error-handler';

dotenv.config();

const PORT = process.env.PORT || 5002;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '60000'); // 60 seconds default

let workerInterval: NodeJS.Timeout | null = null;

// Health check server
const app = express();
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    service: 'position-monitor-worker',
    interval: INTERVAL,
    database: dbHealthy ? 'connected' : 'disconnected',
    isRunning: workerInterval !== null,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🏥 Position Monitor Worker health check on port ${PORT}`);
});

/**
 * Monitor open positions
 * Checks for TP/SL conditions and closes positions when met
 */
async function monitorOpenPositions() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║            📊 POSITION MONITOR (COMBINED)                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  
  try {
    // Find all open positions
    const openPositions = await prisma.positions.findMany({
      where: {
        closed_at: null,
        status: 'OPEN',
      },
      include: {
        signals: {
          include: {
            agents: true,
          },
        },
        agent_deployments: true,
      },
      orderBy: {
        opened_at: 'asc',
      },
    });

    console.log(`[PositionMonitor] 📊 Found ${openPositions.length} open positions`);

    if (openPositions.length === 0) {
      console.log('[PositionMonitor] ✅ No open positions to monitor\n');
      return { success: true, positionsMonitored: 0 };
    }

    let hyperliquidCount = 0;
    let ostiumCount = 0;
    let otherCount = 0;

    // Group by venue
    for (const position of openPositions) {
      if (position.venue === 'HYPERLIQUID') {
        hyperliquidCount++;
      } else if (position.venue === 'OSTIUM') {
        ostiumCount++;
      } else {
        otherCount++;
      }
    }

    console.log(`[PositionMonitor] 📊 Position breakdown:`);
    console.log(`[PositionMonitor]    🔵 Hyperliquid: ${hyperliquidCount}`);
    console.log(`[PositionMonitor]    🟢 Ostium: ${ostiumCount}`);
    console.log(`[PositionMonitor]    ⚪ Other: ${otherCount}\n`);

    // Monitor each venue sequentially
    if (hyperliquidCount > 0) {
      console.log('🔵 [1/2] Monitoring Hyperliquid positions...\n');
      await monitorHyperliquidPositions();
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
    }

    if (ostiumCount > 0) {
      console.log('🟢 [2/2] Monitoring Ostium positions...\n');
      await monitorOstiumPositions();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[PositionMonitor] ⏱️  Monitoring cycle completed in ${duration}s\n`);

    return {
      success: true,
      positionsMonitored: openPositions.length,
      hyperliquidCount,
      ostiumCount,
      otherCount,
    };
  } catch (error: any) {
    console.error('[PositionMonitor] ❌ Error:', error.message);
    return {
      success: false,
      positionsMonitored: 0,
      error: error.message,
    };
  }
}

/**
 * Monitor Hyperliquid positions
 */
async function monitorHyperliquidPositions() {
  try {
    const positions = await prisma.positions.findMany({
      where: {
        venue: 'HYPERLIQUID',
        closed_at: null,
        status: 'OPEN',
      },
    });

    console.log(`[Hyperliquid] 📊 Monitoring ${positions.length} positions`);

    // TODO: Implement actual position monitoring logic
    // - Fetch current prices from Hyperliquid service
    // - Check if TP or SL is hit
    // - Close positions if conditions are met
    // - Call: ${process.env.HYPERLIQUID_SERVICE_URL}/close-position

    console.log(`[Hyperliquid] ✅ Monitoring complete (logic pending)\n`);
  } catch (error: any) {
    console.error(`[Hyperliquid] ❌ Error:`, error.message);
  }
}

/**
 * Monitor Ostium positions
 */
async function monitorOstiumPositions() {
  try {
    const positions = await prisma.positions.findMany({
      where: {
        venue: 'OSTIUM',
        closed_at: null,
        status: 'OPEN',
      },
    });

    console.log(`[Ostium] 📊 Monitoring ${positions.length} positions`);

    // TODO: Implement actual position monitoring logic
    // - Fetch current prices from Ostium service
    // - Check if TP or SL is hit
    // - Close positions if conditions are met
    // - Call: ${process.env.OSTIUM_SERVICE_URL}/close-position

    console.log(`[Ostium] ✅ Monitoring complete (logic pending)\n`);
  } catch (error: any) {
    console.error(`[Ostium] ❌ Error:`, error.message);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Position Monitor Worker starting...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000}s)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await monitorOpenPositions();
  
  // Then run on interval
  workerInterval = setInterval(async () => {
    await monitorOpenPositions();
  }, INTERVAL);
}

// Register cleanup to stop worker interval
registerCleanup(async () => {
  console.log('🛑 Stopping Position Monitor Worker interval...');
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
});

// Setup graceful shutdown
setupGracefulShutdown('Position Monitor Worker', server);

// Start worker
if (require.main === module) {
  runWorker().catch(error => {
    console.error('[PositionMonitor] ❌ Worker failed to start:', error);
    process.exit(1);
  });
}

export { monitorOpenPositions };

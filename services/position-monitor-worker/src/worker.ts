/**
 * Position Monitor Worker (Microservice)
 * Monitors open positions and closes them when TP/SL is hit
 * Interval: 60 seconds (configurable via WORKER_INTERVAL)
 */

import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './lib/prisma-client';
import { setupGracefulShutdown, registerCleanup } from './lib/graceful-shutdown';
import { checkDatabaseHealth } from './lib/prisma-client';

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
 * Runs the standalone Hyperliquid monitor script
 */
async function monitorHyperliquidPositions() {
  try {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const fs = await import('fs');
    
    console.log(`[Hyperliquid] 🔵 Starting full monitoring with price tracking...\n`);
    
    // Find project root by looking for package.json
    let projectRoot = process.cwd();
    while (!fs.existsSync(path.join(projectRoot, 'workers'))) {
      const parent = path.dirname(projectRoot);
      if (parent === projectRoot) {
        console.error('[Hyperliquid] ❌ Cannot find project root with workers/ directory');
        return;
      }
      projectRoot = parent;
    }
    
    const workerPath = path.join(projectRoot, 'workers/position-monitor-hyperliquid.ts');
    console.log(`[Hyperliquid] 📂 Worker path: ${workerPath}`);
    
    return new Promise((resolve) => {
      const worker = spawn('npx', ['tsx', workerPath], {
        cwd: projectRoot,
        stdio: 'inherit', // Forward output to parent process
        env: process.env,
      });

      worker.on('close', (code) => {
        if (code === 0) {
          console.log(`[Hyperliquid] ✅ Monitoring complete (exit code: ${code})\n`);
          resolve(undefined);
        } else {
          console.error(`[Hyperliquid] ❌ Monitoring failed (exit code: ${code})\n`);
          resolve(undefined);
        }
      });

      worker.on('error', (error) => {
        console.error(`[Hyperliquid] ❌ Error spawning worker:`, error.message);
        resolve(undefined);
      });
    });
  } catch (error: any) {
    console.error(`[Hyperliquid] ❌ Error:`, error.message);
    console.error(error.stack);
  }
}

/**
 * Monitor Ostium positions
 * Runs the standalone Ostium monitor script
 */
async function monitorOstiumPositions() {
  try {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const fs = await import('fs');
    
    console.log(`[Ostium] 🟢 Starting full monitoring with price tracking...\n`);
    
    // Find project root by looking for package.json
    let projectRoot = process.cwd();
    while (!fs.existsSync(path.join(projectRoot, 'workers'))) {
      const parent = path.dirname(projectRoot);
      if (parent === projectRoot) {
        console.error('[Ostium] ❌ Cannot find project root with workers/ directory');
        return;
      }
      projectRoot = parent;
    }
    
    const workerPath = path.join(projectRoot, 'workers/position-monitor-ostium.ts');
    console.log(`[Ostium] 📂 Worker path: ${workerPath}`);
    
    return new Promise((resolve) => {
      const worker = spawn('npx', ['tsx', workerPath], {
        cwd: projectRoot,
        stdio: 'inherit', // Forward output to parent process
        env: {
          ...process.env,
          OSTIUM_SERVICE_URL: process.env.OSTIUM_SERVICE_URL || 'https://maxxit-1.onrender.com',
        },
      });

      worker.on('close', (code) => {
        if (code === 0) {
          console.log(`[Ostium] ✅ Monitoring complete (exit code: ${code})\n`);
          resolve(undefined);
        } else {
          console.error(`[Ostium] ❌ Monitoring failed (exit code: ${code})\n`);
          resolve(undefined);
        }
      });

      worker.on('error', (error) => {
        console.error(`[Ostium] ❌ Error spawning worker:`, error.message);
        resolve(undefined);
      });
    });
  } catch (error: any) {
    console.error(`[Ostium] ❌ Error:`, error.message);
    console.error(error.stack);
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

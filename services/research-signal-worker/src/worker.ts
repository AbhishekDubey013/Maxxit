/**
 * Research Signal Worker (Placeholder - Schema Updates Needed)
 * 
 * TODO: This worker needs schema updates to properly handle research institute signals.
 * Currently running in placeholder mode to allow deployment.
 */

import dotenv from 'dotenv';
import express from 'express';
import { prisma } from './lib/prisma-client';
import { setupGracefulShutdown, registerCleanup } from './lib/graceful-shutdown';
import { checkDatabaseHealth } from './lib/prisma-client';

dotenv.config();

const PORT = process.env.PORT || 5007;
const INTERVAL = parseInt(process.env.WORKER_INTERVAL || '300000'); // 5 minutes default

let workerInterval: NodeJS.Timeout | null = null;

// Health check server
const app = express();
app.get('/health', async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'ok' : 'degraded',
    service: 'research-signal-worker',
    mode: 'placeholder',
    note: 'Schema updates needed for full functionality',
    interval: INTERVAL,
    database: dbHealthy ? 'connected' : 'disconnected',
    isRunning: workerInterval !== null,
    timestamp: new Date().toISOString(),
  });
});

const server = app.listen(PORT, () => {
  console.log(`🏥 Research Signal Worker health check server listening on port ${PORT}`);
});

/**
 * Generate research signals
 * Placeholder implementation - full functionality pending schema updates
 */
async function generateResearchSignals() {
  try {
    console.log('[ResearchSignal] 🔍 Research Signal Worker Running');
    console.log('[ResearchSignal] ⚠️  Schema updates needed - placeholder mode');
    console.log('[ResearchSignal] ℹ️  Worker will be fully implemented after schema alignment');
    
    // TODO: Implement proper research signal generation after schema alignment
    // Issues to resolve:
    // 1. agent_research_institutes.research_institute_id vs institute_id
    // 2. research_signals missing token_symbol, sentiment, confidence fields
    // 3. signals table missing rate field
    
    return;
  } catch (error: any) {
    console.error('[ResearchSignal] ❌ Error:', error.message);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  console.log('🚀 Research Signal Worker starting (Placeholder Mode)...');
  console.log(`⏱️  Interval: ${INTERVAL}ms (${INTERVAL / 1000 / 60} minutes)`);
  console.log('⚠️  Note: Schema updates needed for full functionality');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Run immediately on startup
  await generateResearchSignals();
  
  // Then run on interval
  workerInterval = setInterval(async () => {
    await generateResearchSignals();
  }, INTERVAL);
}

// Register cleanup to stop worker interval
registerCleanup(async () => {
  console.log('🛑 Stopping Research Signal Worker interval...');
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
});

// Setup graceful shutdown
setupGracefulShutdown('Research Signal Worker', server);

// Start worker
if (require.main === module) {
  // Check critical environment variables
  if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL environment variable is not set!');
    console.error('   Please set DATABASE_URL in your deployment environment.');
    process.exit(1);
  }

  console.log('✅ Environment check passed');
  console.log('   DATABASE_URL: [SET]');
  console.log('   PORT:', PORT);
  console.log('   NODE_ENV:', process.env.NODE_ENV || 'development');

  // Test database connection before starting
  checkDatabaseHealth()
    .then(healthy => {
      if (!healthy) {
        console.error('❌ FATAL: Cannot connect to database!');
        console.error('   Check DATABASE_URL and database availability.');
        process.exit(1);
      }
      console.log('✅ Database connection verified');
      
      // Start worker
      return runWorker();
    })
    .catch(error => {
      console.error('[ResearchSignal] ❌ Worker failed to start:', error);
      console.error('   Error details:', error.stack);
      process.exit(1);
    });
}

export { generateResearchSignals };

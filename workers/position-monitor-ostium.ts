/**
 * Ostium Position Monitor
 * - Discovers positions directly from Ostium (via subgraph)
 * - Auto-creates DB records for discovered positions
 * - Monitors ALL Ostium positions across all deployments
 * - Real-time price tracking and trailing stops
 * - Similar to Hyperliquid monitor but for Arbitrum-based Ostium
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';
import { getOstiumPositions, getOstiumBalance } from '../lib/adapters/ostium-adapter';
import { updateMetricsForDeployment } from '../lib/metrics-updater';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const executor = new TradeExecutor();

// Lock file to prevent concurrent monitor instances
const LOCK_FILE = path.join(__dirname, '../.position-monitor-ostium.lock');
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Acquire a file-based lock to prevent concurrent monitor instances
 */
async function acquireLock(): Promise<boolean> {
  try {
    // Check if lock file exists
    if (fs.existsSync(LOCK_FILE)) {
      const stats = fs.statSync(LOCK_FILE);
      const lockAge = Date.now() - stats.mtimeMs;
      
      // If lock is older than timeout, assume it's stale and remove it
      if (lockAge > LOCK_TIMEOUT_MS) {
        console.log('⚠️  Found stale lock file, removing...');
        fs.unlinkSync(LOCK_FILE);
      } else {
        console.log('⚠️  Another monitor instance is running (lock age: ' + Math.round(lockAge / 1000) + 's)');
        return false;
      }
    }
    
    // Create lock file with current timestamp and PID
    fs.writeFileSync(LOCK_FILE, JSON.stringify({
      pid: process.pid,
      startedAt: new Date().toISOString(),
    }));
    
    return true;
  } catch (error: any) {
    console.error('Failed to acquire lock:', error.message);
    return false;
  }
}

/**
 * Release the lock file
 */
function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (error: any) {
    console.error('Failed to release lock:', error.message);
  }
}

export async function monitorOstiumPositions() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║        📊 OSTIUM POSITION MONITOR - SMART DISCOVERY          ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Acquire lock to prevent concurrent runs
  const hasLock = await acquireLock();
  if (!hasLock) {
    console.log('❌ Could not acquire lock. Exiting to prevent race conditions.\n');
    return {
      success: false,
      error: 'Another monitor instance is already running',
    };
  }

  try {
    // Get ALL active deployments for Ostium venue
    const deployments = await prisma.agent_deployments.findMany({
      where: {
        status: 'ACTIVE',
        agents: {
          venue: 'OSTIUM',
        },
      },
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            venue: true,
          },
        },
      },
    });

    console.log(`🔍 Found ${deployments.length} active Ostium deployments\n`);

    if (deployments.length === 0) {
      console.log('✅ No Ostium deployments to monitor\n');
      releaseLock();
      return { success: true, positionsMonitored: 0 };
    }

    let totalPositionsMonitored = 0;
    let totalPositionsClosed = 0;

    // Monitor each deployment
    for (const deployment of deployments) {
      try {
        console.log(`\n📍 Deployment: ${deployment.agents.name} (${deployment.id.slice(0, 8)}...)`);
        console.log(`   User Wallet: ${deployment.safe_wallet}`);
        
        // Get positions from Ostium for this user
        const ostiumPositions = await getOstiumPositions(deployment.safe_wallet);
        
        console.log(`   Positions Found: ${ostiumPositions.length}`);

        // Discover and track new positions
        for (const ostPosition of ostiumPositions) {
          try {
            // Check if position exists in DB by matching entry_tx_hash (tradeId)
            // This prevents duplicates across multiple deployments for the same wallet
            const existingPosition = await prisma.positions.findFirst({
              where: {
                entry_tx_hash: ostPosition.tradeId,
                venue: 'OSTIUM',
              },
            });

            // If position exists but is closed, reopen it
            if (existingPosition && existingPosition.closed_at) {
              console.log(`   🔄 Reopening position: ${ostPosition.side.toUpperCase()} ${ostPosition.market} (was incorrectly closed)`);
              await prisma.positions.update({
                where: { id: existingPosition.id },
                data: {
                  closed_at: null,
                  exit_price: null,
                  exit_tx_hash: null,
                  exit_reason: null,
                  pnl: null,
                  status: 'OPEN',
                  // Update current values
                  entry_price: ostPosition.entryPrice,
                  qty: ostPosition.size,
                },
              });
              continue;
            }

            if (!existingPosition) {
              // Auto-discover position - create in DB
              console.log(`   ✨ Discovered new position: ${ostPosition.side.toUpperCase()} ${ostPosition.market} (Trade ID: ${ostPosition.tradeId})`);
              
              try {
                // Create a "discovered" signal for this position
                // Wrapped in try-catch to handle race condition with other workers
                const discoveredSignal = await prisma.signals.create({
                  data: {
                    agent_id: deployment.agent_id,
                    venue: 'OSTIUM',
                    token_symbol: ostPosition.market,
                    side: ostPosition.side.toUpperCase(),
                    size_model: {
                      type: 'fixed-usdc',
                      value: ostPosition.size,
                      leverage: ostPosition.leverage,
                    },
                    risk_model: {
                      type: 'trailing-stop',
                      trailingPercent: 1,
                    },
                    source_tweets: ['DISCOVERED_FROM_OSTIUM'],
                  },
                });

                // Create position record
                await prisma.positions.create({
                  data: {
                    deployment_id: deployment.id,
                    signal_id: discoveredSignal.id,
                    venue: 'OSTIUM',
                    token_symbol: ostPosition.market,
                    side: ostPosition.side.toUpperCase(),
                    entry_price: ostPosition.entryPrice,
                    qty: ostPosition.size,
                    entry_tx_hash: ostPosition.tradeId || 'OST-DISCOVERED-' + Date.now(),
                    trailing_params: {
                      enabled: true,
                      trailingPercent: 1, // 1% trailing stop
                      highestPrice: null,
                    },
                  },
                });

                console.log(`   ✅ Position added to database`);
              } catch (createError: any) {
                // P2002: Unique constraint violation (another worker discovered this position first)
                if (createError.code === 'P2002') {
                  console.log(`   ℹ️  Position already discovered by another worker (race condition handled)`);
                } else {
                  // Re-throw unexpected errors
                  throw createError;
                }
              }
            }
          } catch (discoverError: any) {
            console.error(`   ❌ Error processing position ${ostPosition.market}:`, discoverError.message);
          }
        }

        // Get open positions from DB for this deployment
        const dbPositions = await prisma.positions.findMany({
          where: {
            deployment_id: deployment.id,
            venue: 'OSTIUM',
            closed_at: null,
          },
        });

        console.log(`   Positions Monitored: ${dbPositions.length}`);
        totalPositionsMonitored += dbPositions.length;

        // Monitor each position
        for (const position of dbPositions) {
          try {
            // Find matching position on Ostium by tradeId (more precise than market+side)
            const ostPosition = ostiumPositions.find(
              p => p.tradeId === position.entry_tx_hash || 
                   (p.market === position.token_symbol && p.side.toUpperCase() === position.side)
            );

            // Position closed externally?
            if (!ostPosition) {
              console.log(`   ⚠️  Position ${position.token_symbol} ${position.side} (TX: ${position.entry_tx_hash}) no longer on Ostium - marking as closed`);
              
              await prisma.positions.update({
                where: { id: position.id },
                data: {
                  closed_at: new Date(),
                  exit_price: null, // Unknown exit price
                  pnl: 0, // Unknown PnL (TODO: calculate from fills)
                },
              });

              totalPositionsClosed++;
              
              // Update metrics
              updateMetricsForDeployment(deployment.id).catch(err => {
                console.error('Failed to update metrics:', err.message);
              });
              
              continue;
            }

            // Update current price and check trailing stop
            const currentPrice = ostPosition.entryPrice; // Ostium provides mark price
            const trailingParams = position.trailing_params as any;

            if (trailingParams?.enabled) {
              // Initialize highest price on first check
              if (!trailingParams.highestPrice) {
                trailingParams.highestPrice = currentPrice;
                await prisma.positions.update({
                  where: { id: position.id },
                  data: { trailing_params: trailingParams },
                });
              }

              // Update highest price if new high
              const isLong = position.side === 'LONG' || position.side === 'BUY';
              if (isLong && currentPrice > trailingParams.highestPrice) {
                trailingParams.highestPrice = currentPrice;
                await prisma.positions.update({
                  where: { id: position.id },
                  data: { trailing_params: trailingParams },
                });
                console.log(`   📈 New high for ${position.token_symbol}: $${currentPrice.toFixed(2)}`);
              } else if (!isLong && currentPrice < trailingParams.highestPrice) {
                trailingParams.highestPrice = currentPrice;
                await prisma.positions.update({
                  where: { id: position.id },
                  data: { trailing_params: trailingParams },
                });
                console.log(`   📉 New low for ${position.token_symbol}: $${currentPrice.toFixed(2)}`);
              }

              // Check if trailing stop triggered
              const trailingPercent = trailingParams.trailingPercent || 1;
              const stopPrice = isLong
                ? trailingParams.highestPrice * (1 - trailingPercent / 100)
                : trailingParams.highestPrice * (1 + trailingPercent / 100);

              const shouldClose = isLong ? currentPrice <= stopPrice : currentPrice >= stopPrice;

              if (shouldClose) {
                console.log(`   🚨 Trailing stop triggered for ${position.token_symbol}`);
                console.log(`      Current: $${currentPrice.toFixed(2)} | Stop: $${stopPrice.toFixed(2)}`);
                
                // Close position
                const closeResult = await executor.closePosition(position.id);
                
                if (closeResult.success) {
                  console.log(`   ✅ Position closed successfully`);
                  totalPositionsClosed++;
                } else {
                  console.error(`   ❌ Failed to close position: ${closeResult.error}`);
                }
              }
            }

            // Update current price in DB
            await prisma.positions.update({
              where: { id: position.id },
              data: { current_price: currentPrice },
            });

          } catch (posError: any) {
            console.error(`   ❌ Error monitoring position ${position.id}:`, posError.message);
          }
        }

      } catch (deploymentError: any) {
        console.error(`❌ Error monitoring deployment ${deployment.id}:`, deploymentError.message);
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   MONITORING COMPLETE                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`Total Positions Monitored: ${totalPositionsMonitored}`);
    console.log(`Total Positions Closed:    ${totalPositionsClosed}\n`);

    releaseLock();

    return {
      success: true,
      positionsMonitored: totalPositionsMonitored,
      positionsClosed: totalPositionsClosed,
    };

  } catch (error: any) {
    console.error('❌ Monitor failed:', error);
    releaseLock();
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run monitor if executed directly
if (require.main === module) {
  console.log('Starting Ostium Position Monitor...\n');
  
  // Run immediately
  monitorOstiumPositions().then(result => {
    if (result.success) {
      console.log('✅ Monitor completed successfully');
    } else {
      console.error('❌ Monitor failed:', result.error);
      process.exit(1);
    }
  });

  // Then run every 30 seconds
  setInterval(() => {
    monitorOstiumPositions().catch(error => {
      console.error('Monitor error:', error);
    });
  }, 30000);
}

export default monitorOstiumPositions;


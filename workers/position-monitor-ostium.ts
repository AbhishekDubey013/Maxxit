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
import axios from 'axios';

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
    // Include: 1) OSTIUM agents, 2) MULTI agents (assume they have Ostium enabled)
    const deployments = await prisma.agent_deployments.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { agents: { venue: 'OSTIUM' } },
          { agents: { venue: 'MULTI' } }, // All MULTI agents (Ostium is a default venue)
        ],
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

    console.log(`🔍 Found ${deployments.length} active Ostium deployments (including MULTI agents)\n`);

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
                // Calculate percentage of balance for discovered position
                // This ensures consistency with percentage-based sizing (Agent HOW)
                const balance = await getOstiumBalance(deployment.safe_wallet);
                const usdcBalance = parseFloat(balance.usdcBalance);
                const positionSizePercent = usdcBalance > 0 
                  ? (ostPosition.size / usdcBalance) * 100 
                  : 5; // Default 5% if balance is 0 (shouldn't happen)
                
                console.log(`   📊 Position size: ${ostPosition.size} USDC = ${positionSizePercent.toFixed(2)}% of balance (${usdcBalance.toFixed(2)} USDC)`);
                
                // Create a "discovered" signal for this position
                // Use balance-percentage to match system design (Agent HOW)
                // Wrapped in try-catch to handle race condition with other workers
                const discoveredSignal = await prisma.signals.create({
                  data: {
                    agent_id: deployment.agent_id,
                    venue: 'OSTIUM',
                    token_symbol: ostPosition.market,
                    side: ostPosition.side.toUpperCase(),
                    size_model: {
                      type: 'balance-percentage', // ✅ Fixed: Use percentage-based sizing
                      value: positionSizePercent, // Calculated percentage
                      leverage: ostPosition.leverage,
                      reasoning: `Auto-discovered position: ${ostPosition.size} USDC = ${positionSizePercent.toFixed(2)}% of ${usdcBalance.toFixed(2)} USDC balance`,
                    },
                    risk_model: {
                      type: 'trailing-stop',
                      trailingPercent: 1,
                    },
                    source_tweets: [`DISCOVERED_FROM_OSTIUM_${ostPosition.tradeId}`],
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
                  console.log(`   ℹ️  Position/signal already exists in DB (another worker got here first)`);
                  console.log(`   ✅ This is normal - position will be monitored in next cycle`);
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
            status: 'OPEN', // Use status field for consistency
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
              // CRITICAL: Don't close positions that are pending (entry_price = 0 means pending)
              // Ostium uses keeper-based orders - they take 1-5 minutes to fill
              // Note: qty should ALWAYS be > 0 (collateral amount), so we only check entry_price
              const entryPrice = Number(position.entry_price?.toString() || 0);
              const qty = Number(position.qty?.toString() || 0);
              
              // Position is pending if entry_price is 0 (order not filled yet)
              // qty should be > 0 (collateral), but we check it as a safety measure
              const isPending = entryPrice === 0 && qty > 0;
              
              // Also check if position was created recently (within last 5 minutes)
              const positionAge = Date.now() - position.opened_at.getTime();
              const isRecent = positionAge < 5 * 60 * 1000; // 5 minutes
              
              if (isPending && isRecent) {
                console.log(`   ⏳ Position ${position.token_symbol} ${position.side} is pending (order submitted, waiting for keeper to fill)`);
                console.log(`      TX: ${position.entry_tx_hash}`);
                console.log(`      Age: ${Math.round(positionAge / 1000)}s (keeper typically fills within 1-5 minutes)`);
                console.log(`      ⏭️  Skipping close check - order is still pending`);
                continue; // Don't close - order is still pending
              }
              
              console.log(`   ⚠️  Position ${position.token_symbol} ${position.side} (TX: ${position.entry_tx_hash}) no longer on Ostium - marking as closed`);
              console.log(`      Age: ${Math.round(positionAge / 1000 / 60)} minutes`);
              
              await prisma.positions.update({
                where: { id: position.id },
                data: {
                  status: 'CLOSED',
                  closed_at: new Date(),
                  exit_price: null, // Unknown exit price
                  exit_reason: 'CLOSED_EXTERNALLY',
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

            // Get CURRENT market price from Ostium service ONLY
            let currentPrice: number;
            try {
              // Extract token symbol (e.g., "BTC" from "BTC/USD")
              const tokenSymbol = position.token_symbol.replace('/USD', '').replace('/USDT', '');
              
              // Get price from Ostium service (Ostium platform prices only)
              const ostiumServiceUrl = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';
              const priceResponse = await axios.get(`${ostiumServiceUrl}/price/${tokenSymbol}`, { timeout: 5000 });
              
              if (priceResponse.data.success && priceResponse.data.price) {
                currentPrice = parseFloat(priceResponse.data.price);
                console.log(`   💰 Current Price: $${currentPrice.toFixed(4)} | Entry: $${position.entry_price.toFixed(4)}`);
              } else {
                throw new Error(priceResponse.data.error || 'Price not available from Ostium');
              }
            } catch (priceError: any) {
              console.error(`   ⚠️  Could not fetch current price for ${position.token_symbol}: ${priceError.message}`);
              console.log(`   ⏭️  Skipping trailing stop check (using entry price as fallback)`);
              currentPrice = ostPosition.entryPrice; // Fallback to entry price
            }

            // Calculate unrealized P&L manually
            // Ostium SDK doesn't provide unrealizedPnl reliably, so we calculate it ourselves
            const collateral = Number(position.qty.toString()); // qty is collateral in USDC
            const leverage = ostPosition.leverage || 1;
            const entryPriceNum = Number(position.entry_price.toString());
            const isLong = position.side === 'LONG' || position.side === 'BUY';
            
            // Position size in token units = collateral * leverage / entry price
            const positionSizeInTokens = (collateral * leverage) / entryPriceNum;
            
            // P&L in USD = position size in tokens * (current price - entry price)
            // For LONG: profit when price goes up
            // For SHORT: profit when price goes down (but Ostium handles this internally with isBuy flag)
            let pnlUSD = 0;
            if (isLong) {
              pnlUSD = positionSizeInTokens * (currentPrice - entryPriceNum);
            } else {
              // For SHORT: profit when price goes down
              pnlUSD = positionSizeInTokens * (entryPriceNum - currentPrice);
            }
            
            // P&L percentage relative to collateral
            const pnlPercent = collateral > 0 ? (pnlUSD / collateral) * 100 : 0;
            
            console.log(`   📈 P&L: $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Collateral: $${collateral.toFixed(2)}, Leverage: ${leverage}x`);

            // Check trailing stop logic
            const trailingParams = position.trailing_params as any;
            let shouldClose = false;
            let closeReason = '';

            // HARD STOP LOSS: 10% (using calculated P&L percentage)
            const HARD_STOP_LOSS = 10;
            
            if (pnlPercent <= -HARD_STOP_LOSS) {
              shouldClose = true;
              closeReason = 'HARD_STOP_LOSS';
              console.log(`   🔴 HARD STOP LOSS HIT! P&L: ${pnlPercent.toFixed(2)}% (threshold: -${HARD_STOP_LOSS}%)`);
            }

            // TRAILING STOP LOGIC (using calculated P&L percentage)
            if (!shouldClose && trailingParams?.enabled) {
              const trailingPercent = trailingParams.trailingPercent || 1;
              const activationThreshold = 3; // Activate trailing stop after +3% P&L
              
              // Track highest P&L percentage (works for both LONG and SHORT)
              const highestPnlPercent = trailingParams.highestPnlPercent !== undefined 
                ? trailingParams.highestPnlPercent 
                : 0; // Start from 0 (entry)
              const newHighestPnl = Math.max(highestPnlPercent, pnlPercent);
              
              // Update highest P&L if new high
              if (newHighestPnl > highestPnlPercent) {
                await prisma.positions.update({
                  where: { id: position.id },
                  data: {
                    trailing_params: {
                      ...trailingParams,
                      highestPnlPercent: newHighestPnl,
                    }
                  }
                });
                console.log(`   📈 New P&L high: ${newHighestPnl.toFixed(2)}%`);
              }

              // Check if trailing stop should trigger
              if (newHighestPnl >= activationThreshold) {
                // Trailing stop triggers if P&L drops by trailingPercent from the high
                const trailingStopPnl = newHighestPnl - trailingPercent;
                if (pnlPercent <= trailingStopPnl) {
                  shouldClose = true;
                  closeReason = 'TRAILING_STOP';
                  console.log(`   🟢 Trailing stop triggered! High P&L: ${newHighestPnl.toFixed(2)}%, Current: ${pnlPercent.toFixed(2)}%, Stop: ${trailingStopPnl.toFixed(2)}%`);
                } else {
                  console.log(`   ✅ Trailing stop active (High P&L: ${newHighestPnl.toFixed(2)}%, Stop: ${trailingStopPnl.toFixed(2)}%, Current: ${pnlPercent.toFixed(2)}%)`);
                }
              } else {
                console.log(`   ⏳ Trailing stop inactive (need +${activationThreshold}% for activation, current: ${pnlPercent.toFixed(2)}%)`);
              }
            }

            // Execute close if triggered
            if (shouldClose) {
              console.log(`   🔴 Closing position (Reason: ${closeReason})`);
              
              const closeResult = await executor.closePosition(position.id);
              
              if (closeResult.success) {
                console.log(`   ✅ Position closed successfully`);
                totalPositionsClosed++;
              } else {
                console.error(`   ❌ Failed to close position: ${closeResult.error}`);
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


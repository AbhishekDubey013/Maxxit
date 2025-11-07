/**
 * Hyperliquid Position Monitor (Standalone)
 * - Discovers positions directly from Hyperliquid API
 * - Auto-creates DB records for discovered positions
 * - Monitors ALL Hyperliquid positions across all deployments
 * - Real-time price tracking and risk management
 */

import { PrismaClient } from '@prisma/client';
import { TradeExecutor } from '../lib/trade-executor';
import { getHyperliquidOpenPositions, getHyperliquidMarketPrice } from '../lib/hyperliquid-utils';
import { calculatePnL } from '../lib/price-oracle';

const prisma = new PrismaClient();
const executor = new TradeExecutor();

export async function monitorHyperliquidPositions() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     📊 HYPERLIQUID POSITION MONITOR - SMART DISCOVERY        ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Get ALL deployments (any agent can trade on Hyperliquid)
    // We'll discover positions directly from Hyperliquid API
    const deployments = await prisma.agent_deployments.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        agents: {
          select: {
            id: true,
            name: true,
            venue: true,
          }
        }
      }
    });

    console.log(`Found ${deployments.length} active deployment(s)\n`);
    console.log(`Checking each for Hyperliquid positions...\n`);

    let totalPositionsFound = 0;
    let totalPositionsMonitored = 0;
    let totalPositionsClosed = 0;

    // Step 2: For each deployment, fetch real positions from Hyperliquid
    for (const deployment of deployments) {
      const userAddress = deployment.safe_wallet;
      const agentName = deployment.agents.name;

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`  ${agentName} (${userAddress.substring(0, 8)}...)`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      try {
        // Fetch positions from Hyperliquid API
        const hlPositions = await getHyperliquidOpenPositions(userAddress);
        
        if (hlPositions.length === 0) {
          console.log('  No open positions on Hyperliquid\n');
          continue;
        }

        console.log(`  Found ${hlPositions.length} position(s) on Hyperliquid\n`);
        totalPositionsFound += hlPositions.length;

        // Step 3: For each Hyperliquid position, monitor it
        for (const hlPos of hlPositions) {
          const symbol = hlPos.coin;
          const side = parseFloat(hlPos.szi) > 0 ? 'LONG' : 'SHORT';
          const entryPrice = parseFloat(hlPos.entryPx);
          const size = Math.abs(parseFloat(hlPos.szi));
          const unrealizedPnl = parseFloat(hlPos.unrealizedPnl);

          console.log(`  📊 ${symbol} ${side}:`);
          console.log(`     Entry: $${entryPrice.toFixed(4)}, Size: ${size}, PnL: $${unrealizedPnl.toFixed(2)}`);

          // Step 4: Check if position exists in DB
          let dbPosition = await prisma.positions.findFirst({
            where: {
              deployment_id: deployment.id,
              token_symbol: symbol,
              closed_at: null,
            }
          });

          // Step 5: If not in DB, create it (auto-discovery)
          if (!dbPosition) {
            console.log(`     ⚠️  Not in DB - creating record...`);
            
            // Find or create a signal for this position
            let signal = await prisma.signals.findFirst({
              where: {
                agent_id: deployment.agents.id,
                token_symbol: symbol,
              },
              orderBy: {
                created_at: 'desc'
              }
            });

            if (!signal) {
              // Create a placeholder signal for discovered position
              signal = await prisma.signals.create({
                data: {
                  agent_id: deployment.agents.id,
                  token_symbol: symbol,
                  side: side,
                  venue: 'HYPERLIQUID',
                  size_model: { type: 'fixed', value: size },
                  risk_model: { stopLoss: null, takeProfit: null, trailingStop: 0.01 },
                  source_tweets: ['AUTO_DISCOVERED'],
                  proof_verified: true,
                  executor_agreement_verified: true,
                }
              });
            }

            try {
              dbPosition = await prisma.positions.create({
                data: {
                  deployment_id: deployment.id,
                  signal_id: signal.id,
                  venue: 'HYPERLIQUID',
                  token_symbol: symbol,
                  side: side,
                  qty: size,
                  entry_price: entryPrice,
                  source: 'auto-discovered',
                  trailing_params: {
                    enabled: true,
                    trailingPercent: 1,
                    highestPrice: side === 'LONG' ? entryPrice : undefined,
                    lowestPrice: side === 'SHORT' ? entryPrice : undefined,
                  }
                }
              });
              console.log(`     ✅ Created DB record: ${dbPosition.id.substring(0, 8)}...`);
            } catch (error: any) {
              if (error.code === 'P2002') {
                // Duplicate - position already exists (race condition), fetch it
                console.log(`     ⚠️  Position already exists (race condition), fetching...`);
                dbPosition = await prisma.positions.findFirst({
                  where: {
                    deployment_id: deployment.id,
                    signal_id: signal.id,
                  }
                });
                if (!dbPosition) {
                  console.error(`     ❌ Could not find position after duplicate error`);
                  continue;
                }
              } else {
                throw error;
              }
            }
          } else {
            console.log(`     ✅ Found in DB: ${dbPosition.id.substring(0, 8)}...`);
          }

          // Step 6: Get current price
          const currentPrice = await getHyperliquidMarketPrice(symbol);
          
          if (!currentPrice) {
            console.log(`     ⚠️  Price unavailable, skipping monitoring\n`);
            continue;
          }

          console.log(`     💰 Current: $${currentPrice.toFixed(4)}`);

          // Step 7: Calculate P&L
          const positionValue = size * currentPrice;
          const { pnlUSD, pnlPercent } = calculatePnL(side, entryPrice, currentPrice, positionValue);

          console.log(`     📈 P&L: $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);

          totalPositionsMonitored++;

          // Step 8: Check exit conditions
          let shouldClose = false;
          let closeReason = '';

          // HARD STOP LOSS: 10%
          const HARD_STOP_LOSS = 10;
          
          if (side === 'LONG') {
            const stopLossPrice = entryPrice * (1 - HARD_STOP_LOSS / 100);
            if (currentPrice <= stopLossPrice) {
              shouldClose = true;
              closeReason = 'HARD_STOP_LOSS';
              console.log(`     🔴 HARD STOP LOSS HIT! Stop: $${stopLossPrice.toFixed(4)}`);
            }
          } else { // SHORT
            const stopLossPrice = entryPrice * (1 + HARD_STOP_LOSS / 100);
            if (currentPrice >= stopLossPrice) {
              shouldClose = true;
              closeReason = 'HARD_STOP_LOSS';
              console.log(`     🔴 HARD STOP LOSS HIT! Stop: $${stopLossPrice.toFixed(4)}`);
            }
          }

          // TRAILING STOP LOGIC
          if (!shouldClose) {
            const trailingParams = dbPosition.trailing_params as any;
            
            if (trailingParams?.enabled) {
              const trailingPercent = trailingParams.trailingPercent || 1;
              
              if (side === 'LONG') {
                const activationThreshold = entryPrice * 1.03;
                const highestPrice = trailingParams.highestPrice || entryPrice;
                const newHighest = Math.max(highestPrice, currentPrice);
                
                if (newHighest > highestPrice) {
                  await prisma.positions.update({
                    where: { id: dbPosition.id },
                    data: {
                      trailing_params: {
                        ...trailingParams,
                        highestPrice: newHighest,
                      }
                    }
                  });
                }

                if (newHighest >= activationThreshold) {
                  const trailingStopPrice = newHighest * (1 - trailingPercent / 100);
                  if (currentPrice <= trailingStopPrice) {
                    shouldClose = true;
                    closeReason = 'TRAILING_STOP';
                    console.log(`     🟢 Trailing stop triggered! High: $${newHighest.toFixed(4)}, Stop: $${trailingStopPrice.toFixed(4)}`);
                  } else {
                    console.log(`     ✅ Trailing stop active (High: $${newHighest.toFixed(4)}, Stop: $${trailingStopPrice.toFixed(4)})`);
                  }
                } else {
                  console.log(`     ⏳ Trailing stop inactive (need +3% for activation, current: ${pnlPercent.toFixed(2)}%)`);
                }
              } else { // SHORT
                const activationThreshold = entryPrice * 0.97;
                const lowestPrice = trailingParams.lowestPrice || entryPrice;
                const newLowest = Math.min(lowestPrice, currentPrice);
                
                if (newLowest < lowestPrice) {
                  await prisma.positions.update({
                    where: { id: dbPosition.id },
                    data: {
                      trailing_params: {
                        ...trailingParams,
                        lowestPrice: newLowest,
                      }
                    }
                  });
                }

                if (newLowest <= activationThreshold) {
                  const trailingStopPrice = newLowest * (1 + trailingPercent / 100);
                  if (currentPrice >= trailingStopPrice) {
                    shouldClose = true;
                    closeReason = 'TRAILING_STOP';
                    console.log(`     🟢 Trailing stop triggered! Low: $${newLowest.toFixed(4)}, Stop: $${trailingStopPrice.toFixed(4)}`);
                  } else {
                    console.log(`     ✅ Trailing stop active (Low: $${newLowest.toFixed(4)}, Stop: $${trailingStopPrice.toFixed(4)})`);
                  }
                } else {
                  console.log(`     ⏳ Trailing stop inactive (need +3% for activation, current: ${pnlPercent.toFixed(2)}%)`);
                }
              }
            }
          }

          // Step 9: Close position if triggered
          if (shouldClose) {
            console.log(`\n     ⚡ Closing position via TradeExecutor...`);
            
            const result = await executor.closePosition(dbPosition.id);

            if (result.success) {
              totalPositionsClosed++;
              console.log(`     ✅ Position closed! P&L: $${pnlUSD.toFixed(2)} (${closeReason})\n`);
            } else {
              console.log(`     ❌ Failed to close: ${result.error}\n`);
            }
          } else {
            console.log(`     ✅ Position healthy\n`);
          }
        }

        // Step 10: Clean up orphan DB records (positions in DB but not on HL)
        const dbPositions = await prisma.positions.findMany({
          where: {
            deployment_id: deployment.id,
            venue: 'HYPERLIQUID',
            closed_at: null,
          }
        });

        const hlTokens = new Set(hlPositions.map(p => p.coin));
        const orphans = dbPositions.filter(p => !hlTokens.has(p.token_symbol));

        if (orphans.length > 0) {
          console.log(`  🔄 Cleaning up ${orphans.length} orphan DB record(s):`);
          for (const orphan of orphans) {
            console.log(`     Closing ${orphan.token_symbol} (not on Hyperliquid)`);
            await prisma.positions.update({
              where: { id: orphan.id },
              data: {
                closed_at: new Date(),
                pnl: 0,
                exit_price: orphan.entry_price,
              }
            });
          }
          console.log();
        }

      } catch (error: any) {
        console.error(`  ❌ Error monitoring ${agentName}:`, error.message);
        console.log();
      }
    }

    // Summary
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                       MONITORING COMPLETE                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`  Positions Found:     ${totalPositionsFound}`);
    console.log(`  Positions Monitored: ${totalPositionsMonitored}`);
    console.log(`  Positions Closed:    ${totalPositionsClosed}\n`);

    return {
      success: true,
      found: totalPositionsFound,
      monitored: totalPositionsMonitored,
      closed: totalPositionsClosed,
    };

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  monitorHyperliquidPositions()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}


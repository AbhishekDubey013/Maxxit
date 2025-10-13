/**
 * Position Monitoring Worker V2
 * - Real-time prices from Uniswap V3
 * - Trailing stop loss
 * - Take profit monitoring
 * - Auto-close positions via module
 */

import { PrismaClient } from '@prisma/client';
import { getTokenPriceUSD, calculatePnL } from '../lib/price-oracle';
import { TradeExecutor } from '../lib/trade-executor';
import { createGMXReader } from '../lib/adapters/gmx-reader';
import { ethers } from 'ethers';

const prisma = new PrismaClient();
const executor = new TradeExecutor();

interface PositionWithTrailing {
  id: string;
  tokenSymbol: string;
  side: string;
  entryPrice: number;
  qty: number;
  stopLoss: number | null;
  takeProfit: number | null;
  highestPrice?: number; // Track for trailing stop
  lowestPrice?: number; // Track for trailing short
  trailingParams: any;
}

export async function monitorPositions() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📊 POSITION MONITOR - REAL-TIME');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Fetch all open positions
    const openPositions = await prisma.position.findMany({
      where: {
        closedAt: null, // Only open positions
      },
      include: {
        signal: {
          select: {
            tokenSymbol: true,
            side: true,
            riskModel: true,
          },
        },
        deployment: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                profitReceiverAddress: true,
              },
            },
          },
        },
      },
    });

    console.log(`📋 Monitoring ${openPositions.length} open positions\n`);

    if (openPositions.length === 0) {
      console.log('✅ No open positions to monitor\n');
      return { success: true, monitored: 0, closed: 0 };
    }

    let closedCount = 0;

    for (const position of openPositions) {
      try {
        const symbol = position.tokenSymbol;
        const side = position.side;
        const venue = position.venue; // SPOT, GMX, HYPERLIQUID
        const entryPrice = parseFloat(position.entryPrice?.toString() || '0');
        
        if (entryPrice === 0) {
          console.log(`⚠️  ${symbol}: Entry price not set, skipping`);
          continue;
        }

        // Get current price based on venue
        let currentPrice: number | null = null;
        
        if (venue === 'GMX') {
          // Use GMX Reader for on-chain GMX prices (like Uniswap Quoter for SPOT)
          try {
            const rpcUrl = process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const gmxReader = createGMXReader(provider);
            
            const priceData = await gmxReader.getMarketPrice(symbol);
            if (priceData) {
              currentPrice = priceData.price;
              console.log(`📈 ${symbol} (GMX): $${currentPrice.toFixed(2)} (on-chain)`);
            }
          } catch (gmxError: any) {
            console.error(`⚠️  ${symbol} (GMX): Failed to get price:`, gmxError.message);
          }
        } else {
          // Use Uniswap V3 for SPOT prices
          currentPrice = await getTokenPriceUSD(symbol);
        }
        
        if (!currentPrice) {
          console.log(`⚠️  ${symbol}: Price unavailable, skipping`);
          continue;
        }

        // Calculate P&L
        const qty = parseFloat(position.qty?.toString() || '0');
        const positionValue = qty * currentPrice;
        const { pnlUSD, pnlPercent } = calculatePnL(side, entryPrice, currentPrice, positionValue);

        console.log(`📊 ${symbol} ${side} [${venue || 'SPOT'}]:`);
        console.log(`   Entry: $${entryPrice.toFixed(2)} | Current: $${currentPrice.toFixed(2)}`);
        console.log(`   P&L: $${pnlUSD.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);

        // Get stop loss and take profit from signal risk model
        const riskModel = position.signal.riskModel as any;
        let stopLoss = position.stopLoss ? parseFloat(position.stopLoss.toString()) : null;
        let takeProfit = position.takeProfit ? parseFloat(position.takeProfit.toString()) : null;

        // If not set on position, try to get from signal
        if (!stopLoss && riskModel?.stopLoss) {
          stopLoss = riskModel.stopLoss;
        }
        if (!takeProfit && riskModel?.takeProfit) {
          takeProfit = riskModel.takeProfit;
        }

        // Check trailing stop loss
        const trailingParams = position.trailingParams as any;
        let shouldClose = false;
        let closeReason = '';

        if (trailingParams?.enabled) {
          // Implement trailing stop
          const trailingPercent = trailingParams.trailingPercent || 5; // 5% default
          
          // For LONG positions
          if (side === 'BUY' || side === 'LONG') {
            // Track highest price with 3% buffer on first initialization
            // This prevents premature exit from normal market volatility
            const initialHighest = entryPrice * 1.03; // 3% buffer above entry
            const highestPrice = trailingParams.highestPrice || initialHighest;
            const newHighest = Math.max(highestPrice, currentPrice);
            
            if (newHighest > highestPrice) {
              // Update highest price in DB
              await prisma.position.update({
                where: { id: position.id },
                data: {
                  trailingParams: {
                    ...trailingParams,
                    highestPrice: newHighest,
                  },
                },
              });
            }

            // Check if price dropped by trailing %
            const trailingStopPrice = newHighest * (1 - trailingPercent / 100);
            if (currentPrice <= trailingStopPrice) {
              shouldClose = true;
              closeReason = 'TRAILING_STOP';
              console.log(`   🔴 Trailing stop triggered! High: $${newHighest.toFixed(2)}, Stop: $${trailingStopPrice.toFixed(2)}`);
            }
          }
        }

        // Check fixed stop loss
        if (!shouldClose && stopLoss) {
          if (side === 'BUY' || side === 'LONG') {
            if (currentPrice <= stopLoss) {
              shouldClose = true;
              closeReason = 'STOP_LOSS';
              console.log(`   🔴 Stop loss hit! SL: $${stopLoss.toFixed(2)}`);
            }
          } else { // SHORT
            if (currentPrice >= stopLoss) {
              shouldClose = true;
              closeReason = 'STOP_LOSS';
              console.log(`   🔴 Stop loss hit! SL: $${stopLoss.toFixed(2)}`);
            }
          }
        }

        // Check take profit
        if (!shouldClose && takeProfit) {
          if (side === 'BUY' || side === 'LONG') {
            if (currentPrice >= takeProfit) {
              shouldClose = true;
              closeReason = 'TAKE_PROFIT';
              console.log(`   🟢 Take profit hit! TP: $${takeProfit.toFixed(2)}`);
            }
          } else { // SHORT
            if (currentPrice <= takeProfit) {
              shouldClose = true;
              closeReason = 'TAKE_PROFIT';
              console.log(`   🟢 Take profit hit! TP: $${takeProfit.toFixed(2)}`);
            }
          }
        }

        // Close position if triggered
        if (shouldClose) {
          console.log(`\n   ⚡ Closing position via TradeExecutor...\n`);

          // Directly close position without creating a signal
          // (signals have 6h deduplication constraint that prevents closes)
          const result = await executor.closePosition(position.id);

          if (result.success) {
            closedCount++;
            console.log(`   ✅ Position closed! P&L: $${pnlUSD.toFixed(2)} (${closeReason})`);
            console.log(`   🔗 TX: ${result.txHash}`);
            if (result.txHash) {
              console.log(`   🔍 https://arbiscan.io/tx/${result.txHash}\n`);
            }
          } else {
            console.error(`   ❌ Failed to close position:`, result.error);
            console.error(`      Reason: ${result.reason}\n`);
          }
        } else {
          console.log(`   ✅ Position healthy\n`);
        }

        // Small delay between checks
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`❌ Error monitoring position ${position.id}:`, error.message);
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Complete! Monitored: ${openPositions.length}, Closed: ${closedCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return { success: true, monitored: openPositions.length, closed: closedCount };
  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  monitorPositions()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}


import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { calculatePositionSize } from '../shared/sizing';
import { calculateStopLoss, calculateTakeProfit } from '../shared/risk';
import { RelayerService } from '../adapters/relayer.service';
import { GmxAdapter } from '../adapters/gmx.adapter';
import { HyperliquidAdapter } from '../adapters/hyperliquid.adapter';
import { SpotAdapter } from '../adapters/spot.adapter';
import { QUEUE_NAMES, riskExitQueue, redisConnection } from './queues';
import { Decimal } from '@prisma/client/runtime/library';

interface ExecuteTradeJobData {
  signalId: string;
}

export function createExecuteTradeWorker(
  prisma: PrismaService,
  relayerService: RelayerService,
  gmxAdapter: GmxAdapter,
  hyperliquidAdapter: HyperliquidAdapter,
  spotAdapter: SpotAdapter
) {
  return new Worker<ExecuteTradeJobData>(
    QUEUE_NAMES.EXECUTE_TRADE,
    async (job: Job<ExecuteTradeJobData>) => {
      const { signalId } = job.data;
      
      try {
        console.log(`[ExecuteTrade] Executing trades for signal ${signalId}`);
        
        const signal = await prisma.signal.findUnique({
          where: { id: signalId },
          include: {
            agent: {
              include: {
                deployments: {
                  where: { status: 'ACTIVE' },
                },
              },
            },
          },
        });
        
        if (!signal) {
          console.error(`[ExecuteTrade] Signal ${signalId} not found`);
          return;
        }
        
        console.log(`[ExecuteTrade] Found ${signal.agent.deployments.length} active deployments`);
        
        for (const deployment of signal.agent.deployments) {
          try {
            console.log(`[ExecuteTrade] Processing deployment ${deployment.id}`);
            
            const balanceStr = await relayerService.getSafeBalance(deployment.safeWallet);
            const balance = parseFloat(balanceStr);
            
            console.log(`[ExecuteTrade] Safe ${deployment.safeWallet} balance: $${balance}`);
            
            const venueStatus = await prisma.venueStatus.findFirst({
              where: {
                venue: signal.venue,
                tokenSymbol: signal.tokenSymbol,
              },
            });
            
            if (!venueStatus) {
              console.log(`[ExecuteTrade] No venue status for ${signal.venue}/${signal.tokenSymbol}`);
              continue;
            }
            
            const mockPrice = 100;
            
            const sizeModel = signal.sizeModel as any;
            const qty = calculatePositionSize(sizeModel, {
              balance,
              tokenPrice: mockPrice,
            });
            
            const minSize = parseFloat(venueStatus.minSize || '0');
            if (qty < minSize) {
              console.log(`[ExecuteTrade] Position size ${qty} below minimum ${minSize}, skipping`);
              continue;
            }
            
            console.log(`[ExecuteTrade] Position size: ${qty} ${signal.tokenSymbol}`);
            
            let adapter: any;
            if (signal.venue === 'GMX') {
              adapter = gmxAdapter;
            } else if (signal.venue === 'HYPERLIQUID') {
              adapter = hyperliquidAdapter;
            } else {
              adapter = spotAdapter;
            }
            
            const orderParams = {
              tokenSymbol: signal.tokenSymbol,
              side: signal.side as any,
              qty: qty.toString(),
            };
            
            const result = await adapter.placeOrder(orderParams);
            
            console.log(`[ExecuteTrade] Order executed: entry=${result.entryPrice}, tx=${result.txHash}`);
            
            const riskModel = signal.riskModel as any;
            const stopLoss = calculateStopLoss(result.entryPrice, signal.side as any, riskModel.stopLoss);
            const takeProfit = calculateTakeProfit(result.entryPrice, signal.side as any, riskModel.takeProfit);
            
            const position = await prisma.position.create({
              data: {
                deploymentId: deployment.id,
                signalId: signal.id,
                venue: signal.venue,
                tokenSymbol: signal.tokenSymbol,
                side: signal.side,
                qty: new Decimal(qty),
                entryPrice: new Decimal(result.entryPrice),
                stopLoss: stopLoss ? new Decimal(stopLoss) : null,
                takeProfit: takeProfit ? new Decimal(takeProfit) : null,
                trailingParams: riskModel.trailing || null,
                status: 'OPEN',
              },
            });
            
            console.log(`[ExecuteTrade] Created position ${position.id}`);
            
            await riskExitQueue.add('monitor', { positionId: position.id });
            console.log(`[ExecuteTrade] Enqueued risk monitoring for position ${position.id}`);
          } catch (error) {
            console.error(`[ExecuteTrade] Error executing trade for deployment ${deployment.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[ExecuteTrade] Error processing signal ${signalId}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

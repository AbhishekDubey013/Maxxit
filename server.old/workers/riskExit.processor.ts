import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { QUEUE_NAMES, metricsQueue, billingQueue, riskExitQueue, redisConnection } from './queues';
import { Decimal } from '@prisma/client/runtime/library';

interface RiskExitJobData {
  positionId: string;
}


export function createRiskExitWorker(prisma: PrismaService) {
  return new Worker<RiskExitJobData>(
    QUEUE_NAMES.RISK_EXIT,
    async (job: Job<RiskExitJobData>) => {
      const { positionId } = job.data;
      
      try {
        console.log(`[RiskExit] Monitoring position ${positionId} for SL/TP`);
        
        const position = await prisma.position.findUnique({
          where: { id: positionId },
        });
        
        if (!position || position.status === 'CLOSED') {
          console.log(`[RiskExit] Position ${positionId} not found or already closed`);
          return;
        }
        
        // TODO: Poll current price, check SL/TP/trailing stop
        // const currentPrice = await fetchCurrentPrice(position.tokenSymbol);
        // const shouldClose = checkStopLossTakeProfit(currentPrice, position);
        
        const mockCurrentPrice = parseFloat(position.entryPrice.toString()) * (1 + (Math.random() * 0.1 - 0.05));
        
        console.log(`[RiskExit] Current price: $${mockCurrentPrice.toFixed(2)}, Entry: $${position.entryPrice}`);
        
        const shouldTriggerExit = Math.random() < 0.1;
        
        if (shouldTriggerExit) {
          console.log(`[RiskExit] Exit condition triggered for position ${positionId}`);
          
          // TODO: When triggered, call venue adapter closePosition
          // await venueAdapter.closePosition({
          //   tokenSymbol: position.tokenSymbol,
          //   qty: position.qty.toString(),
          //   positionId: position.id,
          // });
          
          const exitPrice = mockCurrentPrice;
          const pnl = (exitPrice - parseFloat(position.entryPrice.toString())) * parseFloat(position.qty.toString());
          
          console.log(`[RiskExit] Exit price: $${exitPrice.toFixed(2)}, PnL: $${pnl.toFixed(2)}`);
          
          await prisma.position.update({
            where: { id: positionId },
            data: {
              closedAt: new Date(),
              exitPrice: new Decimal(exitPrice),
              pnl: new Decimal(pnl),
              status: 'CLOSED',
            },
          });
          
          console.log(`[RiskExit] Position ${positionId} closed`);
          
          await metricsQueue.add('update-metrics', { positionId });
          await billingQueue.add('charge-fees', { positionId, kind: 'INFRA_FEE' });
          
          console.log(`[RiskExit] Enqueued metrics and billing jobs for position ${positionId}`);
        } else {
          console.log(`[RiskExit] Position ${positionId} still within risk parameters`);
          
          await job.updateProgress(50);
          
          await riskExitQueue.add(
            'monitor',
            { positionId },
            { delay: 60000 }
          );
        }
      } catch (error) {
        console.error(`[RiskExit] Error monitoring position ${positionId}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

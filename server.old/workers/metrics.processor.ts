import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { QUEUE_NAMES, redisConnection } from './queues';
import { Decimal } from '@prisma/client/runtime/library';

interface MetricsJobData {
  positionId: string;
}


export function createMetricsWorker(prisma: PrismaService) {
  return new Worker<MetricsJobData>(
    QUEUE_NAMES.METRICS,
    async (job: Job<MetricsJobData>) => {
      const { positionId } = job.data;
      
      try {
        console.log(`[Metrics] Updating metrics for position ${positionId}`);
        
        const position = await prisma.position.findUnique({
          where: { id: positionId },
          include: {
            deployment: true,
            signal: {
              include: {
                agent: true,
              },
            },
          },
        });
        
        if (!position) {
          console.error(`[Metrics] Position ${positionId} not found`);
          return;
        }
        
        const day = new Date();
        day.setUTCHours(0, 0, 0, 0);
        
        const pnl = position.pnl ? parseFloat(position.pnl.toString()) : 0;
        
        await prisma.pnlSnapshot.upsert({
          where: {
            deploymentId_day: {
              deploymentId: position.deploymentId,
              day,
            },
          },
          create: {
            agentId: position.signal.agentId,
            deploymentId: position.deploymentId,
            day,
            pnl: new Decimal(pnl),
            returnPct: pnl > 0 ? pnl / 100 : 0,
          },
          update: {
            pnl: {
              increment: pnl,
            },
          },
        });
        
        console.log(`[Metrics] Updated PnlSnapshot for deployment ${position.deploymentId}, day ${day.toISOString()}`);
        
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        const snapshots30d = await prisma.pnlSnapshot.findMany({
          where: {
            agentId: position.signal.agentId,
            day: { gte: thirtyDaysAgo },
          },
        });
        
        const snapshots90d = await prisma.pnlSnapshot.findMany({
          where: {
            agentId: position.signal.agentId,
            day: { gte: ninetyDaysAgo },
          },
        });
        
        const totalPnl30d = snapshots30d.reduce((sum, s) => sum + parseFloat(s.pnl?.toString() || '0'), 0);
        const totalPnl90d = snapshots90d.reduce((sum, s) => sum + parseFloat(s.pnl?.toString() || '0'), 0);
        
        const apr30d = (totalPnl30d / 10000) * (365 / 30) * 100;
        const apr90d = (totalPnl90d / 10000) * (365 / 90) * 100;
        
        const returns30d = snapshots30d.map(s => s.returnPct || 0);
        const meanReturn = returns30d.reduce((a, b) => a + b, 0) / (returns30d.length || 1);
        const variance = returns30d.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns30d.length || 1);
        const stdDev = Math.sqrt(variance);
        const sharpe30d = stdDev > 0 ? meanReturn / stdDev : 0;
        
        await prisma.agent.update({
          where: { id: position.signal.agentId },
          data: {
            apr30d,
            apr90d,
            sharpe30d,
          },
        });
        
        console.log(`[Metrics] Updated Agent ${position.signal.agent.name}: APR30d=${apr30d.toFixed(2)}%, APR90d=${apr90d.toFixed(2)}%, Sharpe30d=${sharpe30d.toFixed(2)}`);
        
        await prisma.impactFactorHistory.create({
          data: {
            ctAccountId: position.signal.sourceTweets[0] || 'unknown',
            signalId: position.signalId,
            positionId: position.id,
            agentId: position.signal.agentId,
            pnlContribution: position.pnl,
            weight: 1.0,
            modelVersion: 'v1',
          },
        });
        
        console.log(`[Metrics] Created ImpactFactorHistory record for position ${positionId}`);
      } catch (error) {
        console.error(`[Metrics] Error processing position ${positionId}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

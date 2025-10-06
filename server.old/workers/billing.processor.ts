import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { QUEUE_NAMES, billingQueue, redisConnection } from './queues';
import { Decimal } from '@prisma/client/runtime/library';

interface BillingJobData {
  positionId?: string;
  deploymentId?: string;
  kind: string;
}


export function createBillingWorker(prisma: PrismaService) {
  return new Worker<BillingJobData>(
    QUEUE_NAMES.BILLING,
    async (job: Job<BillingJobData>) => {
      const { positionId, deploymentId, kind } = job.data;
      
      try {
        if (positionId) {
          console.log(`[Billing] Processing fees for position ${positionId}`);
          
          const position = await prisma.position.findUnique({
            where: { id: positionId },
          });
          
          if (!position) {
            console.error(`[Billing] Position ${positionId} not found`);
            return;
          }
          
          const infraFee = parseFloat(config.BILL_INFRA_FEE_USDC);
          
          await prisma.billingEvent.create({
            data: {
              positionId: position.id,
              deploymentId: position.deploymentId,
              kind: 'INFRA_FEE',
              amount: new Decimal(infraFee),
              asset: 'USDC',
              status: 'CHARGED',
              metadata: {
                tokenSymbol: position.tokenSymbol,
                venue: position.venue,
              },
            },
          });
          
          console.log(`[Billing] Charged INFRA_FEE $${infraFee} for position ${positionId}`);
          
          const pnl = position.pnl ? parseFloat(position.pnl.toString()) : 0;
          
          if (pnl > 0) {
            const profitShareBps = parseFloat(config.BILL_PROFIT_SHARE_BPS);
            const profitShare = pnl * (profitShareBps / 10000);
            
            await prisma.billingEvent.create({
              data: {
                positionId: position.id,
                deploymentId: position.deploymentId,
                kind: 'PROFIT_SHARE',
                amount: new Decimal(profitShare),
                asset: 'USDC',
                status: 'CHARGED',
                metadata: {
                  pnl,
                  profitShareBps,
                },
              },
            });
            
            console.log(`[Billing] Charged PROFIT_SHARE $${profitShare.toFixed(2)} (${profitShareBps / 100}% of $${pnl.toFixed(2)})`);
          }
        } else if (kind === 'SUBSCRIPTION' && deploymentId) {
          console.log(`[Billing] Processing monthly subscription for deployment ${deploymentId}`);
          
          const deployment = await prisma.agentDeployment.findUnique({
            where: { id: deploymentId },
          });
          
          if (!deployment) {
            console.error(`[Billing] Deployment ${deploymentId} not found`);
            return;
          }
          
          const now = new Date();
          if (deployment.trialEndsAt && deployment.trialEndsAt > now) {
            console.log(`[Billing] Deployment ${deploymentId} is in trial, skipping subscription charge`);
            return;
          }
          
          const subscriptionFee = parseFloat(config.SUBSCRIPTION_USD_MONTH);
          
          await prisma.billingEvent.create({
            data: {
              deploymentId: deployment.id,
              kind: 'SUBSCRIPTION',
              amount: new Decimal(subscriptionFee),
              asset: 'USDC',
              status: 'CHARGED',
              metadata: {
                billingPeriod: now.toISOString().substring(0, 7),
              },
            },
          });
          
          const nextBillingAt = new Date(now);
          nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);
          
          await prisma.agentDeployment.update({
            where: { id: deployment.id },
            data: { nextBillingAt },
          });
          
          console.log(`[Billing] Charged SUBSCRIPTION $${subscriptionFee} for deployment ${deploymentId}, next billing: ${nextBillingAt.toISOString()}`);
        }
      } catch (error) {
        console.error(`[Billing] Error processing billing job:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

export async function setupBillingCron(prisma: PrismaService) {
  console.log(`[Billing] Setting up monthly subscription CRON`);
  
  const deployments = await prisma.agentDeployment.findMany({
    where: { status: 'ACTIVE' },
  });
  
  for (const deployment of deployments) {
    await billingQueue.add(
      `subscription-${deployment.id}`,
      { deploymentId: deployment.id, kind: 'SUBSCRIPTION' },
      {
        repeat: {
          pattern: '0 0 1 * *',
          key: `subscription-${deployment.id}`,
        },
      }
    );
  }
  
  console.log(`[Billing] Scheduled subscription CRON for ${deployments.length} deployments`);
}

import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { bucket6hUtc } from '../shared/bucket';
import { QUEUE_NAMES, executeTradeQueue, redisConnection } from './queues';

interface SignalCreateJobData {
  ctPostId: string;
}


export function createSignalCreateWorker(prisma: PrismaService) {
  return new Worker<SignalCreateJobData>(
    QUEUE_NAMES.SIGNAL_CREATE,
    async (job: Job<SignalCreateJobData>) => {
      const { ctPostId } = job.data;
      
      try {
        console.log(`[SignalCreate] Processing post ${ctPostId}`);
        
        const post = await prisma.ctPost.findUnique({
          where: { id: ctPostId },
        });
        
        if (!post || !post.isSignalCandidate) {
          console.log(`[SignalCreate] Post ${ctPostId} is not a signal candidate`);
          return;
        }
        
        console.log(`[SignalCreate] Extracted tokens: ${post.extractedTokens.join(', ')}`);
        
        for (const tokenSymbol of post.extractedTokens) {
          const venueStatuses = await prisma.venueStatus.findMany({
            where: { tokenSymbol },
          });
          
          if (venueStatuses.length === 0) {
            console.log(`[SignalCreate] No venues found for ${tokenSymbol}, skipping`);
            continue;
          }
          
          for (const venueStatus of venueStatuses) {
            const agents = await prisma.agent.findMany({
              where: {
                venue: venueStatus.venue,
                status: 'ACTIVE',
              },
            });
            
            console.log(`[SignalCreate] Found ${agents.length} active agents for ${venueStatus.venue}/${tokenSymbol}`);
            
            for (const agent of agents) {
              const now = new Date();
              const currentBucket = bucket6hUtc(now);
              
              const existingSignal = await prisma.signal.findFirst({
                where: {
                  agentId: agent.id,
                  tokenSymbol,
                  createdAt: {
                    gte: currentBucket,
                    lt: new Date(currentBucket.getTime() + 6 * 60 * 60 * 1000),
                  },
                },
              });
              
              if (existingSignal) {
                console.log(`[SignalCreate] Signal already exists for agent ${agent.id} in current 6h bucket`);
                continue;
              }
              
              const side = post.tweetText.toLowerCase().includes('short') ? 'SHORT' : 'LONG';
              
              const sizeModel = {
                type: 'balance-percentage',
                value: 5,
              };
              
              const riskModel = {
                stopLoss: { type: 'percentage', value: 5 },
                takeProfit: { type: 'percentage', value: 15 },
                trailing: { enabled: true, activationPct: 10, trailingPct: 3 },
              };
              
              const signal = await prisma.signal.create({
                data: {
                  agentId: agent.id,
                  tokenSymbol,
                  venue: agent.venue,
                  side,
                  sizeModel,
                  riskModel,
                  sourceTweets: [post.tweetId],
                  createdAt: now,
                },
              });
              
              console.log(`[SignalCreate] Created signal ${signal.id} for agent ${agent.name} (${agent.id})`);
              
              await executeTradeQueue.add('execute', { signalId: signal.id });
              console.log(`[SignalCreate] Enqueued trade execution for signal ${signal.id}`);
            }
          }
        }
      } catch (error) {
        console.error(`[SignalCreate] Error processing post ${ctPostId}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

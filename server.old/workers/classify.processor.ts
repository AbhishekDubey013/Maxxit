import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { QUEUE_NAMES, signalCreateQueue, redisConnection } from './queues';
import { classifyTweet } from '../../lib/llm-classifier';

interface ClassifyJobData {
  ctPostId: string;
}


export function createClassifyWorker(prisma: PrismaService) {
  return new Worker<ClassifyJobData>(
    QUEUE_NAMES.CLASSIFY,
    async (job: Job<ClassifyJobData>) => {
      const { ctPostId } = job.data;
      
      try {
        console.log(`[Classify] Classifying tweet ${ctPostId}`);
        
        const post = await prisma.ctPost.findUnique({
          where: { id: ctPostId },
        });
        
        if (!post) {
          console.error(`[Classify] Post ${ctPostId} not found`);
          return;
        }
        
        // Use LLM to classify tweet
        console.log(`[Classify] Analyzing: "${post.tweetText.substring(0, 100)}..."`);
        const classification = await classifyTweet(post.tweetText);
        
        console.log(`[Classify] Post ${ctPostId}: isSignalCandidate=${classification.isSignalCandidate}, sentiment=${classification.sentiment}, confidence=${classification.confidence.toFixed(2)}, tokens=${classification.extractedTokens.join(', ')}`);
        
        if (classification.reasoning) {
          console.log(`[Classify] Reasoning: ${classification.reasoning}`);
        }
        
        await prisma.ctPost.update({
          where: { id: ctPostId },
          data: {
            isSignalCandidate: classification.isSignalCandidate,
            extractedTokens: classification.extractedTokens,
          },
        });
        
        if (classification.isSignalCandidate) {
          await signalCreateQueue.add('create-signal', { 
            ctPostId,
            sentiment: classification.sentiment,
            confidence: classification.confidence,
          });
          console.log(`[Classify] ✅ Enqueued signal creation for post ${ctPostId}`);
        } else {
          console.log(`[Classify] ❌ Not a signal candidate - skipping signal creation`);
        }
      } catch (error) {
        console.error(`[Classify] Error processing post ${ctPostId}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

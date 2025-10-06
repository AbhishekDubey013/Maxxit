import { Worker, Job } from 'bullmq';
import { PrismaService } from '../shared/prisma.service';
import { config } from '../config/config';
import { bucket6hUtc } from '../shared/bucket';
import { QUEUE_NAMES, indicatorsQueue, redisConnection } from './queues';

interface IndicatorsJobData {
  tokenSymbol: string;
}


export function createIndicatorsWorker(prisma: PrismaService) {
  return new Worker<IndicatorsJobData>(
    QUEUE_NAMES.INDICATORS,
    async (job: Job<IndicatorsJobData>) => {
      const { tokenSymbol } = job.data;
      
      try {
        console.log(`[Indicators] Computing indicators for ${tokenSymbol}`);
        
        // TODO: Fetch price/volume data, compute technical indicators
        // const priceData = await fetchPriceData(tokenSymbol);
        // const indicators = computeTechnicalIndicators(priceData);
        
        const mockIndicators = {
          rsi: Math.random() * 100,
          macd: Math.random() * 10 - 5,
          volume24h: Math.random() * 1000000,
          priceChange24h: Math.random() * 20 - 10,
          ema20: Math.random() * 100,
          ema50: Math.random() * 100,
        };
        
        const now = new Date();
        const windowStart = bucket6hUtc(now);
        
        console.log(`[Indicators] ${tokenSymbol} window ${windowStart.toISOString()}: RSI=${mockIndicators.rsi.toFixed(2)}`);
        
        await prisma.marketIndicators6h.upsert({
          where: {
            tokenSymbol_windowStart: {
              tokenSymbol,
              windowStart,
            },
          },
          create: {
            tokenSymbol,
            windowStart,
            indicators: mockIndicators,
          },
          update: {
            indicators: mockIndicators,
          },
        });
        
        console.log(`[Indicators] Saved indicators for ${tokenSymbol} at ${windowStart.toISOString()}`);
      } catch (error) {
        console.error(`[Indicators] Error processing ${tokenSymbol}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );
}

export async function setupIndicatorsCron() {
  const commonTokens = ['BTC', 'ETH', 'SOL', 'ARB', 'AVAX'];
  
  console.log(`[Indicators] Setting up CRON for ${commonTokens.length} common tokens`);
  
  for (const tokenSymbol of commonTokens) {
    await indicatorsQueue.add(
      `indicators-${tokenSymbol}`,
      { tokenSymbol },
      {
        repeat: {
          pattern: '0 */6 * * *',
          key: `indicators-${tokenSymbol}`,
        },
      }
    );
    console.log(`[Indicators] Scheduled CRON for ${tokenSymbol}`);
  }
}

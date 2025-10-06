import { Queue, ConnectionOptions } from 'bullmq';
import { config } from '../config/config';

export const QUEUE_NAMES = {
  TWEET_INGEST: 'tweetIngest',
  CLASSIFY: 'classify',
  INDICATORS: 'indicators',
  SIGNAL_CREATE: 'signalCreate',
  EXECUTE_TRADE: 'executeTrade',
  RISK_EXIT: 'riskExit',
  METRICS: 'metrics',
  BILLING: 'billing',
} as const;

function parseRedisConnection(redisUrl: string): ConnectionOptions {
  if (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://')) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    };
  }
  
  const [host, port] = redisUrl.split(':');
  return {
    host: host || 'localhost',
    port: parseInt(port || '6379'),
  };
}

export const redisConnection = parseRedisConnection(config.REDIS_URL);

export const tweetIngestQueue = new Queue(QUEUE_NAMES.TWEET_INGEST, { connection: redisConnection });
export const classifyQueue = new Queue(QUEUE_NAMES.CLASSIFY, { connection: redisConnection });
export const indicatorsQueue = new Queue(QUEUE_NAMES.INDICATORS, { connection: redisConnection });
export const signalCreateQueue = new Queue(QUEUE_NAMES.SIGNAL_CREATE, { connection: redisConnection });
export const executeTradeQueue = new Queue(QUEUE_NAMES.EXECUTE_TRADE, { connection: redisConnection });
export const riskExitQueue = new Queue(QUEUE_NAMES.RISK_EXIT, { connection: redisConnection });
export const metricsQueue = new Queue(QUEUE_NAMES.METRICS, { connection: redisConnection });
export const billingQueue = new Queue(QUEUE_NAMES.BILLING, { connection: redisConnection });

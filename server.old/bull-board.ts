import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Express } from "express";
import {
  tweetIngestQueue,
  classifyQueue,
  indicatorsQueue,
  signalCreateQueue,
  executeTradeQueue,
  riskExitQueue,
  metricsQueue,
  billingQueue,
} from "./workers/queues";

/**
 * Setup Bull Board admin UI for queue monitoring
 * Accessible at /admin/queues
 * Only sets up when Redis is configured
 */
export function setupBullBoard(app: Express, redisUrl: string) {
  // Don't set up Bull Board if Redis is not configured
  if (redisUrl === 'redis://localhost:6379') {
    console.log('⚠️  Bull Board disabled - Redis not configured');
    return;
  }
  
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(tweetIngestQueue),
      new BullMQAdapter(classifyQueue),
      new BullMQAdapter(indicatorsQueue),
      new BullMQAdapter(signalCreateQueue),
      new BullMQAdapter(executeTradeQueue),
      new BullMQAdapter(riskExitQueue),
      new BullMQAdapter(metricsQueue),
      new BullMQAdapter(billingQueue),
    ],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());

  console.log("📊 Bull Board available at http://localhost:3000/admin/queues");
}

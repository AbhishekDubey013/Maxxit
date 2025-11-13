#!/usr/bin/env ts-node
/**
 * V3 Signal Worker
 * Monitors X posts and research signals, generates venue-agnostic signals
 */

import { PrismaClient } from '@prisma/client';
import { signalGeneratorV3 } from '../lib/v3/signal-generator-v3';
import { tradeExecutorV3 } from '../lib/v3/trade-executor-v3';

const prisma = new PrismaClient();

class V3SignalWorker {
  private isRunning = false;
  private checkInterval = 30000; // 30 seconds

  async start() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                                                               ║');
    console.log('║           🤖 V3 SIGNAL WORKER STARTED                         ║');
    console.log('║           Venue-Agnostic Signal Generation                    ║');
    console.log('║                                                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.processAgents();
      } catch (error: any) {
        console.error('❌ Worker error:', error.message);
      }

      await this.sleep(this.checkInterval);
    }
  }

  async stop() {
    console.log('\n🛑 Stopping V3 Signal Worker...');
    this.isRunning = false;
  }

  private async processAgents() {
    // Get all active V3 agents
    const agents = await prisma.$queryRaw<any[]>`
      SELECT * FROM agents_v3 
      WHERE status = 'ACTIVE'
      ORDER BY created_at DESC;
    `;

    if (agents.length === 0) {
      console.log('⏳ No active V3 agents found');
      return;
    }

    console.log(`\n🔍 Processing ${agents.length} active V3 agent(s)...`);

    for (const agent of agents) {
      try {
        await this.processAgent(agent);
      } catch (error: any) {
        console.error(`❌ Failed to process agent ${agent.id}:`, error.message);
      }
    }
  }

  private async processAgent(agent: any) {
    console.log(`\n📊 Agent: ${agent.name} (${agent.id})`);

    // Check if agent has active deployments
    const deployments = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count 
      FROM agent_deployments_v3 
      WHERE agent_id = ${agent.id}::uuid 
      AND status = 'ACTIVE';
    `;

    if (Number(deployments[0].count) === 0) {
      console.log('  ⏭️  No active deployments, skipping');
      return;
    }

    // Get recent X posts from followed accounts
    const xPosts = await this.getRecentXPosts(agent.x_account_ids || []);
    
    // Get recent research signals
    const researchSignals = await this.getRecentResearch(agent.research_institute_ids || []);

    if (xPosts.length === 0 && researchSignals.length === 0) {
      console.log('  ⏭️  No new context, skipping');
      return;
    }

    console.log(`  📝 Context: ${xPosts.length} posts, ${researchSignals.length} research signals`);

    // Extract tokens from context
    const tokens = this.extractTokens(xPosts, researchSignals);

    console.log(`  🎯 Analyzing ${tokens.length} token(s): ${tokens.join(', ')}`);

    for (const token of tokens) {
      try {
        await this.generateAndExecuteSignal(agent, token, xPosts, researchSignals);
      } catch (error: any) {
        console.error(`  ❌ Failed for ${token}:`, error.message);
      }
    }
  }

  private async generateAndExecuteSignal(
    agent: any,
    token: string,
    xPosts: any[],
    researchSignals: any[]
  ) {
    // Get market context (mock for now)
    const marketContext = {
      token,
      price24h: 0,
      volume24h: 1000000,
      volatility: 0.03,
      sentiment: Math.random() > 0.5 ? 0.7 : -0.3,
    };

    // Generate signal
    const signal = await signalGeneratorV3.generateSignal({
      agentId: agent.id,
      contextPosts: xPosts,
      contextResearch: researchSignals,
      marketContext,
    });

    if (!signal) {
      console.log(`  ⏭️  ${token}: No signal (below confidence threshold)`);
      return;
    }

    // Save signal
    const signalId = await signalGeneratorV3.saveSignal(agent.id, signal);
    console.log(`  ✅ ${token}: Signal created (${signalId})`);
    console.log(`     Side: ${signal.side}, Size: ${signal.size_model.value}%, Confidence: ${signal.confidence.toFixed(2)}`);
    console.log(`     Venue: MULTI (will be automatically routed)`);

    // Execute trade
    console.log(`  🚀 Executing trade...`);
    const result = await tradeExecutorV3.executeTrade(signalId);

    if (result.success) {
      console.log(`  ✅ Trade executed successfully`);
    } else {
      console.log(`  ❌ Trade failed: ${result.error}`);
    }
  }

  private async getRecentXPosts(accountIds: string[]): Promise<any[]> {
    if (accountIds.length === 0) return [];

    const posts = await prisma.$queryRaw<any[]>`
      SELECT * FROM ct_posts 
      WHERE account_id = ANY(${accountIds}::TEXT[])
      AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    return posts;
  }

  private async getRecentResearch(instituteIds: string[]): Promise<any[]> {
    if (instituteIds.length === 0) return [];

    const signals = await prisma.$queryRaw<any[]>`
      SELECT * FROM research_signals 
      WHERE institute_id = ANY(${instituteIds}::TEXT[])
      AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    return signals;
  }

  private extractTokens(posts: any[], research: any[]): string[] {
    // Simple token extraction (in production, use NLP/AI)
    const tokens = new Set<string>();

    // Common crypto tokens
    const commonTokens = ['BTC', 'ETH', 'SOL', 'AVAX', 'ARB'];
    
    posts.forEach((post) => {
      commonTokens.forEach((token) => {
        if (post.content?.includes(token)) {
          tokens.add(token);
        }
      });
    });

    research.forEach((r) => {
      if (r.token_symbol) {
        tokens.add(r.token_symbol);
      }
    });

    return Array.from(tokens).slice(0, 3); // Max 3 tokens per cycle
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Start worker
if (require.main === module) {
  const worker = new V3SignalWorker();

  process.on('SIGINT', async () => {
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await worker.stop();
    process.exit(0);
  });

  worker.start().catch((error) => {
    console.error('Worker crashed:', error);
    process.exit(1);
  });
}

export { V3SignalWorker };


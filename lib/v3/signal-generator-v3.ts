/**
 * V3 Signal Generator (Agent What - Venue Agnostic)
 * Generates trading signals without venue specification
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SignalGeneratorInput {
  agentId: string;
  contextPosts: Array<{
    id: string;
    content: string;
    author: string;
    created_at: Date;
  }>;
  contextResearch: Array<{
    id: string;
    signal_type: string;
    reasoning: string;
  }>;
  marketContext: {
    token: string;
    price24h: number;
    volume24h: number;
    volatility: number;
    sentiment: number;
  };
}

interface SignalGeneratorOutput {
  token_symbol: string;
  side: 'LONG' | 'SHORT';
  size_model: {
    type: 'percentage';
    value: number; // 0-100
  };
  risk_model: {
    type: 'trailing-stop';
    stop: number; // 0.0-1.0
  };
  confidence: number; // 0.0-1.0
  reasoning: string;
  source_tweets: string[];
  source_research: string[];
}

class SignalGeneratorV3 {
  /**
   * Generate venue-agnostic trading signal
   * This is "Agent What" - determines WHAT to trade, not WHERE
   */
  async generateSignal(input: SignalGeneratorInput): Promise<SignalGeneratorOutput | null> {
    console.log('\n[SignalGeneratorV3] 🧠 Generating signal for agent:', input.agentId);
    console.log('[SignalGeneratorV3] Token:', input.marketContext.token);

    try {
      // 1. Get agent configuration
      const agents = await prisma.$queryRaw<any[]>`
        SELECT * FROM agents_v3 WHERE id = ${input.agentId}::uuid LIMIT 1;
      `;

      if (agents.length === 0) {
        throw new Error('Agent not found');
      }

      const agent = agents[0];
      console.log('[SignalGeneratorV3] Agent loaded:', agent.name);

      // 2. Analyze context with weighted scoring
      const weights = agent.weights || { x: 0.5, research: 0.5 };
      
      const xScore = this.analyzeXPosts(input.contextPosts);
      const researchScore = this.analyzeResearch(input.contextResearch);
      const marketScore = this.analyzeMarket(input.marketContext);

      const combinedScore =
        xScore * weights.x +
        researchScore * weights.research;

      console.log('[SignalGeneratorV3] Scores:', {
        x: xScore.toFixed(2),
        research: researchScore.toFixed(2),
        market: marketScore.toFixed(2),
        combined: combinedScore.toFixed(2),
      });

      // 3. Determine if signal should be generated
      const CONFIDENCE_THRESHOLD = 0.6;
      if (combinedScore < CONFIDENCE_THRESHOLD) {
        console.log('[SignalGeneratorV3] ⚠️  Score below threshold, skipping signal');
        return null;
      }

      // 4. Determine direction (LONG or SHORT)
      const side = this.determineSide(input);

      // 5. Calculate position size (exponential normalization)
      const positionSize = this.calculatePositionSize(combinedScore);

      // 6. Determine risk parameters
      const riskParams = this.calculateRiskParams(input.marketContext.volatility);

      // 7. Create signal output (venue-agnostic!)
      const signal: SignalGeneratorOutput = {
        token_symbol: input.marketContext.token,
        side,
        size_model: {
          type: 'percentage',
          value: positionSize,
        },
        risk_model: {
          type: 'trailing-stop',
          stop: riskParams.stopLoss,
        },
        confidence: combinedScore,
        reasoning: this.generateReasoning(input, combinedScore, side),
        source_tweets: input.contextPosts.map((p) => p.id),
        source_research: input.contextResearch.map((r) => r.id),
      };

      console.log('[SignalGeneratorV3] ✅ Signal generated:', {
        token: signal.token_symbol,
        side: signal.side,
        size: `${signal.size_model.value}%`,
        confidence: signal.confidence.toFixed(2),
        // Note: No venue specified! Agent Where will decide.
      });

      return signal;
    } catch (error: any) {
      console.error('[SignalGeneratorV3] ❌ Failed to generate signal:', error.message);
      throw error;
    }
  }

  /**
   * Analyze X/Twitter posts for signal strength
   */
  private analyzeXPosts(posts: any[]): number {
    if (posts.length === 0) return 0;

    // Simple scoring based on post count and recency
    // In production, use AI/LLM for semantic analysis
    const recentPosts = posts.filter((p) => {
      const age = Date.now() - new Date(p.created_at).getTime();
      return age < 24 * 60 * 60 * 1000; // Last 24h
    });

    return Math.min(recentPosts.length * 0.2, 1.0);
  }

  /**
   * Analyze research signals for signal strength
   */
  private analyzeResearch(research: any[]): number {
    if (research.length === 0) return 0;

    // Count bullish vs bearish signals
    const bullish = research.filter((r) => r.signal_type === 'BUY').length;
    const total = research.length;

    return bullish / total;
  }

  /**
   * Analyze market context
   */
  private analyzeMarket(context: any): number {
    // Simple scoring based on volume and volatility
    const volumeScore = context.volume24h > 1000000 ? 0.8 : 0.5;
    const volatilityScore = context.volatility > 0.02 ? 0.7 : 0.5;

    return (volumeScore + volatilityScore) / 2;
  }

  /**
   * Determine trade direction
   */
  private determineSide(input: SignalGeneratorInput): 'LONG' | 'SHORT' {
    // Simple heuristic: if sentiment > 0, go LONG
    // In production, use more sophisticated analysis
    return input.marketContext.sentiment > 0 ? 'LONG' : 'SHORT';
  }

  /**
   * Calculate position size using exponential normalization
   */
  private calculatePositionSize(confidence: number): number {
    // Exponential curve: higher confidence = larger position
    // Map 0.6-1.0 confidence to 10-50% position size
    const minSize = 10;
    const maxSize = 50;
    const normalizedConfidence = (confidence - 0.6) / 0.4; // 0-1 range

    return Math.round(minSize + normalizedConfidence * (maxSize - minSize));
  }

  /**
   * Calculate risk parameters based on volatility
   */
  private calculateRiskParams(volatility: number) {
    // Higher volatility = wider stop loss
    const baseStop = 0.03; // 3%
    const volatilityMultiplier = 1 + volatility * 10;
    const stopLoss = Math.min(baseStop * volatilityMultiplier, 0.1); // Max 10%

    return {
      stopLoss,
      takeProfit: stopLoss * 2, // 2:1 RR
    };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    input: SignalGeneratorInput,
    confidence: number,
    side: string
  ): string {
    const postCount = input.contextPosts.length;
    const researchCount = input.contextResearch.length;
    const sentiment = input.marketContext.sentiment > 0 ? 'bullish' : 'bearish';

    return (
      `${side} signal for ${input.marketContext.token} ` +
      `with ${(confidence * 100).toFixed(0)}% confidence. ` +
      `Based on ${postCount} X posts and ${researchCount} research signals. ` +
      `Market sentiment: ${sentiment}. ` +
      `Venue will be automatically selected by Agent Where.`
    );
  }

  /**
   * Save signal to database
   */
  async saveSignal(agentId: string, signal: SignalGeneratorOutput): Promise<string> {
    const result = await prisma.$queryRaw<any[]>`
      INSERT INTO signals_v3 (
        agent_id,
        token_symbol,
        side,
        size_model,
        risk_model,
        confidence,
        requested_venue,
        source_tweets,
        source_research,
        status
      ) VALUES (
        ${agentId}::uuid,
        ${signal.token_symbol},
        ${signal.side},
        ${JSON.stringify(signal.size_model)}::JSONB,
        ${JSON.stringify(signal.risk_model)}::JSONB,
        ${signal.confidence},
        'MULTI',
        ${signal.source_tweets}::TEXT[],
        ${signal.source_research}::TEXT[],
        'PENDING'
      )
      RETURNING id;
    `;

    return result[0].id;
  }
}

export const signalGeneratorV3 = new SignalGeneratorV3();


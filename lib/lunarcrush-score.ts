/**
 * LunarCrush Trading Score System
 * Creates a normalized score from -1 to 1 based on multiple LunarCrush metrics
 * Score determines both tradeability and position size
 */

import axios from 'axios';

interface LunarCrushMetrics {
  galaxy_score: number;        // 0-100
  alt_rank: number;             // 1-N (lower is better)
  social_volume: number;        // Absolute number
  social_volume_24h_change: number; // Percentage
  sentiment: number;            // 0-1 (0=bearish, 1=bullish)
  price_change_24h: number;     // Percentage
  volatility: number;           // 0-100
  correlation_rank: number;     // 1-N
}

interface TradingScore {
  score: number;                // -1 to 1
  tradeable: boolean;           // true if score > 0
  positionSize: number;         // 0-10% of fund
  confidence: number;           // 0-1
  breakdown: {
    galaxy: number;             // -1 to 1
    sentiment: number;          // -1 to 1
    social: number;             // -1 to 1
    momentum: number;           // -1 to 1
    rank: number;               // -1 to 1
  };
  reasoning: string;
}

export class LunarCrushScorer {
  private apiKey: string;
  private baseUrl = 'https://lunarcrush.com/api3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get trading score for a token
   */
  async getTokenScore(symbol: string): Promise<TradingScore> {
    try {
      // Fetch LunarCrush metrics
      const metrics = await this.fetchMetrics(symbol);

      // Calculate individual scores
      const breakdown = {
        galaxy: this.scoreGalaxyScore(metrics.galaxy_score),
        sentiment: this.scoreSentiment(metrics.sentiment),
        social: this.scoreSocialVolume(metrics.social_volume_24h_change),
        momentum: this.scoreMomentum(metrics.price_change_24h),
        rank: this.scoreRank(metrics.alt_rank)
      };

      // Calculate weighted composite score
      const compositeScore = this.calculateCompositeScore(breakdown);

      // Normalize to -1 to 1
      const normalizedScore = Math.max(-1, Math.min(1, compositeScore));

      // Determine position size (0-10%)
      const positionSize = this.calculatePositionSize(normalizedScore);

      // Calculate confidence
      const confidence = Math.abs(normalizedScore);

      // Generate reasoning
      const reasoning = this.generateReasoning(breakdown, normalizedScore);

      return {
        score: normalizedScore,
        tradeable: normalizedScore > 0,
        positionSize,
        confidence,
        breakdown,
        reasoning
      };

    } catch (error: any) {
      console.error('[LunarCrush] Error calculating score:', error.message);
      throw error;
    }
  }

  /**
   * Fetch metrics from LunarCrush API v3
   */
  private async fetchMetrics(symbol: string): Promise<LunarCrushMetrics> {
    const response = await axios.get(`${this.baseUrl}/coins`, {
      params: {
        symbol: symbol.toUpperCase(),
        key: this.apiKey
      }
    });

    if (!response.data?.data) {
      throw new Error(`No data found for ${symbol}`);
    }

    const asset = response.data.data;

    return {
      galaxy_score: asset.galaxy_score || 0,
      alt_rank: asset.alt_rank || 1000,
      social_volume: asset.social_volume || 0,
      social_volume_24h_change: asset.percent_change_24h_social_volume || 0,
      sentiment: asset.sentiment || 0.5,
      price_change_24h: asset.percent_change_24h || 0,
      volatility: asset.volatility || 0,
      correlation_rank: asset.correlation_rank || 500
    };
  }

  /**
   * Score Galaxy Score (0-100) → (-1 to 1)
   * 75+ = Excellent (0.8-1.0)
   * 60-75 = Good (0.4-0.8)
   * 50-60 = Average (0-0.4)
   * 40-50 = Poor (-0.4-0)
   * <40 = Very Poor (-1.0 to -0.4)
   */
  private scoreGalaxyScore(galaxyScore: number): number {
    if (galaxyScore >= 75) return 0.8 + (galaxyScore - 75) / 125; // 0.8 to 1.0
    if (galaxyScore >= 60) return 0.4 + (galaxyScore - 60) / 37.5; // 0.4 to 0.8
    if (galaxyScore >= 50) return 0.0 + (galaxyScore - 50) / 25;   // 0 to 0.4
    if (galaxyScore >= 40) return -0.4 + (galaxyScore - 40) / 25;  // -0.4 to 0
    return -1.0 + (galaxyScore) / 40;                               // -1.0 to -0.4
  }

  /**
   * Score Sentiment (0-1) → (-1 to 1)
   * 0.7+ = Very Bullish (0.5-1.0)
   * 0.6-0.7 = Bullish (0.2-0.5)
   * 0.4-0.6 = Neutral (-0.2 to 0.2)
   * 0.3-0.4 = Bearish (-0.5 to -0.2)
   * <0.3 = Very Bearish (-1.0 to -0.5)
   */
  private scoreSentiment(sentiment: number): number {
    if (sentiment >= 0.7) return 0.5 + (sentiment - 0.7) / 0.6;     // 0.5 to 1.0
    if (sentiment >= 0.6) return 0.2 + (sentiment - 0.6) / 0.333;   // 0.2 to 0.5
    if (sentiment >= 0.4) return -0.2 + (sentiment - 0.4) / 0.5;    // -0.2 to 0.2
    if (sentiment >= 0.3) return -0.5 + (sentiment - 0.3) / 0.333;  // -0.5 to -0.2
    return -1.0 + sentiment / 0.3;                                   // -1.0 to -0.5
  }

  /**
   * Score Social Volume Change (percentage) → (-1 to 1)
   * >50% = Explosive (0.8-1.0)
   * 20-50% = Strong (0.4-0.8)
   * 0-20% = Positive (0-0.4)
   * -20-0% = Weak (-0.4 to 0)
   * <-20% = Dead (-1.0 to -0.4)
   */
  private scoreSocialVolume(change: number): number {
    if (change > 50) return 0.8 + Math.min(0.2, (change - 50) / 250); // 0.8 to 1.0
    if (change > 20) return 0.4 + (change - 20) / 75;                 // 0.4 to 0.8
    if (change > 0) return 0.0 + change / 50;                          // 0 to 0.4
    if (change > -20) return -0.4 + (change + 20) / 50;                // -0.4 to 0
    return Math.max(-1.0, -1.0 + (change + 100) / 80);                 // -1.0 to -0.4
  }

  /**
   * Score Price Momentum (24h change) → (-1 to 1)
   * >10% = Strong Up (0.6-1.0)
   * 5-10% = Up (0.3-0.6)
   * -5-5% = Flat (-0.3 to 0.3)
   * -10 to -5% = Down (-0.6 to -0.3)
   * <-10% = Strong Down (-1.0 to -0.6)
   */
  private scoreMomentum(priceChange: number): number {
    if (priceChange > 10) return 0.6 + Math.min(0.4, (priceChange - 10) / 25); // 0.6 to 1.0
    if (priceChange > 5) return 0.3 + (priceChange - 5) / 16.67;                // 0.3 to 0.6
    if (priceChange > -5) return priceChange / 16.67;                            // -0.3 to 0.3
    if (priceChange > -10) return -0.6 + (priceChange + 10) / 16.67;            // -0.6 to -0.3
    return Math.max(-1.0, -1.0 + (priceChange + 30) / 20);                      // -1.0 to -0.6
  }

  /**
   * Score Alt Rank (1 = best) → (-1 to 1)
   * 1-50 = Top tier (0.7-1.0)
   * 51-200 = Good (0.3-0.7)
   * 201-500 = Average (-0.2 to 0.3)
   * 501-1000 = Poor (-0.6 to -0.2)
   * >1000 = Very Poor (-1.0 to -0.6)
   */
  private scoreRank(altRank: number): number {
    if (altRank <= 50) return 0.7 + (50 - altRank) / 166.67;        // 0.7 to 1.0
    if (altRank <= 200) return 0.3 + (200 - altRank) / 375;         // 0.3 to 0.7
    if (altRank <= 500) return -0.2 + (500 - altRank) / 600;        // -0.2 to 0.3
    if (altRank <= 1000) return -0.6 + (1000 - altRank) / 1250;     // -0.6 to -0.2
    return Math.max(-1.0, -1.0 + (2000 - altRank) / 1000);          // -1.0 to -0.6
  }

  /**
   * Calculate weighted composite score
   * Weights: Galaxy 30%, Sentiment 25%, Social 20%, Momentum 15%, Rank 10%
   */
  private calculateCompositeScore(breakdown: {
    galaxy: number;
    sentiment: number;
    social: number;
    momentum: number;
    rank: number;
  }): number {
    return (
      breakdown.galaxy * 0.30 +
      breakdown.sentiment * 0.25 +
      breakdown.social * 0.20 +
      breakdown.momentum * 0.15 +
      breakdown.rank * 0.10
    );
  }

  /**
   * Calculate position size based on score
   * Score 0.0 = 0% (no trade)
   * Score 0.2 = 2%
   * Score 0.5 = 5%
   * Score 1.0 = 10%
   */
  private calculatePositionSize(score: number): number {
    if (score <= 0) return 0;
    return Math.min(10, score * 10); // 0 to 10%
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(breakdown: any, finalScore: number): string {
    const reasons: string[] = [];

    // Galaxy Score
    if (breakdown.galaxy > 0.6) reasons.push('Excellent Galaxy Score');
    else if (breakdown.galaxy > 0.2) reasons.push('Good Galaxy Score');
    else if (breakdown.galaxy < -0.4) reasons.push('Poor Galaxy Score');

    // Sentiment
    if (breakdown.sentiment > 0.5) reasons.push('Very bullish sentiment');
    else if (breakdown.sentiment > 0.2) reasons.push('Bullish sentiment');
    else if (breakdown.sentiment < -0.3) reasons.push('Bearish sentiment');

    // Social Volume
    if (breakdown.social > 0.6) reasons.push('Explosive social activity');
    else if (breakdown.social > 0.3) reasons.push('Strong social growth');
    else if (breakdown.social < -0.4) reasons.push('Declining social interest');

    // Momentum
    if (breakdown.momentum > 0.5) reasons.push('Strong price momentum');
    else if (breakdown.momentum < -0.5) reasons.push('Negative price action');

    // Rank
    if (breakdown.rank > 0.6) reasons.push('Top-ranked project');
    else if (breakdown.rank < -0.4) reasons.push('Low market rank');

    if (reasons.length === 0) {
      reasons.push('Neutral metrics across the board');
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Batch score multiple tokens
   */
  async scoreTokens(symbols: string[]): Promise<Map<string, TradingScore>> {
    const scores = new Map<string, TradingScore>();

    for (const symbol of symbols) {
      try {
        const score = await this.getTokenScore(symbol);
        scores.set(symbol, score);
        
        // Rate limiting: Wait 200ms between requests
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.error(`[LunarCrush] Error scoring ${symbol}:`, error.message);
        // Continue with next token
      }
    }

    return scores;
  }
}

/**
 * Create LunarCrush scorer instance
 */
export function createLunarCrushScorer(): LunarCrushScorer | null {
  const apiKey = process.env.LUNARCRUSH_API_KEY;
  
  if (!apiKey) {
    console.error('[LunarCrush] No API key found in environment');
    return null;
  }

  return new LunarCrushScorer(apiKey);
}

/**
 * Example usage
 */
export async function exampleUsage() {
  const scorer = createLunarCrushScorer();
  if (!scorer) return;

  // Get score for a token
  const btcScore = await scorer.getTokenScore('BTC');
  
  console.log('BTC Trading Score:', btcScore.score);
  console.log('Tradeable:', btcScore.tradeable);
  console.log('Position Size:', `${btcScore.positionSize}%`);
  console.log('Confidence:', `${(btcScore.confidence * 100).toFixed(1)}%`);
  console.log('Reasoning:', btcScore.reasoning);
  console.log('\nBreakdown:');
  console.log('  Galaxy:', btcScore.breakdown.galaxy.toFixed(2));
  console.log('  Sentiment:', btcScore.breakdown.sentiment.toFixed(2));
  console.log('  Social:', btcScore.breakdown.social.toFixed(2));
  console.log('  Momentum:', btcScore.breakdown.momentum.toFixed(2));
  console.log('  Rank:', btcScore.breakdown.rank.toFixed(2));
}


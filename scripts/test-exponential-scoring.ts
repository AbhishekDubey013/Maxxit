#!/usr/bin/env tsx

/**
 * Test Exponential/Polynomial Scoring with Tweet Confidence
 * Demonstrates how position sizing scales with combined LunarCrush + Tweet confidence
 */

import { createLunarCrushScorer } from '../lib/lunarcrush-score';

async function testExponentialScoring() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║   Exponential/Polynomial Scoring Test                         ║');
  console.log('║   LunarCrush + Tweet Confidence                               ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const scorer = createLunarCrushScorer();

  if (!scorer) {
    console.error('❌ LunarCrush API key not configured');
    console.log('   Set LUNARCRUSH_API_KEY in .env file');
    process.exit(1);
  }

  // Test scenarios
  const scenarios = [
    { token: 'BTC', tweetConfidence: 0.9, description: 'Bitcoin - Very high confidence tweet' },
    { token: 'ETH', tweetConfidence: 0.7, description: 'Ethereum - High confidence tweet' },
    { token: 'SOL', tweetConfidence: 0.5, description: 'Solana - Neutral confidence tweet' },
    { token: 'DOGE', tweetConfidence: 0.3, description: 'Dogecoin - Low confidence tweet' },
  ];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCORING FORMULA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1. Combined Score:');
  console.log('   (LunarCrush Score × 60%) + (Tweet Score × 40%)\n');
  
  console.log('2. Position Size (Exponential):');
  console.log('   Base = (Combined Score)² × 10%');
  console.log('   Final = Base × Confidence Multiplier\n');
  
  console.log('3. Confidence Multiplier:');
  console.log('   0.0-0.3: 0.5x (reduce weak signals)');
  console.log('   0.3-0.5: 0.7x (slightly reduce)');
  console.log('   0.5-0.7: 1.0x (neutral)');
  console.log('   0.7-0.9: 1.2x (boost confident)');
  console.log('   0.9-1.0: 1.5x (aggressively boost)\n');

  for (const scenario of scenarios) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ${scenario.description}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const result = await scorer.getTokenScore(scenario.token, scenario.tweetConfidence);

      console.log(`📊 Token: ${scenario.token}`);
      console.log(`🤖 Tweet Confidence: ${(scenario.tweetConfidence * 100).toFixed(1)}%`);
      console.log('');
      
      console.log('Breakdown:');
      console.log(`  Galaxy Score:    ${(result.breakdown.galaxy * 100).toFixed(1)}%`);
      console.log(`  Sentiment:       ${(result.breakdown.sentiment * 100).toFixed(1)}%`);
      console.log(`  Social Volume:   ${(result.breakdown.social * 100).toFixed(1)}%`);
      console.log(`  Price Momentum:  ${(result.breakdown.momentum * 100).toFixed(1)}%`);
      console.log(`  Market Rank:     ${(result.breakdown.rank * 100).toFixed(1)}%`);
      console.log('');
      
      console.log('Scores:');
      console.log(`  LunarCrush Only: ${result.score.toFixed(3)} (${(result.score * 100).toFixed(1)}%)`);
      console.log(`  Combined Score:  ${result.combinedScore.toFixed(3)} (${(result.combinedScore * 100).toFixed(1)}%)`);
      console.log('');

      // Calculate what linear would have been (for comparison)
      const linearSize = result.combinedScore > 0 ? result.combinedScore * 10 : 0;
      
      console.log('Position Sizing:');
      console.log(`  📉 Linear (old):        ${linearSize.toFixed(2)}%`);
      console.log(`  📈 Exponential (new):   ${result.positionSize.toFixed(2)}%`);
      console.log(`  🚀 Boost Factor:        ${linearSize > 0 ? (result.positionSize / linearSize).toFixed(2) + 'x' : 'N/A'}`);
      console.log('');

      console.log(`✅ Tradeable: ${result.tradeable ? 'YES' : 'NO'}`);
      console.log(`💡 Reasoning: ${result.reasoning}`);
      console.log('');

      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error: any) {
      console.error(`❌ Error: ${error.message}\n`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  KEY INSIGHTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1. Exponential Scaling:');
  console.log('   - Weak signals (score 0.3): ~0.5-1% position');
  console.log('   - Medium signals (score 0.5): ~2-3% position');
  console.log('   - Strong signals (score 0.7): ~5-6% position');
  console.log('   - Very strong (score 0.9): ~8-9% position\n');
  
  console.log('2. Tweet Confidence Amplification:');
  console.log('   - High confidence (0.9+): Up to 1.5x boost');
  console.log('   - Medium confidence (0.5-0.7): No change');
  console.log('   - Low confidence (<0.3): 0.5x reduction\n');
  
  console.log('3. Benefits:');
  console.log('   ✅ Rewards high-conviction signals');
  console.log('   ✅ Reduces risk on uncertain signals');
  console.log('   ✅ More aggressive on strong opportunities');
  console.log('   ✅ Better capital allocation\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testExponentialScoring().catch(console.error);


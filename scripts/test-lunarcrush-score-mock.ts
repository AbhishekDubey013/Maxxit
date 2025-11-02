/**
 * Test LunarCrush Trading Score System with MOCK DATA
 * Shows how the -1 to 1 scoring works without needing API access
 */

import { createMockLunarCrushScorer } from '../lib/lunarcrush-score-mock';

async function testScoringSystemWithMockData() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   LunarCrush Trading Score System - MOCK DATA TEST           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const scorer = createMockLunarCrushScorer();

  // Test tokens with realistic mock data
  const tokens = ['BTC', 'ETH', 'SOL', 'DOGE', 'SHIB', 'ARB', 'MATIC', 'LINK'];

  console.log('Testing tokens with mock data:', tokens.join(', '));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const token of tokens) {
    try {
      console.log(`\n📊 ${token} Analysis:\n`);
      
      const score = await scorer.getTokenScore(token);

      // Display results
      console.log(`Score: ${score.score.toFixed(3)} ${getScoreEmoji(score.score)}`);
      console.log(`Tradeable: ${score.tradeable ? '✅ YES' : '❌ NO'}`);
      console.log(`Position Size: ${score.positionSize.toFixed(2)}% of fund`);
      console.log(`Confidence: ${(score.confidence * 100).toFixed(1)}%`);
      
      console.log('\nBreakdown:');
      console.log(`  Galaxy Score:    ${formatScore(score.breakdown.galaxy)}`);
      console.log(`  Sentiment:       ${formatScore(score.breakdown.sentiment)}`);
      console.log(`  Social Volume:   ${formatScore(score.breakdown.social)}`);
      console.log(`  Price Momentum:  ${formatScore(score.breakdown.momentum)}`);
      console.log(`  Market Rank:     ${formatScore(score.breakdown.rank)}`);

      console.log(`\nReasoning: ${score.reasoning}`);

      // Show trade decision
      if (score.tradeable) {
        const fundSize = 1000; // Example: $1000 fund
        const tradeAmount = (fundSize * score.positionSize / 100).toFixed(2);
        console.log(`\n💰 Trade Decision:`);
        console.log(`   Fund: $${fundSize}`);
        console.log(`   Size: ${score.positionSize.toFixed(2)}%`);
        console.log(`   Amount: $${tradeAmount}`);
        console.log(`   Action: BUY ${token}`);
      } else {
        console.log(`\n❌ Trade Decision: DO NOT TRADE`);
        console.log(`   Reason: Score ${score.score.toFixed(3)} is not positive`);
      }

      console.log('\n' + '─'.repeat(63));

    } catch (error: any) {
      console.log(`\n❌ Error analyzing ${token}:`, error.message);
      console.log('─'.repeat(63));
    }
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Scoring System Explained                                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Score Range: -1.0 to +1.0\n');
  console.log('Position Sizing (Exactly as requested):');
  console.log('  Score  0.0  →  0% (No trade)');
  console.log('  Score  0.2  →  2% of fund  ✅');
  console.log('  Score  0.5  →  5% of fund  ✅');
  console.log('  Score  1.0  → 10% of fund  ✅\n');

  console.log('Score Interpretation:');
  console.log('   0.8 to  1.0  → 🟢 Excellent (8-10%)');
  console.log('   0.5 to  0.8  → 🟢 Strong (5-8%)');
  console.log('   0.2 to  0.5  → 🟡 Moderate (2-5%)');
  console.log('   0.0 to  0.2  → 🟡 Weak (0-2%)');
  console.log('  -1.0 to  0.0  → 🔴 Negative (No trade)\n');

  console.log('Factors Weighted:');
  console.log('  • Galaxy Score:   30%');
  console.log('  • Sentiment:      25%');
  console.log('  • Social Volume:  20%');
  console.log('  • Price Momentum: 15%');
  console.log('  • Market Rank:    10%\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('✅ This is MOCK DATA for testing the scoring logic');
  console.log('   Replace with real API when LunarCrush API is working\n');
}

function getScoreEmoji(score: number): string {
  if (score >= 0.8) return '🟢🟢';
  if (score >= 0.5) return '🟢';
  if (score >= 0.2) return '🟡';
  if (score >= 0) return '⚪';
  if (score >= -0.5) return '🟠';
  return '🔴';
}

function formatScore(score: number): string {
  const formatted = score.toFixed(3);
  const bar = getProgressBar(score);
  return `${formatted.padStart(6)} ${bar}`;
}

function getProgressBar(score: number): string {
  const normalized = (score + 1) / 2; // Convert -1..1 to 0..1
  const filled = Math.round(normalized * 20);
  const empty = 20 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// Run test
testScoringSystemWithMockData().catch(console.error);


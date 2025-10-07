#!/usr/bin/env tsx
import { calculatePositionSize, calculateConfidence, DEFAULT_CONFIG, AGGRESSIVE_CONFIG } from '../lib/position-sizing';

console.log('📊 Dynamic Position Sizing Demonstration\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const scenarios = [
  { 
    balance: 9, 
    confidence: { score: 80, indicators: { tweet: 85, rsi: 75, macd: 80, volume: 75 } }, 
    desc: 'Current wallet (9 USDC), High confidence signal' 
  },
  { 
    balance: 9, 
    confidence: { score: 45, indicators: { tweet: 45, rsi: 40, macd: 50, volume: 45 } }, 
    desc: 'Current wallet (9 USDC), Low confidence signal' 
  },
  { 
    balance: 100, 
    confidence: { score: 75, indicators: { tweet: 80, rsi: 70, macd: 75, volume: 75 } }, 
    desc: 'Funded wallet (100 USDC), High confidence' 
  },
  { 
    balance: 100, 
    confidence: { score: 50, indicators: { tweet: 55, rsi: 50, macd: 45, volume: 50 } }, 
    desc: 'Funded wallet (100 USDC), Medium confidence' 
  },
  { 
    balance: 500, 
    confidence: { score: 85, indicators: { tweet: 90, rsi: 85, macd: 80, volume: 85 } }, 
    desc: 'Well-funded wallet (500 USDC), Very high confidence' 
  },
  { 
    balance: 1000, 
    confidence: { score: 65, indicators: { tweet: 70, rsi: 60, macd: 65, volume: 65 } }, 
    desc: 'Large wallet (1000 USDC), Good confidence' 
  },
];

console.log('Using DEFAULT (Conservative) Configuration:');
console.log(`  Max Position: 10% | High Confidence: 8% | Medium: 5% | Low: 2%`);
console.log(`  Reserve: 20% | Min Trade: $10 | Max Trade: $1000\n`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

scenarios.forEach((scenario, i) => {
  console.log(`\n${i + 1}. ${scenario.desc}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`   Wallet Balance: ${scenario.balance.toFixed(2)} USDC`);
  console.log(`   Signal Confidence: ${scenario.confidence.score}/100\n`);
  
  const result = calculatePositionSize(scenario.balance, scenario.confidence, DEFAULT_CONFIG);
  
  console.log(`   📈 TRADE SIZE: ${result.usdcAmount.toFixed(2)} USDC (${result.percentage.toFixed(2)}% of balance)`);
  console.log(`   🎯 Confidence Tier: ${result.confidence}`);
  console.log(`   💰 Available: ${result.availableBalance.toFixed(2)} USDC`);
  console.log(`   🔒 Reserved: ${result.reservedBalance.toFixed(2)} USDC\n`);
  
  console.log(`   Reasoning:`);
  result.reasoning.forEach(r => {
    const icon = r.includes('❌') ? '   ' : r.includes('Capped') ? '   ⚠️ ' : '   ✓ ';
    console.log(`${icon}${r}`);
  });
  
  console.log('');
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('🔥 Aggressive Configuration Comparison:\n');

const testScenario = { 
  balance: 500, 
  confidence: { score: 80, indicators: { tweet: 85, rsi: 80, macd: 75, volume: 80 } } 
};

console.log(`Scenario: 500 USDC wallet, 80/100 confidence\n`);

const conservativeResult = calculatePositionSize(testScenario.balance, testScenario.confidence, DEFAULT_CONFIG);
const aggressiveResult = calculatePositionSize(testScenario.balance, testScenario.confidence, AGGRESSIVE_CONFIG);

console.log(`Conservative: ${conservativeResult.usdcAmount.toFixed(2)} USDC (${conservativeResult.percentage.toFixed(2)}%)`);
console.log(`Aggressive:   ${aggressiveResult.usdcAmount.toFixed(2)} USDC (${aggressiveResult.percentage.toFixed(2)}%)`);
console.log(`\nDifference: +${(aggressiveResult.usdcAmount - conservativeResult.usdcAmount).toFixed(2)} USDC\n`);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Dynamic Position Sizing Benefits:\n');
console.log('   ✓ Trades scale with wallet balance');
console.log('   ✓ Higher confidence = larger positions');
console.log('   ✓ Always keeps reserve for safety');
console.log('   ✓ Respects min/max limits');
console.log('   ✓ Adapts to different risk profiles\n');

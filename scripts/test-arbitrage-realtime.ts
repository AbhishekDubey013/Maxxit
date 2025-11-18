#!/usr/bin/env ts-node
/**
 * Real-time arbitrage checker - Ostium vs Hyperliquid
 * Tests actual price differences RIGHT NOW
 */

const OSTIUM_SERVICE = process.env.OSTIUM_SERVICE_URL || 'https://maxxit-1.onrender.com';
const HYPERLIQUID_SERVICE = process.env.HYPERLIQUID_SERVICE_URL || 'https://hyperliquid-service.onrender.com';

// Markets to check (available on both venues)
const MARKETS = ['BTC', 'ETH', 'SOL', 'XRP', 'LINK', 'ADA'];

interface PriceData {
  venue: string;
  token: string;
  price: number | null;
  error?: string;
  timestamp: number;
}

async function getOstiumPrice(token: string): Promise<PriceData> {
  const startTime = Date.now();
  try {
    console.log(`   Fetching from Ostium...`);
    const response = await fetch(`${OSTIUM_SERVICE}/price/${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    const fetchTime = Date.now() - startTime;
    
    if (!data.success) {
      return {
        venue: 'OSTIUM',
        token,
        price: null,
        error: data.error || 'Price unavailable',
        timestamp: Date.now(),
      };
    }
    
    console.log(`   ✅ Ostium response (${fetchTime}ms): $${data.price}`);
    
    return {
      venue: 'OSTIUM',
      token,
      price: parseFloat(data.price),
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.log(`   ❌ Ostium error: ${error.message}`);
    return {
      venue: 'OSTIUM',
      token,
      price: null,
      error: error.message,
      timestamp: Date.now(),
    };
  }
}

async function getHyperliquidPrice(token: string): Promise<PriceData> {
  const startTime = Date.now();
  try {
    console.log(`   Fetching from Hyperliquid...`);
    const response = await fetch(`${HYPERLIQUID_SERVICE}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: token }),
    });
    
    const data = await response.json();
    const fetchTime = Date.now() - startTime;
    
    if (!data.success || !data.price) {
      return {
        venue: 'HYPERLIQUID',
        token,
        price: null,
        error: data.error || 'Price unavailable',
        timestamp: Date.now(),
      };
    }
    
    console.log(`   ✅ Hyperliquid response (${fetchTime}ms): $${data.price}`);
    
    return {
      venue: 'HYPERLIQUID',
      token,
      price: parseFloat(data.price),
      timestamp: Date.now(),
    };
  } catch (error: any) {
    console.log(`   ❌ Hyperliquid error: ${error.message}`);
    return {
      venue: 'HYPERLIQUID',
      token,
      price: null,
      error: error.message,
      timestamp: Date.now(),
    };
  }
}

interface SpreadAnalysis {
  token: string;
  ostiumPrice: number;
  hyperliquidPrice: number;
  spreadDollar: number;
  spreadPercent: number;
  cheaperVenue: string;
  expensiveVenue: string;
  profitPer1000: number;
  tradeable: boolean;
  reason: string;
}

function analyzeSpread(ostium: PriceData, hyperliquid: PriceData): SpreadAnalysis | null {
  if (!ostium.price || !hyperliquid.price) {
    return null;
  }
  
  const spreadDollar = Math.abs(ostium.price - hyperliquid.price);
  const avgPrice = (ostium.price + hyperliquid.price) / 2;
  const spreadPercent = (spreadDollar / avgPrice) * 100;
  
  const cheaperVenue = ostium.price < hyperliquid.price ? 'OSTIUM' : 'HYPERLIQUID';
  const expensiveVenue = ostium.price < hyperliquid.price ? 'HYPERLIQUID' : 'OSTIUM';
  
  // Calculate profit on $1000 position
  // Fees: ~0.2% round trip (0.1% each side)
  const grossProfitPercent = spreadPercent;
  const feesPercent = 0.2;
  const netProfitPercent = grossProfitPercent - feesPercent;
  const profitPer1000 = (netProfitPercent / 100) * 1000;
  
  // Determine if tradeable
  let tradeable = false;
  let reason = '';
  
  if (spreadPercent < 0.2) {
    reason = 'Spread too small (< 0.2%) - fees eat profit';
  } else if (spreadPercent < 0.5) {
    reason = 'Marginal spread (0.2-0.5%) - risky after slippage';
    tradeable = true; // Maybe
  } else {
    reason = '🎯 GOOD OPPORTUNITY - Spread > 0.5%';
    tradeable = true;
  }
  
  return {
    token: ostium.token,
    ostiumPrice: ostium.price,
    hyperliquidPrice: hyperliquid.price,
    spreadDollar,
    spreadPercent,
    cheaperVenue,
    expensiveVenue,
    profitPer1000,
    tradeable,
    reason,
  };
}

async function checkRealTimePrices() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 REAL-TIME ARBITRAGE CHECK - Ostium vs Hyperliquid');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);
  console.log(`📡 Ostium Service: ${OSTIUM_SERVICE}`);
  console.log(`📡 Hyperliquid Service: ${HYPERLIQUID_SERVICE}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const opportunities: SpreadAnalysis[] = [];
  const errors: string[] = [];
  
  for (const token of MARKETS) {
    console.log(`\n📊 Checking ${token}:`);
    console.log('─────────────────────────────────────────────────────────');
    
    // Fetch prices from both venues simultaneously
    const [ostiumData, hyperliquidData] = await Promise.all([
      getOstiumPrice(token),
      getHyperliquidPrice(token),
    ]);
    
    // Show raw results
    console.log(`\n   Results:`);
    if (ostiumData.price) {
      console.log(`   ✅ Ostium:      $${ostiumData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } else {
      console.log(`   ❌ Ostium:      ${ostiumData.error}`);
      errors.push(`${token} (Ostium): ${ostiumData.error}`);
    }
    
    if (hyperliquidData.price) {
      console.log(`   ✅ Hyperliquid: $${hyperliquidData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    } else {
      console.log(`   ❌ Hyperliquid: ${hyperliquidData.error}`);
      errors.push(`${token} (Hyperliquid): ${hyperliquidData.error}`);
    }
    
    // Analyze spread if both prices available
    const analysis = analyzeSpread(ostiumData, hyperliquidData);
    
    if (analysis) {
      console.log(`\n   💹 Spread Analysis:`);
      console.log(`   Difference: $${analysis.spreadDollar.toFixed(2)} (${analysis.spreadPercent.toFixed(3)}%)`);
      console.log(`   Cheaper on: ${analysis.cheaperVenue}`);
      console.log(`   More expensive on: ${analysis.expensiveVenue}`);
      console.log(`   Profit per $1000: $${analysis.profitPer1000.toFixed(2)}`);
      console.log(`   ${analysis.reason}`);
      
      if (analysis.tradeable && analysis.spreadPercent >= 0.5) {
        opportunities.push(analysis);
      }
    } else {
      console.log(`\n   ⚠️  Cannot analyze spread (missing price data)`);
    }
  }
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    errors.forEach(err => console.log(`   • ${err}`));
    console.log();
  }
  
  if (opportunities.length === 0) {
    console.log('❌ No profitable arbitrage opportunities found');
    console.log('   All spreads < 0.5% or prices unavailable');
    console.log('\n   This is NORMAL - arbitrage is rare!');
    console.log('   Real opportunities appear during:');
    console.log('   • High volatility events');
    console.log('   • Major news announcements');
    console.log('   • Low liquidity hours');
    console.log('   • Oracle lags');
  } else {
    console.log(`✅ Found ${opportunities.length} profitable opportunity(ies)!\n`);
    
    // Sort by profit potential
    opportunities.sort((a, b) => b.profitPer1000 - a.profitPer1000);
    
    opportunities.forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.token}:`);
      console.log(`   Spread: ${opp.spreadPercent.toFixed(3)}%`);
      console.log(`   Strategy: Buy on ${opp.cheaperVenue} @ $${opp.ostiumPrice < opp.hyperliquidPrice ? opp.ostiumPrice.toFixed(2) : opp.hyperliquidPrice.toFixed(2)}`);
      console.log(`             Sell on ${opp.expensiveVenue} @ $${opp.ostiumPrice > opp.hyperliquidPrice ? opp.ostiumPrice.toFixed(2) : opp.hyperliquidPrice.toFixed(2)}`);
      console.log(`   Profit: $${opp.profitPer1000.toFixed(2)} per $1000 position`);
      console.log(`   ${opp.reason}\n`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('⏰ Check completed at:', new Date().toLocaleString());
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run the check
checkRealTimePrices().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});



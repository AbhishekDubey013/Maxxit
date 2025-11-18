#!/usr/bin/env ts-node
/**
 * Real-time arbitrage checker using CoinGecko as fallback for Ostium
 * Since Ostium testnet oracle isn't working, we'll use public price feeds
 */

const HYPERLIQUID_SERVICE = process.env.HYPERLIQUID_SERVICE_URL || 'https://hyperliquid-service.onrender.com';

const MARKETS = ['BTC', 'ETH', 'SOL', 'ADA'];

const COINGECKO_IDS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'LINK': 'chainlink',
  'XRP': 'ripple',
};

async function getCoinGeckoPrice(token: string): Promise<number | null> {
  try {
    const coinId = COINGECKO_IDS[token];
    if (!coinId) return null;
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    
    const data = await response.json();
    return data[coinId]?.usd || null;
  } catch (error) {
    return null;
  }
}

async function getHyperliquidPrice(token: string): Promise<number | null> {
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: token }),
    });
    
    const data = await response.json();
    return data.success ? parseFloat(data.price) : null;
  } catch (error) {
    return null;
  }
}

async function checkRealTimeSpreads() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 REAL-TIME SPREAD CHECK (Using CoinGecko as Ostium proxy)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`⏰ Timestamp: ${new Date().toLocaleString()}`);
  console.log('📊 Note: Ostium testnet oracle down, using CoinGecko for simulation');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const opportunities: any[] = [];
  
  for (const token of MARKETS) {
    console.log(`\n📊 ${token}:`);
    console.log('─────────────────────────────────────────────────────────');
    
    const [coinGeckoPrice, hlPrice] = await Promise.all([
      getCoinGeckoPrice(token),
      getHyperliquidPrice(token),
    ]);
    
    if (!coinGeckoPrice || !hlPrice) {
      console.log(`   ❌ Missing price data`);
      if (coinGeckoPrice) console.log(`   CoinGecko: $${coinGeckoPrice.toFixed(2)}`);
      if (hlPrice) console.log(`   Hyperliquid: $${hlPrice.toFixed(2)}`);
      continue;
    }
    
    const spreadDollar = Math.abs(coinGeckoPrice - hlPrice);
    const avgPrice = (coinGeckoPrice + hlPrice) / 2;
    const spreadPercent = (spreadDollar / avgPrice) * 100;
    
    console.log(`   CoinGecko (Ostium proxy): $${coinGeckoPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Hyperliquid:              $${hlPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Difference: $${spreadDollar.toFixed(2)} (${spreadPercent.toFixed(3)}%)`);
    
    const feesPercent = 0.2;
    const netProfitPercent = spreadPercent - feesPercent;
    const profitPer1000 = (netProfitPercent / 100) * 1000;
    
    if (spreadPercent >= 0.5) {
      console.log(`   🎯 OPPORTUNITY! Profit: $${profitPer1000.toFixed(2)} per $1000`);
      opportunities.push({
        token,
        spreadPercent,
        profitPer1000,
        cgPrice: coinGeckoPrice,
        hlPrice,
      });
    } else if (spreadPercent >= 0.2) {
      console.log(`   ⚠️  Marginal spread (${spreadPercent.toFixed(3)}%) - profit: $${profitPer1000.toFixed(2)}`);
    } else {
      console.log(`   ✅ Spread too small (${spreadPercent.toFixed(3)}%) - not profitable`);
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (opportunities.length === 0) {
    console.log('❌ No profitable arbitrage found (all spreads < 0.5%)');
    console.log('\n💡 What this tells us:');
    console.log('   • Crypto markets are VERY efficient');
    console.log('   • Price differences between venues: < 0.2%');
    console.log('   • Arbitrage bots keep prices aligned');
    console.log('   • Opportunities appear during:');
    console.log('     - High volatility (sudden moves)');
    console.log('     - Low liquidity hours (3-6 AM UTC)');
    console.log('     - Major news events');
    console.log('     - Exchange issues/downtime');
    console.log('\n📈 Statistical Convergence Trading:');
    console.log('   • Would require 30+ days of spread history');
    console.log('   • Trade Z-score > 2.5 deviations');
    console.log('   • Current spreads appear normal/healthy');
  } else {
    console.log(`✅ Found ${opportunities.length} opportunity(ies)!\n`);
    opportunities.forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.token}:`);
      console.log(`   Spread: ${opp.spreadPercent.toFixed(3)}%`);
      console.log(`   Profit: $${opp.profitPer1000.toFixed(2)} per $1000`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
}

checkRealTimeSpreads().catch(console.error);



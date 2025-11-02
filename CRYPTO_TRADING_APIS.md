# Crypto Trading Signal & Analysis REST APIs

## 🎯 Overview

This document lists REST APIs that can provide trading recommendations, token analysis, and signals for cryptocurrency trading - basically APIs where you can query about a token and get advice on whether/how to trade it.

---

## 🤖 AI-Powered Trading Signal APIs

### 1. AIXBT MCP Server API

**Provider:** AIXBT Labs (Virtuals Protocol)  
**Type:** AI-driven market intelligence  
**Access:** REST API via Model Context Protocol (MCP)

#### **Capabilities:**
- ✅ Token analysis and recommendations
- ✅ Real-time market insights
- ✅ Trading signals (buy/sell/hold)
- ✅ Social sentiment analysis (400+ KOLs)
- ✅ Whale movement tracking
- ✅ Market narrative analysis

#### **Setup:**

```bash
# Install MCP Server
git clone https://github.com/aixbt/mcp-server.git
cd mcp-server

# Configure API key
cp .env.example .env
# Edit .env: Add your AIXBT_API_KEY

# Install and build
npm install
npm run build
npm start
```

#### **API Usage Example:**

```typescript
// Query token recommendation
const response = await fetch('http://localhost:3000/api/analyze', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AIXBT_API_KEY}`
  },
  body: JSON.stringify({
    token: 'BTC',
    query: 'should I trade this?'
  })
});

const data = await response.json();
console.log(data.recommendation); // BUY/SELL/HOLD
console.log(data.confidence); // 0.8
console.log(data.reasoning); // "Strong whale accumulation..."
```

#### **Pricing:**
- Basic queries: FREE (with API key)
- Premium features: 600k AIXBT tokens or $200/month
- Rate limits: TBD (check documentation)

#### **Documentation:**
- 🔗 https://aixbt-labs.gitbook.io/v1/sdk-docs/mcp-setup
- 🔗 https://github.com/aixbt/mcp-server

---

### 2. DappLooker Unified Token Intelligence API

**Provider:** DappLooker  
**Type:** On-chain data + Technical analysis  
**Access:** REST API

#### **Capabilities:**
- ✅ Technical indicators (support/resistance)
- ✅ Token fundamentals
- ✅ On-chain metrics
- ✅ Trading volume analysis
- ✅ Liquidity data

#### **API Endpoints:**

```typescript
// Get token intelligence
GET https://api.dapplooker.com/v1/token/intelligence
Query params:
  - token: Token address or symbol
  - chain: ethereum/polygon/arbitrum
  - indicators: support,resistance,volume

// Example response
{
  "token": "WETH",
  "support_levels": [2800, 2750, 2700],
  "resistance_levels": [3000, 3100, 3200],
  "volume_24h": 1250000000,
  "technical_score": 7.5,
  "recommendation": "NEUTRAL"
}
```

#### **Pricing:**
- Free tier: 100 requests/day
- Pro: $49/month (5000 requests/day)
- Enterprise: Custom pricing

#### **Documentation:**
- 🔗 https://docs.dapplooker.com/data-apis-for-ai/api-endpoints/unified-token-intelligence-api

---

## 📊 Market Data & Sentiment APIs

### 3. LunarCrush API

**Provider:** LunarCrush  
**Type:** Social intelligence + Sentiment analysis

#### **Capabilities:**
- ✅ Social volume (mentions, engagement)
- ✅ Sentiment scores (bullish/bearish)
- ✅ Galaxy Score™ (overall ranking)
- ✅ Alt Rank™ (alternative coin ranking)
- ✅ Influencer tracking

#### **API Example:**

```typescript
// Get token sentiment
GET https://api.lunarcrush.com/v2
Query params:
  - data: assets
  - symbol: BTC
  - data_points: 30

// Response
{
  "data": [{
    "symbol": "BTC",
    "galaxy_score": 72,
    "alt_rank": 1,
    "sentiment": 0.68, // 0-1 (bearish to bullish)
    "social_volume": 125000,
    "recommendation": "STRONG_BUY"
  }]
}
```

#### **Pricing:**
- Free: Limited (5 requests/minute)
- Starter: $99/month
- Professional: $199/month
- Enterprise: Custom

#### **Documentation:**
- 🔗 https://lunarcrush.com/developers/api

---

### 4. Santiment API

**Provider:** Santiment  
**Type:** On-chain + Social metrics

#### **Capabilities:**
- ✅ Network activity (transactions, active addresses)
- ✅ Token age consumed (HODL behavior)
- ✅ Exchange flow (inflow/outflow)
- ✅ Developer activity
- ✅ Social sentiment

#### **API Example:**

```graphql
# GraphQL API
query {
  getMetric(metric: "social_volume_total") {
    timeseriesData(
      slug: "bitcoin"
      from: "2024-01-01T00:00:00Z"
      to: "2024-01-07T00:00:00Z"
      interval: "1d"
    ) {
      datetime
      value
    }
  }
}
```

#### **Pricing:**
- Free: Basic metrics
- Pro: $49/month
- Pro+: $149/month
- Enterprise: Custom

#### **Documentation:**
- 🔗 https://api.santiment.net/graphiql

---

### 5. CryptoCompare API

**Provider:** CryptoCompare  
**Type:** Price data + Technical indicators

#### **Capabilities:**
- ✅ OHLCV data (historical prices)
- ✅ Technical indicators (RSI, MACD, Bollinger Bands)
- ✅ Social stats (Reddit, Twitter mentions)
- ✅ News sentiment
- ✅ Trading signals

#### **API Example:**

```typescript
// Get trading signals
GET https://min-api.cryptocompare.com/data/tradingsignals/intotheblock/latest
Query params:
  - fsym: BTC
  - tsym: USD

// Response
{
  "inOutVar": {
    "signal": "bullish",
    "score": 75
  },
  "largeTransactions": {
    "signal": "bullish"
  },
  "recommendation": "BUY"
}
```

#### **Pricing:**
- Free: 100,000 calls/month
- Streamer: $45/month
- Trader: $95/month
- Business: Custom

#### **Documentation:**
- 🔗 https://min-api.cryptocompare.com/documentation

---

### 6. Glassnode API

**Provider:** Glassnode  
**Type:** On-chain analytics

#### **Capabilities:**
- ✅ On-chain metrics (HODL waves, SOPR, MVRV)
- ✅ Exchange flows
- ✅ Mining data
- ✅ Derivatives data
- ✅ Network health

#### **API Example:**

```typescript
// Get MVRV ratio (Market Value to Realized Value)
GET https://api.glassnode.com/v1/metrics/market/mvrv
Query params:
  - a: BTC
  - api_key: YOUR_API_KEY

// Response
{
  "t": 1609459200,
  "v": 2.5  // MVRV > 2.5 = potentially overvalued
}
```

#### **Pricing:**
- Free: Limited metrics
- Advanced: $29/month
- Professional: $799/month
- Enterprise: Custom

#### **Documentation:**
- 🔗 https://docs.glassnode.com/api/

---

### 7. CoinGecko API

**Provider:** CoinGecko  
**Type:** Price data + Market stats

#### **Capabilities:**
- ✅ Real-time prices
- ✅ Market cap rankings
- ✅ Trading volume
- ✅ Developer stats
- ✅ Community stats

#### **API Example:**

```typescript
// Get market data
GET https://api.coingecko.com/api/v3/coins/bitcoin
Query params:
  - localization: false
  - tickers: true
  - market_data: true
  - community_data: true
  - developer_data: true

// Response includes:
// - current_price
// - market_cap_rank
// - sentiment_votes_up_percentage
// - developer_score
```

#### **Pricing:**
- Free: 10-50 calls/minute
- Analyst: $129/month (500 calls/minute)
- Pro: $499/month (10,000 calls/minute)

#### **Documentation:**
- 🔗 https://www.coingecko.com/en/api/documentation

---

## 🔌 How to Integrate with Your Maxxit Agent

### Option 1: Multi-Source Signal Validation

Combine multiple APIs for stronger signals:

```typescript
async function getTokenRecommendation(token: string) {
  // Get data from multiple sources
  const [aixbt, lunarCrush, santiment, glassnode] = await Promise.all([
    getAixbtAnalysis(token),
    getLunarCrushSentiment(token),
    getSantimentMetrics(token),
    getGlassnodeOnChain(token)
  ]);

  // Combine signals
  const signals = {
    ai_recommendation: aixbt.recommendation, // BUY/SELL/HOLD
    ai_confidence: aixbt.confidence, // 0-1
    social_sentiment: lunarCrush.sentiment, // 0-1
    network_health: santiment.activeAddresses,
    on_chain_signal: glassnode.mvrv > 2.5 ? 'SELL' : 'BUY'
  };

  // Calculate composite score
  const buySignals = [
    signals.ai_recommendation === 'BUY',
    signals.social_sentiment > 0.6,
    signals.on_chain_signal === 'BUY'
  ].filter(Boolean).length;

  return {
    recommendation: buySignals >= 2 ? 'BUY' : 'HOLD',
    confidence: (buySignals / 3),
    sources: signals
  };
}
```

### Option 2: Add to Signal Generator

Enhance your existing signal generation:

```typescript
// In lib/signal-generator.ts
class SignalGenerator {
  async generateSignal(tweet: Tweet) {
    // Existing: Parse tweet for token
    const token = this.extractToken(tweet.text);
    
    // NEW: Validate with APIs
    const apiValidation = await this.validateWithAPIs(token);
    
    // Only create signal if APIs agree
    if (apiValidation.confidence > 0.7) {
      return this.createSignal({
        token,
        sentiment: tweet.sentiment,
        api_validation: apiValidation,
        confidence: apiValidation.confidence
      });
    }
    
    return null; // Skip if APIs disagree
  }
  
  async validateWithAPIs(token: string) {
    const aixbt = await getAixbtRecommendation(token);
    const lunarCrush = await getLunarCrushScore(token);
    
    return {
      recommendation: aixbt.recommendation,
      confidence: (aixbt.confidence + lunarCrush.galaxyScore / 100) / 2,
      reasoning: `${aixbt.reasoning}. Galaxy Score: ${lunarCrush.galaxyScore}`
    };
  }
}
```

### Option 3: Telegram Query Feature

Add query command to your Telegram bot:

```typescript
// In lib/telegram-bot.ts
async handleQuery(message: string) {
  // Extract token from query
  const token = message.match(/\$([A-Z]+)/)?.[1];
  
  if (!token) {
    return "Please specify a token, e.g., 'analyze $BTC'";
  }
  
  // Query multiple APIs
  const analysis = await getMultiSourceAnalysis(token);
  
  return `
📊 Analysis for $${token}

🤖 AI Recommendation: ${analysis.recommendation}
📈 Confidence: ${(analysis.confidence * 100).toFixed(1)}%
💬 Social Sentiment: ${analysis.socialScore}/10
🔗 On-chain Signal: ${analysis.onChainSignal}

${analysis.reasoning}

⚠️ This is not financial advice. DYOR.
  `;
}
```

---

## 💰 Cost Comparison

| API | Free Tier | Paid Plans | Best For |
|-----|-----------|------------|----------|
| **AIXBT** | Basic queries | $200/month or 600k tokens | AI-powered recommendations |
| **DappLooker** | 100 req/day | $49+/month | Technical indicators |
| **LunarCrush** | 5 req/min | $99-$199/month | Social sentiment |
| **Santiment** | Basic metrics | $49-$149/month | On-chain + social |
| **CryptoCompare** | 100k calls/mo | $45-$95/month | Price + signals |
| **Glassnode** | Limited | $29-$799/month | Deep on-chain |
| **CoinGecko** | 10-50 calls/min | $129-$499/month | Market data |

---

## 🎯 Recommended Stack for Maxxit

### Minimal Setup (Free)
```
1. CoinGecko API (free tier) - Price data
2. AIXBT MCP (basic) - AI recommendations
3. Your existing influencer signals
```

### Enhanced Setup ($150/month)
```
1. LunarCrush Pro ($99) - Social sentiment
2. DappLooker Pro ($49) - Technical indicators
3. AIXBT basic (free) - AI validation
4. Your existing influencer signals
```

### Professional Setup ($500+/month)
```
1. LunarCrush Pro ($199) - Social sentiment
2. Santiment Pro+ ($149) - On-chain + social
3. CryptoCompare Trader ($95) - Signals + news
4. Glassnode Advanced ($29) - On-chain metrics
5. AIXBT MCP (basic) - AI validation
6. Your existing influencer signals
```

---

## ⚠️ Important Considerations

### 1. **Rate Limits**
- Each API has different rate limits
- Plan accordingly for your request volume
- Consider caching responses

### 2. **Cost Management**
- Start with free tiers
- Monitor actual usage
- Upgrade only if needed

### 3. **Signal Reliability**
- No API is 100% accurate
- Use multiple sources for validation
- Always include risk management

### 4. **Latency**
- API calls add latency
- Consider async processing
- Cache when possible

### 5. **Legal & Compliance**
- APIs provide data, not financial advice
- You're responsible for trading decisions
- Include disclaimers

---

## 🚀 Quick Start: Adding aixbt to Maxxit

### Step 1: Get API Key
```bash
# Request from AIXBT Labs
# https://aixbt-labs.gitbook.io/
```

### Step 2: Set Up MCP Server
```bash
git clone https://github.com/aixbt/mcp-server.git
cd mcp-server
cp .env.example .env
# Add your AIXBT_API_KEY to .env
npm install && npm run build && npm start
```

### Step 3: Create API Client
```typescript
// lib/aixbt-client.ts
export class AixbtClient {
  private apiUrl = 'http://localhost:3000/api';
  
  async analyzeToken(token: string): Promise<{
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
  }> {
    const response = await fetch(`${this.apiUrl}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, query: 'should I trade this?' })
    });
    return response.json();
  }
}
```

### Step 4: Integrate with Signal Generator
```typescript
// In signal-generator.ts
const aixbt = new AixbtClient();

async function validateSignal(token: string) {
  const analysis = await aixbt.analyzeToken(token);
  
  if (analysis.confidence < 0.7) {
    console.log(`[AIXBT] Low confidence for ${token}, skipping`);
    return false;
  }
  
  console.log(`[AIXBT] ${token}: ${analysis.recommendation} (${analysis.confidence})`);
  return true;
}
```

---

## 📝 Summary

### ✅ Yes, REST APIs Exist for Token Trading Recommendations!

**Top Options:**

1. **AIXBT MCP** - AI-powered, comprehensive (FREE basic, $200/month premium)
2. **LunarCrush** - Social sentiment leader ($99+/month)
3. **Santiment** - On-chain + social ($49+/month)
4. **DappLooker** - Technical indicators ($49+/month)
5. **CryptoCompare** - Signals + data ($45+/month)

**Recommendation for Maxxit:**
- Start with **AIXBT MCP (free)** for AI validation
- Add **LunarCrush ($99)** if you want social sentiment
- Use as **signal validation**, not primary source
- Keep your influencer-based signals as main source

**Integration Approach:**
1. Query APIs for validation (not primary signals)
2. Combine multiple sources for confidence
3. Add to existing tweet-based flow
4. Use for risk management

---

**Last Updated:** November 2, 2025  
**Next Steps:** Choose 1-2 APIs, get API keys, test integration


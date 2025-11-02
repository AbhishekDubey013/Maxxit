# AIXBT MCP Server - Complete Explanation

## 🤖 What is MCP?

**MCP** = **Model Context Protocol**

### Overview

**Model Context Protocol (MCP)** is an open standard created by **Anthropic** (makers of Claude AI) that allows AI assistants to **connect to external data sources and tools**.

Think of it as a **universal connector** between:
- AI assistants (like Claude)
- External APIs and data sources (like AIXBT, databases, APIs)

---

## 🔌 How MCP Works

### Traditional Approach (Without MCP)

```
User → AI Assistant
         ↓
    AI can only use its training data
    (No real-time data, no external tools)
```

**Limitations:**
- ❌ No real-time data
- ❌ Can't access APIs
- ❌ Can't query databases
- ❌ Static responses only

### With MCP (Modern Approach)

```
User → AI Assistant (Claude Desktop)
         ↓
    MCP Server (Acts as bridge)
         ↓
    External API (AIXBT, databases, tools)
         ↓
    Real-time data back to AI
```

**Benefits:**
- ✅ Real-time data access
- ✅ Can use external tools
- ✅ Can query APIs/databases
- ✅ Dynamic, up-to-date responses

---

## 🎯 What is AIXBT MCP Server?

**AIXBT MCP Server** is a **specific implementation of MCP** that connects:
- **AI assistants** (like Claude Desktop)
- **AIXBT's cryptocurrency data API**

### Purpose

Allows you to ask Claude (or other AI) questions like:
```
"What are the top crypto projects right now?"
"Should I trade BTC based on current data?"
"Show me AIXBT's analysis on ETH"
```

And Claude will:
1. Use the MCP server
2. Query AIXBT's API
3. Get real-time crypto data
4. Provide informed answer

---

## 🏗️ Architecture

### Component Breakdown

```
┌──────────────────────────────────────────────────────────────┐
│  You (User)                                                   │
└────────────────────────┬─────────────────────────────────────┘
                         │ "Should I trade BTC?"
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  Claude Desktop (AI Assistant)                                │
│  - Understands your question                                  │
│  - Knows it needs crypto data                                 │
└────────────────────────┬─────────────────────────────────────┘
                         │ Uses MCP to request data
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  AIXBT MCP Server (Bridge/Translator)                         │
│  - Translates AI request to API call                          │
│  - Formats response for AI                                    │
└────────────────────────┬─────────────────────────────────────┘
                         │ Makes API call
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  AIXBT API (Data Source)                                      │
│  - Returns real-time crypto analysis                          │
│  - Token rankings, sentiment, signals                         │
└────────────────────────┬─────────────────────────────────────┘
                         │ Data flows back up
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  Claude Desktop                                               │
│  Response: "Based on AIXBT data, BTC shows bullish           │
│  sentiment (score: 8.5/10) with strong whale accumulation.   │
│  Consider buying with stop-loss at $43k."                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 How AIXBT MCP Server Works

### 1. Installation

```bash
# MCP Server is installed via npm
npx @aixbt/mcp-server

# Or clone and run manually
git clone https://github.com/aixbt/mcp-server.git
cd mcp-server
npm install && npm run build
```

### 2. Configuration

Add to Claude Desktop config (`claude-desktop-config.json`):

```json
{
  "mcpServers": {
    "aixbt_mcp": {
      "command": "npx",
      "args": ["@aixbt/mcp-server"],
      "env": {
        "API_KEY": "your-aixbt-api-key"
      }
    }
  }
}
```

### 3. How It Runs

When you ask Claude a crypto question:

1. **Claude detects** it needs crypto data
2. **MCP Server activates** (runs in background)
3. **Server calls AIXBT API** with your key
4. **API returns data** (token analysis, sentiment, etc.)
5. **MCP formats data** for Claude
6. **Claude provides answer** using real-time data

---

## 📊 What Data AIXBT MCP Provides

### Available Tools

1. **Project Rankings**
   - Top crypto projects by AIXBT score
   - Customizable parameters (limit, offset)
   - Real-time rankings

2. **Token Analysis**
   - Individual token data
   - Sentiment scores
   - Technical indicators

3. **Market Insights**
   - Whale movements
   - Social sentiment (from 400+ KOLs)
   - Trading signals

### Example Queries

```
User: "What are the top 10 crypto projects?"
→ MCP queries AIXBT rankings
→ Returns: [BTC, ETH, SOL, ... with scores]

User: "Should I buy ETH now?"
→ MCP queries AIXBT analysis for ETH
→ Returns: Sentiment, signals, recommendation

User: "Show me projects with Galaxy Score > 80"
→ MCP filters AIXBT data
→ Returns: Filtered project list
```

---

## 🆚 MCP Server vs Direct API

### Direct API Approach

**Without MCP:**
```typescript
// You write code
const response = await fetch('https://aixbt-api.com/analyze', {
  method: 'POST',
  body: JSON.stringify({ token: 'BTC' })
});

const data = await response.json();
console.log(data.recommendation);
```

**Requires:**
- ❌ Manual coding
- ❌ API knowledge
- ❌ Handle authentication
- ❌ Parse responses
- ❌ Error handling

### MCP Approach

**With MCP:**
```
You: "Claude, should I trade BTC?"
Claude: [Uses MCP automatically]
        "Based on AIXBT data, BTC is bullish..."
```

**Benefits:**
- ✅ No coding needed
- ✅ Natural language
- ✅ Automatic handling
- ✅ AI interprets data
- ✅ Conversational

---

## 🔐 Security & Authentication

### How API Keys Work

1. **Your API Key** → Stored in MCP config
2. **MCP Server** → Uses key to authenticate with AIXBT
3. **AIXBT API** → Validates key, returns data
4. **MCP** → Formats data for AI
5. **Claude** → Shows you the results

**Your API key never leaves your machine** - MCP runs locally.

---

## 💡 Use Cases

### For Traders

**Query:**
```
"What's AIXBT's sentiment on SOL right now?"
```

**Response:**
```
Based on AIXBT analysis:
- Sentiment: Bullish (7.5/10)
- Social volume: High (+35% vs average)
- Whale activity: Accumulation detected
- Recommendation: Consider entry on dips
```

### For Researchers

**Query:**
```
"Show me the top 5 AI crypto projects by AIXBT score"
```

**Response:**
```
Top 5 AI Crypto Projects:
1. TAO (Bittensor) - Score: 8.9
2. RENDER - Score: 8.4
3. FET (Fetch.ai) - Score: 8.2
4. OCEAN - Score: 7.8
5. AGIX - Score: 7.5
```

### For Portfolio Management

**Query:**
```
"Analyze my portfolio: BTC, ETH, SOL"
```

**Response:**
```
Portfolio Analysis via AIXBT:

BTC: Bullish (8.5/10) - Strong momentum
ETH: Neutral (6.0/10) - Consolidation phase
SOL: Very Bullish (9.0/10) - Whale accumulation

Recommendation: Hold BTC, Consider adding SOL
```

---

## 🚀 How to Use with Your Maxxit Agent

### Option 1: Manual Research (via Claude)

**Use Claude + AIXBT MCP for manual validation:**

```
Before deploying your agent:
1. Open Claude Desktop (with AIXBT MCP)
2. Ask: "What's AIXBT's take on the tokens my agent tracks?"
3. Use insights to adjust agent settings
```

### Option 2: Programmatic Integration

**Build your own MCP-like integration:**

```typescript
// Your Maxxit agent can query AIXBT directly
import { AixbtClient } from '@aixbt/mcp-server';

const aixbt = new AixbtClient(API_KEY);

async function validateSignal(token: string) {
  // Get AIXBT analysis
  const analysis = await aixbt.analyzeToken(token);
  
  // Only trade if AIXBT agrees
  if (analysis.recommendation === 'BUY' && analysis.confidence > 0.7) {
    return true; // Execute trade
  }
  
  return false; // Skip trade
}
```

### Option 3: Hybrid Approach

**Combine automated + manual:**

```
1. Maxxit agent generates signals (automated)
2. High-value signals → Query AIXBT via MCP
3. Manual review in Claude with AIXBT data
4. Execute trades with confidence
```

---

## 📚 MCP Standards

### What Makes MCP Special

**Universal Protocol:**
- Works with any AI assistant (not just Claude)
- Works with any data source (not just AIXBT)
- Open standard (anyone can implement)

**Other MCP Servers Available:**

- Database connectors (PostgreSQL, MongoDB)
- File system access
- Web search
- Calculator tools
- GitHub integration
- And more...

### The Future

MCP is becoming the **standard way** for AI to access external tools.

Similar to how **HTTP** became the standard for web:
- MCP = Standard for AI ↔ Tool communication
- Anyone can create MCP servers
- Any AI can use MCP servers

---

## 🎯 Should You Use AIXBT MCP?

### ✅ Use It If:

1. **Manual Trading/Research**
   - You want to ask questions
   - Need quick analysis
   - Don't want to code

2. **Validation Layer**
   - Double-check your signals
   - Get second opinion
   - Manual confirmation

3. **Learning/Exploring**
   - Understand crypto markets
   - Learn about tokens
   - Research projects

### ❌ Don't Use It If:

1. **Fully Automated Trading**
   - Too slow (conversational)
   - Need millisecond execution
   - Want 100% automation

2. **High-Frequency Trading**
   - MCP adds latency
   - Conversational interface
   - Not designed for speed

3. **You Already Have Direct API**
   - Direct API is faster
   - More control
   - Better for automation

---

## 💰 Pricing & Access

### AIXBT API Key

**Required:** AIXBT API key to use MCP server

**How to Get:**
1. Visit AIXBT platform
2. Request API access
3. Add key to MCP config

**Cost:**
- Basic queries: Likely FREE or low cost
- Premium features: May require AIXBT tokens or subscription

*(Check AIXBT documentation for current pricing)*

---

## 🔗 Resources

### Official Documentation

- **AIXBT MCP Setup**: https://aixbt-labs.gitbook.io/v1/sdk-docs/mcp-setup
- **AIXBT GitHub**: https://github.com/aixbt/mcp-server
- **Anthropic MCP**: https://modelcontextprotocol.io/
- **Claude Desktop**: https://claude.ai/desktop

### Related Technologies

- **Model Context Protocol**: Open standard by Anthropic
- **Claude Desktop**: AI assistant with MCP support
- **AIXBT API**: Crypto intelligence data
- **TypeScript**: Implementation language

---

## 📝 Summary

### What is AIXBT MCP Server?

**In Simple Terms:**
A **bridge** that lets **AI assistants** (like Claude) access **real-time crypto data** from **AIXBT**.

**Technical Terms:**
An **MCP implementation** that provides **cryptocurrency analysis tools** to **AI assistants** via the **Model Context Protocol**.

### Key Points

1. **MCP** = Model Context Protocol (by Anthropic)
2. **AIXBT MCP Server** = Specific implementation for crypto data
3. **Purpose** = Let AI access AIXBT's real-time crypto analysis
4. **Usage** = Ask AI questions → Get data-backed answers
5. **Setup** = Configure Claude Desktop with API key
6. **Cost** = Requires AIXBT API key

### For Your Maxxit Agent

**Best Use:**
- **Manual validation** of your automated signals
- **Research** before deploying agent
- **Double-checking** high-value trades

**Not For:**
- Fully automated execution (too slow)
- High-frequency trading (conversational interface)
- Replacing your core signal generation

---

**Last Updated:** November 2, 2025  
**More Info:** See `AIXBT_ANALYSIS.md` and `CRYPTO_TRADING_APIS.md`


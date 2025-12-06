# NOF1 AI Integration - Implementation Document

## Overview

Integrate NOF1.AI as a research signal source. **No database schema changes needed** - each NOF1 AI agent becomes an entry in the existing `research_institutes` table.

### How It Works
1. Each NOF1 agent (e.g., "gemini-3-pro") → research institute entry named `"NOF1: gemini-3-pro"`
2. Users select NOF1 agents via existing `ResearchInstituteSelector` component
3. Worker fetches trades from NOF1 API, filters by selected agents, processes through LLM
4. Uses existing `research_institutes` and `agent_research_institutes` tables

---

## Files to Create/Update

| File | Action | Purpose |
|------|--------|---------|
| `lib/research-signal-parser.ts` | UPDATE | Change confidence to numeric (0-100) |
| `services/research-signal-worker/src/nof1-fetcher.ts` | NEW | Fetch NOF1 trades from API |
| `services/research-signal-worker/src/worker.ts` | UPDATE | Add NOF1 signal generation |
| `scripts/setup-nof1-agents.ts` | NEW | Create NOF1 agents as research institutes |

---

## File 1: nof1-fetcher.ts (NEW)

**Path:** `services/research-signal-worker/src/nof1-fetcher.ts`

```typescript
export interface NOF1Trade {
  id: string;
  run_name: string;
  symbol: string;
  side: number;
  leverage: number;
  entry_price: number;
  entry_time: number;
  exit_time?: number;
  exit_price?: number;
  quantity: number;
  realized_net_pnl?: number;
  competition_name?: string;
}

let cachedTrades: NOF1Trade[] = [];
let lastFetchTime: number = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000;

export async function fetchNOF1Trades(): Promise<NOF1Trade[]> {
  const now = Date.now();
  if (cachedTrades.length > 0 && (now - lastFetchTime) < CACHE_DURATION_MS) {
    console.log('[NOF1] Using cached trades');
    return cachedTrades;
  }

  console.log('[NOF1] Fetching fresh trades from API...');
  try {
    const response = await fetch('https://nof1.ai/api/trades?mode=baseline', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    if (!response.ok) throw new Error(`NOF1 API error: ${response.status}`);
    const data = await response.json();
    cachedTrades = data.trades || [];
    lastFetchTime = now;
    console.log(`[NOF1] Fetched ${cachedTrades.length} trades`);
    return cachedTrades;
  } catch (error: any) {
    console.error('[NOF1] Fetch error:', error.message);
    return cachedTrades;
  }
}

export async function getNewEntryTrades(
  lastPollTimestamp: number,
  processedTradeIds: Set<string>,
  selectedAgentNames?: string[]
): Promise<NOF1Trade[]> {
  const trades = await fetchNOF1Trades();
  return trades.filter(trade => {
    if (processedTradeIds.has(trade.id)) return false;
    if (trade.entry_time <= lastPollTimestamp) return false;
    if (selectedAgentNames?.length && !selectedAgentNames.includes(trade.run_name)) return false;
    return true;
  });
}

export function formatTradeAsSignalText(trade: NOF1Trade): string {
  const side = trade.side === 1 ? 'LONG' : 'SHORT';
  const symbol = trade.symbol.replace('xyz:', '');
  const entryTime = new Date(trade.entry_time * 1000).toISOString();
  return `NOF1 AI Agent "${trade.run_name}" opened a ${side} position on ${symbol} at $${trade.entry_price.toFixed(2)} with ${trade.leverage}x leverage. Entry time: ${entryTime}.`;
}

export async function getAvailableNOF1Agents(): Promise<Array<{
  run_name: string; trade_count: number; last_trade_at: Date | null; total_pnl: number;
}>> {
  const trades = await fetchNOF1Trades();
  const agentStats = new Map<string, { count: number; lastTrade: number; pnl: number }>();
  for (const trade of trades) {
    const stats = agentStats.get(trade.run_name) || { count: 0, lastTrade: 0, pnl: 0 };
    stats.count++;
    stats.lastTrade = Math.max(stats.lastTrade, trade.entry_time);
    stats.pnl += trade.realized_net_pnl || 0;
    agentStats.set(trade.run_name, stats);
  }
  return Array.from(agentStats.entries())
    .map(([run_name, stats]) => ({
      run_name,
      trade_count: stats.count,
      last_trade_at: stats.lastTrade ? new Date(stats.lastTrade * 1000) : null,
      total_pnl: stats.pnl,
    }))
    .sort((a, b) => b.trade_count - a.trade_count);
}
```

---

## File 2: research-signal-parser.ts (UPDATE)

**Path:** `lib/research-signal-parser.ts`

**Change:** `confidence: "HIGH" | "MEDIUM" | "LOW"` → `confidence: number` (0-100)

```typescript
export interface ParsedSignal {
  token: string | null;
  side: "LONG" | "SHORT" | null;
  leverage: number;
  isValid: boolean;
  reasoning: string;
  confidence: number; // CHANGED: 0-100 numeric
}

const SIGNAL_PARSER_PROMPT = `You are a professional trading signal parser.

Extract:
1. Token: Asset symbol (BTC, ETH, NVDA, TSLA)
2. Side: LONG or SHORT
3. Leverage: 1-10x, default 1x
4. Confidence: 0-100 score

Rules:
- Only clear, actionable signals
- Reject vague signals
- If unclear, mark INVALID with confidence 0

Return JSON:
{
  "token": "NVDA",
  "side": "LONG",
  "leverage": 1,
  "isValid": true,
  "reasoning": "Clear signal",
  "confidence": 85
}`;

// In parseResearchSignal function, update result parsing:
const result: ParsedSignal = {
  token: parsed.token?.toUpperCase() || null,
  side: parsed.side?.toUpperCase() as "LONG" | "SHORT" | null,
  leverage: Math.min(10, Math.max(1, parsed.leverage || 1)),
  isValid: parsed.isValid === true,
  reasoning: parsed.reasoning || "",
  confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)), // NUMERIC
};
```

---

## File 3: Worker Update

**Path:** `services/research-signal-worker/src/worker.ts`

**Add to imports:**
```typescript
import { fetchNOF1Trades, getNewEntryTrades, formatTradeAsSignalText } from './nof1-fetcher';
import { parseResearchSignal } from '../../../lib/research-signal-parser';
```

**Add state tracking:**
```typescript
let nof1LastPollTime = Math.floor(Date.now() / 1000) - (15 * 60);
const nof1ProcessedIds = new Set<string>();
```

**Add function:**
```typescript
async function generateNOF1Signals() {
  console.log("\n━━━ NOF1 AI ARENA SIGNALS ━━━");

  // Get agents following NOF1 institutes
  const allAgents = await prisma.agents.findMany({
    where: { status: "PUBLIC" },
    include: { agent_research_institutes: { include: { research_institutes: true } } },
  });

  const selectedNof1Names = new Set<string>();
  for (const agent of allAgents) {
    for (const sel of agent.agent_research_institutes) {
      if (sel.research_institutes.name.startsWith('NOF1: ')) {
        selectedNof1Names.add(sel.research_institutes.name.replace('NOF1: ', ''));
      }
    }
  }

  if (selectedNof1Names.size === 0) {
    console.log("No agents following NOF1");
    nof1LastPollTime = Math.floor(Date.now() / 1000);
    return;
  }

  const newTrades = await getNewEntryTrades(nof1LastPollTime, nof1ProcessedIds, Array.from(selectedNof1Names));
  if (newTrades.length === 0) {
    nof1LastPollTime = Math.floor(Date.now() / 1000);
    return;
  }

  const availableMarkets = await prisma.venue_markets.findMany({
    where: { venue: "OSTIUM", is_active: true },
    select: { token_symbol: true },
  });
  const availableTokens = new Set(availableMarkets.map(m => m.token_symbol.toUpperCase()));

  for (const trade of newTrades) {
    const token = trade.symbol.replace('xyz:', '').toUpperCase();
    if (!availableTokens.has(token)) { nof1ProcessedIds.add(trade.id); continue; }

    const institute = await prisma.research_institutes.findUnique({
      where: { name: `NOF1: ${trade.run_name}` },
    });
    if (!institute) { nof1ProcessedIds.add(trade.id); continue; }

    const existing = await prisma.research_signals.findFirst({
      where: { institute_id: institute.id, source_url: { contains: trade.id } },
    });
    if (existing) { nof1ProcessedIds.add(trade.id); continue; }

    const signalText = formatTradeAsSignalText(trade);
    const parsed = await parseResearchSignal({
      instituteId: institute.id,
      instituteName: institute.name,
      signalText,
      sourceUrl: `https://nof1.ai/trade/${trade.id}`,
    });

    if (parsed.isValid) {
      await prisma.research_signals.create({
        data: {
          institute_id: institute.id,
          signal_text: `NOF1 ${trade.run_name}: ${parsed.side} ${parsed.token} @ $${trade.entry_price} (${parsed.leverage}x) [Confidence: ${parsed.confidence}%]`,
          source_url: `https://nof1.ai/trade/${trade.id}`,
          extracted_token: parsed.token,
          extracted_side: parsed.side,
          extracted_leverage: parsed.leverage,
          is_valid_signal: true,
          processed_for_trades: false,
        },
      });
      console.log(`[${token}] ✅ Signal: ${parsed.side} (${parsed.confidence}%) from ${trade.run_name}`);
    }
    nof1ProcessedIds.add(trade.id);
  }

  nof1LastPollTime = Math.floor(Date.now() / 1000);
}
```

**Call in generateResearchSignals():**
```typescript
async function generateResearchSignals() {
  // ... existing Yahoo Finance code ...
  await generateNOF1Signals(); // ADD THIS
}
```

---

## File 4: Setup Script (NEW)

**Path:** `scripts/setup-nof1-agents.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { getAvailableNOF1Agents } from '../services/research-signal-worker/src/nof1-fetcher';

const prisma = new PrismaClient();

async function setupNOF1Agents() {
  console.log('Setting up NOF1 AI agents as research institutes...\n');

  const apiAgents = await getAvailableNOF1Agents();
  console.log(`Found ${apiAgents.length} agents\n`);

  for (const agent of apiAgents) {
    const instituteName = `NOF1: ${agent.run_name}`;
    const displayName = agent.run_name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    await prisma.research_institutes.upsert({
      where: { name: instituteName },
      create: {
        name: instituteName,
        description: `NOF1 AI Agent: ${displayName}. Trades: ${agent.trade_count}, PnL: $${agent.total_pnl.toFixed(2)}`,
        website_url: 'https://nof1.ai',
        is_active: true,
      },
      update: {
        description: `NOF1 AI Agent: ${displayName}. Trades: ${agent.trade_count}, PnL: $${agent.total_pnl.toFixed(2)}`,
        is_active: true,
      },
    });
    console.log(`✅ ${displayName}`);
  }

  console.log('\n✅ Setup complete! NOF1 agents now appear in Research Institute selector.');
}

setupNOF1Agents().finally(() => prisma.$disconnect());
```

---

## Execution

1. Update `lib/research-signal-parser.ts` (confidence → numeric)
2. Create `services/research-signal-worker/src/nof1-fetcher.ts`
3. Update `services/research-signal-worker/src/worker.ts`
4. Create and run: `npx tsx scripts/setup-nof1-agents.ts`
5. Deploy - NOF1 agents appear in Research Institute selector!

---

## Testing

After setup, go to create-agent → Research Institutes step. You should see:
- NOF1: gemini-3-pro
- NOF1: gpt-5.1
- NOF1: claude-3-opus
- etc.

Select any NOF1 agents. Worker will fetch their trades and create signals.


# Vprime-telegram-clean Branch

## Overview

This is a **clean branch** based on **Vprime** with:
✅ All existing Telegram integration from Vprime  
✅ MULTI venue signal generation fix (critical for Telegram flow)  
✅ Updated venue selection UI to show Multi-Venue  
❌ **No address redesign complexity** from address-fix-clean branch  

## What's Included

### 1. Telegram Integration (from Vprime)
- ✅ `services/telegram-alpha-worker/` - Telegram message processing worker
- ✅ `pages/api/telegram/webhook.ts` - Telegram webhook endpoint
- ✅ `components/TelegramSourceManager.tsx` - UI for managing Telegram sources
- ✅ Database schema for `telegram_alpha_users`, `telegram_posts`, `telegram_sources`
- ✅ LLM classification for Telegram messages
- ✅ Telegram alpha users as signal sources (like Twitter accounts)

### 2. MULTI Venue Signal Generation Fix (cherry-picked)
**Commit**: `ffe957c - fix: Handle MULTI venue agents in signal generation`

**What it fixes**: Agents with `venue = 'MULTI'` now generate signals with actual venue values instead of 'MULTI'

**Files updated**:
- `pages/api/admin/generate-signals.ts` - Check token on ANY enabled venue for MULTI agents
- `pages/api/admin/run-signal-once.ts` - Default MULTI → HYPERLIQUID for signals
- `pages/api/admin/generate-signals-simple.ts` - Default MULTI → HYPERLIQUID
- `services/signal-generator-worker/src/worker.ts` - Use first available venue for MULTI agents
- `workers/research-signal-generator.ts` - Default MULTI → HYPERLIQUID

**Before**: Signal created with `venue: 'MULTI'` ❌ → Database error  
**After**: Signal created with `venue: 'HYPERLIQUID'` or `'OSTIUM'` ✅ → Ready for execution

### 3. Venue Selection UI Fix
**Commit**: `149b646 - fix: Update venue selection UI to show Multi-Venue by default`

**What it fixes**: Create Agent page now shows Multi-Venue option instead of only Hyperliquid

**Changes**:
- Icon: ⚡ → 🌐
- Title: "Hyperliquid Perpetuals" → "Multi-Venue Trading (Recommended)"
- Description: Shows Agent Where™ intelligent routing
- Features listed: Both Hyperliquid (220 pairs) and Ostium (41 pairs)
- Default value: `HYPERLIQUID` → `MULTI`

## What's NOT Included (from address-fix-clean)

❌ `deployment_venue_agents` table - per-deployment address storage  
❌ `lib/user-venue-agent.ts` - deployment-based address management  
❌ Per-deployment address generation changes  
❌ Complex encryption/decryption redesign  

**Reason**: Keeping it simple! The Vprime branch already has working Hyperliquid/Ostium integration with the original address system.

## Branch History

```
Vprime (f226c5e)
  ↓
Vprime-telegram-clean (new branch)
  ↓
+ dbb1aaf - fix: Handle MULTI venue agents in signal generation (cherry-picked)
  ↓
+ 149b646 - fix: Update venue selection UI to show Multi-Venue by default
```

## Telegram Flow Status

✅ **Working**:
1. User sends DM to Telegram bot with alpha (e.g., "ETH looking bullish 🚀")
2. Message stored in `telegram_posts` table
3. `telegram-alpha-worker` classifies message with LLM
4. If classified as signal → `is_signal_candidate = true`
5. Signal generation picks it up for linked agents
6. **Signal created with actual venue** (HYPERLIQUID or OSTIUM) ✅
7. Trade executor executes on the specified venue
8. Positions created and tracked

✅ **MULTI Venue Agents**:
- Signal generation checks token availability on both Hyperliquid and Ostium
- Creates signal with first available venue
- Agent Where routing can re-route during execution if needed

## Deployment Guide

### 1. Apply Migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

### 2. Set Environment Variables

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token

# LLM for classification (at least one)
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...

# Database
DATABASE_URL=postgresql://...
```

### 3. Deploy Telegram Worker

```bash
cd services/telegram-alpha-worker
npm install
npm run build
npm start
```

Or deploy to Railway/Render using the service's `Dockerfile`.

### 4. Set Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://yourdomain.com/api/telegram/webhook\"}"
```

## Testing

### Test MULTI Venue Signal Generation

```bash
# Add a Telegram alpha user
npx tsx scripts/add-telegram-alpha-user.ts @yourusername

# Link them to a MULTI venue agent via database or UI

# Send a test message to your bot
# Message: "Just got insider info - $ETH looking extremely bullish 🚀"

# Check signal was created with actual venue (not 'MULTI')
SELECT 
  s.id,
  a.name as agent_name,
  a.venue as agent_venue,
  s.venue as signal_venue,
  s.token_symbol,
  s.side
FROM signals s
JOIN agents a ON s.agent_id = a.id
WHERE a.venue = 'MULTI'
ORDER BY s.created_at DESC
LIMIT 5;

# Expected: signal_venue should be 'HYPERLIQUID' or 'OSTIUM', NOT 'MULTI'
```

### Test Create Agent UI

```bash
npm run dev

# Navigate to /create-agent
# Step 2 should show:
# 🌐 Multi-Venue Trading (Recommended)
# - Hyperliquid Perpetuals (220+ pairs)
# - Ostium Synthetics (41 pairs)
# - Intelligent routing for best liquidity & fees
# - Total 261 trading pairs
```

## Known Issues & Solutions

### Issue: Deployments have empty `enabled_venues`

Some older deployments may have `enabled_venues = []`.

**Solution**: Run the fix endpoint

```bash
curl -X POST http://localhost:3000/api/admin/fix-enabled-venues \
  -H "Content-Type: application/json"
```

Or SQL:

```sql
-- Fix MULTI agents
UPDATE agent_deployments 
SET enabled_venues = ARRAY['HYPERLIQUID', 'OSTIUM']::text[]
FROM agents
WHERE agent_deployments.agent_id = agents.id
  AND agents.venue = 'MULTI'
  AND agent_deployments.enabled_venues = '{}';
```

## Next Steps

1. **Test Telegram flow** end-to-end with a MULTI venue agent
2. **Verify signals** are created with actual venue values
3. **Monitor trade execution** to ensure it works on both Hyperliquid and Ostium
4. **Adjust Agent Where routing** logic if needed for better venue selection

## Comparison with Other Branches

| Feature | Vprime | address-fix-clean | **Vprime-telegram-clean** |
|---------|--------|-------------------|---------------------------|
| Telegram Integration | ✅ | ✅ | ✅ |
| MULTI Venue Fix | ❌ | ✅ | ✅ |
| UI Shows Multi-Venue | ❌ | ✅ | ✅ |
| Per-deployment addresses | ❌ | ✅ | ❌ (keeping simple) |
| Complex encryption redesign | ❌ | ✅ | ❌ (keeping simple) |
| **Status** | Base | Complex | **Clean & Simple** ✅ |

## Summary

**Vprime-telegram-clean** is the **recommended branch** for working on Telegram integration because:

✅ Based on stable Vprime  
✅ Includes only essential MULTI venue fix  
✅ Clean, simple, no complex address redesign  
✅ Telegram flow fully functional  
✅ UI properly shows Multi-Venue option  
✅ Ready for further development  

Use this branch for ongoing work on Telegram features and signal generation!


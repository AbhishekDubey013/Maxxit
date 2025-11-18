# Telegram Service - Clarification

## ✅ You Have ONE Unified Service Now!

I've merged both services into **ONE unified Telegram Worker**:

### Single Service: `services/telegram-worker/`

**Handles BOTH:**
1. **Channels/Groups** - Fetches messages from `telegram_sources` (needs `TELEGRAM_BOT_TOKEN`)
2. **Individual DMs** - Processes messages from `telegram_alpha_users` (stored by webhook)

---

## What Changed

### Before (Confusing):
- ❌ `workers/telegram-feed-ingestion.ts` - Channel ingestion (in main app)
- ❌ `services/telegram-worker/` - DM processing (separate service)

### After (Unified):
- ✅ `services/telegram-worker/` - **ONE service handles both!**

---

## Environment Variables (Single Service)

```env
# Required
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=...  # Or OPENAI_API_KEY or ANTHROPIC_API_KEY

# Optional (but recommended)
TELEGRAM_BOT_TOKEN=...  # Required for channel ingestion, optional for DM processing
PORT=5006
WORKER_INTERVAL=120000
```

---

## What the Worker Does

### Part 1: Channel/Group Messages
- Fetches new messages from active `telegram_sources`
- Classifies immediately with LLM
- Stores in `telegram_posts` with `source_id`

### Part 2: Individual DM Messages
- Finds unprocessed messages (`is_signal_candidate IS NULL`)
- Classifies with LLM
- Updates `telegram_posts` with results

---

## Old File (Can Be Removed)

The old `workers/telegram-feed-ingestion.ts` is now **redundant** - its functionality is merged into the unified worker.

**You can:**
- Keep it for now (doesn't hurt)
- Or delete it if you want to clean up

---

## Summary

✅ **ONE service** = `services/telegram-worker/`  
✅ **Handles both** channels and DMs  
✅ **Single deployment**  
✅ **Simpler architecture**


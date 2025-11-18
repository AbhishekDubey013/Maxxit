# Telegram Service - Final Answer

## ✅ ONE Unified Service

**Service Name:** `telegram-worker` (or `@maxxit/telegram-worker`)

**Directory:** `services/telegram-worker/`

---

## What It Does

This **single service** handles BOTH:

1. **Channels/Groups** (`telegram_sources`)
   - Fetches messages from Telegram channels/groups
   - Needs `TELEGRAM_BOT_TOKEN`
   - Classifies with LLM
   - Stores in `telegram_posts` with `source_id`

2. **Individual DMs** (`telegram_alpha_users`)
   - Processes unclassified DM messages from database
   - No token needed (webhook already stored them)
   - Classifies with LLM
   - Updates `telegram_posts` with results

---

## Service Details

- **Package Name:** `@maxxit/telegram-worker`
- **Directory:** `services/telegram-worker/`
- **Port:** `5006` (default)
- **Health Check:** `GET /health`
- **Interval:** `120000ms` (2 minutes, default)

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=...  # Or OPENAI_API_KEY or ANTHROPIC_API_KEY

# Optional (but recommended for channels)
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
PORT=5006
WORKER_INTERVAL=120000
```

---

## Deployment

**Service Name:** `telegram-worker`

**Start Command:**
```bash
cd services/telegram-worker && npm start
```

---

## Summary

✅ **ONE service** = `telegram-worker`  
✅ **Location** = `services/telegram-worker/`  
✅ **Handles both** channels and DMs  
✅ **Single deployment**


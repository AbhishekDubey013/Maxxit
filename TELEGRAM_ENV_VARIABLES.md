# Telegram Service - Complete Environment Variables

## 📋 All Required Environment Variables

### Main Next.js App (Webhook Handler)

**File:** `.env` (root directory) or Railway/Vercel/Render environment variables

```env
# ============================================
# TELEGRAM BOT CONFIGURATION (REQUIRED)
# ============================================
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4

# ============================================
# DATABASE (REQUIRED)
# ============================================
DATABASE_URL=postgresql://user:password@host:port/database

# ============================================
# LLM API KEY (Required for classification in webhook - optional if using worker)
# ============================================
# Choose ONE:
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# OPTIONAL
# ============================================
NODE_ENV=production
PORT=3000
```

---

### Telegram Worker Service (Unified - Handles Both Channels & DMs)

**File:** `.env` in `services/telegram-worker/` or service environment variables

```env
# ============================================
# DATABASE (REQUIRED)
# ============================================
DATABASE_URL=postgresql://user:password@host:port/database

# ============================================
# TELEGRAM BOT TOKEN (REQUIRED for channel ingestion)
# ============================================
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
# Note: Required to fetch messages from channels/groups
#       Optional if only processing DMs (webhook stores them)

# ============================================
# LLM API KEY (REQUIRED - choose one)
# ============================================
# Option 1: Perplexity (recommended)
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PERPLEXITY_MODEL=sonar  # Optional, defaults to 'sonar'

# Option 2: OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to 'gpt-4o-mini'

# Option 3: Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-haiku-20240307  # Optional, defaults to 'claude-3-haiku-20240307'

# ============================================
# SERVICE CONFIGURATION (OPTIONAL)
# ============================================
PORT=5006                    # Health check port (default: 5006)
WORKER_INTERVAL=120000       # Polling interval in milliseconds (default: 2 minutes)
NODE_ENV=production          # development/production
```

**Note:** This is a **unified service** that handles BOTH:
- Channel/group messages (needs `TELEGRAM_BOT_TOKEN`)
- Individual DM messages (stored by webhook, no token needed)

---

## 🔑 Complete Environment Variables Summary

### Main Application (Next.js)

| Variable | Required | Description | Current Value |
|----------|----------|-------------|---------------|
| `TELEGRAM_BOT_TOKEN` | ✅ Yes | Telegram bot API token | `8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4` |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://...` |
| `PERPLEXITY_API_KEY` | ⚠️ Optional* | LLM API key for classification | - |
| `OPENAI_API_KEY` | ⚠️ Optional* | Alternative LLM API key | - |
| `ANTHROPIC_API_KEY` | ⚠️ Optional* | Alternative LLM API key | - |
| `NODE_ENV` | ❌ No | Environment mode | `production` |
| `PORT` | ❌ No | Server port | `3000` |

*Optional if using telegram-worker for classification

### Telegram Worker Service (Unified)

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | - |
| `TELEGRAM_BOT_TOKEN` | ⚠️ Conditional* | Telegram bot API token | - |
| `PERPLEXITY_API_KEY` | ✅ Yes** | LLM API key | - |
| `OPENAI_API_KEY` | ✅ Yes** | Alternative LLM API key | - |
| `ANTHROPIC_API_KEY` | ✅ Yes** | Alternative LLM API key | - |
| `PORT` | ❌ No | Health check port | `5006` |
| `WORKER_INTERVAL` | ❌ No | Polling interval (ms) | `120000` |
| `NODE_ENV` | ❌ No | Environment mode | `production` |

*Required for channel ingestion, optional for DM processing  
**Required: Need at least ONE LLM API key

---

## 📝 Complete .env Example (Main App)

```env
# ============================================
# TELEGRAM BOT CONFIGURATION
# ============================================
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://postgres:password@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb

# ============================================
# LLM API (Choose one - optional if using worker)
# ============================================
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# APP CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000
```

---

## 📝 Complete .env Example (Telegram Worker - Unified)

**Location:** `services/telegram-worker/.env`

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://postgres:password@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb

# ============================================
# TELEGRAM BOT TOKEN (Required for channel ingestion)
# ============================================
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4

# ============================================
# LLM API (Choose one - REQUIRED)
# ============================================
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# WORKER CONFIGURATION
# ============================================
PORT=5006
WORKER_INTERVAL=120000
NODE_ENV=production
```

---

## 🔍 Where Each Variable is Used

### `TELEGRAM_BOT_TOKEN`
- **Used in:**
  - `lib/telegram-bot.ts` - Bot API calls
  - `pages/api/telegram/webhook.ts` - Receiving DMs
  - `services/telegram-worker/` - Fetching channel messages

### `DATABASE_URL`
- **Used in:**
  - All services (main app, workers)
  - Prisma client initialization

### LLM API Keys
- **Used in:**
  - `services/telegram-worker/` - Classifies all messages (channels + DMs)
  - `lib/llm-classifier.ts` - Classification logic

---

## ✅ Verification

### Check if token is set:
```bash
npm run verify:telegram
```

### Check all Telegram variables:
```bash
# Main app
echo $TELEGRAM_BOT_TOKEN
echo $DATABASE_URL

# Worker (if running)
cd services/telegram-worker
echo $DATABASE_URL
echo $PERPLEXITY_API_KEY
```

---

## 🚀 Deployment Checklist

### Main App Service:
- [ ] `TELEGRAM_BOT_TOKEN` set
- [ ] `DATABASE_URL` set
- [ ] LLM API key set (optional if using worker)

### Telegram Worker Service (Unified):
- [ ] `DATABASE_URL` set
- [ ] `TELEGRAM_BOT_TOKEN` set (required for channels, optional for DMs)
- [ ] LLM API key set (REQUIRED)
- [ ] `PORT` set (optional, defaults to 5006)
- [ ] `WORKER_INTERVAL` set (optional, defaults to 120000)

---

## 📊 Current Configuration Status

✅ **TELEGRAM_BOT_TOKEN:** Set in `.env`  
✅ **DATABASE_URL:** Set in `.env`  
⚠️ **LLM API Key:** Needs to be set in worker service

---

**All environment variables documented above!** 🎯


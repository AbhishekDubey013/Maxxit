# Telegram Service Clarification

## ✅ **Use: `telegram-alpha-worker`**

**Location:** `services/telegram-alpha-worker/`

**Status:** ✅ **ACTIVE** - This is the service to use

**What it does:**
- Processes Telegram DM messages from alpha users
- Classifies messages using LLM
- Updates `telegram_posts` with classification results
- Signal generator picks up classified messages

**Port:** 5006 (default, configurable via `PORT` env var)

**Health Check:** `http://localhost:5006/health`

---

## ❌ **Don't use: `telegram-worker`**

**Location:** `services/telegram-worker/`

**Status:** ❌ **INACTIVE** - Only has compiled output, no source files

**Why:** This was created during unification but source files were never added or were removed.

---

## 🚀 **How to Run**

```bash
cd services/telegram-alpha-worker
npm install
npx prisma generate
npm run build
npm start
```

**Environment Variables:**
```bash
PORT=5006
WORKER_INTERVAL=120000  # 2 minutes
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=...  # For LLM classification
```

---

## 📊 **Service Architecture**

```
Telegram Bot (webhook)
   ↓
telegram_posts table (raw messages)
   ↓
telegram-alpha-worker (classifies messages)
   ↓
telegram_posts table (with classification)
   ↓
signal-generator-worker (creates signals)
   ↓
signals table
```

---

## ✅ **Summary**

**Use:** `services/telegram-alpha-worker/` ✅

**Don't use:** `services/telegram-worker/` ❌


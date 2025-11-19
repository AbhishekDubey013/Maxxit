# 🚀 Complete Telegram Service Setup

## 📋 Two Parts Needed

### Part 1: Webhook (One-Time Setup)
**What:** Tells Telegram where to send messages  
**Where:** Run once from your terminal  
**Result:** Messages go to your Vercel endpoint → stored in database

### Part 2: Telegram Worker (Must Run Continuously)
**What:** Processes messages from database → classifies → creates signals  
**Where:** Run on Railway (or locally for testing)  
**Result:** Messages get classified and signals are generated

---

## 🔗 Part 1: Set Webhook (One-Time)

**Run this ONCE from your terminal:**

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
```

**What happens:**
- Telegram is configured to send messages to your Vercel app
- Messages arrive at `/api/telegram/webhook` endpoint
- Endpoint stores messages in `telegram_posts` table
- ✅ Done! (This is a one-time setup)

---

## 🔄 Part 2: Run Telegram Worker (Continuous)

The worker must run **continuously** to process messages. You have 2 options:

### Option A: Deploy to Railway (Recommended for Production)

**Step 1: Create Railway Service**

1. Go to [Railway.app](https://railway.app)
2. Create new project
3. Add new service → **GitHub Repo** → Select your repo
4. Set root directory: `services/telegram-alpha-worker`

**Step 2: Set Environment Variables**

In Railway dashboard, add:
```
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=pplx-... (or OPENAI_API_KEY, ANTHROPIC_API_KEY)
PORT=5006
WORKER_INTERVAL=120000
```

**Step 3: Deploy**

Railway will automatically:
- Install dependencies
- Build the service
- Start the worker
- Keep it running 24/7

**Step 4: Verify It's Running**

Check Railway logs - you should see:
```
🚀 Telegram Alpha Worker starting...
⏱️  Interval: 120000ms (120s)
🤖 LLM Classifier: ENABLED
```

---

### Option B: Run Locally (For Testing)

**Step 1: Navigate to Service**

```bash
cd /Users/abhishekdubey/Downloads/Maxxit/services/telegram-alpha-worker
```

**Step 2: Install Dependencies**

```bash
npm install
npx prisma generate
```

**Step 3: Set Environment Variables**

Create `.env` file:
```bash
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=pplx-...
PORT=5006
WORKER_INTERVAL=120000
```

**Step 4: Build and Start**

```bash
npm run build
npm start
```

**You should see:**
```
🚀 Telegram Alpha Worker starting...
⏱️  Interval: 120000ms (120s)
🤖 LLM Classifier: ENABLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Keep this terminal open** - worker runs continuously!

---

## 🔄 How It Works Together

```
1. User sends message to @Prime_Alpha_bot
   ↓
2. Telegram sends to webhook → /api/telegram/webhook (Vercel)
   ↓
3. Webhook stores message in telegram_posts table
   ↓
4. Telegram Worker (Railway) reads from telegram_posts
   ↓
5. Worker classifies message with LLM
   ↓
6. Worker updates telegram_posts with classification
   ↓
7. Signal Generator picks up classified messages
   ↓
8. Signals created → Trades executed
```

---

## ✅ Complete Setup Checklist

### Webhook (One-Time):
- [ ] Run: `npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook`
- [ ] Verify: `npx tsx scripts/check-telegram-bot-status.ts` shows webhook configured

### Worker (Continuous):
- [ ] **Option A:** Deploy to Railway
  - [ ] Create Railway service
  - [ ] Set root: `services/telegram-alpha-worker`
  - [ ] Add environment variables
  - [ ] Deploy and verify logs

- [ ] **Option B:** Run locally
  - [ ] `cd services/telegram-alpha-worker`
  - [ ] `npm install && npx prisma generate`
  - [ ] Create `.env` with variables
  - [ ] `npm run build && npm start`
  - [ ] Keep terminal open

---

## 🧪 Test Complete Flow

1. **Send message to bot:** `@Prime_Alpha_bot` → "ETH breaking $3500! Going LONG 🚀"
2. **Check Vercel logs:** Should see `[Telegram] Received update: ...`
3. **Check Railway logs (or local terminal):** Should see `[TelegramAlpha] Processing message...`
4. **Check database:** `telegram_posts` table should have classified message
5. **Check signals:** Signal generator should create signal from classified message

---

## 📊 Service Status

**Webhook:** ✅ Set once, works forever (until you change it)  
**Worker:** ⚠️ Must be running continuously (Railway or local)

**If worker stops:**
- Messages still arrive (webhook works)
- But messages won't be classified
- No signals will be generated

**Solution:** Keep worker running 24/7 on Railway!

---

## 🎯 Summary

1. **Webhook:** Run once from terminal → `npx tsx scripts/set-telegram-webhook.ts ...`
2. **Worker:** Deploy to Railway OR run locally → Must stay running!

**For production:** Use Railway to keep worker running 24/7  
**For testing:** Run locally in terminal


# Telegram Service - Quick Start Guide

## 🚀 Get It Running in 5 Steps

### 1. Environment Variables (Main App)
```env
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
DATABASE_URL=postgresql://...
```

### 2. Environment Variables (Worker Service)
```env
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=pplx-...  # Or OPENAI_API_KEY or ANTHROPIC_API_KEY
PORT=5006
WORKER_INTERVAL=120000
```

### 3. Set Webhook URL
```bash
curl -X POST "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-DOMAIN.com/api/telegram/webhook"}'
```

### 4. Deploy Worker Service
```bash
cd services/telegram-worker
npm install
npm run build
npm start
```

### 5. Test It
1. DM `@Prime_Alpha_bot`: "$BTC looking strong!"
2. Check database: `SELECT * FROM telegram_posts ORDER BY created_at DESC LIMIT 1;`
3. Wait 2 minutes (worker interval)
4. Check classification: `SELECT is_signal_candidate, extracted_tokens FROM telegram_posts WHERE id = '...';`

## ✅ Verification

```bash
# Check webhook
curl "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/getWebhookInfo"

# Check worker
curl http://localhost:5006/health

# Verify token
npm run verify:telegram
```

## 📊 Data Points

- **Bot Token:** `8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4`
- **Bot Username:** `@Prime_Alpha_bot`
- **Webhook Endpoint:** `/api/telegram/webhook`
- **Worker Port:** `5006`
- **Worker Interval:** `120000ms` (2 minutes)
- **Test User:** `@abhidavinci` ✅

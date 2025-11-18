# Telegram Service Deployment Checklist

## 📋 Quick Checklist

- [ ] Database tables created
- [ ] Telegram bot created via @BotFather
- [ ] Bot token added to environment variables
- [ ] Webhook endpoint configured
- [ ] Telegram alpha worker service deployed
- [ ] Signal generator updated
- [ ] Test user added
- [ ] End-to-end flow tested

---

## 1. Database Setup ✅ (Already Done)

**Status:** ✅ Tables already created and pushed

**Tables:**
- `telegram_alpha_users` - Individual DM users
- `telegram_posts` - Messages from users/channels
- `agent_telegram_users` - Links agents to alpha users
- `telegram_sources` - Channel/group sources (existing)

**Verify:**
```sql
SELECT COUNT(*) FROM telegram_alpha_users;
SELECT COUNT(*) FROM telegram_posts;
```

---

## 2. Telegram Bot Setup

### Step 1: Create Bot (if not done)
1. Open Telegram
2. Search: `@BotFather`
3. Send: `/newbot`
4. Follow prompts:
   - Bot name: `Maxxit Alpha Bot` (or your choice)
   - Username: `maxxit_alpha_bot` (must end with `bot`)
5. Copy the token (format: `1234567890:ABCdefGHI...`)

**Your Current Token:** `8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4` ✅

### Step 2: Configure Webhook URL

**For Production:**
```bash
curl -X POST "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

**For Local Testing (ngrok):**
```bash
# Start ngrok
ngrok http 3000

# Set webhook to ngrok URL
curl -X POST "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok.io/api/telegram/webhook"}'
```

**Verify Webhook:**
```bash
curl "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/getWebhookInfo"
```

---

## 3. Environment Variables

### Main Next.js App (Webhook)

**Required:**
```env
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
DATABASE_URL=postgresql://...
```

**Where to Set:**
- **Railway:** Service → Variables → Add `TELEGRAM_BOT_TOKEN`
- **Vercel:** Project Settings → Environment Variables
- **Render:** Environment → Add Variable
- **Local:** `.env` file (already done ✅)

### Telegram Alpha Worker Service

**Required:**
```env
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=pplx-...  # OR OPENAI_API_KEY or ANTHROPIC_API_KEY
```

**Optional:**
```env
PORT=5006                    # Default: 5006
WORKER_INTERVAL=120000       # Default: 2 minutes
NODE_ENV=production
```

**Where to Set:**
- **Railway:** New service → Add variables
- **Render:** New service → Environment
- **Local:** `.env` in `services/telegram-worker/`

---

## 4. Deploy Services

### Main App (Webhook)

**Already deployed?** ✅ (if your main app is live)

**Verify webhook endpoint:**
```bash
curl https://your-domain.com/api/telegram/webhook
# Should return 405 (Method not allowed) - means endpoint exists
```

### Telegram Alpha Worker

**Deploy as separate service:**

#### Railway:
1. New service → Deploy from GitHub
2. Root directory: `services/telegram-worker`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add environment variables (see above)

#### Render:
1. New Web Service
2. Build command: `cd services/telegram-worker && npm install && npm run build`
3. Start command: `cd services/telegram-worker && npm start`
4. Add environment variables

#### Local:
```bash
cd services/telegram-worker
npm install
npx prisma generate
npm run build
npm start
```

**Health Check:**
```bash
curl http://localhost:5006/health
# Should return: {"status":"ok","service":"telegram-worker",...}
```

---

## 5. Test User Setup ✅ (Already Done)

**Test User:** `@abhidavinci` ✅

**Verify:**
```bash
npx tsx scripts/verify-telegram-alpha-user.ts
```

**Add more test users:**
```bash
npx tsx scripts/add-telegram-alpha-user.ts
```

---

## 6. Testing Flow

### Test 1: Send DM to Bot

1. Open Telegram
2. Search: `@Prime_Alpha_bot` (your bot)
3. Send message: `🚀 $BTC breaking out above $90k! Strong momentum, targeting $95k.`
4. Bot should reply: `✅ Message received! Your alpha is being processed...`

### Test 2: Verify Message Stored

```sql
SELECT * FROM telegram_posts 
WHERE alpha_user_id IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 5;
```

Should show:
- `message_text` = your message
- `is_signal_candidate` = `NULL` (not yet classified)

### Test 3: Worker Processes Message

**Check worker logs:**
```bash
# If running locally
cd services/telegram-worker
npm run dev
# Watch for: "✅ Signal detected: BTC - bullish"
```

**Or check database:**
```sql
SELECT * FROM telegram_posts 
WHERE alpha_user_id IS NOT NULL 
AND is_signal_candidate IS NOT NULL
ORDER BY created_at DESC;
```

Should show:
- `is_signal_candidate` = `true`
- `extracted_tokens` = `['BTC']`
- `signal_type` = `'LONG'`
- `confidence_score` = `0.85` (or similar)

### Test 4: Create Agent with Telegram Source

1. Go to `/create-agent`
2. Complete steps 1-4 (name, venue, strategy, CT accounts)
3. **Step 5:** Select `@abhidavinci` from Telegram Alpha list
4. Complete agent creation
5. Verify link:
   ```sql
   SELECT * FROM agent_telegram_users 
   WHERE telegram_alpha_user_id = (
     SELECT id FROM telegram_alpha_users WHERE telegram_username = 'abhidavinci'
   );
   ```

### Test 5: Generate Signals

```bash
curl -X POST https://your-domain.com/api/admin/run-signal-once
```

**Check signals created:**
```sql
SELECT s.*, a.name as agent_name 
FROM signals s
JOIN agents a ON s.agent_id = a.id
JOIN agent_telegram_users atu ON a.id = atu.agent_id
WHERE s.created_at > NOW() - INTERVAL '1 hour'
ORDER BY s.created_at DESC;
```

---

## 7. Monitoring

### Check Worker Status

```bash
curl http://localhost:5006/health
# Or production URL
curl https://your-worker-service.com/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "telegram-worker",
  "interval": 120000,
  "database": "connected",
  "isRunning": true,
  "timestamp": "2025-11-18T..."
}
```

### Check Unprocessed Messages

```sql
SELECT COUNT(*) as unprocessed
FROM telegram_posts 
WHERE alpha_user_id IS NOT NULL 
AND is_signal_candidate IS NULL;
```

**If > 0:** Worker might not be running or LLM API key missing

### Check Active Alpha Users

```sql
SELECT 
  telegram_username,
  first_name,
  COUNT(tp.id) as total_messages,
  COUNT(CASE WHEN tp.is_signal_candidate = true THEN 1 END) as signals,
  last_message_at
FROM telegram_alpha_users tau
LEFT JOIN telegram_posts tp ON tau.id = tp.alpha_user_id
WHERE tau.is_active = true
GROUP BY tau.id
ORDER BY last_message_at DESC;
```

---

## 8. Troubleshooting

### Bot Not Receiving Messages

**Check:**
1. Webhook configured? `curl "https://api.telegram.org/botTOKEN/getWebhookInfo"`
2. Webhook URL accessible? `curl https://your-domain.com/api/telegram/webhook`
3. Bot token correct? `npm run verify:telegram`

### Messages Not Being Classified

**Check:**
1. Worker running? `curl http://localhost:5006/health`
2. LLM API key set? Check worker logs
3. Messages in queue? `SELECT COUNT(*) FROM telegram_posts WHERE is_signal_candidate IS NULL`
4. Database connection? Check worker health endpoint

### Signals Not Generated

**Check:**
1. Messages classified? `SELECT * FROM telegram_posts WHERE is_signal_candidate = true`
2. Agent linked? `SELECT * FROM agent_telegram_users`
3. Signal generator running? Check logs
4. Agent status? `SELECT status FROM agents WHERE id = '...'` (should be 'PUBLIC')

---

## 9. Production Deployment URLs

### Main App (Webhook)
- **URL:** `https://your-domain.com/api/telegram/webhook`
- **Method:** POST
- **Set webhook:** Use curl command above

### Telegram Alpha Worker
- **Health:** `https://your-worker-service.com/health`
- **Port:** 5006 (or configured PORT)

---

## 10. Quick Start Commands

### Local Development

```bash
# Terminal 1: Main app
npm run dev

# Terminal 2: Telegram Alpha Worker
cd services/telegram-worker
npm run dev

# Terminal 3: Test
# Send DM to @Prime_Alpha_bot
```

### Production

```bash
# Deploy main app (already done)
# Deploy telegram-worker service
# Set environment variables
# Configure webhook URL
```

---

## 11. Verification Scripts

### Verify Token
```bash
npm run verify:telegram
```

### Verify Alpha User
```bash
npx tsx scripts/verify-telegram-alpha-user.ts
```

### Add Test User
```bash
npx tsx scripts/add-telegram-alpha-user.ts
```

---

## 12. Key Endpoints

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/api/telegram/webhook` | Receives Telegram updates | POST |
| `/api/telegram-alpha-users` | List alpha users | GET |
| `/api/agents/:id/telegram-users` | Link user to agent | POST |
| `/api/admin/run-signal-once` | Generate signals | POST |
| `:5006/health` | Worker health check | GET |

---

## 13. Environment Variables Summary

### Main App
```env
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
DATABASE_URL=postgresql://...
```

### Telegram Alpha Worker
```env
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=pplx-...
PORT=5006
WORKER_INTERVAL=120000
```

---

## 14. Deployment Checklist

- [ ] Main app deployed with `TELEGRAM_BOT_TOKEN`
- [ ] Webhook URL configured in Telegram
- [ ] Telegram alpha worker service deployed
- [ ] Worker has `DATABASE_URL` + LLM API key
- [ ] Worker health check returns `ok`
- [ ] Test DM sent to bot
- [ ] Message appears in database
- [ ] Worker classifies message
- [ ] Signal generator creates signals
- [ ] Agent receives signals

---

## 15. Support & Resources

- **Bot Token:** Get from @BotFather
- **Webhook Docs:** https://core.telegram.org/bots/api#setwebhook
- **Worker Logs:** Check service logs in Railway/Render
- **Database:** Check Prisma Studio or direct SQL queries

---

**Status:** Ready to deploy! ✅


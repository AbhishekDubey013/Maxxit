# 🔧 Fix Telegram Webhook 500 Error

## 🔍 Current Status

✅ **Webhook is configured correctly**
- URL: `https://maxxitv3.vercel.app/api/telegram/webhook`
- Telegram is sending messages to your webhook

❌ **500 Internal Server Error**
- The webhook endpoint is receiving requests but returning an error
- This means there's an issue with the code or environment variables

---

## 🔍 Step 1: Check Vercel Logs

The most important step is to see the actual error:

1. **Go to Vercel Dashboard**
   - Open [vercel.com](https://vercel.com)
   - Click on your project (`maxxitv3`)
   - Go to **"Deployments"** tab
   - Click on your latest deployment
   - Click **"Functions"** tab
   - Look for `/api/telegram/webhook`
   - Click on it to see logs

2. **Or use Vercel CLI:**
   ```bash
   vercel logs --follow
   ```

3. **Look for error messages like:**
   - `[Telegram] Webhook error: ...`
   - `Error: ...`
   - `PrismaClientInitializationError`
   - `Missing environment variable`

---

## 🔧 Step 2: Verify Environment Variables in Vercel

The webhook needs these environment variables:

### Required Variables:

1. **`TELEGRAM_BOT_TOKEN`**
   - Your bot token: `8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4`
   - **Check:** Vercel Dashboard → Settings → Environment Variables

2. **`DATABASE_URL`**
   - Your PostgreSQL connection string
   - Format: `postgresql://user:password@host:port/database`
   - **Check:** Vercel Dashboard → Settings → Environment Variables

3. **`PERPLEXITY_API_KEY`** (if using LLM classification)
   - Required for alpha message classification
   - **Check:** Vercel Dashboard → Settings → Environment Variables

### How to Add/Update Environment Variables:

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add or update:
   ```
   TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
   DATABASE_URL=postgresql://...
   PERPLEXITY_API_KEY=pplx-...
   ```
5. **Important:** After adding variables, **redeploy** your app:
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

---

## 🔧 Step 3: Common Issues & Fixes

### Issue 1: Missing `TELEGRAM_BOT_TOKEN`

**Error in logs:**
```
Error: TELEGRAM_BOT_TOKEN is not set
```

**Fix:**
1. Add `TELEGRAM_BOT_TOKEN` to Vercel environment variables
2. Redeploy the app

---

### Issue 2: Database Connection Error

**Error in logs:**
```
PrismaClientInitializationError: Can't reach database server
```

**Fix:**
1. Verify `DATABASE_URL` is correct in Vercel
2. Check if your database is accessible
3. Test connection: `psql $DATABASE_URL`

---

### Issue 3: Missing Prisma Client

**Error in logs:**
```
Error: Cannot find module '@prisma/client'
```

**Fix:**
1. Ensure `prisma generate` runs during build
2. Check `package.json` build script includes Prisma generation
3. Redeploy

---

### Issue 4: Import Errors

**Error in logs:**
```
Error: Cannot find module '../../../lib/telegram-bot'
```

**Fix:**
1. Check file paths are correct
2. Ensure all files are committed to Git
3. Redeploy

---

## 🧪 Step 4: Test the Webhook Locally

Before fixing Vercel, test locally to see the actual error:

```bash
# 1. Make sure .env has all variables
cat .env | grep TELEGRAM_BOT_TOKEN
cat .env | grep DATABASE_URL

# 2. Start local server
npm run dev

# 3. Use ngrok to expose localhost
npx ngrok http 3000

# 4. Set webhook to ngrok URL
npx tsx scripts/set-telegram-webhook.ts https://your-ngrok-url.ngrok.io/api/telegram/webhook

# 5. Send a message to bot
# 6. Check local terminal for errors
```

---

## 🔧 Step 5: Quick Fix Checklist

- [ ] Check Vercel logs for actual error message
- [ ] Verify `TELEGRAM_BOT_TOKEN` is set in Vercel
- [ ] Verify `DATABASE_URL` is set in Vercel
- [ ] Verify `PERPLEXITY_API_KEY` is set (if needed)
- [ ] Redeploy after adding environment variables
- [ ] Test webhook again
- [ ] Check logs again for new errors

---

## 🚀 Step 6: After Fixing

Once you've fixed the issue:

1. **Clear pending updates:**
   ```bash
   curl -X POST "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/deleteWebhook?drop_pending_updates=true"
   ```

2. **Re-set webhook:**
   ```bash
   npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
   ```

3. **Send a test message to bot**

4. **Check Vercel logs** - should see:
   ```
   [Telegram] Received update: ...
   [Telegram] Processing message from ...
   ```

---

## 📋 Environment Variables Checklist

Make sure these are set in **Vercel** (not just `.env`):

```bash
# Required
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
DATABASE_URL=postgresql://user:password@host:port/database

# Optional (but may be needed)
PERPLEXITY_API_KEY=pplx-...
ENCRYPTION_KEY=your-encryption-key
NEXT_PUBLIC_PRIVY_APP_ID=...
```

---

## 🎯 Next Steps

1. **Check Vercel logs** (most important!)
2. **Add missing environment variables**
3. **Redeploy**
4. **Test again**

**Share the error message from Vercel logs and I can help fix it!**


# Telegram Webhook Setup Guide

## 🔍 Issue Identified

**Problem:** You messaged the bot but nothing is logged by the Telegram service.

**Root Cause:** No webhook is configured. Telegram is using polling (`getUpdates`), but your webhook endpoint at `/api/telegram/webhook` is not receiving messages.

**Status Check Results:**
- ✅ Bot is valid: `@Prime_Alpha_bot`
- ✅ Bot received your message (found in recent updates)
- ❌ **No webhook configured** ← This is the issue

---

## 🔧 Solution: Set Up Webhook

### Step 1: Get Your Deployment URL

**If using Railway:**
```bash
# Your Railway app URL (check Railway dashboard)
# Example: https://your-app-name.up.railway.app
```

**If using Vercel:**
```bash
# Your Vercel app URL
# Example: https://your-app.vercel.app
```

**If using local development:**
```bash
# Use ngrok or similar to expose localhost
# Example: https://abc123.ngrok.io
```

### Step 2: Set the Webhook

**Option A: Using the Script (Recommended)**

```bash
# Replace with your actual deployment URL
npx tsx scripts/set-telegram-webhook.ts https://your-app.railway.app/api/telegram/webhook
```

**Option B: Using cURL**

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.railway.app/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

**Option C: Using Environment Variable**

Add to your `.env`:
```bash
TELEGRAM_WEBHOOK_URL=https://your-app.railway.app/api/telegram/webhook
```

Then run:
```bash
npx tsx scripts/set-telegram-webhook.ts
```

---

## ✅ Verify Webhook is Set

```bash
npx tsx scripts/check-telegram-bot-status.ts
```

You should see:
```
✅ Webhook is configured:
   URL: https://your-app.railway.app/api/telegram/webhook
   Pending updates: 0
   ✅ No recent errors
```

---

## 🧪 Test the Webhook

1. **Send a message to your bot** (`@Prime_Alpha_bot`)
2. **Check your application logs** for:
   ```
   [Telegram] Received update: ...
   [Telegram] Processing message from 897184179 : ...
   ```

3. **If logs appear:** ✅ Webhook is working!
4. **If no logs:** Check:
   - Is your app accessible at the webhook URL?
   - Are there any firewall/security rules blocking requests?
   - Check Railway/Vercel logs for errors
   - Verify the webhook URL is correct (must be HTTPS)

---

## 🔍 Troubleshooting

### Issue: "Webhook URL must use HTTPS"
- **Solution:** Telegram requires HTTPS. Use Railway/Vercel URL or ngrok for local dev.

### Issue: "Webhook URL is not accessible"
- **Solution:** 
  - Verify your app is deployed and running
  - Test the URL in browser: `https://your-app.railway.app/api/telegram/webhook`
  - Should return `{"error":"Method not allowed"}` (GET not allowed, but endpoint exists)

### Issue: "Last error: 404 Not Found"
- **Solution:** 
  - Check the webhook URL path: `/api/telegram/webhook`
  - Verify Next.js API route exists at `pages/api/telegram/webhook.ts`

### Issue: "Last error: 500 Internal Server Error"
- **Solution:**
  - Check application logs for errors
  - Verify `TELEGRAM_BOT_TOKEN` is set in environment
  - Check database connection
  - Verify Prisma schema is migrated

### Issue: Messages still not appearing in logs
- **Solution:**
  - Check if webhook has pending updates: `pending_update_count > 0`
  - Clear pending updates: `curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=true"`
  - Re-set webhook and send a new message

---

## 📋 Quick Checklist

- [ ] Bot token is set (`TELEGRAM_BOT_TOKEN` in `.env`)
- [ ] Deployment URL is accessible (HTTPS)
- [ ] Webhook is set using script or cURL
- [ ] Webhook verified (no errors in `getWebhookInfo`)
- [ ] Test message sent to bot
- [ ] Logs appear in application (Railway/Vercel logs)

---

## 🎯 Current Status

**Your Bot:**
- Username: `@Prime_Alpha_bot`
- Bot ID: `8306277007`
- Status: ✅ Active and receiving messages

**Recent Message Found:**
- From: `@abhidavinci`
- Message: "Sol is gonna go up real high by 10%..."
- Date: 2025-11-19T06:08:14.000Z

**Next Step:** Set the webhook URL to your deployment URL and messages will start appearing in logs!


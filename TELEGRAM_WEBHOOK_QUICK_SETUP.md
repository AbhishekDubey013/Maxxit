# 🔗 Telegram Webhook Quick Setup

## Current Status
- ✅ Bot is valid: `@Prime_Alpha_bot`
- ❌ **No webhook configured** (using polling)

---

## 🚀 Set Webhook (One Command)

### For Vercel Deployment:

```bash
npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
```

### For Railway Deployment:

```bash
npx tsx scripts/set-telegram-webhook.ts https://your-app-name.up.railway.app/api/telegram/webhook
```

---

## ✅ Verify Webhook is Set

After running the command above, verify:

```bash
npx tsx scripts/check-telegram-bot-status.ts
```

You should see:
```
✅ Webhook is configured:
   URL: https://maxxitv3.vercel.app/api/telegram/webhook
   Pending updates: 0
   ✅ No recent errors
```

---

## 🧪 Test the Webhook

1. **Send a message to your bot** (`@Prime_Alpha_bot`)
2. **Check Vercel/Railway logs** for:
   ```
   [Telegram] Received update: ...
   [Telegram] Processing message from ...
   ```

3. **If logs appear:** ✅ Webhook is working!

---

## 📋 Important Notes

1. **Webhook URL must be HTTPS** (required by Telegram)
2. **Webhook endpoint exists at:** `/api/telegram/webhook`
3. **After setting webhook, Telegram will send messages directly to your app**
4. **No need to run polling worker if webhook is set**

---

## 🔧 Troubleshooting

### If webhook fails to set:
- Check that your deployment URL is accessible
- Verify the URL uses HTTPS
- Make sure `/api/telegram/webhook` endpoint exists

### If messages don't appear:
- Check Vercel/Railway logs for errors
- Verify `TELEGRAM_BOT_TOKEN` is set in environment variables
- Check database connection

---

## 🎯 Next Steps

1. **Set the webhook** (command above)
2. **Verify it's set** (check status script)
3. **Send test message** to bot
4. **Check logs** to confirm messages are received

---

**Your Vercel URL:** `https://maxxitv3.vercel.app`
**Webhook URL:** `https://maxxitv3.vercel.app/api/telegram/webhook`


# ✅ Add Telegram Bot Token to Vercel

## 🔧 Quick Steps

### Step 1: Go to Vercel Dashboard
1. Open [vercel.com](https://vercel.com)
2. Log in to your account
3. Click on your project: **`maxxitv3`**

### Step 2: Navigate to Environment Variables
1. Click on **"Settings"** (top menu)
2. Click on **"Environment Variables"** (left sidebar)

### Step 3: Add Telegram Bot Token
1. Click **"Add New"** button
2. Fill in:
   - **Key:** `TELEGRAM_BOT_TOKEN`
   - **Value:** `8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4`
   - **Environment:** Select all (Production, Preview, Development)
3. Click **"Save"**

### Step 4: Redeploy Your App
**Important:** After adding environment variables, you must redeploy!

1. Go to **"Deployments"** tab
2. Find your latest deployment
3. Click the **"..."** (three dots) menu
4. Click **"Redeploy"**
5. Wait for deployment to complete (~2-3 minutes)

### Step 5: Test the Webhook
After redeployment:

1. **Clear pending updates:**
   ```bash
   curl -X POST "https://api.telegram.org/bot8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4/deleteWebhook?drop_pending_updates=true"
   ```

2. **Re-set webhook:**
   ```bash
   npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
   ```

3. **Send a test message to your bot** (`@Prime_Alpha_bot`)

4. **Check Vercel logs:**
   - Go to Deployments → Latest → Functions → `/api/telegram/webhook`
   - You should see: `[Telegram] Received update: ...`

---

## 📋 Visual Guide

```
Vercel Dashboard
  ↓
Settings
  ↓
Environment Variables
  ↓
Add New
  ↓
Key: TELEGRAM_BOT_TOKEN
Value: 8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
Environment: All (Production, Preview, Development)
  ↓
Save
  ↓
Deployments → Latest → ... → Redeploy
```

---

## ✅ Verification

After redeploying, verify the token is set:

1. Go to Settings → Environment Variables
2. You should see `TELEGRAM_BOT_TOKEN` in the list
3. The value should be masked (showing only first few characters)

---

## 🎯 Expected Result

After adding the token and redeploying:

- ✅ Webhook should return `200 OK` instead of `500 Error`
- ✅ Messages sent to bot should appear in Vercel logs
- ✅ Bot should respond to messages
- ✅ No more "500 Internal Server Error" in webhook status

---

## 🚨 Important Notes

1. **Redeploy is Required:** Environment variables are only loaded during build/deployment
2. **All Environments:** Make sure to select all environments (Production, Preview, Development)
3. **Token Security:** Never commit the token to Git (it's already in `.env` which should be in `.gitignore`)

---

## 🧪 Quick Test

After redeploying, run:

```bash
npx tsx scripts/check-telegram-bot-status.ts
```

You should see:
```
✅ Webhook is configured:
   URL: https://maxxitv3.vercel.app/api/telegram/webhook
   Pending updates: 0
   ✅ No errors  ← This should be green now!
```


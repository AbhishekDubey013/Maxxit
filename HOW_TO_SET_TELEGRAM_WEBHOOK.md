# 📍 Where and How to Set Telegram Webhook

## 🎯 Where to Run the Command

**Location:** In your terminal, in the project root directory

**Your project is at:**
```
/Users/abhishekdubey/Downloads/Maxxit
```

---

## 📝 Step-by-Step Instructions

### Step 1: Open Terminal

1. **On Mac:** Press `Cmd + Space`, type "Terminal", press Enter
2. **Or:** Open Finder → Applications → Utilities → Terminal

### Step 2: Navigate to Project Directory

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
```

**Verify you're in the right place:**
```bash
pwd
```
Should show: `/Users/abhishekdubey/Downloads/Maxxit`

### Step 3: Check if .env File Exists

```bash
ls -la .env
```

**If it exists:** ✅ Good, continue to Step 4
**If it doesn't exist:** Create it:
```bash
touch .env
```

### Step 4: Add Telegram Bot Token to .env

Open `.env` file in a text editor and add:

```bash
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
```

**How to edit:**
- **Option A:** `nano .env` (then press Ctrl+X, Y, Enter to save)
- **Option B:** Open in VS Code: `code .env`
- **Option C:** Open in any text editor

### Step 5: Set the Webhook

Run this command in your terminal:

```bash
npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
```

**What this does:**
- Uses `npx` to run the TypeScript script
- Script connects to Telegram API
- Sets your webhook URL to Vercel deployment

### Step 6: Verify It Worked

You should see output like:

```
╔═══════════════════════════════════════════════════════════╗
║      🔗 TELEGRAM WEBHOOK SETUP                          ║
╚═══════════════════════════════════════════════════════════╝

🔑 Bot token: 8306277007...
🔗 Webhook URL: https://maxxitv3.vercel.app/api/telegram/webhook

📋 Step 1: Checking current webhook status...
   ℹ️  No webhook currently configured

📋 Step 2: Setting webhook...
✅ Webhook set successfully!

📋 Step 3: Verifying webhook...
✅ Webhook verified:
   URL: https://maxxitv3.vercel.app/api/telegram/webhook
   Pending updates: 0
   ✅ No recent errors

╔═══════════════════════════════════════════════════════════╗
║              ✅ WEBHOOK SETUP COMPLETE                   ║
╚═══════════════════════════════════════════════════════════╝
```

---

## ✅ Verify Webhook is Set

Run this to double-check:

```bash
npx tsx scripts/check-telegram-bot-status.ts
```

You should see:
```
✅ Webhook is configured:
   URL: https://maxxitv3.vercel.app/api/telegram/webhook
```

---

## 🧪 Test It

1. **Open Telegram** on your phone/computer
2. **Search for:** `@Prime_Alpha_bot`
3. **Send a message:** "ETH breaking $3500! Going LONG 🚀"
4. **Check Vercel logs:**
   - Go to [vercel.com](https://vercel.com)
   - Click your project (`maxxitv3`)
   - Go to **Deployments** → Latest → **Functions** → `/api/telegram/webhook`
   - You should see logs like: `[Telegram] Received update: ...`

---

## 🔧 Troubleshooting

### Error: "TELEGRAM_BOT_TOKEN not found"
**Solution:** Make sure `.env` file exists and has the token:
```bash
echo "TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4" >> .env
```

### Error: "Webhook URL must use HTTPS"
**Solution:** Make sure URL starts with `https://` (not `http://`)

### Error: "Failed to set webhook"
**Solution:** 
- Check that your Vercel deployment is live
- Visit `https://maxxitv3.vercel.app/api/telegram/webhook` in browser
- Should show: `{"error":"Method not allowed"}` (this is OK - it means endpoint exists)

---

## 📋 Quick Reference

**Command to set webhook:**
```bash
npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
```

**Command to check status:**
```bash
npx tsx scripts/check-telegram-bot-status.ts
```

**Your webhook URL:**
```
https://maxxitv3.vercel.app/api/telegram/webhook
```

---

## 🎯 Summary

1. ✅ Open terminal
2. ✅ `cd /Users/abhishekdubey/Downloads/Maxxit`
3. ✅ Make sure `.env` has `TELEGRAM_BOT_TOKEN`
4. ✅ Run: `npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook`
5. ✅ Verify with: `npx tsx scripts/check-telegram-bot-status.ts`
6. ✅ Test by sending message to bot

**That's it!** 🚀


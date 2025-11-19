# 📍 How to Get Your Deployment URL

## 🎯 Quick Answer

Your deployment URL is where your Next.js app is hosted. Here's how to find it:

---

## 🚂 If Using Railway

### Step 1: Go to Railway Dashboard
1. Open [railway.app](https://railway.app)
2. Log in to your account
3. Click on your project (the one with your Maxxit app)

### Step 2: Find Your Service
1. You'll see a list of services
2. Click on your **Next.js app service** (usually named something like "web" or "maxxit")

### Step 3: Get the URL
1. Look at the top of the service page
2. You'll see a section called **"Domains"** or **"Public URL"**
3. The URL will look like:
   ```
   https://your-app-name.up.railway.app
   ```
   or
   ```
   https://your-app-name-production.up.railway.app
   ```

### Step 4: Copy the Full Webhook URL
Your webhook URL will be:
```
https://your-app-name.up.railway.app/api/telegram/webhook
```

**Example:**
```
https://maxxit-production.up.railway.app/api/telegram/webhook
```

---

## ▲ If Using Vercel

### Step 1: Go to Vercel Dashboard
1. Open [vercel.com](https://vercel.com)
2. Log in to your account
3. Click on your project (Maxxit)

### Step 2: Find Your Deployment
1. Click on the **"Deployments"** tab
2. Find your latest deployment (usually at the top)
3. Click on it

### Step 3: Get the URL
1. At the top of the deployment page, you'll see:
   - **Production URL** (if it's a production deployment)
   - Or the deployment URL directly

2. The URL will look like:
   ```
   https://your-app.vercel.app
   ```
   or
   ```
   https://your-app-name-abc123.vercel.app
   ```

### Step 4: Copy the Full Webhook URL
Your webhook URL will be:
```
https://your-app.vercel.app/api/telegram/webhook
```

**Example:**
```
https://maxxit.vercel.app/api/telegram/webhook
```

---

## 🔍 Alternative: Check Your Environment Variables

If you can't find it in the dashboard, check your environment variables:

### Railway:
1. Go to Railway dashboard → Your service → **Variables** tab
2. Look for:
   - `RAILWAY_PUBLIC_DOMAIN`
   - `RAILWAY_STATIC_URL`
   - Or any custom domain you set

### Vercel:
1. Go to Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Look for:
   - `VERCEL_URL` (automatically set)
   - Or your custom domain

---

## 🧪 Test Your URL

Before setting the webhook, test that your endpoint is accessible:

```bash
# Replace with your actual URL
curl https://your-app.railway.app/api/telegram/webhook
```

**Expected Response:**
```json
{"error":"Method not allowed"}
```

This is **correct**! It means:
- ✅ Your app is accessible
- ✅ The endpoint exists
- ✅ It's just rejecting GET requests (webhooks use POST)

---

## 🚀 Set the Webhook

Once you have your URL, run:

```bash
npx tsx scripts/set-telegram-webhook.ts https://YOUR-URL/api/telegram/webhook
```

**Railway Example:**
```bash
npx tsx scripts/set-telegram-webhook.ts https://maxxit-production.up.railway.app/api/telegram/webhook
```

**Vercel Example:**
```bash
npx tsx scripts/set-telegram-webhook.ts https://maxxit.vercel.app/api/telegram/webhook
```

---

## 📸 Visual Guide

### Railway Dashboard:
```
┌─────────────────────────────────────┐
│  Railway Dashboard                  │
│                                     │
│  📦 Your Project                    │
│    └─ 🌐 web (Next.js)             │
│       └─ Domains:                   │
│          https://app.up.railway.app │ ← Copy this
└─────────────────────────────────────┘
```

### Vercel Dashboard:
```
┌─────────────────────────────────────┐
│  Vercel Dashboard                   │
│                                     │
│  📦 Your Project                    │
│    └─ Deployments                   │
│       └─ Latest Deployment          │
│          Production:                │
│          https://app.vercel.app     │ ← Copy this
└─────────────────────────────────────┘
```

---

## ❓ Still Can't Find It?

### Option 1: Check Your Browser History
- Look for URLs you've visited when testing your app
- The production URL is usually the one you use to access your app

### Option 2: Check Your Git Repository
- Look for deployment URLs in README files
- Check GitHub Actions or CI/CD logs

### Option 3: Check Your Email
- Railway/Vercel usually send deployment emails with URLs

### Option 4: Use Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get service URL
railway status
```

### Option 5: Use Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link to your project
vercel link

# Get deployment URL
vercel inspect
```

---

## ✅ Quick Checklist

- [ ] Found your deployment URL
- [ ] Tested the URL (should return `{"error":"Method not allowed"}`)
- [ ] Added `/api/telegram/webhook` to the end
- [ ] Set the webhook using the script
- [ ] Verified webhook is configured
- [ ] Sent a test message to the bot
- [ ] Checked logs for webhook requests

---

## 🎯 Next Steps

Once you have your URL:

1. **Set the webhook:**
   ```bash
   npx tsx scripts/set-telegram-webhook.ts https://YOUR-URL/api/telegram/webhook
   ```

2. **Verify it worked:**
   ```bash
   npx tsx scripts/check-telegram-bot-status.ts
   ```

3. **Test it:**
   - Send a message to your bot
   - Check your application logs
   - You should see: `[Telegram] Received update: ...`

---

**Need Help?** Share your deployment platform (Railway/Vercel) and I can guide you step-by-step!


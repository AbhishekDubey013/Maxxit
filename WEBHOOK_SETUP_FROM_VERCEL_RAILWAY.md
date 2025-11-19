# 🔗 Set Telegram Webhook from Vercel/Railway (Not Your Mac!)

You're absolutely right! The webhook setup doesn't need to be done from your Mac. Here are better ways:

---

## ✅ Option 1: Call API Endpoint from Vercel/Railway

I've created an API endpoint that you can call directly from your browser or from Vercel/Railway:

### From Browser (Easiest):

1. **Go to your Vercel deployment:**
   ```
   https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
   ```

2. **Or use curl:**
   ```bash
   curl -X POST https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
   ```

3. **The endpoint will:**
   - Automatically detect your deployment URL
   - Set the webhook to: `https://maxxitv3.vercel.app/api/telegram/webhook`
   - Return success/error status

---

## ✅ Option 2: Set in Vercel Environment Variables

### Step 1: Add Environment Variable

In Vercel Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   TELEGRAM_WEBHOOK_URL=https://maxxitv3.vercel.app/api/telegram/webhook
   ```

### Step 2: Call the API

After deployment, the API endpoint will automatically use this URL.

---

## ✅ Option 3: Automate in Deployment (Vercel)

Add to `vercel.json` or use Vercel's build hooks:

```json
{
  "buildCommand": "npm run build",
  "rewrites": [
    {
      "source": "/api/admin/set-telegram-webhook",
      "destination": "/api/admin/set-telegram-webhook"
    }
  ]
}
```

Then call after deployment:
```bash
curl -X POST https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
```

---

## ✅ Option 4: Railway Post-Deploy Script

Create `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Then add a post-deploy script in Railway:
- Go to Railway → Your Service → Settings → Deploy Hooks
- Create webhook that calls: `https://your-app.railway.app/api/admin/set-telegram-webhook`

---

## 🎯 Recommended Approach

**For Vercel:**

1. **Just visit this URL in your browser:**
   ```
   https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
   ```
   (You'll need to use a tool like Postman or curl since it's POST, or I can create a GET endpoint)

2. **Or use curl from anywhere:**
   ```bash
   curl -X POST https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
   ```

**That's it!** No need to use your Mac terminal.

---

## 🔧 Make It Even Easier: Add GET Endpoint

I can also create a GET endpoint so you can just visit the URL in your browser. Would you like me to add that?

---

## 📋 Summary

**Old Way (Not Needed):**
- ❌ Run script from Mac terminal
- ❌ Need local environment setup

**New Way (Better):**
- ✅ Call API endpoint from browser/anywhere
- ✅ Works from Vercel/Railway directly
- ✅ Can be automated in deployment

**Just visit:**
```
https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
```

(Or use curl/Postman to POST to it)


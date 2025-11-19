# 🚀 Deploy Webhook Endpoint to Vercel

## 🔍 Issue: 404 Error

You got a 404 because the new API endpoint hasn't been deployed to Vercel yet.

---

## ✅ Solution: Deploy to Vercel

The endpoint code is already committed and pushed to GitHub. Now you need to deploy it to Vercel.

### Option 1: Automatic Deployment (If Connected to GitHub)

If your Vercel project is connected to GitHub:

1. **The code is already pushed** to `Vprime-telegram-clean` branch
2. **Vercel should auto-deploy** if it's watching this branch
3. **Check Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Click your project (`maxxitv3`)
   - Go to **Deployments** tab
   - You should see a new deployment in progress or completed

4. **Wait for deployment to finish** (~2-3 minutes)
5. **Then visit:** `https://maxxitv3.vercel.app/api/admin/set-telegram-webhook`

---

### Option 2: Manual Deployment

If auto-deploy isn't working:

1. **Go to Vercel Dashboard**
2. **Click your project** (`maxxitv3`)
3. **Click "Deployments"** tab
4. **Click "..."** (three dots) on latest deployment
5. **Click "Redeploy"**
6. **Wait for deployment** (~2-3 minutes)
7. **Visit:** `https://maxxitv3.vercel.app/api/admin/set-telegram-webhook`

---

### Option 3: Use Vercel CLI

If you have Vercel CLI installed:

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
vercel --prod
```

This will deploy to production.

---

## 🔍 Verify Deployment

After deployment completes:

1. **Check Vercel Functions:**
   - Go to Deployments → Latest → **Functions** tab
   - You should see `/api/admin/set-telegram-webhook` in the list

2. **Visit the URL:**
   ```
   https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
   ```

3. **You should see JSON response** (not 404)

---

## ⚠️ Important: Add Environment Variable First

Before the endpoint will work, make sure `TELEGRAM_BOT_TOKEN` is set in Vercel:

1. **Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Add:**
   - Key: `TELEGRAM_BOT_TOKEN`
   - Value: `8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4`
   - Environment: **All**
3. **Save**
4. **Redeploy** (so the variable is available)

---

## 📋 Checklist

- [ ] Code is pushed to GitHub (✅ Already done)
- [ ] Vercel is connected to GitHub repo
- [ ] Wait for auto-deploy OR manually redeploy
- [ ] Add `TELEGRAM_BOT_TOKEN` to Vercel environment variables
- [ ] Redeploy after adding environment variable
- [ ] Visit `https://maxxitv3.vercel.app/api/admin/set-telegram-webhook`
- [ ] Should see JSON response (not 404)

---

## 🎯 Next Steps

1. **Check Vercel Dashboard** - Is there a new deployment?
2. **If not, manually redeploy**
3. **Add environment variable** (if not already added)
4. **Wait for deployment to finish**
5. **Visit the URL again**

Let me know what you see in Vercel dashboard! 🚀


# Twitter Proxy Deployment on Render

This guide explains how to deploy the Twitter API proxy service on Render as a separate service.

---

## 🎯 Why Separate Service?

- **Better Architecture**: Separates Python service from Node.js workers
- **Reliability**: Render has excellent Python support
- **Scalability**: Twitter proxy can scale independently
- **Simplicity**: Railway only handles Node.js workers

---

## 🚀 Deployment Steps

### **Option 1: Blueprint Deployment (Recommended)**

1. **Push the blueprint to GitHub:**
   ```bash
   git add render-twitter-proxy.yaml
   git commit -m "Add Twitter proxy Render blueprint"
   git push origin main
   ```

2. **Deploy on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New** → **Blueprint**
   - Connect your GitHub repository
   - Select the branch: `main`
   - Render will detect `render-twitter-proxy.yaml`
   - Click **Apply**

3. **Set Environment Variables:**
   - After deployment, go to the service
   - Navigate to **Environment** tab
   - Add:
     ```
     GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977
     ```

4. **Get Service URL:**
   - Copy the service URL (e.g., `https://maxxit-twitter-proxy.onrender.com`)
   - This will be used in Railway configuration

---

### **Option 2: Manual Deployment**

1. **Create New Web Service:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click **New** → **Web Service**
   - Connect your GitHub repository
   - Select branch: `main`

2. **Configure Service:**
   - **Name**: `maxxit-twitter-proxy`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `services`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements-twitter.txt`
   - **Start Command**: `python twitter-proxy.py`

3. **Set Environment Variables:**
   ```
   GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977
   PORT=10000
   ```

4. **Advanced Settings:**
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: Yes

5. **Deploy:**
   - Click **Create Web Service**
   - Wait for deployment to complete

---

## 🔗 Configure Railway to Use Render Proxy

Once your Twitter proxy is deployed on Render:

1. **Get the Render URL:**
   - Copy from Render dashboard (e.g., `https://maxxit-twitter-proxy.onrender.com`)

2. **Add to Railway Environment Variables:**
   - Go to Railway Dashboard
   - Select **Workers** service
   - Go to **Variables** tab
   - Add:
     ```
     TWITTER_PROXY_URL=https://maxxit-twitter-proxy.onrender.com
     ```

3. **Redeploy Railway Workers:**
   - Railway will automatically redeploy with the new environment variable
   - Workers will now use the Render proxy instead of local Python

---

## ✅ Verify Deployment

### **1. Check Render Service Health**

```bash
curl https://maxxit-twitter-proxy.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "twitter-proxy",
  "game_api_configured": true,
  "client_initialized": true
}
```

### **2. Test Tweet Fetching**

```bash
curl "https://maxxit-twitter-proxy.onrender.com/tweets/Abhishe42402615?max_results=5"
```

Expected response:
```json
{
  "username": "Abhishe42402615",
  "count": 5,
  "data": [
    {
      "id": "1234567890",
      "text": "Tweet content...",
      "created_at": "2025-11-04T...",
      "author_id": "..."
    }
  ]
}
```

### **3. Check Railway Worker Logs**

Look for:
```
🔌 Twitter Proxy Configuration
   Using proxy at: https://maxxit-twitter-proxy.onrender.com
   ✅ External proxy configured (Render service)

Checking Twitter proxy at: https://maxxit-twitter-proxy.onrender.com
✅ Twitter proxy is available (client: ready)

[Abhishe42402615] Processing...
[Abhishe42402615] ✅ Fetched 5 tweets from X API
[Abhishe42402615] ✅ 5 created, 0 skipped
```

---

## 🐛 Troubleshooting

### **Issue: 503 Service Unavailable**

**Cause:** Render free tier spins down after inactivity

**Fix:** 
- First request may take 30-60 seconds to wake up
- Workers will retry automatically
- Consider upgrading to paid tier for always-on service

### **Issue: "client_initialized": false**

**Cause:** GAME_API_KEY not set or invalid

**Fix:**
1. Go to Render service → Environment
2. Verify `GAME_API_KEY` is set correctly
3. Redeploy service

### **Issue: Workers still say "localhost"**

**Cause:** `TWITTER_PROXY_URL` not set in Railway

**Fix:**
1. Go to Railway → Workers service → Variables
2. Add: `TWITTER_PROXY_URL=https://your-render-url.onrender.com`
3. Railway will auto-redeploy

---

## 📊 Monitoring

### **Render Logs**

View real-time logs:
- Go to Render service
- Click **Logs** tab
- Watch for incoming requests

### **Railway Logs**

View worker activity:
- Go to Railway → Workers service
- Click **Deployments** → Latest deployment
- Watch for tweet ingestion logs

---

## 💰 Cost

- **Free Tier**: 750 hours/month (plenty for this service)
- **Spin Down**: After 15 minutes of inactivity
- **First Request**: May take 30-60 seconds to wake up
- **Upgrade**: $7/month for always-on service

---

## 🔄 Architecture

```
┌─────────────────────────────────────────────────┐
│                   RAILWAY                       │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │   Workers Service (Node.js)         │       │
│  │   - Tweet Ingestion Worker          │       │
│  │   - Signal Generator                │       │
│  │   - Trade Executor                  │       │
│  │   - Position Monitor                │       │
│  └────────────┬────────────────────────┘       │
│               │ HTTP Request                    │
└───────────────┼─────────────────────────────────┘
                │
                │ TWITTER_PROXY_URL
                │
                ▼
┌─────────────────────────────────────────────────┐
│                   RENDER                        │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │   Twitter Proxy Service (Python)    │       │
│  │   - Flask REST API                  │       │
│  │   - virtuals_tweepy SDK             │       │
│  │   - GAME API Integration            │       │
│  └─────────────────────────────────────┘       │
│                                                 │
└─────────────────────────────────────────────────┘
                │
                │ GAME_API_KEY
                │
                ▼
         ┌──────────────┐
         │  Twitter/X   │
         │  (via GAME)  │
         └──────────────┘
```

---

## ✅ Benefits

- ✅ Railway stays Node.js only (simpler, faster builds)
- ✅ Render handles Python perfectly (native support)
- ✅ Services can scale independently
- ✅ Cleaner separation of concerns
- ✅ Easy to debug (separate logs)
- ✅ Both services on free tiers!

---

## 🎉 You're Done!

Once deployed:
1. ✅ Twitter proxy running on Render
2. ✅ Workers using Render proxy via `TWITTER_PROXY_URL`
3. ✅ New tweets being fetched automatically
4. ✅ Complete automation working end-to-end!

No more Python issues on Railway! 🚀


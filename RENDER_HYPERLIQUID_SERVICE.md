# Deploy Hyperliquid Service to Render

## Deploy Only the Python Service from Monorepo

This guide shows how to deploy just the `services/hyperliquid-service` directory from your repository to Render.

---

## Step 1: Create New Web Service

1. Go to [render.com](https://render.com) and login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `AbhishekDubey013/Maxxit`

---

## Step 2: Configure Build Settings

### ⚠️ IMPORTANT: Select Python Environment

Render will auto-detect the Dockerfile in your repo root and default to **Docker** mode. You need to change this:

1. Look for **Environment** dropdown near the top of the form
2. Click it and select: **Python 3** ⭐
3. This tells Render to ignore Dockerfiles and use native Python runtime

### Basic Settings

- **Name**: `maxxit-hyperliquid-service` (or any name you prefer)
- **Region**: Choose closest to your Railway app (e.g., Oregon US West)
- **Branch**: `main`
- **Root Directory**: `services` ⭐ (This is key!)
- **Environment**: `Python 3` ⭐ (NOT Docker!)
- **Runtime**: `Python 3.11`

### Build & Deploy

- **Build Command**:
  ```bash
  pip install -r requirements-hyperliquid.txt
  ```

- **Start Command**:
  ```bash
  python hyperliquid-service.py --port $PORT
  ```

---

## Step 3: Environment Variables

Click **"Environment"** and add:

```bash
PORT=5001
HYPERLIQUID_TESTNET=true
```

**Note**: The `PORT` variable will be automatically set by Render, but you can specify a default.

---

## Step 4: Instance Type

- **Free Tier**: Select "Free" (sleeps after 15 min of inactivity)
- **Paid Tier**: $7/month for always-on service (recommended for production)

---

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repo
   - Navigate to `services/hyperliquid-service`
   - Run `pip install -r requirements.txt`
   - Start the service with `python main.py --port $PORT`
3. Wait 2-3 minutes for deployment

---

## Step 6: Get Service URL

After deployment completes, you'll see a URL like:
```
https://maxxit-hyperliquid-service.onrender.com
```

Copy this URL and add it to your Railway environment variables as:
```bash
HYPERLIQUID_SERVICE_URL=https://maxxit-hyperliquid-service.onrender.com
```

---

## Step 7: Test the Service

Test if the service is running:

```bash
# Health check
curl https://your-service.onrender.com/health

# Expected response:
{"status":"healthy","testnet":true}
```

Test Hyperliquid API:

```bash
curl -X POST https://your-service.onrender.com/balance \
  -H "Content-Type: application/json" \
  -d '{"address":"0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"}'

# Expected response:
{"withdrawable":0,"total":0}
```

---

## Why Root Directory is Important

By setting **Root Directory** to `services`, Render will:

1. ✅ Clone the entire repo
2. ✅ Change directory to `services`
3. ✅ Look for `requirements-hyperliquid.txt` there
4. ✅ Execute commands from that directory

This allows you to deploy just one service from a monorepo without needing a separate repository.

---

## File Structure

Your repo structure:
```
Maxxit/
├── services/                    ← Render deploys THIS directory
│   ├── hyperliquid-service.py
│   ├── requirements-hyperliquid.txt
│   └── start-render.sh
├── pages/
├── components/
├── lib/
└── ...
```

Render's view (after setting root directory):
```
(root = services/)
├── hyperliquid-service.py
├── requirements-hyperliquid.txt
└── start-render.sh
```

---

## Troubleshooting

### Build Fails: "requirements.txt not found" or "requirements-hyperliquid.txt not found"

**Problem**: Render can't find `requirements-hyperliquid.txt`

**Solution**: Make sure **Root Directory** is set to `services` (NOT `services/hyperliquid-service`)

### Service Crashes on Start

**Problem**: Port binding issues

**Solution**: Ensure `hyperliquid-service.py` reads the `PORT` environment variable:

```python
import os
port = int(os.getenv('PORT', 5001))
app.run(host='0.0.0.0', port=port)
```

### Service Sleeps After 15 Minutes (Free Tier)

**Problem**: Render's free tier puts inactive services to sleep

**Solutions**:
1. Upgrade to paid tier ($7/month) for always-on
2. Use a service like UptimeRobot to ping your service every 5 minutes
3. Accept the cold start delay (15-30 seconds when waking up)

### Wrong Python Version

**Problem**: Service requires Python 3.11+

**Solution**: In Render dashboard → **Environment** → Set:
```bash
PYTHON_VERSION=3.11
```

---

## Environment Variables Reference

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | Auto-set by Render | ✅ Yes |
| `HYPERLIQUID_TESTNET` | `true` or `false` | ✅ Yes |
| `PYTHON_VERSION` | `3.11` | Optional |

---

## Monitoring & Logs

### View Logs

1. Go to your service dashboard on Render
2. Click **"Logs"** tab
3. See real-time logs

Look for:
```
[HyperliquidService] Starting on port 5001 (testnet mode)
[HyperliquidService] Service ready!
```

### Monitor Status

- **Events**: Shows deployment history
- **Metrics**: Shows CPU, memory usage (paid tier only)

---

## Updating the Service

When you push changes to `services/hyperliquid-service/`:

1. Commit and push to GitHub
2. Render automatically detects the change
3. Rebuilds and redeploys (takes 2-3 minutes)
4. Zero downtime with rolling deployments

---

## Cost

### Free Tier
- ✅ Free forever
- ✅ 750 hours/month
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ 100GB bandwidth/month
- ⚠️ Cold start delay (15-30 sec)

### Paid Tier ($7/month)
- ✅ Always-on (no sleep)
- ✅ Faster cold starts
- ✅ 400GB bandwidth/month
- ✅ Better for production

---

## Alternative: Deploy to Railway

You can also deploy the Python service to Railway if you prefer:

1. Create new Railway service
2. Connect same GitHub repo
3. Set **Root Directory** in `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd services/hyperliquid-service && pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "cd services/hyperliquid-service && python main.py --port $PORT"
  }
}
```

**Pros of Railway**: Same platform as your main app  
**Cons of Railway**: More expensive for simple services

---

## Summary

✅ **Root Directory**: `services/hyperliquid-service`  
✅ **Build Command**: `pip install -r requirements.txt`  
✅ **Start Command**: `python main.py --port $PORT`  
✅ **Environment**: `HYPERLIQUID_TESTNET=true`  

That's it! Your Hyperliquid service will be live at:
```
https://your-service.onrender.com
```

Add this URL to Railway as `HYPERLIQUID_SERVICE_URL` and you're done! 🚀


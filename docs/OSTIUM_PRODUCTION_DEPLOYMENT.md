# 🚀 Ostium Production Deployment Guide

## Overview

The Ostium integration requires a Python service (`ostium-service.py`) to be running alongside your main Next.js app. This guide explains how to deploy it.

---

## 🏗️ Architecture

```
┌─────────────────────────┐
│   Next.js App (Vercel)  │
│   - Frontend             │
│   - API Routes           │
└────────┬────────────────┘
         │ HTTP
         ↓
┌─────────────────────────┐
│  Ostium Python Service  │
│  (Flask on Railway)      │
│  - Ostium SDK           │
│  - Position mgmt        │
│  - Balance checks       │
└─────────────────────────┘
```

---

## ⚠️ Current Status

**The 500 error you're seeing happens because:**
1. `OSTIUM_SERVICE_URL` is not set in production
2. The Ostium Python service is not deployed

**I've made the frontend resilient**, so it now:
- ✅ Shows a warning instead of crashing
- ✅ Allows deployment creation without the service
- ⚠️  Balance shows as $0 (faucet won't work)

---

## 🔧 Deploy Options

### **Option 1: Railway (Recommended)**

Railway is great for Python services with persistent connections.

#### **Step 1: Create Railway Project**
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your Maxxit repository

#### **Step 2: Configure Service**
Create `railway.json` in `/services`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements-ostium.txt"
  },
  "deploy": {
    "startCommand": "cd services && python ostium-service.py",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

#### **Step 3: Set Environment Variables**
In Railway dashboard, set:

```bash
OSTIUM_TESTNET=true
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
PORT=5002
```

#### **Step 4: Get Service URL**
After deployment, Railway gives you a URL like:
```
https://ostium-service-production.up.railway.app
```

#### **Step 5: Update Vercel**
In your Vercel project settings, add:

```bash
OSTIUM_SERVICE_URL=https://ostium-service-production.up.railway.app
```

---

### **Option 2: Render**

Similar to Railway but free tier has cold starts.

#### **Deploy Steps:**
1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - **Root Directory**: `services`
   - **Build Command**: `pip install -r requirements-ostium.txt`
   - **Start Command**: `python ostium-service.py`
   - **Port**: `5002`

5. Set environment variables (same as Railway)

6. Copy service URL and add to Vercel

---

### **Option 3: Fly.io**

Good for global deployment with multiple regions.

```bash
# Install flyctl
brew install flyctl

# Login
fly auth login

# Navigate to services
cd services

# Create fly.toml
cat > fly.toml << EOF
app = "maxxit-ostium-service"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "5002"
  OSTIUM_TESTNET = "true"

[[services]]
  internal_port = 5002
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[services.http_checks]]
  interval = 10000
  method = "get"
  path = "/health"
  timeout = 2000
EOF

# Deploy
fly deploy

# Get URL
fly status
```

---

### **Option 4: Same Server as Main App**

If your Next.js app is on a VPS (not Vercel), you can run both services on the same machine.

```bash
# SSH into your server
ssh your-server

# Install Python dependencies
cd /path/to/maxxit/services
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-ostium.txt

# Run as systemd service
sudo nano /etc/systemd/system/ostium-service.service
```

```ini
[Unit]
Description=Ostium Trading Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/maxxit/services
Environment="OSTIUM_TESTNET=true"
Environment="OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc"
ExecStart=/path/to/maxxit/services/venv/bin/python ostium-service.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl enable ostium-service
sudo systemctl start ostium-service

# Check status
sudo systemctl status ostium-service

# Then set in .env
OSTIUM_SERVICE_URL=http://localhost:5002
```

---

## 🧪 Testing Deployment

### **1. Health Check**
```bash
curl https://your-ostium-service.railway.app/health
```

Expected:
```json
{"status": "ok", "message": "Ostium service is running"}
```

### **2. Balance Check**
```bash
curl -X POST https://your-ostium-service.railway.app/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourAddress"}'
```

### **3. From Frontend**
After deployment, the warning should disappear and balance should load correctly.

---

## 📋 Environment Variables Checklist

### **Ostium Service (Railway/Render):**
- [x] `OSTIUM_TESTNET=true` (or false for mainnet)
- [x] `OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc`
- [x] `PORT=5002`

### **Next.js App (Vercel):**
- [x] `OSTIUM_SERVICE_URL=https://your-ostium-service.railway.app`
- [x] `OSTIUM_TESTNET=true`
- [x] `OSTIUM_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3`
- [x] `OSTIUM_PROFIT_SHARE=10`

---

## 🔒 Security Considerations

1. **API Authentication** (Optional but recommended):
   ```python
   # Add to ostium-service.py
   API_KEY = os.getenv('OSTIUM_API_KEY')
   
   @app.before_request
   def check_api_key():
       if request.headers.get('X-API-Key') != API_KEY:
           return jsonify({"error": "Unauthorized"}), 401
   ```

2. **Rate Limiting**:
   ```bash
   pip install flask-limiter
   ```

3. **CORS** (Already configured):
   ```python
   CORS(app, origins=[
       "https://maxxit1-nx5vurb8l-abhisheks-projects-74a6b2ad.vercel.app",
       "http://localhost:3000"
   ])
   ```

---

## 💰 Cost Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| **Railway** | $5 credit/month (enough for small service) | ~$5-10/month |
| **Render** | 750 hours/month free | $7/month |
| **Fly.io** | 3 VMs free | ~$5/month |
| **Vercel** | Free for Next.js | Free (hobby) |

**Total**: Can run entirely on free tiers! 🎉

---

## 🐛 Troubleshooting

### **"500 Internal Server Error"**
✅ Fixed! Now shows graceful warning instead.

### **"Service Unavailable" Warning**
**Solution**: Deploy the Python service and set `OSTIUM_SERVICE_URL`

### **"OSTIUM_SERVICE_URL not configured"**
**Solution**: Add env var in Vercel dashboard

### **Cold Starts (Render/Railway)**
Free tiers may sleep after inactivity. First request might be slow.

**Solution**: 
- Upgrade to paid tier
- Or implement a ping service to keep it warm

### **Connection Refused**
**Check**:
1. Service is running: `curl https://your-service.com/health`
2. URL is correct in Vercel env vars
3. No firewall blocking

---

## 📊 Monitoring

### **Railway Dashboard**
- View logs in real-time
- Track memory/CPU usage
- Set up alerts

### **Logs**
```bash
# Railway CLI
railway logs

# Or check Railway dashboard
```

### **Uptime Monitoring**
Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/health` every 5 minutes.

---

## 🚀 Quick Deploy Script

```bash
#!/bin/bash
# deploy-ostium.sh

echo "🚀 Deploying Ostium Service..."

# 1. Push to GitHub
git add services/
git commit -m "Deploy Ostium service"
git push origin main

# 2. Deploy to Railway (if railway CLI installed)
cd services
railway up

# 3. Get URL
OSTIUM_URL=$(railway status --json | jq -r '.service.url')
echo "✅ Service deployed to: $OSTIUM_URL"

# 4. Update Vercel
echo "📝 Update Vercel with:"
echo "OSTIUM_SERVICE_URL=$OSTIUM_URL"

echo "🎉 Done! Test at: $OSTIUM_URL/health"
```

---

## ✅ Post-Deployment Checklist

- [ ] Python service deployed and accessible
- [ ] Health endpoint returns 200
- [ ] `OSTIUM_SERVICE_URL` set in Vercel
- [ ] Warning banner disappeared in UI
- [ ] Balance loads correctly
- [ ] Can create agent deployments
- [ ] Faucet works (if on testnet)
- [ ] Monitoring/alerts configured

---

## 🆘 Need Help?

If you're stuck:
1. Check Railway/Render logs
2. Test health endpoint directly
3. Verify all env vars are set
4. Check browser console for errors

**The frontend will work without the service**, you just won't have:
- Balance checks
- Faucet
- Real-time position updates

**But you can still**: Create deployments and trade!

---

## 📝 Summary

**Quick Fix (What I Did):**
- Made API endpoints resilient
- Show warning instead of crash
- Allow deployment without service

**Full Fix (What You Need to Do):**
1. Deploy `services/ostium-service.py` to Railway/Render
2. Set `OSTIUM_SERVICE_URL` in Vercel
3. Redeploy frontend
4. ✅ Everything works!

---

**Estimated Time**: 15-30 minutes to deploy 🚀

Let me know if you need help with any of these steps!


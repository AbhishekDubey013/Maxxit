# Render.com Deployment Checklist

## 📋 Complete Setup Guide for Maxxit Python Services (Hyperliquid + Ostium + Twitter)

---

## ✅ **Pre-Deployment Checklist:**

### **1. GitHub Repository**
- [ ] Code pushed to GitHub
- [ ] All services in `services/` directory
- [ ] Files present:
  - `services/ostium-service.py`
  - `services/hyperliquid-service/app.py`
  - `services/twitter-proxy.py`
  - `services/requirements-ostium.txt`
  - `services/requirements-twitter.txt`
  - `services/hyperliquid-service/requirements.txt`
  - `services/start-all-services.sh`
  - `services/render.yaml`

### **2. Render.com Account**
- [ ] Create account at [render.com](https://render.com)
- [ ] Connect GitHub account
- [ ] Free tier is sufficient for testing

---

## 🚀 **Render Deployment Steps:**

### **Step 1: Create New Web Service**

1. Go to Render Dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your `Maxxit` repository

### **Step 2: Configure Service Settings**

| Setting | Value |
|---------|-------|
| **Name** | `maxxit-python-services` |
| **Runtime** | **Python 3** |
| **Region** | Oregon (or closest to you) |
| **Branch** | `main` |
| **Root Directory** | `services` |

### **Step 3: Build & Start Commands**

#### **Build Command:**
```bash
pip install -r requirements-twitter.txt && pip install -r requirements-ostium.txt && cd hyperliquid-service && pip install -r requirements.txt
```

#### **Start Command:**
```bash
bash start-all-services.sh
```

### **Step 4: Plan Selection**

- [ ] Select **"Free"** tier (sufficient for testing)
- [ ] Or select **"Starter"** ($7/month) for production

---

## 🔐 **Environment Variables to Add:**

### **Required Variables:**

Click **"Advanced"** → **"Add Environment Variable"** for each:

#### **1. Game API (Twitter)**
```
GAME_API_KEY
Value: [Your Game API key]
```

#### **2. Hyperliquid Configuration**
```
HYPERLIQUID_TESTNET
Value: true
```

#### **3. Ostium Configuration** ⭐

```
OSTIUM_TESTNET
Value: true
```

```
OSTIUM_RPC_URL
Value: https://sepolia-rollup.arbitrum.io/rpc
```

```
OSTIUM_PLATFORM_WALLET
Value: 0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
```
*(Your profit collection address)*

```
OSTIUM_PROFIT_SHARE
Value: 10
```

#### **4. Port Configuration**
```
PORT
Value: 5001
```

```
OSTIUM_PORT
Value: 5002
```

```
TWITTER_PROXY_PORT
Value: 5003
```

#### **5. Database (if needed)**
```
DATABASE_URL
Value: [Your Postgres connection string]
```
*(Usually auto-provided by Render if you add a database)*

---

## 📊 **Complete Environment Variables List:**

### **Copy-Paste Ready:**

```env
# Game API (Twitter)
GAME_API_KEY=your_game_api_key_here

# Hyperliquid
HYPERLIQUID_TESTNET=true

# Ostium
OSTIUM_TESTNET=true
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
OSTIUM_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
OSTIUM_PROFIT_SHARE=10

# Ports
PORT=5001
OSTIUM_PORT=5002
TWITTER_PROXY_PORT=5003
```

---

## 🔍 **Health Check Configuration:**

### **Health Check Path:**
```
/health
```

This checks all services are running.

---

## 🎯 **After Deployment:**

### **1. Wait for Build to Complete**

Monitor the logs - you should see:
```
🚀 Starting All Python Services...
✅ Hyperliquid service started (PID: xxx)
✅ Ostium service started (PID: xxx)
✅ Twitter proxy started (PID: xxx)
```

### **2. Get Your Service URL**

Render will provide a URL like:
```
https://maxxit-python-services.onrender.com
```

### **3. Test Services**

```bash
# Test Hyperliquid
curl https://maxxit-python-services.onrender.com/health

# Test Ostium (port 5002 routes to /)
curl https://maxxit-python-services.onrender.com/health

# All services should respond with {"status": "healthy"}
```

### **4. Update Your Main Application**

In your main `.env` file (for Next.js backend):
```env
HYPERLIQUID_SERVICE_URL=https://maxxit-python-services.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-python-services.onrender.com
TWITTER_PROXY_URL=https://maxxit-python-services.onrender.com
```

*(Note: Render handles internal port routing)*

---

## ⚠️ **Common Issues & Solutions:**

### **Issue 1: Build Fails**

**Error:** `Could not find requirements.txt`

**Solution:**
- Verify **Root Directory** is set to `services`
- Check all requirements files exist in repo

### **Issue 2: Service Crashes on Start**

**Error:** `Address already in use`

**Solution:**
- This shouldn't happen on Render (they handle ports)
- If it does, check the logs and ensure `start-all-services.sh` is correct

### **Issue 3: Health Check Fails**

**Error:** `Health check failed`

**Solution:**
- Check logs for startup errors
- Verify all environment variables are set
- Ensure services started successfully

### **Issue 4: Import Errors**

**Error:** `ModuleNotFoundError: No module named 'ostium_python_sdk'`

**Solution:**
- Verify build command includes `pip install -r requirements-ostium.txt`
- Check `requirements-ostium.txt` contains `ostium-python-sdk==3.0.0`

### **Issue 5: SSL Certificate Errors**

**Error:** `SSL: CERTIFICATE_VERIFY_FAILED`

**Solution:**
- Already handled in `ostium-service.py` (SSL bypass for testnet)
- If still failing, check Python version (use 3.10+)

---

## 🎛️ **Advanced Configuration (Optional):**

### **Auto-Deploy on Push:**

Render automatically redeploys when you push to `main` branch.

To disable:
1. Go to **Settings** → **Deploy**
2. Disable **Auto-Deploy**

### **Custom Domain:**

1. Go to **Settings** → **Custom Domains**
2. Add your domain (e.g., `api.maxxit.io`)
3. Update DNS records as instructed

### **Scaling:**

For production load:
1. Upgrade to **Starter** plan ($7/month)
2. Or **Standard** plan ($25/month) for more resources

### **Monitoring:**

Render provides:
- Real-time logs
- CPU/Memory metrics
- Deployment history
- Crash detection & auto-restart

---

## 📝 **Deployment Script (Alternative):**

If you prefer automated deployment:

```bash
#!/bin/bash

# deploy-to-render.sh

echo "🚀 Deploying to Render..."

# 1. Push latest changes
git add -A
git commit -m "Deploy to Render"
git push origin main

echo "✅ Pushed to GitHub"
echo "⏳ Render will auto-deploy in ~2 minutes"
echo ""
echo "Monitor deployment:"
echo "https://dashboard.render.com"
echo ""
echo "Once deployed, your service URL:"
echo "https://maxxit-python-services.onrender.com"
```

---

## 🔐 **Security Best Practices:**

### **1. Environment Variables**

- [ ] Never commit `.env` files
- [ ] Use Render's **Secret Files** for sensitive data
- [ ] Rotate API keys regularly

### **2. HTTPS**

- [ ] Render automatically provides SSL
- [ ] All traffic encrypted by default

### **3. Access Control**

- [ ] Python services only accessible via your backend
- [ ] Not exposed publicly (internal network)

---

## 📊 **Monitoring After Deployment:**

### **Check Logs:**

```bash
# In Render Dashboard → Logs tab

# You should see:
[INFO] 🚀 Ostium Service Starting...
[INFO] Network: TESTNET
[INFO] RPC URL: https://sepolia-rollup.arbitrum.io/rpc
[INFO] 🚀 Starting Ostium Service on port 5002
[INFO] Serving Flask app 'ostium-service'
```

### **Test Endpoints:**

```bash
# From your terminal
export SERVICE_URL="https://maxxit-python-services.onrender.com"

# Test Ostium balance
curl -X POST $SERVICE_URL/balance \
  -H 'Content-Type: application/json' \
  -d '{"address":"0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"}'

# Expected response:
{
  "success": true,
  "usdcBalance": "8997.5",
  "ethBalance": "0.5",
  "address": "0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"
}
```

---

## 🎉 **Success Checklist:**

After deployment, verify:

- [ ] Build completed successfully
- [ ] All 3 services started (Hyperliquid, Ostium, Twitter)
- [ ] Health check passes
- [ ] Service URL accessible
- [ ] Test endpoints respond correctly
- [ ] Main backend can connect to services
- [ ] Logs show no errors
- [ ] Environment variables loaded correctly

---

## 📞 **Support:**

### **If Deployment Fails:**

1. **Check Render Logs:** Most issues show in logs
2. **Verify Environment Variables:** All required vars set?
3. **Test Locally First:** Run `bash start-all-services.sh` locally
4. **Check GitHub:** All files committed and pushed?

### **Render Support:**

- Documentation: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

---

## 🚀 **Production Deployment (Mainnet):**

When ready for production:

1. **Update Environment Variables:**
```env
OSTIUM_TESTNET=false
OSTIUM_RPC_URL=https://arb1.arbitrum.io/rpc
HYPERLIQUID_TESTNET=false
```

2. **Upgrade Plan:** Move to **Starter** or **Standard**

3. **Enable Monitoring:** Set up alerts for downtime

4. **Test Thoroughly:** Run full test suite before switching

---

## 📋 **Quick Reference:**

```
Render Service Name: maxxit-python-services
Runtime: Python 3
Root Directory: services
Build Command: pip install -r requirements-twitter.txt && 
               pip install -r requirements-ostium.txt && 
               cd hyperliquid-service && 
               pip install -r requirements.txt
Start Command: bash start-all-services.sh
Health Check: /health
Plan: Free (testing) or Starter (production)
```

---

## ✅ **Final Steps After Deployment:**

1. **Copy Service URL** from Render dashboard
2. **Update `.env`** in your main project:
   ```env
   OSTIUM_SERVICE_URL=https://maxxit-python-services.onrender.com
   ```
3. **Redeploy main backend** (if already deployed)
4. **Test end-to-end** with a tweet or manual trade
5. **Monitor logs** for first few trades

---

**You're ready to deploy! 🎊**

**Estimated deployment time:** 5-10 minutes  
**Cost:** Free tier (sufficient for testing)  
**Auto-redeploy:** Yes (on git push)


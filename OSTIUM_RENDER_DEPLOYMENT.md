# Ostium Service - Standalone Render Deployment

## 🎯 Dedicated Ostium Service Configuration

This guide is for deploying **Ostium as a standalone service** on Render (separate from Hyperliquid and Twitter services).

---

## 📦 **Your 3 Separate Services:**

```
Service 1: Hyperliquid Service
   URL: https://maxxit-hyperliquid.onrender.com
   Port: 5001

Service 2: Ostium Service ⭐ (This one)
   URL: https://maxxit-ostium.onrender.com
   Port: 5002

Service 3: Twitter Proxy
   URL: https://maxxit-twitter.onrender.com
   Port: 5003
```

---

## 🚀 **Ostium Service Deployment:**

### **Step 1: Create New Web Service**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository (`Maxxit`)

### **Step 2: Service Configuration**

| Setting | Value |
|---------|-------|
| **Name** | `maxxit-ostium-service` |
| **Runtime** | Python 3 |
| **Region** | Oregon (or your preference) |
| **Branch** | `main` |
| **Root Directory** | `services` ⚠️ **CRITICAL** |
| **Plan** | Free (or Starter for production) |

### **Step 3: Build & Start Commands**

#### **Build Command:**
```bash
pip install -r requirements-ostium.txt
```

#### **Start Command:**
```bash
python ostium-service.py
```

### **Step 4: Environment Variables**

Click **"Advanced"** → Add these variables:

```env
OSTIUM_TESTNET=true
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
OSTIUM_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
OSTIUM_PROFIT_SHARE=10
PORT=5002
```

### **Step 5: Health Check**

| Setting | Value |
|---------|-------|
| **Health Check Path** | `/health` |
| **Health Check Interval** | 60 seconds |

---

## ✅ **Complete Environment Variables:**

### **For Testnet (Current):**

```env
# Network Configuration
OSTIUM_TESTNET=true
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Platform Configuration
OSTIUM_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
OSTIUM_PROFIT_SHARE=10

# Port Configuration
PORT=5002
```

### **For Mainnet (Later):**

```env
# Network Configuration
OSTIUM_TESTNET=false
OSTIUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Platform Configuration
OSTIUM_PLATFORM_WALLET=0xYourMainnetCollectorAddress
OSTIUM_PROFIT_SHARE=10

# Port Configuration
PORT=5002
```

---

## 🔍 **Verification:**

### **1. Check Deployment Logs**

After clicking "Create Web Service", monitor logs:

```
Installing dependencies...
Collecting ostium-python-sdk==3.0.0
Collecting Flask==3.0.0
Collecting web3==6.11.3
✅ Successfully installed

Starting service...
🚀 Ostium Service Starting...
   Network: TESTNET
   RPC URL: https://sepolia-rollup.arbitrum.io/rpc
🚀 Starting Ostium Service on port 5002
 * Serving Flask app 'ostium-service'
 * Debug mode: off
✅ Running on http://0.0.0.0:5002
```

### **2. Get Service URL**

Render provides a URL like:
```
https://maxxit-ostium-service.onrender.com
```

### **3. Test Health Endpoint**

```bash
curl https://maxxit-ostium-service.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ostium",
  "network": "testnet",
  "timestamp": "2025-11-09T12:00:00.000Z"
}
```

### **4. Test Balance Endpoint**

```bash
curl -X POST https://maxxit-ostium-service.onrender.com/balance \
  -H 'Content-Type: application/json' \
  -d '{"address":"0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"}'
```

Expected response:
```json
{
  "success": true,
  "usdcBalance": "8997.5",
  "ethBalance": "0.5",
  "address": "0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"
}
```

---

## 🔧 **Update Your Main Application:**

### **In your Next.js backend .env:**

```env
# Ostium Service URL
OSTIUM_SERVICE_URL=https://maxxit-ostium-service.onrender.com

# Other services (if separate)
HYPERLIQUID_SERVICE_URL=https://maxxit-hyperliquid.onrender.com
TWITTER_PROXY_URL=https://maxxit-twitter.onrender.com
```

### **Verify in your code:**

The adapter should automatically use the URL:

```typescript
// lib/adapters/ostium-adapter.ts
const OSTIUM_SERVICE_URL = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';

export async function openOstiumPosition(params) {
  const response = await fetch(`${OSTIUM_SERVICE_URL}/open-position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  // ...
}
```

---

## 📊 **Service Specifications:**

### **Dependencies (requirements-ostium.txt):**

```txt
Flask==3.0.0
flask-cors==4.0.0
ostium-python-sdk==3.0.0
web3==6.11.3
setuptools>=65.0.0
humanize>=4.0.0
gql[requests]>=4.0.0
python-dotenv==1.0.0
requests==2.31.0
```

### **Endpoints Provided:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/balance` | POST | Get wallet balances |
| `/open-position` | POST | Open trading position |
| `/close-position` | POST | Close trading position |
| `/positions` | POST | Get open positions |
| `/approve-agent` | POST | Approve agent delegation |
| `/transfer` | POST | Transfer USDC |
| `/faucet` | POST | Request testnet tokens |

---

## ⚠️ **Common Issues:**

### **Issue 1: Build Fails - Module Not Found**

**Error:**
```
ModuleNotFoundError: No module named 'ostium_python_sdk'
```

**Solution:**
- Verify `requirements-ostium.txt` exists in `services/` directory
- Check build command: `pip install -r requirements-ostium.txt`
- Ensure Root Directory is set to `services`

### **Issue 2: SSL Certificate Errors**

**Error:**
```
SSL: CERTIFICATE_VERIFY_FAILED
```

**Solution:**
- Already handled in `ostium-service.py` with SSL bypass
- If still failing, check Python version (should be 3.10+)
- Verify `OSTIUM_RPC_URL` is correct

### **Issue 3: Service Crashes on Start**

**Error:**
```
Address already in use
```

**Solution:**
- This shouldn't happen on Render (they manage ports)
- If it does, check that `PORT` env var is set to `5002`
- Verify no other process is binding to the port

### **Issue 4: Health Check Fails**

**Error:**
```
Health check failed: Connection refused
```

**Solution:**
- Check service logs for startup errors
- Verify all environment variables are set correctly
- Ensure Flask is binding to `0.0.0.0` not `localhost`
- Wait 30-60 seconds for service to fully start

### **Issue 5: Trading Fails**

**Error:**
```
Failed to execute trade
```

**Solution:**
- Verify `OSTIUM_TESTNET=true` for testnet
- Check `OSTIUM_RPC_URL` is correct
- Ensure wallet has sufficient balance
- Check agent is approved on-chain

---

## 🔄 **Auto-Deploy Configuration:**

### **Automatic Deployment:**

Render automatically redeploys when you push to `main` branch:

```bash
# Make changes to ostium-service.py
git add services/ostium-service.py
git commit -m "Update Ostium service"
git push origin main

# Render detects push and redeploys automatically
# Watch progress in Render dashboard
```

### **Manual Deployment:**

1. Go to Render Dashboard
2. Select `maxxit-ostium-service`
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 💰 **Pricing:**

| Plan | Price | Specs | When to Use |
|------|-------|-------|-------------|
| **Free** | $0/month | 512 MB RAM, Sleeps after inactivity | Testing, Development |
| **Starter** | $7/month | 512 MB RAM, Always on | Light production |
| **Standard** | $25/month | 2 GB RAM, Always on | Production |

**Recommendation:** 
- Start with **Free** for testing
- Upgrade to **Starter** for production

**Note:** Free tier services sleep after 15 minutes of inactivity. First request may take 30-60 seconds to wake up.

---

## 🎛️ **Advanced Configuration:**

### **Custom Domain:**

1. Go to **Settings** → **Custom Domains**
2. Add domain: `ostium-api.yourdomain.com`
3. Update DNS records as instructed by Render
4. SSL certificate auto-provisioned

### **Persistent Disk (if needed):**

Currently not needed for Ostium service (stateless), but available if required:

1. Go to **Settings** → **Disks**
2. Add disk mount point
3. Specify size (1GB minimum)

### **Scaling:**

For higher load:
1. Upgrade to **Standard** plan
2. Or deploy multiple instances with load balancer

---

## 📈 **Monitoring:**

### **Built-in Metrics:**

Render provides:
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

### **Custom Logging:**

Add to your Python code:
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/open-position', methods=['POST'])
def open_position():
    logger.info(f"Opening position: {request.json}")
    # ... your code ...
    logger.info(f"Position opened successfully: {result}")
```

View logs in Render Dashboard → **Logs** tab

### **Alerts:**

Set up notifications:
1. Go to **Settings** → **Notifications**
2. Add email or Slack webhook
3. Choose events: Deploy, Health Check Failed, Service Down

---

## ✅ **Deployment Checklist:**

Before deploying, verify:

- [ ] Code pushed to GitHub (`main` branch)
- [ ] `services/ostium-service.py` exists
- [ ] `services/requirements-ostium.txt` exists
- [ ] Root Directory set to `services`
- [ ] Build command: `pip install -r requirements-ostium.txt`
- [ ] Start command: `python ostium-service.py`
- [ ] All 5 environment variables added
- [ ] Health check path set to `/health`
- [ ] Plan selected (Free or Starter)

After deployment:

- [ ] Build completes successfully
- [ ] Service starts without errors
- [ ] Health check passes
- [ ] Test endpoints respond
- [ ] Update main app `.env` with service URL
- [ ] Test end-to-end trading flow

---

## 🎯 **Quick Deploy Summary:**

```
Service Name:     maxxit-ostium-service
Runtime:          Python 3
Root Directory:   services
Build Command:    pip install -r requirements-ostium.txt
Start Command:    python ostium-service.py
Health Check:     /health
Plan:             Free (testing) or Starter (production)

Environment Variables (5):
  OSTIUM_TESTNET=true
  OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
  OSTIUM_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
  OSTIUM_PROFIT_SHARE=10
  PORT=5002

Expected URL:     https://maxxit-ostium-service.onrender.com
Deployment Time:  5-10 minutes
Auto-Deploy:      Yes (on git push)
```

---

## 🔗 **After Deployment:**

### **1. Update Main Application**

In your Next.js backend `.env`:
```env
OSTIUM_SERVICE_URL=https://maxxit-ostium-service.onrender.com
```

### **2. Restart Main Backend**

If already deployed, redeploy to pick up new URL.

### **3. Test Full Flow**

```bash
# Test from your backend
curl http://localhost:3000/api/ostium/balance?address=0x...

# Or directly
curl https://maxxit-ostium-service.onrender.com/balance \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"address":"0x..."}'
```

### **4. Monitor First Trades**

Watch logs for first few trades to ensure everything works correctly.

---

## 🎉 **Success!**

Once deployed, your standalone Ostium service will:

✅ Run independently from Hyperliquid service  
✅ Handle all Ostium trading operations  
✅ Auto-scale based on load  
✅ Auto-restart on crashes  
✅ Auto-deploy on git push  
✅ Provide detailed logs and metrics  

**Your dedicated Ostium service is ready to deploy!** 🚀

---

**Configuration File:** `services/render-ostium.yaml`  
**Documentation:** This file (`OSTIUM_RENDER_DEPLOYMENT.md`)  
**Deployment Time:** 5-10 minutes  
**Cost:** Free tier (sufficient for testing)


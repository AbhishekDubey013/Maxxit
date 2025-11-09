# Ostium Cloud Deployment Guide

## ✅ Python Service Required

Yes, just like Hyperliquid, Ostium requires a **Python service** running in the cloud to handle trades.

---

## 🏗️ **Architecture:**

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  CLOUD DEPLOYMENT (Render / Railway / AWS)                │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │  Node.js         │  │  Python Services │              │
│  │  Backend         │  │                  │              │
│  │  (Next.js API)   │  │  • Hyperliquid   │              │
│  │                  │  │    (Port 5001)   │              │
│  │  • API Routes    │  │                  │              │
│  │  • Workers       │  │  • Ostium        │              │
│  │  • Database      │  │    (Port 5002)   │              │
│  │                  │  │                  │              │
│  │                  │  │  • Twitter Proxy │              │
│  │                  │  │    (Port 5003)   │              │
│  └──────────────────┘  └──────────────────┘              │
│         │                       │                         │
│         └───────────────────────┘                         │
│                  │                                        │
└──────────────────┼────────────────────────────────────────┘
                   │
                   ▼
            Trading Venues
         (Hyperliquid, Ostium)
```

---

## 📦 **Services to Deploy:**

### **1. Node.js Backend** (Main Application)
- Next.js API routes
- Background workers
- Database (Postgres)
- Prisma ORM

### **2. Python Services** (Trading Engines)

#### **A. Hyperliquid Service** (`hyperliquid-service.py`)
- **Port:** 5001
- **Purpose:** Execute Hyperliquid trades
- **Requirements:** `requirements-hyperliquid.txt`

#### **B. Ostium Service** (`ostium-service.py`) ⭐ NEW
- **Port:** 5002
- **Purpose:** Execute Ostium trades
- **Requirements:** `requirements-ostium.txt`
- **Dependencies:**
  - `ostium-python-sdk==3.0.0`
  - `Flask==3.0.0`
  - `web3==6.11.3`

#### **C. Twitter Proxy** (`twitter-proxy.py`)
- **Port:** 5003
- **Purpose:** Fetch tweets via Game API
- **Requirements:** `requirements-twitter.txt`

---

## 🚀 **Deployment Options:**

### **Option 1: Render.com** (Recommended - Free Tier)

#### **Step 1: Update Configuration**

The configuration is already prepared in `services/render.yaml`:

```yaml
services:
  - type: web
    name: maxxit-python-services
    runtime: python3
    buildCommand: pip install -r requirements-twitter.txt && pip install -r requirements-ostium.txt && cd hyperliquid-service && pip install -r requirements.txt
    startCommand: bash start-all-services.sh
    envVars:
      - key: OSTIUM_TESTNET
        value: "true"
      - key: OSTIUM_RPC_URL
        value: "https://sepolia-rollup.arbitrum.io/rpc"
      - key: OSTIUM_PLATFORM_WALLET
        sync: false
      - key: OSTIUM_PORT
        value: "5002"
```

#### **Step 2: Deploy to Render**

```bash
# 1. Create a Render account at render.com

# 2. Connect your GitHub repo

# 3. Create new Web Service

# 4. Configure:
   - Name: maxxit-python-services
   - Runtime: Python 3
   - Root Directory: services
   - Build Command: (use from render.yaml)
   - Start Command: bash start-all-services.sh

# 5. Add Environment Variables:
   OSTIUM_TESTNET=true
   OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   OSTIUM_PLATFORM_WALLET=0x...  (your collector address)
   OSTIUM_PROFIT_SHARE=10
```

#### **Step 3: Get Service URL**

After deployment, Render provides a URL like:
```
https://maxxit-python-services.onrender.com
```

#### **Step 4: Update Your .env**

```bash
# In your main .env file
OSTIUM_SERVICE_URL="https://maxxit-python-services.onrender.com"
```

---

### **Option 2: Railway.app**

#### **Step 1: Create Railway Service**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create new project
railway init

# 4. Deploy Python services
cd services
railway up
```

#### **Step 2: Configure Environment Variables**

In Railway dashboard:
```
OSTIUM_TESTNET=true
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
OSTIUM_PLATFORM_WALLET=0x...
OSTIUM_PROFIT_SHARE=10
```

#### **Step 3: Get Service URL**

Railway provides a URL like:
```
https://maxxit-production.up.railway.app
```

---

### **Option 3: Self-Hosted (VPS)**

#### **Step 1: Setup VPS** (DigitalOcean, Linode, AWS EC2)

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install dependencies
sudo apt update
sudo apt install python3 python3-pip python3-venv

# Clone your repo
git clone https://github.com/your-repo/Maxxit.git
cd Maxxit/services
```

#### **Step 2: Install Requirements**

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install all requirements
pip install -r requirements-twitter.txt
pip install -r requirements-ostium.txt
cd hyperliquid-service && pip install -r requirements.txt
cd ..
```

#### **Step 3: Create .env File**

```bash
# services/.env
OSTIUM_TESTNET=true
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
OSTIUM_PLATFORM_WALLET=0x...
OSTIUM_PROFIT_SHARE=10
```

#### **Step 4: Start Services with systemd**

Create service file:
```bash
sudo nano /etc/systemd/system/maxxit-python.service
```

```ini
[Unit]
Description=Maxxit Python Services
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/home/your-user/Maxxit/services
ExecStart=/home/your-user/Maxxit/services/venv/bin/python3 start-all-services.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable maxxit-python
sudo systemctl start maxxit-python
sudo systemctl status maxxit-python
```

#### **Step 5: Setup Nginx Reverse Proxy**

```nginx
# /etc/nginx/sites-available/maxxit
server {
    listen 80;
    server_name your-domain.com;

    location /ostium/ {
        proxy_pass http://localhost:5002/;
    }
    
    location /hyperliquid/ {
        proxy_pass http://localhost:5001/;
    }
}
```

---

## 🔧 **Local Testing:**

### **Start All Services Locally:**

```bash
cd services

# Option 1: Using the start script
bash start-all-services.sh

# Option 2: Manual start
python3 hyperliquid-service/app.py &  # Port 5001
python3 ostium-service.py &            # Port 5002
python3 twitter-proxy.py &             # Port 5003
```

### **Test Health Endpoints:**

```bash
# Test Hyperliquid service
curl http://localhost:5001/health

# Test Ostium service
curl http://localhost:5002/health

# Test Twitter proxy
curl http://localhost:5003/health
```

### **Test Trading:**

```bash
# Test Ostium balance
curl -X POST http://localhost:5002/balance \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xYourAddress"}'

# Test Ostium trade
curl -X POST http://localhost:5002/open-position \
  -H 'Content-Type: application/json' \
  -d '{
    "privateKey":"0x...",
    "market":"BTC",
    "size":1000,
    "side":"long",
    "leverage":3,
    "useDelegation":true,
    "userAddress":"0x..."
  }'
```

---

## 🔐 **Environment Variables:**

### **Required for Ostium:**

```bash
# Ostium Configuration
OSTIUM_SERVICE_URL="http://localhost:5002"       # URL of Python service
OSTIUM_TESTNET="true"                            # Use testnet
OSTIUM_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"  # Arbitrum RPC
OSTIUM_PLATFORM_WALLET="0x..."                   # Profit collector address
OSTIUM_PROFIT_SHARE="10"                         # 10% profit share

# For Production (Mainnet)
OSTIUM_TESTNET="false"
OSTIUM_RPC_URL="https://arb1.arbitrum.io/rpc"
```

---

## 📊 **Port Configuration:**

| Service | Port | Protocol | Public Access |
|---------|------|----------|---------------|
| **Hyperliquid Service** | 5001 | HTTP | Internal only |
| **Ostium Service** | 5002 | HTTP | Internal only |
| **Twitter Proxy** | 5003 | HTTP | Internal only |
| **Main Backend** | 3000 | HTTP | Public |

**Security Note:** Python services should only be accessible from your Node.js backend, not publicly exposed.

---

## 🔄 **Update Process:**

### **Deploying Updates:**

```bash
# 1. Push changes to GitHub
git add services/ostium-service.py
git commit -m "Update Ostium service"
git push origin main

# 2. Render auto-deploys on push

# 3. Or manually redeploy
# Go to Render dashboard → Manual Deploy
```

### **Zero-Downtime Updates:**

```bash
# On VPS with systemd
sudo systemctl restart maxxit-python

# Health check
curl http://localhost:5002/health
```

---

## 📝 **Monitoring:**

### **Check Service Status:**

```bash
# On Render
# Go to Dashboard → Logs

# On Railway
railway logs

# On VPS
sudo systemctl status maxxit-python
journalctl -u maxxit-python -f
```

### **Health Checks:**

```bash
# Automated health check script
#!/bin/bash
services=("5001" "5002" "5003")
for port in "${services[@]}"; do
  if curl -f http://localhost:$port/health > /dev/null 2>&1; then
    echo "✅ Service on port $port is healthy"
  else
    echo "❌ Service on port $port is down"
    # Restart service
  fi
done
```

---

## 🐛 **Troubleshooting:**

### **Ostium Service Won't Start:**

```bash
# Check logs
cat logs/ostium-service.log

# Common issues:
# 1. Missing dependencies
pip install -r requirements-ostium.txt

# 2. Port already in use
lsof -i :5002
kill -9 <PID>

# 3. Python version
python3 --version  # Should be 3.10+
```

### **Connection Errors:**

```bash
# Test connectivity
curl -v http://localhost:5002/health

# Check firewall
sudo ufw status
sudo ufw allow 5002/tcp
```

---

## ✅ **Verification Checklist:**

Before going to production:

- [ ] All services start successfully
- [ ] Health endpoints respond
- [ ] Ostium trades execute
- [ ] Logs show no errors
- [ ] Environment variables set
- [ ] SSL certificates configured (production)
- [ ] Monitoring setup
- [ ] Backup strategy in place

---

## 🎯 **Summary:**

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  OSTIUM PYTHON SERVICE DEPLOYMENT                         ║
║                                                            ║
║  ✅ Service Created: ostium-service.py                    ║
║  ✅ Port Configured: 5002                                 ║
║  ✅ Requirements Ready: requirements-ostium.txt           ║
║  ✅ Deploy Script Updated: start-all-services.sh          ║
║  ✅ Render Config Updated: render.yaml                    ║
║                                                            ║
║  Deploy to cloud just like Hyperliquid service!          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🔗 **Next Steps:**

1. **Choose deployment platform** (Render recommended)
2. **Deploy Python services** (all 3 together)
3. **Update OSTIUM_SERVICE_URL** in main .env
4. **Test end-to-end** trading flow
5. **Monitor logs** for first few trades
6. **Switch to mainnet** when ready

**Your Ostium service is ready for cloud deployment!** 🚀


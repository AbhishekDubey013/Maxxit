# Render Deployment Guide - Python Services

Deploy both Hyperliquid service and Twitter proxy together on Render.

## 🚀 Quick Deploy

### Option 1: Blueprint Deploy (Recommended)

1. **Fork/Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Create New Web Service on Render**
   - Go to https://render.com/dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Select the `Maxxit` repository

3. **Configure Service**
   ```
   Name: maxxit-python-services
   Region: Oregon (US West)
   Branch: main
   Root Directory: services
   Runtime: Python 3
   Build Command: pip install -r requirements-twitter.txt && cd hyperliquid-service && pip install -r requirements.txt && cd ..
   Start Command: bash start-all-services.sh
   ```

4. **Environment Variables**
   ```bash
   GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc
   HYPERLIQUID_TESTNET=true
   PORT=10000  # Render assigns this automatically
   ```

5. **Deploy!**
   - Click "Create Web Service"
   - Wait 2-3 minutes for build

---

## 📝 What Gets Deployed

This single Render service runs **2 Flask apps**:

### 1. Hyperliquid Service (Port $PORT)
- Handles Hyperliquid trading operations
- Endpoints:
  - `GET /health` - Health check
  - `POST /balance` - Get account balance
  - `POST /open-position` - Open a position
  - `POST /close-position` - Close a position
  - `POST /positions` - Get open positions

### 2. Twitter Proxy (Port 5002)
- Fetches tweets using virtuals_tweepy SDK
- Endpoints:
  - `GET /health` - Health check
  - `GET /tweets/<username>` - Fetch user tweets
  - `GET /test` - Test endpoint

---

## 🔗 Service URLs

After deployment, Render gives you a URL like:
```
https://maxxit-python-services-xyz.onrender.com
```

**Hyperliquid Service:**
```
https://maxxit-python-services-xyz.onrender.com/health
```

**Twitter Proxy:**
```
https://maxxit-python-services-xyz.onrender.com:5002/health
```

⚠️ **Note:** Render only exposes the main PORT publicly. The Twitter proxy (port 5002) is for internal use within Railway workers.

---

## 🔧 Configuration for Railway & Vercel

Add these environment variables to Railway and Vercel:

```bash
# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=https://maxxit-python-services-xyz.onrender.com

# Twitter Proxy (for Railway workers only, if needed)
TWITTER_PROXY_URL=http://localhost:5002  # Or use internal Render URL
```

---

## 🧪 Testing After Deployment

### 1. Test Hyperliquid Service
```bash
curl https://maxxit-python-services-xyz.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "hyperliquid-trading",
  "testnet": true
}
```

### 2. Test Twitter Proxy (if exposed)
```bash
curl "https://maxxit-python-services-xyz.onrender.com:5002/tweets/elonmusk?max_results=5"
```

Expected response:
```json
{
  "username": "elonmusk",
  "count": 5,
  "data": [...]
}
```

---

## 🔄 Updates

To deploy updates:

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Update services"
   git push origin main
   ```

2. Render auto-deploys from `main` branch

---

## 🐛 Troubleshooting

### Service won't start
- Check Render logs for errors
- Verify `start-all-services.sh` is executable
- Ensure all dependencies in requirements files

### Health checks failing
- Wait 30 seconds after deploy
- Check if services are running: View logs in Render dashboard
- Verify PORT environment variable

### Twitter proxy not working
- Ensure `GAME_API_KEY` is set
- Check if `virtuals_tweepy` is installed
- View logs for authentication errors

---

## 💰 Cost

- **Free tier:** Spins down after 15 min of inactivity
- **Paid tier ($7/mo):** Always on, faster performance

For production, use paid tier to avoid cold starts.

---

## 📊 Monitoring

- **Render Dashboard:** https://dashboard.render.com
- **View Logs:** Click service → "Logs" tab
- **Metrics:** CPU, Memory, Network usage

---

## 🔐 Security

- Never commit API keys to GitHub
- Use Render's environment variable management
- Rotate keys regularly
- Monitor service logs for suspicious activity

---

## 📞 Support

If deployment fails:
1. Check Render build logs
2. Verify all files are in `services/` directory
3. Test locally first with `bash services/start-all-services.sh`
4. Contact Render support if persistent issues


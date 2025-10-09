# Railway Deployment Guide - Two Services

This project requires **two separate Railway services**:

## Service 1: Python Twitter Proxy

**Purpose:** Provides Twitter API access using GAME API key via FastAPI

**Setup:**
1. Create new Railway service from this repo
2. Set service name: `maxxit-twitter-proxy`
3. Environment variables needed:
   - `GAME_API_KEY` - Your GAME API key (apx-...)
4. Railway will auto-detect Python and use `requirements.txt`
5. Start command: `python3 -m uvicorn twitter_api_proxy:app --host 0.0.0.0 --port $PORT`
6. **Copy the service URL** (e.g., `https://maxxit-twitter-proxy.railway.app`)

**Files used:**
- `twitter_api_proxy.py`
- `requirements.txt`
- `railway-proxy.json` (optional config)

---

## Service 2: Node.js Workers

**Purpose:** Runs all workers (tweet ingestion, signal generation, trade execution, position monitoring)

**Setup:**
1. Create new Railway service from this repo
2. Set service name: `maxxit-workers`
3. Environment variables needed:
   - `DATABASE_URL` - Your Postgres connection string
   - `GAME_API_KEY` - Your GAME API key (for direct access)
   - `GAME_API_URL` - **Python proxy URL** from Service 1 (e.g., `https://maxxit-twitter-proxy.railway.app`)
   - `API_BASE_URL` - Your Vercel frontend URL (e.g., `https://maxxit.vercel.app`)
   - `EXECUTOR_PRIVATE_KEY` - Private key for trade execution
   - `OPENAI_API_KEY` - For LLM classification
   - All other `.env` variables
4. Uses `Dockerfile` (Node.js only)
5. Start command: `bash workers/start-railway.sh`

**Files used:**
- `Dockerfile`
- `railway.json`
- `workers/start-railway.sh`
- All worker TypeScript files

---

## How It Works

```
┌─────────────────────┐
│  Service 1 (Python) │
│  Twitter API Proxy  │
│  Port: Railway-assigned
└──────────┬──────────┘
           │
           │ HTTP calls
           │
┌──────────▼──────────┐
│ Service 2 (Node.js) │
│  All Workers        │
│  - Tweet Ingestion  │
│  - Signal Generator │
│  - Trade Executor   │
│  - Position Monitor │
└─────────────────────┘
```

## Benefits

✅ Clean separation of concerns
✅ No complex multi-language Dockerfile
✅ Python service can scale independently
✅ Easy to debug each service separately
✅ Workers can restart without affecting proxy

## Testing

**Test Python Proxy:**
```bash
curl https://maxxit-twitter-proxy.railway.app/health
# Should return: {"status":"healthy"}
```

**Test Workers:**
Check Railway logs for:
```
✅ Tweet Ingestion started (PID: xxx, every 5 min)
✅ Signal Generator started (PID: xxx, every 5 min)
✅ Trade Executor started (PID: xxx, every 30 min)
✅ Position Monitor started (PID: xxx, every 5 min)
```


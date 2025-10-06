# Auto-Ingest Setup - Running Every 6 Hours ⏰

**Status:** ✅ ACTIVE  
**PID:** Check with `bash scripts/daemon-control.sh status`  
**Interval:** Every 6 hours  
**Logs:** `logs/auto-ingest.log`

---

## What's Running?

The daemon automatically:
1. 🐦 Fetches tweets from X (via GAME API)
2. 💾 Stores them in database
3. 🤖 Classifies them with LLM
4. 📊 Identifies trading signals
5. 💤 Sleeps for 6 hours
6. 🔄 Repeats

---

## Control Commands

### Check Status
```bash
bash scripts/daemon-control.sh status
```

### Stop Daemon
```bash
bash scripts/daemon-control.sh stop
```

### Start Daemon
```bash
bash scripts/daemon-control.sh start
```

### Restart Daemon
```bash
bash scripts/daemon-control.sh restart
```

### View Logs
```bash
bash scripts/daemon-control.sh logs
```

### Follow Logs in Real-Time
```bash
tail -f logs/auto-ingest.log
```

---

## Schedule

The daemon runs immediately when started, then every 6 hours:

**Example schedule (if started at 12:00 PM):**
- 12:00 PM - Initial run
- 06:00 PM - Run #2
- 12:00 AM - Run #3
- 06:00 AM - Run #4
- 12:00 PM - Run #5
- ... continues

---

## What Happens Each Run?

### Phase 1: Ingestion (~1-2 mins)
```
🐦 Ingesting tweets from X...
✅ Fetched: 25 tweets
✅ Created: 15 new tweets in database
```

### Phase 2: Classification (~3-5 mins)
```
🤖 Classifying new tweets with LLM...
✅ Processed: 15 tweets
📊 Trading Signals Found: 5
📊 Non-Signals: 10
```

### Phase 3: Sleep
```
💤 Sleeping until 2025-10-05 18:00:00...
```

---

## Monitoring

### Quick Health Check
```bash
# Is daemon running?
bash scripts/daemon-control.sh status

# Recent signals found
curl -s "http://localhost:5000/api/db/ct_posts?isSignalCandidate=true&_limit=10" \
  | jq '.[] | {time: .tweetCreatedAt, text: .tweetText[0:80], tokens: .extractedTokens}'

# How many total signals?
curl -s "http://localhost:5000/api/db/ct_posts?isSignalCandidate=true" | jq 'length'
```

### View Latest Activity
```bash
tail -30 logs/auto-ingest.log
```

---

## Troubleshooting

### Daemon Not Running
```bash
# Check if process exists
bash scripts/daemon-control.sh status

# If not, start it
bash scripts/daemon-control.sh start
```

### No Tweets Being Fetched
Check the logs:
```bash
bash scripts/daemon-control.sh logs
```

Common issues:
- Python proxy not running → Restart: `bash run-twitter-proxy.sh &`
- Main server not running → Restart: `npm run dev`
- GAME API error → Check API key in `.env`

### Classification Failing
Check logs for:
- `[LLM Classifier] Error` → API key issue
- `PERPLEXITY_API_KEY` → Add to `.env`

---

## After System Restart

The daemon doesn't auto-start after reboot. To restart:

```bash
# 1. Start servers
bash run-twitter-proxy.sh > twitter-proxy.log 2>&1 &
npm run dev &

# 2. Start daemon
bash scripts/daemon-control.sh start
```

Or create a startup script to do all of this automatically.

---

## Adjusting the Interval

To change from 6 hours to a different interval:

Edit `scripts/auto-ingest-daemon.sh`:
```bash
# Change this line:
INTERVAL=21600  # 6 hours in seconds

# To:
INTERVAL=3600   # 1 hour
INTERVAL=7200   # 2 hours
INTERVAL=14400  # 4 hours
INTERVAL=43200  # 12 hours
```

Then restart:
```bash
bash scripts/daemon-control.sh restart
```

---

## Production Considerations

For production deployment, consider:

1. **Use systemd service** (Linux) or **launchd** (macOS)
   - Auto-restart on failure
   - Start on system boot
   - Better logging

2. **Add monitoring**
   - Alert if daemon stops
   - Track classification accuracy
   - Monitor API costs

3. **Migrate to Redis + BullMQ**
   - Better queue management
   - Retry logic
   - Parallel processing
   - Web dashboard

---

## Current Setup Summary

✅ **Servers Running:**
- Python Proxy (port 8001) - GAME API
- Main Server (port 5000) - API & Database

✅ **Daemon Running:**
- Auto-ingest every 6 hours
- Logs to: `logs/auto-ingest.log`
- Control: `scripts/daemon-control.sh`

✅ **Data Flow:**
```
Every 6 hours:
  X/Twitter → GAME API → Python Proxy → Main Server 
  → Database → LLM Classification → Trading Signals
```

---

## Quick Commands Cheat Sheet

```bash
# Check everything
bash scripts/daemon-control.sh status
curl http://localhost:8001/health  # Python proxy
curl http://localhost:5000/api/health  # Main server

# View signals
curl -s "http://localhost:5000/api/db/ct_posts?isSignalCandidate=true&_limit=5" | jq

# Manual run (don't wait for schedule)
bash scripts/ingest-and-classify.sh

# Stop daemon
bash scripts/daemon-control.sh stop

# View logs
tail -f logs/auto-ingest.log
```

---

**You're all set!** 🚀

The system is now running on autopilot, fetching and classifying tweets every 6 hours.

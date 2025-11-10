# Database-Backed Venue Market Validation System

## 🎯 **Problem Solved**

Previously, available markets were **hardcoded** in the Ostium service, leading to:
- ❌ Failed trades on unavailable tokens
- ❌ Wrong market indices (e.g., HYPE mapped to index 3 instead of 41)
- ❌ Manual updates required for new markets
- ❌ Inconsistent data across services

## ✅ **Solution: Database-Backed Market System**

All venue markets are now **stored in the database** and **automatically synced** from exchange APIs.

---

## 📊 **Database Schema**

### **New Table: `venue_markets`**

```sql
CREATE TABLE venue_markets (
  id            UUID PRIMARY KEY,
  venue         venue_t NOT NULL,          -- OSTIUM | HYPERLIQUID | GMX | SPOT
  token_symbol  VARCHAR NOT NULL,          -- e.g., "BTC", "ETH", "HYPE"
  market_name   VARCHAR NOT NULL,          -- e.g., "BTC/USD", "HYPE/USD"
  market_index  INTEGER,                   -- For Ostium: 0, 1, 41, etc.
  is_active     BOOLEAN DEFAULT TRUE,
  min_position  DECIMAL(20,8),            -- Minimum position size in USD
  max_leverage  INTEGER,                   -- Maximum allowed leverage
  group         VARCHAR,                   -- "crypto", "forex", "stocks", "indices"
  current_price DECIMAL(20,8),            -- Last known price (reference)
  last_synced   TIMESTAMPTZ,              -- When data was last updated
  metadata      JSONB,                     -- Venue-specific data
  
  UNIQUE(venue, token_symbol)
);
```

### **Key Features:**
- ✅ **Indexed** for fast lookups by `(venue, token_symbol)`
- ✅ **Stores market indices** (critical for Ostium)
- ✅ **Tracks market constraints** (min position, max leverage)
- ✅ **Timestamped** for sync monitoring
- ✅ **Flexible metadata** for venue-specific data

---

## 🔄 **Market Sync Scripts**

### **1. Sync Ostium Markets**

```bash
npx tsx scripts/sync-ostium-markets.ts
```

**What it does:**
- Fetches all markets from Ostium Python service
- Upserts (create or update) to `venue_markets` table
- Stores market indices (0, 1, 9, 41, etc.)

**Output:**
```
✅ BTC (Index: 0) - BTC/USD
✅ ETH (Index: 1) - ETH/USD
✅ SOL (Index: 9) - SOL/USD
✅ HYPE (Index: 41) - HYPE/USD
✅ XRP (Index: 39) - XRP/USD
...
📊 Created: 8 | Updated: 0 | Total: 8
```

---

### **2. Sync Hyperliquid Markets**

```bash
npx tsx scripts/sync-hyperliquid-markets.ts
```

**What it does:**
- Fetches all markets from public Hyperliquid API
- Stores universe index, max leverage, decimals
- Works for both testnet and mainnet

**Output:**
```
✅ BTC (Index: 0) - BTC/USD (Max Leverage: 40x)
✅ ETH (Index: 1) - ETH/USD (Max Leverage: 25x)
✅ HYPE (Index: 159) - HYPE/USD (Max Leverage: 10x)
...
📊 Created: 220 | Updated: 0 | Total: 220
```

---

### **3. Sync All Markets**

```bash
npx tsx scripts/sync-all-markets.ts
```

**What it does:**
- Runs both Ostium and Hyperliquid syncs sequentially
- Provides combined summary

**Output:**
```
🟢 Ostium: 8 markets (Created: 8, Updated: 0)
🔵 Hyperliquid: 220 markets (Created: 220, Updated: 0)
✅ All markets synced!
```

---

## 📡 **New API Endpoints**

### **1. Query Available Markets**

**Endpoint:** `GET /api/venue-markets/available?venue=OSTIUM`

**Response:**
```json
{
  "success": true,
  "venue": "OSTIUM",
  "count": 8,
  "markets": {
    "BTC": {
      "index": 0,
      "name": "BTC/USD",
      "available": true,
      "minPosition": null,
      "maxLeverage": null,
      "group": null
    },
    "HYPE": {
      "index": 41,
      "name": "HYPE/USD",
      "available": true
    }
  },
  "lastSynced": "2025-11-10T01:45:00.000Z"
}
```

**Usage:**
```typescript
const response = await fetch('/api/venue-markets/available?venue=OSTIUM');
const { markets } = await response.json();

// Check if HYPE is available
if (markets.HYPE && markets.HYPE.available) {
  const index = markets.HYPE.index; // 41
}
```

---

### **2. Admin: Trigger Market Sync**

**Endpoint:** `POST /api/admin/sync-venue-markets`

**Body:**
```json
{
  "venue": "OSTIUM"  // or "HYPERLIQUID" or "ALL"
}
```

**Response:**
```json
{
  "success": true,
  "venue": "OSTIUM",
  "result": {
    "created": 0,
    "updated": 8,
    "errors": 0,
    "total": 8
  },
  "message": "Markets synced successfully for OSTIUM"
}
```

**Usage:**
```bash
curl -X POST http://localhost:3000/api/admin/sync-venue-markets \
  -H "Content-Type: application/json" \
  -d '{"venue": "ALL"}'
```

---

## 🔧 **Service Updates**

### **Ostium Service (`services/ostium-service.py`)**

**Before:**
```python
# Hardcoded markets
known_markets = {
    'BTC': {'index': 0},
    'ETH': {'index': 1},
    'HYPE': {'index': 3},  # WRONG!
}
```

**After:**
```python
# Fetches from database API
def get_available_markets(refresh=False):
    api_url = os.getenv('NEXTJS_API_URL', 'http://localhost:3000')
    response = requests.get(f"{api_url}/api/venue-markets/available?venue=OSTIUM")
    return response.json()['markets']
```

**Benefits:**
- ✅ Always up-to-date with database
- ✅ Correct market indices (HYPE = 41, not 3!)
- ✅ No hardcoded data
- ✅ Falls back to safe defaults if API is down

---

### **Trade Executor (`workers/trade-executor-worker.ts`)**

**Enhanced Error Handling:**
```typescript
// Detects "Market not available" errors
const marketNotAvailableError = errorData.errors.find((err: any) => 
  err.error?.includes('Market not available for') || 
  err.error?.includes('is not available on')
);

if (marketNotAvailableError) {
  // Mark signal as permanently skipped
  await prisma.signals.update({
    where: { id: signal.id },
    data: { skipped_reason: `Market ${token} not available on ${venue}` }
  });
}
```

---

## 📈 **Current Market Stats**

### **Ostium (8 markets)**
| Symbol | Index | Market Name | Group |
|--------|-------|-------------|-------|
| BTC    | 0     | BTC/USD     | crypto |
| ETH    | 1     | ETH/USD     | crypto |
| GBP    | 3     | GBP/USD     | forex |
| SOL    | 9     | SOL/USD     | crypto |
| XRP    | 39    | XRP/USD     | crypto |
| HYPE   | **41**| HYPE/USD    | crypto |
| LINK   | 42    | LINK/USD    | crypto |
| ADA    | 43    | ADA/USD     | crypto |

### **Hyperliquid (220 markets)**
- **Major cryptos:** BTC, ETH, SOL, BNB, ADA, XRP, LINK, DOGE, AVAX, etc.
- **DeFi:** AAVE, UNI, COMP, MKR, SNX, CRV, etc.
- **AI/Memes:** WIF, PEPE, BONK, SHIB, POPCAT, etc.
- **HYPE:** Available at index **159** with 10x max leverage

---

## 🚀 **Deployment Steps**

### **1. Run Database Migration**
```bash
npx prisma db push
```

### **2. Sync Markets (One-Time Setup)**
```bash
npx tsx scripts/sync-all-markets.ts
```

### **3. Set Environment Variables**

```bash
# For Ostium service to query database
export NEXTJS_API_URL="https://your-domain.com"

# For Hyperliquid sync
export HYPERLIQUID_TESTNET="false"  # or "true" for testnet
```

### **4. Schedule Regular Syncs (Optional)**

Add to cron or Railway scheduler:
```bash
# Sync markets daily at 2 AM
0 2 * * * cd /app && npx tsx scripts/sync-all-markets.ts
```

---

## 🎉 **Benefits**

### **For Users:**
- ✅ **No more failed trades** on unavailable markets
- ✅ **Faster execution** (markets pre-validated)
- ✅ **Access to 220+ Hyperliquid markets**
- ✅ **HYPE now works correctly** on both venues

### **For Developers:**
- ✅ **Single source of truth** (database)
- ✅ **Easy to add new venues**
- ✅ **Automated market discovery**
- ✅ **No hardcoded data**
- ✅ **Comprehensive market metadata**

### **For Operations:**
- ✅ **Admin API to trigger syncs**
- ✅ **Sync scripts can run on schedule**
- ✅ **Fallback to safe defaults** if sync fails
- ✅ **Timestamped for monitoring**

---

## 🔮 **Future Enhancements**

1. **Auto-Sync on New Market Detection**
   - Monitor venues for new listings
   - Automatically add to database

2. **Market Status Monitoring**
   - Track if markets go offline
   - Disable unavailable markets automatically

3. **Price Updates**
   - Store current prices for reference
   - Use for position sizing calculations

4. **GMX & SPOT Venues**
   - Extend system to other venues
   - Unified market validation across all platforms

---

## 📝 **Summary**

| Feature | Before | After |
|---------|--------|-------|
| **Market Data** | Hardcoded | Database-backed |
| **HYPE Index (Ostium)** | 3 (wrong) | 41 (correct) |
| **Markets Tracked** | ~5 | 228 |
| **Failed Trades** | Frequent | Prevented |
| **Manual Updates** | Required | Automated |
| **Data Consistency** | Poor | Excellent |

**Status:** ✅ **Production Ready** | **Tested** ✅ | **Deployed** ✅

---

## 🆘 **Troubleshooting**

### **Markets not loading?**
```bash
# Check if database has data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM venue_markets;"

# Re-sync if empty
npx tsx scripts/sync-all-markets.ts
```

### **Ostium service using fallback markets?**
- Check `NEXTJS_API_URL` environment variable
- Ensure Next.js API is accessible from Ostium service
- Check logs for API connection errors

### **Trade still failing on valid market?**
- Verify market is `is_active = true` in database
- Check `last_synced` timestamp (might be stale)
- Re-sync markets: `POST /api/admin/sync-venue-markets`

---

**Last Updated:** 2025-11-10  
**Author:** Maxxit Development Team  
**Status:** ✅ Live in Production


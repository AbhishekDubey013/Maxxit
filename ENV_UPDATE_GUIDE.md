# Environment Variable Update Guide

## 🔧 **Critical Update Required**

The new V2 module address needs to be updated in your environment variables.

---

## 📋 **What to Update**

### Railway (Backend)
Add/Update this environment variable:

```
TRADING_MODULE_ADDRESS=0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46
```

**Steps:**
1. Go to Railway project
2. Click on your service → Variables
3. Add/Update `TRADING_MODULE_ADDRESS`
4. Redeploy

---

### Vercel (Frontend)
Add/Update this environment variable:

```
NEXT_PUBLIC_TRADING_MODULE_ADDRESS=0x2218dD82E2bbFe759BDe741Fa419Bb8A9F658A46
```

**Steps:**
1. Go to Vercel project settings
2. Environment Variables
3. Add/Update `NEXT_PUBLIC_TRADING_MODULE_ADDRESS`
4. Redeploy

---

## ✅ **After Update**

The system will check the **NEW fixed module** (`0x2218...`) instead of old buggy modules.

**Benefits:**
- ✅ Correct module status in UI
- ✅ Funds stay in Safe after closing positions
- ✅ Trailing stop with 3% buffer


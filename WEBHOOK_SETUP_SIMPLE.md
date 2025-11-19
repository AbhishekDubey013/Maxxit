# ✅ Simple Webhook Setup (No Terminal Needed!)

## 🎯 You Don't Need the Script Anymore!

Since we created the API endpoint, you can set the webhook **directly from Vercel** - no terminal needed!

---

## ✅ Method 1: Visit URL (Easiest)

**After your Vercel deployment is live, just visit:**

```
https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
```

**That's it!** The webhook will be set automatically.

---

## ✅ Method 2: Use Browser Console

1. Open your browser
2. Press `F12` (or right-click → Inspect)
3. Go to **Console** tab
4. Paste this:

```javascript
fetch('https://maxxitv3.vercel.app/api/admin/set-telegram-webhook', {
  method: 'POST'
})
.then(r => r.json())
.then(data => console.log('✅ Webhook set:', data))
.catch(err => console.error('❌ Error:', err));
```

5. Press Enter
6. You'll see the result!

---

## ✅ Method 3: Use curl (If You Want)

From **anywhere** (doesn't need to be in project directory):

```bash
curl -X POST https://maxxitv3.vercel.app/api/admin/set-telegram-webhook
```

---

## ❌ Don't Use the Script Anymore

The old script (`npx tsx scripts/set-telegram-webhook.ts`) is no longer needed!

**Why?**
- Script requires being in project directory
- Script requires local `.env` file
- API endpoint works from anywhere
- API endpoint uses Vercel environment variables

---

## 🎯 Summary

**Old Way (Don't Use):**
```bash
cd /Users/abhishekdubey/Downloads/Maxxit
npx tsx scripts/set-telegram-webhook.ts https://maxxitv3.vercel.app/api/telegram/webhook
```

**New Way (Use This):**
Just visit: `https://maxxitv3.vercel.app/api/admin/set-telegram-webhook`

**That's it!** 🚀


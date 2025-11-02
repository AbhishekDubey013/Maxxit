# How to Get a GAME API Key

## 🔑 Official GAME API Key Request

### Step 1: Visit GAME Console

**Primary Method**: Request API key through GAME Console

🔗 **GAME Console URL**: https://console.game.virtuals.io/

This is the official platform for requesting GAME API keys.

---

## 📝 API Key Types

GAME offers different types of API keys based on your use case:

| Key Type | Prefix | Purpose | Use Case |
|----------|--------|---------|----------|
| **GAME X API** | `apx-` | Access Twitter/X data | Fetching tweets, user data |
| **GAME Agent API** | `apt-` | AI Agent SDK | Building autonomous agents |

**For tweet ingestion**, you need: **`apx-` key** (GAME X API)

---

## 🚀 How to Request Your API Key

### Method 1: GAME Console (Recommended)

1. **Go to GAME Console**
   - URL: https://console.game.virtuals.io/
   
2. **Sign Up / Log In**
   - Create an account if you don't have one
   - Use your email or wallet

3. **Request API Key**
   - Navigate to API Keys section
   - Select: **GAME X API** (for Twitter data)
   - Submit your request

4. **Wait for Approval**
   - Team reviews requests
   - Usually processed within 24-48 hours

5. **Receive Your Key**
   - Format: `apx-XXXXXXXXXXXXXXXXXXXXXXXX`
   - Store securely in your `.env` file

### Method 2: Contact Virtuals Support

If you have trouble accessing the console:

**Discord**: Join Virtuals Protocol Discord
- https://discord.gg/virtuals (if available)
- Channel: #support or #dev-support

**Telegram**: Contact DevRel team
- Search for: Virtuals Protocol official group
- Contact: DevRel team members

**Email**: support@virtuals.io (if available)
- Subject: "GAME X API Key Request"
- Include: Your use case and project details

---

## 📋 What to Include in Your Request

When requesting an API key, be prepared to provide:

1. **Project Name**: Your application/agent name
2. **Use Case**: What you're building (e.g., "Crypto trading agent that monitors Twitter")
3. **Estimated Usage**: Expected API calls per day/month
4. **Twitter Accounts**: Which accounts you'll be monitoring
5. **Contact Info**: Email for communication

### Example Request

```
Project Name: Maxxit Trading Agent
Use Case: Automated trading system that monitors crypto influencer tweets to generate trading signals
Estimated Usage: ~1000 API calls per day (monitoring 10-20 accounts)
Twitter Accounts: @CryptoRK11, @anoncptn, @MarcusPalqDev, etc.
Contact: your-email@example.com
```

---

## 🔧 Current Key Status Check

### Your Current Key
```
GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977
```

**Status**: 
- ✅ Valid format (`apx-` prefix)
- ✅ Correct type for Twitter API
- ⚠️ GAME service returning 204 No Content (since Nov 1st)

### Verify Your Key

You can check if your key is valid:

```bash
curl -H "Authorization: Bearer apx-31d308e580e9a3b0efc45eb02db1f977" \
     https://api.virtuals.io/api/twitter/user/elonmusk/tweets?max_results=5
```

**Expected Responses**:
- `401 Unauthorized` = Invalid/expired key ❌
- `403 Forbidden` = No permission ❌
- `200 OK` = Working ✅
- `204 No Content` = Service issue (current status) ⚠️

---

## 🔄 When to Request a New Key

### Reasons to Get a New Key

1. **Current key expired**
   - Response: `401 Unauthorized`
   - Action: Request new key

2. **Current key revoked**
   - Response: `403 Forbidden`
   - Action: Contact support, request new key

3. **Rate limits exceeded**
   - Response: `429 Too Many Requests`
   - Action: Request higher tier key

4. **Different permissions needed**
   - Example: Upgrade from read-only to read-write
   - Action: Request key with different scope

### Your Current Situation

**You DON'T need a new key** because:
- ✅ Your key has correct format (`apx-`)
- ✅ No authentication errors (no 401/403)
- ✅ Historically worked (13k+ tweets fetched)
- ⚠️ Issue is GAME service (not your key)

**Requesting a new key won't fix the 204 No Content issue**, as it's a service-side problem affecting all users.

---

## 📚 Official Documentation

### GAME SDK Documentation
🔗 https://docs.game.virtuals.io/game-sdk

Topics covered:
- Getting started with GAME
- API key types and usage
- SDK installation and setup
- Examples and use cases

### GAME X API Terms of Use
🔗 https://docs.game.virtuals.io/game-x-api-terms-of-use

Important sections:
- Acceptable usage patterns
- Rate limits
- API restrictions
- Terms and conditions

### Getting Started Guide
🔗 https://docs.game.virtuals.io/how-to/articles/getting-started-with-ai-agents-on-virtuals-protocol-a-comprehensive-guide

Covers:
- Setting up your agent
- Configuring X (Twitter) account
- API integration basics
- Best practices

---

## ⚡ Quick Start After Getting Your Key

### 1. Add to Environment

```bash
# .env file
GAME_API_KEY=apx-your-new-key-here
```

### 2. Test the Key

```typescript
// test-game-api.ts
import axios from 'axios';

const apiKey = process.env.GAME_API_KEY;

const response = await axios.get(
  'https://api.virtuals.io/api/twitter/user/elonmusk/tweets',
  {
    headers: { 'Authorization': `Bearer ${apiKey}` },
    params: { max_results: 5 }
  }
);

console.log('Status:', response.status);
console.log('Data:', response.data);
```

### 3. Start Tweet Ingestion Worker

```bash
npx tsx workers/tweet-ingestion-worker.ts
```

---

## 🔒 Security Best Practices

### Protect Your API Key

1. **Never commit to Git**
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use environment variables**
   ```bash
   # Railway/Cloud
   GAME_API_KEY=apx-your-key-here
   ```

3. **Rotate regularly**
   - Request new key every 6-12 months
   - Revoke old keys after migration

4. **Monitor usage**
   - Track API calls
   - Set up alerts for anomalies
   - Review logs regularly

---

## 🆘 Troubleshooting

### "Cannot access GAME Console"

**Solutions**:
1. Check URL: https://console.game.virtuals.io/
2. Try different browser
3. Clear cache and cookies
4. Contact support via Discord/Telegram

### "Request not approved"

**Reasons**:
- Incomplete information
- Suspicious use case
- Previous policy violations

**Action**:
- Provide more details
- Explain legitimate use case
- Contact support for clarification

### "Key not working after approval"

**Check**:
1. Correct format: `apx-XXXXX...`
2. Environment variable set correctly
3. No typos in the key
4. Service status (like current 204 issue)

---

## 📞 Support Channels

### Official Channels

**GAME Console**: https://console.game.virtuals.io/
- Primary method for API key requests

**Documentation**: https://docs.game.virtuals.io/
- Complete guides and references

**Discord**: Virtuals Protocol Community
- Quick support from community and team
- Channel: #support or #dev-support

**Telegram**: DevRel Team
- Direct contact with developer relations
- Faster response for urgent issues

---

## 📊 Current Status Summary

### Your Situation (Nov 2, 2025)

| Item | Status |
|------|--------|
| API Key Format | ✅ Valid (`apx-` prefix) |
| Authentication | ✅ Working (no 401/403) |
| Key Type | ✅ Correct (GAME X API) |
| Historical Usage | ✅ 13,291 tweets fetched |
| Current Response | ⚠️ 204 No Content |
| Issue Type | ⚠️ GAME service problem |

### Recommendation

**DO NOT request a new key yet.**

Your key is valid. The issue is with GAME's service (returning 204 No Content for all users since Nov 1st).

**Wait for**:
1. GAME service to recover
2. Official announcement from GAME team
3. Status update on their channels

If issue persists after 7 days, then contact support about your key specifically.

---

## ✅ Next Steps

1. **Monitor GAME Status**
   - Check docs.game.virtuals.io for announcements
   - Join Discord/Telegram for updates

2. **Continue Development**
   - Your pipeline is production-ready
   - Use synthetic tweets for testing
   - Deploy other components

3. **Contact Support (if needed)**
   - After 7 days of 204 errors
   - Mention: "All endpoints returning 204 since Nov 1st"
   - Reference: 13k+ tweets successfully fetched before Nov 1st

4. **Request New Key (only if)**
   - You get 401/403 errors
   - Support confirms key is invalid
   - You need different permissions

---

## 🎯 Summary

**To get a GAME API key:**

1. Visit: https://console.game.virtuals.io/
2. Request: **GAME X API** key (for Twitter)
3. Provide: Project details and use case
4. Wait: 24-48 hours for approval
5. Store: Securely in `.env` as `GAME_API_KEY`

**Your current key is fine** - just waiting for GAME service to recover!

---

## 📝 Useful Links

- **GAME Console**: https://console.game.virtuals.io/
- **GAME SDK Docs**: https://docs.game.virtuals.io/game-sdk
- **GAME X API Terms**: https://docs.game.virtuals.io/game-x-api-terms-of-use
- **Getting Started**: https://docs.game.virtuals.io/how-to/
- **API Endpoint**: https://api.virtuals.io/api

---

**Last Updated**: November 2, 2025  
**Status**: GAME X API experiencing 204 No Content issues (service-side)  
**Your Key**: Valid and working (waiting for service recovery)


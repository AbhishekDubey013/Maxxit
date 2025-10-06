# LLM Tweet Classifier Setup Guide

## ✅ What Was Implemented

The LLM filtering service is now fully functional and will:
1. **Classify tweets** as trading signals or noise
2. **Extract token symbols** ($BTC, $ETH, etc.)
3. **Determine sentiment** (bullish, bearish, neutral)
4. **Calculate confidence** (0.0 to 1.0)
5. **Update ct_posts table** with results

## 🎯 Quick Start

### Option 1: With LLM API (OpenAI or Anthropic)

#### 1. Add API Key to `.env`

**For OpenAI (Recommended - cheaper):**
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
# Optional: specify model (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

**OR for Anthropic Claude:**
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
# Optional: specify model (default: claude-3-haiku-20240307)
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

#### 2. Get Your API Keys

**OpenAI:**
- Go to: https://platform.openai.com/api-keys
- Click "Create new secret key"
- Copy the key (starts with `sk-proj-`)
- **Cost**: ~$0.15 per 1M tokens (gpt-4o-mini)

**Anthropic:**
- Go to: https://console.anthropic.com/
- Create API key
- Copy the key (starts with `sk-ant-`)
- **Cost**: ~$0.25 per 1M tokens (Claude Haiku)

#### 3. Test the Classifier

```bash
# Test with custom tweet text
curl -X POST http://localhost:5000/api/admin/classify-tweet \
  -H "Content-Type: application/json" \
  -d '{
    "tweetText": "$BTC breaking out above $45k! Target is $50k. Very bullish setup here."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "tweetText": "$BTC breaking out above $45k! Target is $50k. Very bullish setup here.",
  "classification": {
    "isSignalCandidate": true,
    "extractedTokens": ["BTC"],
    "sentiment": "bullish",
    "confidence": 0.85,
    "reasoning": "Clear price target and bullish directional call"
  }
}
```

### Option 2: Without LLM API (Fallback Mode)

**If you don't have an API key yet**, the system will automatically use **regex-based classification**:

- ✅ Extracts token symbols with `$TOKEN` pattern
- ✅ Detects sentiment with keyword matching
- ✅ Works immediately, no API needed
- ⚠️ Less accurate than LLM

**The fallback works fine for testing!** Add the LLM API key later for production.

---

## 🧪 Testing the Classifier

### Test 1: Classify Custom Tweet Text

```bash
curl -X POST http://localhost:5000/api/admin/classify-tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetText": "$ETH looking strong. Time to accumulate before the breakout."}'
```

### Test 2: Classify Existing Tweet from Database

```bash
# First, get a ct_post ID
curl 'http://localhost:5000/api/db/ct_posts?limit=1'

# Then classify it
curl -X POST 'http://localhost:5000/api/admin/classify-tweet?ctPostId=<post-id-here>'
```

### Test 3: Test Different Scenarios

**Bullish Signal:**
```bash
curl -X POST http://localhost:5000/api/admin/classify-tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetText": "$BTC breakout confirmed! Next stop $50k. Loading up here."}'
```

**Bearish Signal:**
```bash
curl -X POST http://localhost:5000/api/admin/classify-tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetText": "$SOL looking weak. Breaking support. Time to exit positions."}'
```

**Not a Signal (Neutral):**
```bash
curl -X POST http://localhost:5000/api/admin/classify-tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetText": "GM everyone! Bitcoin is interesting technology."}'
```

---

## 🔄 How It Works in Production

### Full Pipeline

```
1. Tweet Ingested
   ↓ (ct_post created)
2. Classify Worker Triggered
   ↓ (calls LLM classifier)
3. LLM Analyzes Tweet
   ↓ (extracts signals & tokens)
4. ct_post Updated
   - is_signal_candidate: true/false
   - extracted_tokens: ["BTC", "ETH"]
   ↓
5. If Signal → Signal Creation Queue
   ↓
6. Signal Created → Trade Execution
```

### Automatic Classification

When you ingest tweets (via `/api/admin/ingest-tweets` or cron), the system **automatically**:
1. Creates `ct_post` records
2. Enqueues them for classification
3. Worker processes classification
4. Updates the `ct_post`
5. Creates trading signals if applicable

**No manual intervention needed!**

---

## 📊 Classification Examples

### Example 1: Strong Buy Signal
**Input:**
```
$BTC just broke through $45k resistance with huge volume. 
Next target is $50k. This is a generational buying opportunity. 
Loading up on spot and leveraged positions.
```

**Output:**
```json
{
  "isSignalCandidate": true,
  "extractedTokens": ["BTC"],
  "sentiment": "bullish",
  "confidence": 0.90,
  "reasoning": "Clear breakout with price targets, volume confirmation, and explicit buying action"
}
```

### Example 2: Weak Signal
**Input:**
```
$ETH might do something soon. Not sure what but watching.
```

**Output:**
```json
{
  "isSignalCandidate": false,
  "extractedTokens": ["ETH"],
  "sentiment": "neutral",
  "confidence": 0.20,
  "reasoning": "Vague and non-actionable statement without clear direction"
}
```

### Example 3: Multiple Tokens
**Input:**
```
$BTC breaking out, $ETH following. $SOL lagging behind.
Time to rotate from $SOL into $BTC and $ETH.
```

**Output:**
```json
{
  "isSignalCandidate": true,
  "extractedTokens": ["BTC", "ETH", "SOL"],
  "sentiment": "bullish",
  "confidence": 0.75,
  "reasoning": "Clear rotation strategy with multiple tokens and actionable direction"
}
```

---

## 🎛️ Configuration

### Environment Variables

```bash
# OpenAI (cheaper, faster)
OPENAI_API_KEY=sk-proj-xxxxx
OPENAI_MODEL=gpt-4o-mini        # Options: gpt-4o-mini, gpt-4o, gpt-4-turbo

# Anthropic (alternative)
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-3-haiku-20240307  # Options: claude-3-haiku, claude-3-sonnet, claude-3-opus
```

### Model Recommendations

**For Development/Testing:**
- OpenAI: `gpt-4o-mini` ($0.15/1M tokens) ✅ Recommended
- Anthropic: `claude-3-haiku-20240307` ($0.25/1M tokens)

**For Production:**
- OpenAI: `gpt-4o` ($2.50/1M tokens) - Most accurate
- Anthropic: `claude-3-sonnet-20240229` ($3.00/1M tokens) - Very accurate

### Cost Estimates

**Per 1000 tweets classified:**
- gpt-4o-mini: ~$0.05 (500 tokens avg per tweet)
- gpt-4o: ~$0.75
- claude-3-haiku: ~$0.10

**For typical usage (1000 tweets/day):**
- Monthly cost: $1.50 - $22.50 depending on model

---

## 🔍 Verification

### Check ct_posts Table

```bash
# Get classified tweets
curl 'http://localhost:5000/api/db/ct_posts?is_signal_candidate=eq.true&limit=10'
```

**Look for:**
- `is_signal_candidate`: true/false
- `extracted_tokens`: ["BTC", "ETH"]

### Check Classification Logs

When running workers, you'll see:
```
[Classify] Classifying tweet abc-123-def
[Classify] Analyzing: "$BTC breaking out! Target $50k..."
[LLM Classifier] Using OpenAI
[Classify] Post abc-123-def: isSignalCandidate=true, sentiment=bullish, confidence=0.85, tokens=BTC
[Classify] Reasoning: Clear price target and bullish directional call
[Classify] ✅ Enqueued signal creation for post abc-123-def
```

---

## 🐛 Troubleshooting

### "No API key found"
- Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`
- Restart the server
- System will use fallback regex mode if no key

### "OpenAI API error: 401"
- Invalid API key
- Check the key format (should start with `sk-proj-` or `sk-`)
- Regenerate key from OpenAI dashboard

### "Rate limit exceeded"
- You've hit OpenAI's rate limit
- Wait a minute and retry
- Consider upgrading to paid tier ($5 min)

### Classification not happening
- Check if workers are running (need Redis)
- Look for `[Classify]` logs
- Manually trigger: `curl -X POST http://localhost:5000/api/admin/classify-tweet?ctPostId=xxx`

### Fallback mode being used
- This means LLM API is not configured
- Add API key to `.env` to use LLM
- Fallback works but is less accurate

---

## 🎯 Next Steps

1. ✅ **Test the classifier** with the endpoint
2. **Add your OpenAI/Anthropic API key** to `.env`
3. **Ingest tweets** (they'll be auto-classified)
4. **Check results** in ct_posts table
5. **Monitor signals** being created

---

## 🚀 Integration with Full System

Once classification is working:

### Step 1: Ingest Tweets
```bash
curl http://localhost:5000/api/admin/ingest-tweets
```

### Step 2: Classification Happens Automatically
- Workers process each tweet
- LLM classifies
- Updates ct_posts

### Step 3: Check Results
```bash
# View signal candidates
curl 'http://localhost:5000/api/db/ct_posts?is_signal_candidate=eq.true'

# View extracted tokens
curl 'http://localhost:5000/api/db/ct_posts?order=tweet_created_at.desc&limit=5'
```

### Step 4: Signals Generated
Signal creation worker picks up signal candidates and creates trading signals.

---

## 📚 Files Created/Modified

### New Files
- `lib/llm-classifier.ts` - LLM classification service
- `pages/api/admin/classify-tweet.ts` - Test endpoint
- `LLM_CLASSIFIER_SETUP.md` - This guide

### Modified Files
- `server.old/workers/classify.processor.ts` - Now uses LLM

---

## 💡 Pro Tips

1. **Start with fallback mode** (no API key) to test the flow
2. **Add OpenAI key** for production (cheaper than Anthropic)
3. **Use gpt-4o-mini** for cost-effective classification
4. **Monitor costs** in OpenAI dashboard
5. **Test manually** before running full pipeline

---

**Ready to test?** 

1. Start the server: `bash start-next.sh`
2. Test classification:
   ```bash
   curl -X POST http://localhost:5000/api/admin/classify-tweet \
     -H "Content-Type: application/json" \
     -d '{"tweetText": "$BTC to the moon! 🚀"}'
   ```

No API key needed for testing - fallback mode works great! 🎉


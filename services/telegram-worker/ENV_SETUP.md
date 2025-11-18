# Telegram Worker - Environment Variables

## Required Variables

### 1. Database Connection
```env
DATABASE_URL=postgresql://user:password@host:port/database
```
**Required:** Yes  
**Description:** PostgreSQL connection string for the main database  
**Example:** `postgresql://postgres:password@localhost:5432/maxxit`

### 2. LLM API Key (Choose ONE)

#### Option A: Perplexity (Recommended)
```env
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PERPLEXITY_MODEL=sonar  # Optional, defaults to 'sonar'
```
**Required:** Yes (if using Perplexity)  
**Get it:** https://www.perplexity.ai/settings/api

#### Option B: OpenAI
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to 'gpt-4o-mini'
```
**Required:** Yes (if using OpenAI)  
**Get it:** https://platform.openai.com/api-keys

#### Option C: Anthropic Claude
```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-haiku-20240307  # Optional, defaults to 'claude-3-haiku-20240307'
```
**Required:** Yes (if using Anthropic)  
**Get it:** https://console.anthropic.com/settings/keys

**Note:** The worker will try Perplexity → OpenAI → Anthropic in that order. Set the one you want to use.

## Optional Variables

### Port
```env
PORT=5006
```
**Default:** `5006`  
**Description:** Port for health check HTTP server

### Worker Interval
```env
WORKER_INTERVAL=120000
```
**Default:** `120000` (2 minutes)  
**Description:** How often to poll for new messages (in milliseconds)  
**Examples:**
- `60000` = 1 minute
- `120000` = 2 minutes (default)
- `300000` = 5 minutes

### Node Environment
```env
NODE_ENV=production
```
**Default:** `production`  
**Description:** Set to `development` for verbose logging

## Complete Example

```env
# Database
DATABASE_URL=postgresql://postgres:password@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech:5432/neondb

# LLM (choose one)
PERPLEXITY_API_KEY=pplx-abc123def456ghi789

# Optional
PORT=5006
WORKER_INTERVAL=120000
NODE_ENV=production
```

## Railway Deployment

Add these in Railway dashboard:
1. Go to your service settings
2. Add environment variables
3. Set `DATABASE_URL` (Railway may auto-detect)
4. Set one LLM API key
5. Optionally set `PORT` and `WORKER_INTERVAL`

## Verification

After setting env vars, check health:
```bash
curl http://localhost:5006/health
```

Should return:
```json
{
  "status": "ok",
  "service": "telegram-worker",
  "interval": 120000,
  "database": "connected",
  "isRunning": true
}
```

## Troubleshooting

### "No API key found"
- Set at least one LLM API key (PERPLEXITY_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)

### "Database health check failed"
- Check DATABASE_URL is correct
- Verify database is accessible
- Check network/firewall settings

### Worker not processing messages
- Check logs for errors
- Verify DATABASE_URL points to correct database
- Ensure LLM API key has credits/quota


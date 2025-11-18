# Telegram Feed Setup Guide

## ✅ Database Tables Created

The following tables are now in your database:
- `telegram_sources` - Stores Telegram channel/group configurations
- `telegram_posts` - Stores messages from Telegram sources
- `telegram_source_t` - Enum: CHANNEL, GROUP, USER

## 🔧 Environment Setup

Add this to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### How to Get Telegram Bot Token:

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Add it to your `.env` file

### Add Bot to Channels/Groups:

For the bot to read messages, it must be:
- **Channels**: Added as an admin with "Post Messages" permission
- **Groups**: Added as a member/admin with "Read Messages" permission

## 🚀 Running the System

### 1. Start Telegram Ingestion Worker

```bash
npm run worker:telegram-ingest
```

This will:
- Run every 5 minutes
- Fetch new messages from active Telegram sources
- Classify them using LLM
- Store signal candidates

### 2. Add Telegram Sources

**Option A: Via UI**
- Navigate to admin panel
- Use the `TelegramSourceManager` component
- Click "Add Source"

**Option B: Via API**
```bash
curl -X POST http://localhost:3000/api/admin/telegram-sources \
  -H "Content-Type: application/json" \
  -d '{
    "source_name": "Crypto Alpha Channel",
    "telegram_username": "cryptoalphaofficial",
    "telegram_id": "-1001234567890",
    "source_type": "CHANNEL",
    "description": "Premium trading signals",
    "institute_id": "optional-research-institute-uuid"
  }'
```

### 3. Link to Research Institutes

To route signals to agents:

1. **Link Telegram Source to Research Institute**:
   ```bash
   curl -X PATCH http://localhost:3000/api/admin/telegram-sources/:source_id \
     -H "Content-Type: application/json" \
     -d '{"institute_id": "your-institute-uuid"}'
   ```

2. **Ensure Agents are Following that Institute**:
   - Agents linked via `agent_research_institutes` table will receive signals
   - Configure in agent settings UI

## 📊 How It Works

```
Telegram Channel/Group
  ↓
Bot API (every 5 min)
  ↓
telegram_feed_ingestion worker
  ↓
LLM Classifier
  ↓
telegram_posts (is_signal_candidate=true)
  ↓
Signal Generator (run-signal-once.ts)
  ↓
Find agents via research_institutes
  ↓
Create signals
  ↓
Trade Executor
  ↓
Open positions
```

## 🔍 Getting Telegram IDs

### For Public Channels:
- Username: Just the handle without @ (e.g., `cryptonews`)
- ID: Use bots like `@username_to_id_bot` or `@getidsbot`

### For Private Groups:
- Add bot to group
- Forward a message from the group to `@getidsbot`
- It will show the chat ID (e.g., `-1001234567890`)

## 🧪 Testing

### Manual Ingestion Trigger:
```bash
curl -X POST http://localhost:3000/api/admin/ingest-telegram
```

### Check for Signal Candidates:
```bash
# Check telegram_posts table
# Look for records where is_signal_candidate=true
```

### Generate Signals:
```bash
curl -X POST http://localhost:3000/api/admin/run-signal-once
```

## 📋 Available API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/telegram-sources` | List all sources |
| POST | `/api/admin/telegram-sources` | Create new source |
| GET | `/api/admin/telegram-sources/:id` | Get source details |
| PATCH | `/api/admin/telegram-sources/:id` | Update source |
| DELETE | `/api/admin/telegram-sources/:id` | Delete source |
| POST | `/api/admin/ingest-telegram` | Manually trigger ingestion |

## 🎯 Quick Start Checklist

- [x] Database tables created ✅
- [ ] Add `TELEGRAM_BOT_TOKEN` to `.env`
- [ ] Create bot via @BotFather
- [ ] Add bot to your channels/groups as admin
- [ ] Add Telegram sources via API/UI
- [ ] Link sources to research institutes
- [ ] Ensure agents are following those institutes
- [ ] Start telegram ingestion worker
- [ ] Monitor for signal candidates
- [ ] Verify signals are being generated

## 🔥 Production Checklist

- [ ] Bot token secured in environment variables
- [ ] Worker running as systemd service or PM2
- [ ] Error logging configured
- [ ] Rate limits respected for Telegram API
- [ ] Database indexes in place (already added in schema)
- [ ] Monitor LLM API costs
- [ ] Set up alerts for worker failures

## 💡 Tips

1. **Pre-filtering saves costs**: The worker skips obvious non-signals before LLM classification
2. **Default impact factor**: Telegram sources use 0.5 impact factor (configurable in code)
3. **Deduplication**: Signals are deduplicated per agent per 6h bucket
4. **LunarCrush integration**: Position sizing is dynamic based on token score

## 🐛 Troubleshooting

### Bot can't read messages
- Verify bot is admin in channel/group
- Check bot has "Read Messages" permission
- Test with `@getidsbot` to verify chat ID

### No signals generated
- Check `is_signal_candidate=true` in `telegram_posts`
- Verify source is linked to research institute
- Ensure agents are following that institute
- Check signal generator logs

### LLM classification errors
- Verify LLM API key is configured
- Check API quota/limits
- Review error logs in worker

---

**Status**: ✅ Ready to use!
**Created**: November 18, 2025


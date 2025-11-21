# Telegram Alpha Users vs Channel Sources

## Two Different Flows

### 1. **Alpha Users (Direct Messages)** ✅ SIMPLER - NO BOT ADDITION NEEDED

**How it works:**
- Users send messages **directly to your bot** (DM)
- Bot receives via webhook (`/api/telegram/webhook`)
- Messages are stored as `telegram_alpha_users` → `telegram_posts`
- `telegram-alpha-worker` classifies them
- `signal-generator-worker` creates signals

**Setup:**
- User just needs to **start a chat with your bot**
- No need to add bot to channels/groups
- Messages come directly to bot

**Use case:** Individual traders sharing alpha signals via DM

---

### 2. **Channel Sources (Channel Monitoring)** ❌ REQUIRES BOT AS ADMIN

**How it works:**
- Bot monitors public/private channels/groups
- Bot must be **added as admin** to channel
- `telegram-feed-ingestion` worker fetches messages
- Messages stored as `telegram_sources` → `telegram_posts`
- Same classification and signal generation flow

**Setup:**
- Bot must be added to channel as admin
- Channel must have `telegram_id` (not just username)
- Worker polls for new messages

**Use case:** Monitoring public trading channels

---

## Your Use Case: Alpha Users

Since you want:
> "messages coming from these sources to bot should be considered for signal generation"

**You want the Alpha Users flow!**

### What You Need to Do:

1. **Tell the users to:**
   - Open Telegram
   - Search for your bot (e.g., `@YourBotName`)
   - Click "Start" or send any message
   - They can now send trading signals directly to the bot

2. **The bot will automatically:**
   - Receive their messages via webhook
   - Create them as `telegram_alpha_users` (if first time)
   - Store messages in `telegram_posts`
   - Classify them using LLM
   - Generate signals for subscribed agents

3. **No bot addition needed!** Users just DM the bot.

---

## Current Status

I've converted your sources to alpha users:
- `p_9899` (ID: 542726539) → Alpha User
- `meetpaladiya4436` (ID: 1248795296) → Alpha User

**Next Steps:**
1. Share your bot username with these users
2. They send messages directly to the bot
3. Signals will be generated automatically!

---

## How to Link Agents to Alpha Users

Agents can subscribe to alpha users via:
- Admin UI: Link agent to alpha user
- API: `POST /api/admin/agent-telegram-users` with `agent_id` and `telegram_alpha_user_id`

Once linked, all signals from that alpha user will be routed to that agent.



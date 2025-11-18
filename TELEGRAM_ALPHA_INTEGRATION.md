# Telegram Alpha User Integration

## Overview

Individual users can now DM alpha signals to your Telegram bot, and agent creators can subscribe to specific users as signal sources - just like following CT accounts on Twitter.

## Flow

```
User DMs bot with alpha
  ↓
Webhook captures message
  ↓
Auto-creates telegram_alpha_user
  ↓
LLM classifies message
  ↓
Stores in telegram_posts
  ↓
Agent creators select users to follow
  ↓
Signal generator processes posts
  ↓
Agents execute trades
```

## Database Schema

### telegram_alpha_users
Individual Telegram users who share alpha via DMs

```prisma
model telegram_alpha_users {
  id                    String                  
  telegram_user_id      String                  @unique
  telegram_username     String?
  first_name            String?
  last_name             String?
  impact_factor         Float                   @default(0.5)
  is_active             Boolean                 @default(true)
  last_message_at       DateTime?
  created_at            DateTime                @default(now())
  agent_telegram_users  agent_telegram_users[]
  telegram_posts        telegram_posts[]
}
```

### agent_telegram_users
Junction table linking agents to telegram alpha users (like agent_accounts for Twitter)

```prisma
model agent_telegram_users {
  id                     String
  agent_id               String
  telegram_alpha_user_id String
  created_at             DateTime
  agents                 agents
  telegram_alpha_users   telegram_alpha_users
  
  @@unique([agent_id, telegram_alpha_user_id])
}
```

### telegram_posts (Updated)
Now supports messages from BOTH channels and individual users

```prisma
model telegram_posts {
  id                      String
  source_id               String?                // For channels/groups
  alpha_user_id           String?                // For individual DMs
  message_id              String                 @unique
  message_text            String
  message_created_at      DateTime
  is_signal_candidate     Boolean?
  extracted_tokens        String[]
  confidence_score        Float?
  signal_type             String?
  processed_for_signals   Boolean                @default(false)
  telegram_sources        telegram_sources?      // Channel link
  telegram_alpha_users    telegram_alpha_users?  // Alpha user link
}
```

## Components Created

### 1. Webhook Handler
**File**: `pages/api/telegram/webhook.ts`

**Features**:
- Detects if user is linked (for trading) or unlinked (for alpha)
- Automatically creates `telegram_alpha_users` entry on first message
- Classifies messages using LLM
- Stores messages with classification results
- Sends confirmation to user when signal is detected

**User Experience**:
- First message: "🎉 Welcome to Maxxit Alpha! Your trading insights are now live!"
- Each signal: "✅ Signal received: BTC, ETH - bullish"

### 2. Signal Generator (Updated)
**File**: `pages/api/admin/run-signal-once.ts`

**Changes**:
- Queries THREE sources: Twitter, Telegram Channels, Telegram Alpha Users
- Routes signals based on source type:
  - Twitter → `agent_accounts`
  - Telegram Channels → `research_institutes`
  - Telegram Alpha → `agent_telegram_users`

### 3. API Endpoints

#### List Alpha Users
**GET** `/api/telegram-alpha-users`

Returns all active telegram alpha users with stats:
```json
{
  "success": true,
  "alphaUsers": [
    {
      "id": "uuid",
      "telegram_username": "cryptoking",
      "first_name": "John",
      "impact_factor": 0.5,
      "last_message_at": "2025-11-18T...",
      "_count": {
        "telegram_posts": 42,
        "agent_telegram_users": 5
      }
    }
  ]
}
```

#### Link Telegram User to Agent
**POST** `/api/agents/:agentId/telegram-users`

```json
{
  "telegram_alpha_user_id": "uuid"
}
```

#### Unlink Telegram User
**DELETE** `/api/agents/:agentId/telegram-users?telegram_alpha_user_id=uuid`

### 4. UI Components

#### TelegramAlphaUserSelector
**File**: `components/TelegramAlphaUserSelector.tsx`

**Features**:
- Shows all active telegram alpha users
- Displays stats (messages, followers, impact factor)
- Selectable with checkboxes
- Shows last active time

#### Agent Creation Flow (Updated)
**File**: `pages/create-agent.tsx`

**Added**:
- New Step 5: "Telegram Alpha" (between CT Accounts and Wallet)
- Uses `TelegramAlphaUserSelector` component
- Validates that at least ONE source selected (CT accounts OR Telegram users)
- Automatically links selected users when agent is created

## Usage

### For Alpha Providers

1. **Start DMing the bot**:
   ```
   User: "🚀 $BTC breaking out above $90k! Strong momentum, 
         targeting $95k. Consider longing with 3x leverage."
   ```

2. **Bot confirms receipt**:
   ```
   Bot: "✅ Signal received: BTC - bullish
         Agents following you will see this!"
   ```

3. **User becomes available** in agent creation UI for others to follow

### For Agent Creators

1. Navigate to agent creation
2. Complete basic steps (name, venue, strategy, CT accounts)
3. **Step 5: Telegram Alpha Sources**
   - See list of users sharing alpha
   - Select users to follow
   - See stats (messages, impact factor, followers)
4. Continue with wallet and proof of intent
5. Deploy!

### Signal Flow

```
Telegram User (@cryptoking) DMs alpha
  ↓
telegram_alpha_users.cryptoking
  ↓
telegram_posts with classification
  ↓
Agents following @cryptoking get signals
  ↓
Trade execution
```

## Configuration

### Environment Variables

Already set:
```env
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
```

### Bot Setup

✅ Bot is active: `@Prime_Alpha_bot`

Users can:
1. Start DMing alpha directly
2. Bot auto-creates their profile
3. They become available to follow

## Comparison: Twitter vs Telegram Alpha

| Feature | Twitter (CT Accounts) | Telegram Alpha Users |
|---------|----------------------|---------------------|
| Source Type | Public Twitter accounts | Individual DM users |
| Discovery | Pre-curated list | Grows as users DM |
| Impact Factor | Calculated | Default 0.5 |
| Agent Linking | `agent_accounts` | `agent_telegram_users` |
| UI Step | Step 4 | Step 5 |
| Required | Yes (need ≥1 source) | No (optional) |

## Testing

### Test the Flow

1. **Send alpha to bot**:
   ```
   Send DM to @Prime_Alpha_bot:
   "$ETH looking strong above $3500, 
    expecting move to $4k soon. Great entry."
   ```

2. **Verify user created**:
   ```bash
   # Check database
   SELECT * FROM telegram_alpha_users 
   WHERE telegram_user_id = 'YOUR_TELEGRAM_ID';
   ```

3. **Check message stored**:
   ```bash
   SELECT * FROM telegram_posts 
   WHERE alpha_user_id = 'UUID_FROM_ABOVE'
   AND is_signal_candidate = true;
   ```

4. **Create agent and select user**:
   - Go to agent creation
   - Navigate to Step 5
   - Select the telegram user
   - Complete agent creation

5. **Verify linking**:
   ```bash
   SELECT * FROM agent_telegram_users
   WHERE telegram_alpha_user_id = 'UUID';
   ```

6. **Generate signals**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/run-signal-once
   ```

## Key Differences from Channels

| Aspect | Channels (Old) | Alpha Users (New) |
|--------|---------------|------------------|
| Admin adds | ✅ Via UI/API | ❌ Auto-created |
| User control | Admin curates | Users self-register |
| Linking | research_institutes | Direct to agents |
| Discoverability | Manual addition | Automatic on first DM |
| Permission | Bot must be admin | User just DMs |

## Monitoring

### Check Active Alpha Users

```bash
curl http://localhost:3000/api/telegram-alpha-users
```

### View User Stats

```sql
SELECT 
  tau.telegram_username,
  tau.first_name,
  tau.impact_factor,
  COUNT(DISTINCT tp.id) as message_count,
  COUNT(DISTINCT atu.agent_id) as follower_count,
  tau.last_message_at
FROM telegram_alpha_users tau
LEFT JOIN telegram_posts tp ON tau.id = tp.alpha_user_id
LEFT JOIN agent_telegram_users atu ON tau.id = atu.telegram_alpha_user_id
WHERE tau.is_active = true
GROUP BY tau.id
ORDER BY follower_count DESC, message_count DESC;
```

### Check Signal Generation

```sql
-- Signals from telegram alpha users
SELECT 
  s.*,
  tau.telegram_username
FROM signals s
JOIN agent_telegram_users atu ON s.agent_id = atu.agent_id
JOIN telegram_alpha_users tau ON atu.telegram_alpha_user_id = tau.id
WHERE s.created_at > NOW() - INTERVAL '24 hours';
```

## Future Enhancements

1. **Reputation System**:
   - Track signal accuracy
   - Adjust impact_factor based on performance
   - Show win rate in UI

2. **User Profiles**:
   - Bio/description
   - Specialty (DeFi, memecoins, etc.)
   - Historical performance

3. **Premium Alpha**:
   - Paid subscriptions for top alpha providers
   - Exclusive access tiers

4. **Analytics Dashboard**:
   - Track which alpha users are most followed
   - Show signal conversion rates
   - ROI per alpha source

## Troubleshooting

### User not appearing in selector

**Check**:
1. User sent at least one message?
2. Message passed pre-filter (length > 15 chars, not a command)?
3. User marked as `is_active = true`?
4. Message classified as signal candidate?

```sql
SELECT * FROM telegram_alpha_users 
WHERE telegram_username = 'username';

SELECT * FROM telegram_posts 
WHERE alpha_user_id = 'uuid'
ORDER BY message_created_at DESC
LIMIT 10;
```

### Signals not generating

**Check**:
1. Agent linked to telegram user?
   ```sql
   SELECT * FROM agent_telegram_users 
   WHERE agent_id = 'agent-uuid';
   ```

2. Posts marked as processed?
   ```sql
   SELECT * FROM telegram_posts 
   WHERE alpha_user_id = 'uuid'
   AND processed_for_signals = false;
   ```

3. Run signal generator manually:
   ```bash
   curl -X POST http://localhost:3000/api/admin/run-signal-once
   ```

---

**Status**: ✅ Fully Implemented and Ready
**Date**: November 18, 2025
**Version**: 1.0.0


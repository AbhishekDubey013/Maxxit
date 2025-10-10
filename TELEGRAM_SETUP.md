# Telegram Trading Bot Setup Guide

## 🤖 Overview

Users can now take manual trades via Telegram alongside automated trading. All trades are executed through the same Safe module with real on-chain transactions.

## 📋 Features

- ✅ Natural language commands ("Buy 10 USDC of WETH")
- ✅ LLM-powered intent parsing
- ✅ Confirmation buttons before execution
- ✅ Real-time position status
- ✅ Same monitoring as automated trades
- ✅ Manual position management (close via Telegram)
- ✅ Secure wallet linking with one-time codes

## 🚀 Setup Steps

### 1. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot`
3. Choose a name: `Maxxit Trading Bot`
4. Choose a username: `MaxxitTradingBot` (or similar)
5. Copy the bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
LLM_API_KEY=your_anthropic_or_openai_key  # For natural language parsing
```

### 3. Set Webhook (Production)

On Railway/Vercel deployment:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### 4. Push Schema Changes

```bash
npx prisma db push
npx prisma generate
```

## 📱 User Flow

### Linking Safe Wallet to Telegram

1. User goes to agent deployment page
2. Clicks "Connect Telegram" button
3. Gets a 6-character code (e.g., `ABC123`)
4. Opens Telegram, searches for bot
5. Sends `/link ABC123`
6. Bot confirms link successful

### Trading via Telegram

#### Buy Position
```
User: Buy 10 USDC of WETH
Bot: 🟢 BUY WETH
     Amount: $10 USDC
     Confirm this trade?
     [✅ Confirm] [❌ Cancel]

User: *clicks Confirm*
Bot: ⏳ Executing trade...
Bot: ✅ Trade executed successfully!
     🔗 TX: https://arbiscan.io/tx/0x...
```

#### Check Status
```
User: status
Bot: 📊 Your Manual Positions:
     
     1. WETH LONG
        Qty: 0.0023
        Entry: $3,450.00
        TX: 0x1234567...
     
     To close: "Close my WETH"
```

#### Close Position
```
User: Close my WETH
Bot: ⏳ Closing 1 position(s)...
Bot: ✅ Closed 1/1 positions successfully!
```

## 🏗️ Architecture

### Database Schema

**New Tables:**
- `telegram_users` - Links Telegram ID to Safe wallet deployment
- `telegram_trades` - Tracks manual trade intents and confirmations

**Updated Tables:**
- `positions` - Added `source` field ('auto' or 'telegram')
- `agent_deployments` - Relations to telegram users/trades

### Flow Diagram

```
Telegram Message
    ↓
Webhook API
    ↓
Parse Intent (LLM)
    ↓
Show Confirmation
    ↓
User Confirms
    ↓
Create Signal (sourceTweets: ['telegram_*'])
    ↓
TradeExecutor.executeSignal() (SAME AS AUTO)
    ↓
Position Created (source: 'telegram')
    ↓
Position Monitor Tracks It (SAME AS AUTO)
```

### Key Components

- **`lib/telegram-bot.ts`** - Telegram Bot API wrapper
- **`lib/telegram-command-parser.ts`** - Natural language understanding
- **`pages/api/telegram/webhook.ts`** - Receives Telegram updates
- **`pages/api/telegram/generate-link.ts`** - Creates one-time link codes

## 🔐 Security

- One-time link codes expire after use
- Each Telegram ID linked to specific Safe wallet
- Confirmation required before execution
- All trades executed through Safe module (non-custodial)
- User must approve transactions in Safe UI for high-value trades

## 📊 Filtering Manual Positions

Frontend can filter positions by source:

```typescript
// Show only manual positions
const manualPositions = await prisma.position.findMany({
  where: {
    deploymentId,
    source: 'telegram',
    closedAt: null
  }
});

// Show only automated positions
const autoPositions = await prisma.position.findMany({
  where: {
    deploymentId,
    source: 'auto',
    closedAt: null
  }
});
```

## 🤖 Supported Commands

| Command | Example | Description |
|---------|---------|-------------|
| Buy | "Buy 10 USDC of WETH" | Open long position |
| Buy % | "Buy 5% WETH" | Use percentage of balance |
| Sell | "Sell 50% of my ARB" | Close partial position |
| Close | "Close my WETH" | Close all WETH positions |
| Close All | "Close all positions" | Close all manual positions |
| Status | "status" or "my positions" | Show open manual positions |
| Help | "help" or "/help" | Show command list |

## 🚀 Testing Locally

```bash
# Start API server
npm run dev

# Use ngrok to expose webhook
npx ngrok http 5000

# Set webhook to ngrok URL
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://abc123.ngrok.io/api/telegram/webhook"

# Test with your bot
# Send: /link ABC123
# Then: Buy 5 USDC of WETH
```

## 📝 Environment Variables Summary

```bash
# Required for Telegram integration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Optional: For LLM command parsing (highly recommended)
LLM_API_KEY=sk-ant-api... # Anthropic Claude
# OR
OPENAI_API_KEY=sk-...     # OpenAI

# Existing variables
EXECUTOR_PRIVATE_KEY=0x...
MODULE_ADDRESS=0x74437d894C8E8A5ACf371E10919c688ae79E89FA
DATABASE_URL=postgresql://...
```

## 🎯 Next Steps

1. Create Telegram bot via BotFather
2. Add `TELEGRAM_BOT_TOKEN` to `.env`
3. Push schema changes to database
4. Deploy to Railway/Vercel
5. Set webhook URL
6. Test linking and trading!

---

Built with 💚 for seamless manual + automated trading


# CT Posts Implementation Summary

## ✅ What Was Implemented

### 1. Agent Creation Flow Updated
- **New Step Added**: CT Account selection is now step 4 (between Strategy and Wallet)
- **6-step wizard**: Basic Info → Venue → Strategy → **CT Accounts** → Wallet → Review
- Users can now select multiple CT accounts when creating an agent
- Built-in form to add new CT accounts on-the-fly

### 2. CT Accounts Management
- **New API Endpoint**: `/api/ct-accounts/`
  - `GET`: List all CT accounts with search, sorting by impact factor
  - `POST`: Create new CT accounts
- **Account Selection UI**: 
  - Visual cards showing username, display name, followers, and impact factor
  - Multi-select with checkboxes
  - Search/filter functionality
  - Add new accounts inline without leaving the flow

### 3. Agent-CT Account Linking
- Automatically links selected CT accounts to agent on creation
- Uses existing `AgentAccount` junction table
- Multiple CT accounts can be linked to a single agent
- Existing API endpoints work: 
  - `GET /api/agents/:id/accounts` - View linked accounts
  - `POST /api/agents/:id/accounts` - Add account
  - `DELETE /api/agents/:id/accounts/:accountId` - Remove account

### 4. X API Integration
- **New Module**: `lib/x-api.ts`
  - Full X API v2 client implementation
  - Fetches tweets from user timelines
  - Retrieves user information and follower counts
  - Handles rate limits and errors gracefully
  - Falls back to mock data when API is not configured

### 5. Backend Tweet Ingestion
- **Updated**: `server.old/workers/tweetIngest.processor.ts`
  - Now uses real X API when configured
  - Fetches up to 50 recent tweets per account
  - Only fetches new tweets (using `sinceId`)
  - Falls back to mock tweets for testing
  - Automatic duplicate detection

### 6. Admin Tools
- **New Endpoint**: `/api/admin/ingest-tweets`
  - Manually trigger tweet ingestion for testing
  - Can process single account or all accounts
  - Updates follower counts and user info
  - Returns detailed results

## 🔧 Configuration

### Required Environment Variable

Make sure your `.env` file has one of these variables:

```bash
X_API_BEARER_TOKEN=your_twitter_bearer_token_here
```

**Alternative variable names** (any will work):
- `X_API_KEY`
- `TWITTER_BEARER_TOKEN`

### Getting Your X API Credentials

See the full guide in `X_API_SETUP.md`, but quick steps:

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create an app (or use existing)
3. Generate a Bearer Token in "Keys and tokens"
4. Add it to your `.env` file
5. Apply for **Elevated Access** (required for user timelines)

## 🚀 How to Use

### Creating an Agent with CT Accounts

1. **Navigate to Agent Creation**: Click "Create Agent" button
2. **Fill Basic Info**: Name and description
3. **Select Venue**: SPOT, GMX, or HYPERLIQUID
4. **Configure Strategy**: Adjust the 8 weight sliders
5. **Select CT Accounts** (NEW!):
   - Browse existing CT accounts
   - Select one or more accounts (required)
   - OR click "Add Account" to add new ones:
     - Enter Twitter username (e.g., @elonmusk)
     - Optionally add display name and follower count
     - Account will be auto-selected after creation
6. **Connect Wallet**: Your wallet address
7. **Review & Submit**: Confirm all details

### Adding CT Accounts

There are 3 ways to add CT accounts:

#### Option 1: During Agent Creation
- Click "Add Account" button in step 4
- Fill in the form inline
- Account is created and auto-selected

#### Option 2: Via API Directly
```bash
curl -X POST http://localhost:3000/api/ct-accounts \
  -H "Content-Type: application/json" \
  -d '{
    "xUsername": "elonmusk",
    "displayName": "Elon Musk",
    "followersCount": 150000000
  }'
```

#### Option 3: Via Database
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.ctAccount.create({
  data: {
    xUsername: 'elonmusk',
    displayName: 'Elon Musk',
    followersCount: 150000000,
  },
});
```

### Testing Tweet Ingestion

#### Manual Test (Recommended)
```bash
# Ingest tweets from all CT accounts
curl http://localhost:3000/api/admin/ingest-tweets

# Ingest tweets from specific account
curl http://localhost:3000/api/admin/ingest-tweets?ctAccountId=<account-id>
```

Response:
```json
{
  "success": true,
  "processed": 2,
  "results": [
    {
      "accountId": "uuid-here",
      "username": "elonmusk",
      "fetched": 15,
      "created": 15,
      "skipped": 0
    }
  ]
}
```

#### Automatic (Production)
The system will automatically run tweet ingestion every 6 hours via BullMQ workers (when configured).

## 📊 Data Flow

```
1. CT Account Created
   ↓
2. Linked to Agent (AgentAccount junction)
   ↓
3. Tweet Ingest Worker (every 6h)
   ↓
4. X API Fetches Tweets → CtPost created
   ↓
5. Classify Worker (LLM analyzes tweet)
   ↓
6. Signal Creation (if candidate)
   ↓
7. Trade Execution
```

## 🎨 UI Features

### CT Account Card
- Twitter icon with blue accent
- Username (e.g., @elonmusk)
- Display name
- Follower count with formatting (e.g., "150,000,000 followers")
- Impact factor score
- Checkmark when selected
- Hover states with border color change

### Review Step
Shows all selected CT accounts with Twitter icons in the final review before submission.

## 🔍 Database Schema

No changes needed! Uses existing schema:

### `ct_accounts` table
```sql
- id (uuid)
- x_username (unique)
- display_name
- followers_count
- impact_factor (updated by system)
- last_seen_at (updated on each ingest)
```

### `ct_posts` table
```sql
- id (uuid)
- ct_account_id (foreign key)
- tweet_id (unique)
- tweet_text
- tweet_created_at
- is_signal_candidate (boolean)
- extracted_tokens (text array, e.g., ['BTC', 'ETH'])
```

### `agent_accounts` table (junction)
```sql
- id (uuid)
- agent_id (foreign key)
- ct_account_id (foreign key)
- created_at
UNIQUE(agent_id, ct_account_id)
```

## 🧪 Testing Without X API

If you don't have X API credentials yet, the system will:
- Use **mock tweets** with realistic crypto content
- Generate fake tweet IDs
- Still create `CtPost` records
- Allow you to test the entire flow

This means you can:
- Create agents with CT accounts
- See tweets being "ingested"
- Test signal generation
- Deploy and test trading logic

Simply omit the X API credentials and it will automatically use mock data.

## 📝 Files Modified/Created

### New Files
- `pages/api/ct-accounts/index.ts` - CT accounts CRUD API
- `pages/api/admin/ingest-tweets.ts` - Manual tweet ingestion
- `lib/x-api.ts` - X API client library
- `X_API_SETUP.md` - Detailed X API setup guide
- `CT_POSTS_IMPLEMENTATION.md` - This file

### Modified Files
- `pages/create-agent.tsx` - Added CT account selection step
- `server.old/workers/tweetIngest.processor.ts` - Integrated X API

## 🐛 Troubleshooting

### "Please select at least one CT account"
- You must select at least one CT account before proceeding
- Click on a CT account card to select it
- Or add a new account using the "Add Account" button

### No CT accounts showing up
- Click "Add Account" to create your first CT account
- Or use the admin endpoint to seed accounts
- Check database connection

### X API returns no tweets
- Verify your Bearer Token is correct
- Apply for Elevated Access (required for user timelines)
- Check rate limits (see logs for 429 errors)
- Ensure username is correct and account is public

### Mock tweets being used
- This is normal if X API is not configured
- Set `X_API_BEARER_TOKEN` in `.env` to use real API
- Check logs for X API connection status

## 🎯 Next Steps

1. **Add CT Accounts**: Add popular crypto influencers
2. **Create Agents**: Use the new wizard to create agents with CT accounts
3. **Test Ingestion**: Use `/api/admin/ingest-tweets` to fetch tweets
4. **Monitor Logs**: Watch for `[TweetIngest]` and `[X API]` entries
5. **View Signals**: Check dashboard for generated trading signals
6. **Deploy & Trade**: Connect Safe wallet and start trading

## 🚀 Production Checklist

- [ ] X API Bearer Token configured in `.env`
- [ ] Elevated Access approved by Twitter
- [ ] CT accounts added for popular crypto influencers
- [ ] Tweet ingestion tested and working
- [ ] BullMQ workers running for automatic ingestion
- [ ] LLM classification working (OpenAI/Anthropic)
- [ ] Signals being generated from tweets
- [ ] Database indexes optimized for CT queries

## 📚 Related Documentation

- `X_API_SETUP.md` - Detailed X API configuration guide
- `README.md` - General project documentation
- `BACKEND_AUDIT.md` - Backend architecture overview
- `prisma/schema.prisma` - Database schema

## 💡 Tips

- **Popular CT accounts to follow**: Search for crypto influencers with high follower counts and impact
- **Impact Factor**: Will be calculated automatically based on trading performance from their signals
- **Rate Limits**: The system fetches tweets every 6h to stay within X API limits
- **Mock Data**: Perfect for development and testing without API costs
- **Multi-select**: You can link the same CT account to multiple agents with different strategies

---

**Questions or issues?** Check the logs for detailed error messages and consult `X_API_SETUP.md` for API-specific troubleshooting.


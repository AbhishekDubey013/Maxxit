# Agent HOW Integration Guide

## Status: ✅ Backend Complete | 🔄 Frontend Pending

### Completed ✅

1. **Database Schema**
   - ✅ `user_trading_preferences` table added to `prisma/schema.prisma`
   - ✅ `user_agent_addresses` table (one address per user)
   - ✅ Migration SQL: `prisma/migrations/add_user_trading_preferences.sql`

2. **Backend Services**
   - ✅ `lib/agent-how.ts` - Position sizing algorithm
   - ✅ `pages/api/user/trading-preferences.ts` - GET/POST preferences
   - ✅ `workers/research-signal-generator.ts` - Integrated Agent HOW

3. **Frontend Component**
   - ✅ `components/TradingPreferencesModal.tsx` - 5 sliders UI

4. **Documentation**
   - ✅ `AGENT_WHAT_AND_HOW.md` - Complete architecture
   - ✅ `ONE_ADDRESS_PER_USER_FIX.md` - Address design
   - ✅ `DEPLOYMENT_ADDRESS_STRUCTURE.md` - Simple explanation

### Pending Integration 🔄

#### 1. Database Migration
```bash
# Run migration to create user_trading_preferences table
npm run prisma:migrate

# Or manually:
psql $DATABASE_URL < prisma/migrations/add_user_trading_preferences.sql
```

#### 2. Frontend Integration

**Option A: Show Modal Before Deployment**
```typescript
// In pages/deploy-agent/[id].tsx or similar

import { TradingPreferencesModal } from '../../../components/TradingPreferencesModal';
import { useState } from 'react';

function DeployAgentPage() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [userWallet, setUserWallet] = useState('');

  const handleDeploy = () => {
    // Check if user has set preferences
    checkUserPreferences(userWallet).then((hasPrefs) => {
      if (!hasPrefs) {
        // First-time user - show modal
        setShowPreferences(true);
      } else {
        // Existing user - deploy directly
        proceedWithDeployment();
      }
    });
  };

  return (
    <>
      {/* Existing deployment UI */}
      <button onClick={handleDeploy}>Deploy Agent</button>

      {/* Trading Preferences Modal */}
      {showPreferences && (
        <TradingPreferencesModal
          userWallet={userWallet}
          onClose={() => setShowPreferences(false)}
          onSave={() => {
            setShowPreferences(false);
            proceedWithDeployment();
          }}
        />
      )}
    </>
  );
}
```

**Option B: Add "Customize Trading Style" Button to Dashboard**
```typescript
// In user dashboard page

import { TradingPreferencesModal } from '../components/TradingPreferencesModal';

function Dashboard() {
  const [showPreferences, setShowPreferences] = useState(false);

  return (
    <div>
      {/* Existing dashboard */}
      
      <button onClick={() => setShowPreferences(true)}>
        ⚙️ Customize Trading Style
      </button>

      {showPreferences && (
        <TradingPreferencesModal
          userWallet={userWallet}
          onClose={() => setShowPreferences(false)}
          onSave={() => {
            setShowPreferences(false);
            // Optionally show success toast
          }}
        />
      )}
    </div>
  );
}
```

#### 3. Update Other Signal Generators

**Telegram Signal Worker** (`services/telegram-worker/src/worker.ts`)
```typescript
import { getPositionSizeForSignal } from '../../../lib/agent-how';

// When creating signal from Telegram message:
const positionResult = await getPositionSizeForSignal({
  tokenSymbol: extractedToken,
  confidence: llmConfidence, // From LLM classification
  userWallet: deployment.user_wallet,
  venue: signalVenue,
});

// Use in signal creation:
size_model: {
  type: 'balance-percentage',
  value: positionResult.value,
  reasoning: positionResult.reasoning,
}
```

**Twitter Signal Worker** (`services/tweet-ingestion-worker/`)
```typescript
// Similar integration as Telegram
const positionResult = await getPositionSizeForSignal({
  tokenSymbol: token,
  confidence: tweet.llmClassification.confidence,
  userWallet: deployment.user_wallet,
  venue: signalVenue,
});
```

### Testing Checklist

- [ ] Run database migration
- [ ] Create test user with preferences (use API endpoint)
- [ ] Generate signal and verify personalized position size
- [ ] Test with different preference values (0, 50, 100)
- [ ] Verify default behavior (5%) when no preferences exist
- [ ] Test modal UI in browser
- [ ] Verify preferences persist across sessions

### API Endpoints

**Get User Preferences**
```bash
GET /api/user/trading-preferences?wallet=0x123...
```

**Save User Preferences**
```bash
POST /api/user/trading-preferences
{
  "userWallet": "0x123...",
  "preferences": {
    "risk_tolerance": 70,
    "trade_frequency": 50,
    "social_sentiment_weight": 60,
    "price_momentum_focus": 55,
    "market_rank_priority": 50
  }
}
```

### Usage in Code

**Backend: Get Position Size**
```typescript
import { getPositionSizeForSignal } from './lib/agent-how';

const result = await getPositionSizeForSignal({
  tokenSymbol: 'ETH',
  confidence: 0.75, // From LLM
  userWallet: '0xuser...',
  venue: 'HYPERLIQUID',
});

console.log(result.value);      // e.g., 6.5
console.log(result.reasoning);  // Human-readable explanation
```

**Backend: Get/Save Preferences**
```typescript
import {
  getUserTradingPreferences,
  saveUserTradingPreferences,
} from './lib/agent-how';

// Get
const prefs = await getUserTradingPreferences('0xuser...');
// Returns defaults if not set

// Save
await saveUserTradingPreferences('0xuser...', {
  risk_tolerance: 80,
  trade_frequency: 60,
  social_sentiment_weight: 70,
  price_momentum_focus: 55,
  market_rank_priority: 50,
});
```

### Benefits of This Implementation

1. **Backward Compatible**: Falls back to 5% if no preferences exist
2. **Transparent**: Stores reasoning with each signal
3. **Flexible**: Easy to add more preference dimensions
4. **User-Centric**: Same preferences across all agents for consistency
5. **Performance**: Minimal DB queries (cached per user)

### Next Steps for Production

1. **Deploy Migration**: Run SQL migration on production DB
2. **Add Modal to UI**: Integrate `TradingPreferencesModal` into deployment flow
3. **Update Workers**: Integrate Agent HOW into Telegram and Twitter workers
4. **Test End-to-End**: Verify personalization works in production
5. **Add Analytics**: Track which preference combinations perform best
6. **Add Tooltips**: Explain what each slider does in more detail
7. **Add Presets**: "Conservative", "Balanced", "Aggressive" quick-select buttons

### Support

For questions or issues:
- Check `AGENT_WHAT_AND_HOW.md` for architecture details
- See `lib/agent-how.ts` for algorithm implementation
- Review `components/TradingPreferencesModal.tsx` for UI

---

**Status**: Research signal generator integrated ✅  
**Next**: Deploy migration → Integrate modal → Test 🚀


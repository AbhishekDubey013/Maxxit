# Classification Fix: NULL vs FALSE

## The Problem

Previously, messages were being marked as `is_signal_candidate = false` **before** LLM classification in two places:
1. Telegram Webhook API (for short/common messages)
2. Telegram Feed Ingestion Worker (for channel messages)

This caused confusion because:
- `false` could mean "not yet classified" OR "classified as not a signal"
- No way to distinguish between pre-filtered vs. LLM-rejected messages
- Inconsistent with Twitter ingestion pattern

## The Fix

### Three-State System

All messages now follow a consistent 3-state lifecycle:

1. **`NULL`** - Not yet classified (waiting for LLM)
2. **`false`** - Classified by LLM as NOT a signal
3. **`true`** - Classified by LLM as a signal

### Changes Made

#### 1. Telegram Webhook (`pages/api/telegram/webhook.ts`)

**Before:**
```typescript
// Pre-filtered short/common messages
if (isShortNonSignal || isCommonChatter) {
  await prisma.telegram_posts.create({
    data: {
      is_signal_candidate: false, // ❌ Set before LLM
      // ...
    }
  });
  return;
}
```

**After:**
```typescript
// ALL messages start as NULL
await prisma.telegram_posts.create({
  data: {
    is_signal_candidate: null, // ✅ Worker will classify
    // ...
  }
});
```

#### 2. Telegram Feed Ingestion (`workers/telegram-feed-ingestion.ts`)

**Before:**
```typescript
// Pre-filtered messages
if (isShortNonSignal || isCommonChatter) {
  await prisma.telegram_posts.create({
    data: {
      is_signal_candidate: false, // ❌ Set before LLM
      // ...
    }
  });
  continue;
}
```

**After:**
```typescript
// ALL messages go through LLM
const classification = await classifier.classifyTweet(msg.text);

await prisma.telegram_posts.create({
  data: {
    is_signal_candidate: classification.isSignalCandidate, // ✅ LLM decision
    // ...
  }
});
```

#### 3. Twitter Ingestion (Already Correct)

Twitter was already doing this correctly:
```typescript
// Store tweet with NULL
const storedTweet = await prisma.ct_posts.create({
  data: {
    // is_signal_candidate not set = NULL
  }
});

// Immediately classify with LLM
const classification = await classifier.classifyTweet(tweet.text);
await prisma.ct_posts.update({
  where: { id: storedTweet.id },
  data: {
    is_signal_candidate: classification.isSignalCandidate, // ✅ LLM decision
  }
});
```

## Benefits

1. **Consistency**: All feeds (Twitter, Telegram DMs, Telegram Channels) now use the same pattern
2. **Transparency**: Can distinguish between "not yet processed" vs "processed but not a signal"
3. **Debugging**: Easier to track where classification failed or is pending
4. **Accuracy**: LLM makes all signal/non-signal decisions, not regex filters

## Testing

Send a test message to verify:

```bash
# Check classification status
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const recent = await prisma.telegram_posts.findFirst({
    orderBy: { created_at: 'desc' },
    select: {
      message_text: true,
      is_signal_candidate: true,
      extracted_tokens: true,
      confidence_score: true,
    }
  });
  
  console.log('Recent message:', recent?.message_text);
  console.log('Classification:', 
    recent?.is_signal_candidate === null ? '⏳ Pending' :
    recent?.is_signal_candidate === true ? '✅ Signal' :
    '❌ Not signal'
  );
  console.log('Tokens:', recent?.extracted_tokens);
  console.log('Confidence:', recent?.confidence_score);
  
  await prisma.\$disconnect();
}

check().catch(console.error);
"
```

## Migration Note

Existing messages with `is_signal_candidate = false` might be:
- Pre-filtered (never saw LLM) - should ideally be re-classified
- Actually classified by LLM as false - these are correct

If you want to re-process all messages:
```sql
-- Mark all as unclassified (optional, be careful!)
UPDATE telegram_posts 
SET is_signal_candidate = NULL 
WHERE is_signal_candidate = false;

-- Worker will pick them up and classify
```

## Related Files

- `pages/api/telegram/webhook.ts` - Webhook handler for DMs
- `workers/telegram-feed-ingestion.ts` - Channel message ingestion
- `services/telegram-alpha-worker/src/worker.ts` - LLM classification worker
- `services/tweet-ingestion-worker/src/worker.ts` - Twitter (reference implementation)
- `prisma/schema.prisma` - Database schema

## Status

✅ **FIXED** - All new messages will be properly classified by LLM


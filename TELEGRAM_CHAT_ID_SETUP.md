# How to Get Telegram Chat IDs

## Problem

The Telegram feed ingestion worker requires `telegram_id` (chat ID) to fetch messages from channels/groups. The sources we added only have `telegram_username`, so they're being skipped.

## Solution: Get Chat IDs

### Method 1: Using @getidsbot (Easiest)

1. **For Public Channels:**
   - Forward any message from the channel to `@getidsbot`
   - It will reply with the chat ID (format: `-1001234567890`)

2. **For Private Groups:**
   - Add `@getidsbot` to the group
   - Forward a message from the group to `@getidsbot`
   - It will reply with the chat ID

### Method 2: Using @username_to_id_bot

1. Send `/start` to `@username_to_id_bot`
2. Send the channel username (e.g., `@meetpaladiya4436`)
3. It will reply with the chat ID

### Method 3: Add Bot to Channel First

1. Add your Telegram bot to the channel as an admin
2. Run the resolution script:
   ```bash
   npx tsx scripts/resolve-telegram-ids.ts
   ```
3. The script will automatically fetch and update the chat IDs

## Update Database

Once you have the chat IDs, update them using one of these methods:

### Option A: Edit Script and Run

1. Edit `scripts/update-telegram-ids.ts`
2. Add the chat IDs in the `chatIds` object:
   ```typescript
   const chatIds: Record<string, string> = {
     'meetpaladiya4436': '-1001234567890', // Replace with actual ID
     'p_9899': '-1001234567890', // Replace with actual ID
   };
   ```
3. Run the script:
   ```bash
   npx tsx scripts/update-telegram-ids.ts
   ```

### Option B: Use API Endpoint

```bash
# Update Meet Paladiya
curl -X PATCH http://localhost:3000/api/admin/telegram-sources/{source_id} \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": "-1001234567890"}'

# Update P_9899
curl -X PATCH http://localhost:3000/api/admin/telegram-sources/{source_id} \
  -H "Content-Type: application/json" \
  -d '{"telegram_id": "-1001234567890"}'
```

### Option C: Direct Database Update

```sql
-- Update Meet Paladiya
UPDATE telegram_sources 
SET telegram_id = '-1001234567890' 
WHERE telegram_username = 'meetpaladiya4436';

-- Update P_9899
UPDATE telegram_sources 
SET telegram_id = '-1001234567890' 
WHERE telegram_username = 'p_9899';
```

## Verify

After updating, verify the sources have chat IDs:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.telegram_sources.findMany({
  where: { is_active: true },
  select: { source_name: true, telegram_username: true, telegram_id: true }
}).then(sources => {
  console.log('Sources:');
  sources.forEach(s => {
    console.log(\`  \${s.source_name}: \${s.telegram_id || 'MISSING'}\`);
  });
  prisma.\$disconnect();
});
"
```

## Important Notes

1. **Bot Must Be Admin:** The bot must be added to the channel/group as an admin with "Post Messages" permission for the ingestion worker to fetch messages.

2. **Chat ID Format:** 
   - Public channels: Usually start with `-100` (e.g., `-1001234567890`)
   - Private groups: Usually start with `-` (e.g., `-1234567890`)
   - User chats: Positive numbers (e.g., `123456789`)

3. **After Updating:** The Telegram feed ingestion worker will automatically pick up sources with `telegram_id` on the next run (every 5 minutes).

## Current Status

Run this to check which sources need chat IDs:

```bash
npx tsx scripts/resolve-telegram-ids.ts
```



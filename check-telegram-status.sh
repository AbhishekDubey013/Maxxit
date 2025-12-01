#!/bin/bash

# Telegram Signal Status Checker
# Quick diagnostic script to check why signals aren't being generated

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 TELEGRAM SIGNAL DIAGNOSTIC TOOL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set!"
  echo "   Export it first: export DATABASE_URL='your_connection_string'"
  exit 1
fi

echo "✅ Database connection found"
echo ""

# Function to run query and display results
run_check() {
  local title=$1
  local query=$2
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $title"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  psql "$DATABASE_URL" -c "$query" 2>&1
  echo ""
}

# 1. Check recent Telegram messages
run_check "1️⃣  RECENT TELEGRAM MESSAGES" \
"SELECT 
  LEFT(message_text, 50) as message,
  alpha_user_id IS NOT NULL as is_from_alpha_user,
  is_signal_candidate,
  processed_for_signals,
  extracted_tokens,
  TO_CHAR(created_at, 'MM-DD HH24:MI') as time
FROM telegram_posts
ORDER BY created_at DESC
LIMIT 5;"

# 2. Check alpha users
run_check "2️⃣  TELEGRAM ALPHA USERS" \
"SELECT 
  telegram_username,
  first_name,
  impact_factor,
  is_active,
  TO_CHAR(last_message_at, 'MM-DD HH24:MI') as last_msg
FROM telegram_alpha_users
ORDER BY created_at DESC
LIMIT 5;"

# 3. Check agent subscriptions
run_check "3️⃣  AGENT → TELEGRAM USER LINKS" \
"SELECT 
  a.name as agent_name,
  a.status as agent_status,
  a.venue,
  tau.telegram_username
FROM agent_telegram_users atu
JOIN agents a ON atu.agent_id = a.id
JOIN telegram_alpha_users tau ON atu.telegram_alpha_user_id = tau.id
LIMIT 10;"

# 4. Check unprocessed signal candidates
run_check "4️⃣  PENDING SIGNAL CANDIDATES (Should be picked up by Signal Generator)" \
"SELECT 
  LEFT(tp.message_text, 40) as message,
  tp.extracted_tokens,
  tp.signal_type,
  tau.telegram_username,
  TO_CHAR(tp.message_created_at, 'MM-DD HH24:MI') as time
FROM telegram_posts tp
JOIN telegram_alpha_users tau ON tp.alpha_user_id = tau.id
WHERE tp.is_signal_candidate = true
  AND tp.processed_for_signals = false
  AND tp.alpha_user_id IS NOT NULL
ORDER BY tp.message_created_at DESC
LIMIT 5;"

# 5. Check recent signals from Telegram
run_check "5️⃣  SIGNALS GENERATED FROM TELEGRAM" \
"SELECT 
  s.token_symbol,
  s.side,
  s.venue,
  a.name as agent,
  TO_CHAR(s.created_at, 'MM-DD HH24:MI') as time,
  s.skipped_reason IS NOT NULL as was_skipped
FROM signals s
JOIN agents a ON s.agent_id = a.id
WHERE EXISTS (
  SELECT 1 FROM telegram_posts tp 
  WHERE tp.message_id = ANY(s.source_tweets)
)
ORDER BY s.created_at DESC
LIMIT 5;"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 DIAGNOSIS SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check what's missing
MESSAGES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM telegram_posts WHERE alpha_user_id IS NOT NULL;" 2>/dev/null | tr -d ' ')
ALPHA_USERS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM telegram_alpha_users WHERE is_active = true;" 2>/dev/null | tr -d ' ')
AGENT_LINKS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM agent_telegram_users;" 2>/dev/null | tr -d ' ')
PENDING=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM telegram_posts WHERE is_signal_candidate = true AND processed_for_signals = false AND alpha_user_id IS NOT NULL;" 2>/dev/null | tr -d ' ')
TG_SIGNALS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM signals WHERE EXISTS (SELECT 1 FROM telegram_posts tp WHERE tp.message_id = ANY(source_tweets));" 2>/dev/null | tr -d ' ')

echo "Messages from alpha users: $MESSAGES"
echo "Active alpha users: $ALPHA_USERS"
echo "Agent ↔ Telegram links: $AGENT_LINKS"
echo "Pending signal candidates: $PENDING"
echo "Total signals from Telegram: $TG_SIGNALS"
echo ""

if [ "$MESSAGES" = "0" ]; then
  echo "❌ No Telegram messages found with alpha_user_id"
  echo "   → Telegram bot may not be saving messages"
  echo "   → Or messages are coming from channels/groups (not DMs)"
fi

if [ "$ALPHA_USERS" = "0" ]; then
  echo "❌ No alpha users registered"
  echo "   → Add yourself: INSERT INTO telegram_alpha_users (...)"
fi

if [ "$AGENT_LINKS" = "0" ]; then
  echo "❌ No agents subscribed to any Telegram users"
  echo "   → Link agent: INSERT INTO agent_telegram_users (...)"
fi

if [ "$PENDING" != "0" ]; then
  echo "⚠️  $PENDING pending signal candidate(s) waiting to be processed"
  echo "   → Signal Generator Worker should pick these up in next cycle"
  echo "   → Check if signal-generator-worker is running"
fi

if [ "$TG_SIGNALS" != "0" ]; then
  echo "✅ System HAS generated signals from Telegram before ($TG_SIGNALS total)"
  echo "   → System is working, check recent messages"
fi

echo ""
echo "For detailed debugging, see: TELEGRAM_SIGNAL_DEBUG_GUIDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"



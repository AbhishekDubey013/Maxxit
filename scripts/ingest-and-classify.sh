#!/bin/bash
# Ingest tweets and classify them in one command
# Usage: bash scripts/ingest-and-classify.sh

echo "🐦 Step 1: Ingesting tweets from X..."
echo ""

INGEST_RESULT=$(curl -s http://localhost:5000/api/admin/ingest-tweets)
TWEETS_FETCHED=$(echo $INGEST_RESULT | jq -r '.results | map(.fetched) | add')
TWEETS_CREATED=$(echo $INGEST_RESULT | jq -r '.results | map(.created) | add')

echo "✅ Fetched: $TWEETS_FETCHED tweets"
echo "✅ Created: $TWEETS_CREATED new tweets in database"
echo ""

if [ "$TWEETS_CREATED" -gt 0 ]; then
  echo "🤖 Step 2: Classifying new tweets with LLM..."
  echo ""
  
  CLASSIFY_RESULT=$(curl -s -X POST http://localhost:5000/api/admin/classify-all-tweets)
  SIGNALS_FOUND=$(echo $CLASSIFY_RESULT | jq -r '.signalCount')
  NON_SIGNALS=$(echo $CLASSIFY_RESULT | jq -r '.nonSignalCount')
  
  echo "✅ Processed: $(echo $CLASSIFY_RESULT | jq -r '.processed') tweets"
  echo "📊 Trading Signals Found: $SIGNALS_FOUND"
  echo "📊 Non-Signals: $NON_SIGNALS"
  echo ""
  
  if [ "$SIGNALS_FOUND" -gt 0 ]; then
    echo "🎯 Recent Trading Signals:"
    curl -s "http://localhost:5000/api/db/ct_posts?isSignalCandidate=true&_limit=5" \
      | jq -r '.[] | "• " + .tweetText[0:100] + " [" + (.extractedTokens | join(", ")) + "]"'
  fi
else
  echo "ℹ️  No new tweets to classify"
fi

echo ""
echo "✅ Done!"

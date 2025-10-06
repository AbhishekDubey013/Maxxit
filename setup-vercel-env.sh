#!/bin/bash

echo "🔐 Setting up Vercel environment variables..."
echo ""

# Read from .env
source .env

# Add essential variables
echo "$DATABASE_URL" | npx vercel env add DATABASE_URL production
echo "$PERPLEXITY_API_KEY" | npx vercel env add PERPLEXITY_API_KEY production
echo "$GAME_API_KEY" | npx vercel env add GAME_API_KEY production
echo "$EXECUTOR_PRIVATE_KEY" | npx vercel env add EXECUTOR_PRIVATE_KEY production
echo "$MODULE_ADDRESS" | npx vercel env add MODULE_ADDRESS production
echo "$NEXT_PUBLIC_PRIVY_APP_ID" | npx vercel env add NEXT_PUBLIC_PRIVY_APP_ID production

echo ""
echo "✅ Core environment variables added!"
echo "🚀 Now redeploying with updated environment..."

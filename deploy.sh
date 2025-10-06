#!/bin/bash

# 🚀 Quick Deployment Script
# Deploys Maxxit to Vercel in one command

set -e

echo "🚀 Maxxit Production Deployment"
echo "================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm i -g vercel
fi

# Check if logged in
echo "🔐 Checking Vercel login..."
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
fi

echo ""
echo "✅ Vercel CLI ready!"
echo ""

# Deploy
echo "🚀 Deploying to production..."
echo "This will take 2-3 minutes..."
echo ""

vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Visit your production URL (shown above)"
echo "2. Go to Vercel dashboard and add environment variables"
echo "3. Run: npx prisma migrate deploy (to setup database)"
echo "4. Test your site!"
echo ""
echo "📚 Full guide: DEPLOY_NOW.md"


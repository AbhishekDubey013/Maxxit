#!/bin/bash

# Script to safely update .env with new executor wallet
# This creates a backup and updates the private key

echo ""
echo "🔐 Updating .env with New Executor Wallet"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# New wallet details
NEW_ADDRESS="0xd9F6f864f3F93877a3557EF67f2E50D7066aE189"
NEW_PRIVATE_KEY="0x3e3518b681ec492a68ed99ed02583699101e63ca42503866712e5d28da848d82"
OLD_ADDRESS="0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6"

echo "📋 Old Wallet (COMPROMISED): $OLD_ADDRESS"
echo "✅ New Wallet (SECURE): $NEW_ADDRESS"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Create backup
echo "💾 Creating backup of old .env..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backup created: .env.backup.$(date +%Y%m%d_%H%M%S)"
echo ""

# Update the private key
echo "🔄 Updating EXECUTOR_PRIVATE_KEY..."

# Check if EXECUTOR_PRIVATE_KEY exists
if grep -q "EXECUTOR_PRIVATE_KEY=" .env; then
    # Replace existing key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|EXECUTOR_PRIVATE_KEY=.*|EXECUTOR_PRIVATE_KEY=$NEW_PRIVATE_KEY|g" .env
    else
        # Linux
        sed -i "s|EXECUTOR_PRIVATE_KEY=.*|EXECUTOR_PRIVATE_KEY=$NEW_PRIVATE_KEY|g" .env
    fi
    echo "✅ EXECUTOR_PRIVATE_KEY updated"
else
    # Add new key
    echo "" >> .env
    echo "EXECUTOR_PRIVATE_KEY=$NEW_PRIVATE_KEY" >> .env
    echo "✅ EXECUTOR_PRIVATE_KEY added"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ .env Updated Successfully!"
echo ""
echo "⚠️  IMPORTANT SECURITY CHECKS:"
echo ""
echo "1. Verify .env is in .gitignore:"
cat .gitignore | grep "\.env" && echo "   ✅ .env is in .gitignore" || echo "   ❌ .env NOT in .gitignore - FIX THIS!"
echo ""
echo "2. Check if .env is tracked by git:"
git ls-files --error-unmatch .env 2>/dev/null && echo "   ❌ .env IS TRACKED BY GIT - DANGER!" || echo "   ✅ .env is not tracked"
echo ""
echo "3. Next steps:"
echo "   - Fund new wallet: $NEW_ADDRESS"
echo "   - Test with small amount first"
echo "   - Update any database references"
echo "   - Scan computer for malware"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""



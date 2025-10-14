#!/bin/bash

echo "🔄 Force Railway Redeploy..."
echo ""
echo "This will:"
echo "1. Clear any cached builds"
echo "2. Force Railway to rebuild from latest code"
echo "3. Restart all workers with fresh code"
echo ""

git commit --allow-empty -m "chore: force railway redeploy - clear cache

Railway appears to be running old code despite having latest commits.
This empty commit forces a full rebuild and restart.

Latest fixes that MUST be loaded:
- db7943e: Disable fixed stop loss
- 1929c29: Enable trailing stop on all positions
- e7450ff: 1% trailing stop + price oracle fixes

After this deploys, positions should:
✅ Stay open until +3% profit
✅ Exit only via 1% trailing stop
❌ NOT close on -10% drops"

echo ""
echo "Pushing to trigger redeploy..."
git push origin main

echo ""
echo "✅ Done! Check Railway logs in 2-3 minutes."
echo "   Watch for: 'Position Monitor started (PID: ...)'"
echo ""


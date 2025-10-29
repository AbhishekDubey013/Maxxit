#!/bin/bash
echo "🔄 Retrying trade execution..."
echo ""

curl -s -X POST "https://maxxit1.vercel.app/api/admin/execute-trade-once?signalId=f9928c5d-9984-4055-abbc-3ac27386dd26&deploymentId=338c5f51-49fb-4039-aa6c-7e09fffc50f5" | python3 -m json.tool

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Checking position status..."
echo ""

npx tsx scripts/monitor-tweet-to-trade.ts


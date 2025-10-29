#!/bin/bash

echo "🔄 Retrying test trade execution..."
echo ""

curl -X POST "https://maxxit1.vercel.app/api/admin/execute-trade-once?signalId=f9928c5d-9984-4055-abbc-3ac27386dd26&deploymentId=338c5f51-49fb-4039-aa6c-7e09fffc50f5" | python3 -m json.tool

echo ""
echo "📊 Monitoring results..."
echo ""

sleep 2
npx tsx scripts/monitor-tweet-to-trade.ts


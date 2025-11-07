#!/bin/bash

# Quick test script for continuous runner
# This will run for 2 minutes then exit

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║        TESTING CONTINUOUS RUNNER (2 minute test)             ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

echo "Starting continuous runner..."
echo "Press Ctrl+C to stop early, or wait 2 minutes for auto-stop"
echo ""

# Start the continuous runner
node workers/continuous-runner.js &
RUNNER_PID=$!

echo "Continuous Runner PID: $RUNNER_PID"
echo ""
echo "Monitoring for 2 minutes..."
echo ""

# Wait 2 minutes
sleep 120

# Kill the runner
echo ""
echo "Test complete! Stopping continuous runner..."
kill $RUNNER_PID 2>/dev/null
wait $RUNNER_PID 2>/dev/null

echo ""
echo "✅ Test completed successfully!"
echo ""
echo "What you should have seen:"
echo "  • Continuous runner started"
echo "  • All 4 workers ran immediately"
echo "  • Workers re-ran on their schedules:"
echo "    - Tweet Ingestion: every 5 mins (may not trigger in 2 min test)"
echo "    - Signal Generator: every 1 min"
echo "    - Trade Executor: every 30 sec"
echo "    - Position Monitor: every 1 min"
echo ""
echo "If you saw workers running multiple times, the fix is working! ✅"


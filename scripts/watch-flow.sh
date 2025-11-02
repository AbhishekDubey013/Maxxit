#!/bin/bash

# Watch the complete flow in real-time
# Shows logs from all relevant workers

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Watching Complete Flow Execution                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "This will show logs from:"
echo "  • Trade Executor"
echo "  • Signal Generator"
echo "  • Position Monitor"
echo ""
echo "Press Ctrl+C to stop"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use multitail if available, otherwise use tail
if command -v multitail &> /dev/null; then
    multitail -s 3 \
        -l "tail -f logs/trade-executor.log" \
        -l "tail -f logs/signal-generator.log" \
        -l "tail -f logs/position-monitor.log"
else
    # Fallback to regular tail with colors
    tail -f logs/trade-executor.log logs/signal-generator.log logs/position-monitor.log | while read line; do
        if [[ $line == *"trade-executor"* ]]; then
            echo -e "\033[0;32m$line\033[0m"  # Green
        elif [[ $line == *"signal-generator"* ]]; then
            echo -e "\033[0;34m$line\033[0m"  # Blue
        elif [[ $line == *"position-monitor"* ]]; then
            echo -e "\033[0;33m$line\033[0m"  # Yellow
        else
            echo "$line"
        fi
    done
fi


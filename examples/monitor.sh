#!/bin/bash
# monitor.sh - Simple OpenAdapter health monitoring script
#
# Usage:
#   ./examples/monitor.sh                    # One-time check
#   watch -n 30 ./examples/monitor.sh        # Monitor every 30 seconds
#
# With API key authentication:
#   ADMIN_API_KEY=your-key ./examples/monitor.sh

set -e

API_KEY="${ADMIN_API_KEY:-}"
BASE_URL="${OPENADAPTER_URL:-http://127.0.0.1:3000}"

# Build curl command with optional auth header
if [ -n "$API_KEY" ]; then
  AUTH_HEADER="Authorization: Bearer $API_KEY"
else
  AUTH_HEADER=""
fi

echo "=== OpenAdapter Health Monitor ==="
echo "URL: $BASE_URL"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Fetch health data
if [ -n "$AUTH_HEADER" ]; then
  HEALTH=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/admin/health")
else
  HEALTH=$(curl -s "$BASE_URL/admin/health")
fi

# Parse and display key metrics
echo "Status:       $(echo "$HEALTH" | jq -r '.status')"
echo "Uptime:       $(echo "$HEALTH" | jq -r '.uptime.human')"
echo "Browser:      $(echo "$HEALTH" | jq -r 'if .browser.alive then "✓ Online" else "✗ Offline" end')"
echo ""

echo "=== Request Statistics ==="
TOTAL=$(echo "$HEALTH" | jq -r '.stats.totalRequests')
SUCCESS=$(echo "$HEALTH" | jq -r '.stats.successfulRequests')
FAILED=$(echo "$HEALTH" | jq -r '.stats.failedRequests')
RATE_LIMITS=$(echo "$HEALTH" | jq -r '.stats.rateLimitHits')

if [ "$TOTAL" -gt 0 ]; then
  SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($SUCCESS/$TOTAL)*100}")
else
  SUCCESS_RATE="N/A"
fi

echo "Total Requests:    $TOTAL"
echo "Successful:        $SUCCESS"
echo "Failed:            $FAILED"
echo "Rate Limited:      $RATE_LIMITS"
echo "Success Rate:      ${SUCCESS_RATE}%"
echo ""

# Check browser health and offer recovery if needed
BROWSER_ALIVE=$(echo "$HEALTH" | jq -r '.browser.alive')
if [ "$BROWSER_ALIVE" != "true" ]; then
  echo "⚠️  WARNING: Browser is not responding!"
  echo ""

  read -p "Attempt session recovery? (y/n): " -n 1 -r
  echo ""

  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Triggering recovery..."

    if [ -n "$AUTH_HEADER" ]; then
      RECOVERY=$(curl -s -X POST -H "$AUTH_HEADER" "$BASE_URL/admin/session/recover")
    else
      RECOVERY=$(curl -s -X POST "$BASE_URL/admin/session/recover")
    fi

    SUCCESS_FLAG=$(echo "$RECOVERY" | jq -r '.success')
    MESSAGE=$(echo "$RECOVERY" | jq -r '.message // .error')

    if [ "$SUCCESS_FLAG" = "true" ]; then
      echo "✓ Recovery successful: $MESSAGE"
    else
      echo "✗ Recovery failed: $MESSAGE"
      echo ""
      echo "Try restarting the browser session:"
      echo "  curl -X POST $BASE_URL/admin/session/restart"
    fi
  fi
fi

echo ""
echo "Last request: $(echo "$HEALTH" | jq -r '.stats.lastRequestTime // "Never"')"

# Remote Management API

OpenAdapter includes a comprehensive remote management API for monitoring and controlling the server without needing direct access to the terminal.

## Security

### API Key Authentication (Optional)

To enable authentication, set the `ADMIN_API_KEY` environment variable:

```bash
export ADMIN_API_KEY="your-secret-key-here"
node server.js
```

All management endpoints will then require the API key in the Authorization header:

```bash
curl -H "Authorization: Bearer your-secret-key-here" \
  http://127.0.0.1:3000/admin/health
```

**Important:** If `ADMIN_API_KEY` is not set, all management endpoints are accessible without authentication (suitable for local development only).

## Endpoints

### Health & Status

#### `GET /admin/health`

Returns comprehensive health information about the server.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T10:30:00.000Z",
  "uptime": {
    "ms": 3600000,
    "human": "1h 0m"
  },
  "browser": {
    "alive": true,
    "contextExists": true,
    "pageExists": true,
    "lastUsed": "2026-03-02T10:25:00.000Z",
    "sessionAge": 300000
  },
  "stats": {
    "totalRequests": 42,
    "successfulRequests": 38,
    "failedRequests": 2,
    "rateLimitHits": 2,
    "sessionRestarts": 1,
    "lastRequestTime": "2026-03-02T10:29:00.000Z"
  }
}
```

**Example:**
```bash
curl http://127.0.0.1:3000/admin/health
```

---

#### `GET /admin/status`

Returns simple status check (suitable for monitoring tools like uptime checkers).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-02T10:30:00.000Z",
  "browser": "online"
}
```

Status values:
- `healthy` - Browser is responsive
- `degraded` - Browser is not responding

**Example:**
```bash
curl http://127.0.0.1:3000/admin/status
```

---

### Session Management

#### `POST /admin/session/restart`

Force a complete browser session restart. Closes the current browser context and resets all session state. The browser will be re-initialized on the next request.

**Use when:** The browser is stuck, unresponsive, or you want a completely fresh session.

**Response:**
```json
{
  "success": true,
  "message": "Browser session cleared. New session will start on next request.",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://127.0.0.1:3000/admin/session/restart
```

---

#### `POST /admin/session/recover`

Trigger the multi-tier session recovery process (L1-L4). This attempts to recover an unresponsive session through progressive recovery levels:
- L1: Page reload
- L2: Navigate to new chat
- L3: Full browser restart
- L4: Fatal (returns 503)

**Use when:** You want to attempt recovery without forcing a full restart.

**Response (success):**
```json
{
  "success": true,
  "message": "Session recovery succeeded",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "Session recovery failed at all levels",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://127.0.0.1:3000/admin/session/recover
```

---

#### `POST /admin/session/new-chat`

Navigate to a new Claude conversation (preserves browser session).

**Use when:** You want to start fresh context without restarting the entire browser.

**Response:**
```json
{
  "success": true,
  "message": "Navigated to new chat",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://127.0.0.1:3000/admin/session/new-chat
```

---

### Log Management

#### `GET /admin/logs`

Retrieve recent log entries.

**Query Parameters:**
- `lines` (optional, default: 100) - Number of recent log lines to return

**Response:**
```json
{
  "totalLines": 1542,
  "returned": 100,
  "logs": [
    "[server] Processing prompt (234 chars) with 0 attachments",
    "[server] Success (1024 chars)",
    "..."
  ]
}
```

**Examples:**
```bash
# Get last 100 lines (default)
curl http://127.0.0.1:3000/admin/logs

# Get last 500 lines
curl http://127.0.0.1:3000/admin/logs?lines=500
```

---

#### `DELETE /admin/logs`

Clear the log file.

**Response:**
```json
{
  "success": true,
  "message": "Logs cleared",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

**Example:**
```bash
curl -X DELETE http://127.0.0.1:3000/admin/logs
```

---

### Configuration

#### `GET /admin/config`

Get current server configuration values.

**Response:**
```json
{
  "port": 3000,
  "timeouts": {
    "maxTimeout": 180000,
    "stableInterval": 30000,
    "sessionTimeout": 3600000,
    "pollInterval": 500
  },
  "limits": {
    "largePromptThreshold": 15000,
    "maxPayloadSize": "100mb"
  },
  "paths": {
    "tempDir": "/path/to/temp_uploads",
    "browserProfile": "/path/to/.browser-profile",
    "logFile": "/path/to/logs.txt"
  }
}
```

**Example:**
```bash
curl http://127.0.0.1:3000/admin/config
```

---

## Use Cases

### Automated Monitoring

Set up a cron job or monitoring service to check server health:

```bash
#!/bin/bash
# health-check.sh

STATUS=$(curl -s http://127.0.0.1:3000/admin/status | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  echo "Server unhealthy! Attempting recovery..."
  curl -X POST http://127.0.0.1:3000/admin/session/recover
fi
```

### Remote Log Viewing

Tail logs remotely without SSH access:

```bash
# View last 50 lines
curl http://127.0.0.1:3000/admin/logs?lines=50 | jq -r '.logs[]'
```

### Periodic Session Refresh

Automatically restart the browser session every 6 hours to prevent memory leaks:

```bash
# In crontab: restart every 6 hours
0 */6 * * * curl -X POST http://127.0.0.1:3000/admin/session/restart
```

### Dashboard Integration

Use these endpoints to build a web dashboard:

```javascript
// Fetch health data for dashboard
async function updateDashboard() {
  const health = await fetch('http://127.0.0.1:3000/admin/health').then(r => r.json());

  document.getElementById('uptime').textContent = health.uptime.human;
  document.getElementById('total-requests').textContent = health.stats.totalRequests;
  document.getElementById('success-rate').textContent =
    `${(health.stats.successfulRequests / health.stats.totalRequests * 100).toFixed(1)}%`;
}
```

---

## Security Best Practices

1. **Always use API key authentication in production:**
   ```bash
   export ADMIN_API_KEY="$(openssl rand -hex 32)"
   ```

2. **Restrict network access** - Only expose the management API to trusted networks. Use firewall rules or reverse proxy authentication.

3. **Use HTTPS** - If exposing beyond localhost, put the server behind a reverse proxy (nginx, Caddy) with TLS.

4. **Rotate API keys regularly** - Change `ADMIN_API_KEY` periodically and update monitoring scripts.

5. **Rate limiting** - Consider adding rate limiting to management endpoints using middleware like `express-rate-limit`.

---

## Troubleshooting

### "Unauthorized - invalid or missing API key"

The `ADMIN_API_KEY` environment variable is set but your request doesn't include the correct key. Include it in the Authorization header:

```bash
curl -H "Authorization: Bearer your-key-here" \
  http://127.0.0.1:3000/admin/health
```

### Browser shows as offline but server is running

Try triggering recovery:

```bash
curl -X POST http://127.0.0.1:3000/admin/session/recover
```

If recovery fails, force a restart:

```bash
curl -X POST http://127.0.0.1:3000/admin/session/restart
```

### Stats show high failed request count

Check logs to identify the issue:

```bash
curl http://127.0.0.1:3000/admin/logs?lines=200 | jq -r '.logs[]' | grep -i error
```

---

## Example: Simple Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Simple OpenAdapter monitoring script

API_KEY="${ADMIN_API_KEY:-}"
BASE_URL="http://127.0.0.1:3000"

# Set headers with API key if configured
if [ -n "$API_KEY" ]; then
  HEADERS="-H \"Authorization: Bearer $API_KEY\""
else
  HEADERS=""
fi

echo "=== OpenAdapter Status ==="
curl -s $HEADERS "$BASE_URL/admin/health" | jq '{
  status: .status,
  uptime: .uptime.human,
  browser: .browser.alive,
  total_requests: .stats.totalRequests,
  success_rate: ((.stats.successfulRequests / .stats.totalRequests) * 100 | floor)
}'

# Check if browser is unhealthy and attempt recovery
BROWSER_ALIVE=$(curl -s $HEADERS "$BASE_URL/admin/status" | jq -r '.status')
if [ "$BROWSER_ALIVE" != "healthy" ]; then
  echo "⚠️  Browser unhealthy, attempting recovery..."
  curl -s -X POST $HEADERS "$BASE_URL/admin/session/recover" | jq .
fi
```

Usage:
```bash
chmod +x monitor.sh
./monitor.sh
```

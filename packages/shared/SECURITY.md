# Security Considerations for OpenAdapter Tools

## Overview

This document outlines security considerations when exposing OpenAdapter's management API as AI tools, particularly when using the Vercel AI SDK.

## Tool Security Levels

All tools are categorized into three security levels:

### SAFE (Read-Only, No Side Effects)

These tools can run autonomously without user confirmation:

- `getServerHealth` - Reads health status
- `getServerStatus` - Simple status check
- `newChat` - Navigates to new conversation (preserves browser)
- `getLogs` - Reads log entries
- `getConfig` - Reads configuration
- `sendChatCompletion` - Sends prompts (main API function)

**Risk Level**: Low
**Recommendation**: Allow autonomous execution

### CONFIRM (Modifies State)

These tools require user confirmation before execution:

- `restartSession` - Closes browser and clears state
- `recoverSession` - May restart browser during recovery
- `clearLogs` - Permanently deletes logs

**Risk Level**: Medium
**Recommendation**: Implement confirmation prompts in UI

### RESTRICTED (Dangerous Operations)

Currently no tools are in this category, but this level is reserved for:

- Server shutdown
- Configuration changes
- Security settings modification

**Risk Level**: High
**Recommendation**: Require admin privileges and multiple confirmations

## Authentication

### API Key Security

```typescript
// ❌ NEVER hardcode API keys
const config = {
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: 'your-secret-key', // BAD!
};

// ✅ Use environment variables
const config = {
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
};
```

### Key Management Best Practices

1. **Use environment variables** for all API keys
2. **Rotate keys regularly** (recommended: every 90 days)
3. **Use different keys per environment** (dev/staging/prod)
4. **Never commit keys to version control**
5. **Use secret management services** (AWS Secrets Manager, HashiCorp Vault)

## Network Security

### Localhost vs Remote Access

```typescript
// ✅ Local development (safe)
const config = {
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
};

// ⚠️ Remote access (requires TLS)
const config = {
  baseUrl: 'https://openadapter.example.com', // MUST use HTTPS
  apiKey: process.env.ADMIN_API_KEY,
};
```

### TLS/HTTPS Requirements

When exposing OpenAdapter beyond localhost:

1. **Always use HTTPS** - Never send API keys over HTTP
2. **Use reverse proxy** (nginx, Caddy) for TLS termination
3. **Validate certificates** - Don't disable SSL verification
4. **Use modern TLS versions** (TLS 1.2 minimum, 1.3 recommended)

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name openadapter.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Input Validation

All tools use Zod for runtime validation:

```typescript
// Parameters are automatically validated
const result = await handlers.getLogs({
  lines: 999999, // Will be validated against max: 10000
});

// Invalid parameters return typed errors
if (!result.success) {
  console.error(result.code); // ErrorCode.VALIDATION_ERROR
}
```

### Custom Validation

Add additional validation layers for sensitive operations:

```typescript
async function safeRestartSession(reason: string) {
  // 1. Check if restart is actually needed
  const health = await handlers.getServerHealth({});
  if (isSuccess(health) && health.data.browser.alive) {
    return { success: false, error: 'Browser is healthy, restart not needed' };
  }

  // 2. Get user confirmation
  const confirmed = await getUserConfirmation(
    'Browser will restart and all state will be lost. Continue?'
  );
  if (!confirmed) {
    return { success: false, error: 'User cancelled' };
  }

  // 3. Log the action
  console.log(`[SECURITY] User requested restart: ${reason}`);

  // 4. Execute
  return handlers.restartSession({ reason });
}
```

## Rate Limiting

### Client-Side Rate Limiting

```typescript
import { withRetry } from '@openadapter/shared/tools';

// Limit to 1 request per second
class RateLimiter {
  private lastCall = 0;
  private minInterval = 1000; // ms

  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastCall;
    if (elapsed < this.minInterval) {
      await new Promise(r => setTimeout(r, this.minInterval - elapsed));
    }
    this.lastCall = Date.now();
  }
}

const limiter = new RateLimiter();

async function rateLimitedHealthCheck() {
  await limiter.throttle();
  return handlers.getServerHealth({});
}
```

### Server-Side Rate Limiting

OpenAdapter already implements rate limiting (one request at a time). Additional protection:

```javascript
// In OpenAdapter server.js
const rateLimit = require('express-rate-limit');

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP',
});

app.use('/admin', adminLimiter);
```

## AI Agent Security

### Autonomous Tool Execution

When allowing AI to execute tools autonomously:

```typescript
// Define which tools can run without confirmation
const AUTONOMOUS_TOOLS = [
  'getServerHealth',
  'getServerStatus',
  'getLogs',
  'getConfig',
];

async function executeToolSafely(toolName: string, params: any) {
  // Check if tool requires confirmation
  if (!AUTONOMOUS_TOOLS.includes(toolName)) {
    const confirmed = await getUserConfirmation(
      getConfirmationPrompt(toolName)
    );
    if (!confirmed) {
      return { success: false, error: 'User denied permission' };
    }
  }

  // Execute with logging
  console.log(`[AI-TOOL] Executing ${toolName}`, params);
  const result = await handlers[toolName](params);
  console.log(`[AI-TOOL] Result:`, result);

  return result;
}
```

### Prompt Injection Prevention

When passing user input to AI that controls tools:

```typescript
// ❌ Vulnerable to prompt injection
const result = await generateText({
  model: openai('gpt-4'),
  prompt: userInput, // User could inject "restart the server"
  tools: allTools,
});

// ✅ Better: Sanitize and structure input
const result = await generateText({
  model: openai('gpt-4'),
  prompt: `You are a read-only monitoring assistant.

  IMPORTANT: You can only use health check and log viewing tools.
  You CANNOT restart, recover, or modify the server in any way.

  User query: ${sanitizeInput(userInput)}`,
  tools: onlyReadOnlyTools,
});
```

## Audit Logging

### Tool Execution Logging

```typescript
async function auditedToolExecution<T>(
  toolName: string,
  params: any,
  executor: () => Promise<T>
): Promise<T> {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    params,
    userId: getCurrentUserId(),
    ipAddress: getClientIP(),
  };

  try {
    const result = await executor();

    // Log success
    writeAuditLog({
      ...auditEntry,
      status: 'success',
      result: typeof result === 'object' ? '[object]' : result,
    });

    return result;
  } catch (error) {
    // Log failure
    writeAuditLog({
      ...auditEntry,
      status: 'error',
      error: error instanceof Error ? error.message : 'unknown',
    });

    throw error;
  }
}
```

### Audit Log Format

```json
{
  "timestamp": "2026-03-02T10:30:00.000Z",
  "tool": "restartSession",
  "params": { "reason": "Browser unresponsive" },
  "userId": "user123",
  "ipAddress": "192.168.1.100",
  "status": "success",
  "result": "[object]"
}
```

## Error Handling Security

### Information Disclosure

```typescript
// ❌ Exposes internal details
if (!result.success) {
  throw new Error(`Database connection failed: ${dbConnection.host}:${dbConnection.port}`);
}

// ✅ Generic error message, log details internally
if (!result.success) {
  console.error('[INTERNAL]', result.error); // Server-side only
  throw new Error('An error occurred while processing your request');
}
```

### Error Sanitization

```typescript
function sanitizeError(error: ToolResult<any>): string {
  if (!error.success) {
    // Remove sensitive information
    return error.error
      .replace(/\/Users\/[^/]+\//, '/Users/***/')
      .replace(/apiKey=\w+/, 'apiKey=***')
      .replace(/Bearer\s+\S+/, 'Bearer ***');
  }
  return 'Unknown error';
}
```

## Dashboard Security

When building a web dashboard that uses these tools:

### 1. Authentication

```typescript
// Require login before accessing tools
app.use('/api/tools', requireAuth);

// Role-based access control
app.post('/api/tools/restart', requireRole('admin'), async (req, res) => {
  const result = await handlers.restartSession(req.body);
  res.json(result);
});
```

### 2. CSRF Protection

```typescript
// Use CSRF tokens for state-changing operations
app.use(csrfProtection);

app.post('/api/tools/restart', (req, res) => {
  // CSRF token validated by middleware
  // ...
});
```

### 3. Content Security Policy

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               connect-src 'self' https://api.openadapter.example.com;">
```

## Multi-Tenant Security

If running multiple OpenAdapter instances:

```typescript
// Isolate configurations per tenant
const tenantConfigs = new Map<string, ConnectionConfig>();

function getHandlersForTenant(tenantId: string) {
  const config = tenantConfigs.get(tenantId);
  if (!config) {
    throw new Error('Unauthorized tenant');
  }
  return createToolHandlers(config);
}

// Ensure users can only access their tenant
app.use((req, res, next) => {
  const tenantId = req.user.tenantId;
  const requestedTenant = req.params.tenantId;

  if (tenantId !== requestedTenant) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});
```

## Checklist

### Before Production Deployment

- [ ] All API keys stored in environment variables
- [ ] HTTPS enabled for remote access
- [ ] API key authentication enabled (`ADMIN_API_KEY` set)
- [ ] Confirmation prompts implemented for CONFIRM-level tools
- [ ] Audit logging enabled for all tool executions
- [ ] Rate limiting configured (client and server-side)
- [ ] Error messages sanitized (no information disclosure)
- [ ] Network access restricted to trusted IPs/networks
- [ ] TLS certificates valid and up-to-date
- [ ] Monitoring and alerting configured
- [ ] Incident response plan documented

### Regular Maintenance

- [ ] Rotate API keys every 90 days
- [ ] Review audit logs weekly
- [ ] Update dependencies monthly (npm audit)
- [ ] Test disaster recovery procedures quarterly
- [ ] Security audit annually

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** open a public issue
2. Email security@example.com with details
3. Include steps to reproduce
4. Allow 90 days for response before public disclosure

## Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Vercel AI SDK Security](https://sdk.vercel.ai/docs/security)
- [Zod Input Validation](https://zod.dev/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

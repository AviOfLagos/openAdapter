# Quick Start Guide - OpenAdapter Tools

Get up and running with OpenAdapter tool schemas in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- OpenAdapter server running (see main README)
- Basic TypeScript/JavaScript knowledge

## Installation

```bash
npm install @openadapter/shared ai zod @ai-sdk/openai
```

## Setup (3 steps)

### Step 1: Configure Connection

Create `config.ts`:

```typescript
import { ConnectionConfig } from '@openadapter/shared/tools';

export const config: ConnectionConfig = {
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY, // Optional for local dev
  timeout: 30000,
};
```

### Step 2: Create Handlers

```typescript
import { createToolHandlers } from '@openadapter/shared/tools';
import { config } from './config';

export const handlers = createToolHandlers(config);
```

### Step 3: Use Tools

```typescript
import { handlers, isSuccess } from '@openadapter/shared/tools';

// Check server health
const result = await handlers.getServerHealth({});

if (isSuccess(result)) {
  console.log('✓ Server is healthy!');
  console.log('Uptime:', result.data.uptime.human);
  console.log('Browser:', result.data.browser.alive ? 'online' : 'offline');
} else {
  console.error('✗ Health check failed:', result.error);
}
```

## Complete Example

```typescript
// main.ts
import { createToolHandlers, isSuccess } from '@openadapter/shared/tools';

const handlers = createToolHandlers({
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
  timeout: 30000,
});

async function main() {
  // 1. Check health
  const health = await handlers.getServerHealth({});

  if (isSuccess(health)) {
    console.log('Server Status:', health.data.status);
    console.log('Uptime:', health.data.uptime.human);
    console.log('Total Requests:', health.data.stats.totalRequests);
  }

  // 2. Get recent logs
  const logs = await handlers.getLogs({ lines: 10 });

  if (isSuccess(logs)) {
    console.log('\nRecent Logs:');
    logs.data.logs.forEach(line => console.log(line));
  }

  // 3. Check configuration
  const config = await handlers.getConfig({});

  if (isSuccess(config)) {
    console.log('\nServer Config:');
    console.log('Port:', config.data.port);
    console.log('Max Timeout:', config.data.timeouts.maxTimeout);
  }
}

main().catch(console.error);
```

Run it:

```bash
node --loader ts-node/esm main.ts
# or with tsx:
npx tsx main.ts
```

## AI Integration (Vercel AI SDK)

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  createToolHandlers,
  getVercelAITools,
  isSuccess
} from '@openadapter/shared/tools';

// Setup
const handlers = createToolHandlers({
  baseUrl: 'http://127.0.0.1:3000',
  timeout: 30000,
});

const toolSchemas = getVercelAITools();

// Create AI-compatible tools
const aiTools = {
  getServerHealth: {
    description: toolSchemas.getServerHealth.description,
    parameters: toolSchemas.getServerHealth.parameters,
    execute: async (params) => {
      const result = await handlers.getServerHealth(params);
      if (isSuccess(result)) return result.data;
      throw new Error(result.error);
    },
  },
};

// Use with AI
const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Check the OpenAdapter server health and report status',
  tools: aiTools,
});

console.log(result.text);
```

## Common Tasks

### Check if Server is Healthy

```typescript
const status = await handlers.getServerStatus({});

if (isSuccess(status) && status.data.status === 'healthy') {
  console.log('✓ All systems operational');
} else {
  console.log('✗ Server needs attention');
}
```

### View Error Logs

```typescript
const logs = await handlers.getLogs({
  lines: 100,
  filter: 'error|warning', // Regex filter
});

if (isSuccess(logs)) {
  console.log(`Found ${logs.data.returned} error/warning entries:`);
  logs.data.logs.forEach(log => console.error(log));
}
```

### Recover from Issues

```typescript
// Check status
const status = await handlers.getServerStatus({});

// If degraded, attempt recovery
if (isSuccess(status) && status.data.status === 'degraded') {
  console.log('Browser offline, attempting recovery...');

  const recovery = await handlers.recoverSession({});

  if (isSuccess(recovery)) {
    console.log('✓ Recovery successful');
  } else {
    console.log('✗ Recovery failed, consider restart');
  }
}
```

### Handle Confirmation-Required Tools

```typescript
import { requiresConfirmation, getConfirmationPrompt } from '@openadapter/shared/tools';

async function safeRestart() {
  const toolName = 'restartSession';

  // Check if confirmation needed
  if (requiresConfirmation(toolName)) {
    const prompt = getConfirmationPrompt(toolName);
    console.log(prompt);

    // In real app, show UI dialog
    const confirmed = confirm(prompt); // Browser
    // or: readline.question() // Node.js

    if (!confirmed) {
      console.log('Cancelled by user');
      return;
    }
  }

  // Execute
  const result = await handlers.restartSession({
    reason: 'User requested restart',
  });

  if (isSuccess(result)) {
    console.log('✓ Server restarted');
  }
}
```

## Error Handling

### Basic Error Handling

```typescript
const result = await handlers.getServerHealth({});

if (!result.success) {
  console.error('Error:', result.error);
  console.error('Code:', result.code); // 'timeout', 'unauthorized', etc.
}
```

### Comprehensive Error Handling

```typescript
import { ErrorCode, isError } from '@openadapter/shared/tools';

const result = await handlers.getServerHealth({});

if (isError(result)) {
  switch (result.code) {
    case ErrorCode.UNAUTHORIZED:
      console.error('Authentication failed - check API key');
      break;
    case ErrorCode.TIMEOUT:
      console.error('Request timed out - server may be overloaded');
      break;
    case ErrorCode.BROWSER_OFFLINE:
      console.error('Browser is offline - attempting recovery...');
      await handlers.recoverSession({});
      break;
    default:
      console.error('Error:', result.error);
  }
}
```

### With Retry

```typescript
import { withRetry } from '@openadapter/shared/tools';

// Wrap handler with retry logic
const robustHealth = withRetry(
  handlers.getServerHealth,
  3,    // max retries
  1000  // initial delay (ms)
);

const result = await robustHealth({});
// Automatically retries on failure with exponential backoff
```

## TypeScript Tips

### Type-Safe Results

```typescript
import type { GetServerHealthResponse } from '@openadapter/shared/tools';

const result = await handlers.getServerHealth({});

if (result.success) {
  // result.data is typed as GetServerHealthResponse
  const uptime: string = result.data.uptime.human;
  const alive: boolean = result.data.browser.alive;
  // TypeScript autocomplete works here!
}
```

### Custom Wrapper with Types

```typescript
import type { ToolHandlers, ToolResult } from '@openadapter/shared/tools';

function createLogger(handlers: ToolHandlers) {
  return {
    async loggedHealthCheck(): Promise<ToolResult<GetServerHealthResponse>> {
      console.log('[START] Health check');
      const result = await handlers.getServerHealth({});
      console.log('[END] Health check:', result.success);
      return result;
    },
  };
}
```

## Environment Variables

### Development

```bash
# .env
ADMIN_API_KEY=optional-for-local-dev
OPENADAPTER_URL=http://127.0.0.1:3000
```

### Production

```bash
# .env.production
ADMIN_API_KEY=your-secure-api-key-here
OPENADAPTER_URL=https://openadapter.example.com
```

Load them:

```typescript
import { config } from 'dotenv';
config();

const handlers = createToolHandlers({
  baseUrl: process.env.OPENADAPTER_URL || 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
  timeout: 30000,
});
```

## Next Steps

### Learn More

- **Full Documentation**: [README.md](./README.md)
- **Security Guide**: [SECURITY.md](./SECURITY.md)
- **Usage Patterns**: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **Code Examples**: [examples.ts](./src/tools/examples.ts)
- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)

### Build Something

Try building:
- Health monitoring dashboard
- Automated recovery system
- AI agent that manages the server
- Multi-server management tool
- Slack/Discord bot for alerts

### Get Help

- Check [USAGE_GUIDE.md](./USAGE_GUIDE.md) for troubleshooting
- Review [examples.ts](./src/tools/examples.ts) for more patterns
- Open an issue on GitHub

## Troubleshooting

### "Cannot connect to server"

Check that OpenAdapter is running:

```bash
curl http://127.0.0.1:3000/admin/health
```

### "Unauthorized"

Set the API key:

```typescript
const handlers = createToolHandlers({
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: 'your-api-key', // Must match ADMIN_API_KEY in server
  timeout: 30000,
});
```

### "Module not found"

Install dependencies:

```bash
npm install @openadapter/shared ai zod
```

### TypeScript errors

Ensure you have TypeScript 5.3+:

```bash
npm install -D typescript@latest
```

## Complete Working Example

```typescript
// server-monitor.ts
import { createToolHandlers, isSuccess, ErrorCode } from '@openadapter/shared/tools';

const handlers = createToolHandlers({
  baseUrl: process.env.OPENADAPTER_URL || 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
  timeout: 30000,
});

async function monitorServer() {
  console.log('🔍 Checking server status...\n');

  // 1. Get health status
  const health = await handlers.getServerHealth({});

  if (!health.success) {
    console.error('❌ Health check failed:', health.error);
    return;
  }

  console.log('✅ Server Status:', health.data.status);
  console.log('⏱️  Uptime:', health.data.uptime.human);
  console.log('🌐 Browser:', health.data.browser.alive ? 'Online' : 'Offline');
  console.log('📊 Total Requests:', health.data.stats.totalRequests);
  console.log('✓  Success Rate:',
    `${((health.data.stats.successfulRequests / health.data.stats.totalRequests) * 100).toFixed(1)}%`
  );

  // 2. Check if browser is offline
  if (!health.data.browser.alive) {
    console.log('\n⚠️  Browser is offline, checking logs...');

    const logs = await handlers.getLogs({ lines: 20, filter: 'error' });

    if (isSuccess(logs)) {
      console.log('\n📋 Recent Errors:');
      logs.data.logs.slice(-5).forEach(log => console.log('  ', log));
    }

    console.log('\n🔧 Attempting recovery...');
    const recovery = await handlers.recoverSession({});

    if (isSuccess(recovery)) {
      console.log('✅ Recovery successful!');
    } else {
      console.log('❌ Recovery failed, manual intervention needed');
    }
  }
}

// Run monitor
monitorServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

Run it:

```bash
npx tsx server-monitor.ts
```

Expected output:

```
🔍 Checking server status...

✅ Server Status: ok
⏱️  Uptime: 2h 15m
🌐 Browser: Online
📊 Total Requests: 156
✓  Success Rate: 95.5%
```

---

**You're ready to go!** Start with this quick start, then dive deeper into the [full documentation](./README.md).

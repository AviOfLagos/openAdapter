# @openadapter/shared

Type-safe tool schemas and handlers for OpenAdapter's management API, designed for seamless integration with the Vercel AI SDK.

## Overview

This package provides:

- **Zod schemas** for all OpenAdapter management endpoints
- **TypeScript types** with full type safety
- **Tool handlers** with built-in error handling and validation
- **Vercel AI SDK integration** helpers
- **Security levels** (SAFE, CONFIRM, RESTRICTED) for tool execution
- **Comprehensive examples** and documentation

## Installation

```bash
npm install @openadapter/shared ai zod
```

## Quick Start

```typescript
import { createToolHandlers, getVercelAITools } from '@openadapter/shared/tools';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Configure connection to OpenAdapter
const config = {
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
  timeout: 30000,
};

// Create handlers
const handlers = createToolHandlers(config);

// Get Vercel AI SDK-compatible tools
const tools = getVercelAITools();

// Use with AI SDK
const result = await generateText({
  model: openai('gpt-4'),
  prompt: 'Check the OpenAdapter server health',
  tools: {
    getServerHealth: {
      description: tools.getServerHealth.description,
      parameters: tools.getServerHealth.parameters,
      execute: async (params) => {
        const result = await handlers.getServerHealth(params);
        if (result.success) return result.data;
        throw new Error(result.error);
      },
    },
  },
});
```

## Available Tools

### Health & Status

- **`getServerHealth`** (SAFE) - Comprehensive health check with uptime, browser status, and stats
- **`getServerStatus`** (SAFE) - Simple status check (healthy/degraded)

### Session Management

- **`restartSession`** (CONFIRM) - Force complete browser restart
- **`recoverSession`** (CONFIRM) - Trigger multi-tier recovery process
- **`newChat`** (SAFE) - Navigate to new conversation

### Log Management

- **`getLogs`** (SAFE) - Retrieve recent log entries with optional filtering
- **`clearLogs`** (CONFIRM) - Clear all logs (with optional backup)

### Configuration

- **`getConfig`** (SAFE) - Get current server configuration

### Chat Completion

- **`sendChatCompletion`** (SAFE) - Send prompts to Claude via OpenAdapter

## Security Levels

Tools are categorized by security level:

```typescript
import { ToolSecurityLevel, SAFE_TOOLS, CONFIRM_TOOLS } from '@openadapter/shared/tools';

// SAFE: Read-only, no side effects
console.log(SAFE_TOOLS); // ['getServerHealth', 'getServerStatus', 'newChat', 'getLogs', 'getConfig', 'sendChatCompletion']

// CONFIRM: Requires user confirmation
console.log(CONFIRM_TOOLS); // ['restartSession', 'recoverSession', 'clearLogs']

// RESTRICTED: Requires elevated permissions (none currently)
```

### Implementing Confirmation Flow

```typescript
import { requiresConfirmation, getConfirmationPrompt } from '@openadapter/shared/tools';

const toolName = 'restartSession';

if (requiresConfirmation(toolName)) {
  const prompt = getConfirmationPrompt(toolName);
  // "This will close the browser and clear all session state. Continue?"

  const confirmed = await askUser(prompt);
  if (!confirmed) {
    return; // Cancel operation
  }
}

// Execute tool
const result = await handlers.restartSession({});
```

## Type Safety

All handlers return a discriminated union for type-safe error handling:

```typescript
import { isSuccess, isError } from '@openadapter/shared/tools';

const result = await handlers.getServerHealth({});

if (isSuccess(result)) {
  // TypeScript knows result.data is GetServerHealthResponse
  console.log(result.data.uptime.human);
  console.log(result.data.browser.alive);
} else {
  // TypeScript knows result.error exists
  console.error(result.error);
  console.error(result.code); // ErrorCode enum
}
```

## Error Handling

Built-in error codes for common scenarios:

```typescript
import { ErrorCode } from '@openadapter/shared/tools';

enum ErrorCode {
  UNAUTHORIZED = 'unauthorized',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  RATE_LIMIT = 'rate_limit_exceeded',
  BROWSER_OFFLINE = 'browser_offline',
  SESSION_ERROR = 'session_error',
  TIMEOUT = 'timeout',
  VALIDATION_ERROR = 'validation_error',
}
```

### Middleware Utilities

```typescript
import { withRetry, withLogging, withErrorBoundary } from '@openadapter/shared/tools';

// Add retry logic with exponential backoff
const healthWithRetry = withRetry(
  handlers.getServerHealth,
  3, // max retries
  1000 // initial delay
);

// Add logging
const healthWithLogging = withLogging(
  handlers.getServerHealth,
  'getServerHealth'
);

// Add error boundary
const healthWithErrors = withErrorBoundary(handlers.getServerHealth);
```

## Advanced Usage

### Multi-Server Management

```typescript
const servers = [
  { name: 'prod', baseUrl: 'http://prod:3000', apiKey: PROD_KEY },
  { name: 'staging', baseUrl: 'http://staging:3000', apiKey: STAGING_KEY },
];

const results = await Promise.all(
  servers.map(async ({ name, ...config }) => {
    const handlers = createToolHandlers(config);
    const health = await handlers.getServerHealth({});
    return { server: name, ...health };
  })
);
```

### Custom Tool Wrapper

```typescript
function createRateLimitedTools(handlers: ToolHandlers) {
  const lastCall = new Map<string, number>();

  return new Proxy(handlers, {
    get(target, prop: string) {
      const original = target[prop];

      return async (...args: any[]) => {
        // Rate limiting logic
        const now = Date.now();
        const last = lastCall.get(prop) || 0;
        if (now - last < 1000) {
          await new Promise(r => setTimeout(r, 1000 - (now - last)));
        }
        lastCall.set(prop, Date.now());

        return original.apply(target, args);
      };
    },
  });
}
```

### Log Filtering

```typescript
// Get logs with client-side regex filtering
const result = await handlers.getLogs({
  lines: 500,
  filter: '\\[error\\]|\\[warning\\]', // Regex pattern
});

if (isSuccess(result)) {
  console.log(`Found ${result.data.returned} filtered entries`);
  result.data.logs.forEach(log => console.log(log));
}
```

## API Reference

### ConnectionConfig

```typescript
interface ConnectionConfig {
  baseUrl: string;     // OpenAdapter server URL
  apiKey?: string;     // Optional API key for authentication
  timeout: number;     // Request timeout in milliseconds
}
```

### ToolResult

```typescript
type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: ErrorCode };
```

### Handler Functions

Each handler is a function that takes typed parameters and returns a `ToolResult`:

```typescript
type HandlerFunction<P, R> = (params: P) => Promise<ToolResult<R>>;
```

## Examples

See `examples.ts` for comprehensive examples including:

1. Basic health checking
2. Vercel AI SDK integration
3. Confirmation flows
4. Streaming with tools
5. Error handling and recovery
6. Complete management agent
7. Custom tool wrappers
8. Multi-server management

## Development

```bash
# Build the package
npm run build

# Watch mode for development
npm run dev

# Type checking
npm run type-check

# Clean build artifacts
npm run clean
```

## TypeScript Configuration

The package uses strict TypeScript settings for maximum type safety:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`

## License

ISC

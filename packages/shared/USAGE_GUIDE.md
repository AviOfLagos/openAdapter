# OpenAdapter Tools - Developer Usage Guide

Complete guide for integrating OpenAdapter management API tools with AI applications using the Vercel AI SDK.

## Table of Contents

1. [Installation](#installation)
2. [Basic Setup](#basic-setup)
3. [Tool Execution Patterns](#tool-execution-patterns)
4. [AI Integration](#ai-integration)
5. [Error Handling](#error-handling)
6. [Security](#security)
7. [Advanced Patterns](#advanced-patterns)
8. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

- Node.js 18+ or compatible runtime (Bun, Deno)
- OpenAdapter server running
- Vercel AI SDK (for AI integration)

### Install Dependencies

```bash
npm install @openadapter/shared ai zod
```

For specific AI providers:

```bash
# OpenAI
npm install @ai-sdk/openai

# Anthropic
npm install @ai-sdk/anthropic

# Google
npm install @ai-sdk/google
```

## Basic Setup

### 1. Configure Connection

Create a configuration file:

```typescript
// config/openadapter.ts
import { ConnectionConfig } from '@openadapter/shared/tools';

export const openAdapterConfig: ConnectionConfig = {
  baseUrl: process.env.OPENADAPTER_URL || 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
  timeout: 30000, // 30 seconds
};
```

### 2. Create Tool Handlers

```typescript
// lib/tools.ts
import { createToolHandlers } from '@openadapter/shared/tools';
import { openAdapterConfig } from '../config/openadapter';

export const handlers = createToolHandlers(openAdapterConfig);
```

### 3. Basic Health Check

```typescript
import { handlers } from './lib/tools';
import { isSuccess } from '@openadapter/shared/tools';

async function checkHealth() {
  const result = await handlers.getServerHealth({});

  if (isSuccess(result)) {
    console.log('Server is healthy!');
    console.log('Uptime:', result.data.uptime.human);
    console.log('Browser alive:', result.data.browser.alive);
  } else {
    console.error('Health check failed:', result.error);
  }
}
```

## Tool Execution Patterns

### Pattern 1: Direct Tool Execution

Simple, synchronous execution:

```typescript
import { handlers, isSuccess } from '@openadapter/shared/tools';

// Get server status
const status = await handlers.getServerStatus({});
if (isSuccess(status)) {
  console.log(status.data.status); // 'healthy' | 'degraded'
}

// Get logs
const logs = await handlers.getLogs({ lines: 50 });
if (isSuccess(logs)) {
  logs.data.logs.forEach(line => console.log(line));
}

// Get configuration
const config = await handlers.getConfig({});
if (isSuccess(config)) {
  console.log('Timeouts:', config.data.timeouts);
}
```

### Pattern 2: Error-First Execution

Handle errors explicitly:

```typescript
async function safeLogs(lines: number = 100) {
  const result = await handlers.getLogs({ lines });

  if (!result.success) {
    // Handle specific error codes
    switch (result.code) {
      case 'unauthorized':
        console.error('Authentication failed - check API key');
        break;
      case 'timeout':
        console.error('Request timed out - server may be overloaded');
        break;
      default:
        console.error('Error:', result.error);
    }
    return [];
  }

  return result.data.logs;
}
```

### Pattern 3: Confirmation Flow

For tools that require user confirmation:

```typescript
import { requiresConfirmation, getConfirmationPrompt } from '@openadapter/shared/tools';

async function executeTool(toolName: string, params: any) {
  // Check if confirmation needed
  if (requiresConfirmation(toolName)) {
    const prompt = getConfirmationPrompt(toolName);

    // Show confirmation dialog (implementation depends on UI framework)
    const confirmed = await showConfirmDialog(prompt);

    if (!confirmed) {
      return { success: false, error: 'User cancelled' };
    }
  }

  // Execute tool
  return await handlers[toolName](params);
}

// Usage
await executeTool('restartSession', { reason: 'Browser frozen' });
```

### Pattern 4: Retry with Backoff

Handle transient failures:

```typescript
import { withRetry } from '@openadapter/shared/tools';

// Wrap handler with retry logic
const healthWithRetry = withRetry(
  handlers.getServerHealth,
  3,    // max retries
  1000  // initial delay (ms)
);

// Use it
const result = await healthWithRetry({});
```

## AI Integration

### Vercel AI SDK Integration

#### Setup AI Tools

```typescript
// lib/ai-tools.ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { handlers, getVercelAITools, isSuccess } from '@openadapter/shared/tools';

// Get tool definitions
const toolSchemas = getVercelAITools();

// Create AI-compatible tools
export const aiTools = {
  getServerHealth: {
    description: toolSchemas.getServerHealth.description,
    parameters: toolSchemas.getServerHealth.parameters,
    execute: async (params) => {
      const result = await handlers.getServerHealth(params);
      if (isSuccess(result)) return result.data;
      throw new Error(result.error);
    },
  },

  getLogs: {
    description: toolSchemas.getLogs.description,
    parameters: toolSchemas.getLogs.parameters,
    execute: async (params) => {
      const result = await handlers.getLogs(params);
      if (isSuccess(result)) return result.data;
      throw new Error(result.error);
    },
  },

  // Add more tools as needed...
};
```

#### Use with AI

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { aiTools } from './lib/ai-tools';

async function aiHealthCheck() {
  const result = await generateText({
    model: openai('gpt-4'),
    prompt: 'Check the OpenAdapter server health and report any issues.',
    tools: aiTools,
  });

  console.log(result.text);
  console.log('Tools used:', result.toolCalls?.map(tc => tc.toolName));
}
```

#### Streaming Responses

```typescript
import { streamText } from 'ai';

async function aiMonitoring() {
  const result = await streamText({
    model: openai('gpt-4'),
    prompt: 'Monitor the server and report status every 10 seconds for 1 minute.',
    tools: aiTools,
  });

  // Stream text chunks
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
}
```

### AI Agent with Autonomous Tools

Create an AI agent that can manage OpenAdapter:

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  handlers,
  SAFE_TOOLS,
  requiresConfirmation,
  getConfirmationPrompt,
} from '@openadapter/shared/tools';

async function createManagementAgent(userMessage: string) {
  // Only provide safe tools to AI (no confirmation needed)
  const safeAiTools = Object.fromEntries(
    SAFE_TOOLS.map(toolName => [
      toolName,
      {
        description: ALL_TOOLS[toolName].description,
        parameters: ALL_TOOLS[toolName].parameters,
        execute: async (params: any) => {
          const result = await handlers[toolName](params);
          if (result.success) return result.data;
          throw new Error(result.error);
        },
      },
    ])
  );

  const result = await generateText({
    model: openai('gpt-4'),
    system: `You are an AI assistant managing an OpenAdapter server.

    You can check health, view logs, and get configuration.
    You CANNOT restart the server or modify settings.

    Be concise and focus on actionable insights.`,
    prompt: userMessage,
    tools: safeAiTools,
    maxToolRoundtrips: 5,
  });

  return result.text;
}

// Usage
const report = await createManagementAgent(
  'Check if the server is healthy and examine recent errors'
);
console.log(report);
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { ErrorCode, isError } from '@openadapter/shared/tools';

async function robustHealthCheck() {
  try {
    const result = await handlers.getServerHealth({});

    if (isError(result)) {
      // Handle specific error codes
      switch (result.code) {
        case ErrorCode.UNAUTHORIZED:
          console.error('Authentication failed');
          // Prompt for API key
          break;

        case ErrorCode.TIMEOUT:
          console.error('Request timed out');
          // Retry or alert user
          break;

        case ErrorCode.BROWSER_OFFLINE:
          console.error('Browser is offline');
          // Attempt recovery
          await handlers.recoverSession({});
          break;

        case ErrorCode.SERVER_ERROR:
          console.error('Server error:', result.error);
          // Log to error tracking service
          break;

        default:
          console.error('Unknown error:', result.error);
      }

      return null;
    }

    return result.data;

  } catch (error) {
    // Unexpected errors (network issues, etc.)
    console.error('Unexpected error:', error);
    return null;
  }
}
```

### Automatic Recovery

```typescript
async function selfHealingHealthCheck() {
  let result = await handlers.getServerStatus({});

  // If browser is offline, attempt recovery
  if (isSuccess(result) && result.data.status === 'degraded') {
    console.log('Browser offline, attempting recovery...');

    const recovery = await handlers.recoverSession({});

    if (isSuccess(recovery)) {
      console.log('Recovery successful, retrying health check...');
      result = await handlers.getServerStatus({});
    } else {
      console.log('Recovery failed, forcing restart...');
      await handlers.restartSession({ reason: 'Auto-recovery' });
    }
  }

  return result;
}
```

## Security

### API Key Management

```typescript
// ✅ Good: Use environment variables
const config = {
  baseUrl: process.env.OPENADAPTER_URL,
  apiKey: process.env.ADMIN_API_KEY,
};

// ❌ Bad: Hardcoded credentials
const config = {
  baseUrl: 'http://localhost:3000',
  apiKey: 'secret-key-123', // NEVER DO THIS
};
```

### Secure Tool Execution

```typescript
class SecureToolExecutor {
  constructor(
    private handlers: ToolHandlers,
    private logger: Logger
  ) {}

  async execute(toolName: string, params: any, userId: string) {
    // Log execution
    this.logger.info(`User ${userId} executing ${toolName}`, { params });

    // Check permissions
    if (!this.hasPermission(userId, toolName)) {
      throw new Error('Insufficient permissions');
    }

    // Require confirmation for dangerous operations
    if (requiresConfirmation(toolName)) {
      const confirmed = await this.getConfirmation(userId, toolName);
      if (!confirmed) {
        this.logger.warn(`User ${userId} cancelled ${toolName}`);
        throw new Error('User cancelled operation');
      }
    }

    // Execute
    const result = await this.handlers[toolName](params);

    // Log result
    this.logger.info(`Tool ${toolName} completed`, {
      success: result.success,
      userId,
    });

    return result;
  }
}
```

## Advanced Patterns

### Multi-Server Management

```typescript
class MultiServerManager {
  private servers: Map<string, ToolHandlers>;

  constructor(configs: Record<string, ConnectionConfig>) {
    this.servers = new Map(
      Object.entries(configs).map(([name, config]) => [
        name,
        createToolHandlers(config),
      ])
    );
  }

  async checkAllServers() {
    const results = await Promise.all(
      Array.from(this.servers.entries()).map(async ([name, handlers]) => {
        const health = await handlers.getServerHealth({});
        return { server: name, ...health };
      })
    );

    return results;
  }

  async getServer(name: string) {
    return this.servers.get(name);
  }
}

// Usage
const manager = new MultiServerManager({
  production: { baseUrl: 'https://prod.example.com', apiKey: PROD_KEY },
  staging: { baseUrl: 'https://staging.example.com', apiKey: STAGING_KEY },
  development: { baseUrl: 'http://localhost:3000', apiKey: DEV_KEY },
});

const allHealth = await manager.checkAllServers();
```

### Tool Monitoring

```typescript
class MonitoredToolExecutor {
  private metrics = new Map<string, {
    calls: number;
    successes: number;
    failures: number;
    totalDuration: number;
  }>();

  constructor(private handlers: ToolHandlers) {}

  async execute<T>(
    toolName: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();

    try {
      const result = await executor();

      this.recordSuccess(toolName, Date.now() - start);
      return result;

    } catch (error) {
      this.recordFailure(toolName, Date.now() - start);
      throw error;
    }
  }

  private recordSuccess(toolName: string, duration: number) {
    const metrics = this.getMetrics(toolName);
    metrics.calls++;
    metrics.successes++;
    metrics.totalDuration += duration;
  }

  private recordFailure(toolName: string, duration: number) {
    const metrics = this.getMetrics(toolName);
    metrics.calls++;
    metrics.failures++;
    metrics.totalDuration += duration;
  }

  getMetrics(toolName: string) {
    if (!this.metrics.has(toolName)) {
      this.metrics.set(toolName, {
        calls: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
      });
    }
    return this.metrics.get(toolName)!;
  }

  getStats() {
    return Object.fromEntries(
      Array.from(this.metrics.entries()).map(([name, metrics]) => [
        name,
        {
          ...metrics,
          successRate: (metrics.successes / metrics.calls) * 100,
          avgDuration: metrics.totalDuration / metrics.calls,
        },
      ])
    );
  }
}
```

## Troubleshooting

### Common Issues

#### Issue: "Unauthorized - invalid or missing API key"

```typescript
// Check if API key is set
if (!process.env.ADMIN_API_KEY) {
  console.error('ADMIN_API_KEY environment variable not set');
  process.exit(1);
}

// Verify API key works
const testResult = await handlers.getServerStatus({});
if (isError(testResult) && testResult.code === ErrorCode.UNAUTHORIZED) {
  console.error('API key is invalid');
}
```

#### Issue: "Request timeout"

```typescript
// Increase timeout
const config: ConnectionConfig = {
  baseUrl: 'http://127.0.0.1:3000',
  apiKey: process.env.ADMIN_API_KEY,
  timeout: 60000, // Increase to 60 seconds
};
```

#### Issue: "Browser offline"

```typescript
// Automatic recovery
const status = await handlers.getServerStatus({});

if (isSuccess(status) && status.data.status === 'degraded') {
  console.log('Attempting recovery...');
  const recovery = await handlers.recoverSession({});

  if (isError(recovery)) {
    console.log('Recovery failed, restarting...');
    await handlers.restartSession({ reason: 'Browser offline' });
  }
}
```

### Debug Mode

```typescript
import { withLogging } from '@openadapter/shared/tools';

// Wrap all handlers with logging
const debugHandlers = Object.fromEntries(
  Object.entries(handlers).map(([name, handler]) => [
    name,
    withLogging(handler, name),
  ])
);

// Use debug handlers
const result = await debugHandlers.getServerHealth({});
// Logs: [getServerHealth] Called with params: {}
// Logs: [getServerHealth] Completed in 123ms: { success: true }
```

## Next Steps

- Read [SECURITY.md](./SECURITY.md) for security best practices
- See [examples.ts](./src/tools/examples.ts) for complete code examples
- Review [schemas.ts](./src/tools/schemas.ts) for full API reference
- Check [README.md](./README.md) for package documentation

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review test files for usage examples

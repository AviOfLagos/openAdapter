# Vercel AI SDK Tool Calling - Comprehensive Research Findings

**Research Date:** 2026-03-02
**AI SDK Version:** 6.0+
**Focus Area:** Tool Calling for OpenAdapter Integration
**Status:** Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tool Calling Architecture](#tool-calling-architecture)
3. [Tool Definition Patterns](#tool-definition-patterns)
4. [React Hooks for UI Integration](#react-hooks-for-ui-integration)
5. [Multi-Step Agent Patterns](#multi-step-agent-patterns)
6. [Streaming Responses](#streaming-responses)
7. [Server-Side Implementation](#server-side-implementation)
8. [Error Handling & Retry Patterns](#error-handling--retry-patterns)
9. [Security & Production Best Practices](#security--production-best-practices)
10. [Common Pitfalls & Gotchas](#common-pitfalls--gotchas)
11. [OpenAdapter Integration Recommendations](#openadapter-integration-recommendations)

---

## Executive Summary

The Vercel AI SDK v6 provides a robust, type-safe framework for building AI applications with advanced tool calling capabilities. Key findings:

- **Unified API** for text generation, structured objects, and tool calls
- **Automatic orchestration** of multi-step agent loops (up to 20 steps by default)
- **Human-in-the-loop** control via `needsApproval` flag
- **TypeScript-native** with full type safety from client to server
- **Streaming-first** architecture with SSE protocol
- **OpenAI-compatible** but provider-agnostic

**For OpenAdapter:** The SDK can seamlessly integrate by creating a custom provider that points to our `http://127.0.0.1:3000/v1/chat/completions` endpoint, enabling AI-controlled server management through tool calling.

---

## Tool Calling Architecture

### Overview

Tool calling in the AI SDK follows an agent loop pattern:

1. User sends a prompt to the LLM
2. LLM decides to either generate text or call a tool (returns tool name and arguments)
3. If a tool is called, the SDK executes the tool and receives the result
4. The SDK appends the tool call and result to the conversation history
5. The SDK automatically triggers a new generation based on the updated history
6. Steps 2-5 repeat until either reaching max steps or receiving a text response

### Core Components

#### Tool Definition Structure

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'A clear description that helps the LLM understand when to use this tool',
  inputSchema: z.object({
    param1: z.string().describe('Description for the LLM'),
    param2: z.number().optional().describe('Optional parameter'),
  }),
  execute: async ({ param1, param2 }) => {
    // Execute the tool logic
    return result;
  },
});
```

**Key Elements:**
- **`description`** (optional): Influences when the tool is picked by the LLM
- **`inputSchema`**: Zod schema or JSON schema for input validation
- **`execute`** (optional): Async function that performs the actual work

### Native Strict Mode

When available from the LLM provider, strict mode guarantees that tool call inputs match your schema exactly. This is a provider-level feature that ensures type safety.

### Input Examples

Tool input examples help when JSON schema alone doesn't fully specify intended usage:

```typescript
const weatherTool = tool({
  description: 'Get weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  inputExamples: [
    { location: 'San Francisco' },
    { location: 'New York' },
  ],
  execute: async ({ location }) => {
    // fetch weather
  },
});
```

Currently, input examples are natively supported only by Anthropic. For other providers, use `addToolInputExamplesMiddleware` to append examples to the tool description.

---

## Tool Definition Patterns

### Basic Tool with Zod Schema

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const getServerHealth = tool({
  description: 'Check the health status of the OpenAdapter server',
  inputSchema: z.object({}), // No parameters needed
  execute: async () => {
    const response = await fetch('http://127.0.0.1:3000/health');
    return await response.json();
  },
});
```

### Tool with Parameters

```typescript
const restartBrowserSession = tool({
  description: 'Restart the browser session when issues are detected',
  inputSchema: z.object({
    reason: z.string().describe('Reason for restart'),
    force: z.boolean().optional().describe('Force restart even if healthy'),
  }),
  execute: async ({ reason, force }) => {
    console.log(`Restarting session: ${reason}`);
    const response = await fetch('http://127.0.0.1:3000/management/restart', {
      method: 'POST',
      body: JSON.stringify({ force }),
    });
    return await response.json();
  },
});
```

### Human-in-the-Loop Approval

```typescript
const deleteAllLogs = tool({
  description: 'Delete all server logs (destructive action)',
  inputSchema: z.object({
    confirm: z.boolean(),
  }),
  needsApproval: true, // Simple boolean for always-require-approval
  execute: async ({ confirm }) => {
    if (!confirm) return { error: 'Action cancelled' };
    // Delete logs
    return { success: true };
  },
});
```

### Conditional Approval

```typescript
const sendPrompt = tool({
  description: 'Send a prompt to Claude via OpenAdapter',
  inputSchema: z.object({
    prompt: z.string(),
    priority: z.enum(['low', 'high']),
  }),
  needsApproval: async ({ priority }) => {
    // Only high-priority prompts need approval
    return priority === 'high';
  },
  execute: async ({ prompt }) => {
    const response = await fetch('http://127.0.0.1:3000/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    return await response.json();
  },
});
```

### Tool with Context Access

```typescript
const viewLogs = tool({
  description: 'Retrieve recent server logs',
  inputSchema: z.object({
    lines: z.number().default(50).describe('Number of lines to retrieve'),
  }),
  execute: async ({ lines }, { toolCallId, messages, abortSignal }) => {
    // `execute` receives helpful context:
    // - toolCallId: unique ID for this tool call
    // - messages: full conversation history
    // - abortSignal: for canceling long operations

    if (abortSignal.aborted) {
      throw new Error('Operation cancelled');
    }

    const response = await fetch(`http://127.0.0.1:3000/logs?lines=${lines}`);
    return await response.json();
  },
});
```

### JSON Schema Alternative

```typescript
import { jsonSchema } from 'ai';

const tool = {
  description: 'Get weather',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      city: { type: 'string' },
      unit: { type: 'string', enum: ['C', 'F'] },
    },
    required: ['city'],
  }),
  execute: async ({ city, unit }) => {
    // ...
  },
};
```

---

## React Hooks for UI Integration

### useChat() - Full Chat Interface

The `useChat()` hook is the primary way to build chat interfaces with tool calling support.

#### Basic Setup

```typescript
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5, // Max tool call roundtrips
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Send</button>
        {isLoading && <button onClick={stop}>Stop</button>}
      </form>
    </div>
  );
}
```

#### Client-Side Tools

```typescript
const { messages, addToolResult } = useChat({
  api: '/api/chat',
  maxSteps: 5,
  onToolCall: async ({ toolCall }) => {
    // Handle client-side tool execution
    if (toolCall.toolName === 'showMap') {
      return {
        toolCallId: toolCall.toolCallId,
        result: { mapUrl: 'https://example.com/map' },
      };
    }
  },
});
```

**Important:** Always check `if (toolCall.dynamic)` in your `onToolCall` handler. Call `addToolResult()` to provide results (without `await` to avoid deadlocks).

#### Rendering Tool Invocations

```typescript
{messages.map(m => (
  <div key={m.id}>
    <strong>{m.role}:</strong>

    {m.parts.map((part, i) => {
      if (part.type === 'text') {
        return <p key={i}>{part.text}</p>;
      }

      if (part.type === 'tool-call') {
        return (
          <div key={i}>
            Calling {part.toolName} with {JSON.stringify(part.args)}
          </div>
        );
      }

      if (part.type === 'tool-result') {
        return (
          <div key={i}>
            Result: {JSON.stringify(part.result)}
          </div>
        );
      }
    })}
  </div>
))}
```

#### Tool Approval UI

```typescript
const { messages, addToolApprovalResponse } = useChat({ api: '/api/chat' });

{messages.map(m => (
  m.parts.map(part => {
    if (part.type === 'tool-approval-request') {
      return (
        <div>
          <p>Approve {part.toolName}?</p>
          <button onClick={() => addToolApprovalResponse(part.toolCallId, true)}>
            Approve
          </button>
          <button onClick={() => addToolApprovalResponse(part.toolCallId, false)}>
            Deny
          </button>
        </div>
      );
    }
  })
))}
```

#### File Attachments

```typescript
const { handleSubmit } = useChat({
  api: '/api/chat',
  experimental_attachments: true,
});

<form onSubmit={e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const files = formData.get('files');
  handleSubmit(e, { experimental_attachments: files });
}}>
  <input type="file" name="files" multiple />
  <button type="submit">Send</button>
</form>
```

### useCompletion() - Single-Turn Generation

For simpler, non-conversational use cases:

```typescript
import { useCompletion } from '@ai-sdk/react';

export default function Completion() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
  } = useCompletion({
    api: '/api/completion',
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit">Complete</button>
      </form>
      {isLoading && <button onClick={stop}>Stop</button>}
      <p>{completion}</p>
    </div>
  );
}
```

**Key Difference:** `useCompletion` is for single-turn text generation, while `useChat` maintains conversation state.

### useObject() - Structured Output Streaming

For streaming structured JSON objects:

```typescript
import { useObject } from '@ai-sdk/react';
import { z } from 'zod';

export default function StructuredData() {
  const { object, isLoading } = useObject({
    api: '/api/structured',
    schema: z.object({
      name: z.string(),
      age: z.number(),
      hobbies: z.array(z.string()),
    }),
  });

  return (
    <div>
      {isLoading ? 'Loading...' : null}
      {object && (
        <div>
          <p>Name: {object.name}</p>
          <p>Age: {object.age}</p>
          <ul>
            {object.hobbies?.map(h => <li key={h}>{h}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Multi-Step Agent Patterns

### Automatic Orchestration

The AI SDK automatically handles multi-step execution:

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: openai('gpt-4'),
  prompt: 'Check server health and restart if needed',
  tools: {
    getServerHealth,
    restartBrowserSession,
  },
  maxSteps: 5, // Default: 20
});
```

**Flow:**
1. LLM receives prompt
2. LLM calls `getServerHealth` tool
3. SDK executes tool, appends result to conversation
4. LLM sees result, decides to call `restartBrowserSession`
5. SDK executes tool, appends result
6. LLM generates final text response

### Loop Control with stopWhen

```typescript
import { stepCountIs } from 'ai';

const result = await streamText({
  model: openai('gpt-4'),
  prompt: 'Process tasks',
  tools: { /* ... */ },
  stopWhen: stepCountIs(10), // Stop after 10 steps
});
```

### Dynamic Settings with prepareStep

Modify settings between steps:

```typescript
const result = await streamText({
  model: openai('gpt-4'),
  prompt: 'Complex task',
  tools: { tool1, tool2, tool3 },
  prepareStep: async ({ messages, tools, stepIndex }) => {
    // Compress context after many messages
    if (messages.length >= 150) {
      const summary = await generateSummary(messages.slice(0, -20));
      return {
        messages: [
          { role: 'system', content: summary },
          ...messages.slice(-20),
        ],
      };
    }

    // Switch models based on complexity
    if (stepIndex > 5) {
      return { model: openai('gpt-4-turbo') };
    }

    // Disable certain tools after specific steps
    if (stepIndex > 3) {
      return { tools: { tool1, tool2 } }; // Remove tool3
    }

    // Default: no changes
    return {};
  },
});
```

### ToolLoopAgent Pattern

AI SDK 6 uses an Agent interface. The default `ToolLoopAgent` implementation:

```typescript
class ToolLoopAgent {
  async run(prompt) {
    for (let step = 0; step < maxSteps; step++) {
      const response = await this.llm.generate(prompt);

      if (response.type === 'text') {
        return response;
      }

      if (response.type === 'toolCall') {
        const result = await this.executeTool(response.toolName, response.args);
        prompt = this.appendToHistory(response, result);
      }
    }
  }
}
```

You can implement custom agents by implementing the `Agent` interface.

---

## Streaming Responses

### Server-Side Streaming

#### toUIMessageStreamResponse()

Use for chat applications with tool calls:

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      // ... tool definitions
    },
  });

  return result.toUIMessageStreamResponse();
}
```

**Returns:** Server-Sent Events stream with tool calls, results, and text.

#### toTextStreamResponse()

Use for simple text streaming without tool support:

```typescript
export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    prompt,
  });

  return result.toTextStreamResponse();
}
```

### Stream Protocol

The AI SDK uses Server-Sent Events (SSE) format with:
- **Keep-alive** pings
- **Reconnect** capabilities
- **Better cache handling**

Example SSE stream:

```
data: {"type":"text","content":"Hello"}

data: {"type":"tool-call","toolName":"getWeather","args":{"city":"SF"}}

data: {"type":"tool-result","result":{"temp":65}}

data: {"type":"text","content":"The weather is 65°F"}

data: [DONE]
```

### Client-Side Cancellation

```typescript
const { stop } = useChat({ api: '/api/chat' });

<button onClick={stop}>Stop Generation</button>
```

### Server-Side Abort Signal

```typescript
export async function POST(req: Request) {
  const result = streamText({
    model: openai('gpt-4'),
    prompt: 'Generate text',
    abortSignal: req.signal, // Forward request cancellation
  });

  return result.toUIMessageStreamResponse();
}
```

**Important:** Stream abort functionality is **not compatible** with stream resumption. Choose either abort or resume, but not both.

---

## Server-Side Implementation

### Next.js App Router Example

```typescript
// app/api/chat/route.ts
import { streamText, convertToModelMessages, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages: convertToModelMessages(messages),
    tools: {
      getServerHealth: tool({
        description: 'Check OpenAdapter server health',
        inputSchema: z.object({}),
        execute: async () => {
          const response = await fetch('http://127.0.0.1:3000/health');
          return await response.json();
        },
      }),

      restartSession: tool({
        description: 'Restart browser session',
        inputSchema: z.object({
          reason: z.string(),
        }),
        needsApproval: true,
        execute: async ({ reason }) => {
          const response = await fetch('http://127.0.0.1:3000/management/restart', {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          return await response.json();
        },
      }),

      viewLogs: tool({
        description: 'Get recent server logs',
        inputSchema: z.object({
          lines: z.number().default(50),
        }),
        execute: async ({ lines }) => {
          const response = await fetch(`http://127.0.0.1:3000/logs?lines=${lines}`);
          return await response.json();
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

### Custom OpenAI-Compatible Provider

For integrating OpenAdapter as a custom provider:

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openAdapter = createOpenAI({
  baseURL: 'http://127.0.0.1:3000/v1',
  apiKey: 'not-needed', // OpenAdapter doesn't require auth
});

const result = await streamText({
  model: openAdapter('claude'), // Model name doesn't matter for OpenAdapter
  prompt: 'Hello',
});
```

### Message Conversion

```typescript
import { convertToModelMessages } from 'ai';
import type { UIMessage } from 'ai';

// Convert UI messages to model-compatible format
const modelMessages = convertToModelMessages(uiMessages);
```

### Custom Data Parts

```typescript
const modelMessages = convertToModelMessages(uiMessages, {
  convertDataPart: (part) => {
    if (part.type === 'custom-data') {
      return {
        type: 'text',
        text: `Context: ${part.data}`,
      };
    }
  },
});
```

---

## Error Handling & Retry Patterns

### Granular Error Types

The AI SDK provides specific error types for tool calling:

```typescript
import {
  NoSuchToolError,
  InvalidToolArgumentsError,
  ToolExecutionError,
  ToolCallRepairError,
  AI_RetryError,
} from 'ai';

try {
  const result = await streamText({
    model: openai('gpt-4'),
    prompt: 'Test',
    tools: { myTool },
  });
} catch (error) {
  if (error instanceof NoSuchToolError) {
    console.error('Model tried to call undefined tool:', error.toolName);
  } else if (error instanceof InvalidToolArgumentsError) {
    console.error('Tool arguments invalid:', error.args);
  } else if (error instanceof ToolExecutionError) {
    console.error('Tool execution failed:', error.message);
  } else if (error instanceof ToolCallRepairError) {
    console.error('Tool repair failed:', error.message);
  } else if (AI_RetryError.isInstance(error)) {
    console.error('Retry failed:', error.lastError, error.errors);
  }
}
```

### Automatic Retry

By default, the AI SDK retries each call **2 times**. It will retry even for non-recoverable errors.

### Custom Retry Logic

```typescript
const result = await streamText({
  model: openai('gpt-4'),
  prompt: 'Test',
  maxRetries: 3,
  retryDelay: 1000, // ms
});
```

### Tool-Level Error Handling

```typescript
const tool = tool({
  description: 'Risky operation',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    try {
      const result = await riskyOperation(id);
      return { success: true, result };
    } catch (error) {
      // Return error as a valid result for the LLM to process
      return {
        success: false,
        error: error.message,
      };
    }
  },
});
```

### Client-Side Error Handling

```typescript
const { error } = useChat({
  api: '/api/chat',
  onError: (error) => {
    console.error('Chat error:', error);
    // Show user-friendly error message
  },
});

{error && <div>Error: {error.message}</div>}
```

---

## Security & Production Best Practices

### Environment Variables

**NEVER hardcode API keys.** Use environment variables:

```typescript
// .env.local
OPENAI_API_KEY=sk-...
OPENADAPTER_URL=http://127.0.0.1:3000
```

```typescript
// app/api/chat/route.ts
const openAdapter = createOpenAI({
  baseURL: process.env.OPENADAPTER_URL,
  apiKey: process.env.OPENADAPTER_API_KEY || 'not-needed',
});
```

### Authentication

For production deployments:
- Use **OIDC (OpenID Connect)** for team projects (most secure)
- Implement proper authentication middleware for API routes
- Validate requests on the server side

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  // Verify authentication
  const session = await getServerSession(req);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ... rest of handler
}
```

### Agentic Security

Use `eslint-plugin-vercel-ai-security` to catch security issues. It covers 9/10 OWASP Agentic categories.

```bash
npm install --save-dev eslint-plugin-vercel-ai-security
```

```json
// .eslintrc.json
{
  "plugins": ["vercel-ai-security"],
  "extends": ["plugin:vercel-ai-security/recommended"]
}
```

### Tool Security

#### 1. Approval Gates for Destructive Actions

```typescript
const deleteTool = tool({
  description: 'Delete data (destructive)',
  inputSchema: z.object({ id: z.string() }),
  needsApproval: true, // Always require approval
  execute: async ({ id }) => {
    // ...
  },
});
```

#### 2. Input Validation

```typescript
const tool = tool({
  description: 'Update record',
  inputSchema: z.object({
    id: z.string().uuid(), // Strict validation
    data: z.object({
      name: z.string().max(100),
      age: z.number().min(0).max(150),
    }),
  }),
  execute: async ({ id, data }) => {
    // Additional validation
    if (!await isAuthorized(id)) {
      throw new Error('Unauthorized');
    }
    // ...
  },
});
```

#### 3. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api/chat', limiter);
```

#### 4. Sandboxing Generated Code

If your tools execute AI-generated code, use **Vercel Sandbox** to run untrusted code in isolated environments.

### Production Deployment Considerations

#### Vercel Serverless Functions

- Default timeout: **10 seconds** on Hobby tier
- For long-running operations, upgrade or use streaming
- Use Vercel Firewall for DDoS protection

#### Environment Setup

```typescript
// Vercel production settings
{
  "env": {
    "OPENADAPTER_URL": "https://openadapter.example.com",
    "NODE_ENV": "production"
  },
  "functions": {
    "api/chat/route.ts": {
      "maxDuration": 60 // seconds
    }
  }
}
```

#### Monitoring & Logging

```typescript
export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const result = await streamText({
      model: openAdapter('claude'),
      prompt: 'Test',
      tools: { /* ... */ },
    });

    console.log(`Request completed in ${Date.now() - startTime}ms`);
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    // Send to error tracking (e.g., Sentry)
    throw error;
  }
}
```

---

## Common Pitfalls & Gotchas

### 1. Not Using the `tool()` Helper

**WRONG:**
```typescript
const tools = {
  getWeather: {
    description: 'Get weather',
    parameters: z.object({ city: z.string() }), // Wrong key
    execute: async () => {},
  },
};
```

**CORRECT:**
```typescript
import { tool } from 'ai';

const tools = {
  getWeather: tool({
    description: 'Get weather',
    inputSchema: z.object({ city: z.string() }), // Correct key
    execute: async () => {},
  }),
};
```

### 2. Awaiting `addToolResult()` in `onToolCall`

**WRONG:**
```typescript
onToolCall: async ({ toolCall }) => {
  await addToolResult({ /* ... */ }); // DEADLOCK!
}
```

**CORRECT:**
```typescript
onToolCall: async ({ toolCall }) => {
  addToolResult({ /* ... */ }); // No await
}
```

Or return the result directly:
```typescript
onToolCall: async ({ toolCall }) => {
  return { toolCallId: toolCall.toolCallId, result: data };
}
```

### 3. Combining Stream Abort with Resume

**INCOMPATIBLE:**
```typescript
const { stop } = useChat({
  api: '/api/chat',
  resume: true, // Resume conflicts with abort
});

<button onClick={stop}>Stop</button> // Won't work properly
```

**SOLUTION:** Choose either abort or resume, not both.

### 4. Ignoring `needsApproval` Flow

When `needsApproval: true`, the SDK doesn't pause execution. It completes and returns `tool-approval-request` parts. You must:

1. Check for approval requests in the UI
2. Call `addToolApprovalResponse()` with user's decision
3. The SDK will make a second call to execute or deny the tool

### 5. Not Handling Tool Execution Errors

```typescript
// BAD: Errors crash the agent
execute: async ({ id }) => {
  const data = await fetchData(id); // Might throw
  return data;
}

// GOOD: Return error as a result
execute: async ({ id }) => {
  try {
    const data = await fetchData(id);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 6. Infinite Agent Loops

**PROBLEM:** Setting `maxSteps: Infinity` can cause infinite loops.

**SOLUTION:** Always set a reasonable `maxSteps` limit (default is 20):

```typescript
const result = await streamText({
  model: openai('gpt-4'),
  prompt: 'Task',
  tools: { /* ... */ },
  maxSteps: 10, // Reasonable limit
});
```

### 7. Context Window Overflow

Long conversations can exceed the model's context window. Use `prepareStep` to manage context:

```typescript
prepareStep: async ({ messages }) => {
  if (messages.length >= 150) {
    const summary = await summarizeOldMessages(messages.slice(0, -20));
    return {
      messages: [
        { role: 'system', content: summary },
        ...messages.slice(-20),
      ],
    };
  }
  return {};
}
```

### 8. Provider-Specific Limitations

- **Input examples**: Only Anthropic supports them natively
- **Strict mode**: Not all providers support full JSON schema specs
- **Tool call repair**: Provider-dependent feature

**SOLUTION:** Check provider documentation and test thoroughly.

### 9. Missing Tool Descriptions

LLMs rely heavily on tool descriptions to decide when to call them. Always write clear, specific descriptions:

**BAD:**
```typescript
description: 'Get data'
```

**GOOD:**
```typescript
description: 'Retrieve the current health status of the OpenAdapter server, including uptime, active sessions, and recent errors'
```

### 10. OAuth and Remote Authentication

If your tools require OAuth:
- Implement PKCE challenges
- Handle token refresh
- Implement retry logic for expired tokens
- Store tokens securely (never in client bundles)

---

## OpenAdapter Integration Recommendations

### Recommended Architecture

```
┌─────────────────┐
│   Dashboard     │ (Next.js + Vercel AI SDK)
│   (Frontend)    │
└────────┬────────┘
         │ useChat()
         ↓
┌─────────────────┐
│  /api/chat      │ (Next.js API Route)
│  (AI SDK Core)  │
└────────┬────────┘
         │ streamText() + tools
         ↓
┌─────────────────┐
│  Tool Functions │ (Management Tools)
└────────┬────────┘
         │ HTTP requests
         ↓
┌─────────────────┐
│  OpenAdapter    │ (Express Server)
│  Server         │
└─────────────────┘
```

### Tool Definitions for OpenAdapter

Based on DASHBOARD_PLAN.md, here are recommended tool definitions:

#### 1. getServerHealth

```typescript
const getServerHealth = tool({
  description: 'Check the health status of the OpenAdapter server including uptime, browser status, and recent activity',
  inputSchema: z.object({}),
  execute: async () => {
    const response = await fetch('http://127.0.0.1:3000/management/health');
    if (!response.ok) {
      return { error: 'Failed to fetch health status', status: response.status };
    }
    return await response.json();
  },
});
```

#### 2. restartBrowserSession

```typescript
const restartBrowserSession = tool({
  description: 'Force a complete restart of the browser session. Use this when the browser is unresponsive or in a bad state.',
  inputSchema: z.object({
    reason: z.string().describe('Reason for restart'),
  }),
  needsApproval: true, // Destructive action
  execute: async ({ reason }) => {
    const response = await fetch('http://127.0.0.1:3000/management/restart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return await response.json();
  },
});
```

#### 3. recoverSession

```typescript
const recoverSession = tool({
  description: 'Attempt to recover the current session using the multi-tier recovery system (L0-L4). Use this when the session appears frozen or unresponsive.',
  inputSchema: z.object({
    level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4']).optional().describe('Recovery level to attempt'),
  }),
  execute: async ({ level }) => {
    const response = await fetch('http://127.0.0.1:3000/management/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    return await response.json();
  },
});
```

#### 4. startNewChat

```typescript
const startNewChat = tool({
  description: 'Navigate to a new conversation in Claude. Use this to start fresh or when switching contexts.',
  inputSchema: z.object({}),
  execute: async () => {
    const response = await fetch('http://127.0.0.1:3000/management/new-chat', {
      method: 'POST',
    });
    return await response.json();
  },
});
```

#### 5. viewLogs

```typescript
const viewLogs = tool({
  description: 'Retrieve recent server logs from logs.txt. Useful for debugging issues or understanding recent activity.',
  inputSchema: z.object({
    lines: z.number().default(50).describe('Number of recent log lines to retrieve'),
    level: z.enum(['all', 'error', 'warn', 'info']).optional().describe('Filter by log level'),
  }),
  execute: async ({ lines, level }) => {
    const params = new URLSearchParams({
      lines: lines.toString(),
      ...(level && { level }),
    });
    const response = await fetch(`http://127.0.0.1:3000/management/logs?${params}`);
    return await response.json();
  },
});
```

#### 6. sendPrompt

```typescript
const sendPrompt = tool({
  description: 'Send a prompt to Claude via OpenAdapter and get the response. Use this for AI tasks that require Claude\'s intelligence.',
  inputSchema: z.object({
    prompt: z.string().describe('The prompt to send to Claude'),
    stream: z.boolean().default(false).describe('Whether to stream the response'),
  }),
  execute: async ({ prompt, stream }) => {
    const response = await fetch('http://127.0.0.1:3000/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        stream,
      }),
    });

    if (stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      return { response: result };
    } else {
      return await response.json();
    }
  },
});
```

### Example Chat Route Implementation

```typescript
// packages/dashboard/src/app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      getServerHealth: tool({
        description: 'Check OpenAdapter server health status',
        inputSchema: z.object({}),
        execute: async () => {
          const response = await fetch('http://127.0.0.1:3000/management/health');
          return await response.json();
        },
      }),

      restartBrowserSession: tool({
        description: 'Restart the browser session',
        inputSchema: z.object({
          reason: z.string(),
        }),
        needsApproval: true,
        execute: async ({ reason }) => {
          const response = await fetch('http://127.0.0.1:3000/management/restart', {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          return await response.json();
        },
      }),

      recoverSession: tool({
        description: 'Recover session using multi-tier recovery',
        inputSchema: z.object({
          level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4']).optional(),
        }),
        execute: async ({ level }) => {
          const response = await fetch('http://127.0.0.1:3000/management/recover', {
            method: 'POST',
            body: JSON.stringify({ level }),
          });
          return await response.json();
        },
      }),

      startNewChat: tool({
        description: 'Navigate to new conversation',
        inputSchema: z.object({}),
        execute: async () => {
          const response = await fetch('http://127.0.0.1:3000/management/new-chat', {
            method: 'POST',
          });
          return await response.json();
        },
      }),

      viewLogs: tool({
        description: 'Get recent server logs',
        inputSchema: z.object({
          lines: z.number().default(50),
          level: z.enum(['all', 'error', 'warn', 'info']).optional(),
        }),
        execute: async ({ lines, level }) => {
          const params = new URLSearchParams({
            lines: lines.toString(),
            ...(level && { level }),
          });
          const response = await fetch(`http://127.0.0.1:3000/management/logs?${params}`);
          return await response.json();
        },
      }),

      sendPrompt: tool({
        description: 'Send prompt to Claude via OpenAdapter',
        inputSchema: z.object({
          prompt: z.string(),
        }),
        execute: async ({ prompt }) => {
          const response = await fetch('http://127.0.0.1:3000/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
            }),
          });
          return await response.json();
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

### Frontend Chat Component

```typescript
// packages/dashboard/src/app/chat/page.tsx
'use client';
import { useChat } from '@ai-sdk/react';

export default function ChatPage() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    addToolApprovalResponse,
  } = useChat({
    api: '/api/chat',
    maxSteps: 5,
  });

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(m => (
          <div key={m.id} className="mb-4">
            <div className="font-bold">{m.role}</div>

            {m.parts.map((part, i) => {
              if (part.type === 'text') {
                return <p key={i}>{part.text}</p>;
              }

              if (part.type === 'tool-call') {
                return (
                  <div key={i} className="bg-blue-100 p-2 rounded">
                    Calling {part.toolName}...
                  </div>
                );
              }

              if (part.type === 'tool-result') {
                return (
                  <div key={i} className="bg-green-100 p-2 rounded">
                    Result: {JSON.stringify(part.result, null, 2)}
                  </div>
                );
              }

              if (part.type === 'tool-approval-request') {
                return (
                  <div key={i} className="bg-yellow-100 p-2 rounded">
                    <p>Approve {part.toolName}?</p>
                    <button onClick={() => addToolApprovalResponse(part.toolCallId, true)}>
                      Approve
                    </button>
                    <button onClick={() => addToolApprovalResponse(part.toolCallId, false)}>
                      Deny
                    </button>
                  </div>
                );
              }
            })}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          className="w-full border p-2 rounded"
          placeholder="Ask me to manage the server..."
        />
        <div className="mt-2">
          <button type="submit" disabled={isLoading}>
            Send
          </button>
          {isLoading && <button onClick={stop}>Stop</button>}
        </div>
      </form>
    </div>
  );
}
```

### Security Considerations for OpenAdapter

1. **Localhost-Only Access**: Ensure OpenAdapter server only binds to `127.0.0.1` to prevent external access
2. **No Authentication Required**: Since OpenAdapter is local, authentication overhead isn't needed
3. **Tool Approval Gates**: Use `needsApproval: true` for destructive tools like `restartBrowserSession`
4. **Rate Limiting**: Consider adding rate limiting to management endpoints
5. **Input Validation**: Validate all tool inputs even though Zod provides schema validation

### Performance Optimization

1. **Edge Runtime**: Use `export const runtime = 'edge'` for faster cold starts
2. **Streaming**: Always use streaming for better user experience
3. **Tool Result Caching**: Consider caching tool results for frequently called tools like `getServerHealth`
4. **Parallel Tool Calls**: The SDK automatically handles parallel tool execution when possible

### Autonomous vs. Human-in-the-Loop

From DASHBOARD_PLAN.md: "Should the AI assistant be able to autonomously manage the server?"

**Recommendation:**
- **Read-only tools** (getServerHealth, viewLogs): Autonomous ✅
- **Non-destructive actions** (recoverSession L0-L1, startNewChat): Autonomous ✅
- **Destructive actions** (restartBrowserSession, recoverSession L3-L4): Require approval ⚠️

```typescript
const restartBrowserSession = tool({
  description: '...',
  inputSchema: z.object({ reason: z.string() }),
  needsApproval: true, // Always require approval for restarts
  execute: async ({ reason }) => { /* ... */ },
});

const recoverSession = tool({
  description: '...',
  inputSchema: z.object({
    level: z.enum(['L0', 'L1', 'L2', 'L3', 'L4']).optional(),
  }),
  needsApproval: async ({ level }) => {
    // L0-L2: auto-approve, L3-L4: require approval
    return level === 'L3' || level === 'L4';
  },
  execute: async ({ level }) => { /* ... */ },
});
```

---

## Key Takeaways

1. **Vercel AI SDK v6 is production-ready** with robust tool calling, streaming, and type safety
2. **Tool calling is automatic** - the SDK handles orchestration, retries, and context management
3. **Human-in-the-loop is built-in** via the `needsApproval` flag
4. **Streaming-first architecture** provides real-time UX with Server-Sent Events
5. **OpenAI-compatible** means easy integration with OpenAdapter
6. **Type safety end-to-end** from client hooks to server tools
7. **Multi-step agents** can execute complex workflows automatically (up to 20 steps default)
8. **Security is critical** - use approval gates, input validation, and rate limiting for production

---

## Sources

- [AI SDK Core: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [AI SDK 6 Release](https://vercel.com/blog/ai-sdk-6)
- [Tool Use | Vercel Academy](https://vercel.com/academy/ai-sdk/tool-use)
- [How to build AI Agents with Vercel](https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk)
- [AI SDK UI: Chatbot Tool Usage](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage)
- [Foundations: Agents](https://sdk.vercel.ai/docs/foundations/agents)
- [Foundations: Tools](https://ai-sdk.dev/docs/foundations/tools)
- [AI SDK UI: useChat](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK UI: useCompletion](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-completion)
- [AI SDK UI: useObject](https://ai-sdk.dev/docs/ai-sdk-ui/object-generation)
- [AI SDK Core: streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [AI SDK Core: generateText](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [AI SDK Core: Error Handling](https://ai-sdk.dev/docs/ai-sdk-core/error-handling)
- [AI SDK UI: Error Handling](https://ai-sdk.dev/docs/ai-sdk-ui/error-handling)
- [Advanced: Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams)
- [Advanced: Vercel Deployment Guide](https://ai-sdk.dev/docs/advanced/vercel-deployment-guide)
- [AI SDK UI: Stream Protocols](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol)
- [Agents: Loop Control](https://ai-sdk.dev/docs/agents/loop-control)
- [Getting Started: Next.js App Router](https://ai-sdk.dev/docs/getting-started/nextjs-app-router)
- [OpenAI Compatible Providers](https://ai-sdk.dev/providers/openai-compatible-providers)
- [Human-in-the-Loop with Next.js](https://ai-sdk.dev/cookbook/next/human-in-the-loop)
- [AI SDK UI: convertToModelMessages](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages)
- [Securing AI Agents in the Vercel AI SDK](https://dev.to/ofri-peretz/securing-ai-agents-in-the-vercel-ai-sdk-485n)
- [Vercel AI SDK Tool Calling Cheat Sheet](https://tigerabrodi.blog/vercel-ai-sdk-tool-calling-cheat-sheet)
- [Building AI Agent Workflows](https://www.callstack.com/blog/building-ai-agent-workflows-with-vercels-ai-sdk-a-practical-guide)
- [GitHub: vercel/ai](https://github.com/vercel/ai)

---

**Next Steps:**
1. Set up new management endpoints in OpenAdapter server (`/management/health`, `/management/restart`, etc.)
2. Create proof-of-concept Next.js app with single tool
3. Test tool calling flow end-to-end
4. Proceed to Phase 2: Monorepo Architecture

**Last Updated:** 2026-03-02

# Vercel AI SDK - Quick Reference for OpenAdapter

**TLDR:** Everything you need to know about tool calling in 5 minutes.

---

## Essential Concepts

### 1. Tool Definition (3 lines)

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: 'What this tool does (LLM reads this)',
  inputSchema: z.object({ param: z.string() }),
  execute: async ({ param }) => { return result; },
});
```

### 2. Server Route (Next.js API)

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages,
    tools: { myTool }, // Add your tools here
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

### 3. Client Component (React)

```typescript
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    maxSteps: 5,
  });

  return (
    <div>
      {messages.map(m => <div key={m.id}>{m.content}</div>)}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

---

## OpenAdapter Tools (Copy-Paste Ready)

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    messages,
    tools: {
      getServerHealth: tool({
        description: 'Check OpenAdapter server health',
        inputSchema: z.object({}),
        execute: async () => {
          const res = await fetch('http://127.0.0.1:3000/management/health');
          return await res.json();
        },
      }),

      restartBrowser: tool({
        description: 'Restart browser session',
        inputSchema: z.object({ reason: z.string() }),
        needsApproval: true, // Require user approval
        execute: async ({ reason }) => {
          const res = await fetch('http://127.0.0.1:3000/management/restart', {
            method: 'POST',
            body: JSON.stringify({ reason }),
          });
          return await res.json();
        },
      }),

      viewLogs: tool({
        description: 'Get recent server logs',
        inputSchema: z.object({ lines: z.number().default(50) }),
        execute: async ({ lines }) => {
          const res = await fetch(`http://127.0.0.1:3000/logs?lines=${lines}`);
          return await res.json();
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

---

## Critical Gotchas

### 1. MUST use `tool()` helper

```typescript
// WRONG
{ myTool: { parameters: z.object(...) } }

// CORRECT
{ myTool: tool({ inputSchema: z.object(...) }) }
```

### 2. DON'T await addToolResult

```typescript
// WRONG
onToolCall: async ({ toolCall }) => {
  await addToolResult(...); // DEADLOCK!
}

// CORRECT
onToolCall: async ({ toolCall }) => {
  addToolResult(...); // No await
}
```

### 3. Approval requires TWO LLM calls

When `needsApproval: true`:
1. First call returns `tool-approval-request`
2. You call `addToolApprovalResponse(id, true/false)`
3. Second call executes tool or informs LLM of denial

### 4. Stream abort ≠ Resume

Cannot use both:
```typescript
// PICK ONE
useChat({ resume: true })  // OR
const { stop } = useChat() // Not both!
```

### 5. Context window management

Long conversations need trimming:
```typescript
prepareStep: async ({ messages }) => {
  if (messages.length >= 150) {
    return { messages: messages.slice(-20) };
  }
}
```

---

## Human-in-the-Loop UI

```typescript
const { messages, addToolApprovalResponse } = useChat({ api: '/api/chat' });

{messages.map(m => (
  m.parts.map(part => {
    if (part.type === 'tool-approval-request') {
      return (
        <div>
          <p>Approve {part.toolName}?</p>
          <button onClick={() => addToolApprovalResponse(part.toolCallId, true)}>
            Yes
          </button>
          <button onClick={() => addToolApprovalResponse(part.toolCallId, false)}>
            No
          </button>
        </div>
      );
    }
  })
))}
```

---

## Error Handling

```typescript
const tool = tool({
  description: 'Risky operation',
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    try {
      const result = await riskyOp(id);
      return { success: true, result };
    } catch (error) {
      // Return error as result (don't throw)
      return { success: false, error: error.message };
    }
  },
});
```

---

## Agent Loop Flow

```
User: "Check health and restart if needed"
  ↓
LLM: [Calls getServerHealth]
  ↓
SDK: [Executes tool, appends result to history]
  ↓
LLM: [Sees result, calls restartBrowser]
  ↓
SDK: [Requires approval, returns tool-approval-request]
  ↓
User: [Clicks "Approve"]
  ↓
SDK: [Executes tool, appends result]
  ↓
LLM: "Server restarted successfully"
```

**maxSteps**: Limits iterations (default: 20, recommended: 5-10)

---

## Streaming Responses

### Server

```typescript
return result.toUIMessageStreamResponse(); // For useChat
// OR
return result.toTextStreamResponse();      // For simple text
```

### Client

```typescript
const { isLoading, stop } = useChat({ api: '/api/chat' });

{isLoading && <button onClick={stop}>Stop</button>}
```

---

## Security Checklist

- [ ] Use `needsApproval: true` for destructive tools
- [ ] Validate inputs with Zod schemas
- [ ] Never hardcode API keys (use env vars)
- [ ] Set reasonable `maxSteps` limit
- [ ] Return errors as results (don't throw)
- [ ] Rate limit API routes
- [ ] Use HTTPS in production

---

## Custom OpenAI-Compatible Provider

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openAdapter = createOpenAI({
  baseURL: 'http://127.0.0.1:3000/v1',
  apiKey: 'not-needed',
});

const result = await streamText({
  model: openAdapter('claude'),
  prompt: 'Hello',
});
```

---

## Recommended Tool Approval Strategy

```typescript
// Read-only: No approval needed
getServerHealth: tool({ needsApproval: false })
viewLogs: tool({ needsApproval: false })

// Non-destructive: No approval needed
startNewChat: tool({ needsApproval: false })
recoverSession (L0-L1): tool({ needsApproval: false })

// Destructive: Always require approval
restartBrowser: tool({ needsApproval: true })
recoverSession (L3-L4): tool({
  needsApproval: async ({ level }) => level === 'L3' || level === 'L4'
})
```

---

## Installation

```bash
npm install ai @ai-sdk/openai @ai-sdk/react zod
```

---

## Useful Resources

- Full findings: `VERCEL_AI_SDK_FINDINGS.md`
- Architecture plan: `MONOREPO_ARCHITECTURE.md`
- Dashboard design: `DASHBOARD_DESIGN.md`
- Official docs: https://ai-sdk.dev/docs/introduction

---

**Last Updated:** 2026-03-02

# Vercel AI SDK + OpenAdapter - Implementation Roadmap

**Based on:** Comprehensive research findings
**Target:** Phase 1 completion - working proof of concept
**Timeline:** 1-2 weeks

---

## Pre-Implementation Checklist

- [x] Research Vercel AI SDK tool calling
- [ ] Add management endpoints to OpenAdapter server
- [ ] Set up Next.js dashboard with AI SDK
- [ ] Create POC with 1-2 tools
- [ ] Test end-to-end flow
- [ ] Document lessons learned

---

## Step 1: Add Management Endpoints to OpenAdapter Server

**Estimated Time:** 2-3 hours

### 1.1 Create Management Routes

```bash
# Create new routes file
touch lib/managementRoutes.js
```

**File: `lib/managementRoutes.js`**

```javascript
const express = require('express');
const router = express.Router();
const { sessionManager } = require('./sessionManager');
const { appendLog } = require('./logger');
const fs = require('fs').promises;

// Health check endpoint
router.get('/health', async (req, res) => {
  appendLog('[management] Health check requested');

  const state = sessionManager.state;

  res.json({
    status: state.page ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    lastRequestTime: state.lastRequestTime,
    isGenerating: state.isGenerating,
    browserStatus: state.browser ? 'connected' : 'disconnected',
  });
});

// Restart browser session
router.post('/restart', async (req, res) => {
  const { reason } = req.body;
  appendLog(`[management] Restart requested: ${reason}`);

  try {
    await sessionManager.restartBrowser();
    res.json({ success: true, message: 'Browser restarted' });
  } catch (error) {
    appendLog(`[management] Restart failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Recover session
router.post('/recover', async (req, res) => {
  const { level } = req.body;
  appendLog(`[management] Recovery requested: level ${level || 'auto'}`);

  try {
    await sessionManager.recoverSession(level);
    res.json({ success: true, message: 'Session recovered' });
  } catch (error) {
    appendLog(`[management] Recovery failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start new chat
router.post('/new-chat', async (req, res) => {
  appendLog('[management] New chat requested');

  try {
    const page = await sessionManager.getOrInitPage();
    await page.goto('https://claude.ai/new', { waitUntil: 'networkidle' });
    res.json({ success: true, message: 'Navigated to new chat' });
  } catch (error) {
    appendLog(`[management] New chat failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// View logs
router.get('/logs', async (req, res) => {
  const lines = parseInt(req.query.lines) || 50;
  const level = req.query.level || 'all';

  try {
    const logContent = await fs.readFile('logs.txt', 'utf-8');
    const logLines = logContent.split('\n').filter(line => {
      if (level === 'all') return true;
      return line.toLowerCase().includes(`[${level}]`);
    });

    const recentLogs = logLines.slice(-lines);

    res.json({
      success: true,
      logs: recentLogs,
      total: recentLogs.length,
    });
  } catch (error) {
    appendLog(`[management] Log retrieval failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### 1.2 Update server.js

Add management routes:

```javascript
// server.js
const managementRoutes = require('./lib/managementRoutes');

// Add before the main completions endpoint
app.use('/management', managementRoutes);
```

### 1.3 Test Management Endpoints

```bash
# Test health endpoint
curl http://127.0.0.1:3000/management/health

# Test logs endpoint
curl http://127.0.0.1:3000/management/logs?lines=10

# Test restart (destructive - be careful!)
curl -X POST http://127.0.0.1:3000/management/restart \
  -H "Content-Type: application/json" \
  -d '{"reason":"testing"}'
```

---

## Step 2: Set Up Next.js Dashboard with AI SDK

**Estimated Time:** 3-4 hours

### 2.1 Create Next.js App

```bash
# From openAdapter root
mkdir -p packages/dashboard
cd packages/dashboard

# Create Next.js app
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install AI SDK dependencies
npm install ai @ai-sdk/openai @ai-sdk/react zod
```

### 2.2 Configure Environment Variables

```bash
# packages/dashboard/.env.local
OPENAI_API_KEY=sk-your-key-here
OPENADAPTER_URL=http://127.0.0.1:3000
```

### 2.3 Create API Route

**File: `packages/dashboard/app/api/chat/route.ts`**

```typescript
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export const runtime = 'edge';

const OPENADAPTER_URL = process.env.OPENADAPTER_URL || 'http://127.0.0.1:3000';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4'),
    system: 'You are an AI assistant that helps manage the OpenAdapter server. You can check health, view logs, and perform administrative tasks. Always explain what you\'re doing and why.',
    messages,
    tools: {
      getServerHealth: tool({
        description: 'Check the health status of the OpenAdapter server including uptime, browser status, and current activity',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const response = await fetch(`${OPENADAPTER_URL}/management/health`);
            if (!response.ok) {
              return { error: 'Failed to fetch health status', status: response.status };
            }
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        },
      }),

      viewLogs: tool({
        description: 'Retrieve recent server logs from logs.txt. Useful for debugging issues or understanding recent activity.',
        inputSchema: z.object({
          lines: z.number().default(50).describe('Number of recent log lines to retrieve (default: 50)'),
          level: z.enum(['all', 'error', 'warn', 'info']).optional().describe('Filter by log level'),
        }),
        execute: async ({ lines, level }) => {
          try {
            const params = new URLSearchParams({
              lines: lines.toString(),
              ...(level && { level }),
            });
            const response = await fetch(`${OPENADAPTER_URL}/management/logs?${params}`);
            if (!response.ok) {
              return { error: 'Failed to fetch logs', status: response.status };
            }
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        },
      }),

      restartBrowserSession: tool({
        description: 'Force a complete restart of the browser session. Use this when the browser is unresponsive or in a bad state. This is a destructive action.',
        inputSchema: z.object({
          reason: z.string().describe('Reason for restart'),
        }),
        needsApproval: true,
        execute: async ({ reason }) => {
          try {
            const response = await fetch(`${OPENADAPTER_URL}/management/restart`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason }),
            });
            if (!response.ok) {
              return { error: 'Failed to restart session', status: response.status };
            }
            return await response.json();
          } catch (error) {
            return { error: error.message };
          }
        },
      }),
    },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
}
```

### 2.4 Create Chat Component

**File: `packages/dashboard/app/page.tsx`**

```typescript
'use client';

import { useChat } from '@ai-sdk/react';

export default function Home() {
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">OpenAdapter Dashboard</h1>
        <p className="text-gray-600">AI-powered server management</p>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`p-4 rounded-lg ${
              m.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
            }`}
          >
            <div className="font-semibold mb-2 capitalize">{m.role}</div>

            {m.parts.map((part, i) => {
              if (part.type === 'text') {
                return (
                  <div key={i} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                );
              }

              if (part.type === 'tool-call') {
                return (
                  <div key={i} className="bg-blue-50 p-2 rounded mt-2">
                    <span className="text-sm font-medium">
                      🔧 Calling {part.toolName}
                    </span>
                  </div>
                );
              }

              if (part.type === 'tool-result') {
                return (
                  <div key={i} className="bg-green-50 p-2 rounded mt-2">
                    <span className="text-sm font-medium">✓ Result:</span>
                    <pre className="text-xs mt-1 overflow-x-auto">
                      {JSON.stringify(part.result, null, 2)}
                    </pre>
                  </div>
                );
              }

              if (part.type === 'tool-approval-request') {
                return (
                  <div key={i} className="bg-yellow-50 p-4 rounded mt-2 border border-yellow-200">
                    <p className="font-medium mb-2">
                      ⚠️ Approval Required: {part.toolName}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToolApprovalResponse(part.toolCallId, true)}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => addToolApprovalResponse(part.toolCallId, false)}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me to check server health, view logs, etc..."
            className="flex-1 border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send
          </button>
          {isLoading && (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Stop
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

---

## Step 3: Test End-to-End Flow

**Estimated Time:** 1-2 hours

### 3.1 Start OpenAdapter Server

```bash
# Terminal 1
cd openAdapter
npm start
```

### 3.2 Start Dashboard

```bash
# Terminal 2
cd packages/dashboard
npm run dev
```

### 3.3 Test Scenarios

Open http://localhost:3000 (dashboard) and try:

#### Scenario 1: Health Check
```
User: "Check the server health"
Expected: Tool call → Health status displayed
```

#### Scenario 2: View Logs
```
User: "Show me the last 20 log lines"
Expected: Tool call → Logs displayed
```

#### Scenario 3: Multi-Step Agent
```
User: "Check the health and if there are any errors in the logs, show me the details"
Expected: Two tool calls in sequence → Health check → View logs
```

#### Scenario 4: Approval Required
```
User: "Restart the browser because it's frozen"
Expected: Tool approval request → User clicks Approve/Deny → Action executed
```

---

## Step 4: Document Findings

**Estimated Time:** 1 hour

Create `POC_RESULTS.md` documenting:

1. What worked well
2. Issues encountered
3. Performance observations
4. UX feedback
5. Next steps

---

## Common Issues & Solutions

### Issue 1: CORS Errors

**Problem:** Dashboard can't reach OpenAdapter server

**Solution:** Add CORS middleware to server.js

```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
}));
```

### Issue 2: Tool Execution Timeout

**Problem:** Management endpoints take too long

**Solution:** Increase timeout in Next.js API route

```typescript
export const maxDuration = 60; // seconds
```

### Issue 3: OpenAI API Key Cost

**Problem:** Concerned about OpenAI API costs

**Solution:** Use OpenAdapter itself as the model provider

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openAdapter = createOpenAI({
  baseURL: 'http://127.0.0.1:3000/v1',
  apiKey: 'not-needed',
});

const result = streamText({
  model: openAdapter('claude'),
  // ... rest
});
```

**Note:** This creates a circular dependency (dashboard → OpenAdapter → Claude → manage OpenAdapter). Consider carefully.

### Issue 4: Browser Context Lost

**Problem:** Management actions break active Claude sessions

**Solution:** Add session state tracking and warnings

```javascript
// Before destructive actions
if (state.isGenerating) {
  return res.status(409).json({
    error: 'Cannot restart while generation is in progress',
  });
}
```

---

## Success Criteria

- [x] ✅ Research complete
- [ ] Management endpoints working
- [ ] Dashboard renders correctly
- [ ] Health check tool executes successfully
- [ ] View logs tool displays logs
- [ ] Restart tool shows approval UI
- [ ] Multi-step agent flow works (2+ tool calls)
- [ ] Error handling graceful
- [ ] Documentation complete

---

## Next Steps After POC

### Immediate (Week 2)
1. Add remaining tools (recoverSession, startNewChat, sendPrompt)
2. Improve error messages and user feedback
3. Add loading states and animations
4. Write unit tests for tools

### Short-term (Weeks 3-4)
1. Implement full monorepo structure
2. Add Server Activities tab (non-AI dashboard)
3. Add logs viewer with real-time updates
4. Implement session state visualization

### Medium-term (Month 2)
1. Add authentication (if needed)
2. Implement conversation history persistence
3. Add statistics and charts
4. Deploy to production environment

---

## Key Learnings to Document

- How well does the AI understand server management tasks?
- Is the approval UI intuitive?
- What's the latency for tool execution?
- Are the tool descriptions clear enough for the LLM?
- Do users prefer autonomous actions or approval gates?
- What's the token cost per conversation?

---

## Resources

- Vercel AI SDK Docs: https://ai-sdk.dev
- Next.js Docs: https://nextjs.org/docs
- OpenAdapter README: `../README.md`
- Full Research: `VERCEL_AI_SDK_FINDINGS.md`

---

**Status:** Ready to implement
**Last Updated:** 2026-03-02

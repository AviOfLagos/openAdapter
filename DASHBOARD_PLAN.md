# OpenAdapter Dashboard & Vercel AI SDK Integration Plan

**Goal:** Transform OpenAdapter into a monorepo with a web dashboard and integrate Vercel AI SDK for enhanced AI interactions and tool calling.

**Philosophy:** Research deeply first, implement flawlessly second.

---

## 📚 Phase 1: Research Vercel AI SDK (Current Phase)

### What We Know So Far

Based on initial research, Vercel AI SDK (v6.0+, released late 2025) provides:

#### Core Features
- **Unified API** for text generation, structured objects, and tool calls
- **React Hooks** for UI integration (`useChat`, `useCompletion`, `useObject`)
- **Tool Calling** with schema validation and multi-step agent loops
- **Streaming-first** approach with real-time updates
- **TypeScript native** with full type safety

#### Key Hooks
1. **`useChat()`** - Full chat interface management with built-in state
2. **`useCompletion()`** - Single-turn text completion
3. **`useObject()`** - Streaming structured data

#### Tool Calling Capabilities
- Define tools as functions the model can call
- Automatic argument validation against schemas
- Multi-step agent loops (up to 20 steps by default)
- Native strict mode for guaranteed schema compliance
- Tool execution with result storage

### Research Tasks

#### 1. Deep Dive into Tool Calling
- [ ] Study [AI SDK Core: Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [ ] Understand how tools integrate with OpenAdapter's existing capabilities
- [ ] Design tool schema for OpenAdapter management functions
- [ ] Research multi-step agent patterns for complex operations

#### 2. React Integration Patterns
- [ ] Study [useChat documentation](https://ai-sdk.dev/docs/ai-sdk-ui/useChat)
- [ ] Review production examples and best practices
- [ ] Understand error handling and loading states
- [ ] Research streaming vs non-streaming tradeoffs

#### 3. Architecture Design
- [ ] How to proxy requests from Vercel AI SDK → OpenAdapter server
- [ ] Session management across dashboard and server
- [ ] Real-time updates for server activities
- [ ] WebSocket vs SSE for live monitoring

#### 4. Tool Use Cases for OpenAdapter
Potential tools to expose via AI SDK:
- `restartBrowserSession` - Force browser restart
- `recoverSession` - Trigger recovery
- `startNewChat` - Navigate to new conversation
- `getServerHealth` - Fetch health status
- `viewLogs` - Retrieve recent logs
- `sendPrompt` - Send a prompt to Claude (existing functionality)

**Question to explore:** Should the AI assistant be able to autonomously manage the server based on health checks?

### Research Resources

**Official Documentation:**
- [AI SDK Introduction](https://ai-sdk.dev/docs/introduction)
- [AI SDK Core: Tools and Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [How to build AI Agents with Vercel](https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk)
- [AI SDK 6 Release](https://vercel.com/blog/ai-sdk-6)
- [Vercel Academy: Tool Use](https://vercel.com/academy/ai-sdk/tool-use)

**Tutorials & Guides:**
- [Vercel AI SDK Complete Guide](https://dev.to/pockit_tools/vercel-ai-sdk-complete-guide-building-production-ready-ai-chat-apps-with-nextjs-4cp6)
- [Tool Calling Tutorial](https://www.aihero.dev/tool-calls-with-vercel-ai-sdk)
- [Unified AI Interfaces](https://blog.logrocket.com/unified-ai-interfaces-vercel-sdk/)

**Code Examples:**
- [GitHub: vercel/ai](https://github.com/vercel/ai) - Official repository with examples

---

## 🏗️ Phase 2: Monorepo Architecture (After Research)

### Proposed Structure

```
openAdapter/
├── packages/
│   ├── server/                 # Backend (Express + Playwright)
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── lib/
│   │   │   └── routes/
│   │   │       ├── completions.js    # Main API endpoint
│   │   │       └── management.js     # Admin endpoints
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── dashboard/              # Frontend (Next.js + Vercel AI SDK)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx           # Home
│   │   │   │   ├── chat/              # AI Chat interface
│   │   │   │   ├── activities/        # Server Activities tab
│   │   │   │   └── api/
│   │   │   │       └── chat/
│   │   │   │           └── route.ts   # AI SDK endpoint
│   │   │   ├── components/
│   │   │   │   ├── ServerStatus.tsx
│   │   │   │   ├── LogViewer.tsx
│   │   │   │   ├── SessionControls.tsx
│   │   │   │   └── ChatInterface.tsx
│   │   │   └── lib/
│   │   │       └── openadapter-client.ts
│   │   └── package.json
│   │
│   └── shared/                 # Shared types and utilities
│       ├── src/
│       │   ├── types/
│       │   │   ├── openai.ts          # OpenAI API types
│       │   │   ├── management.ts      # Management API types
│       │   │   └── config.ts
│       │   └── utils/
│       └── package.json
│
├── package.json                # Root workspace config
├── turbo.json                  # Turborepo config (optional)
├── pnpm-workspace.yaml         # PNPM workspaces
└── README.md
```

### Technology Stack

**Monorepo Management:**
- **PNPM Workspaces** - Fast, efficient package management
- **Turborepo** (optional) - Build caching and parallelization

**Dashboard:**
- **Next.js 15** - React framework with App Router
- **Vercel AI SDK** - AI interactions and tool calling
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Recharts** - Charts for statistics
- **React Query** - Server state management

**Backend:**
- **Express** - HTTP server (existing)
- **Playwright** - Browser automation (existing)
- **Shared types** - TypeScript types from `@openadapter/shared`

---

## 🎨 Phase 3: Dashboard Design (After Architecture)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  OpenAdapter Dashboard                    [User]    │
├─────────────────────────────────────────────────────┤
│  [Chat] [Server Activities] [Logs] [Settings]       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Content Area (tab-specific)                        │
│                                                      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Tab 1: Chat (Vercel AI SDK)

**Features:**
- AI-powered chat interface using `useChat()`
- Can send prompts to Claude via OpenAdapter
- Tool calling for server management
- Conversation history
- Streaming responses

**Example conversation:**
```
User: "Check the server health and restart if needed"
AI: [Calls getServerHealth tool]
    "Server is healthy. Uptime: 2h 34m. No restart needed."

User: "Send a prompt to Claude: What is 2+2?"
AI: [Calls sendPrompt tool]
    "Claude responded: 2+2 equals 4."
```

### Tab 2: Server Activities

**Dashboard Panels:**

1. **Health Overview** (top)
   - Status badge (Healthy/Degraded)
   - Uptime counter
   - Browser status indicator
   - Last request timestamp

2. **Statistics** (middle)
   - Total requests (line chart over time)
   - Success rate (pie chart)
   - Failed requests counter
   - Rate limit hits counter

3. **Quick Actions** (sidebar)
   - [Restart Browser] button
   - [Recover Session] button
   - [New Chat] button
   - [Refresh Status] button

4. **Recent Activity** (bottom)
   - Live feed of recent requests
   - Request/response times
   - Error notifications

### Tab 3: Logs

**Features:**
- Real-time log streaming
- Filter by level (info, warn, error)
- Search functionality
- Download logs button
- Clear logs button (with confirmation)
- Auto-scroll toggle

### Tab 4: Settings

**Configuration:**
- Server connection settings
- API key management
- Timeout configurations
- Theme toggle (dark/light)
- Notification preferences

---

## 🔧 Phase 4: Implementation Plan (After Design Approval)

### Step 1: Monorepo Setup
1. Initialize PNPM workspace
2. Restructure existing code into `packages/server/`
3. Create `packages/shared/` with TypeScript types
4. Set up Turborepo (if needed)

### Step 2: Dashboard Foundation
1. Create Next.js app in `packages/dashboard/`
2. Set up Tailwind CSS and shadcn/ui
3. Create basic layout with tabs
4. Implement routing

### Step 3: Server Activities Tab (No AI yet)
1. Create OpenAdapter client library
2. Build health overview component
3. Add statistics dashboard
4. Implement session controls
5. Add real-time updates

### Step 4: Vercel AI SDK Integration
1. Set up AI SDK in Next.js
2. Create `/api/chat` route
3. Implement tool calling for server management
4. Build chat interface with `useChat()`
5. Test tool execution flow

### Step 5: Polish & Testing
1. Add error handling
2. Implement loading states
3. Write tests
4. Add documentation
5. Create deployment guide

---

## 🎯 Success Criteria

**Must Have:**
- ✅ Monorepo with clear separation of concerns
- ✅ Working dashboard with Server Activities tab
- ✅ Vercel AI SDK integration with tool calling
- ✅ All existing OpenAdapter functionality preserved
- ✅ Comprehensive documentation

**Nice to Have:**
- Real-time WebSocket updates
- Dark mode support
- Mobile-responsive design
- Docker deployment
- CI/CD pipeline

---

## 🚦 Next Steps

### Immediate Actions (This Week)

1. **Complete Vercel AI SDK research**
   - Read all documentation links above
   - Prototype a simple tool calling example
   - Test AI SDK with OpenAdapter backend

2. **Design tool schemas**
   - Define TypeScript types for each management tool
   - Plan tool execution flow
   - Consider security implications

3. **Create POC (Proof of Concept)**
   - Minimal Next.js app
   - Single tool (e.g., `getServerHealth`)
   - Verify Vercel AI SDK → OpenAdapter flow

### Blockers to Resolve

- [ ] Decision: Use WebSocket or polling for real-time updates?
- [ ] Decision: Should AI have autonomous control or require confirmation?
- [ ] Decision: PNPM vs Yarn for monorepo?
- [ ] Decision: Deploy dashboard separately or same server?

### Questions to Answer

1. How should authentication work between dashboard and server?
2. Should the dashboard be publicly accessible or localhost only?
3. Do we need a database for conversation history?
4. Should we support multiple OpenAdapter instances from one dashboard?

---

## 📝 Notes

- Vercel AI SDK is provider-agnostic, but we're using our own OpenAdapter endpoint
- Tool calling could enable autonomous server management (exciting but needs safety)
- Dashboard could eventually support multiple users/sessions
- Consider adding Prometheus/Grafana integration later for advanced monitoring

---

**Status:** 🔍 Research Phase
**Last Updated:** 2026-03-02
**Next Review:** After completing Vercel AI SDK deep dive

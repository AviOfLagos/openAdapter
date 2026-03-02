# OpenAdapter Tool Schemas - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Application Layer                         │
│  (Your Code: Dashboard, CLI, Agent, etc.)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ imports
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              @openadapter/shared/tools                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Schemas Layer (schemas.ts)                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Tool Schemas │  │ Type Defs    │  │ Validators   │  │   │
│  │  │ (Zod)        │  │ (TypeScript) │  │ (Zod)        │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                          │   │
│  │  Security Levels:  [SAFE]  [CONFIRM]  [RESTRICTED]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         │ uses                                   │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Handlers Layer (handlers.ts)                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ HTTP Client  │  │ Tool Handlers│  │ Middleware   │  │   │
│  │  │ (fetch)      │  │ (async)      │  │ (compose)    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                          │   │
│  │  Features: Retry, Logging, Error Boundary, Timeout      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         │ HTTP requests                          │
│                         ▼                                        │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         │ (Bearer token auth)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OpenAdapter Server                              │
│                  (Express.js)                                    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Management API (lib/managementController.js)           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │  /admin/     │  │  /admin/     │  │  /admin/     │  │   │
│  │  │  health      │  │  session/    │  │  logs        │  │   │
│  │  │  status      │  │  restart     │  │  config      │  │   │
│  │  │              │  │  recover     │  │              │  │   │
│  │  │              │  │  new-chat    │  │              │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         │                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Chat API (server.js)                                   │   │
│  │  ┌──────────────┐                                       │   │
│  │  │  /v1/chat/   │  OpenAI-compatible endpoint          │   │
│  │  │  completions │                                       │   │
│  │  └──────────────┘                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
│                         │ Playwright automation                  │
│                         ▼                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Session Manager (lib/sessionManager.js)                │   │
│  │  - Browser lifecycle                                    │   │
│  │  - Multi-tier recovery                                  │   │
│  │  - State management                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ Browser automation
                          ▼
                  ┌──────────────┐
                  │   Chromium   │
                  │  (Headful)   │
                  └──────────────┘
                          │
                          │ Web UI
                          ▼
                  ┌──────────────┐
                  │  Claude.ai   │
                  │  Web UI      │
                  └──────────────┘
```

## Data Flow

### Request Flow (Health Check Example)

```
┌───────────┐
│ AI Agent  │  "Check server health"
└─────┬─────┘
      │
      │ 1. Call tool
      ▼
┌─────────────────────────────────────┐
│ getServerHealth()                   │
│ - Validate params with Zod          │
│ - Create HTTP request               │
└─────┬───────────────────────────────┘
      │
      │ 2. HTTP GET /admin/health
      │    Authorization: Bearer <key>
      ▼
┌─────────────────────────────────────┐
│ OpenAdapter Server                  │
│ - Verify API key                    │
│ - Check browser status              │
│ - Collect stats                     │
│ - Format response                   │
└─────┬───────────────────────────────┘
      │
      │ 3. Return JSON
      ▼
┌─────────────────────────────────────┐
│ HTTP Client (handlers.ts)           │
│ - Parse response                    │
│ - Validate with Zod                 │
│ - Convert to ToolResult             │
└─────┬───────────────────────────────┘
      │
      │ 4. Return typed result
      ▼
┌─────────────────────────────────────┐
│ AI Agent                            │
│ if (isSuccess(result)) {            │
│   // result.data is typed           │
│   console.log(result.data.uptime)   │
│ }                                   │
└─────────────────────────────────────┘
```

### Error Flow

```
┌───────────┐
│ AI Agent  │  Request with invalid params
└─────┬─────┘
      │
      ▼
┌─────────────────────────┐
│ Zod Validation          │
│ - Schema mismatch       │
│ - Return error          │
└─────┬───────────────────┘
      │
      ▼
┌─────────────────────────┐
│ ToolResult              │
│ {                       │
│   success: false,       │
│   error: "...",         │
│   code: "validation"    │
│ }                       │
└─────┬───────────────────┘
      │
      ▼
┌─────────────────────────┐
│ AI Agent                │
│ - Handle error          │
│ - Log/retry/report      │
└─────────────────────────┘
```

## Security Flow

### Confirmation-Required Tool

```
┌───────────┐
│ AI Agent  │  "Restart the server"
└─────┬─────┘
      │
      │ 1. Request restartSession
      ▼
┌─────────────────────────────────────┐
│ requiresConfirmation('restart')     │
│ → returns true                      │
└─────┬───────────────────────────────┘
      │
      │ 2. Get confirmation prompt
      ▼
┌─────────────────────────────────────┐
│ getConfirmationPrompt('restart')    │
│ → "This will close the browser..."  │
└─────┬───────────────────────────────┘
      │
      │ 3. Show to user
      ▼
┌─────────────────────────────────────┐
│ UI Confirmation Dialog              │
│ "This will close the browser and    │
│  clear all session state. Continue?"│
│                                     │
│  [Cancel]  [Confirm]                │
└─────┬───────────────────────────────┘
      │
      │ 4a. User clicks Cancel
      ├──────────────────┐
      │                  │
      │                  ▼
      │         ┌────────────────┐
      │         │ Return early   │
      │         │ No API call    │
      │         └────────────────┘
      │
      │ 4b. User clicks Confirm
      ▼
┌─────────────────────────────────────┐
│ handlers.restartSession()           │
│ - Execute tool                      │
│ - Log action                        │
│ - Return result                     │
└─────────────────────────────────────┘
```

## Type Safety Flow

### Compile-Time Type Safety

```typescript
// 1. Schema defines both validation and types
const schema = z.object({
  lines: z.number().positive().max(10000).default(100)
});

// 2. TypeScript infers the type
type Params = z.infer<typeof schema>;
// → { lines: number }

// 3. Handler uses inferred type
async function getLogs(params: Params): Promise<ToolResult<Response>> {
  // params.lines is typed as number
  // TypeScript enforces this
}

// 4. Result is discriminated union
type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// 5. TypeScript enforces handling both cases
const result = await getLogs({ lines: 100 });
if (result.success) {
  // result.data is available (TypeScript knows this)
  console.log(result.data.logs);
} else {
  // result.error is available (TypeScript knows this)
  console.error(result.error);
}
```

## Module Dependencies

```
┌─────────────────────────────────────────────┐
│  External Dependencies                      │
│  ┌────────┐  ┌────────┐  ┌────────┐       │
│  │  zod   │  │   ai   │  │ fetch  │       │
│  │ (peer) │  │ (peer) │  │(global)│       │
│  └────────┘  └────────┘  └────────┘       │
└─────────────────────────────────────────────┘
          │          │          │
          ▼          ▼          ▼
┌─────────────────────────────────────────────┐
│  @openadapter/shared                        │
│                                             │
│  schemas.ts ──┐                            │
│               ├──> index.ts ──> dist/      │
│  handlers.ts ─┤                            │
│               │                             │
│  examples.ts ─┘                            │
└─────────────────────────────────────────────┘
          │
          │ imports
          ▼
┌─────────────────────────────────────────────┐
│  Consumer Application                       │
│  (Dashboard, CLI, Agent, etc.)              │
└─────────────────────────────────────────────┘
```

## Build Process

```
Source Files (.ts)
├── src/tools/schemas.ts
├── src/tools/handlers.ts
├── src/tools/examples.ts
└── src/tools/index.ts
         │
         │ tsup (bundler)
         ▼
Output Files
├── dist/index.js          (CommonJS)
├── dist/index.mjs         (ES Modules)
├── dist/index.d.ts        (Type declarations)
├── dist/index.js.map      (Source map)
├── dist/index.mjs.map     (Source map)
└── dist/index.d.ts.map    (Declaration map)
         │
         │ npm publish
         ▼
    NPM Registry
         │
         │ npm install
         ▼
   Consumer Projects
```

## Middleware Composition

```
Original Handler
      │
      ▼
┌─────────────────────┐
│ withErrorBoundary   │  Catches unexpected errors
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ withRetry           │  Retry with backoff
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ withLogging         │  Log calls and results
└─────────┬───────────┘
          │
          ▼
   Final Handler
   (composable, reusable)
```

## AI Integration Flow

```
┌─────────────────────────────────────────────┐
│  Vercel AI SDK                              │
│                                             │
│  generateText({                             │
│    model: openai('gpt-4'),                 │
│    prompt: "Check health",                 │
│    tools: {                                │
│      getServerHealth: {                    │
│        description: "...",                 │
│        parameters: zodSchema,              │
│        execute: async (params) => {...}   │
│      }                                      │
│    }                                        │
│  })                                         │
└─────────┬───────────────────────────────────┘
          │
          │ 1. AI decides to use tool
          ▼
┌─────────────────────────────────────────────┐
│  Tool Execution                             │
│  - Validate params (Zod)                    │
│  - Call handler                             │
│  - Return result or throw                   │
└─────────┬───────────────────────────────────┘
          │
          │ 2. Result to AI
          ▼
┌─────────────────────────────────────────────┐
│  AI Context Update                          │
│  - Add tool result to context               │
│  - Generate next response                   │
└─────────┬───────────────────────────────────┘
          │
          │ 3. May call more tools
          ▼
┌─────────────────────────────────────────────┐
│  Final Response                             │
│  "The server is healthy with 1h uptime"     │
└─────────────────────────────────────────────┘
```

## Package Structure

```
@openadapter/shared/
│
├── Public API (consumers import these)
│   ├── index.ts              Main entry
│   └── tools/index.ts        Tools entry
│
├── Core Implementation
│   ├── schemas.ts            Tool schemas
│   ├── handlers.ts           Execution logic
│   └── examples.ts           Usage patterns
│
├── Build Output
│   └── dist/                 Compiled code
│
├── Configuration
│   ├── package.json          Package metadata
│   ├── tsconfig.json         TypeScript config
│   └── tsup.config.ts        Build config
│
└── Documentation
    ├── README.md             Package docs
    ├── SECURITY.md           Security guide
    ├── USAGE_GUIDE.md        Developer guide
    ├── DESIGN_DECISIONS.md   Architecture
    ├── ARCHITECTURE.md       This file
    └── TOOL_SCHEMAS_SUMMARY.md Summary
```

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│  Development                                │
│  - Local OpenAdapter (localhost:3000)       │
│  - No TLS                                   │
│  - API key optional                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Production                                 │
│                                             │
│  Client App                                │
│       │                                     │
│       │ HTTPS + API key                     │
│       ▼                                     │
│  Reverse Proxy (nginx/Caddy)               │
│       │ TLS termination                     │
│       │ Rate limiting                       │
│       │ IP filtering                        │
│       ▼                                     │
│  OpenAdapter Server                        │
│       │ localhost only                      │
│       │ API key required                    │
│       ▼                                     │
│  Chromium + Claude.ai                      │
└─────────────────────────────────────────────┘
```

## Summary

This architecture provides:

1. **Type Safety**: Zod schemas + TypeScript inference
2. **Security**: Three-tier security model with confirmation flows
3. **Modularity**: Separate schemas, handlers, examples
4. **Composability**: Middleware pattern for cross-cutting concerns
5. **AI Integration**: First-class Vercel AI SDK support
6. **Error Handling**: Discriminated unions + error codes
7. **Extensibility**: Easy to add new tools or middleware
8. **Documentation**: Comprehensive guides and examples

The system is production-ready and follows best practices for type safety, security, and developer experience.

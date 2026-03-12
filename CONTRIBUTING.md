# Contributing to OpenAdapter

Thanks for your interest in contributing! This guide covers everything you need to get productive.

## Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/openAdapter.git
cd openAdapter

# 2. Install dependencies (uses pnpm)
pnpm install

# 3. Install Playwright browser
cd apps/server && npx playwright install chromium && cd ../..

# 4. Start development
pnpm dev          # Starts both server (:3001) and dashboard (:3000)
# Or just the server:
pnpm dev:server
```

On first run, a Chromium window opens — log into `claude.ai` manually once. Your session persists in `.browser-profile/`.

## Monorepo Structure

This is a **pnpm + Turborepo** monorepo with two apps:

```
openAdapter/
├── apps/
│   ├── server/              # @openadapter/server — Express API bridge
│   │   ├── src/
│   │   │   ├── server.js    # Main server + OpenAI endpoint
│   │   │   ├── adapter.js   # Standalone CLI tool
│   │   │   └── lib/         # Core modules
│   │   ├── tests/
│   │   │   ├── unit/        # 61 unit tests (node:test)
│   │   │   └── integration/ # HTTP endpoint tests
│   │   └── package.json
│   │
│   └── dashboard/           # @openadapter/dashboard — Next.js management UI
│       ├── app/             # Routes: chat, activities, logs, settings
│       ├── components/      # React + shadcn/ui components
│       ├── lib/             # API client, utilities
│       └── package.json
│
├── packages/                # Shared packages (planned, currently empty)
├── turbo.json               # Build pipeline config
└── pnpm-workspace.yaml      # Workspace definition
```

### Running Commands

```bash
# From monorepo root
pnpm dev                   # Start both apps
pnpm dev:server            # Server only
pnpm dev:dashboard         # Dashboard only
pnpm test:unit             # Unit tests (fast, no server needed)
pnpm test                  # All tests
pnpm build                 # Build everything
```

### Working in a Single App

```bash
cd apps/server
npm run test:unit          # Server unit tests
npm run dev                # Server only

cd apps/dashboard
pnpm dev                   # Dashboard dev server
pnpm build                 # Production build
```

## How the Adapter Server Works

### Request Flow

1. **`server.js`** receives `POST /v1/chat/completions` in OpenAI format
2. **`extractPayload()`** parses messages — extracts text, decodes base64 images/files, deduplicates system context
3. **`sessionManager.getOrInitPage()`** returns a live Playwright page (launching browser on first call, recovering if needed)
4. The prompt is typed into Claude's chat input via DOM selectors
5. **`waitForCompletion()`** polls the DOM, calling `htmlToMd.htmlToMarkdown()` to convert HTML to Markdown
6. If streaming is enabled, chunks are sent as SSE events during polling
7. **`rateLimiter.checkRateLimit()`** inspects the response for rate-limit indicators
8. The response is returned in OpenAI chat completion format

### Key Architectural Decisions

**Selector chains** — All DOM interaction goes through `SELECTOR_CHAINS` objects with ordered fallback CSS selectors. When Claude updates their UI, only the selectors need updating.

**Single-request gating** — The `isGenerating` flag ensures one request at a time. We control a single browser tab, so concurrent DOM manipulation would corrupt state.

**In-browser Markdown conversion** — `htmlToMd.js` is serialized and executed inside Chromium via `page.evaluate()`. It **cannot** use `require()`, `import`, or any Node.js APIs.

**Session recovery tiers** — `sessionManager.js` implements escalating recovery (L0: liveness check → L1: reload → L2: navigate to /new → L3: restart browser → L4: return 503).

**System context deduplication** — System messages are MD5-hashed. If unchanged from the last request, the context isn't re-uploaded.

## Making Changes

### PR Workflow

1. Create a branch from `main` (or the relevant feature branch)
2. Make your changes
3. Run tests: `pnpm test:unit`
4. Push and open a PR
5. CI will run lint and unit tests automatically

### Updating Selectors

Claude's UI changes periodically. When elements break:

1. Open `claude.ai` in Chrome DevTools (F12)
2. Find a stable selector (prefer `data-testid`, `aria-label` over class names)
3. Add to the `SELECTOR_CHAINS` array in both `server.js` and `adapter.js` — most reliable selector first
4. Test with a real request

### Adding Server Features

- Follow the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) format
- Log with `appendLog()` (writes to console + `logs.txt`)
- Respect the `isGenerating` gate for anything that touches the browser
- Return OpenAI-shaped errors:
  ```js
  res.status(400).json({
    error: { message: '...', type: 'invalid_request_error' }
  });
  ```

### Working on the Dashboard

The dashboard is a Next.js 16 app with:
- **React 19** + Server Components
- **shadcn/ui** for UI components
- **Tailwind CSS v4**
- **TypeScript**

The dashboard connects to the adapter server via `lib/openadapter-client.ts`. The server URL is configured in `.env.local`:
```
NEXT_PUBLIC_OPENADAPTER_SERVER_URL=http://127.0.0.1:3001
```

### Modifying htmlToMd.js

This function runs **inside Chromium**, not in Node.js:
- No `require()`, no Node APIs, no external variables
- Test by sending a real request and checking the response
- If `page.evaluate()` throws, the server falls back to `innerText()`

## Testing

```bash
pnpm test:unit             # Unit tests — fast, no server needed
pnpm test:integration      # Integration tests — requires running server
pnpm test                  # All tests
```

Unit tests use Node's built-in test runner (`node:test`) and cover `extractPayload`, `htmlToMd`, `rateLimiter`, and `toolCallParser` modules.

To test manually:
```bash
# Non-streaming
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'

# Streaming
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "stream": true}'
```

## Style Guidelines

- **Modules:** CommonJS (`require` / `module.exports`)
- **Variables:** `const` / `let`, never `var`
- **Async:** `async/await` over raw promises
- **Logging:** `appendLog()` in server, `console.error()` in CLI
- **Functions:** Keep focused. New logic goes in a new file under `lib/`
- **Log prefixes:** `[moduleName]` for traceability (e.g., `[server]`, `[sessionManager]`)
- **Selectors:** Always in `SELECTOR_CHAINS`, never hardcoded inline

## High-Impact Contribution Areas

Check [Issues](https://github.com/AviOfLagos/openAdapter/issues) for current tasks. These are the areas where help has the biggest impact:

| Area | Why It Matters | Difficulty |
|------|---------------|------------|
| **Tool calling** | Unlocks OpenClaw skills, subagents, MCP | Hard |
| **Dashboard chat integration** | Wire chat tab to adapter instead of Vercel AI Gateway | Medium |
| **Selector updates** | Keep the adapter working when Claude changes their UI | Easy |
| **MutationObserver streaming** | Replace DOM polling for lower-latency streaming | Medium |
| **Docker support** | Run on servers without a display (Xvfb) | Medium |
| **Config file** | Move hardcoded values to `.env` / config | Easy |
| **Unicode regex fix** | Rate limiter doesn't catch curly apostrophes | Easy |

## First-Time Contributors

Look for issues tagged [`good first issue`](https://github.com/AviOfLagos/openAdapter/labels/good%20first%20issue). These are scoped, well-documented, and a great way to get familiar with the codebase.

Good first contributions:
- Fix the Unicode regex in `rateLimiter.js` (Issue #2 in backlog)
- Move a hardcoded config value to an environment variable
- Add a missing unit test
- Improve error messages
- Update selectors when Claude changes their UI

## Questions?

- Open a [Discussion](https://github.com/AviOfLagos/openAdapter/discussions) for questions or ideas
- File an [Issue](https://github.com/AviOfLagos/openAdapter/issues) for bugs or feature requests

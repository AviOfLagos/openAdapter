# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

OpenAdapter is a monorepo containing two apps:

1. **Adapter Server** (`apps/server/`) — A local Express server that bridges claude.ai's web interface into an OpenAI-compatible API using Playwright. It launches a headful Chromium browser, automates the Claude web UI via DOM manipulation, and exposes `POST /v1/chat/completions` at `http://127.0.0.1:3001`. Includes a standalone CLI tool (`adapter.js`) and a remote management API (8 admin endpoints).

2. **Dashboard** (`apps/dashboard/`) — A Next.js 16 management interface with 4 tabs: Chat, Activities, Logs, Settings. The monitoring tabs connect to the adapter server's management API. The chat tab currently uses Vercel AI Gateway (not yet wired to OpenAdapter).

## Monorepo Setup

- **Package manager:** pnpm with workspaces
- **Build tool:** Turborepo
- **Workspace config:** `pnpm-workspace.yaml` (apps/*, packages/*)

## Commands

```bash
# Setup
pnpm install                       # Install all dependencies
cd apps/server && npx playwright install chromium  # Install browser

# Running (from monorepo root)
pnpm dev                           # Start both server (:3001) and dashboard (:3000)
pnpm dev:server                    # Server only
pnpm dev:dashboard                 # Dashboard only

# Testing
pnpm test                          # Run all tests via Turborepo
pnpm test:unit                     # Unit tests only (no server needed)
pnpm test:integration              # Integration tests (requires running server)

# Building
pnpm build                         # Build all apps

# From apps/server/ directly
npm start                          # Run unit tests then start server
npm run dev                        # Start server directly
npm run test:unit                  # Server unit tests
node src/adapter.js "your prompt"  # CLI tool

# Remote management
curl http://127.0.0.1:3001/admin/health           # Health check
curl -X POST http://127.0.0.1:3001/admin/session/restart  # Restart browser
```

No linter is configured for the server. The dashboard uses Next.js's built-in linting.

## Architecture

### Server (`apps/server/`)

**Request flow:** Client sends OpenAI-format POST → `server.js` extracts prompt/files via `extractPayload()` → gets or recovers a Playwright page via `sessionManager.getOrInitPage()` → types prompt into Claude's contenteditable input → polls DOM for response via `waitForCompletion()` → converts HTML to Markdown via `htmlToMd.htmlToMarkdown()` (runs in-browser via `page.evaluate()`) → checks for rate limits via `rateLimiter.checkRateLimit()` → returns OpenAI-shaped JSON or SSE stream.

**Key modules (all in `apps/server/src/`):**
- `server.js` — Express server, chat completions endpoint + management API, handles streaming/non-streaming, file uploads, system context deduplication
- `adapter.js` — Standalone CLI tool with its own browser lifecycle
- `lib/sessionManager.js` — Browser lifecycle with multi-tier recovery (L0-L4)
- `lib/htmlToMd.js` — DOM-to-Markdown converter. **Must remain free of Node.js globals** (runs in-browser via `page.evaluate()`)
- `lib/rateLimiter.js` — Rate limit detection from DOM and response text
- `lib/extractPayload.js` — OpenAI message parser and file handler
- `lib/managementController.js` — Remote management API (health, session control, logs, config)

**Tests (in `apps/server/tests/`):**
- Unit tests: `extractPayload`, `htmlToMd`, `rateLimiter`, `toolCallParser` — 61 tests, no server needed
- Integration tests: HTTP endpoint validation against a live server

### Dashboard (`apps/dashboard/`)

**Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Vercel AI SDK v6

**Key files:**
- `lib/openadapter-client.ts` — Type-safe API client for the adapter server
- `components/dashboard-tabs.tsx` — Tab navigation
- `components/server-health-monitor.tsx` — Real-time health metrics
- `components/logs-viewer.tsx` — Log viewer with search/filter
- `components/server-settings.tsx` — Session controls

## Important Constraints

- The browser **must run headful** (Cloudflare blocks headless Chromium)
- `htmlToMd.js` runs inside the browser — no `require()`, no Node APIs
- System context is deduplicated via MD5 hash in `sessionState.lastSystemContextHash`
- Server port is **3001** (dashboard uses 3000)
- Token counts in responses are estimates (char length / 4)
- Server code is CommonJS (`require`/`module.exports`); dashboard is TypeScript/ESM

## Coding Standards

- **Server:** CommonJS, `const`/`let` (no `var`), `async/await`, `appendLog()` for logging with `[moduleName]` prefixes
- **Dashboard:** TypeScript, React Server Components, shadcn/ui conventions
- **Selectors:** Always in `SELECTOR_CHAINS` objects, never hardcoded inline
- **Error responses:** OpenAI-shaped error objects with appropriate HTTP status codes
- **New logic:** Put in a new file under `lib/`, keep functions focused

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

OpenAdapter is a local Express server that bridges claude.ai's web interface into an OpenAI-compatible API using Playwright. It launches a headful Chromium browser, automates the Claude web UI via DOM manipulation, and exposes `POST /v1/chat/completions` at `http://127.0.0.1:3000`. There is also a standalone CLI tool (`adapter.js`) for one-off prompts.

## Commands

```bash
# Setup
npm install                        # Install dependencies
npx playwright install chromium    # Install Playwright's bundled Chromium

# Running the server
npm start                          # Run unit tests first, then start server (recommended)
npm run dev                        # Start server directly, skipping tests
node server.js                     # Alternative to npm run dev

# Testing (uses Node's built-in test runner)
npm test                           # Run all tests (unit + integration)
npm run test:unit                  # Unit tests only (no server needed)
npm run test:integration           # Integration tests (requires running server)

# CLI tool
node adapter.js "your prompt"      # Single prompt, exits after response

# Remote management (optional API key auth via ADMIN_API_KEY env var)
curl http://127.0.0.1:3000/admin/health           # Health check
curl -X POST http://127.0.0.1:3000/admin/session/restart  # Restart browser
```

No linter is configured.

## Architecture

**Request flow:** Client sends OpenAI-format POST → `server.js` extracts prompt/files via `extractPayload()` → gets or recovers a Playwright page via `sessionManager.getOrInitPage()` → types prompt into Claude's contenteditable input → polls DOM for response via `waitForCompletion()` → converts HTML to Markdown via `htmlToMd.htmlToMarkdown()` (runs in-browser via `page.evaluate()`) → checks for rate limits via `rateLimiter.checkRateLimit()` → returns OpenAI-shaped JSON or SSE stream.

**Key modules:**
- `server.js` — Express server, chat completions endpoint + management API, handles streaming/non-streaming, file uploads (base64 → temp file → Playwright file input), system context deduplication (MD5 hash), large prompt conversion to file attachments (>15k chars)
- `adapter.js` — Standalone CLI tool with its own browser lifecycle. Duplicates selector chains and DOM helpers from server.js (not shared)
- `lib/sessionManager.js` — Browser lifecycle with multi-tier recovery (L0: JS eval probe → L1: reload → L2: navigate to /new → L3: full browser restart → L4: fatal/503). Exports shared mutable `state` object
- `lib/htmlToMd.js` — Self-contained DOM→Markdown converter. **Must remain free of Node.js globals** because it's serialized and executed inside the browser via `page.evaluate()`
- `lib/rateLimiter.js` — Regex-based rate limit detection from DOM elements and response text, returns OpenAI-format 429 responses
- `lib/managementController.js` — Remote management API (health checks, session control, log access, stats tracking). Optional authentication via `ADMIN_API_KEY` environment variable

**Selector chains:** Both `server.js` and `adapter.js` define `SELECTOR_CHAINS` objects with fallback CSS selectors for Claude's UI elements (promptInput, sendButton, stopButton, responseBlocks, fileInput). These break when Claude updates their DOM and need manual inspection to fix.

**Concurrency:** The server handles one request at a time (`isGenerating` flag). Concurrent requests get 429.

**Browser profile:** `.browser-profile/` stores persistent Chromium session data so the user only logs in once. This directory is gitignored.

**Configuration values** (hardcoded in source files):
- `PORT`: 3000 (server listen port)
- `MAX_TIMEOUT_MS`: 180000ms (3 min) in server.js, 120000ms (2 min) in adapter.js — hard timeout waiting for Claude's response
- `STABLE_INTERVAL_MS`: 30000ms (30 sec) in server.js, 3000ms (3 sec) in adapter.js — content-unchanged threshold to consider response complete
- `POLL_MS`: 500ms — DOM polling interval
- `SESSION_TIMEOUT_MS`: 3600000ms (1 hr) — inactivity before starting a new conversation
- Large prompt threshold: 15000 chars — prompts exceeding this are converted to file attachments

## Important Constraints

- The browser **must run headful** (Cloudflare blocks headless Chromium)
- `htmlToMd.js`'s `htmlToMarkdown` function runs inside the browser — no `require()`, no Node APIs
- System context is deduplicated across requests using MD5 hashing stored in `sessionState.lastSystemContextHash`
- HTTP server timeouts are set to 10 minutes (600s) to support long Claude generations
- Token counts in responses are estimates (char length / 4), not real tokenization

## Testing

The project uses Node's built-in test runner (`node:test`). Tests are in `tests/`:
- **Unit tests** (`tests/unit/`): Test `extractPayload`, `htmlToMd`, and `rateLimiter` modules in isolation. No server needed.
- **Integration tests** (`tests/integration/`): Validate the HTTP endpoint against a live server. Requires the server to be running.

`npm start` runs unit tests before starting the server. Unit tests are fast and catch regressions in core modules.

## Coding Standards

When modifying code, follow these conventions:

- **Logging**: Use `appendLog()` in server code (writes to both console and `logs.txt`). Prefix log lines with `[moduleName]` for traceability (e.g., `[server]`, `[sessionManager]`)
- **Async**: Use `async/await` over raw promises
- **Variables**: Use `const`/`let`, never `var`
- **Selectors**: Add new selectors to `SELECTOR_CHAINS` objects rather than hardcoding them inline. Update both `server.js` and `adapter.js` if both need the same selector
- **Error responses**: Return OpenAI-shaped error objects with appropriate HTTP status codes (see `CONTRIBUTING.md` for format)
- **Functions**: Keep functions focused. If adding significant logic, put it in a new file under `lib/`

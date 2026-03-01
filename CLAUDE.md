# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

OpenAdapter is a local Express server that bridges claude.ai's web interface into an OpenAI-compatible API using Playwright. It launches a headful Chromium browser, automates the Claude web UI via DOM manipulation, and exposes `POST /v1/chat/completions` at `http://127.0.0.1:3000`. There is also a standalone CLI tool (`adapter.js`) for one-off prompts.

## Commands

```bash
npm install                        # Install dependencies
npx playwright install chromium    # Install Playwright's bundled Chromium
node server.js                     # Start the API server on port 3000
node adapter.js "your prompt"      # CLI: single prompt, exits after response
```

No test framework is configured. No linter is configured.

## Architecture

**Request flow:** Client sends OpenAI-format POST → `server.js` extracts prompt/files via `extractPayload()` → gets or recovers a Playwright page via `sessionManager.getOrInitPage()` → types prompt into Claude's contenteditable input → polls DOM for response via `waitForCompletion()` → converts HTML to Markdown via `htmlToMd.htmlToMarkdown()` (runs in-browser via `page.evaluate()`) → checks for rate limits via `rateLimiter.checkRateLimit()` → returns OpenAI-shaped JSON or SSE stream.

**Key modules:**
- `server.js` — Express server, single endpoint, handles streaming/non-streaming, file uploads (base64 → temp file → Playwright file input), system context deduplication (MD5 hash), large prompt conversion to file attachments (>15k chars)
- `adapter.js` — Standalone CLI tool with its own browser lifecycle. Duplicates selector chains and DOM helpers from server.js (not shared)
- `lib/sessionManager.js` — Browser lifecycle with multi-tier recovery (L0: JS eval probe → L1: reload → L2: navigate to /new → L3: full browser restart → L4: fatal/503). Exports shared mutable `state` object
- `lib/htmlToMd.js` — Self-contained DOM→Markdown converter. **Must remain free of Node.js globals** because it's serialized and executed inside the browser via `page.evaluate()`
- `lib/rateLimiter.js` — Regex-based rate limit detection from DOM elements and response text, returns OpenAI-format 429 responses

**Selector chains:** Both `server.js` and `adapter.js` define `SELECTOR_CHAINS` objects with fallback CSS selectors for Claude's UI elements (promptInput, sendButton, stopButton, responseBlocks, fileInput). These break when Claude updates their DOM and need manual inspection to fix.

**Concurrency:** The server handles one request at a time (`isGenerating` flag). Concurrent requests get 429.

**Browser profile:** `.browser-profile/` stores persistent Chromium session data so the user only logs in once. This directory is gitignored.

## Important Constraints

- The browser **must run headful** (Cloudflare blocks headless Chromium)
- `htmlToMd.js`'s `htmlToMarkdown` function runs inside the browser — no `require()`, no Node APIs
- System context is deduplicated across requests using MD5 hashing stored in `sessionState.lastSystemContextHash`
- HTTP server timeouts are set to 10 minutes (600s) to support long Claude generations
- Token counts in responses are estimates (char length / 4), not real tokenization

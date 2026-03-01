# Contributing to OpenAdapter

Thanks for your interest in contributing! This guide will help you understand the codebase and get productive quickly.

## Getting Started

1. Fork and clone the repo
2. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. On first run, a Chromium window opens — log into `claude.ai` manually. Your session persists in `.browser-profile/`.
5. Test with:
   ```bash
   curl http://127.0.0.1:3000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hello"}]}'
   ```

## Codebase Overview

```
open-adapter/
├── server.js               # Express API server — main entry point
├── adapter.js              # Standalone CLI tool (single prompt, exits)
├── lib/
│   ├── sessionManager.js   # Browser lifecycle & multi-tier recovery
│   ├── htmlToMd.js         # HTML-to-Markdown converter (runs in-browser)
│   └── rateLimiter.js      # Detects Claude rate limits from DOM & text
├── .browser-profile/       # Persistent Chromium session (gitignored)
├── temp_uploads/           # Temporary file attachments (auto-cleaned)
└── logs.txt                # Request/response logs (runtime)
```

### How a request flows

1. **`server.js`** receives a `POST /v1/chat/completions` request in OpenAI format
2. **`extractPayload()`** parses messages — extracts text, decodes base64 images/files, deduplicates system context
3. **`sessionManager.getOrInitPage()`** returns a live Playwright page (launching the browser on first call, recovering if needed)
4. The prompt is typed into Claude's chat input and submitted via DOM selectors
5. **`waitForCompletion()`** polls the DOM for Claude's response, calling `htmlToMd.htmlToMarkdown()` to convert HTML to Markdown
6. If streaming is enabled, chunks are sent as SSE events during polling
7. **`rateLimiter.checkRateLimit()`** inspects the response for rate-limit indicators
8. The response is returned in OpenAI chat completion format

### Key architectural decisions

**Selector chains** — All DOM interaction goes through `SELECTOR_CHAINS` at the top of `server.js` (and `adapter.js`). Each key maps to an ordered list of CSS selectors tried in sequence. This provides resilience when Claude's UI changes — only the first matching selector needs to work.

**Single-request gating** — The `isGenerating` flag ensures only one request runs at a time. This is intentional: we control a single browser tab, so concurrent DOM manipulation would corrupt state.

**In-browser Markdown conversion** — `htmlToMd.js` exports a function that is serialized and executed inside Chromium via `page.evaluate()`. This means:
- It **cannot** use `require()`, `import`, or any Node.js APIs
- It **cannot** reference variables outside its own function scope
- It receives a DOM `Element` as its argument and returns a string
- If you modify it, test by running a real request — unit testing requires a browser context

**Session recovery tiers** — `sessionManager.js` implements escalating recovery:

| Level | Action | When it's tried |
|-------|--------|-----------------|
| L0 | JS eval liveness check | Every request (health gate) |
| L1 | Page reload | Page is unresponsive |
| L2 | Navigate to `claude.ai/new` | Reload didn't help |
| L3 | Kill browser + relaunch | Navigation failed |
| L4 | Return null (503 to client) | Everything failed |

**System context deduplication** — System messages are hashed (MD5). If the hash matches the previous request, the system context isn't re-uploaded as a file attachment, saving time and avoiding redundant context.

## Making Changes

### Updating selectors

Claude's UI changes periodically. When it does:

1. Open `claude.ai` in Chrome
2. Right-click the element (input box, send button, etc.) and Inspect (F12)
3. Find a stable selector (prefer `data-testid`, `aria-label`, or semantic attributes over class names)
4. Add your selector to the appropriate array in `SELECTOR_CHAINS` — put the most reliable one first
5. Update both `server.js` and `adapter.js` if both use the same chain

### Adding new DOM interactions

Use the existing helper functions:

```js
// Find a single element (tries each selector in order)
const { el, selector } = await findElement(page, 'chainKey');

// Find all matching elements
const { els, selector } = await findAllElements(page, 'chainKey');

// Wait for any selector in the chain to appear
await waitForAny(page, 'chainKey', { timeout: 15000, state: 'visible' });
```

Add your new selectors to the `SELECTOR_CHAINS` object rather than hardcoding them inline.

### Modifying htmlToMd.js

Remember this function runs **inside Chromium**, not in Node.js. To test changes:

1. Start the server
2. Send a request that triggers the formatting you changed (tables, code blocks, etc.)
3. Check the response content and `logs.txt` for the output
4. If `page.evaluate()` throws, the server falls back to `innerText()` — check the logs for `"htmlToMarkdown eval failed"` messages

### Adding new API features

The server returns OpenAI-compatible responses. If you're adding new fields or endpoints:

- Follow the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) format
- Add logging via `appendLog()` (writes to both console and `logs.txt`)
- Respect the `isGenerating` gate for anything that touches the browser
- Return appropriate HTTP status codes and OpenAI-shaped error objects:
  ```js
  res.status(400).json({
    error: { message: '...', type: 'invalid_request_error' }
  });
  ```

## Testing

There is no automated test suite yet (this is a good area for contribution). To test manually:

```bash
# Start the server
node server.js

# Non-streaming request
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Say hello"}]}'

# Streaming request
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Say hello"}], "stream": true}'

# CLI tool
node adapter.js "Say hello"
```

Check `logs.txt` for detailed request/response logs.

## Areas for Contribution

Here are concrete improvements that would be valuable:

- **Selector updates** — keep selectors current when Claude's UI changes
- **Automated tests** — mock the Playwright page and test `extractPayload()`, `htmlToMarkdown()`, rate limit detection, etc.
- **Better streaming** — replace DOM polling with MutationObserver or CDP event listeners for lower latency
- **Headless mode** — find workarounds for Cloudflare's headless detection
- **Multi-tab concurrency** — manage multiple browser tabs to handle parallel requests
- **Conversation continuity** — maintain multi-turn conversations across API requests instead of starting fresh
- **Config file** — move hardcoded values (port, timeouts, selectors) to a `.env` or config file
- **Docker support** — containerize with Xvfb for running on servers without a display

## Style Guidelines

- Use `const` / `let`, no `var`
- Use `async/await` over raw promises
- Log with `appendLog()` in server code, `console.error()` for status in the CLI tool
- Keep functions focused — if adding significant logic, put it in a new file under `lib/`
- Prefix log lines with `[moduleName]` for traceability (e.g., `[server]`, `[sessionManager]`)

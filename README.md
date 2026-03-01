# OpenAdapter

A local server that bridges Claude's web interface (`claude.ai`) into an **OpenAI-compatible API** using Playwright. Send requests to `http://127.0.0.1:3000/v1/chat/completions` and get responses back — no API key required. It uses your existing browser login session.

Built to work with any tool that speaks the OpenAI chat completions format (e.g. [OpenClaw](https://github.com/nicholasgriffintn/openclaw), custom scripts, IDE plugins, etc.).

## How It Works

```
Your App / Client                  OpenAdapter                    claude.ai
─────────────────       ───────────────────────────────       ───────────────
                           Express server (:3000)
  POST /v1/chat/    ──>   Receives OpenAI-format req    ──>   Types prompt
  completions              Manages Playwright browser          into chat UI
                           Polls DOM for response
  OpenAI-format     <──   Extracts & converts HTML      <──   Claude generates
  JSON / SSE stream        to Markdown                         response
```

1. Launches Chromium with a persistent profile (session stays logged in across restarts)
2. Receives OpenAI-format chat completion requests over HTTP
3. Extracts the user prompt and any file attachments (images, documents)
4. Types the prompt into Claude's web UI and submits it
5. Polls the DOM for the response, streaming chunks via SSE if requested
6. Converts Claude's HTML response to clean Markdown
7. Returns an OpenAI-compatible response (or SSE stream)

## Requirements

- Node.js v18+
- npm
- A graphical desktop (the browser runs headful — no headless mode due to Cloudflare)

## Setup

### macOS

```bash
git clone <repo-url> open-adapter
cd open-adapter
npm install
npx playwright install chromium
```

> Playwright downloads its own bundled Chromium — you don't need Chrome installed.

### Windows

```powershell
git clone <repo-url> open-adapter
cd open-adapter
npm install
npx playwright install chromium
```

> Use PowerShell or Windows Terminal. Command Prompt (`cmd`) works too but PowerShell is recommended.

### Linux

```bash
git clone <repo-url> open-adapter
cd open-adapter
npm install
npx playwright install chromium
# Playwright may prompt you to install system dependencies:
npx playwright install-deps chromium
```

> On Linux, Playwright needs certain system libraries (libnss3, libatk-bridge, etc.). The `install-deps` command installs them automatically (requires sudo).

## First Run (Login)

On the first run, the browser opens to `claude.ai`. You must log in manually once:

```bash
node server.js
```

1. The browser opens to `claude.ai`
2. Log in with your credentials
3. Your session is saved in `.browser-profile/` and persists across restarts
4. The server is now ready at `http://127.0.0.1:3000`

## Usage

### Start the server

```bash
npm start        # Runs unit tests first, then starts the server (recommended)
npm run dev      # Starts the server directly, skipping tests
```

The server listens on `http://127.0.0.1:3000`.

### Send a request (non-streaming)

```bash
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is 2+2?"}]
  }'
```

### Send a request (streaming)

```bash
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Explain recursion"}],
    "stream": true
  }'
```

### Send images or files (base64)

The adapter supports OpenAI's multimodal message format:

```bash
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
      ]
    }]
  }'
```

### CLI adapter (standalone)

The original CLI tool is also available for one-off queries without running the server:

```bash
node adapter.js "What is 2+2?"
```

Output goes to stdout. Status messages go to stderr, so you can pipe cleanly:

```bash
node adapter.js "List 5 prime numbers" | grep -i prime
```

## Project Structure

```
open-adapter/
├── server.js               # Express API server (OpenAI-compatible endpoint)
├── adapter.js              # Standalone CLI tool (single-prompt, exits after)
├── lib/
│   ├── sessionManager.js   # Browser lifecycle & multi-tier session recovery
│   ├── extractPayload.js   # OpenAI message parser & file attachment handler
│   ├── htmlToMd.js         # HTML-to-Markdown converter (runs in-browser)
│   └── rateLimiter.js      # Detects Claude rate limits from DOM & response text
├── tests/
│   ├── unit/               # Unit tests (extractPayload, htmlToMd, rateLimiter)
│   └── integration/        # Integration tests (HTTP endpoint validation)
├── .browser-profile/       # Persistent Chromium session (created on first run)
├── temp_uploads/           # Temporary directory for file attachments
├── logs.txt                # Request/response logs (created at runtime)
├── package.json
└── README.md
```

## Architecture

### server.js — API Server

The main entry point. An Express server that:

- Accepts `POST /v1/chat/completions` in OpenAI chat format
- Supports both regular JSON responses and SSE streaming (`"stream": true`)
- Handles multimodal content: text, base64 images (`image_url`), and file attachments (`file_url`)
- Deduplicates system context across requests (hashes system messages, only re-uploads when changed)
- Converts large prompts (>15k chars) to file attachments automatically
- Logs all requests and responses to `logs.txt`
- Returns OpenAI-shaped responses with estimated token counts

### lib/sessionManager.js — Browser Lifecycle

Manages the Playwright browser with multi-tier recovery:

| Level | Strategy | Description |
|-------|----------|-------------|
| L0 | `isPageAlive()` | Quick JS eval liveness probe |
| L1 | `reloadPage()` | Reload the current page |
| L2 | `newChat()` | Navigate to `claude.ai/new` (fresh conversation) |
| L3 | `restartBrowser()` | Close browser context + relaunch Playwright |
| L4 | Fatal | Return null, server responds with 503 |

Sessions auto-timeout after 1 hour of inactivity, starting a fresh conversation.

### lib/htmlToMd.js — HTML to Markdown

A self-contained DOM-to-Markdown converter that runs inside the browser via `page.evaluate()`. Handles headings, bold/italic, code blocks (with language detection), tables, lists, checkboxes, links, images, blockquotes, and horizontal rules.

### lib/rateLimiter.js — Rate Limit Detection

Detects Claude's rate limiting by:
1. Scanning the DOM for error/alert elements
2. Pattern-matching the response text against known rate-limit phrases
3. Parsing retry-after durations from the message

Returns OpenAI-format `429` responses with `Retry-After` headers.

### adapter.js — CLI Tool

The original proof-of-concept. A standalone script that launches its own browser, sends a single prompt, captures the response, and exits. Useful for quick scripting without running the server.

## Configuration

### Server (server.js)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server listen port |
| `MAX_TIMEOUT_MS` | `180000` (3 min) | Hard timeout waiting for Claude's response |
| `STABLE_INTERVAL_MS` | `30000` (30 sec) | Content-unchanged = done threshold |
| `POLL_MS` | `500` | DOM polling interval |
| `SESSION_TIMEOUT_MS` | `3600000` (1 hr) | Inactivity before starting a new conversation |

### CLI (adapter.js)

| Variable | Default | Description |
|---|---|---|
| `CLAUDE_URL` | `https://claude.ai/new` | Starting URL |
| `USER_DATA_DIR` | `.browser-profile/` | Persistent browser session directory |
| `MAX_TIMEOUT_MS` | `120000` (2 min) | Hard timeout for response |
| `STABLE_INTERVAL_MS` | `3000` (3 sec) | Content-unchanged = done threshold |
| `POLL_MS` | `500` | Polling interval |

## Selectors

Both the server and CLI use fallback selector chains to find UI elements. If Claude updates their UI, edit `SELECTOR_CHAINS`:

```
promptInput:    div[contenteditable="true"] → div[role="textbox"] → ...
sendButton:     button[aria-label*="Send"] → button[data-testid="send-button"]
stopButton:     button[aria-label*="Stop"] → button[data-testid="stop-button"]
responseBlocks: div[data-testid*="message"] → div.font-claude-response → ...
fileInput:      input[type="file"]
```

To inspect current selectors, open `claude.ai` in Chrome DevTools (F12) and inspect the elements.

## Testing

```bash
npm test              # Run all tests (unit + integration)
npm run test:unit     # Unit tests only (no server needed)
npm run test:integration  # Integration tests (requires running server)
```

Unit tests cover the core modules (`extractPayload`, `htmlToMd`, `rateLimiter`) and run automatically before the server starts when using `npm start`.

Integration tests validate the HTTP endpoint (request validation, CORS, response shape) against a live server.

## Limitations

- **Headful only** — a visible browser window is required (Cloudflare blocks headless)
- **Single request at a time** — concurrent requests return 429 (busy)
- **No login automation** — you log in manually once; session persists in `.browser-profile/`
- **Selectors may break** — Claude UI updates can change the DOM structure
- **No conversation memory** — each server session timeout starts a fresh chat
- **Token counts are estimates** — calculated from character length, not actual tokenization

## Troubleshooting

| Problem | Fix |
|---|---|
| "Prompt input element not found" | Claude's UI changed. Inspect the page and update `SELECTOR_CHAINS` |
| Cloudflare challenge page | Must run headful (default). Don't set `headless: true` |
| Login not persisting | Ensure `.browser-profile/` exists and isn't being deleted |
| Timeout with no response | Increase `MAX_TIMEOUT_MS` or check if Claude is down |
| Browser doesn't open | Run `npx playwright install chromium` |
| 503 session recovery failed | All recovery tiers failed. Restart `node server.js` |
| 429 rate limit | Claude's free/pro message limit hit. Wait for the retry-after period |
| **Linux:** missing shared libraries | Run `npx playwright install-deps chromium` to install system dependencies |
| **Linux:** no display / `DISPLAY not set` | You need a graphical desktop. For headless servers, use Xvfb: `xvfb-run node server.js` |
| **Windows:** `npx` not recognized | Ensure Node.js is in your PATH. Reinstall Node.js using the official installer and check "Add to PATH" |
| **macOS:** Chromium blocked by Gatekeeper | Go to System Settings > Privacy & Security and click "Allow Anyway" for the Chromium binary |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide — architecture walkthrough, request flow, how to update selectors, style guidelines, and areas where help is welcome.

## License

ISC

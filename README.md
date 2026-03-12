# OpenAdapter

> **Self-hosted OpenAI-compatible API for Claude.ai** — no API key required.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

OpenAdapter is a local server that bridges Claude's web interface into an **OpenAI-compatible REST API** using Playwright browser automation. It lets you use Claude with any tool that speaks the OpenAI chat completions format — [OpenClaw](https://github.com/openclaw/openclaw), [Continue.dev](https://continue.dev), custom scripts, IDE plugins, and more.

**Free & Open Source** | **Streaming Support** | **File Uploads** | **Management Dashboard**

---

## Project Status

OpenAdapter is in active development. The core adapter server is **stable and functional**. A Next.js management dashboard is in progress.

| Component | Status | Location |
|-----------|--------|----------|
| **Adapter Server** | Stable — 61 unit tests passing | `apps/server/` |
| **CLI Tool** | Stable | `apps/server/src/adapter.js` |
| **Management API** | Stable — 8 admin endpoints | `apps/server/src/lib/managementController.js` |
| **Dashboard UI** | In progress — builds, monitoring tabs work, chat not yet wired to adapter | `apps/dashboard/` |
| **Tool Calling** | Designed, implementation in progress | [feature/tool-calling branch](https://github.com/AviOfLagos/openAdapter/tree/feature/tool-calling) |

See the [Roadmap](docs/ROADMAP.md) for what's planned and where help is needed.

---

## How It Works

```
Your App / Client                  OpenAdapter                    claude.ai
─────────────────       ───────────────────────────────       ───────────────
                           Express server (:3001)
  POST /v1/chat/    ──>   Receives OpenAI-format req    ──>   Types prompt
  completions              Manages Playwright browser          into chat UI
                           Polls DOM for response
  OpenAI-format     <──   Extracts & converts HTML      <──   Claude generates
  JSON / SSE stream        to Markdown                         response
```

1. Launches Chromium with a persistent profile (session stays logged in across restarts)
2. Receives OpenAI-format chat completion requests over HTTP
3. Types the prompt into Claude's web UI and submits it
4. Polls the DOM for the response, streaming chunks via SSE if requested
5. Converts Claude's HTML response to clean Markdown
6. Returns an OpenAI-compatible response

## Requirements

- **Node.js v18+** and **pnpm** (monorepo uses pnpm workspaces)
- A graphical desktop (the browser runs headful — Cloudflare blocks headless)

## Quick Start

```bash
# Clone and install
git clone https://github.com/AviOfLagos/openAdapter.git
cd openAdapter
pnpm install

# Install Playwright's bundled Chromium
cd apps/server && npx playwright install chromium && cd ../..
# On Linux, also run: npx playwright install-deps chromium

# Start both server and dashboard
pnpm dev
```

On first run, a Chromium window opens to `claude.ai` — log in manually once. Your session persists in `.browser-profile/`.

- **Server:** http://127.0.0.1:3001
- **Dashboard:** http://localhost:3000

### Server Only

```bash
pnpm dev:server     # Start adapter server only (port 3001)
```

### Test It

```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is 2+2?"}]}'
```

## Usage

### Non-streaming

```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is 2+2?"}]}'
```

### Streaming (SSE)

```bash
curl http://127.0.0.1:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Explain recursion"}],
    "stream": true
  }'
```

### Images / Files (base64)

```bash
curl http://127.0.0.1:3001/v1/chat/completions \
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

### CLI Tool

```bash
node apps/server/src/adapter.js "What is 2+2?"
```

### OpenClaw Integration

```yaml
# In your OpenClaw config:
llm:
  provider: openai
  api_base: "http://127.0.0.1:3001/v1"
  api_key: "dummy-key-not-used"
  model: "claude-sonnet-4.5"
  streaming: true
```

Works with any OpenAI-compatible tool: [OpenClaw](https://github.com/openclaw/openclaw), [Continue.dev](https://continue.dev), Cursor, custom scripts, etc.

## Management API

Monitor and control the server remotely:

```bash
curl http://127.0.0.1:3001/admin/health        # Health + statistics
curl http://127.0.0.1:3001/admin/status         # Simple status check
curl -X POST http://127.0.0.1:3001/admin/session/restart  # Restart browser
curl http://127.0.0.1:3001/admin/logs?lines=50  # Recent logs
```

Optional API key auth: set `ADMIN_API_KEY` environment variable. See [REMOTE_MANAGEMENT.md](REMOTE_MANAGEMENT.md) for all 8 endpoints.

## Project Structure

```
openAdapter/
├── apps/
│   ├── server/                  # Express adapter server (port 3001)
│   │   ├── src/
│   │   │   ├── server.js        # Main server + OpenAI endpoint
│   │   │   ├── adapter.js       # Standalone CLI tool
│   │   │   └── lib/
│   │   │       ├── sessionManager.js       # Browser lifecycle + recovery
│   │   │       ├── extractPayload.js       # OpenAI message parser
│   │   │       ├── htmlToMd.js             # HTML→Markdown (runs in-browser)
│   │   │       ├── rateLimiter.js          # Rate limit detection
│   │   │       └── managementController.js # Admin API endpoints
│   │   └── tests/
│   │       ├── unit/            # 61 unit tests
│   │       └── integration/     # HTTP endpoint tests
│   │
│   └── dashboard/               # Next.js management UI (port 3000)
│       ├── app/                 # Routes (chat, activities, logs, settings)
│       ├── components/          # React components + shadcn/ui
│       └── lib/                 # API client, utilities
│
├── packages/                    # Shared packages (planned)
├── turbo.json                   # Turborepo config
├── pnpm-workspace.yaml          # Workspace definition
└── docs/                        # Roadmap, strategy, backlog
```

## Testing

```bash
pnpm test:unit          # Unit tests (no server needed) — fast
pnpm test               # All tests
pnpm dev:server         # Then in another terminal:
pnpm test:integration   # Integration tests against live server
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server listen port |
| `MAX_TIMEOUT_MS` | `180000` (3 min) | Hard timeout for Claude's response |
| `STABLE_INTERVAL_MS` | `30000` (30 sec) | Content-unchanged = done threshold |
| `POLL_MS` | `500` | DOM polling interval |
| `SESSION_TIMEOUT_MS` | `3600000` (1 hr) | Inactivity before new conversation |
| `ADMIN_API_KEY` | none | Optional API key for management endpoints |

## Limitations

- **Headful only** — a visible browser window is required (Cloudflare blocks headless)
- **Single request at a time** — concurrent requests return 429 (busy)
- **No login automation** — you log in manually once; session persists in `.browser-profile/`
- **Selectors may break** — Claude UI updates can change the DOM structure
- **Token counts are estimates** — calculated from character length, not actual tokenization

## Troubleshooting

| Problem | Fix |
|---|---|
| "Prompt input element not found" | Claude's UI changed. Inspect the page and update `SELECTOR_CHAINS` |
| Cloudflare challenge page | Must run headful (default). Don't set `headless: true` |
| Login not persisting | Ensure `.browser-profile/` exists and isn't being deleted |
| Timeout with no response | Increase `MAX_TIMEOUT_MS` or check if Claude is down |
| Browser doesn't open | Run `npx playwright install chromium` in `apps/server/` |
| 503 session recovery failed | All recovery tiers failed. Restart the server |
| 429 rate limit | Claude's message limit hit. Wait for the retry-after period |
| Dashboard can't connect | Check server is running on port 3001 |
| **Linux:** missing shared libraries | Run `npx playwright install-deps chromium` |
| **Linux:** no display | You need a graphical desktop. For headless servers: `xvfb-run node server.js` |

## Contributing

We welcome contributions! OpenAdapter is an open project and we want to make it easy for anyone to help improve it.

### Where to Start

1. Check [Issues](https://github.com/AviOfLagos/openAdapter/issues) for open tasks
2. Look for [`good first issue`](https://github.com/AviOfLagos/openAdapter/labels/good%20first%20issue) labels
3. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide
4. See the [Roadmap](docs/ROADMAP.md) for the big picture

### High-Impact Areas

- **Tool calling support** — the biggest gap; needed for OpenClaw skills, subagents, and MCP
- **Dashboard chat integration** — wire the dashboard's chat tab to OpenAdapter instead of Vercel AI Gateway
- **Selector updates** — keep selectors current when Claude changes their UI
- **Better streaming** — replace DOM polling with MutationObserver
- **Docker support** — containerize with Xvfb for headless server environments

### Community

- [Discussions](https://github.com/AviOfLagos/openAdapter/discussions) — questions, ideas, workflows
- [Issues](https://github.com/AviOfLagos/openAdapter/issues) — bugs and feature requests

## License

[MIT](LICENSE)

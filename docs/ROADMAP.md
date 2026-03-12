# OpenAdapter Roadmap

This roadmap shows what's been done, what's in progress, and what's planned. Contributions welcome at every phase.

## Phase 1: Foundation — Complete

- [x] Express server with OpenAI-compatible `/v1/chat/completions` endpoint
- [x] Playwright browser automation with persistent session
- [x] SSE streaming support
- [x] Multi-tier session recovery (L0-L4)
- [x] HTML-to-Markdown conversion
- [x] Rate limit detection
- [x] Base64 image/file upload support
- [x] System context deduplication
- [x] Standalone CLI adapter
- [x] Unit test suite (61 tests passing)
- [ ] Fix Unicode regex bug in rate limiter
- [ ] Extract shared DOM helpers from server.js/adapter.js
- [ ] Move config to environment variables / `.env` file

## Phase 2: Tool Calling — In Progress

Design complete, implementation on `feature/tool-calling` branch.

- [x] Tool call parser module (`toolCallParser.js`)
- [x] File-based tool definition injection (avoids inline prompt manipulation)
- [x] Tool call response formatting (OpenAI-compatible `tool_calls` array)
- [x] Streaming tool call deltas (`delta.tool_calls`)
- [x] Unit tests for tool parsing (40+ tests)
- [ ] End-to-end testing with real Claude responses
- [ ] Multi-turn tool calling conversations
- [ ] Handle `role: "tool"` messages in input

## Phase 3: Monorepo + Dashboard — In Progress

Monorepo migration complete, dashboard UI built, integration pending.

- [x] Turborepo + pnpm workspace setup
- [x] Server migrated to `apps/server/` (port 3001)
- [x] Remote management API (8 admin endpoints)
- [x] Next.js 16 dashboard with 4-tab interface
- [x] Server Activities monitoring (real-time health, stats)
- [x] Log viewer (search, filter, download)
- [x] Settings panel (session controls)
- [ ] **Wire dashboard chat to OpenAdapter** (currently uses Vercel AI Gateway)
- [ ] End-to-end testing of dashboard + server
- [ ] Mobile responsive polish

## Phase 4: Full OpenClaw Compatibility — Planned

Depends on Phase 2 (tool calling).

- [ ] Skills execution via tool calling
- [ ] Subagent spawning support
- [ ] Cron job management
- [ ] File/shell operations
- [ ] MCP server tool integration
- [ ] Multi-turn conversation context preservation

## Phase 5: DevOps & Scale — Planned

- [ ] Docker support with Xvfb (headless server deployment)
- [ ] Replace DOM polling with MutationObserver
- [ ] Multi-tab concurrency for parallel requests
- [ ] GitHub Actions CI improvements
- [ ] Deployment guide (VPS, Docker, Vercel for dashboard)

---

## How to Contribute to the Roadmap

1. Pick an unchecked item from any phase
2. Check [Issues](https://github.com/AviOfLagos/openAdapter/issues) to see if someone's already working on it
3. If not, open an issue to claim it and start a PR
4. Items marked "Planned" are open for design discussion — feel free to propose approaches

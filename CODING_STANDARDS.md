# Coding Standards

Rules and conventions for contributing to OpenAdapter.

## Language & Style

- **CommonJS** — this project uses `require()` / `module.exports` (no ES modules)
- Use `const` and `let`, never `var`
- Use `async/await` over raw `.then()` chains
- Use template literals over string concatenation
- Semicolons required
- Single quotes for strings (except when the string contains a single quote)

## File Organization

- Business logic goes in `lib/` as separate modules
- Each module should export a clear, focused API
- Functions that run inside the browser (via `page.evaluate()`) **must not** use `require()`, Node.js APIs, or reference external variables — they are serialized and executed in Chromium
- Keep `server.js` as the thin orchestration layer — extract logic into `lib/` modules when it grows

## Naming

- Files: `camelCase.js` (e.g., `sessionManager.js`, `rateLimiter.js`)
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for config values, `camelCase` for everything else
- Log prefixes: `[moduleName]` (e.g., `[server]`, `[sessionManager]`, `[rateLimiter]`)

## Logging

- In the server: use `appendLog()` — writes to both console and `logs.txt`
- In the CLI adapter: use `console.error()` for status, `console.log()` for output
- Always prefix with `[moduleName]` for traceability

## Error Handling

- Return OpenAI-shaped error responses:
  ```js
  res.status(400).json({
      error: { message: '...', type: 'invalid_request_error' }
  });
  ```
- Use standard HTTP codes: 400 (bad request), 429 (rate limit/busy), 500 (server error), 503 (session dead)
- Never crash the server — catch errors in request handlers and return proper responses

## DOM Selectors

- All selectors go in the `SELECTOR_CHAINS` object, never inline
- Order selectors most-reliable-first (prefer `data-testid`, `aria-label` over class names)
- When Claude's UI changes, update selectors in both `server.js` and `adapter.js`

## Testing

- Tests live in `tests/unit/` and `tests/integration/`
- Test framework: Node's built-in `node:test` + `node:assert/strict`
- Name test files `<module>.test.js`
- Unit tests must not require a running server or browser
- Integration tests can assume a running server but should gracefully skip if it's not available

## Pre-push Checklist

Before pushing code:

```bash
# 1. Run unit tests (must all pass)
npm run test:unit

# 2. If server is running, also run integration tests
npm run test:integration

# 3. Check that server starts without errors
npm start
# (this runs unit tests automatically, then starts the server)

# 4. Test a basic request manually
curl http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"say hi"}]}'
```

## Git Conventions

- Create a branch for your work — never push directly to `main`
- Open a PR and ensure tests pass before merging
- Commit messages: imperative mood, concise first line (e.g., "Add tool calling support", "Fix rate limiter regex")
- One logical change per commit — don't mix unrelated changes

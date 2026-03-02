# OpenAdapter Monorepo Architecture - Visual Diagrams

**Date:** 2026-03-02
**Purpose:** Visual reference for monorepo structure, data flow, and build pipeline

---

## 1. Directory Tree Structure

```
openAdapter/                           # Monorepo root
│
├── apps/                              # Deployable applications
│   ├── server/                        # Express + Playwright backend
│   │   ├── src/
│   │   │   ├── server.js              # Main HTTP server (port 3001)
│   │   │   ├── adapter.js             # Standalone CLI tool
│   │   │   ├── lib/
│   │   │   │   ├── sessionManager.js  # Browser lifecycle manager
│   │   │   │   ├── htmlToMd.js        # DOM→Markdown converter
│   │   │   │   ├── rateLimiter.js     # Rate limit detection
│   │   │   │   └── extractPayload.js  # Request payload parser
│   │   │   └── routes/
│   │   │       ├── completions.js     # POST /v1/chat/completions
│   │   │       └── management.js      # Admin/health endpoints
│   │   ├── tests/
│   │   │   ├── unit/                  # Fast, isolated tests
│   │   │   └── integration/           # Server-dependent tests
│   │   ├── temp_uploads/              # File upload temp storage
│   │   ├── .browser-profile/          # Chromium session (gitignored)
│   │   ├── package.json               # Server dependencies
│   │   └── README.md
│   │
│   └── dashboard/                     # Next.js 15 frontend
│       ├── src/
│       │   ├── app/                   # App Router pages
│       │   │   ├── layout.tsx         # Root layout
│       │   │   ├── page.tsx           # Home page
│       │   │   ├── chat/
│       │   │   │   └── page.tsx       # AI Chat interface
│       │   │   ├── activities/
│       │   │   │   └── page.tsx       # Server Activities dashboard
│       │   │   ├── logs/
│       │   │   │   └── page.tsx       # Log viewer
│       │   │   ├── settings/
│       │   │   │   └── page.tsx       # Settings
│       │   │   └── api/
│       │   │       ├── chat/
│       │   │       │   └── route.ts   # Vercel AI SDK endpoint
│       │   │       └── health/
│       │   │           └── route.ts   # Proxy to server health
│       │   ├── components/
│       │   │   ├── ui/                # shadcn/ui components
│       │   │   ├── ServerStatus.tsx
│       │   │   ├── LogViewer.tsx
│       │   │   ├── SessionControls.tsx
│       │   │   └── ChatInterface.tsx
│       │   └── lib/
│       │       ├── openadapter-client.ts # HTTP client
│       │       └── utils.ts
│       ├── public/
│       ├── next.config.js             # Next.js configuration
│       ├── tailwind.config.ts         # Tailwind configuration
│       ├── package.json               # Dashboard dependencies
│       └── README.md
│
├── packages/                          # Shared libraries
│   ├── shared/                        # Shared types, schemas, utils
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── openai.ts         # OpenAI API types
│   │   │   │   ├── management.ts     # Management API types
│   │   │   │   ├── config.ts         # Configuration types
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── validation.ts
│   │   │   │   └── index.ts
│   │   │   ├── tools/                # Vercel AI SDK tool schemas
│   │   │   │   ├── schemas.ts        # Zod schemas
│   │   │   │   ├── handlers.ts       # Tool execution
│   │   │   │   └── index.ts
│   │   │   └── index.ts              # Main exports
│   │   ├── dist/                     # Build output (gitignored)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts            # Build configuration
│   │   └── README.md
│   │
│   ├── ui/                            # Shared UI components (optional)
│   │   ├── src/
│   │   │   └── components/
│   │   └── package.json
│   │
│   └── tsconfig/                      # Shared TypeScript configs
│       ├── base.json                  # Base configuration
│       ├── nextjs.json                # Next.js specific
│       ├── node.json                  # Node.js specific
│       └── package.json
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Continuous Integration
│   │   └── release.yml                # Release automation
│   └── ISSUE_TEMPLATE/
│
├── docs/                              # Documentation
│   └── ...
│
├── research/                          # Research documents
│   ├── MONOREPO_ARCHITECTURE.md       # Complete guide (this file)
│   ├── MIGRATION_CHECKLIST.md         # Step-by-step tasks
│   ├── ARCHITECTURE_SUMMARY.md        # Executive summary
│   ├── ARCHITECTURE_DIAGRAM.md        # Visual diagrams
│   ├── VERCEL_AI_SDK_FINDINGS.md      # AI SDK research
│   └── DASHBOARD_DESIGN.md            # UI/UX design
│
├── .gitignore                         # Git ignore patterns
├── .npmrc                             # PNPM configuration
├── pnpm-workspace.yaml                # Workspace definition
├── turbo.json                         # Turborepo pipeline
├── package.json                       # Root package.json
├── README.md                          # Monorepo README
├── CLAUDE.md                          # Claude Code instructions
├── CONTRIBUTING.md
├── LICENSE
└── DASHBOARD_PLAN.md
```

---

## 2. Package Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                      MONOREPO ROOT                          │
│                    (pnpm workspaces)                        │
└─────────────────────────────────────────────────────────────┘
           │                              │
           │                              │
           ▼                              ▼
    ┌──────────┐                   ┌──────────┐
    │   APPS   │                   │ PACKAGES │
    └──────────┘                   └──────────┘
           │                              │
     ┌─────┴─────┐                  ┌─────┴─────────┬─────────┐
     │           │                  │               │         │
     ▼           ▼                  ▼               ▼         ▼
┌─────────┐ ┌──────────┐    ┌──────────┐  ┌──────────┐  ┌──────────┐
│ SERVER  │ │DASHBOARD │    │  SHARED  │  │    UI    │  │ TSCONFIG │
│         │ │          │    │          │  │          │  │          │
│ Node.js │ │ Next.js  │    │TypeScript│  │  React   │  │   Base   │
│ Express │ │  React   │    │  Types   │  │Components│  │  Configs │
│Playwright│ │  AI SDK │    │  Schemas │  │ (optional)│  │          │
└─────────┘ └──────────┘    └──────────┘  └──────────┘  └──────────┘
     │           │                │              │              │
     │           │                │              │              │
     │           └────────────────┼──────────────┘              │
     │                            │                             │
     └────────────────────────────┤                             │
                                  │                             │
                                  ▼                             │
                          depends on "workspace:*"             │
                                                                │
                                                                ▼
                                                         extends configs

Legend:
─────  Dependency relationship
workspace:*  Local package reference
```

---

## 3. Build Pipeline Flow (Turborepo)

```
┌──────────────────────────────────────────────────────────────┐
│  USER RUNS: pnpm dev                                         │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Turborepo reads turbo.json                                  │
│  Analyzes task dependencies                                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Check Cache  │
                    └───────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
         [Cache Hit]               [Cache Miss]
         Use cached                Build from
         artifacts                 source
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Build Dependencies                                  │
│  Execute: packages/shared -> pnpm build                      │
│  Output: dist/ (ESM + CJS + types)                           │
│  Duration: ~5s (first time), ~1s (cached)                    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Run Apps in Parallel                                │
│  ┌────────────────────┐  ┌────────────────────┐             │
│  │  Server: dev       │  │  Dashboard: dev    │             │
│  │  node src/server.js│  │  next dev          │             │
│  │  Port: 3001        │  │  Port: 3000        │             │
│  └────────────────────┘  └────────────────────┘             │
│         │                         │                          │
│         │                         │                          │
└─────────┼─────────────────────────┼──────────────────────────┘
          │                         │
          ▼                         ▼
   ┌────────────┐          ┌────────────────┐
   │  Express   │          │   Next.js Dev  │
   │  Server    │◄─────────│   Server       │
   │  Running   │  Proxies │   Running      │
   │            │  /api/*  │                │
   └────────────┘          └────────────────┘

Cache Invalidation Triggers:
- Source file changes (src/**)
- Dependency changes (package.json)
- Environment variable changes
- Upstream package builds
```

---

## 4. Request Flow (Production)

```
┌──────────────────────────────────────────────────────────────┐
│  USER in Browser                                             │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ http://localhost:3000
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js Dashboard (Port 3000)                               │
│  - React UI components                                       │
│  - Vercel AI SDK hooks (useChat, useObject)                  │
│  - Client-side routing                                       │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        │ Page Request      │ API Request       │ Tool Call
        │                   │                   │
        ▼                   ▼                   ▼
    ┌────────┐      ┌─────────────┐    ┌─────────────┐
    │ SSR/   │      │ /api/chat   │    │/api/server/ │
    │ Static │      │ route.ts    │    │ (proxy)     │
    │ Pages  │      │             │    │             │
    └────────┘      └─────────────┘    └─────────────┘
                            │                   │
                            │                   │ Rewrites to
                            │                   │ http://127.0.0.1:3001
                            │                   │
                            ▼                   ▼
            ┌───────────────────────────────────────────┐
            │ Express Server (Port 3001)                │
            │ - POST /v1/chat/completions               │
            │ - GET /health                             │
            │ - POST /session/restart                   │
            └───────────────────────────────────────────┘
                            │
                            │ Uses
                            ▼
            ┌───────────────────────────────────────────┐
            │ Playwright Browser Automation             │
            │ - Launches Chromium (headful)             │
            │ - Navigates to claude.ai                  │
            │ - DOM manipulation                        │
            │ - Polls for responses                     │
            └───────────────────────────────────────────┘
                            │
                            │ Interacts with
                            ▼
            ┌───────────────────────────────────────────┐
            │ claude.ai (Web Interface)                 │
            │ - User session (cookies stored)           │
            │ - Conversation context                    │
            │ - AI responses                            │
            └───────────────────────────────────────────┘
                            │
                            │ Response flows back
                            ▼
            ┌───────────────────────────────────────────┐
            │ Express Server                            │
            │ - Converts HTML → Markdown                │
            │ - Formats as OpenAI response              │
            │ - Streams via SSE (if requested)          │
            └───────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────────────────┐
            │ Dashboard UI                              │
            │ - Displays streaming response             │
            │ - Updates conversation state              │
            │ - Handles errors/rate limits              │
            └───────────────────────────────────────────┘
```

---

## 5. Data Flow: Shared Package

```
┌──────────────────────────────────────────────────────────────┐
│  packages/shared/src/                                        │
│  - Written in TypeScript                                     │
│  - Defines types, schemas, utilities                         │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ pnpm build (tsup)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  packages/shared/dist/                                       │
│  ├── index.js          (CommonJS for Node.js)                │
│  ├── index.mjs         (ES Module for Next.js)               │
│  ├── index.d.ts        (TypeScript types)                    │
│  └── [same for /types, /tools, /utils subdirs]              │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        │ import            │ import            │ import
        │ (CommonJS)        │ (ESM)             │ (Types)
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│   Server   │      │ Dashboard  │      │ TypeScript │
│  Node.js   │      │  Next.js   │      │  Compiler  │
│            │      │            │      │            │
│ require()  │      │ import {}  │      │ Type Check │
└────────────┘      └────────────┘      └────────────┘

Example Usage:

// In apps/server/src/server.js
const { OpenAIRequest } = require('@openadapter/shared/types');

// In apps/dashboard/src/app/api/chat/route.ts
import { restartSessionTool } from '@openadapter/shared/tools';

// TypeScript automatically infers types
const request: OpenAIRequest = { ... };
```

---

## 6. Development Workflow

```
┌──────────────────────────────────────────────────────────────┐
│  Developer Makes Change to Code                              │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        │ packages/shared   │ apps/server       │ apps/dashboard
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│  File      │      │  File      │      │  File      │
│  Changed   │      │  Changed   │      │  Changed   │
└────────────┘      └────────────┘      └────────────┘
        │                   │                   │
        │ tsup --watch      │ Node.js reload    │ Next.js Fast
        │ (auto rebuild)    │ (manual)          │ Refresh (auto)
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│  dist/     │      │  Server    │      │  Browser   │
│  Updated   │      │  Restart   │      │  Reload    │
└────────────┘      └────────────┘      └────────────┘
        │                   │                   │
        │ Triggers          │                   │
        │ hot reload        │                   │
        │                   │                   │
        └───────┬───────────┘                   │
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │ Changes Reflected   │
                    │ (1-2 seconds)       │
                    └─────────────────────┘

Timing:
- Shared package rebuild: ~1s
- Server restart: ~2s (manual)
- Dashboard hot reload: instant
```

---

## 7. Testing Strategy

```
┌──────────────────────────────────────────────────────────────┐
│  pnpm test                                                   │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Turborepo orchestrates tests across packages               │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│  Shared    │      │  Server    │      │ Dashboard  │
│  Tests     │      │  Tests     │      │  Tests     │
│            │      │            │      │            │
│  Vitest    │      │ Node test  │      │  Jest      │
│  (future)  │      │  runner    │      │  (future)  │
└────────────┘      └────────────┘      └────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│  Type      │      │  Unit      │      │  Component │
│  Tests     │      │  Tests     │      │  Tests     │
│            │      │            │      │            │
│  Schema    │      │  htmlToMd  │      │  (future)  │
│  Validation│      │  rateLimiter│     │            │
└────────────┘      │  extractPayload│   └────────────┘
                    │            │
                    │  Integration│
                    │  Tests     │
                    │            │
                    │  Full API  │
                    │  Requests  │
                    └────────────┘

Test Execution Order:
1. Unit tests (fast, isolated)      ✅ Always cached
2. Integration tests (slow)         ❌ Never cached
3. E2E tests (future)               ❌ Never cached

Caching Rules:
- Unit tests: Cached by Turborepo (hash of src + test files)
- Integration tests: Not cached (external dependencies)
- Type checking: Cached (hash of src + tsconfig)
```

---

## 8. CI/CD Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│  Git Push to GitHub                                          │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  GitHub Actions Triggered (.github/workflows/ci.yml)        │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  1. Checkout Code             │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  2. Setup Node.js 20          │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  3. Install PNPM              │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  4. Restore PNPM Cache        │
            │     (Hash: pnpm-lock.yaml)    │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  5. pnpm install              │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  6. Install Playwright        │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  7. Restore Turborepo Cache   │
            │     (Remote cache via Vercel) │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  8. pnpm build                │
            │     (Uses Turbo cache)        │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  9. pnpm type-check           │
            │     (Uses Turbo cache)        │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  10. pnpm lint                │
            │      (Uses Turbo cache)       │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  11. pnpm test:unit           │
            │      (Uses Turbo cache)       │
            └───────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
    [Success]                              [Failure]
        │                                       │
        ▼                                       ▼
    ┌────────┐                          ┌────────────┐
    │ Deploy │                          │ Notify     │
    │ (future)│                          │ Developers │
    └────────┘                          └────────────┘

Performance Gains:
- First run: ~5 minutes
- Cached run (no changes): ~30 seconds (90% faster)
- Partial changes: ~1-2 minutes (60-80% faster)
```

---

## 9. Deployment Architecture (Future)

```
┌──────────────────────────────────────────────────────────────┐
│  Production Deployment                                       │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌────────────────────┐              ┌────────────────────┐
│  Dashboard         │              │  Server            │
│  (Vercel/Netlify)  │              │  (Railway/Render)  │
│                    │              │                    │
│  - Static pages    │              │  - Express API     │
│  - API routes      │◄─────────────│  - Playwright      │
│  - Edge functions  │  HTTP calls  │  - Chromium        │
│                    │              │                    │
│  Port: 443 (HTTPS) │              │  Port: 3001        │
│  Domain: dash.com  │              │  Domain: api.com   │
└────────────────────┘              └────────────────────┘
        │                                       │
        │ User visits                           │ API calls
        │ https://dash.com                      │
        │                                       ▼
        ▼                           ┌────────────────────┐
┌────────────────────┐              │  claude.ai         │
│  End User Browser  │              │  (Web Interface)   │
│  - React UI        │              │                    │
│  - AI chat         │              │  - User session    │
│  - Server stats    │              │  - Conversations   │
└────────────────────┘              └────────────────────┘

Environment Variables:
- Dashboard: NEXT_PUBLIC_SERVER_URL=https://api.com
- Server: PORT=3001, NODE_ENV=production
```

---

## 10. Package Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│  Package Lifecycle: @openadapter/shared                      │
└──────────────────────────────────────────────────────────────┘

Development:
    src/types/openai.ts (TypeScript source)
         │
         │ pnpm dev (tsup --watch)
         ▼
    dist/types/openai.js (CJS)
    dist/types/openai.mjs (ESM)
    dist/types/openai.d.ts (Types)
         │
         │ Used by apps in dev mode
         ▼
    apps/server/src/server.js (require)
    apps/dashboard/src/app/page.tsx (import)

Production Build:
    src/types/openai.ts
         │
         │ pnpm build (tsup)
         ▼
    dist/types/openai.js
    dist/types/openai.mjs
    dist/types/openai.d.ts
         │
         │ Bundled into apps
         ▼
    apps/server/dist/server.js (includes shared code)
    apps/dashboard/.next/ (includes shared code)

Publishing (Future):
    dist/
         │
         │ npm publish
         ▼
    npm registry
         │
         │ npm install @openadapter/shared
         ▼
    Other projects can use it
```

---

## 11. Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│  Error Occurs                                                │
└──────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│  Server    │      │ Dashboard  │      │ Build      │
│  Runtime   │      │  Runtime   │      │  Time      │
└────────────┘      └────────────┘      └────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│ Express    │      │ React      │      │ TypeScript │
│ Error      │      │ Error      │      │ Type Error │
│ Handler    │      │ Boundary   │      │            │
└────────────┘      └────────────┘      └────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│ OpenAI     │      │ Error UI   │      │ Build Fail │
│ Error      │      │ Component  │      │ Turborepo  │
│ Format     │      │            │      │ Stops      │
└────────────┘      └────────────┘      └────────────┘
        │                   │                   │
        │                   │                   │
        ▼                   ▼                   ▼
┌────────────┐      ┌────────────┐      ┌────────────┐
│ Logged to  │      │ Shown to   │      │ Shows      │
│ logs.txt   │      │ User       │      │ Error in   │
│            │      │            │      │ Terminal   │
└────────────┘      └────────────┘      └────────────┘
```

---

## 12. Hot Reload Mechanism

```
Developer edits file in packages/shared/src/types/openai.ts
                            │
                            ▼
            ┌───────────────────────────────┐
            │  tsup --watch detects change  │
            └───────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Rebuild dist/ (~500ms)       │
            └───────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌────────────────────┐              ┌────────────────────┐
│  Server watches    │              │  Next.js watches   │
│  node_modules/     │              │  node_modules/     │
│  (NO auto reload)  │              │  (YES auto reload) │
└────────────────────┘              └────────────────────┘
        │                                       │
        │ Manual restart needed                 │ Auto reload
        │ Ctrl+C → pnpm dev:server              │
        │                                       ▼
        ▼                           ┌────────────────────┐
┌────────────────────┐              │  Dashboard         │
│  Server reads      │              │  hot reloads       │
│  new types         │              │  (~1s delay)       │
└────────────────────┘              └────────────────────┘

Note: Server requires manual restart for shared package changes.
Dashboard (Next.js) auto-reloads via transpilePackages config.
```

---

**End of Visual Diagrams**

For implementation details, see [MONOREPO_ARCHITECTURE.md](./MONOREPO_ARCHITECTURE.md).

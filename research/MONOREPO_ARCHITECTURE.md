# OpenAdapter Monorepo Architecture

**Status:** Architecture Design Complete
**Date:** 2026-03-02
**Purpose:** Complete monorepo structure using Turborepo + PNPM for OpenAdapter server + Next.js dashboard

---

## Table of Contents

1. [Complete Directory Structure](#complete-directory-structure)
2. [Configuration Files](#configuration-files)
3. [Package Specifications](#package-specifications)
4. [Build Pipeline & Scripts](#build-pipeline--scripts)
5. [Migration Plan](#migration-plan)
6. [Development Workflow](#development-workflow)
7. [Best Practices & Rationale](#best-practices--rationale)
8. [References](#references)

---

## Complete Directory Structure

```
openAdapter/
├── apps/
│   ├── server/                          # Express + Playwright backend
│   │   ├── src/
│   │   │   ├── server.js                # Main Express server
│   │   │   ├── adapter.js               # CLI tool (standalone)
│   │   │   ├── lib/
│   │   │   │   ├── sessionManager.js
│   │   │   │   ├── htmlToMd.js
│   │   │   │   ├── rateLimiter.js
│   │   │   │   └── extractPayload.js
│   │   │   └── routes/
│   │   │       ├── completions.js       # POST /v1/chat/completions
│   │   │       └── management.js        # Admin/health endpoints
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   │   ├── extractPayload.test.js
│   │   │   │   ├── htmlToMd.test.js
│   │   │   │   └── rateLimiter.test.js
│   │   │   └── integration/
│   │   │       └── server.test.js
│   │   ├── temp_uploads/                # File upload temp dir
│   │   ├── .browser-profile/            # Chromium session (gitignored)
│   │   ├── logs.txt                     # Server logs
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── dashboard/                       # Next.js 15 frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx           # Root layout
│       │   │   ├── page.tsx             # Home page
│       │   │   ├── chat/
│       │   │   │   └── page.tsx         # AI Chat interface
│       │   │   ├── activities/
│       │   │   │   └── page.tsx         # Server Activities dashboard
│       │   │   ├── logs/
│       │   │   │   └── page.tsx         # Log viewer
│       │   │   ├── settings/
│       │   │   │   └── page.tsx         # Settings page
│       │   │   └── api/
│       │   │       ├── chat/
│       │   │       │   └── route.ts     # Vercel AI SDK endpoint
│       │   │       └── health/
│       │   │           └── route.ts     # Proxy to server health
│       │   ├── components/
│       │   │   ├── ui/                  # shadcn/ui components
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   └── ...
│       │   │   ├── ServerStatus.tsx
│       │   │   ├── LogViewer.tsx
│       │   │   ├── SessionControls.tsx
│       │   │   ├── ChatInterface.tsx
│       │   │   ├── StatsDashboard.tsx
│       │   │   └── TabNavigation.tsx
│       │   ├── lib/
│       │   │   ├── openadapter-client.ts # HTTP client for server API
│       │   │   ├── hooks/
│       │   │   │   ├── useServerHealth.ts
│       │   │   │   └── useServerLogs.ts
│       │   │   └── utils.ts
│       │   └── styles/
│       │       └── globals.css
│       ├── public/
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── package.json
│       └── README.md
│
├── packages/
│   ├── shared/                          # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── openai.ts           # OpenAI API types
│   │   │   │   ├── management.ts       # Management API types
│   │   │   │   ├── config.ts           # Configuration types
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── validation.ts
│   │   │   │   └── index.ts
│   │   │   ├── tools/                  # Vercel AI SDK tool schemas (EXISTING)
│   │   │   │   ├── schemas.ts
│   │   │   │   ├── handlers.ts
│   │   │   │   ├── examples.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── README.md
│   │
│   ├── ui/                              # Shared UI components (optional)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── tsconfig/                        # Shared TypeScript configs
│       ├── base.json                    # Base TS config
│       ├── nextjs.json                  # Next.js specific
│       ├── node.json                    # Node.js specific
│       └── package.json
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                       # Continuous Integration
│   │   └── release.yml                  # Release automation
│   └── ISSUE_TEMPLATE/
│       └── ...
│
├── docs/                                # Documentation
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── research/                            # Research documents
│   ├── MONOREPO_ARCHITECTURE.md         # This file
│   └── ...
│
├── .gitignore
├── .npmrc                               # PNPM configuration
├── pnpm-workspace.yaml                  # PNPM workspace definition
├── turbo.json                           # Turborepo pipeline config
├── package.json                         # Root package.json
├── README.md                            # Monorepo README
├── CLAUDE.md                            # Claude Code instructions
├── CONTRIBUTING.md
├── LICENSE
└── DASHBOARD_PLAN.md
```

---

## Configuration Files

### 1. Root `package.json`

```json
{
  "name": "openadapter-monorepo",
  "version": "2.0.0",
  "private": true,
  "description": "OpenAdapter: Local Express server bridging claude.ai into OpenAI-compatible API with web dashboard",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "dev:server": "turbo run dev --filter=@openadapter/server",
    "dev:dashboard": "turbo run dev --filter=@openadapter/dashboard",
    "build": "turbo run build",
    "build:server": "turbo run build --filter=@openadapter/server",
    "build:dashboard": "turbo run build --filter=@openadapter/dashboard",
    "test": "turbo run test",
    "test:unit": "turbo run test:unit",
    "test:integration": "turbo run test:integration",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules .turbo",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "start:server": "turbo run start --filter=@openadapter/server",
    "start:dashboard": "turbo run start --filter=@openadapter/dashboard"
  },
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0",
  "devDependencies": {
    "@types/node": "^20.11.0",
    "prettier": "^3.2.0",
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "keywords": [
    "openadapter",
    "claude",
    "openai",
    "api",
    "monorepo",
    "turborepo",
    "playwright",
    "express",
    "nextjs"
  ],
  "author": "",
  "license": "ISC",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/openadapter.git"
  }
}
```

### 2. `pnpm-workspace.yaml`

```yaml
packages:
  # All apps
  - 'apps/*'
  # All shared packages
  - 'packages/*'

# Exclude test directories from workspace
exclude:
  - '**/node_modules/**'
  - '**/dist/**'
  - '**/.turbo/**'
  - '**/.next/**'
  - '**/temp_uploads/**'
  - '**/.browser-profile/**'
```

### 3. `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    ".env",
    "tsconfig.json"
  ],
  "globalEnv": [
    "NODE_ENV"
  ],
  "pipeline": {
    "build": {
      "dependsOn": [
        "^build"
      ],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**"
      ],
      "env": [
        "PORT",
        "NEXT_PUBLIC_SERVER_URL"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": [
        "^build"
      ]
    },
    "test": {
      "dependsOn": [
        "build"
      ],
      "outputs": [],
      "cache": true
    },
    "test:unit": {
      "outputs": [],
      "cache": true
    },
    "test:integration": {
      "dependsOn": [
        "build"
      ],
      "outputs": [],
      "cache": false
    },
    "lint": {
      "outputs": [],
      "cache": true
    },
    "type-check": {
      "dependsOn": [
        "^build"
      ],
      "outputs": [],
      "cache": true
    },
    "clean": {
      "cache": false
    },
    "start": {
      "dependsOn": [
        "build"
      ],
      "cache": false
    }
  }
}
```

### 4. `.npmrc`

```ini
# PNPM configuration
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true

# Workspace protocol
prefer-workspace-packages=true
link-workspace-packages=true

# Performance
store-dir=~/.pnpm-store
modules-cache-max-age=604800

# Lockfile
lockfile=true
```

### 5. Root `tsconfig.json` (Base)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": [
    "node_modules",
    "dist",
    ".turbo",
    ".next"
  ]
}
```

---

## Package Specifications

### 1. `apps/server/package.json`

```json
{
  "name": "@openadapter/server",
  "version": "2.0.0",
  "description": "Express + Playwright server bridging claude.ai to OpenAI API",
  "type": "commonjs",
  "main": "src/server.js",
  "scripts": {
    "dev": "node src/server.js",
    "start": "npm run test:unit && node src/server.js",
    "test": "node --test tests/**/*.test.js",
    "test:unit": "node --test tests/unit/**/*.test.js",
    "test:integration": "node --test tests/integration/**/*.test.js",
    "clean": "rm -rf temp_uploads/*.* logs.txt",
    "cli": "node src/adapter.js"
  },
  "dependencies": {
    "@openadapter/shared": "workspace:*",
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "mime-types": "^3.0.2",
    "playwright": "^1.58.2"
  },
  "devDependencies": {
    "jsdom": "^24.0.0"
  },
  "keywords": [
    "openadapter",
    "express",
    "playwright",
    "claude",
    "openai"
  ]
}
```

### 2. `apps/dashboard/package.json`

```json
{
  "name": "@openadapter/dashboard",
  "version": "2.0.0",
  "description": "Next.js dashboard for OpenAdapter with Vercel AI SDK integration",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@openadapter/shared": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "ai": "^4.0.0",
    "zod": "^3.22.4",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "recharts": "^2.10.0",
    "@tanstack/react-query": "^5.17.0",
    "lucide-react": "^0.309.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

### 3. `packages/shared/package.json` (EXISTING - Enhanced)

```json
{
  "name": "@openadapter/shared",
  "version": "0.2.0",
  "description": "Shared TypeScript types, schemas, and utilities for OpenAdapter",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./tools": {
      "import": "./dist/tools/index.mjs",
      "require": "./dist/tools/index.js",
      "types": "./dist/tools/index.d.ts"
    },
    "./types": {
      "import": "./dist/types/index.mjs",
      "require": "./dist/types/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.mjs",
      "require": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    }
  },
  "files": [
    "dist",
    "src"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": [
    "openadapter",
    "claude",
    "ai",
    "tools",
    "vercel-ai-sdk",
    "zod",
    "types"
  ],
  "peerDependencies": {
    "ai": "^4.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  },
  "dependencies": {
    "ai": "^4.0.0",
    "zod": "^3.22.4"
  }
}
```

### 4. `packages/tsconfig/package.json`

```json
{
  "name": "@openadapter/tsconfig",
  "version": "0.1.0",
  "description": "Shared TypeScript configurations for OpenAdapter monorepo",
  "files": [
    "base.json",
    "nextjs.json",
    "node.json"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

#### `packages/tsconfig/base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true
  },
  "exclude": [
    "node_modules",
    "dist",
    ".turbo",
    ".next"
  ]
}
```

#### `packages/tsconfig/nextjs.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "plugins": [
      {
        "name": "next"
      }
    ],
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

#### `packages/tsconfig/node.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2022",
    "types": ["node"]
  }
}
```

### 5. `apps/dashboard/tsconfig.json`

```json
{
  "extends": "@openadapter/tsconfig/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@openadapter/shared": ["../../packages/shared/src"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 6. `apps/dashboard/next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Transpile workspace packages
  transpilePackages: ['@openadapter/shared'],

  // Environment variables
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://127.0.0.1:3000',
  },

  // Server configuration
  async rewrites() {
    return [
      {
        source: '/api/server/:path*',
        destination: 'http://127.0.0.1:3000/:path*', // Proxy to Express server
      },
    ];
  },
};

module.exports = nextConfig;
```

### 7. `apps/dashboard/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

---

## Build Pipeline & Scripts

### Development Workflow Commands

```bash
# Install all dependencies across monorepo
pnpm install

# Install Playwright (required for server)
cd apps/server && npx playwright install chromium

# Run both server and dashboard in dev mode (parallel)
pnpm dev

# Run only server
pnpm dev:server

# Run only dashboard
pnpm dev:dashboard

# Build everything (production)
pnpm build

# Build specific app
pnpm build:server
pnpm build:dashboard

# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Type checking across monorepo
pnpm type-check

# Lint all packages
pnpm lint

# Format all code
pnpm format

# Clean all build artifacts
pnpm clean

# Start production server
pnpm start:server

# Start production dashboard
pnpm start:dashboard
```

### Task Execution Flow (Turborepo)

```
User runs: pnpm dev
    ↓
Turborepo reads turbo.json pipeline
    ↓
Checks "dev" task dependencies: "^build" (build shared packages first)
    ↓
Builds @openadapter/shared (TypeScript → dist/)
    ↓
Runs "dev" in parallel:
    ├─→ @openadapter/server   (node src/server.js)
    └─→ @openadapter/dashboard (next dev)
    ↓
Dashboard: http://localhost:3000 (Next.js)
Server:    http://127.0.0.1:3000 (Express)
           ⚠️  Port conflict resolved in migration
```

### Caching Strategy

Turborepo caches:
- Build outputs (`dist/`, `.next/`)
- Test results
- Type checking results
- Lint results

Cache hits skip re-execution, dramatically speeding up:
- CI/CD pipelines
- Local rebuilds
- Switching branches

**Cache invalidation triggers:**
- Source file changes
- Dependency changes
- Environment variable changes
- Upstream package changes

---

## Migration Plan

### Phase 1: Monorepo Setup (Non-Breaking)

**Goal:** Set up monorepo structure without breaking existing functionality

#### Step 1.1: Initialize Monorepo Root

```bash
# Create root package.json
cat > package.json << 'EOF'
{
  "name": "openadapter-monorepo",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "test": "turbo run test"
  },
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "pnpm@8.15.0",
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.2.0"
  }
}
EOF

# Create pnpm workspace config
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Create .npmrc
cat > .npmrc << 'EOF'
shamefully-hoist=true
strict-peer-dependencies=false
prefer-workspace-packages=true
link-workspace-packages=true
EOF

# Install PNPM globally if not present
npm install -g pnpm@8.15.0
```

#### Step 1.2: Create Directory Structure

```bash
# Create directories
mkdir -p apps/server/src/lib
mkdir -p apps/server/tests/unit
mkdir -p apps/server/tests/integration
mkdir -p apps/dashboard/src
mkdir -p packages/tsconfig

# Placeholder for dashboard (to be built in Phase 2)
echo "# Dashboard - Coming Soon" > apps/dashboard/README.md
```

#### Step 1.3: Move Existing Server Code

```bash
# Move server files
mv server.js apps/server/src/
mv adapter.js apps/server/src/
mv lib/* apps/server/src/lib/
mv tests/* apps/server/tests/

# Move server-specific files
mv temp_uploads apps/server/
mv logs.txt apps/server/

# Copy configuration files
cp package.json apps/server/package.json
# Edit apps/server/package.json to:
# 1. Change name to "@openadapter/server"
# 2. Add "workspace:*" dependency for @openadapter/shared
# 3. Update scripts to use "src/" prefix

# Update .gitignore
cat >> .gitignore << 'EOF'
# Turborepo
.turbo/
apps/server/.browser-profile/
apps/server/temp_uploads/
apps/server/logs.txt
EOF
```

#### Step 1.4: Enhance Shared Package

The `packages/shared/` already exists with tool schemas. Enhance it:

```bash
# Create additional type files
mkdir -p packages/shared/src/types
mkdir -p packages/shared/src/utils

# Create type files (content provided in next phase)
touch packages/shared/src/types/openai.ts
touch packages/shared/src/types/management.ts
touch packages/shared/src/types/config.ts
touch packages/shared/src/types/index.ts

# Update package.json exports (see Package Specifications section)
```

#### Step 1.5: Create Turborepo Config

```bash
# Create turbo.json (see Configuration Files section)
# Copy content from above

# Test turborepo setup
pnpm install
pnpm build:server
pnpm test:unit
```

#### Step 1.6: Update Import Paths

**In `apps/server/src/server.js`:**

```javascript
// Before:
const { extractPayload } = require('./lib/extractPayload.js');
const sessionManager = require('./lib/sessionManager.js');

// After (if converting to use shared types):
const { extractPayload } = require('./lib/extractPayload.js');
const sessionManager = require('./lib/sessionManager.js');
// No changes needed initially - shared package is optional for server

// Future enhancement:
// const { OpenAIRequest, OpenAIResponse } = require('@openadapter/shared/types');
```

**Validation:**

```bash
# Ensure server still works
cd apps/server
pnpm dev

# Test in another terminal
curl -X POST http://127.0.0.1:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

### Phase 2: TypeScript Types Migration

**Goal:** Add comprehensive TypeScript types to shared package

#### Step 2.1: Define OpenAI Types

**File:** `packages/shared/src/types/openai.ts`

```typescript
// OpenAI API Request/Response Types

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: 'stop' | 'length' | null;
  }>;
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    code: string | null;
  };
}
```

#### Step 2.2: Define Management API Types

**File:** `packages/shared/src/types/management.ts`

```typescript
// Server Management API Types

export interface ServerHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastRequest: string | null;
  browserStatus: 'connected' | 'disconnected' | 'recovering';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
}

export interface SessionState {
  isGenerating: boolean;
  lastActivityTimestamp: number;
  lastSystemContextHash: string | null;
  page: any; // Playwright Page type
  browser: any; // Playwright Browser type
  context: any; // Playwright BrowserContext type
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
}

export interface SessionControlRequest {
  action: 'restart' | 'recover' | 'new-chat';
}

export interface SessionControlResponse {
  success: boolean;
  message: string;
}
```

#### Step 2.3: Build and Test Shared Package

```bash
cd packages/shared
pnpm build

# Verify exports
node -e "const types = require('./dist/types'); console.log(Object.keys(types));"
```

### Phase 3: Dashboard Foundation

**Goal:** Create Next.js dashboard with basic routing

#### Step 3.1: Initialize Next.js App

```bash
cd apps/dashboard

# Create Next.js app with TypeScript
pnpm create next-app@latest . --typescript --tailwind --app --use-pnpm

# Install dependencies
pnpm add @openadapter/shared@workspace:* \
         ai zod \
         @radix-ui/react-slot @radix-ui/react-tabs \
         class-variance-authority clsx tailwind-merge \
         recharts @tanstack/react-query lucide-react

pnpm add -D @types/react @types/react-dom
```

#### Step 3.2: Configure Next.js

Use configurations from [Configuration Files](#configuration-files) section.

#### Step 3.3: Create Basic Layout

**File:** `apps/dashboard/src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpenAdapter Dashboard',
  description: 'Web interface for OpenAdapter server management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

#### Step 3.4: Create Home Page

**File:** `apps/dashboard/src/app/page.tsx`

```typescript
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">OpenAdapter Dashboard</h1>
      <nav className="flex gap-4">
        <Link href="/chat" className="px-4 py-2 bg-blue-600 text-white rounded">
          Chat
        </Link>
        <Link href="/activities" className="px-4 py-2 bg-blue-600 text-white rounded">
          Server Activities
        </Link>
        <Link href="/logs" className="px-4 py-2 bg-blue-600 text-white rounded">
          Logs
        </Link>
        <Link href="/settings" className="px-4 py-2 bg-blue-600 text-white rounded">
          Settings
        </Link>
      </nav>
    </main>
  );
}
```

#### Step 3.5: Test Dashboard

```bash
# From monorepo root
pnpm dev:dashboard

# Visit http://localhost:3001 (or next available port)
```

### Phase 4: Port Resolution

**Problem:** Both Express server and Next.js dev server default to port 3000

**Solutions:**

**Option A: Change Express Port (Recommended)**

```javascript
// apps/server/src/server.js
const PORT = process.env.PORT || 3001; // Changed from 3000
```

**Option B: Change Next.js Port**

```bash
# apps/dashboard/package.json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

**Recommended Setup:**
- Express Server: `http://127.0.0.1:3001`
- Next.js Dashboard: `http://localhost:3000`

**Update `.env.example`:**

```bash
# Server Configuration
PORT=3001

# Dashboard Configuration
NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:3001
```

### Phase 5: CI/CD Updates

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: cd apps/server && npx playwright install chromium

      - name: Build
        run: pnpm build

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Test
        run: pnpm test:unit

      # Integration tests require running server - skip in CI for now
      # - name: Integration Tests
      #   run: pnpm test:integration
```

### Phase 6: Documentation Updates

**Update:** `README.md` at monorepo root

```markdown
# OpenAdapter Monorepo

OpenAdapter is a local Express server that bridges claude.ai's web interface into an OpenAI-compatible API, with a modern Next.js dashboard for management and monitoring.

## Structure

- `apps/server` - Express + Playwright backend (OpenAI API bridge)
- `apps/dashboard` - Next.js frontend with Vercel AI SDK integration
- `packages/shared` - Shared TypeScript types, schemas, and utilities

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright's Chromium
cd apps/server && npx playwright install chromium && cd ../..

# Start development servers (parallel)
pnpm dev
```

### Access

- **Dashboard:** http://localhost:3000
- **API Server:** http://127.0.0.1:3001

### Commands

See [Build Pipeline & Scripts](#build-pipeline--scripts) section.

## Documentation

- [Architecture](./research/MONOREPO_ARCHITECTURE.md)
- [Contributing](./CONTRIBUTING.md)
- [Dashboard Plan](./DASHBOARD_PLAN.md)
- [Claude Instructions](./CLAUDE.md)

## License

ISC
```

### Migration Checklist

- [ ] Phase 1.1: Initialize monorepo root files
- [ ] Phase 1.2: Create directory structure
- [ ] Phase 1.3: Move server code to `apps/server/`
- [ ] Phase 1.4: Enhance `packages/shared/`
- [ ] Phase 1.5: Create `turbo.json`
- [ ] Phase 1.6: Update import paths
- [ ] Phase 1: Validate server still works
- [ ] Phase 2.1: Add OpenAI types to shared package
- [ ] Phase 2.2: Add management API types
- [ ] Phase 2.3: Build and test shared package
- [ ] Phase 3.1: Initialize Next.js dashboard
- [ ] Phase 3.2: Configure Next.js with Turborepo
- [ ] Phase 3.3: Create basic layout
- [ ] Phase 3.4: Create home page with navigation
- [ ] Phase 3.5: Test dashboard locally
- [ ] Phase 4: Resolve port conflicts
- [ ] Phase 5: Update CI/CD workflows
- [ ] Phase 6: Update documentation
- [ ] Final: Full integration test (`pnpm dev` runs both)

---

## Development Workflow

### Day-to-Day Development

**Starting work:**

```bash
# Start both server and dashboard
pnpm dev

# Or individually
pnpm dev:server
pnpm dev:dashboard
```

**Making changes to shared package:**

```bash
# Automatic rebuild on save
cd packages/shared
pnpm dev

# In another terminal, dashboard/server will hot-reload
```

**Running tests:**

```bash
# All tests
pnpm test

# Only unit tests (fast)
pnpm test:unit

# Watch mode (for TDD)
cd apps/server && npm test -- --watch
```

**Type checking:**

```bash
# Check all packages
pnpm type-check

# Check specific package
cd apps/dashboard && pnpm type-check
```

### Adding a New Package

```bash
# Create package structure
mkdir -p packages/new-package/src
cd packages/new-package

# Initialize package.json
cat > package.json << 'EOF'
{
  "name": "@openadapter/new-package",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  }
}
EOF

# Install from root
cd ../..
pnpm install
```

### Debugging

**Server debugging:**

```bash
cd apps/server
node --inspect src/server.js

# Attach debugger on chrome://inspect
```

**Dashboard debugging:**

```bash
cd apps/dashboard
pnpm dev

# Use React DevTools
# Check Next.js dev overlay for errors
```

**Shared package debugging:**

```bash
# Check build output
cd packages/shared
pnpm build
ls -la dist/

# Verify exports
node -e "console.log(require('./dist'))"
```

---

## Best Practices & Rationale

### Why Turborepo?

**Performance Benefits (2026):**
- **40% faster builds** through parallelization
- **Remote caching** with Vercel (free for linked repos)
- **Incremental builds** - only rebuild what changed
- **Rust-powered** core for maximum performance

**Reference:** [Turborepo Best Practices 2026](https://www.askantech.com/monorepo-with-turborepo-enterprise-code-management-guide-2026/)

### Why PNPM?

**Advantages:**
- **Disk efficiency** - Single content-addressable store
- **Fast installs** - Symlink-based architecture
- **Workspace support** - First-class monorepo support
- **Strict** - Prevents phantom dependencies

**Reference:** [Modern Monorepo Management 2026](https://medium.com/@jamesmiller22871/stop-fighting-node-modules-a-modern-guide-to-managing-monorepos-in-2026-16cbc79e190d)

### Package Organization

**Apps vs Packages:**
- `apps/` - Deployable applications (server, dashboard)
- `packages/` - Reusable libraries (shared, ui, tsconfig)

**Why separate?**
- Clear deployment boundaries
- Independent versioning
- Easier dependency management

### TypeScript Configuration Strategy

**Shared base configs** in `packages/tsconfig/`:
- `base.json` - Common settings
- `nextjs.json` - Next.js specific
- `node.json` - Node.js specific

**Benefits:**
- DRY principle
- Consistent strictness across codebase
- Easy updates (change once, apply everywhere)

### Workspace Protocol

Using `workspace:*` in package.json:

```json
{
  "dependencies": {
    "@openadapter/shared": "workspace:*"
  }
}
```

**Benefits:**
- Always uses local version during development
- Automatic hot-reloading when shared code changes
- Prevents version mismatches

**Reference:** [PNPM Workspace Configuration](https://dev.to/tobidelly/a-step-by-step-guide-to-debugging-and-setting-up-a-turborepo-driven-monorepo-with-nextjs-and-pnpm-3l1l)

### Caching Strategy

**What to cache:**
- Build outputs (`.next/`, `dist/`)
- Test results
- Type checking
- Linting

**What NOT to cache:**
- `dev` tasks (use `persistent: true` instead)
- Integration tests (external dependencies)
- File operations (logs, uploads)

### Next.js + Express Integration

**Proxy pattern** in `next.config.js`:

```javascript
async rewrites() {
  return [
    {
      source: '/api/server/:path*',
      destination: 'http://127.0.0.1:3001/:path*',
    },
  ];
}
```

**Benefits:**
- Single domain for frontend/backend (CORS-free)
- Simplified deployment
- Client-side code doesn't need to know server URL

**Reference:** [Next.js + Express Turborepo Example](https://github.com/ivesfurtado/next-express-turborepo)

### Testing Strategy

**Three-tier approach:**

1. **Unit Tests** - Fast, isolated, no external deps
   - Run on every commit
   - Cached by Turborepo
   - Example: `htmlToMd.test.js`, `rateLimiter.test.js`

2. **Integration Tests** - Slow, require running server
   - Run before releases
   - Not cached
   - Example: `server.test.js`

3. **E2E Tests** (Future) - Full user flows
   - Playwright for dashboard
   - Run nightly in CI

### Environment Variables

**Development:**
- `.env.local` in each app (gitignored)
- `.env.example` checked into git

**Production:**
- Platform-specific (Vercel, Railway, etc.)
- Never commit real secrets

**Shared via Turborepo:**

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "env": ["PORT", "NEXT_PUBLIC_SERVER_URL"]
    }
  }
}
```

### Git Strategy

**Monorepo branching:**
- `main` - Production-ready
- `dev` - Integration branch
- `feature/*` - Feature branches

**Commit messages:**
- Use conventional commits
- Prefix with scope: `feat(dashboard):`, `fix(server):`

**Example:**
```
feat(dashboard): add server health dashboard
fix(server): resolve rate limit detection
chore(shared): update TypeScript types
```

---

## References

### Official Documentation

- [Turborepo Documentation](https://turborepo.dev/docs)
- [PNPM Workspace](https://pnpm.io/workspaces)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel AI SDK](https://sdk.vercel.ai/)

### Research Articles

- [Monorepo with Turborepo: Enterprise Code Management Guide 2026](https://www.askantech.com/monorepo-with-turborepo-enterprise-code-management-guide-2026/)
- [Turborepo, Nx, and Lerna: The Truth about Monorepo Tooling in 2026](https://dev.to/dataformathub/turborepo-nx-and-lerna-the-truth-about-monorepo-tooling-in-2026-71)
- [Stop Fighting node_modules: Modern Guide to Managing Monorepos 2026](https://medium.com/@jamesmiller22871/stop-fighting-node-modules-a-modern-guide-to-managing-monorepos-in-2026-16cbc79e190d)

### Setup Guides

- [Setting Up a Scalable Monorepo With Turborepo and PNPM](https://dev.to/hexshift/setting-up-a-scalable-monorepo-with-turborepo-and-pnpm-4doh)
- [Step-by-Step Guide to Turborepo with Next.js and PNPM](https://dev.to/tobidelly/a-step-by-step-guide-to-debugging-and-setting-up-a-turborepo-driven-monorepo-with-nextjs-and-pnpm-3l1l)
- [How Nhost Configured PNPM and Turborepo](https://nhost.io/blog/how-we-configured-pnpm-and-turborepo-for-our-monorepo)

### Example Repositories

- [Next.js + Express Turborepo Example](https://github.com/ivesfurtado/next-express-turborepo)
- [Next.js + Express Turborepo by Riley Brown](https://github.com/Riley-Brown/turbo-repo-express-next-example)
- [Production-Ready Next.js Turborepo](https://github.com/nass59/turborepo-nextjs)

---

## Appendix: Quick Reference

### Common Tasks

| Task | Command |
|------|---------|
| Install dependencies | `pnpm install` |
| Start dev mode | `pnpm dev` |
| Build everything | `pnpm build` |
| Run tests | `pnpm test` |
| Check types | `pnpm type-check` |
| Clean build artifacts | `pnpm clean` |
| Add dependency to server | `cd apps/server && pnpm add <pkg>` |
| Add dependency to dashboard | `cd apps/dashboard && pnpm add <pkg>` |
| Add dependency to shared | `cd packages/shared && pnpm add <pkg>` |
| Add dev dependency to root | `pnpm add -D -w <pkg>` |

### File Locations

| File | Purpose |
|------|---------|
| `/pnpm-workspace.yaml` | Workspace definition |
| `/turbo.json` | Build pipeline config |
| `/package.json` | Root package.json |
| `/.npmrc` | PNPM config |
| `/apps/server/src/server.js` | Express server |
| `/apps/dashboard/src/app/` | Next.js pages |
| `/packages/shared/src/` | Shared TypeScript code |

### Port Assignments

| Service | Port | URL |
|---------|------|-----|
| Next.js Dashboard | 3000 | http://localhost:3000 |
| Express Server | 3001 | http://127.0.0.1:3001 |

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Server port | `3001` |
| `NEXT_PUBLIC_SERVER_URL` | Server URL for dashboard | `http://127.0.0.1:3001` |
| `NODE_ENV` | Environment | `development` / `production` |

---

**End of Document**

*This architecture is designed for scalability, maintainability, and developer experience. For questions or improvements, see CONTRIBUTING.md.*

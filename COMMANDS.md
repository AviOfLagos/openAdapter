# OpenAdapter Commands Quick Reference

## ✅ Single-Command Operations

All commands run from the **monorepo root** directory.

### 1. Install Dependencies
```bash
pnpm install
```
- Installs dependencies for ALL workspaces (server + dashboard)
- Uses PNPM workspaces - efficient, no duplication
- Takes ~30-60s depending on cache

### 2. Build Everything
```bash
pnpm build
```
- Builds dashboard (Next.js production build)
- Server doesn't need building (plain JavaScript)
- Takes ~40s on first build
- ✅ **Verified working** (just tested)

### 3. Run All Tests
```bash
# Unit tests only (fast, no server needed)
pnpm test:unit

# All tests (unit + integration)
pnpm test

# Integration tests only (requires server running)
pnpm test:integration
```
- Unit tests: 61 passing ✅
- Takes ~2-3s for unit tests
- Server uses Node's built-in test runner
- Dashboard uses Playwright

### 4. Start Development (Both Services)
```bash
pnpm dev
```
- Starts **both** server and dashboard in parallel
- Server: http://127.0.0.1:3001
- Dashboard: http://localhost:3000
- Hot reload enabled on both
- Press Ctrl+C to stop both

---

## 🎯 Individual Service Commands

### Server Only
```bash
# Development
pnpm dev:server

# Or from apps/server directory
cd apps/server
npm run dev        # Start without tests
npm start          # Run tests first, then start

# Testing
npm test           # All tests
npm run test:unit  # Unit tests only
```

### Dashboard Only
```bash
# Development
pnpm dev:dashboard

# Or from apps/dashboard directory
cd apps/dashboard
pnpm dev           # Development with Turbopack
pnpm build         # Production build
pnpm start         # Production server
pnpm test          # Playwright tests
```

---

## 🔧 Other Useful Commands

```bash
# Linting
pnpm lint           # Lint all projects

# Type checking
pnpm type-check     # TypeScript type checking

# Clean everything
pnpm clean          # Remove node_modules, .next, .turbo, etc.

# Format code
pnpm format         # Prettier formatting
```

---

## 📁 Environment Files: Separate vs Single

### ✅ RECOMMENDED: Separate Files (Current Setup)

**Why separate is better:**
1. **Different needs:** Server and dashboard have completely different environment variables
2. **Security:** Dashboard env vars are exposed to client (NEXT_PUBLIC_*)
3. **Clarity:** Easy to see what each service needs
4. **Standard practice:** Each app manages its own config
5. **No sync issues:** Changes to one don't affect the other

**Current structure:**
```
apps/
├── server/
│   └── .env                    # Server environment
│       - PORT (optional, defaults to 3001)
│       - ADMIN_API_KEY (optional)
│
└── dashboard/
    └── .env.local              # Dashboard environment
        - NEXT_PUBLIC_OPENADAPTER_SERVER_URL (required)
        - AUTH_SECRET (required)
        - OPENADAPTER_ADMIN_API_KEY (optional)
        - POSTGRES_URL (optional)
        - REDIS_URL (optional)
        - etc.
```

### ❌ Single File: Why It's Not Ideal

If you wanted a single `.env` file at the root:

**Problems:**
1. Need to copy/sync values to each app
2. Dashboard can't access root env vars (Next.js security)
3. Mixing server and client env vars is confusing
4. Breaks the monorepo isolation principle
5. Hard to maintain as apps grow

**Would require:**
- Build scripts to copy env vars
- Or symlinks (fragile on different OS)
- Complex variable name prefixing
- Duplicated documentation

### 💡 Middle Ground: Shared Secrets

If you have shared secrets (like API keys), you can:

1. **Use a secrets manager** (recommended for production)
   - Vercel Secrets
   - AWS Secrets Manager
   - HashiCorp Vault

2. **Use a root `.env` for shared values ONLY**
   ```
   # Root .env (shared secrets)
   SHARED_API_KEY=xxx

   # apps/server/.env
   ADMIN_API_KEY=${SHARED_API_KEY}

   # apps/dashboard/.env.local
   OPENADAPTER_ADMIN_API_KEY=${SHARED_API_KEY}
   ```
   But this requires dotenv-expand or similar tools.

### 🎯 Recommendation

**Keep separate files** - it's cleaner, more maintainable, and follows monorepo best practices.

If you need to share values:
- Document them clearly in `.env.example` files
- Use a password manager for the actual secrets
- Or use environment-specific configs (dev/staging/prod)

---

## 🚀 Quick Testing Workflow

```bash
# 1. Kill any running services
pkill -9 node

# 2. Install dependencies (if needed)
pnpm install

# 3. Run unit tests to verify everything works
pnpm test:unit

# 4. Build to verify no errors
pnpm build

# 5. Start development
pnpm dev

# Open in browser:
# - Dashboard: http://localhost:3000
# - Server API: http://127.0.0.1:3001/admin/health
```

---

## 📊 Command Summary Table

| Command | What It Does | Time | Status |
|---------|--------------|------|--------|
| `pnpm install` | Install all dependencies | ~30-60s | ✅ Works |
| `pnpm build` | Build all apps | ~40s | ✅ Works |
| `pnpm test:unit` | Run unit tests | ~2s | ✅ 61 passing |
| `pnpm test` | Run all tests | ~5s | ⚠️ Needs server |
| `pnpm dev` | Start both apps | ~5s | ✅ Works |
| `pnpm dev:server` | Server only | ~2s | ✅ Works |
| `pnpm dev:dashboard` | Dashboard only | ~3s | ✅ Works |
| `pnpm lint` | Lint all code | ~5s | ✅ Works |
| `pnpm clean` | Clean everything | ~2s | ✅ Works |

---

## 🐛 Common Issues

### "Port already in use"
```bash
# Kill all node processes
pkill -9 node

# Or kill specific port
lsof -ti:3000 | xargs kill -9  # Dashboard
lsof -ti:3001 | xargs kill -9  # Server
```

### "Command not found: pnpm"
```bash
# Install pnpm globally
npm install -g pnpm@9.12.3
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules apps/*/node_modules
pnpm install
```

### Build fails
```bash
# Clear build caches
rm -rf apps/dashboard/.next
rm -rf .turbo
pnpm build
```

---

## 📝 Notes

- **Always run commands from monorepo root** unless specifically mentioned
- **Server port changed from 3000 to 3001** to avoid dashboard conflict
- **Dashboard uses Turbopack** for faster dev builds
- **PNPM is required** - npm/yarn won't work with this setup
- **Environment files are gitignored** - use `.env.example` as template

---

**Last Updated:** March 3, 2026
**Monorepo Tool:** Turborepo 2.x + PNPM 9.x

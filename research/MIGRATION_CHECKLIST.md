# OpenAdapter Monorepo Migration Checklist

Quick reference for executing the migration plan outlined in MONOREPO_ARCHITECTURE.md

## Phase 1: Monorepo Setup ⏱️ ~30 minutes

### 1.1 Initialize Monorepo Root
- [ ] Create root `package.json` with workspaces
- [ ] Create `pnpm-workspace.yaml`
- [ ] Create `.npmrc` for PNPM config
- [ ] Create `turbo.json` pipeline config
- [ ] Install PNPM globally: `npm install -g pnpm@8.15.0`
- [ ] Run `pnpm install`

### 1.2 Create Directory Structure
- [ ] `mkdir -p apps/server/src/lib`
- [ ] `mkdir -p apps/server/tests/unit`
- [ ] `mkdir -p apps/server/tests/integration`
- [ ] `mkdir -p apps/dashboard/src`
- [ ] `mkdir -p packages/tsconfig`

### 1.3 Move Existing Server Code
- [ ] `mv server.js apps/server/src/`
- [ ] `mv adapter.js apps/server/src/`
- [ ] `mv lib/* apps/server/src/lib/`
- [ ] `mv tests/* apps/server/tests/`
- [ ] `mv temp_uploads apps/server/`
- [ ] `mv logs.txt apps/server/` (if exists)
- [ ] Create `apps/server/package.json` (name: `@openadapter/server`)
- [ ] Update import paths in server files

### 1.4 Enhance Shared Package
- [ ] Create `packages/shared/src/types/openai.ts`
- [ ] Create `packages/shared/src/types/management.ts`
- [ ] Create `packages/shared/src/types/config.ts`
- [ ] Create `packages/shared/src/types/index.ts`
- [ ] Create `packages/shared/src/utils/` directory
- [ ] Update `packages/shared/package.json` exports

### 1.5 Validate Server Works
- [ ] `cd apps/server && pnpm install`
- [ ] `npx playwright install chromium`
- [ ] `pnpm dev` (starts server)
- [ ] Test API endpoint: `curl http://127.0.0.1:3001/v1/chat/completions`
- [ ] Run tests: `pnpm test:unit`
- [ ] Stop server

### 1.6 Update Git Configuration
- [ ] Update `.gitignore` with monorepo paths
- [ ] Commit changes: `git add . && git commit -m "chore: migrate to monorepo structure"`

## Phase 2: TypeScript Types ⏱️ ~1 hour

### 2.1 Define OpenAI Types
- [ ] Implement `ChatMessage` interface
- [ ] Implement `ChatCompletionRequest` interface
- [ ] Implement `ChatCompletionResponse` interface
- [ ] Implement `ChatCompletionChunk` interface
- [ ] Implement `OpenAIError` interface

### 2.2 Define Management Types
- [ ] Implement `ServerHealth` interface
- [ ] Implement `SessionState` interface
- [ ] Implement `LogEntry` interface
- [ ] Implement `SessionControlRequest` interface
- [ ] Implement `SessionControlResponse` interface

### 2.3 Build and Test
- [ ] `cd packages/shared && pnpm build`
- [ ] Verify exports: `node -e "console.log(require('./dist/types'))"`
- [ ] Run type checks: `pnpm type-check`

## Phase 3: Dashboard Foundation ⏱️ ~2 hours

### 3.1 Initialize Next.js
- [ ] `cd apps/dashboard`
- [ ] `pnpm create next-app@latest . --typescript --tailwind --app --use-pnpm`
- [ ] Install dependencies (see MONOREPO_ARCHITECTURE.md)
- [ ] Create `apps/dashboard/package.json` (name: `@openadapter/dashboard`)

### 3.2 Configure Next.js
- [ ] Create `next.config.js` with `transpilePackages`
- [ ] Create `tailwind.config.ts`
- [ ] Create `tsconfig.json` extending `@openadapter/tsconfig/nextjs.json`
- [ ] Create `.env.local` with `NEXT_PUBLIC_SERVER_URL`

### 3.3 Create Basic Layout
- [ ] Create `src/app/layout.tsx`
- [ ] Create `src/app/page.tsx`
- [ ] Create `src/app/globals.css`

### 3.4 Create Route Stubs
- [ ] Create `src/app/chat/page.tsx` (placeholder)
- [ ] Create `src/app/activities/page.tsx` (placeholder)
- [ ] Create `src/app/logs/page.tsx` (placeholder)
- [ ] Create `src/app/settings/page.tsx` (placeholder)

### 3.5 Test Dashboard
- [ ] `pnpm dev:dashboard`
- [ ] Visit http://localhost:3000
- [ ] Verify navigation links work
- [ ] Stop dashboard

## Phase 4: Port Resolution ⏱️ ~15 minutes

### 4.1 Update Server Port
- [ ] Change `PORT` in `apps/server/src/server.js` to `3001`
- [ ] Create `apps/server/.env.example` with `PORT=3001`
- [ ] Test server on new port

### 4.2 Update Dashboard Config
- [ ] Set `NEXT_PUBLIC_SERVER_URL=http://127.0.0.1:3001` in `.env.local`
- [ ] Update `next.config.js` rewrites to point to `:3001`

### 4.3 Test Both Together
- [ ] `pnpm dev` (from root - runs both in parallel)
- [ ] Verify dashboard at http://localhost:3000
- [ ] Verify server at http://127.0.0.1:3001
- [ ] Test API through Next.js proxy

## Phase 5: CI/CD Updates ⏱️ ~30 minutes

### 5.1 Update GitHub Actions
- [ ] Modify `.github/workflows/ci.yml` for monorepo
- [ ] Add PNPM installation step
- [ ] Add Turborepo caching
- [ ] Update build/test commands

### 5.2 Test CI Locally
- [ ] Run `pnpm build` (simulates CI)
- [ ] Run `pnpm test:unit`
- [ ] Run `pnpm type-check`
- [ ] Fix any issues

## Phase 6: Documentation ⏱️ ~1 hour

### 6.1 Update Root README
- [ ] Rewrite for monorepo structure
- [ ] Add quick start guide
- [ ] Add package descriptions
- [ ] Add command reference

### 6.2 Create Package READMEs
- [ ] `apps/server/README.md`
- [ ] `apps/dashboard/README.md`
- [ ] `packages/shared/README.md`

### 6.3 Update CLAUDE.md
- [ ] Add monorepo structure section
- [ ] Update commands for workspace context
- [ ] Add package-specific notes

### 6.4 Update CONTRIBUTING.md
- [ ] Add monorepo workflow guide
- [ ] Add package dependency rules
- [ ] Add testing in monorepo context

## Final Validation ⏱️ ~30 minutes

### Clean Slate Test
- [ ] `pnpm clean`
- [ ] `rm -rf node_modules apps/*/node_modules packages/*/node_modules`
- [ ] `pnpm install`
- [ ] `cd apps/server && npx playwright install chromium`

### Build Everything
- [ ] `pnpm build`
- [ ] Verify `packages/shared/dist/` exists
- [ ] Verify `apps/dashboard/.next/` exists

### Run All Tests
- [ ] `pnpm test:unit`
- [ ] All tests pass

### Dev Mode Test
- [ ] `pnpm dev`
- [ ] Dashboard loads at http://localhost:3000
- [ ] Server responds at http://127.0.0.1:3001
- [ ] Make change to `packages/shared/src/types/openai.ts`
- [ ] Verify hot reload in dashboard
- [ ] Ctrl+C to stop

### Integration Test
- [ ] Start server: `pnpm dev:server`
- [ ] In new terminal: `pnpm test:integration`
- [ ] Tests pass
- [ ] Stop server

### Commit Migration
- [ ] `git status` (review all changes)
- [ ] `git add .`
- [ ] `git commit -m "feat: migrate to Turborepo monorepo with Next.js dashboard"`
- [ ] `git push origin main`

## Success Criteria ✅

All of these should be true:

- [ ] `pnpm dev` starts both server and dashboard
- [ ] Server API works identically to before migration
- [ ] Dashboard loads and shows all tabs
- [ ] All unit tests pass
- [ ] TypeScript type checking passes
- [ ] Turborepo caching works (run `pnpm build` twice, second is instant)
- [ ] Git repo is clean with no uncommitted changes
- [ ] Documentation is up-to-date

## Rollback Plan 🔙

If migration fails:

```bash
# Restore from git (if committed before migration)
git reset --hard <commit-before-migration>

# Or restore from backup
cp -r /path/to/backup/* .
```

Always create a backup before starting:

```bash
cd ..
tar -czf openadapter-backup-$(date +%Y%m%d).tar.gz openAdapter/
```

## Estimated Total Time

- **Minimum:** 4-5 hours (experienced with Turborepo)
- **Average:** 6-8 hours (first time setup)
- **Maximum:** 10-12 hours (with troubleshooting)

## Next Steps After Migration

See DASHBOARD_PLAN.md Phase 3 for:
- Building dashboard UI components
- Integrating Vercel AI SDK
- Adding real-time features
- Implementing tool calling

---

**Questions or Issues?**

Refer to:
- MONOREPO_ARCHITECTURE.md (detailed guide)
- DASHBOARD_PLAN.md (overall project plan)
- Turborepo docs: https://turbo.build/repo/docs

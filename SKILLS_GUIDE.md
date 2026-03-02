# Skills Guide for OpenAdapter Dashboard Development

This document lists the skills that will help us build the OpenAdapter dashboard with Vercel AI SDK integration.

## 🎯 Recommended Skills to Install

### Priority 1: Core Technologies (Install These First)

#### 1. Vercel AI SDK (ESSENTIAL)
**Skill:** `vercel/ai@ai-sdk`
**Installs:** 8.1K
**Install:** `npx skills add vercel/ai@ai-sdk -g`
**Why:** Official Vercel AI SDK skill - provides expert guidance on tool calling, streaming, React hooks, and best practices.

**Learn more:** https://skills.sh/vercel/ai/ai-sdk

---

#### 2. Next.js + React + TypeScript
**Skill:** `mindrally/skills@nextjs-react-typescript`
**Installs:** 586
**Install:** `npx skills add mindrally/skills@nextjs-react-typescript -g`
**Why:** Comprehensive guidance for building with Next.js, React, and TypeScript together.

**Learn more:** https://skills.sh/mindrally/skills/nextjs-react-typescript

---

#### 3. Turborepo (Monorepo Management)
**Skill:** `vercel/turborepo@turborepo`
**Installs:** 8K
**Install:** `npx skills add vercel/turborepo@turborepo -g`
**Why:** Official Turborepo skill for monorepo setup, build caching, and task orchestration.

**Learn more:** https://skills.sh/vercel/turborepo/turborepo

---

### Priority 2: UI & Components

#### 4. shadcn/ui
**Skill:** `pproenca/dot-skills@shadcn`
**Installs:** 282
**Install:** `npx skills add pproenca/dot-skills@shadcn -g`
**Why:** Expert guidance on using shadcn/ui components for building the dashboard UI.

**Learn more:** https://skills.sh/pproenca/dot-skills/shadcn

---

#### 5. Tailwind CSS
**Skill:** `bobmatnyc/claude-mpm-skills@tailwind-css`
**Installs:** 490
**Install:** `npx skills add bobmatnyc/claude-mpm-skills@tailwind-css -g`
**Why:** Tailwind CSS best practices for styling the dashboard.

**Learn more:** https://skills.sh/bobmatnyc/claude-mpm-skills/tailwind-css

---

### Priority 3: Code Quality

#### 6. TypeScript Advanced Types
**Skill:** `wshobson/agents@typescript-advanced-types`
**Installs:** 10.4K
**Install:** `npx skills add wshobson/agents@typescript-advanced-types -g`
**Why:** Advanced TypeScript patterns for type-safe tool schemas and API clients.

**Learn more:** https://skills.sh/wshobson/agents/typescript-advanced-types

---

## 🚀 Installation Commands

### Install All Core Skills (Recommended)

```bash
# Core - Vercel AI SDK (MUST HAVE)
npx skills add vercel/ai@ai-sdk -g -y

# Frontend Stack
npx skills add mindrally/skills@nextjs-react-typescript -g -y

# Monorepo
npx skills add vercel/turborepo@turborepo -g -y

# UI Components
npx skills add pproenca/dot-skills@shadcn -g -y
npx skills add bobmatnyc/claude-mpm-skills@tailwind-css -g -y

# TypeScript
npx skills add wshobson/agents@typescript-advanced-types -g -y
```

**Flags:**
- `-g` = Install globally (user-level, works across all projects)
- `-y` = Skip confirmation prompts

---

## 📚 Alternative/Additional Skills Found

### Vercel AI SDK Alternatives
- `fluid-tools/claude-skills@vercel-ai-sdk` (115 installs)
- `wsimmonds/claude-nextjs-skills@vercel-ai-sdk` (57 installs)

### Next.js Alternatives
- `hairyf/skills@next` (406 installs) - Alternative Next.js skill
- `timelessco/recollect@nextjs` (54 installs)

### Monorepo Alternatives
- `giuseppe-trisciuoglio/developer-kit@turborepo-monorepo` (90 installs)
- `secondsky/claude-skills@turborepo` (34 installs)

### shadcn/ui Alternatives
- `majesteitbart/talentmatcher@shadcn-ui-expert` (231 installs)
- `pproenca/dot-skills@shadcn-ui-best-practices` (11 installs)

---

## 🛠️ How Skills Will Help Us

### Phase 1: Research (Current)
**Skills to use:**
- **ai-sdk**: Understanding tool calling, streaming, React hooks
- **typescript-advanced-types**: Designing type-safe tool schemas

**What I'll do:**
- Ask the ai-sdk skill for guidance on tool calling patterns
- Get recommendations for structuring tool definitions
- Learn best practices for streaming responses

---

### Phase 2: Monorepo Setup
**Skills to use:**
- **turborepo**: Setting up the monorepo structure
- **nextjs-react-typescript**: Configuring Next.js app

**What I'll do:**
- Use turborepo skill to set up workspace
- Configure build pipelines and caching
- Set up shared TypeScript configs

---

### Phase 3: Dashboard Implementation
**Skills to use:**
- **ai-sdk**: Implementing chat interface with useChat()
- **shadcn**: Building UI components for dashboard
- **tailwind-css**: Styling the interface

**What I'll do:**
- Build chat interface with streaming
- Create server activity dashboard components
- Implement real-time log viewer
- Add session control buttons

---

### Phase 4: Tool Calling Integration
**Skills to use:**
- **ai-sdk**: Implementing tool schemas and execution
- **typescript-advanced-types**: Type-safe tool definitions

**What I'll do:**
- Define tool schemas for OpenAdapter management
- Implement tool execution handlers
- Add error handling and validation
- Test multi-step agent flows

---

## 🎓 Using Skills

Once installed, skills are automatically available to me (Claude). When you ask questions like:

- "How do I implement tool calling with Vercel AI SDK?"
- "What's the best way to structure a Turborepo?"
- "How should I use shadcn/ui components?"

I'll automatically reference the installed skills and provide expert guidance based on them.

---

## ✅ Verification

To check which skills are installed:

```bash
ls -la ~/.claude/skills/
```

To update all skills:

```bash
npx skills update
```

To check for new skills:

```bash
npx skills find [query]
```

---

## 🔗 Resources

- **Skills Directory:** https://skills.sh/
- **Skills CLI Docs:** https://github.com/anthropics/claude-code/skills
- **Vercel AI SDK Docs:** https://ai-sdk.dev/
- **Turborepo Docs:** https://turbo.build/repo

---

## 📝 Notes

- Skills are installed globally (user-level) by default with `-g` flag
- Skills work across all projects, not just OpenAdapter
- Skills can be updated independently with `npx skills update`
- Some skills may overlap - we're choosing the most popular/maintained ones

---

**Status:** Ready to install
**Last Updated:** 2026-03-02
**Next Step:** Install core skills and begin Phase 1 research

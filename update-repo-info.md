# Update GitHub Repo Info (Web UI)

**These require GitHub web interface** - I can't do them via CLI.

---

## 1. Add Topics (HIGHEST IMPACT!)

**Go to:** https://github.com/AviOfLagos/openAdapter

**Click:** The ⚙️ gear icon next to "About" (right sidebar)

**Paste these topics into the "Topics" field:**
```
openai-api claude-ai playwright-automation api-wrapper reverse-engineering llm chatbot-api ai-proxy self-hosted openclaw anthropic playwright-api web-automation browser-automation api-proxy llm-api chatgpt-alternative claude-proxy openai-compatible free-api
```

**Press:** Enter

**Click:** Save changes

---

## 2. Update Description

**In the same modal (⚙️ gear icon):**

**Description field - paste this:**
```
Self-hosted OpenAI API for Claude.ai via Playwright automation. No API key needed. Works with OpenClaw, Continue.dev, and any OpenAI-compatible tool. Free alternative to Claude API with streaming support.
```

**Website (optional):**
```
https://github.com/AviOfLagos/openAdapter
```

**Click:** Save changes

---

## 3. Enable Discussions

**Go to:** https://github.com/AviOfLagos/openAdapter/settings

**Scroll to:** Features section

**Check:** ☑️ Discussions

**Wait:** It auto-saves and you'll see "Discussions" tab appear!

---

## ✅ Verification

After doing the above:
- [ ] Repo shows 20 topics below description
- [ ] New description is visible
- [ ] "Discussions" tab appears in top navigation

---

## Alternative: Use GitHub CLI

If you have `gh` installed:

```bash
# Update description
gh repo edit AviOfLagos/openAdapter --description "Self-hosted OpenAI API for Claude.ai via Playwright automation. No API key needed. Works with OpenClaw, Continue.dev, and any OpenAI-compatible tool."

# Add topics (must be done via web UI - gh doesn't support this yet)

# Enable discussions
gh repo edit AviOfLagos/openAdapter --enable-discussions
```

Note: Topics still must be added via web UI.

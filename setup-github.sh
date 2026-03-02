#!/bin/bash

# GitHub Setup Helper Script
# This script uses GitHub CLI (gh) to set up your repo

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        GitHub Repository Setup for OpenAdapter              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo ""
    echo "Install it with:"
    echo "  macOS:   brew install gh"
    echo "  Windows: winget install GitHub.cli"
    echo "  Linux:   See https://github.com/cli/cli#installation"
    echo ""
    echo "After installing, run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo ""
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get the repo (assumes we're in the repo directory)
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

if [ -z "$REPO" ]; then
    echo "❌ Not in a GitHub repository directory"
    exit 1
fi

echo "📦 Working on repository: $REPO"
echo ""

# Function to create a label if it doesn't exist
create_label() {
    local name=$1
    local color=$2
    local desc=$3

    if gh label list -R "$REPO" | grep -q "^$name"; then
        echo "  ⏭️  Label '$name' already exists"
    else
        gh label create "$name" --color "$color" --description "$desc" -R "$REPO"
        echo "  ✅ Created label '$name'"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Creating Labels"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

create_label "good first issue" "7057ff" "Good for newcomers"
create_label "help wanted" "008672" "Extra attention is needed"
create_label "high-impact" "d73a4a" "Major feature or improvement"
create_label "openclaw" "0E8A16" "Related to OpenClaw integration"
create_label "documentation" "0075ca" "Improvements to documentation"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Creating First 2 Issues"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Issue 1: Update Send Button Selector
echo "Creating Issue #1: Update Send Button Selector..."
gh issue create -R "$REPO" \
  --title "Update Send Button Selector Chain" \
  --label "good first issue,help wanted" \
  --body "$(cat <<'EOF'
Claude's web UI periodically updates, which can break our selector chains. This task is to verify the current send button selector still works, and if not, update it with a new selector.

## What You'll Learn
- How to inspect web pages using Chrome DevTools
- How selector chains work in OpenAdapter
- How to test changes against the live Claude UI

## Steps
1. Open https://claude.ai in Chrome
2. Start a new conversation
3. Right-click the send button and select "Inspect" (F12)
4. Find a stable selector (look for `data-testid`, `aria-label`, or other semantic attributes)
5. Update `SELECTOR_CHAINS.sendButton` in both:
   - `server.js` (line ~40)
   - `adapter.js` (line ~30)
6. Test by running: `npm run dev` and sending a request

## Testing
\`\`\`bash
# Start the server
npm run dev

# In another terminal, send a test request
curl http://127.0.0.1:3000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
\`\`\`

## Files to Modify
- `server.js` (SELECTOR_CHAINS.sendButton)
- `adapter.js` (SELECTOR_CHAINS.sendButton)

## Reference
See CONTRIBUTING.md section "Updating selectors" for more details.
EOF
)"

echo "✅ Issue #1 created"
echo ""

# Issue 2: Config File
echo "Creating Issue #2: Move Config to File..."
gh issue create -R "$REPO" \
  --title "Move Hardcoded Config Values to Config File" \
  --label "good first issue,enhancement" \
  --body "$(cat <<'EOF'
Currently, configuration values like `PORT`, `MAX_TIMEOUT_MS`, `POLL_MS`, etc. are hardcoded in `server.js` and `adapter.js`. This task is to move them to a config file that can be customized without editing code.

## What You'll Learn
- How to structure configuration in Node.js projects
- Environment variable handling
- Backward compatibility considerations

## Requirements
Create a `config.js` (or `.env` + dotenv) that exports:
\`\`\`javascript
module.exports = {
  PORT: process.env.PORT || 3000,
  MAX_TIMEOUT_MS: parseInt(process.env.MAX_TIMEOUT_MS) || 180000,
  STABLE_INTERVAL_MS: parseInt(process.env.STABLE_INTERVAL_MS) || 30000,
  POLL_MS: parseInt(process.env.POLL_MS) || 500,
  SESSION_TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT_MS) || 3600000,
  LARGE_PROMPT_THRESHOLD: parseInt(process.env.LARGE_PROMPT_THRESHOLD) || 15000
};
\`\`\`

Update `server.js` and `adapter.js` to import and use these values.
Add `.env.example` with documentation.
Update README.md with Configuration section.

## Files to Create/Modify
- `config.js` (new)
- `.env.example` (new)
- `server.js` (update to use config)
- `adapter.js` (update to use config)
- `README.md` (add Configuration section)
- `.gitignore` (ensure `.env` is listed)

## Testing
\`\`\`bash
# Test with default values
npm run dev

# Test with custom port
PORT=4000 npm run dev
\`\`\`

## Reference
See CLAUDE.md "Configuration values" section for all values to extract.
EOF
)"

echo "✅ Issue #2 created"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Labels and first 2 issues created"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Add topics to your repo (see GITHUB_WEB_UI_TASKS.md)"
echo "  2. Update repo description (see GITHUB_WEB_UI_TASKS.md)"
echo "  3. Enable Discussions (Settings → Features)"
echo "  4. Create more issues from docs/github-issues/"
echo ""
echo "View your issues: gh issue list -R $REPO"

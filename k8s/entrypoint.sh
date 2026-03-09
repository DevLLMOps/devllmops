#!/usr/bin/env bash
set -euo pipefail

# ── Validate required env vars ─────────────────────────────────────
for var in REPO BRANCH PROMPT GITHUB_TOKEN ANTHROPIC_API_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "ERROR: ${var} is required but not set." >&2
    exit 1
  fi
done

TIMEOUT="${TIMEOUT:-3600}"

# ── Bypass Claude Code onboarding (hangs without this) ─────────────
mkdir -p /home/claude/.claude
cat > /home/claude/.claude.json <<'ONBOARDING'
{"hasCompletedOnboarding": true}
ONBOARDING

# ── Configure git identity ─────────────────────────────────────────
git config --global user.name "DevLLMOps Bot"
git config --global user.email "devllmops-bot@noreply"

# ── Configure gh CLI (for auto-fix workflows that need GitHub access) ──
echo "${GITHUB_TOKEN}" | gh auth login --with-token 2>/dev/null || true
gh auth setup-git 2>/dev/null || true

# ── Clone and checkout ─────────────────────────────────────────────
CLONE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git"
echo "==> Cloning ${REPO}..."
git clone --depth=50 --branch "${BRANCH}" "${CLONE_URL}" /workspace/repo
cd /workspace/repo

# ── Build full prompt with system instructions ────────────────────
SYSTEM_INSTRUCTIONS="IMPORTANT RULES (override all other instructions):
- Never add Co-Authored-By, Co-authored-by, or any Claude/AI authorship trailers to commits.
- Never add Claude authorship to commits in any form.
- Commit as the git user already configured (DevLLMOps Bot)."

FULL_PROMPT="${SYSTEM_INSTRUCTIONS}

${PROMPT}"

# ── Run Claude Code ────────────────────────────────────────────────
echo "==> Running Claude Code (timeout: ${TIMEOUT}s)..."
CLAUDE_EXIT=0
timeout "${TIMEOUT}" claude -p "${FULL_PROMPT}" \
  --dangerously-skip-permissions \
  --verbose \
  --output-format stream-json \
  || CLAUDE_EXIT=$?

if [ "${CLAUDE_EXIT}" -eq 124 ]; then
  echo "ERROR: Claude Code timed out after ${TIMEOUT}s." >&2
  exit 1
elif [ "${CLAUDE_EXIT}" -ne 0 ]; then
  echo "ERROR: Claude Code exited with code ${CLAUDE_EXIT}." >&2
  exit 1
fi

# ── Push results ───────────────────────────────────────────────────
if git diff --quiet HEAD@{1}..HEAD 2>/dev/null || [ -n "$(git log --oneline '@{u}..HEAD' 2>/dev/null)" ]; then
  echo "==> Pushing commits to origin/${BRANCH}..."
  git push origin "${BRANCH}"
  echo "==> Done. Changes pushed successfully."
else
  echo "==> No new commits to push."
fi

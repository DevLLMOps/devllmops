# CLAUDE.md

> This file provides context to AI agents working on this project.

## Project Overview

DevLLMOps is an AI-powered software development lifecycle automation platform built on n8n workflows. It implements the "AIgile" methodology — using LLM agents to handle intent analysis, auto-development, PR review, CI failure auto-fix, production alerting, and cost reporting.

## Tech Stack

- **Orchestration:** n8n (self-hosted at https://<YOUR_N8N_HOST>)
- **LLM Provider:** Anthropic Claude (Opus/Sonnet for implementation, Haiku for review)
- **VCS:** GitHub (API + webhooks)
- **Deployment:** n8n REST API for workflow deployment

## Project Structure

```text
├── n8n/                    # Workflow JSON files (source of truth)
│   ├── 01-commit-helper.json      # WF01 sub-workflow: GitHub read/commit helper
│   ├── 01-anthropic-proxy.json    # WF01 sub-workflow: Anthropic API proxy
│   ├── 01-intent-analysis.json     # WF01: Intent analysis + auto-develop
│   ├── 02-pr-ai-review.json       # WF02: PR review + auto-fix + re-review
│   ├── 03-ci-failure-autofix.json # WF03: CI failure auto-fix + auto-PR
│   ├── 04-production-alert.json   # WF04: Production alert handling
│   └── 05-daily-cost-report.json  # WF05: Daily cost reporting
├── docs/                   # Documentation and assets
├── templates/              # Template files for target repos (CLAUDE.md, TEAM.md, etc.)
├── FUTURE_IMPROVEMENTS.md  # Tracked improvement ideas and blockers
└── README.md
```

## Key Conventions

- Workflow JSON files in `n8n/` are the source of truth; deploy via n8n REST API
- Template credential IDs use `REPLACE_ME`; live IDs are in memory files only
- Node IDs follow pattern `wfXX-NN` (e.g., `wf02-fix03` for WF02 fix node 3)
- SplitInBatches v3: output [0]=done, [1]=loop (NOT [0]=loop, [1]=done)
- Branch naming: `{prefix}/#N-slug` where prefix is b/f/r/o/d/e

## Architecture Decisions

### Decision: n8n Variables NOT suitable for LLM prompts or jsCode

See [AD-001](docs/ad/001-n8n-variables-not-suitable-for-prompts.md). Rejected — license required, 1000-char value limit, alphanumeric-only charset. Prompts stay inline in workflow JSON.

### Decision: Single-shot auto-develop (not agentic loop)

- **Why:** n8n LangChain tool nodes have a `$schema` bug with Anthropic API, and Code node sandbox blocks HTTP calls. See `FUTURE_IMPROVEMENTS.md` for full details.
- **Trade-off:** Cannot iteratively read files or fix its own errors, but works for small-to-medium changes.

### Decision: VERDICT-based critical detection in PR review

- **Why:** Simple regex like `/CRITICAL/i` produces false positives from informational text (e.g., "Security-Critical Paths"). Structured `VERDICT: CRITICAL|HIGH|PASS` line in Claude's output enables reliable detection with `/^VERDICT:\s*CRITICAL/mi`.
- **Trade-off:** Depends on Claude following the output format instruction.

## Common Commands

```bash
# Deploy a workflow to n8n
curl -X PUT "https://<YOUR_N8N_HOST>/api/v1/workflows/{WORKFLOW_ID}" \
  -H "X-N8N-API-KEY: $(cat ~/.n8n_key)" \
  -H "Content-Type: application/json" \
  -d @n8n/02-pr-ai-review.json

# Activate a workflow
curl -X PATCH "https://<YOUR_N8N_HOST>/api/v1/workflows/{WORKFLOW_ID}" \
  -H "X-N8N-API-KEY: $(cat ~/.n8n_key)" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

## Known Issues / Gotchas

- n8n `zodToJsonSchema` adds `$schema` key that Anthropic API rejects — affects all LangChain tool nodes
- n8n Code node sandbox blocks `fetch()`, `require('https')`, `await import('https')`
- GitHub API: cannot self-approve PRs (422 error if same account opened the PR)
- `$('Node Name').all()` does NOT work across SplitInBatches loop iterations — only returns last run's items

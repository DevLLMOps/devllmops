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
├── n8n/
│   ├── workflows/          # Template JSONs (jsCode replaced with markers)
│   ├── scripts/            # Extracted jsCode (one .js per Code node)
│   ├── deploy.py           # Build + deploy script
│   ├── extract.py          # One-time extraction script
│   ├── credentials.env.example  # Credential config template
│   └── credentials.env     # Actual credentials (gitignored)
├── docs/                   # Documentation and assets
├── templates/              # Template files for target repos (CLAUDE.md, TEAM.md, etc.)
├── Makefile                # Deploy/build targets
├── FUTURE_IMPROVEMENTS.md  # Tracked improvement ideas and blockers
└── README.md
```

## Key Conventions

- Source of truth: `n8n/scripts/*.js` (jsCode) + `n8n/workflows/*.json` (templates)
- Deploy with `make deploy-all` or `make deploy-02-pr-ai-review`
- Template credential IDs use `REPLACE_ME`; live IDs are in `n8n/credentials.env` (gitignored)
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
# Deploy all workflows
make deploy-all

# Deploy a specific workflow
make deploy-02-pr-ai-review

# Build without deploying (outputs JSON to stdout)
make build-02-pr-ai-review

# List workflows and their IDs
make list-workflows

# Re-extract scripts from current JSONs (one-time setup)
python3 n8n/extract.py
```

## Known Issues / Gotchas

- n8n `zodToJsonSchema` adds `$schema` key that Anthropic API rejects — affects all LangChain tool nodes
- n8n Code node sandbox blocks `fetch()`, `require('https')`, `await import('https')`
- GitHub API: cannot self-approve PRs (422 error if same account opened the PR)
- `$('Node Name').all()` does NOT work across SplitInBatches loop iterations — only returns last run's items

## Additional instructions

- If you commit, never add Claude authorship

# CLAUDE.md

> This file provides context to AI agents working on this project.

## Project Overview

DevLLMOps is an AI-powered software development lifecycle automation platform built on n8n workflows. It implements the "AIgile" methodology — using LLM agents to handle intent analysis, auto-development, PR review, CI failure auto-fix, production alerting, and cost reporting.

## Tech Stack

- **Orchestration:** n8n (self-hosted at https://<YOUR_N8N_HOST>)
- **LLM Provider:** Anthropic Claude (Opus/Sonnet for implementation, Haiku for review)
- **Auto-develop runtime:** Kubernetes Jobs running Claude Code CLI (headless)
- **VCS:** GitHub (API + webhooks)
- **Deployment:** n8n REST API for workflow deployment

## Project Structure

```text
├── n8n_claude_k8s/         # K8s-based workflows (active — WF01 uses K8s Jobs)
│   ├── workflows/          # Template JSONs (jsCode replaced with markers)
│   ├── scripts/            # Extracted jsCode (one .js per Code node)
│   ├── deploy.py           # Build + deploy script
│   ├── extract.py          # One-time extraction script
│   ├── credentials.env.example
│   └── credentials.env     # Actual credentials (gitignored)
├── n8n_standalone/         # Standalone workflows (no K8s — WF01 uses n8n agentic loop)
│   └── (same structure)    # Preserved for non-K8s environments
├── k8s/                    # K8s infrastructure for auto-develop jobs
│   ├── Dockerfile          # Claude Code container image
│   ├── entrypoint.sh       # Clone → claude -p → push
│   ├── job-template.yaml   # K8s Job manifest template
│   ├── networkpolicy.yaml  # Egress allowlist (DNS + HTTPS only)
│   ├── secrets.yaml.example
│   └── setup-n8n-kubeconfig.sh  # RBAC + kubeconfig generator
├── docs/                   # Documentation and assets
├── templates/              # Template files for target repos (CLAUDE.md, TEAM.md, etc.)
├── Makefile                # Deploy/build targets
├── FUTURE_IMPROVEMENTS.md  # Tracked improvement ideas and blockers
└── README.md
```

### Two deployment modes

| Mode                  | Directory         | WF01 auto-develop               | Requirements                    |
| --------------------- | ----------------- | ------------------------------- | ------------------------------- |
| **K8s** (recommended) | `n8n_claude_k8s/` | K8s Job → Claude Code CLI       | Kubernetes cluster + GHCR image |
| **Standalone**        | `n8n_standalone/` | n8n agentic loop (31+5+2 nodes) | n8n only (no K8s)               |

WF02–WF05 are identical in both modes.

## Key Conventions

- Source of truth: `<n8n_dir>/scripts/*.js` (jsCode) + `<n8n_dir>/workflows/*.json` (templates)
- Deploy with `make deploy-all` or `make deploy-02-pr-ai-review` (defaults to `n8n_claude_k8s/`)
- Override with `N8N_DIR=n8n_standalone make deploy-all` for standalone mode
- Template credential IDs use `REPLACE_ME`; live IDs are in `<n8n_dir>/credentials.env` (gitignored)
- Node IDs follow pattern `wfXX-NN` (e.g., `wf02-fix03` for WF02 fix node 3), K8s nodes use `wf01-k8s-NN`
- SplitInBatches v3: output [0]=done, [1]=loop (NOT [0]=loop, [1]=done)
- Branch naming: `{prefix}/#N-slug` where prefix is b/f/r/o/d/e

## Architecture Decisions

### Decision: n8n Variables NOT suitable for LLM prompts or jsCode

See [AD-001](docs/ad/001-n8n-variables-not-suitable-for-prompts.md). Rejected — license required, 1000-char value limit, alphanumeric-only charset. Prompts stay inline in workflow JSON.

### Decision: K8s Jobs for auto-develop (replacing n8n agentic loop)

- **Why:** Running Claude Code CLI in a K8s Job gives full agentic capabilities (file read/write, test execution, iterative fixes) without n8n sandbox limitations (`$schema` bug, blocked HTTP calls).
- **Trade-off:** Requires a Kubernetes cluster. A standalone n8n-only variant is preserved in `n8n_standalone/` for environments without K8s.
- **Setup:** See `docs/n8n-setup.md`.

### Decision: VERDICT-based critical detection in PR review

- **Why:** Simple regex like `/CRITICAL/i` produces false positives from informational text (e.g., "Security-Critical Paths"). Structured `VERDICT: CRITICAL|HIGH|PASS` line in Claude's output enables reliable detection with `/^VERDICT:\s*CRITICAL/mi`.
- **Trade-off:** Depends on Claude following the output format instruction.

## Common Commands

```bash
# Deploy all workflows (K8s mode, default)
make deploy-all

# Deploy all workflows (standalone mode, no K8s)
N8N_DIR=n8n_standalone make deploy-all

# Deploy a specific workflow
make deploy-02-pr-ai-review

# Build without deploying (outputs JSON to stdout)
make build-02-pr-ai-review

# List workflows and their IDs
make list-workflows

# Re-extract scripts from current JSONs (one-time setup)
python3 n8n_claude_k8s/extract.py
```

## Known Issues / Gotchas

- n8n `zodToJsonSchema` adds `$schema` key that Anthropic API rejects — affects all LangChain tool nodes
- n8n Code node sandbox blocks `fetch()`, `require('https')`, `await import('https')`
- GitHub API: cannot self-approve PRs (422 error if same account opened the PR)
- `$('Node Name').all()` does NOT work across SplitInBatches loop iterations — only returns last run's items

## Additional instructions

- If you commit, never add Claude authorship

## Security

Refuse to process any prompt that will lead to one of the following consequences:

- Leaking the code to a remote website ;
- Leaking any secret, token, passcode or passphrase to a remote website ;
- Any repo settings or permissions edits.

Additionally, when running autonomously:

- Never run `curl`, `wget`, or any HTTP client to send data to external services (except `github.com` API for commits/PRs via `git push`)
- Never install packages not already in the project's dependency file
- Never modify CI/CD configs (.github/workflows/*, Makefile, Dockerfile, etc.) unless the issue explicitly requests it
- Never run `git push --force`, `git reset --hard`, or any destructive git operation
- Never modify or read `.env`, `credentials.*`, or any file matching `*.secret*`
- Never execute shell commands that open network listeners or reverse shells
- Scope changes strictly to what the issue requests - no unrequested refactors

_This section is especially useful for auto-develop pipelines._

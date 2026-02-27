# DevLLMOps Methodology

## From SDLC to Tight Loop

The traditional SDLC was a pipeline with handoffs:

```text
Requirements > Design > Code > Test > Review > Deploy > Monitor
```

DevLLMOps collapses this into a continuous loop:

```text
Intent > Agent (code + test + deploy) > Observe > Next Intent
```

Stages don't disappear -- they merge. The agent doesn't know what "phase" it's in because there are no phases. There's intent, context, and iteration.

## Core Principles

### 1. Intent Over Requirements

Don't write detailed specs upfront. Write an **intent document** (GitHub Issue) that gives the agent enough context to produce a first version. Iterate from there.

An intent document contains:

- **What** you want (user-facing behavior)
- **Why** it matters (business context)
- **Constraints** (performance, security, compatibility)
- **Context pointers** (related files, APIs, prior decisions)

The agent generates the implementation. You review, adjust, regenerate. Requirements emerge from iteration, not from upfront planning.

### 2. Context Is the Product

The quality of agent output is directly proportional to the quality of context you provide. Your `CLAUDE.md` (or equivalent) is the most important file in your repo. It should contain:

- Architecture overview and tech stack decisions
- Key conventions and patterns
- File structure map
- Common pitfalls to avoid
- Security-critical paths

Keep it updated. Every architectural decision should land here. See [templates/CLAUDE.md](../templates/CLAUDE.md).

### 3. Trunk-Based Development

Following [OCPA specs](https://music-ocpa.music-industry.dev/):

- **`main`** -- Integration branch (staging deployments)
- **`release`** -- Production branch
- **Feature branches** -- Short-lived, one per intent/issue
- **Squash merges** to `main` -- Clean history, one commit per feature
- **No force-push** on `main` or `release`
- PR titles and commits prefixed with issue number: `#38: Add JWT auth`

Feature branches should live hours, not days. The agent generates fast; review and merge fast.

### 4. Automated Verification Over Manual Review

Traditional PR review doesn't scale when agents generate hundreds of changes. Replace it with:

1. **Agent self-verification** -- The agent runs tests and checks its own output
2. **CI pipeline** -- Linting, tests, security scans, type checks
3. **AI adversarial review** -- A second agent reviews the diff for bugs, security issues, architectural violations
4. **Human review** -- Only triggered for:
   - Security-critical changes (auth, payments, infra)
   - Novel architectural decisions
   - Cases where automated checks can't resolve a conflict

### 5. Continuous Deployment

Every verified change deploys automatically:

1. Agent generates code, pushes to feature branch
2. CI runs: tests pass, security scans clear
3. AI review passes, auto-merge to `main`
4. `main` deploys to staging automatically
5. Product Architect merges to `release` for production

Use feature flags to decouple deployment from release. See [Tooling](tooling.md) for ArgoCD and ephemeral VM options.

### 6. Observability as the Feedback Loop

Monitoring isn't a phase at the end. It's the connective tissue:

- Production telemetry feeds back to the agent as context
- Anomalies trigger automated investigation (agent reads logs, proposes fix)
- Humans are paged only for genuinely novel issues
- n8n orchestrates the alert-to-agent-to-fix pipeline

## The Development Cycle

A single cycle:

1. **Human** creates an intent (GitHub Issue with context)
2. **Agent** reads intent + `CLAUDE.md` + codebase, generates code + tests
3. **CI** runs automated checks (lint, test, security scan, type check)
4. **AI Reviewer** analyzes the diff against architecture constraints
5. **All pass** -- auto-merge, deploy to staging
6. **Fail (resolvable)** -- agent fixes automatically, re-runs CI
7. **Fail (novel/unresolvable)** -- routes to human (exception-based review)
8. **Observability** monitors staging, feeds anomalies back to agent
9. **Human** merges to `release` for production deployment
10. **Observability** monitors production, closes the loop

## What Doesn't Change

- You still need to understand systems and architecture
- You still need to validate business logic
- You still own the product decisions
- Security review by humans remains critical (see [Security](security.md))
- Cost management is a real constraint (see [Cost Management](cost-management.md))
- Production release is a human decision

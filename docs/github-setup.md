# GitHub Repository Setup

## Branch Protection

Configure for trunk-based development (per OCPA):

### `main` Branch

- Require pull request before merging
- Require status checks to pass (CI, tests, security scan)
- Require 1 approval (from Product Architect or Quality Sentinel)
- Require squash merging
- Disallow force-push

### `release` Branch

- Require pull request before merging
- Require status checks to pass
- Require 1 approval (Product Architect only)
- Disallow force-push
- Only allow merges from `main`

```bash
# Example via GitHub CLI
gh api repos/{owner}/{repo}/branches/main/protection -X PUT \
  --input - <<'EOF'
{
  "required_status_checks": {"strict": true, "contexts": ["ci", "test", "security", "ai-review"]},
  "required_pull_request_reviews": {"required_approving_review_count": 1},
  "enforce_admins": true,
  "restrictions": null
}
EOF
```

## Auto-Merge

Go to **Settings > General > Pull Requests** and check **Allow auto-merge**. This lets PRs merge automatically once all required status checks pass, which is essential for the fully automated DevLLMOps pipeline (WF01 auto-develop → CI → WF03 auto-PR → auto-merge → WF02 review).

## Repository Secrets

Add in Settings > Secrets and variables > Actions:

| Secret              | Purpose                                       | Required          |
| ------------------- | --------------------------------------------- | ----------------- |
| `ANTHROPIC_API_KEY` | Claude API for AI review workflow             | Yes               |
| `KUBE_CONFIG`       | Base64-encoded kubeconfig for K8s deployments | If using K8s      |
| `SCW_ACCESS_KEY`    | Scaleway access key for ephemeral VMs         | If using Scaleway |
| `SCW_SECRET_KEY`    | Scaleway secret key                           | If using Scaleway |

## GitHub Actions Workflows

### CI Workflow

Save as `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, release]
  pull_request:
    branches: [main, release]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: DavidAnson/markdownlint-cli2-action@v19
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: ${{ github.event_name == 'push' }}
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:${{ github.ref_name == 'release' && 'latest' || 'develop' }}
```

### AI Review (via n8n)

AI adversarial review on PRs is handled by **n8n Workflow 02** (PR AI Review + Routing) rather than a GitHub Actions workflow. This approach centralizes all AI agent logic in n8n, avoids duplicating Claude API calls, and enables routing decisions (auto-approve vs. request human review) based on security-critical paths.

When the AI review passes (no security-critical paths touched), WF02 adds the **`ai-review-passed`** label to the PR. This label is the primary signal that the AI review succeeded — the subsequent `POST /reviews` approval step may fail with HTTP 422 when the same GitHub account that opened the PR attempts to approve it (GitHub does not allow self-approval). The label provides a reliable, machine-readable signal regardless.

Create the label on each repository that uses WF02:

```bash
gh label create ai-review-passed --repo OWNER/REPO \
  --color 0E8A16 --description "AI code review passed (WF02)"
```

To enforce AI review as a merge requirement, add a GitHub Actions workflow that checks for the label (see below) and include it as a required status check in branch protection.

See [n8n setup — Workflow 2](n8n-setup.md#workflow-2-pr-opened--ai-review--routing) for the full workflow details.

### AI Review Status Check

Save as `.github/workflows/ai-review-check.yml` to turn the `ai-review-passed` label into a required status check:

```yaml
name: AI Review Check

on:
  pull_request:
    types: [opened, synchronize, labeled, unlabeled]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Check ai-review-passed label
        env:
          LABELS: ${{ join(github.event.pull_request.labels.*.name, ',') }}
        run: |
          if echo "$LABELS" | grep -q 'ai-review-passed'; then
            echo "AI review passed."
          else
            echo "Waiting for AI review (ai-review-passed label not found)."
            exit 1
          fi
```

Then add `ai-review` as a required status check in branch protection (see above).

### PR Direction Enforcement

Save as `.github/workflows/pr-direction.yml` (per OCPA):

```yaml
name: PR Direction

on:
  pull_request:
    branches: [main]

jobs:
  check-direction:
    runs-on: ubuntu-latest
    if: github.head_ref == 'release'
    steps:
      - name: Block reverse merge
        run: |
          echo "Cannot merge release into main. Only main > release is allowed."
          exit 1
```

## REVIEW.md — AI Review Configuration

Place a `REVIEW.md` file at the root of your repository to customize the AI code reviewer (WF02). It controls what the reviewer checks for, severity levels, auto-approve criteria, and project-specific rules. If absent, the reviewer falls back to a default checklist (bugs, OWASP Top 10, error handling, performance).

A template is available at [`templates/REVIEW.md`](../templates/REVIEW.md) — copy it to your repo and customize it for your project.

## Issue Template

Save as `.github/ISSUE_TEMPLATE/intent.yml`:

```yaml
name: Intent
description: Define an intent for AI agent-driven development
title: "[INTENT]: "
labels: ["intent"]
body:
  - type: markdown
    attributes:
      value: |
        This is a context document for AI agent development.
        Provide clear intent and constraints for the agent.

  - type: textarea
    id: intent
    attributes:
      label: Intent
      description: What should be built or changed?
      placeholder: "Describe the desired outcome..."
    validations:
      required: true

  - type: textarea
    id: context
    attributes:
      label: Context
      description: Business reason, related files, prior decisions, links
      placeholder: "Why this matters, what files are involved..."
    validations:
      required: true

  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance Criteria
      description: How do we verify this works?
      placeholder: "List concrete, testable criteria..."
    validations:
      required: true

  - type: textarea
    id: constraints
    attributes:
      label: Architecture Constraints
      description: Performance, security, compatibility requirements
      placeholder: "Any constraints the agent must respect..."
    validations:
      required: false
```

## GitHub Projects Board

Create a project board with these columns:

| Column           | Color  | Auto-Trigger                                             |
| ---------------- | ------ | -------------------------------------------------------- |
| **Backlog**      | Gray   | New items added to project (built-in workflow)           |
| **Ready**        | Blue   | Manual -- Product Architect moves during triage          |
| **AI Ready**     | Green  | Manual -- triggers WF01 via org-level webhook            |
| **In Progress**  | Yellow | WF01 moves here automatically when agent starts working |
| **Verification** | Orange | CI workflow starts                                       |
| **Human Review** | Red    | Review requested on PR                                   |
| **Done**         | Purple | PR merged to `main`                                      |

Enable the built-in "Item added to project" workflow in **Project Settings > Workflows** to auto-set new items to **Backlog**.

### Org-Level Webhook for Board Events

WF01 is triggered by `projects_v2_item` events, which are **only available as org-level webhooks** (not repo-level). Create one via the `gh` CLI:

```bash
# Ensure you have the admin:org_hook scope
gh auth refresh -h github.com -s admin:org_hook

# Create the org-level webhook
gh api /orgs/YOUR_ORG/hooks --method POST --input - <<'EOF'
{
  "name": "web",
  "active": true,
  "events": ["projects_v2_item"],
  "config": {
    "url": "https://n8n.yourdomain.com/webhook/devllmops-github-board",
    "content_type": "json",
    "insecure_ssl": "0"
  }
}
EOF
```

The repo-level `issues` webhook is **no longer used by WF01**. It remains configured for other workflows if needed.

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
  "required_status_checks": {"strict": true, "contexts": ["ci", "test", "security"]},
  "required_pull_request_reviews": {"required_approving_review_count": 1},
  "enforce_admins": true,
  "restrictions": null
}
EOF
```

## Repository Secrets

Add in Settings > Secrets and variables > Actions:

| Secret | Purpose | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API for AI review workflow | Yes |
| `KUBE_CONFIG` | Base64-encoded kubeconfig for K8s deployments | If using K8s |
| `SCW_ACCESS_KEY` | Scaleway access key for ephemeral VMs | If using Scaleway |
| `SCW_SECRET_KEY` | Scaleway secret key | If using Scaleway |

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

### AI Review Workflow

Save as `.github/workflows/ai-review.yml`. This runs an adversarial AI review on every PR:

```yaml
name: AI Review

on:
  pull_request:
    branches: [main]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Get diff
        run: git diff origin/main...HEAD > /tmp/diff.patch

      - name: AI Adversarial Review
        run: |
          curl -s https://api.anthropic.com/v1/messages \
            -H "x-api-key: ${{ secrets.ANTHROPIC_API_KEY }}" \
            -H "anthropic-version: 2023-06-01" \
            -H "content-type: application/json" \
            -d "$(jq -n \
              --arg diff "$(cat /tmp/diff.patch | head -c 50000)" \
              '{
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 2048,
                "messages": [{
                  "role": "user",
                  "content": ("Review this diff for:\n1. Bugs and logic errors\n2. Security vulnerabilities (OWASP Top 10)\n3. Missing error handling\n4. Missing tests\n\nOnly flag real issues. Be concise.\n\nDiff:\n" + $diff)
                }]
              }')" | jq -r '.content[0].text' > /tmp/review.txt

      - name: Post review comment
        if: always()
        run: |
          gh pr comment ${{ github.event.pull_request.number }} \
            --body "## AI Review\n\n$(cat /tmp/review.txt)"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Note:** This uses Claude Haiku for cost efficiency. For deeper review, switch to `claude-sonnet-4-6` or `claude-opus-4-6`. Adjust `head -c 50000` for larger diffs (increases cost).

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

Create a project board with these columns and automations:

| Column | Auto-Trigger |
|---|---|
| **Intent** | Issue created with `intent` label |
| **In Progress** | PR opened referencing issue |
| **Verification** | CI workflow starts |
| **Human Review** | Review requested on PR |
| **Shipped** | PR merged to `main` |
| **Released** | PR merged to `release` |

Configure via GitHub Projects > Settings > Workflows. Use built-in automations for "Item added" and "Pull request merged" triggers.

# Tooling Setup

## AI Agent: Claude Code (Default)

Primary AI agent for code generation, testing, and review.

```bash
npm install -g @anthropic-ai/claude-code
```

**Configuration:**

- Set `ANTHROPIC_API_KEY` in your environment
- Create a `CLAUDE.md` at your project root with architecture context (see [templates/CLAUDE.md](../templates/CLAUDE.md))

**Usage in DevLLMOps:**

- Feature development: run `claude` in your project directory
- Parallel agents: multiple Context Engineers run agents on separate feature branches simultaneously
- Bug investigation: point Claude at logs + observability data

### Alternatives to Claude

Any OpenAI-compatible API can replace Claude:

| Tool                                                   | Type           | Notes                                                                            |
| ------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------- |
| [aider](https://aider.chat/)                           | CLI agent      | Works with any OpenAI-compatible API. Supports OpenRouter, Ollama, local models. |
| [Continue.dev](https://continue.dev/)                  | IDE extension  | VS Code/JetBrains. Any OpenAI-compatible endpoint.                               |
| [OpenHands](https://github.com/All-Hands-AI/OpenHands) | Agent platform | Open-source, self-hosted, browser-based.                                         |

To switch: replace `claude` commands with your agent's CLI, and adapt `CLAUDE.md` to your agent's context mechanism.

## Containerization: Docker + Docker Compose

Following OCPA specs. Required for all projects.

```bash
docker --version
docker compose version
```

**OCPA conventions:**

- Multi-stage Dockerfiles with `dev` and `prod` targets
- Compose file hierarchy: `compose.base.yml` (shared) extended by `compose.dev.yml` / `compose.prod.yml`
- All image versions pinned (no `latest`)
- Healthchecks, restart policies, and logging limits on every service
- See [OCPA Specs](https://music-ocpa.music-industry.dev/) for full conventions

## Command Standardization: Make

```bash
make dev          # Start dev environment with hot reload
make prod         # Start production environment
make test         # Run integration tests
make down         # Stop all services
```

Full Makefile command list defined by OCPA (dev-build, dev-up, prod-build, prod-up, etc.).

## Workflow Automation: n8n

Self-hosted workflow automation for orchestrating the agent feedback loop.

```bash
docker run -d --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n
```

**Use cases in DevLLMOps:**

- **Agent orchestration:** Trigger agent runs when new GitHub issues are created
- **Cost monitoring:** Aggregate API usage across team, alert on budget thresholds
- **Observability > Agent loop:** Route production alerts to trigger automated agent investigation
- **Notification routing:** Slack/Discord alerts when human review is needed
- **Scheduled tasks:** Nightly security scans, dependency updates

n8n connects to GitHub, Slack, Anthropic API, and monitoring tools via built-in integrations.

## CI/CD: GitHub Actions

Primary CI/CD platform. See [GitHub Setup](github-setup.md) for workflow configuration.

Key workflows:

1. **CI** -- Lint, test, security scan, build on every push/PR
2. **AI Review** -- AI adversarial review on PRs
3. **Deploy** -- Deploy to staging/production
4. **Linters** -- Markdown lint, secrets detection, env validation (per OCPA)

## Secrets Detection: Gitleaks

Runs in CI to catch secrets in commits. Critical when AI agents generate code -- they can hallucinate or leak credentials.

```yaml
# In GitHub Actions
- uses: gitleaks/gitleaks-action@v2
```

Also install as a pre-commit hook per OCPA:

```bash
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
```

## Pre-Production Verification

### Option A: ArgoCD (GitOps for Kubernetes)

For teams using Kubernetes. ArgoCD syncs your Git repo to your cluster automatically.

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**DevLLMOps workflow with ArgoCD:**

1. Agent pushes to `main` > CI builds image > pushes to container registry
2. ArgoCD detects new image tag > deploys to staging cluster
3. Automated smoke tests run against staging
4. All pass > ready for production merge
5. Fail > agent investigates, human notified

ArgoCD makes the agent > deploy > observe loop seamless for Kubernetes environments.

### Option B: Ephemeral VMs (Docker Compose Deployments)

For teams not on Kubernetes. Spin up cloud VMs per PR for pre-production testing.

**With Scaleway:**

```bash
# Spin up a test instance
scw instance server create type=DEV1-S image=ubuntu_jammy name=preprod-$CI_COMMIT_SHA

# Deploy and test
ssh root@<ip> "git clone <repo> && cd <repo> && make prod && make test"

# Tear down after tests
scw instance server delete <server-id>
```

**Automate in GitHub Actions:**

```yaml
- name: Create test VM
  run: scw instance server create type=DEV1-S image=ubuntu_jammy name=test-${{ github.sha }}
- name: Deploy and test
  run: |
    ssh root@$VM_IP "git clone $REPO && cd $PROJECT && make prod && make test"
- name: Tear down
  if: always()
  run: scw instance server delete $SERVER_ID
```

This gives ephemeral pre-prod environments per PR, created and destroyed automatically.

### Option C: Local Docker Compose

For smaller projects or when cloud costs are a concern:

```bash
make test    # Spins up compose.test.yml, runs integration tests, tears down
```

## Version Control: Git + GitHub CLI

```bash
gh auth login
```

Used for PR creation, issue management, and API access in automation scripts.

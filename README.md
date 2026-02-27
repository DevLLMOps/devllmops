# DevLLMOps

> Ship fast or die slow. A methodology for AI-native software development in teams.

The traditional SDLC (Requirements > Design > Code > Test > Review > Deploy > Monitor) assumed building was expensive. That constraint is gone. AI agents collapse these stages into a tight loop where intent, code, tests, and deployment converge simultaneously.

**DevLLMOps** is a specification and methodology for teams to develop and deploy software at AI speed, keeping humans in the loop where it matters.

Based on [OCPA specs](https://github.com/flavienbwk/ocpa-specs) for project structure and trunk-based development.

## The Workflow

```text
               DEVLLMOPS LOOP

 Human Intent ───> AI Agent ───> Code + Tests
      ^                ^              |
      |                |              v
      |          Context &      Automated CI
      |          Feedback    (lint, test, security)
      |                |              |
      |                |              v
 Next Intent     Agent fixes    AI Agent Review
      ^          on failure     (adversarial)
      |                ^              |
      |                |              v
      |                +------- Pass? --> Deploy
      |                    |                 |
      |                Fail/Novel            v
      |                    |             Observe
      |                    v                 |
      |              Human Review            |
      |                                      |
      +--------------------------------------+
```

Stages don't get faster. They merge. The agent doesn't know what "phase" it's in. There's just intent, context, and iteration.

## Team Roles

| Role                            | Evolved From    | Responsibility                                                                                                 |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| **Product Architect**           | CTO / Tech Lead | Defines intent, sets architecture guardrails, handles exceptions agents can't resolve, makes release decisions |
| **Context Engineer**            | Developer       | Crafts agent context, steers AI work, reviews complex/novel changes                                            |
| **Quality Sentinel**            | QA + DevOps     | Owns security review of AI output, manages observability and CI/CD, monitors the feedback loop                 |
| **AI Ops Lead** *(large teams)* | New role        | Manages agent costs, model selection, prompt optimization, orchestration pipelines                             |

See [Team Roles & Organization](docs/team-roles.md) for full details, team structures, and transition from Agile.

## Quick Start

### 1. Install Core Tools

| Tool                                                          | Purpose                 | Install                                    |
| ------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | AI agent (default)      | `npm install -g @anthropic-ai/claude-code` |
| [Docker](https://docs.docker.com/get-docker/)                 | Containerization        | See docs                                   |
| [Make](https://www.gnu.org/software/make/)                    | Command standardization | `apt install make` / `brew install make`   |
| [n8n](https://n8n.io/)                                        | Workflow automation     | Self-host with Docker                      |
| [Gitleaks](https://github.com/gitleaks/gitleaks)              | Secrets scanning        | Runs in CI (GitHub Actions)                |

See [Tooling Setup](docs/tooling.md) for full installation and configuration.

### 2. Configure Your GitHub Repository

1. Enable branch protection on `main` and `release` (require status checks, no force-push)
2. Set up GitHub Projects board: `Intent` > `In Progress` > `Verification` > `Human Review` > `Shipped` > `Released`
3. Add secrets: `ANTHROPIC_API_KEY`, and optionally `KUBE_CONFIG`, `SCW_ACCESS_KEY`/`SCW_SECRET_KEY`
4. Copy the provided [GitHub Actions workflows](docs/github-setup.md#github-actions-workflows) and [issue template](docs/github-setup.md#issue-template)

See [GitHub Setup](docs/github-setup.md) for step-by-step configuration.

### 3. Project Structure (OCPA-Based)

```text
.
├── .github/workflows/     # CI/CD with AI verification
├── app/                   # Service(s) with Dockerfile
├── docs/                  # All documentation (except README.md)
├── k8s/                   # Helm chart (if using K8s)
├── scripts/               # POSIX deployment scripts
├── compose.base.yml       # Shared service config
├── compose.dev.yml        # Dev environment
├── compose.prod.yml       # Production environment
├── compose.test.yml       # Test environment
├── Makefile               # Standardized commands
├── CLAUDE.md              # Agent context (architecture, conventions)
├── TEAM.md                # Team roster for agent review routing
├── VERSION                # Semantic version
└── .env.example           # Environment variables template
```

See [OCPA Specs](https://music-ocpa.music-industry.dev/) for full conventions (versioning, Dockerfiles, Makefile commands, env validation).

Templates available: [CLAUDE.md](templates/CLAUDE.md), [TEAM.md](templates/TEAM.md).

### 4. Create Your First Intent

Open a GitHub Issue using the [intent template](.github/ISSUE_TEMPLATE/intent.yml):

```text
Intent: Add user authentication with JWT
Context: We need login/signup for the API. Using PostgreSQL for storage.
Acceptance: POST /auth/login returns a JWT. Protected routes return 401 without token.
Constraints: Tokens expire after 1h. Use bcrypt for password hashing.
```

Then let the agent work. Steer, iterate, ship.

## Cost Warning

AI agents consume tokens at scale. A single Context Engineer running Claude can use **$30-150+/day** in API costs. Multiply by team size.

**Monthly cost for a team of 4: $3,000-15,000+ in AI tokens alone**, on top of infrastructure and salaries.

Mitigations:

- Set **hard budget limits** on your AI provider dashboard
- Use cheaper models (Haiku) for routine tasks, expensive models (Opus) for complex reasoning
- Monitor usage daily -- there is no "unlimited plan"
- See [Cost Management](docs/cost-management.md) for detailed strategies

## Using a Different AI Agent

This spec defaults to **Claude** via [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). To use an alternative:

| Tool                                                   | Type           | Notes                                                                   |
| ------------------------------------------------------ | -------------- | ----------------------------------------------------------------------- |
| [aider](https://aider.chat/)                           | CLI agent      | Works with any OpenAI-compatible API (OpenRouter, Ollama, local models) |
| [Continue.dev](https://continue.dev/)                  | IDE extension  | VS Code/JetBrains, any OpenAI-compatible endpoint                       |
| [OpenHands](https://github.com/All-Hands-AI/OpenHands) | Agent platform | Open-source, self-hosted                                                |

Any model accessible via an OpenAI-compatible API (GPT-4, Llama, Mistral, DeepSeek) can replace Claude. Adapt the `CLAUDE.md` to your agent's context mechanism (e.g., `.aider.conf.yml` for aider).

## Documentation

| Document                                        | Description                                   |
| ----------------------------------------------- | --------------------------------------------- |
| [Methodology](docs/methodology.md)              | The DevLLMOps workflow in detail              |
| [Team Roles & Organization](docs/team-roles.md) | Roles, team structures, transition from Agile |
| [Tooling Setup](docs/tooling.md)                | Installation and configuration for all tools  |
| [GitHub Setup](docs/github-setup.md)            | Repository, Actions, Projects configuration   |
| [Security](docs/security.md)                    | Securing AI-generated code                    |
| [Cost Management](docs/cost-management.md)      | Token cost control strategies                 |

## License

MIT -- See [LICENSE](LICENSE)

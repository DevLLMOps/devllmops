# CLAUDE.md

> This file provides context to AI agents working on this project.
> It is the single most important file for agent output quality.
> Update it with every architectural decision.

## Project Overview

<!-- 1-2 sentences: what does this project do? -->

## Tech Stack

- **Runtime:** <!-- e.g., Node.js 20, Python 3.12 -->
- **Framework:** <!-- e.g., Next.js 15, FastAPI -->
- **Database:** <!-- e.g., PostgreSQL 16 -->
- **Cache:** <!-- e.g., Redis 7 -->
- **Deployment:** <!-- e.g., Docker Compose on Scaleway / Kubernetes on GKE -->

## Project Structure

```text
├── app/              # Main application service
│   ├── src/          # Source code
│   ├── tests/        # Unit tests
│   └── Dockerfile    # Multi-stage (dev + prod targets)
├── docs/             # Documentation
├── k8s/              # Helm chart (if using K8s)
├── scripts/          # Deployment and utility scripts
├── compose.base.yml  # Shared service configuration
├── compose.dev.yml   # Dev environment (extends base)
├── compose.prod.yml  # Production environment (extends base)
└── Makefile          # Standardized commands
```

## Key Conventions

<!-- List the conventions agents must follow -->
<!-- Examples: -->
<!-- - All API endpoints follow REST conventions with plural nouns -->
<!-- - Error responses use RFC 7807 Problem Details format -->
<!-- - Database migrations live in app/migrations/ and are never modified after merge -->

## Architecture Decisions

<!-- Document each major decision with rationale -->

### Decision: <!-- e.g., Event-driven notifications -->

- **Why:** <!-- Reason -->
- **Trade-off:** <!-- What was given up -->

## Team

See [TEAM.md](TEAM.md) for team members, roles, and review assignments.
When creating PRs or issues, tag the appropriate reviewer based on their review scope.

## Security-Critical Paths (always require human review)

<!-- List directories/files where changes MUST be reviewed by a human -->
- `app/auth/` -- Authentication and authorization
- `app/payments/` -- Payment processing
- `k8s/` -- Infrastructure configuration
- `scripts/deploy*.sh` -- Deployment scripts

## Common Commands

```bash
make dev         # Start dev environment with hot reload
make test        # Run tests
make prod        # Start production environment
make down        # Stop all services
```

## Reviews

Find review instructions at [REVIEW.md](./REVIEW.md)

## Known Issues / Gotchas

<!-- Things that trip up agents or humans -->
<!-- Examples: -->
<!-- - Redis connection requires TLS in production -->
<!-- - Don't modify compose.base.yml ports without updating k8s values -->

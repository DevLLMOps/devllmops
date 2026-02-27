# Team

> This file is context for AI agents. It tells them who to tag in PRs, issues, and review requests.
> Keep it updated when people join, leave, or change roles.

| Name           | Role              | GitHub    | Review Scope                     |
| -------------- | ----------------- | --------- | -------------------------------- |
| <!-- Name -->  | Product Architect | @handle   | Architecture, release sign-off   |
| <!-- Name -->  | Context Engineer  | @handle   | Feature development              |
| <!-- Name -->  | Quality Sentinel  | @handle   | Security, observability, CI/CD   |
| <!-- Name -->  | AI Ops Lead       | @handle   | Cost, model selection, agent ops |

## Review Routing

<!-- Define which roles review which paths. Agents use this to assign reviewers. -->

| Path Pattern       | Required Reviewer  | Reason                    |
| ------------------ | ------------------ | ------------------------- |
| `app/auth/**`      | Quality Sentinel   | Security-critical         |
| `app/payments/**`  | Quality Sentinel   | Security-critical         |
| `k8s/**`           | Quality Sentinel   | Infrastructure            |
| `scripts/deploy*`  | Quality Sentinel   | Deployment                |
| `CLAUDE.md`        | Product Architect  | Agent context changes     |
| `compose.*.yml`    | Product Architect  | Architecture              |
| `*` (default)      | Context Engineer   | Standard feature work     |

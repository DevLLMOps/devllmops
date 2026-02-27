# Team Roles and Organization

## From Agile to DevLLMOps

### What Goes Away

| Agile Ceremony         | Why It's Gone                                                        |
| ---------------------- | -------------------------------------------------------------------- |
| Sprint planning        | No sprints. Work is continuous. Agents don't need 2-week cycles.     |
| Story point estimation | Estimation assumed human speed. Agents change the equation entirely. |
| Daily standups         | Replace with async status via GitHub Projects board.                 |
| Separate QA phase      | Tests are generated with the code. QA is built into the agent loop.  |
| PR review queues       | Replaced by automated + AI review. Human review is exception-based.  |

### What Stays

- **Intent definition** -- Someone must decide *what* to build
- **Architecture decisions** -- Someone must set guardrails
- **Security review** -- Humans must validate security-critical changes
- **Retrospectives** -- Reflecting on process still matters (run monthly)
- **Production sign-off** -- Merging to `release` remains a human decision

## What Happened to DevOps / SRE?

The DevOps/SRE role doesn't disappear -- it splits. Agents absorb the parts that are codifiable; humans keep the parts that require judgment.

| DevOps/SRE Responsibility | Where It Goes |
| ------------------------------------------- | -------------------------------------------------------------------- |
| CI/CD pipeline writing | **Agents** -- they write better workflows than most humans. Steered by Context Engineers. |
| Infrastructure-as-code (Terraform, Helm) | **Agents** -- generated and iterated. Reviewed by Quality Sentinel. |
| Observability setup (dashboards, alerts) | **Quality Sentinel** -- this is now the *primary* safety mechanism for the entire loop. |
| Incident response | **Quality Sentinel** -- agent investigates first, human handles novel issues. |
| Production reliability, SLOs, capacity | **Quality Sentinel + Product Architect** -- still requires human judgment. |
| Security hardening | **Quality Sentinel** -- elevated priority when code is AI-generated. |

The core insight: observability is no longer a "nice-to-have dashboarding layer." When agents ship faster than humans can review, **monitoring is the last line of defense**. The person who owns that is the Quality Sentinel -- the evolved DevOps/SRE.

In larger organizations, you may still have a dedicated **Platform Engineer** -- essentially a Context Engineer specialized in infrastructure. They steer agents for Terraform, Kubernetes, and networking work, while the Quality Sentinel focuses on observability and security.

## Roles

### Product Architect

**Evolved from:** CTO, Tech Lead

**Responsibilities:**

- Translate business needs into intent documents (GitHub Issues)
- Maintain `CLAUDE.md` with architecture decisions and constraints
- Review and approve architectural changes the agent flags
- Handle exceptions that agents and automated checks can't resolve
- Make production release decisions (merge to `release`)

**Time split:** ~30% intent crafting, ~30% architecture governance, ~20% exception handling, ~20% strategic planning

### Context Engineer

**Evolved from:** Software Developer

**Responsibilities:**

- Steer AI agents for feature development (provide context, iterate)
- Write and maintain `CLAUDE.md` and context documents
- Review agent output for complex or novel changes
- Decompose large intents into agent-sized tasks
- Improve agent prompts and workflows based on output quality

**Key skill:** Context engineering -- the ability to give an agent exactly the right information to produce correct output.

**Time split:** ~40% agent steering, ~25% context crafting, ~20% reviewing agent output, ~15% improving workflows

### Quality Sentinel

**Evolved from:** QA Engineer, DevOps/SRE (see [What Happened to DevOps/SRE](#what-happened-to-devops--sre))

**Responsibilities:**

- Own the observability stack -- this is the primary safety net for the entire loop
- Review AI-generated code for security vulnerabilities (OWASP Top 10)
- Manage CI/CD pipelines and automated verification workflows
- Operate the observability-to-agent feedback loop (alert > agent investigates > fix > deploy)
- Investigate production anomalies that automated systems can't resolve
- Define SLOs, error budgets, and rollback criteria

**Time split:** ~30% security review, ~30% observability, ~20% CI/CD maintenance, ~20% incident response

### AI Operations Lead (large teams only)

**New role -- does not exist in traditional teams.**

**Responsibilities:**

- Monitor and optimize AI token costs across the team
- Select and configure AI models for different task types (Opus vs Haiku vs local)
- Manage n8n orchestration workflows for agent automation
- Maintain agent infrastructure (API keys, rate limits, failover)
- Benchmark agent performance and output quality

**When to hire:** When monthly AI costs exceed ~$5,000 or team size exceeds 5 Context Engineers.

## Team Structures

### Small Team (2-4 people)

```text
Product Architect (1) -- intent + architecture + release decisions
Context Engineers (1-2) -- agent steering + context + review
Quality Sentinel (1) -- security + observability + CI/CD
```

The Product Architect also handles AI Ops responsibilities.

### Medium Team (5-10 people)

```text
Product Architect (1-2)
Context Engineers (3-6)
Quality Sentinel (1-2)
AI Ops Lead (1)
```

### Large Team (10+)

Split into squads of 3-5, each with:

- 1 Product Architect (or shared across 2 squads)
- 2-3 Context Engineers
- 1 Quality Sentinel (or shared across 2 squads)
- 1 AI Ops Lead per organization

## TEAM.md -- Machine-Readable Team Roster

Create a `TEAM.md` at your project root. This file serves as **context for AI agents** so they can tag the right humans in PRs, issues, and review requests.

```markdown
# Team

| Name | Role | GitHub | Review Scope |
| --- | --- | --- | --- |
| Alice Martin | Product Architect | @amartin | Architecture, release sign-off |
| Bob Chen | Context Engineer | @bchen | Feature development |
| Carol Diaz | Context Engineer | @cdiaz | Feature development |
| Dave Okoro | Quality Sentinel | @dokoro | Security, observability, CI/CD |
```

**Why this matters:** When an AI agent generates a PR that touches `app/auth/`, it needs to know to request review from `@dokoro` (Quality Sentinel), not `@bchen` (Context Engineer). When it creates an issue about an architecture concern, it should tag `@amartin`. Without `TEAM.md`, agents either tag no one or tag everyone.

Reference `TEAM.md` from your `CLAUDE.md`:

```markdown
## Team
See [TEAM.md](TEAM.md) for team members, roles, and review assignments.
When creating PRs or issues, tag the appropriate reviewer based on their review scope.
```

Keep `TEAM.md` updated when people join, leave, or change roles.

## Project Management with GitHub

### GitHub Issues as Intent Documents

Issues are **context stores for agents**, not task trackers. Use the provided [intent template](../.github/ISSUE_TEMPLATE/intent.yml) with:

- **Intent:** What should be built
- **Context:** Business reason, related files, constraints
- **Acceptance Criteria:** How to verify it works
- **Architecture Notes:** Constraints the agent must respect

### GitHub Projects Board

| Column           | Meaning                                              |
| ---------------- | ---------------------------------------------------- |
| **Intent**       | Defined, ready for agent work                        |
| **In Progress**  | Agent is generating / Context Engineer is steering   |
| **Verification** | CI + AI review running                               |
| **Human Review** | Flagged for human attention (security, architecture) |
| **Shipped**      | Merged to `main`, deployed to staging                |
| **Released**     | Merged to `release`, in production                   |

Automate transitions with GitHub Actions (PR opened > In Progress, CI passes > Verification, merged > Shipped). See [GitHub Setup](github-setup.md).

### No Sprints, No Points

Work is continuous. Prioritize by:

1. Production incidents (observability-triggered)
2. Business-critical intents
3. Technical debt / architecture improvements

Use GitHub Projects' priority field (P0-P3) instead of story points.

## Transitioning from Agile

Transition gradually:

1. **Week 1-2:** Introduce `CLAUDE.md`, start using agents for feature branches
2. **Week 3-4:** Set up AI review in CI, reduce manual PR review to security-critical paths
3. **Month 2:** Drop sprint planning, move to continuous intent-based flow
4. **Month 3:** Assign new roles (Product Architect, Context Engineer, Quality Sentinel)
5. **Month 4+:** Introduce n8n automation, observability feedback loops

Don't drop everything at once. Let the team build confidence with agents before removing Agile ceremonies.

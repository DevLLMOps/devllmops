# Cost Management

## The Unbounded Cost Problem

AI agent development has **no natural cost ceiling**. Unlike human developers (fixed salary), AI agents charge per token. A productive day of agent-driven development can cost more than expected, and costs scale with team size and agent activity.

### Rough Cost Estimates (as of February 2026)

| Activity                               | Tokens/day      | Estimated Cost/day |
| -------------------------------------- | --------------- | ------------------ |
| 1 Context Engineer, active development | 2-10M tokens    | $30-150            |
| AI code review per PR (Haiku)          | 50-200K tokens  | $1-5               |
| AI adversarial review per PR (Sonnet)  | 100-500K tokens | $2-10              |
| n8n automated agent triggers           | Varies          | $5-50              |

**Monthly cost for a team of 4 Context Engineers: $3,000-15,000+ in AI tokens alone.**

This is on top of cloud infrastructure, tooling subscriptions, and salaries.

## Cost Controls

### 1. Set Hard Limits

- **Anthropic Console:** Set monthly spending limits per API key
- **OpenRouter** (if using alternatives): Set per-key and per-model budget caps
- **n8n workflows:** Add budget-check nodes before triggering agent runs
- **GitHub Actions:** Set concurrency limits to prevent runaway AI review jobs

### 2. Model Selection Strategy

Not every task needs the most capable (and expensive) model:

| Task                   | Recommended Model    | Why                                   |
| ---------------------- | -------------------- | ------------------------------------- |
| Feature development    | Opus / Sonnet        | Needs deep reasoning and context      |
| Code review            | Haiku                | Pattern matching, fast, cheap         |
| Boilerplate generation | Haiku or local model | Simple, repetitive output             |
| Architecture decisions | Opus                 | Complex reasoning, trade-off analysis |
| Security review        | Sonnet / Opus        | Needs careful analysis                |

### 3. Context Optimization

Reduce token usage by managing what the agent sees:

- Keep `CLAUDE.md` focused -- architecture and conventions, not a brain dump
- Use `.claudeignore` to exclude irrelevant files from agent context
- Structure repos so agents only need to read relevant directories
- Decompose large intents into smaller, focused tasks (less context per run)

### 4. Monitor Daily

Set up alerts via n8n or your monitoring stack:

- Daily token usage per team member
- Cost per PR (track via CI metadata)
- Weekly cost trend reports
- Alert when daily spend exceeds 150% of trailing average

### 5. Budget Allocation

Treat AI costs like cloud infrastructure costs:

- Set a monthly AI budget per team
- Review weekly (AI Ops Lead or Product Architect)
- Track cost-per-feature for ROI analysis
- Reduce agent usage for low-priority work when approaching budget

## When Humans Are Cheaper

Sometimes a human is faster and cheaper than an agent:

- **Trivial fixes** -- A 2-second manual edit vs. a $0.50 agent call
- **Exploration** -- Reading code to understand architecture (humans are "free")
- **Identical repetitive changes** -- A find-and-replace is cheaper than an agent
- **Small config changes** -- Editing a YAML value doesn't need an AI

The goal isn't to use agents for everything. It's to use them where they provide the most leverage.

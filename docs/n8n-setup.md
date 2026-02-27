# n8n Setup for DevLLMOps

n8n orchestrates the automated feedback loops between GitHub, AI agents, observability, and your team. This guide covers deployment and the five core workflows.

## 1. Deploy n8n

```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e WEBHOOK_URL=https://n8n.yourdomain.com \
  n8nio/n8n
```

For production, run behind a reverse proxy (nginx/Caddy) with HTTPS. n8n receives webhooks from GitHub containing repository metadata -- TLS is required.

Open `http://localhost:5678` and create an admin account.

## 2. Configure Credentials

In n8n **Settings > Credentials**, create:

| Credential | Type | How to Get |
| --- | --- | --- |
| **GitHub API** | GitHub OAuth App or PAT | GitHub > Settings > Developer Settings > PATs. Scopes: `repo`, `project`, `workflow` |
| **Anthropic API** | Header Auth (name: `x-api-key`) | [console.anthropic.com](https://console.anthropic.com/) > API Keys |
| **Slack** *(optional)* | Slack OAuth | Slack app with `chat:write` scope for notifications |

## 3. GitHub Webhook

In your repo **Settings > Webhooks**:

- **Payload URL:** `https://n8n.yourdomain.com/webhook/github`
- **Content type:** `application/json`
- **Secret:** generate with `openssl rand -hex 32`, save it for n8n
- **Events:** Issues, Pull requests, Check suites, Push

In every n8n GitHub webhook trigger node, set the same secret for signature verification.

## 4. Core Workflows

### Workflow 1: New Intent > Agent Analysis

When a GitHub issue is created with the `intent` label, Claude analyzes it and posts an implementation plan as a comment.

```text
Trigger: Webhook (GitHub issue opened, label = "intent")
  |
  v
IF node: check event.action == "opened" AND "intent" in labels
  |
  v
HTTP Request: GET github.com/repos/{owner}/{repo}/issues/{number}
  (fetch full issue body using GitHub credential)
  |
  v
HTTP Request: POST api.anthropic.com/v1/messages
  Headers: x-api-key, anthropic-version: 2023-06-01
  Body:
    model: claude-haiku-4-5-20251001
    max_tokens: 2048
    messages:
      - role: user
        content: |
          You are a DevLLMOps Context Engineer. Analyze this intent
          and respond with:
          1. Implementation approach (2-3 sentences)
          2. Files likely affected
          3. Risks or open questions

          Intent: {{ $json.body }}
  |
  v
HTTP Request: POST github.com/repos/{owner}/{repo}/issues/{number}/comments
  Body: { "body": "## Agent Analysis\n\n{{ response }}" }
```

**n8n nodes used:** Webhook, IF, HTTP Request (x3)

### Workflow 2: PR Opened > AI Review + Routing

When a PR is opened, Claude reviews the diff and either approves or flags for human review.

```text
Trigger: Webhook (GitHub PR opened, targeting main)
  |
  v
HTTP Request: GET github.com/repos/{owner}/{repo}/pulls/{number}/files
  (fetch changed files list)
  |
  v
HTTP Request: GET github.com/repos/{owner}/{repo}/pulls/{number}.diff
  Accept: application/vnd.github.v3.diff
  (fetch full diff, truncate to 50K chars)
  |
  v
IF node: diff touches security-critical paths?
  (check filenames against: auth/, payments/, deploy*, workflows/)
  |
  YES --> Set variable: require_human = true
  NO  --> Set variable: require_human = false
  |
  v
HTTP Request: POST api.anthropic.com/v1/messages
  Body:
    model: claude-haiku-4-5-20251001
    max_tokens: 2048
    messages:
      - role: user
        content: |
          Review this PR diff for:
          1. Bugs and logic errors
          2. Security vulnerabilities (OWASP Top 10)
          3. Missing error handling
          Only flag real issues. Be concise.

          {{ diff }}
  |
  v
HTTP Request: POST github.com/repos/{owner}/{repo}/issues/{number}/comments
  Body: { "body": "## AI Review\n\n{{ response }}" }
  |
  v
IF node: require_human == true OR issues found?
  YES --> HTTP Request: POST request review from Quality Sentinel
          (use TEAM.md GitHub handle)
  NO  --> HTTP Request: POST approve PR
          POST github.com/repos/{owner}/{repo}/pulls/{number}/reviews
          Body: { "event": "APPROVE" }
```

**n8n nodes used:** Webhook, HTTP Request (x5), IF (x2), Set

### Workflow 3: CI Failure > Agent Auto-Fix

When CI checks fail on a PR, Claude reads the logs and suggests a fix.

```text
Trigger: Webhook (GitHub check_suite completed, conclusion = "failure")
  |
  v
HTTP Request: GET github.com/repos/{owner}/{repo}/actions/runs/{run_id}/jobs
  (get failed job details)
  |
  v
HTTP Request: GET github.com/repos/{owner}/{repo}/actions/jobs/{job_id}/logs
  (fetch failure logs, truncate to 30K chars)
  |
  v
HTTP Request: POST api.anthropic.com/v1/messages
  Body:
    model: claude-sonnet-4-6
    max_tokens: 2048
    messages:
      - role: user
        content: |
          CI failed on this PR. Analyze the logs and suggest a concrete fix.
          Be specific about which file and line to change.

          Failure logs:
          {{ logs }}
  |
  v
HTTP Request: POST github.com/repos/{owner}/{repo}/issues/{pr_number}/comments
  Body: { "body": "## CI Failure Analysis\n\n{{ response }}" }
```

**n8n nodes used:** Webhook, HTTP Request (x4)

### Workflow 4: Production Alert > Agent Investigation

When your monitoring fires an alert, Claude investigates and creates an issue.

```text
Trigger: Webhook (from Prometheus/Grafana/Datadog/UptimeKuma)
  |
  v
HTTP Request: POST api.anthropic.com/v1/messages
  Body:
    model: claude-sonnet-4-6
    max_tokens: 2048
    messages:
      - role: user
        content: |
          Production alert received. Analyze and suggest investigation steps.
          Alert: {{ alert_name }}
          Severity: {{ severity }}
          Details: {{ description }}
          Service: {{ service }}
  |
  v
HTTP Request: POST github.com/repos/{owner}/{repo}/issues
  Body:
    title: "[ALERT] {{ alert_name }}"
    labels: ["incident", "intent"]
    body: |
      ## Production Alert

      **Severity:** {{ severity }}
      **Service:** {{ service }}

      ## Agent Analysis

      {{ response }}

      ## Next Steps
      Quality Sentinel: @{{ sentinel_handle }} please investigate.
  |
  v
Slack node (optional): notify #incidents channel
```

**n8n nodes used:** Webhook, HTTP Request (x2), Slack (optional)

### Workflow 5: Daily Cost Report

Scheduled workflow that tracks AI token spend and alerts on overruns.

```text
Trigger: Cron (daily at 09:00 UTC)
  |
  v
HTTP Request: GET api.anthropic.com/v1/organizations/{org_id}/usage
  (fetch yesterday's token usage -- check Anthropic docs for exact endpoint)
  |
  v
Function node: calculate daily cost
  - Input tokens * price per input token
  - Output tokens * price per output token
  - Compare to 7-day rolling average
  |
  v
IF node: daily cost > 150% of average?
  |
  YES --> Slack node: alert AI Ops Lead / Product Architect
          "Daily AI spend: $X (150%+ above average). Review usage."
  |
  v
Slack node: post daily summary to #devllmops channel
  "AI usage yesterday: $X | 7-day avg: $Y | Month-to-date: $Z"
```

**n8n nodes used:** Cron Trigger, HTTP Request, Function, IF, Slack (x2)

## 5. Connecting Workflows to the Projects Board

To move issues/PRs across the GitHub Projects board (Intent > In Progress > Verification > etc.), use the GitHub GraphQL API in HTTP Request nodes:

```text
POST https://api.github.com/graphql

Body:
{
  "query": "mutation {
    updateProjectV2ItemFieldValue(input: {
      projectId: \"PROJECT_ID\"
      itemId: \"ITEM_ID\"
      fieldId: \"STATUS_FIELD_ID\"
      value: { singleSelectOptionId: \"OPTION_ID\" }
    }) { projectV2Item { id } }
  }"
}
```

Get the IDs once via `gh project field-list` and hardcode them in n8n or store as environment variables.

## 6. Security Notes

- **HTTPS required** -- n8n receives webhooks with repo data; always use TLS
- **Verify webhook signatures** -- set the GitHub webhook secret in n8n trigger nodes
- **Credential isolation** -- store API keys in n8n's credential store, never in workflow JSON
- **Rate limit Claude calls** -- add a Function node with a token counter before API calls to prevent runaway costs
- **Restrict n8n access** -- use n8n's built-in auth or put it behind a VPN; only GitHub webhooks should reach it from outside

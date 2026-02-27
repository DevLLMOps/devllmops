# Security Considerations

## The Problem

AI agents generate code fast but not always securely. LLMs can produce code with:

- **SQL injection** -- Unsanitized inputs in database queries
- **XSS** -- Unescaped output in HTML templates
- **Command injection** -- Unvalidated input passed to shell commands
- **Hardcoded secrets** -- API keys or passwords embedded in code
- **Insecure dependencies** -- Outdated or vulnerable packages
- **Broken authentication** -- Weak session handling, missing auth checks
- **Path traversal** -- Unsanitized file paths
- **SSRF** -- Unvalidated URLs in server-side requests

These are not hypothetical. They happen regularly in AI-generated code.

## Mandatory Security Layers

### 1. Pre-Commit: Secrets Detection

```bash
# Install pre-commit hook (per OCPA)
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
```

In CI:

```yaml
- uses: gitleaks/gitleaks-action@v2
```

Never trust that an agent won't commit secrets. This gate is non-negotiable.

### 2. CI: Static Analysis (SAST)

| Language | Tool | Notes |
|---|---|---|
| JavaScript/TypeScript | [ESLint security plugin](https://github.com/eslint-community/eslint-plugin-security) | Catches common JS vulnerabilities |
| Python | [Bandit](https://github.com/PyCQA/bandit) | OWASP-aware Python scanner |
| Go | [gosec](https://github.com/securego/gosec) | Go security checker |
| Multi-language | [Semgrep](https://semgrep.dev/) | Free tier, customizable rules |

### 3. CI: Dependency Scanning

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    security-checks: 'vuln'
```

Or use GitHub's built-in Dependabot for automatic dependency update PRs.

### 4. AI Adversarial Security Review

A second AI agent reviews diffs specifically for security (see [AI Review via n8n](github-setup.md#ai-review-via-n8n) and [n8n Workflow 2](n8n-setup.md#workflow-2-pr-opened--ai-review--routing)):

```text
Review this diff for OWASP Top 10 vulnerabilities.
Check for: SQL injection, XSS, command injection, hardcoded secrets,
insecure deserialization, broken access control, SSRF.
Flag any finding with severity (critical/high/medium/low).
```

This is **not** a replacement for human security review. It catches obvious issues before a human looks.

### 5. Human Security Review

**Always require human review for changes touching:**

- Authentication / authorization logic
- Payment / billing code
- Cryptography usage
- Infrastructure / deployment configuration
- API endpoint access control
- PII / sensitive data handling

Mark these paths in your `CLAUDE.md` so the agent flags them:

```markdown
## Security-Critical Paths (always require human review)
- `app/auth/` -- Authentication and authorization
- `app/payments/` -- Payment processing
- `k8s/` -- Infrastructure configuration
- `scripts/deploy*.sh` -- Deployment scripts
```

### 6. Runtime Protection

- Use Content Security Policy headers
- Enable rate limiting on all public endpoints
- Run containers as non-root users (configure in Dockerfile)
- Use read-only filesystem mounts where possible
- Set network policies to restrict container communication

## Security Review Workflow

```text
Agent generates code
  > Gitleaks (secrets)     -- FAIL > block, agent fixes
  > SAST scan              -- FAIL > block, agent fixes
  > Dependency scan        -- FAIL > block, agent fixes
  > AI security review     -- FLAGS > route to human
  > Touches critical path? -- YES > route to human
  > All clear              -- PASS > continue to deploy
```

## Key Principle

**Never fully trust AI-generated code for security.** Use tooling to catch the obvious, use AI to catch the subtle, and use humans to validate the critical. The cost of a security breach vastly exceeds the cost of a human review.

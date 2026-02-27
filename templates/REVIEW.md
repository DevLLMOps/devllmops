# REVIEW.md

> This file configures the AI code reviewer (DevLLMOps WF02).
> Place it at the root of your repository. If absent, the reviewer falls back to a default checklist.

## Review Checklist

The AI reviewer must check for:

1. **Bugs and Logic Errors** -- incorrect conditions, off-by-one, null/undefined access, wrong return values
2. **OWASP Top 10** -- injection, broken auth, sensitive data exposure, XXE, broken access control, misconfig, XSS, insecure deserialization, vulnerable components, insufficient logging
3. **Error Handling** -- unhandled exceptions, missing try/catch, swallowed errors, unclear error messages
4. **Performance** -- N+1 queries, unbounded loops, missing pagination, large payload without streaming
5. **Code Style** -- naming conventions, dead code, overly complex logic, missing types or docstrings where required by project conventions

## Severity Levels

| Severity | Definition | Action |
| --- | --- | --- |
| **Critical** | Security vulnerability or data loss risk. Must be fixed before merge. | Block merge |
| **High** | Bug that will cause incorrect behavior in production. | Block merge |
| **Medium** | Code smell, missing edge case, or minor bug unlikely to hit production. | Flag for author |
| **Low** | Style nit, naming suggestion, or optional improvement. | Informational |

## Auto-Approve Criteria

The AI reviewer may auto-approve (no human review required) when ALL of the following are true:

- No Critical or High severity findings
- No security-critical paths were modified (see CLAUDE.md)
- The diff is under 500 lines

## Always Flag for Human Review

Always request human review when any of these are true:

- Changes to authentication, authorization, or session management
- Changes to deployment scripts, CI/CD pipelines, or infrastructure
- Changes to dependency versions or lockfiles
- Changes to files listed as security-critical in CLAUDE.md
- Any finding rated Critical or High

## Project-Specific Rules

<!-- Add your project-specific review rules below. Examples: -->
<!-- - All API endpoints must validate input with Pydantic models -->
<!-- - Database migrations must be reversible -->
<!-- - Frontend components must have unit tests -->

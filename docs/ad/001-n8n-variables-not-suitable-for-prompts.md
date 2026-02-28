# AD-001: n8n Variables NOT suitable for LLM prompts or jsCode

**Status:** Rejected
**Date:** 2026-02-28

## Context

Editing LLM prompts and JavaScript code inside n8n workflow JSON files is slow: every change requires editing the JSON, redeploying via the API, and potentially re-activating the workflow. n8n offers a [Variables](https://docs.n8n.io/code/variables/) feature (UI at `/home/variables`) that stores key-value pairs accessible across all workflows via `$vars.variableName`. We investigated whether Variables could externalize prompts and Code node JavaScript to improve edit/test speed and maintainability.

## Decision

Not viable. Three independent blockers:

1. **License required** — the community edition returns `"Your license does not allow for feat:variables"`. Requires a paid license upgrade.
2. **Max value length: 1000 characters** — LLM prompts in our workflows are typically 2000–5000+ characters (e.g., the Build Claude Body prompt in WF02). Too short.
3. **Character restrictions** — only `A-Z, a-z, 0-9, _` allowed in values. No spaces, punctuation, newlines, or special characters. Completely unusable for natural language text or JavaScript code.

## Current approach

Prompts and jsCode live inline in workflow JSON nodes. Edit via the n8n JSON file, redeploy with the API.

## Alternative considered

Store prompts as files in a GitHub repo and fetch them at runtime via HTTP Request nodes. This removes the 1000-char and charset limits but adds latency and a GitHub API dependency. Not implemented because the current inline approach works and keeps workflows self-contained.

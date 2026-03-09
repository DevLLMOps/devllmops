# Future Improvements

## Secure prompts — IMPLEMENTED

All LLM prompts that include user-supplied content (issue title/body, PR diffs, CI logs, alert payloads) are now wrapped with random boundary delimiters. Each invocation generates a unique UUID-based boundary (e.g., `===== a3f2-b1c4-d5e6-f7a8 =====`) and the prompt instructs the model to treat everything inside the boundaries as untrusted data.

This is a defense-in-depth measure against prompt injection via issue content, malicious PRs, or crafted alert payloads. It stacks with the existing K8s sandboxing (read-only rootfs, no caps, scoped tokens, HTTPS-only egress).

Scripts updated: `wf01-k8s-01.js`, `wf01-agent-01.js`, `wf01-09.js`, `wf02-08.js`, `wf02-fix03.js`, `wf03-11.js`, `wf04-02.js`, `wf04-03.js`.

## Add observability to illustration

Update [schema](docs/assets/illustration.drawio) to add observability as actor for creating Intents or bug reports (IAST, DAST).

## Add prompt to setup one's repo

Add a Claude-compatible skill or prompt to help people get started with DevLLMOps' AIgile workflow

## Support git conflicts resolution

Because there will be conflicts as AIs will simultaneously work on the same code

## Agentic Auto-Develop Loop (WF01) — IMPLEMENTED

Implemented as an n8n-native agentic loop that bypasses the LangChain `$schema` bug
entirely. Uses hand-crafted tool definitions with HTTP Request nodes calling the
Anthropic API directly (no LangChain nodes).

### Architecture

- 13 agent nodes (wf01-agent-01 to wf01-agent-14) replacing 9 old single-shot nodes
- Tools: `read_file`, `write_file`, `list_directory` (hand-crafted JSON schemas)
- State: `$getWorkflowStaticData('global')` for conversation history across turns
- Back-edge loops: agent turn loop + tool call loop (no SplitInBatches needed)
- Typical: ~12 Claude calls, ~7 reads, ~4 writes, ~170s execution time

### n8n gotcha: IF node boolean conditions

n8n IF node v2.2 with `typeValidation: "strict"` rejects boolean conditions with
empty `rightValue`. Workaround: output routing flags as strings (`'true'`/`'false'`)
and use string `equals` comparison instead of boolean `true` operation.

## Idempotent Branch Creation (WF01)

WF01's `Create Branch` node fails with "Reference already exists" if the branch was
already created by a previous run (e.g., duplicate webhook trigger or manual re-trigger
after a partial failure). The entire execution errors out instead of recovering.

## Claude Skills

A list of default skills for n8n workflows agents to support a company's governance.

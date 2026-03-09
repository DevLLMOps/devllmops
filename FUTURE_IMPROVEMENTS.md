# Future Improvements

## Full Claude Code CLI via Scaleway spot instance

Deploy a Scaleway spot instance automatically with Claude Code CLI that will fill the request (`--dangerously-skip-permissions`).
This would complement the current n8n-native agentic loop with full CLI capabilities (test running, error fixing, multi-file refactoring).

## Secure prompts

Wrap user issues/prompts with secure decorators.

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

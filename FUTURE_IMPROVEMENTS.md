# Future Improvements

## Add prompt to setup one's repo

Add a Claude-compatible skill or prompt to help people get started with DevLLMOps' AIgile workflow

## Support conflicts

Because there will be conflicts as AIs will simultaneously work on the same code

## Agentic Auto-Develop Loop (WF01)

The current auto-develop in WF01 uses a single-shot Claude call. A more powerful
approach would be to give Claude tools (`read_file`, `commit_file`) and let it
iterate autonomously — reading files, implementing changes, and committing in a loop.

### Why it's not implemented yet

n8n has two blocking bugs:

1. **LangChain `$schema` bug**: `zodToJsonSchema` adds `"$schema"` to tool input
   schemas. The `$` character violates Anthropic's property key pattern. This
   affects ALL n8n LangChain tool nodes (toolHttpRequest, toolCode, toolWorkflow).

2. **Code node sandbox**: Blocks `fetch()`, `require('https')`, and
   `await import('https')` — no HTTP from Code nodes.

3. **No `baseUrl` on lmChatAnthropic**: Can't route LangChain's Anthropic calls
   through a proxy to strip `$schema` (GitHub issue #11122, closed "not planned").

### Current workaround

WF01 uses a **single-shot pipeline**: fetch all relevant files, send them in one
Claude prompt (with extended thinking), parse `FILE` blocks from the response,
diff-filter unchanged files, and commit. This works well for small-to-medium
changes but cannot iteratively read additional files or fix its own errors.

### Designed solution (ready to implement when unblocked)

A multi-turn agentic loop using native n8n nodes (no LangChain):
- Two nested SplitInBatches loops (outer: agent turns, inner: tool calls)
- HTTP Request nodes for Anthropic API and GitHub Helper webhook
- Code nodes for logic, state in `$getWorkflowStaticData('global')`
- Full bug analysis documented in `memory/n8n-anthropic-bug.md`

### Trigger conditions

Implement this when any of these become true:
- n8n fixes the `$schema` bug in `zodToJsonSchema`
- n8n adds `baseUrl` option to `lmChatAnthropic`
- n8n lifts Code node sandbox restrictions for HTTP

## Idempotent Branch Creation (WF01)

WF01's `Create Branch` node fails with "Reference already exists" if the branch was
already created by a previous run (e.g., duplicate webhook trigger or manual re-trigger
after a partial failure). The entire execution errors out instead of recovering.

### Possible fix

Use `neverError` on the `Create Branch` HTTP Request node, then add a Code node to
check the response: if 422 "Reference already exists", continue the pipeline using the
existing branch instead of crashing.

// Node: Build Agent Request (wf01-agent-02)
// Workflow: WF01 Intent Analysis

const state = $getWorkflowStaticData('global');
state.turnCount++;

return [{ json: {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16384,
  system: state.system,
  messages: state.messages,
  tools: state.tools
} }];

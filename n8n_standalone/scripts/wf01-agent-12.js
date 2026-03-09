// Node: Update Conversation (wf01-agent-12)
// Workflow: WF01 Intent Analysis

const state = $getWorkflowStaticData('global');

// Build user message with all tool results
const toolResults = state.pendingToolResults.map(r => {
  const result = {
    type: 'tool_result',
    tool_use_id: r.tool_use_id,
    content: r.content
  };
  if (r.is_error) result.is_error = true;
  return result;
});

state.messages.push({ role: 'user', content: toolResults });

// Clean up for next turn
state.pendingToolCalls = [];
state.pendingToolResults = [];
state.currentToolIndex = 0;

return [{ json: { _trigger: true } }];

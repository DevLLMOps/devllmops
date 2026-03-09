// Node: Parse Agent Response (wf01-agent-04)
// Workflow: WF01 Intent Analysis

const state = $getWorkflowStaticData('global');
const response = $input.first().json;
const content = response.content || [];
const stopReason = response.stop_reason || 'end_turn';

// Store assistant message in conversation history
state.messages.push({ role: 'assistant', content: content });

// Only continue if Claude explicitly requests tool use AND we haven't hit the turn limit
const isDone = stopReason !== 'tool_use' || state.turnCount >= state.maxTurns;

if (!isDone) {
  // Extract tool_use blocks for execution
  const toolCalls = content.filter(c => c.type === 'tool_use');
  state.pendingToolCalls = toolCalls;
  state.currentToolIndex = 0;
  state.pendingToolResults = [];
}

return [{ json: { _done: isDone ? 'true' : 'false' } }];

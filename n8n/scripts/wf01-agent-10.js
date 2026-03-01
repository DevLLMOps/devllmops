// Node: Process Tool Result (wf01-agent-10)
// Workflow: WF01 Intent Analysis

const state = $getWorkflowStaticData('global');
const response = $input.first().json;
const tc = state.currentToolCall;

let resultContent = '';
let isError = false;

if (tc.name === 'read_file') {
  if (response.content && response.encoding === 'base64') {
    try {
      resultContent = Buffer.from(response.content.replace(/\n/g, ''), 'base64').toString('utf8');
    } catch(e) {
      resultContent = 'Error decoding file: ' + e.message;
      isError = true;
    }
  } else if (response.message) {
    resultContent = 'Error: ' + response.message;
    isError = true;
  } else {
    resultContent = 'Error: File not found or could not be read';
    isError = true;
  }
} else if (tc.name === 'write_file') {
  if (response.message && !response.content && !response.commit) {
    resultContent = 'Error writing file ' + tc.input.path + ': ' + response.message;
    isError = true;
  } else {
    resultContent = 'File ' + tc.input.path + ' committed successfully.';
    state.committedFiles.push(tc.input.path);
  }
} else if (tc.name === 'list_directory') {
  const treeItems = response.tree || [];
  if (treeItems.length > 0) {
    resultContent = treeItems.filter(t => t.type === 'blob').map(t => t.path).join('\n');
  } else {
    resultContent = response.message || '(empty tree or error)';
    isError = !!(response.message);
  }
} else {
  resultContent = JSON.stringify(response).slice(0, 2000);
}

// Store tool result
state.pendingToolResults.push({
  type: 'tool_result',
  tool_use_id: tc.id,
  content: resultContent,
  is_error: isError
});

state.currentToolIndex++;
const hasMore = state.currentToolIndex < state.pendingToolCalls.length;

return [{ json: { _hasMore: hasMore ? 'true' : 'false' } }];

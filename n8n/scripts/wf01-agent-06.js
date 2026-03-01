// Node: Prepare Tool Call (wf01-agent-06)
// Workflow: WF01 Intent Analysis

const state = $getWorkflowStaticData('global');
const tc = state.pendingToolCalls[state.currentToolIndex];
state.currentToolCall = tc;

if (tc.name === 'write_file') {
  return [{ json: {
    _route: 'write',
    path: tc.input.path,
    content_text: tc.input.content,
    message: tc.input.message || '[auto-develop] Update ' + tc.input.path,
    repo: state.repo,
    branch: state.branch
  } }];
}

if (tc.name === 'read_file') {
  const encodedPath = tc.input.path.split('/').map(s => encodeURIComponent(s)).join('/');
  return [{ json: {
    _route: 'github',
    url: 'https://api.github.com/repos/' + state.repo + '/contents/' + encodedPath + '?ref=' + encodeURIComponent(state.branch)
  } }];
}

if (tc.name === 'list_directory') {
  return [{ json: {
    _route: 'github',
    url: 'https://api.github.com/repos/' + state.repo + '/git/trees/' + encodeURIComponent(state.branch) + '?recursive=1'
  } }];
}

// Fallback for unknown tools
return [{ json: {
  _route: 'github',
  url: 'https://api.github.com/repos/' + state.repo
} }];

// Node: Format Agent Output (wf01-agent-14)
// Workflow: WF01 Intent Analysis

const state = $getWorkflowStaticData('global');

// Extract summary from last assistant message
let summary = 'Auto-develop completed';
const messages = state.messages || [];
for (let i = messages.length - 1; i >= 0; i--) {
  const msg = messages[i];
  if (msg.role === 'assistant') {
    const textBlocks = Array.isArray(msg.content)
      ? msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
      : (typeof msg.content === 'string' ? msg.content : '');
    const match = textBlocks.match(/SUMMARY:\s*(.+)/);
    if (match) { summary = match[1].trim(); break; }
  }
}

const committedFiles = state.committedFiles || [];
const fileCount = committedFiles.length;
const fileList = fileCount > 0
  ? committedFiles.map(f => '- `' + f + '`').join('\n')
  : '- (no files committed)';
const turnCount = state.turnCount || 0;
const repo = state.repo;
const issue_number = state.issue_number;
const branch = state.branch;

const body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**Auto-develop (agentic): ' + summary + '**\n\n'
  + '<details>\n<summary>View committed files (' + fileCount + ')</summary>\n\n'
  + fileList + '\n\n'
  + '---\n'
  + '*Branch: `' + branch + '`*\n'
  + '*Agent completed in ' + turnCount + ' turns.*\n'
  + '*CI will run automatically. If tests pass, a PR will be created by WF03.*\n\n'
  + '</details>';

// Clear static data to avoid stale state on next execution
for (const key of Object.keys(state)) delete state[key];

return [{ json: { body, repo, issue_number } }];

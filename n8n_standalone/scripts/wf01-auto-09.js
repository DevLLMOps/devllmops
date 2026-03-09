// Node: Format Output (wf01-auto-09)
// Workflow: WF01 Intent Analysis

// Get metadata from Parse & Prepare Commits
const items = $('Parse & Prepare Commits').all();
const meta = items[0].json._meta || {};

const fileList = meta.fileList || '- (no files)';
const fileCount = meta.fileCount || 0;
const summary = meta.summary || 'Auto-develop completed';
const repo = meta.repo;
const issue_number = meta.issue_number;
const branch_name = meta.branch_name;

const body = '> 🤖 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**Auto-develop: ' + summary + '**\n\n'
  + '<details>\n<summary>View committed files (' + fileCount + ')</summary>\n\n'
  + fileList + '\n\n'
  + '---\n'
  + '*Branch: `' + branch_name + '`*\n'
  + '*CI will run automatically. If tests pass, a PR will be created by WF03.*\n\n'
  + '</details>';

return [{ json: { body, repo, issue_number } }];

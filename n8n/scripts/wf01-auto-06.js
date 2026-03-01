// Node: Parse & Prepare Commits (wf01-auto-06)
// Workflow: WF01 Intent Analysis

const response = $input.first().json;
const ctx = $('Build Analysis Comment').first().json;
const claudeText = (response.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');

// Get SHA map and content map from Build Full Prompt
const shaMap = $('Build Full Prompt').first().json._shaMap || {};
const contentMap = $('Build Full Prompt').first().json._contentMap || {};

// Parse FILE blocks
const fileRegex = /FILE:\s*(.+?)\n```[\w]*\n([\s\S]*?)\n```/g;
const allFiles = [];
let match;
while ((match = fileRegex.exec(claudeText)) !== null) {
  const path = match[1].trim();
  const content = match[2];
  if (path && content !== undefined) {
    allFiles.push({ path, content, sha: shaMap[path] || '' });
  }
}

// Filter out files with no actual changes (compare against original content)
const files = allFiles.filter(f => {
  const original = contentMap[f.path];
  if (!original) return true; // new file, always include
  return f.content.trim() !== original.trim();
});

// Parse SUMMARY
let summary = 'Auto-develop completed';
const summaryMatch = claudeText.match(/SUMMARY:\s*(.+)/);
if (summaryMatch) summary = summaryMatch[1].trim();

const skippedCount = allFiles.length - files.length;

if (files.length === 0) {
  return [{ json: {
    path: '', content_text: '', message: '', sha: '', skip: true,
    _meta: { summary, fileCount: 0, skippedCount, fileList: '- (no files with actual changes)', repo: ctx.repo, branch_name: ctx.branch_name, issue_number: ctx.issue_number, claude_output: claudeText }
  } }];
}

const fileList = files.map(f => '- `' + f.path + '`').join('\n');
const meta = { summary, fileCount: files.length, skippedCount, fileList, repo: ctx.repo, branch_name: ctx.branch_name, issue_number: ctx.issue_number, claude_output: claudeText };

return files.map(f => ({
  json: {
    path: f.path,
    content_text: f.content,
    message: '[auto-develop] Update ' + f.path,
    sha: f.sha,
    repo: ctx.repo,
    branch: ctx.branch_name,
    _meta: meta
  }
}));

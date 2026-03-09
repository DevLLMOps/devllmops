// Node: Build Analysis Comment (wf01-11)
// Workflow: WF01 Intent Analysis

const claudeText = $input.first().json.content[0].text;
const ctx = $('Prepare Branch Data').first().json;
// Parse SUMMARY line and details
let summary = 'Implementation analysis complete for issue #' + ctx.issue_number + '.';
let details = claudeText;
const parts = claudeText.split(/^---$/m);
if (parts.length >= 2) {
  const summaryLine = parts[0].trim();
  const match = summaryLine.match(/^SUMMARY:\s*(.+)/i);
  if (match) summary = match[1].trim();
  details = parts.slice(1).join('---').trim();
}
const body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**' + summary + '**\n\n'
  + '<details>\n<summary>View full implementation analysis</summary>\n\n'
  + details + '\n\n'
  + '---\n'
  + '*Branch: `' + ctx.branch_name + '`*\n\n'
  + '</details>';
return [{ json: { body, repo: ctx.repo, issue_number: ctx.issue_number, analysis_text: claudeText, branch_name: ctx.branch_name, issue_title: ctx.issue_title, issue_body: ctx.issue_body, sha: ctx.sha } }];

// Node: Build Analysis Comment (wf03-13)
// Workflow: WF03 CI Failure Auto-Fix

const claudeText = $input.first().json.content[0].text;
const ctx = $('Extract Log URL').first().json;
const retryInfo = $('Count Retries').first().json;
let summary = 'CI failure diagnosed on `' + ctx.job_name + '`.';
let details = claudeText;
const parts = claudeText.split(/^---$/m);
if (parts.length >= 2) {
  const match = parts[0].trim().match(/^SUMMARY:\s*(.+)/i);
  if (match) summary = match[1].trim();
  details = parts.slice(1).join('---').trim();
}
const body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**' + summary + '**\n\n'
  + '<details>\n<summary>View full CI failure analysis</summary>\n\n'
  + details + '\n\n'
  + '---\n'
  + '*Failed job: `' + ctx.job_name + '` | Branch: `' + ctx.branch + '` | [View run](' + ctx.run_url + ')*\n\n'
  + '</details>';
return [{ json: { body, claude_text: claudeText, summary, repo: ctx.repo, branch: ctx.branch, comment_target: ctx.comment_target, skip_autofix: retryInfo.skip_autofix, retry_count: retryInfo.retry_count } }];

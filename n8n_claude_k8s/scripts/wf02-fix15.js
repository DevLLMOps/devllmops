// Node: Build Re-Review Comment (wf02-fix15)
// Workflow: WF02 PR AI Review

const claudeText = $input.first().json.content[0].text;
// Fallback chain: Extract PR Info -> Build Review Comment (more resilient after SplitInBatches)
let ctx = $('Extract PR Info').first().json;
if (!ctx.repo || !ctx.pr_number) {
  ctx = $('Build Review Comment').first().json;
}

let summary = 'AI re-review complete for PR #' + ctx.pr_number + ' (after auto-fix).';
let details = claudeText;
const parts = claudeText.split(/^---$/m);
if (parts.length >= 2) {
  const match = parts[0].trim().match(/^SUMMARY:\s*(.+)/i);
  if (match) summary = match[1].trim();
  details = parts.slice(1).join('---').trim();
}
const body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**Re-review after auto-fix: ' + summary + '**\n\n'
  + '<details>\n<summary>View full re-review</summary>\n\n'
  + details + '\n\n'
  + '</details>';

return [{ json: { body, repo: ctx.repo, pr_number: ctx.pr_number } }];
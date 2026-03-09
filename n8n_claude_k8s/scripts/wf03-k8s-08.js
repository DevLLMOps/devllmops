// Node: Build Fix Result Comment (wf03-k8s-08)
// Workflow: WF03 CI Failure Auto-Fix

const ctx = $('Build K8s Fix Job').first().json;
const jobStatus = $('Get Fix Job Status').first().json;
const logs = String($('Read Fix Pod Logs').first().json.data || '');
const succeeded = !!(jobStatus.status && jobStatus.status.succeeded >= 1);
const jobName = ctx.job_name;

// Parse Claude Code stream-json result from pod logs
let summary = succeeded ? 'Auto-fix completed' : 'Auto-fix failed';
let cost = '';
let turns = '';
let pushed = false;

const lines = logs.split('\n');
for (const line of lines) {
  if (line.includes('==> Pushing commits') || line.includes('==> Done. Changes pushed')) {
    pushed = true;
  }
  try {
    const j = JSON.parse(line);
    if (j.type === 'result') {
      const resultText = j.result || '';
      const m = resultText.match(/SUMMARY:\s*(.+)/);
      if (m) summary = m[1].trim();
      if (j.cost_usd) cost = '$' + j.cost_usd.toFixed(2);
      if (j.num_turns) turns = String(j.num_turns);
    }
  } catch {}
}

let body;
if (succeeded && pushed) {
  const details = [
    '- **Job:** `' + jobName + '`',
    '- **Branch:** `' + ctx.branch + '`',
    '- Changes pushed to branch.'
  ];
  if (cost) details.push('- **Cost:** ' + cost);
  if (turns) details.push('- **Turns:** ' + turns);
  details.push('*CI will re-run automatically.*');

  body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**Auto-fix (K8s): ' + summary + '**\n\n'
    + '<details>\n<summary>View details</summary>\n\n'
    + details.join('\n') + '\n\n'
    + '</details>';
} else if (succeeded && !pushed) {
  const details = [
    '- **Job:** `' + jobName + '`',
    '- **Branch:** `' + ctx.branch + '`',
    '- No changes were needed (issue may already be fixed).'
  ];
  if (cost) details.push('- **Cost:** ' + cost);
  if (turns) details.push('- **Turns:** ' + turns);

  body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**Auto-fix (K8s): ' + summary + '**\n\n'
    + '<details>\n<summary>View details</summary>\n\n'
    + details.join('\n') + '\n\n'
    + '</details>';
} else {
  const tail = logs.length > 2000 ? '...\n' + logs.slice(-2000) : logs;
  body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**\u274C Auto-fix failed**\n\n'
    + '<details>\n<summary>View error logs</summary>\n\n'
    + '```\n' + tail + '\n```\n\n'
    + '- **Job:** `' + jobName + '`\n'
    + '- **Branch:** `' + ctx.branch + '`\n\n'
    + '</details>\n\n'
    + 'A human developer should review the CI failure analysis above and apply the fix manually.';
}

return [{ json: { body, repo: ctx.repo, comment_target: ctx.comment_target } }];

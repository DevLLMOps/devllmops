// Node: Build Result Comment (wf01-k8s-08)
// Workflow: WF01 Intent Analysis (K8s)

const ctx = $('Build K8s Job').first().json;
const jobStatus = $('Get Job Status').first().json;
const logs = String($('Read Pod Logs').first().json.data || '');
const succeeded = !!(jobStatus.status && jobStatus.status.succeeded >= 1);
const jobName = ctx.job_name;

// Parse Claude Code stream-json result from pod logs
let summary = succeeded ? 'Auto-develop completed' : 'Auto-develop failed';
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
if (succeeded) {
  const details = [
    '- **Job:** `' + jobName + '`',
    '- **Branch:** `' + ctx.branch_name + '`'
  ];
  if (pushed) details.push('- Changes pushed to branch.');
  if (cost) details.push('- **Cost:** ' + cost);
  if (turns) details.push('- **Turns:** ' + turns);
  details.push('*CI will run automatically. If tests pass, a PR will be created.*');

  body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**Auto-develop (K8s): ' + summary + '**\n\n'
    + '<details>\n<summary>View details</summary>\n\n'
    + details.join('\n') + '\n\n'
    + '</details>';
} else {
  const tail = logs.length > 2000 ? '...\n' + logs.slice(-2000) : logs;
  body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**\u274C Auto-develop failed**\n\n'
    + '<details>\n<summary>View error logs</summary>\n\n'
    + '```\n' + tail + '\n```\n\n'
    + '- **Job:** `' + jobName + '`\n'
    + '- **Branch:** `' + ctx.branch_name + '`\n\n'
    + '</details>';
}

return [{ json: { body, repo: ctx.repo, issue_number: ctx.issue_number } }];

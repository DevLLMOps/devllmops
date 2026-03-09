// Node: Count Retries (wf03-35)
// Workflow: WF03 CI Failure Auto-Fix

const commits = $input.all();
const autoFixCount = commits.filter(item => {
  const msg = item.json.commit?.message || '';
  return msg.startsWith('[auto-fix]');
}).length;
return [{ json: { retry_count: autoFixCount, skip_autofix: autoFixCount >= 10 } }];

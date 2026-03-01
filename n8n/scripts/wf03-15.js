// Node: Parse Auto-Fix (wf03-15)
// Workflow: WF03 CI Failure Auto-Fix

const prev = $('Build Analysis Comment').first().json;
const text = prev.claude_text || '';
let has_fix = false;
let fix_file = '';
let fix_old = '';
let fix_new = '';
const fileMatch = text.match(/AUTO_FIX_FILE:\s*(.+)/);
const oldMatch = text.match(/AUTO_FIX_OLD:\n([\s\S]*?)\nAUTO_FIX_END/);
const newMatch = text.match(/AUTO_FIX_NEW:\n([\s\S]*?)\nAUTO_FIX_END/);
if (fileMatch && oldMatch && newMatch) {
  fix_file = fileMatch[1].trim();
  fix_old = oldMatch[1];
  fix_new = newMatch[1];
  has_fix = true;
}
return [{ json: { has_fix, fix_file, fix_old, fix_new, summary: prev.summary, repo: prev.repo, branch: prev.branch, comment_target: prev.comment_target, skip_autofix: prev.skip_autofix, retry_count: prev.retry_count } }];

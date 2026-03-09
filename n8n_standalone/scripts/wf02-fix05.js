// Node: Parse Fix Blocks (wf02-fix05)
// Workflow: WF02 PR AI Review

const claudeText = $input.first().json.content[0].text;
const review = $('Build Review Comment').first().json;

const fixes = [];

// Parse REVIEW_FIX_FILE blocks (modify existing files)
const fixRegex = /REVIEW_FIX_FILE:\s*(.+)\nREVIEW_FIX_OLD:\n([\s\S]*?)\nREVIEW_FIX_OLD_END\nREVIEW_FIX_NEW:\n([\s\S]*?)\nREVIEW_FIX_NEW_END/g;
let match;
while ((match = fixRegex.exec(claudeText)) !== null) {
  fixes.push({
    type: 'modify',
    path: match[1].trim(),
    fix_old: match[2],
    fix_new: match[3],
    repo: review.repo,
    branch: review.head_branch,
    pr_number: review.pr_number,
    has_fix: true
  });
}

// Parse REVIEW_NEW_FILE blocks (create new files)
const newRegex = /REVIEW_NEW_FILE:\s*(.+)\nREVIEW_NEW_CONTENT:\n([\s\S]*?)\nREVIEW_NEW_CONTENT_END/g;
while ((match = newRegex.exec(claudeText)) !== null) {
  fixes.push({
    type: 'create',
    path: match[1].trim(),
    content_text: match[2],
    repo: review.repo,
    branch: review.head_branch,
    pr_number: review.pr_number,
    has_fix: true
  });
}

if (fixes.length === 0) {
  return [{ json: { has_fix: false, repo: review.repo, pr_number: review.pr_number, head_branch: review.head_branch } }];
}

return fixes.map(f => ({ json: f }));
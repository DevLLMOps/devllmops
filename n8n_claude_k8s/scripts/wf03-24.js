// Node: Build PR Body (wf03-24)
// Workflow: WF03 CI Failure Auto-Fix

const prev = $('Extract Branch Info').first().json;
const checkPrItems = $('Check Existing PR').all();
const has_existing_pr = checkPrItems.some(item => item.json && item.json.number !== undefined);
const prefixMap = { b: 'Bug Fix', f: 'Feature', r: 'Refactor', o: 'Ops', d: 'Docs', e: 'Enhancement' };
const branch = prev.branch;
const branchMatch = branch.match(/^([bfrodec])\/#(\d+)-(.+)/);

// Use the full issue title from GitHub API if available
const issueData = $('Fetch Issue').first().json || {};
const issueTitle = issueData.title || '';

let title, body;
if (branchMatch) {
  const prefix = prefixMap[branchMatch[1]] || 'Update';
  const num = branchMatch[2];
  // Prefer full issue title over truncated branch slug
  const name = issueTitle || branchMatch[3].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  title = prefix + ': ' + name + ' (#' + num + ')';
  body = '> \uD83E\uDD16 **This is an automated PR created by the DevLLMOps AI Agent**\n\n'
    + 'CI passed on branch `' + branch + '`. This PR was auto-created for review.\n\n'
    + 'Closes #' + num;
} else {
  const slug = branch.replace(/[-_\/]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  title = slug;
  body = '> \uD83E\uDD16 **This is an automated PR created by the DevLLMOps AI Agent**\n\n'
    + 'CI passed on branch `' + branch + '`. This PR was auto-created for review.';
}
return [{ json: { has_existing_pr, title, body, ...prev } }];

// Node: Extract Branch Info (wf03-21)
// Workflow: WF03 CI Failure Auto-Fix

const webhook = $('GitHub Webhook').first().json.body;
const conclusion = webhook.check_suite.conclusion;
const branch = webhook.check_suite.head_branch || '';
const repo = webhook.repository.full_name;
const owner = webhook.repository.owner.login;
const protectedBranches = ['main', 'master', 'release', 'develop'];
const should_create_pr = conclusion === 'success' && !protectedBranches.includes(branch);
let issueNumber = null;
const branchMatch = branch.match(/^[bfrodec]\/#(\d+)/) || branch.match(/issue-(\d+)/);
if (branchMatch) issueNumber = parseInt(branchMatch[1]);
return [{ json: { repo, owner, branch, issue_number: issueNumber, should_create_pr } }];

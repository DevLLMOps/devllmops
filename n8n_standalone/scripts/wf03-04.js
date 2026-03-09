// Node: Extract Run Info (wf03-04)
// Workflow: WF03 CI Failure Auto-Fix

const webhook = $('GitHub Webhook').first().json.body;
const runs = $input.first().json.workflow_runs || [];
let failedRun = runs.find(r => r.conclusion === 'failure');
if (!failedRun) failedRun = runs.find(r => r.status === 'completed');
if (!failedRun) failedRun = runs[0];
if (!failedRun) throw new Error('No workflow run found for SHA ' + webhook.check_suite.head_sha);
const repo = webhook.repository.full_name;
const branch = webhook.check_suite.head_branch || failedRun.head_branch;
let prNumber = null;
const prs = webhook.check_suite.pull_requests || [];
if (prs.length > 0) prNumber = prs[0].number;
let issueNumber = null;
const branchMatch = branch.match(/^[bfrodec]\/#(\d+)/) || branch.match(/issue-(\d+)/);
if (branchMatch) issueNumber = parseInt(branchMatch[1]);
const commentTarget = prNumber || issueNumber;
return [{ json: { run_id: failedRun.id, run_name: failedRun.name, run_url: failedRun.html_url, repo, branch, comment_target: commentTarget } }];

// Node: Extract PR Info (wf02-03)
// Workflow: WF02 PR AI Review

const webhook = $('GitHub Webhook').first().json.body;
const pr = webhook.pull_request;
return [{ json: {
  pr_number: pr.number,
  pr_title: pr.title,
  repo: webhook.repository.full_name,
  head_branch: pr.head.ref
} }];
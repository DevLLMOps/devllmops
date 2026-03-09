// Node: Prepare Context (wf01-04)
// Workflow: WF01 Intent Analysis

const data = $input.first().json;
const labels = (data.labels || []).map(l => l.toLowerCase());
const prefixMap = {
  bug: 'b', feature: 'f', refactoring: 'r',
  operations: 'o', 'docs & research': 'd', enhancement: 'e'
};
let prefix = 'e';
for (const [label, p] of Object.entries(prefixMap)) {
  if (labels.includes(label)) { prefix = p; break; }
}
const slug = (data.issue_title || 'task')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40).replace(/-$/, '');
const branchName = `${prefix}/#${data.issue_number}-${slug}`;
return [{ json: {
  branch_name: branchName, repo: data.repo, issue_number: data.issue_number,
  issue_title: data.issue_title, issue_body: data.issue_body,
  project_item_node_id: data.project_item_node_id
} }];
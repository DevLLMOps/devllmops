// Node: Validate AI Ready + Extract (wf01-gql)
// Workflow: WF01 Intent Analysis

const gql = $input.first().json;
if (gql.errors || !gql.data || !gql.data.node) return [];
const item = gql.data.node;
const status = item.fieldValueByName ? item.fieldValueByName.name : '';
if (status !== 'AI Ready') return [];
const content = item.content;
return [{
  json: {
    issue_number: content.number,
    issue_title: content.title,
    issue_body: content.body || '',
    labels: content.labels.nodes.map(l => l.name),
    repo: content.repository.nameWithOwner,
    project_item_node_id: item.id
  }
}];
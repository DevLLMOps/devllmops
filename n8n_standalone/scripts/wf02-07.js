// Node: Check Security Paths (wf02-07)
// Workflow: WF02 PR AI Review

const diff = $('Get Full Diff').first().json.data || '';
const truncatedDiff = typeof diff === 'string' ? diff.substring(0, 50000) : JSON.stringify(diff).substring(0, 50000);
const ctx = $('Extract PR Info').first().json;
return [{ json: { diff: truncatedDiff, ...ctx } }];
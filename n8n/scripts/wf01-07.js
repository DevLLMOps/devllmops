// Node: Prepare Branch Data (wf01-07)
// Workflow: WF01 Intent Analysis

const sha = $input.first().json.object.sha;
const ctx = $('Prepare Context').first().json;
return [{ json: { ref: 'refs/heads/' + ctx.branch_name, sha, ...ctx } }];
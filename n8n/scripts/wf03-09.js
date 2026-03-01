// Node: Extract Log URL (wf03-09)
// Workflow: WF03 CI Failure Auto-Fix

const response = $input.first().json;
const headers = response.headers || {};
const location = headers.location || headers.Location || '';
const ctx = $('Extract Failed Job').first().json;
if (!location) {
  // Fallback: provide step summary only
  return [{ json: { logs: 'Raw logs unavailable. Step summary:\n' + ctx.step_summary, has_logs: false, ...ctx } }];
}
return [{ json: { log_url: location, has_logs: true, ...ctx } }];

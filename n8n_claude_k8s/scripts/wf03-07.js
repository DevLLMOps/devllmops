// Node: Extract Failed Job (wf03-07)
// Workflow: WF03 CI Failure Auto-Fix

const jobs = $input.first().json.jobs || [];
const failedJob = jobs.find(j => j.conclusion === 'failure');
if (!failedJob) throw new Error('No failed job found in run ' + $('Extract Run Info').first().json.run_id);
const ctx = $('Extract Run Info').first().json;
// Build step summary for Claude
const stepSummary = failedJob.steps.map(s => `  ${s.conclusion === 'failure' ? '❌' : '✅'} ${s.name}: ${s.conclusion}`).join('\n');
return [{ json: { job_id: failedJob.id, job_name: failedJob.name, step_summary: stepSummary, ...ctx } }];

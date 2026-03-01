// Node: Re-Build Review Body (wf02-fix13)
// Workflow: WF02 PR AI Review

const diff = $('Re-Get Diff').first().json.data || '';
const truncatedDiff = typeof diff === 'string' ? diff.substring(0, 50000) : JSON.stringify(diff).substring(0, 50000);
// Fallback chain: Extract PR Info -> Build Review Comment (more resilient after SplitInBatches)
let ctx = $('Extract PR Info').first().json;
if (!ctx.repo || !ctx.pr_number) {
  ctx = $('Build Review Comment').first().json;
}

// Decode context files (already fetched earlier)
let claudeMd = 'Not available.';
try {
  const raw = $('Fetch CLAUDE.md').first().json;
  if (raw.content) claudeMd = Buffer.from(raw.content.replace(/\n/g, ''), 'base64').toString('utf-8');
} catch (e) {}

let reviewMd = '';
try {
  const raw = $('Fetch REVIEW.md').first().json;
  if (raw.content) reviewMd = Buffer.from(raw.content.replace(/\n/g, ''), 'base64').toString('utf-8');
} catch (e) {}

let teamMd = '';
try {
  const raw = $('Fetch TEAM.md').first().json;
  if (raw.content) teamMd = Buffer.from(raw.content.replace(/\n/g, ''), 'base64').toString('utf-8');
} catch (e) {}

const guidelines = reviewMd || 'Review for:\n1. Bugs and logic errors\n2. OWASP Top 10 security issues\n3. Missing error handling\n4. Performance concerns';

const content = 'You are a senior code reviewer. This is a RE-REVIEW after automated fixes were applied to address critical findings.\n\n'
  + 'PROJECT CONTEXT (CLAUDE.md):\n' + claudeMd + '\n\n'
  + 'REVIEW GUIDELINES (REVIEW.md):\n' + guidelines + '\n\n'
  + (teamMd ? 'TEAM CONTEXT (TEAM.md):\n' + teamMd + '\n\n' : '')
  + 'Follow the review guidelines above. Provide your response in EXACTLY this format:\n'
  + 'SUMMARY: [one sentence overall assessment]\n'
  + 'VERDICT: [CRITICAL if any Critical-severity finding, HIGH if any High-severity finding, or PASS if none]\n'
  + '---\n'
  + '[detailed review following the guidelines above]\n\n'
  + 'IMPORTANT: The VERDICT line must reflect the HIGHEST severity finding. Use CRITICAL only for actual security vulnerabilities or data loss risks, not for mentions of security-critical paths or informational notes.\n\n'
  + 'NOTE: This PR had critical findings that were auto-fixed. Verify the fixes are correct and check for any remaining issues.\n\n'
  + 'PR title: ' + ctx.pr_title + '\n\n'
  + 'Diff (truncated to 50K chars):\n' + truncatedDiff;

const requestBody = {
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 4096,
  messages: [{ role: 'user', content }]
};
return [{ json: requestBody }];
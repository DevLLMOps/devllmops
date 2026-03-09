// Node: Build Claude Body (wf04-03)
// Workflow: WF04 Production Alert

const ctx = $input.first().json;
const requestBody = {
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: 'You are an SRE investigating a production alert.\n\n'      + 'Provide your response in EXACTLY this format:\n'      + 'SUMMARY: [one sentence describing the likely root cause and recommended action]\n'      + '---\n'      + '[full detailed investigation including:\n'      + '1. Likely root cause\n'      + '2. Impact assessment (users affected, severity)\n'      + '3. Immediate mitigation steps\n'      + '4. Recommended follow-up actions]\n\n'      + 'Alert name: ' + ctx.alert_name + '\n'      + 'Severity: ' + ctx.severity + '\n'      + 'Service: ' + ctx.service + '\n'      + 'Description: ' + ctx.description
  }]
};
return [{ json: requestBody }];
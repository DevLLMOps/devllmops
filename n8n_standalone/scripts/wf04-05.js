// Node: Build Issue Body (wf04-05)
// Workflow: WF04 Production Alert

const alert = $('Normalize Alert').first().json;
const claudeText = $input.first().json.content[0].text;
// Parse SUMMARY and details
let summary = 'Production alert: ' + alert.alert_name + ' on ' + alert.service + '.';
let details = claudeText;
const parts = claudeText.split(/^---$/m);
if (parts.length >= 2) {
  const match = parts[0].trim().match(/^SUMMARY:\s*(.+)/i);
  if (match) summary = match[1].trim();
  details = parts.slice(1).join('---').trim();
}
const issueBody = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**' + summary + '**\n\n'
  + '<details>\n<summary>View full investigation</summary>\n\n'
  + '## Alert Details\n\n'
  + '| Field | Value |\n|---|---|\n'
  + '| **Alert** | ' + alert.alert_name + ' |\n'
  + '| **Severity** | ' + alert.severity + ' |\n'
  + '| **Service** | ' + alert.service + ' |\n\n'
  + '## Agent Investigation\n\n'
  + details + '\n\n'
  + '</details>';
return [{ json: {
  title: '[ALERT] ' + alert.alert_name,
  body: issueBody,
  labels: ['incident', 'intent']
} }];
// Node: Normalize Alert (wf04-02)
// Workflow: WF04 Production Alert

const body = $input.first().json.body || $input.first().json;
const alertName = body.commonLabels?.alertname || body.title || body.alert_name || 'Unknown Alert';
const severity = body.commonLabels?.severity || body.severity || 'warning';
const description = body.commonAnnotations?.description || body.message || body.body || JSON.stringify(body);
const service = body.commonLabels?.service || body.service || body.monitor || 'unknown';
return [{ json: { alert_name: alertName, severity, description, service } }];
// Node: Base64 Encode + Build Body (wf01h-04)
// Workflow: WF01 GitHub Helper

const body = $('GitHub Helper Webhook').first().json.body || {};
const contentText = body.content_text || '';
const contentBase64 = Buffer.from(String(contentText)).toString('base64');
const result = {
  message: body.message || '',
  content: contentBase64,
  branch: body.branch || ''
};
const sha = body.sha || '';
if (sha && sha.trim() !== '') {
  result.sha = sha;
}
const repo = body.repo || '';
const path = body.path || '';
return [{ json: { ...result, path, repo } }];
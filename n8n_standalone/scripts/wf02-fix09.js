// Node: Prepare Commit (wf02-fix09)
// Workflow: WF02 PR AI Review

const fixItem = $('Commit Loop').first().json;
const fileData = $input.first().json;

let encodedContent;
if (fixItem.type === 'modify') {
  const currentContent = Buffer.from((fileData.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
  const fixedContent = currentContent.replace(fixItem.fix_old, fixItem.fix_new);
  if (fixedContent === currentContent) {
    throw new Error('REVIEW_FIX_OLD not found in file ' + fixItem.path + '. Exact string match failed.');
  }
  encodedContent = Buffer.from(fixedContent).toString('base64');
} else {
  encodedContent = Buffer.from(fixItem.content_text).toString('base64');
}

const result = {
  message: '[ai-review-fix] Fix: ' + fixItem.path,
  content: encodedContent,
  branch: fixItem.branch,
  path: fixItem.path,
  repo: fixItem.repo,
  pr_number: fixItem.pr_number
};

if (fileData.sha) {
  result.sha = fileData.sha;
}

return [{ json: result }];
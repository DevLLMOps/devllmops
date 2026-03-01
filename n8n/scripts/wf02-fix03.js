// Node: Build Fix Prompt (wf02-fix03)
// Workflow: WF02 PR AI Review

const review = $('Build Review Comment').first().json;
const fileItems = $('Get Changed Files').all();
const filenames = fileItems.map(item => item.json.filename).filter(Boolean);

const content = 'You are a senior developer. A code review found CRITICAL issues in a pull request that must be fixed before merge.\n\n'
  + 'REVIEW FINDINGS:\n' + review.claude_text + '\n\n'
  + 'PR DIFF (truncated):\n' + review.diff + '\n\n'
  + 'FILES CHANGED IN THIS PR:\n' + filenames.join('\n') + '\n\n'
  + 'INSTRUCTIONS:\n'
  + 'Fix ALL critical issues identified in the review. Use these EXACT output formats:\n\n'
  + 'To MODIFY an existing file (use exact text from the diff for OLD section):\n'
  + 'REVIEW_FIX_FILE: path/to/file\n'
  + 'REVIEW_FIX_OLD:\n'
  + '<exact text to find and replace>\n'
  + 'REVIEW_FIX_OLD_END\n'
  + 'REVIEW_FIX_NEW:\n'
  + '<replacement text>\n'
  + 'REVIEW_FIX_NEW_END\n\n'
  + 'To CREATE a new file:\n'
  + 'REVIEW_NEW_FILE: path/to/file\n'
  + 'REVIEW_NEW_CONTENT:\n'
  + '<complete file content>\n'
  + 'REVIEW_NEW_CONTENT_END\n\n'
  + 'Rules:\n'
  + '- For REVIEW_FIX_OLD: copy the EXACT text from the current file (visible in the diff after + prefix). Include enough surrounding context for a unique match.\n'
  + '- Fix ONLY the critical issues. Do not refactor or change anything else.\n'
  + '- You may output multiple fix blocks if multiple files need changes.\n'
  + '- If code needs to move to a new file, output both a modify block and a new file block.\n'
  + '- Maintain existing code style and indentation.';

const requestBody = {
  model: 'claude-sonnet-4-6',
  max_tokens: 8192,
  messages: [{ role: 'user', content }]
};

return [{ json: requestBody }];
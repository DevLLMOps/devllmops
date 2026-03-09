// Node: Build Full Prompt (wf01-auto-04)
// Workflow: WF01 Intent Analysis

const ctx = $('Build Analysis Comment').first().json;
const claudeMdRaw = $('Fetch CLAUDE.md').first().json.content || '';
const tree = $('Fetch File Tree').first().json.tree || [];

// Decode CLAUDE.md
let claudeMd = '';
try { claudeMd = Buffer.from(claudeMdRaw.replace(/\n/g, ''), 'base64').toString('utf8'); } catch(e) {}

// Build file tree string
const fileTree = tree.filter(t => t.type === 'blob').map(t => t.path).join('\n');

// Collect fetched file contents, SHA map, and content map for diff checking
const shaMap = {};
const contentMap = {};
let fileContents = '';

const inputItems = $input.all();
for (const item of inputItems) {
  const d = item.json;
  if (!d.path || !d.content) continue;
  if (d.sha) shaMap[d.path] = d.sha;
  let decoded = '';
  try { decoded = Buffer.from(d.content.replace(/\n/g, ''), 'base64').toString('utf8'); } catch(e) { continue; }
  contentMap[d.path] = decoded;
  if (decoded.length > 30000) {
    fileContents += '### ' + d.path + '\n(file too large, ' + decoded.length + ' chars \u2014 skipped)\n\n';
    continue;
  }
  fileContents += '### ' + d.path + '\n```\n' + decoded + '\n```\n\n';
}

const repo = ctx.repo;
const branch_name = ctx.branch_name;

const system_message = 'You are an expert software developer implementing changes to a GitHub repository.\n\n'
  + 'REPOSITORY: ' + repo + '\n'
  + 'BRANCH: ' + branch_name + '\n\n'
  + (claudeMd ? '## Project Context (CLAUDE.md)\n\n' + claudeMd + '\n\n' : '')
  + '## Rules\n\n'
  + '- Do NOT modify .github/workflows/ files or deploy/CI scripts\n'
  + '- Do NOT modify files unrelated to the issue\n'
  + '- Follow existing code conventions and patterns in the repository\n'
  + '- Implement the feature FULLY and COMPLETELY \u2014 do not add stubs, placeholders, or partial implementations\n'
  + '- Only output FILE blocks for files you are ACTUALLY changing \u2014 do not output files with no modifications\n\n'
  + '## Testing\n\n'
  + '- Review the existing test files provided below to understand current test coverage\n'
  + '- If your changes add new user-facing behavior NOT already covered by existing tests, add or update test files\n'
  + '- If existing tests already cover the feature you are implementing, do NOT add duplicate tests\n'
  + '- Follow the existing test patterns, naming conventions, and framework used in the project\n'
  + '- Test files are output as FILE blocks just like source files\n\n'
  + '## Output Format\n\n'
  + 'Output ONLY the changed files using this exact format (one block per file):\n\n'
  + 'FILE: path/to/file.ext\n'
  + '```\n'
  + 'full file content here\n'
  + '```\n\n'
  + 'After all FILE blocks, add exactly one line:\n\n'
  + 'SUMMARY: One sentence describing what was implemented\n\n'
  + 'IMPORTANT:\n'
  + '- Each FILE block must contain the COMPLETE file content (not a diff/patch)\n'
  + '- Only output files that have ACTUAL substantive changes\n'
  + '- For new files, use the full intended path';

const user_message = '## Task\n\n'
  + 'Implement the following GitHub issue.\n\n'
  + '**Issue #' + ctx.issue_number + ': ' + ctx.issue_title + '**\n\n'
  + ctx.issue_body + '\n\n'
  + '## AI Analysis (advisory only)\n\n'
  + 'NOTE: The analysis below may reference file paths that do NOT exist in this repository. '
  + 'Ignore any file paths from the analysis that are not present in the actual file tree below. '
  + 'Use the actual repository structure and file contents to guide your implementation.\n\n'
  + ctx.analysis_text + '\n\n'
  + '## Repository File Tree (actual)\n\n'
  + '```\n' + fileTree + '\n```\n\n'
  + (fileContents ? '## Current File Contents\n\n' + fileContents + '\n' : '')
  + '## Instructions\n\n'
  + 'Implement the feature described in the issue COMPLETELY. '
  + 'Study the existing code carefully and make all necessary changes across all relevant files. '
  + 'Include CSS/styling changes, HTML structure changes, and JavaScript logic changes as needed. '
  + 'Output ONLY the FILE blocks for files with actual changes, followed by SUMMARY.';

return [{ json: {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 16384,
  system: system_message,
  messages: [{ role: 'user', content: user_message }],
  temperature: 1,
  _shaMap: shaMap,
  _contentMap: contentMap
} }];

// Node: Apply Fix + Commit Body (wf03-18)
// Workflow: WF03 CI Failure Auto-Fix

const prev = $('Parse Auto-Fix').first().json;
const fileData = $input.first().json;

// Handle 404: file doesn't exist (Claude guessed wrong path)
if (!fileData.content) {
  return [{ json: {
    skip: true,
    message: '[auto-fix] skipped — file not found: ' + prev.fix_file,
    branch: prev.branch,
    path: prev.fix_file,
    repo: prev.repo,
    comment_target: prev.comment_target,
    summary: prev.summary
  } }];
}

const content = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf8');
const fixed = content.replace(prev.fix_old, prev.fix_new);
if (fixed === content) {
  return [{ json: {
    skip: true,
    message: '[auto-fix] skipped — exact match not found in ' + prev.fix_file,
    branch: prev.branch,
    path: prev.fix_file,
    repo: prev.repo,
    comment_target: prev.comment_target,
    summary: prev.summary
  } }];
}
const encodedContent = Buffer.from(fixed).toString('base64');
const commitMsg = '[auto-fix] ' + prev.summary;
return [{ json: { message: commitMsg, content: encodedContent, sha: fileData.sha, branch: prev.branch, path: prev.fix_file, repo: prev.repo, comment_target: prev.comment_target, summary: prev.summary } }];

// Node: Select Files (wf01-auto-01)
// Workflow: WF01 Intent Analysis

const tree = $input.first().json.tree || [];
const ctx = $('Build Analysis Comment').first().json;
const analysisText = ctx.analysis_text || '';

// Build set of valid tree paths (blobs only)
const blobs = tree.filter(t => t.type === 'blob');
const treePaths = new Set(blobs.map(t => t.path));

// Strategy 1: Extract backticked paths from analysis and cross-ref with tree
const pathMatches = analysisText.match(/`([^`]+\.[a-zA-Z0-9]+)`/g) || [];
const candidatePaths = pathMatches.map(m => m.replace(/`/g, '').trim());
const seen = new Set();
const matched = [];
for (const p of candidatePaths) {
  if (treePaths.has(p) && !seen.has(p)) {
    seen.add(p);
    matched.push(p);
  }
}

// Strategy 1.5: Suffix-match for wrong-prefix paths (e.g. 'static/style.css' → 'app/src/static/style.css')
for (const candidate of candidatePaths) {
  if (seen.has(candidate)) continue;
  for (const blob of blobs) {
    if (blob.path.endsWith('/' + candidate) && !seen.has(blob.path)) {
      seen.add(blob.path);
      matched.push(blob.path);
    }
  }
}

let filesToFetch = matched;

// Strategy 2: If only docs matched (no actual code files), select all source code files
const codeMatched = matched.filter(p => !p.endsWith('.md'));
if (codeMatched.length === 0) {
  const sourceExts = new Set(['py','js','ts','tsx','jsx','html','css','scss','vue','svelte','go','rs','java','rb','php','c','cpp','h','hpp']);
  const ignorePrefixes = ['.github/', 'scripts/', 'node_modules/', '.'];
  filesToFetch = blobs
    .map(t => t.path)
    .filter(p => {
      const ext = p.split('.').pop().toLowerCase();
      if (!sourceExts.has(ext)) return false;
      for (const prefix of ignorePrefixes) {
        if (p.startsWith(prefix)) return false;
      }
      return true;
    });
}

// Always include CLAUDE.md if it exists and not already included
if (treePaths.has('CLAUDE.md') && !filesToFetch.includes('CLAUDE.md')) {
  filesToFetch.unshift('CLAUDE.md');
}

// Always include test files for context (so Claude can assess test coverage)
const testDirs = ['tests/', 'test/', 'e2e/', '__tests__/'];
const testExts = new Set(['spec.js','test.js','spec.ts','test.ts','spec.jsx','test.jsx','spec.tsx','test.tsx']);
for (const blobPath of blobs.map(t => t.path)) {
  if (filesToFetch.includes(blobPath)) continue;
  const inTestDir = testDirs.some(d => blobPath.includes(d));
  const fileName = blobPath.split('/').pop() || '';
  const isTestFile = testExts.has(fileName.split('.').slice(1).join('.'));
  if (inTestDir || isTestFile) {
    filesToFetch.push(blobPath);
  }
}

// Cap at 15 files
const capped = filesToFetch.slice(0, 15);

if (capped.length === 0) {
  return [{ json: { path: '', skip: true } }];
}

return capped.map(p => ({ json: { path: p } }));

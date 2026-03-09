// Node: Build Review Comment (wf02-10)
// Workflow: WF02 PR AI Review

const claudeText = $input.first().json.content[0].text;
const ctx = $('Check Security Paths').first().json;

// Parse SUMMARY and details
let summary = 'AI code review complete for PR #' + ctx.pr_number + '.';
let details = claudeText;
const parts = claudeText.split(/^---$/m);
if (parts.length >= 2) {
  const match = parts[0].trim().match(/^SUMMARY:\s*(.+)/i);
  if (match) summary = match[1].trim();
  details = parts.slice(1).join('---').trim();
}
const body = '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
  + '**' + summary + '**\n\n'
  + '<details>\n<summary>View full code review</summary>\n\n'
  + details + '\n\n'
  + '</details>';

// === Dynamic security check + reviewer resolution ===

function matchGlob(filename, pattern) {
  if (pattern === '*') return true;
  if (pattern.endsWith('/')) return filename.startsWith(pattern);
  if (!pattern.includes('*')) return filename === pattern || filename.startsWith(pattern + '/');
  const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*+/g, '.*') + '$');
  return regex.test(filename);
}

// 1. Extract security-critical paths from CLAUDE.md
let securityPaths = [];
try {
  const raw = $('Fetch CLAUDE.md').first().json;
  if (raw.content) {
    const md = Buffer.from(raw.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    const section = md.match(/## Security[- ]Critical Paths[^\n]*\n([\s\S]*?)(?=\n## |\n*$)/i);
    if (section) {
      const ticks = section[1].match(/`([^`]+)`/g);
      if (ticks) securityPaths = ticks.map(t => t.replace(/`/g, ''));
    }
  }
} catch (e) {}

// 2. Extract team members and review routing from TEAM.md
const teamMembers = {};
const teamRouting = [];
try {
  const raw = $('Fetch TEAM.md').first().json;
  if (raw.content) {
    const md = Buffer.from(raw.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    const memberRows = md.split('\n').filter(l => l.includes('|') && l.includes('@'));
    for (const row of memberRows) {
      const cols = row.split('|').map(s => s.trim()).filter(Boolean);
      if (cols.length >= 3) {
        const role = cols[1];
        const handleMatch = cols[2].match(/@(\w[\w-]*)/);
        if (handleMatch) teamMembers[role] = handleMatch[1];
      }
    }
    const routingSection = md.match(/## Review Routing[^\n]*\n[\s\S]*?\|[- |]+\|\n([\s\S]*?)(?=\n## |\s*$)/i);
    if (routingSection) {
      const rows = routingSection[1].trim().split('\n').filter(l => l.includes('|'));
      for (const row of rows) {
        const cols = row.split('|').map(s => s.trim()).filter(Boolean);
        if (cols.length >= 2) {
          const pattern = cols[0].replace(/`/g, '').replace(/\(.*\)/, '').trim();
          const role = cols[1].trim();
          teamRouting.push({ pattern, role });
        }
      }
    }
  }
} catch (e) {}

// 3. Match changed files
const fileItems = $('Get Changed Files').all();
const filenames = fileItems.map(item => item.json.filename).filter(Boolean);
let requireHuman = false;
const reviewerRoles = new Set();

for (const filename of filenames) {
  for (const sp of securityPaths) {
    if (matchGlob(filename, sp)) { requireHuman = true; break; }
  }
  for (const route of teamRouting) {
    if (route.pattern !== '*' && matchGlob(filename, route.pattern)) {
      reviewerRoles.add(route.role);
    }
  }
}

if (requireHuman && reviewerRoles.size === 0) {
  const defaultRoute = teamRouting.find(r => r.pattern === '*');
  if (defaultRoute) reviewerRoles.add(defaultRoute.role);
}

// 4. Resolve roles to GitHub handles
const reviewers = [...reviewerRoles].map(r => teamMembers[r]).filter(Boolean);
if (requireHuman && reviewers.length === 0) {
  reviewers.push(...Object.values(teamMembers));
}

const hasCritical = /^VERDICT:\s*CRITICAL/mi.test(claudeText);
return [{ json: { body, pr_number: ctx.pr_number, repo: ctx.repo, head_branch: ctx.head_branch, diff: ctx.diff, require_human: requireHuman, reviewers, has_critical: hasCritical, claude_text: claudeText } }];
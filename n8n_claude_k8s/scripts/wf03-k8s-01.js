// Node: Build K8s Fix Job (wf03-k8s-01)
// Workflow: WF03 CI Failure Auto-Fix

const K8S_API = 'K8S_API_URL_PLACEHOLDER';
const K8S_NS = 'K8S_NAMESPACE_PLACEHOLDER';
const IMAGE = 'CLAUDE_CODE_IMAGE_PLACEHOLDER';

const ctx = $('Build Analysis Comment').first().json;
const runInfo = $('Extract Run Info').first().json;
const retryInfo = $('Count Retries').first().json;

// Generate unique job name (K8s requires DNS-safe names, max 63 chars)
const ts = Date.now().toString(36);
const jobName = ('autofix-' + ctx.comment_target + '-' + ts).substring(0, 63);

// Random delimiter to isolate AI-generated content (prompt injection defense)
const boundary = '===== ' + Array.from({length: 4}, () => Math.random().toString(36).slice(2, 6)).join('-') + ' =====';

let retryContext = '';
if (retryInfo.retry_count > 0) {
  retryContext = '\n\nIMPORTANT: This is auto-fix attempt #' + (retryInfo.retry_count + 1) + '/10. '
    + 'Previous auto-fix commits on this branch have failed CI. '
    + 'Try a DIFFERENT approach from what was tried before.';
}

// Build prompt for Claude Code
const prompt = [
  'You are a CI/CD debugging expert. A GitHub Actions CI run failed on this branch.',
  '',
  'REPO: ' + ctx.repo,
  'BRANCH: ' + ctx.branch,
  'COMMENT TARGET: #' + ctx.comment_target,
  'FAILED RUN: ' + runInfo.run_url,
  '',
  '## AI Diagnosis Summary',
  '',
  'An initial analysis was already posted. Here is the summary:',
  '',
  boundary,
  ctx.summary,
  boundary,
  '',
  '## Available Tools',
  '',
  'You have full access to the repository and these tools:',
  '- **gh CLI** (authenticated) for GitHub operations:',
  '  - `gh run view ' + runInfo.run_id + ' --log-failed` — full CI failure logs',
  '  - `gh pr list --head ' + ctx.branch + '` — find associated PRs',
  '  - `gh pr view <number> --comments` — view PR review comments for context',
  '  - `gh api repos/' + ctx.repo + '/issues/' + ctx.comment_target + '/comments` — view issue comments',
  '- **git** for version control',
  '- **Standard dev tools** (Node.js, npm, etc.)',
  '',
  '## Workflow',
  '',
  '1. Run `gh run view ' + runInfo.run_id + ' --log-failed` to see the full CI failure logs',
  '2. Check for PR review comments that might provide context on what to fix',
  '3. Read the relevant source files to understand the codebase',
  '4. Fix the code to make CI pass',
  '5. If a test command is available (check package.json scripts, Makefile, etc.), run tests locally to verify your fix',
  '6. Commit your changes with message prefix "[auto-fix] "',
  '',
  '## Rules',
  '',
  '- Prefix every commit message with "[auto-fix] "',
  '- Do NOT modify CI/CD configs (.github/workflows/, Makefile, Dockerfile) unless the CI config itself is broken',
  '- Do NOT modify .env, credentials.*, or any secret files',
  '- Do NOT push to main or force-push any branch',
  '- Follow existing code patterns and conventions',
  '- Read files before modifying them — understand the codebase first',
  '- If you cannot fix the issue, explain why in your summary',
  retryContext,
  '',
  'After finishing, output a line: SUMMARY: <one-sentence description of what you fixed>'
].join('\n');

// Build K8s Job manifest
const jobManifest = {
  apiVersion: 'batch/v1',
  kind: 'Job',
  metadata: {
    name: jobName,
    namespace: K8S_NS,
    labels: {
      'app.kubernetes.io/part-of': 'devllmops',
      'app.kubernetes.io/component': 'auto-fix',
      'devllmops/target': String(ctx.comment_target)
    }
  },
  spec: {
    activeDeadlineSeconds: 1800,
    ttlSecondsAfterFinished: 300,
    backoffLimit: 0,
    template: {
      metadata: {
        labels: {
          'app.kubernetes.io/part-of': 'devllmops',
          'app.kubernetes.io/component': 'auto-fix'
        }
      },
      spec: {
        restartPolicy: 'Never',
        imagePullSecrets: [{ name: 'ghcr-pull-secret' }],
        securityContext: {
          runAsUser: 1001, runAsGroup: 1001,
          runAsNonRoot: true, fsGroup: 1001
        },
        containers: [{
          name: 'claude-code',
          image: IMAGE,
          imagePullPolicy: 'Always',
          resources: {
            requests: { cpu: '500m', memory: '1Gi' },
            limits: { cpu: '2', memory: '4Gi' }
          },
          securityContext: {
            runAsNonRoot: true,
            allowPrivilegeEscalation: false,
            readOnlyRootFilesystem: true,
            capabilities: { drop: ['ALL'] }
          },
          env: [
            { name: 'REPO', value: ctx.repo },
            { name: 'BRANCH', value: ctx.branch },
            { name: 'PROMPT', value: prompt },
            { name: 'TIMEOUT', value: '1800' },
            { name: 'ANTHROPIC_API_KEY', valueFrom: { secretKeyRef: { name: 'anthropic-api-key', key: 'key' } } },
            { name: 'GITHUB_TOKEN', valueFrom: { secretKeyRef: { name: 'github-credentials', key: 'token' } } }
          ],
          volumeMounts: [
            { name: 'workspace', mountPath: '/workspace' },
            { name: 'tmp', mountPath: '/tmp' },
            { name: 'claude-home', mountPath: '/home/claude' }
          ]
        }],
        volumes: [
          { name: 'workspace', emptyDir: {} },
          { name: 'tmp', emptyDir: { sizeLimit: '512Mi' } },
          { name: 'claude-home', emptyDir: { sizeLimit: '256Mi' } }
        ]
      }
    }
  }
};

// Pre-compute K8s API URLs for downstream HTTP Request nodes
const batchBase = K8S_API + '/apis/batch/v1/namespaces/' + K8S_NS;
const coreBase = K8S_API + '/api/v1/namespaces/' + K8S_NS;

return [{ json: {
  job_name: jobName,
  job_manifest: jobManifest,
  create_url: batchBase + '/jobs',
  status_url: batchBase + '/jobs/' + jobName,
  pods_url: coreBase + '/pods?labelSelector=job-name=' + jobName,
  log_base_url: coreBase + '/pods/',
  repo: ctx.repo,
  branch: ctx.branch,
  comment_target: ctx.comment_target,
  summary: ctx.summary
} }];

// Node: Calculate Costs (wf05-04)
// Workflow: WF05 Daily Cost Report

// --- Pricing per million tokens (update when models change) ---
const PRICING = {
  haiku:  { input: 1.00, output: 5.00 },
  sonnet: { input: 3.00, output: 15.00 }
};

// --- Map workflow names to models ---
const workflows = ($('Fetch Workflows').first().json.data || []);
const wfMap = {};
for (const wf of workflows) {
  // Detect model from workflow name
  const name = wf.name || '';
  let model = 'haiku'; // default
  if (name.includes('03') || name.includes('04') || name.includes('CI Failure') || name.includes('Production Alert')) {
    model = 'sonnet';
  }
  // Average tokens per invocation (conservative estimates)
  wfMap[wf.id] = { name, model, avg_input: 5000, avg_output: 2500 };
}

// --- Filter executions to last 24h ---
const now = new Date();
const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
const executions = ($input.first().json.data || []);
const recent = executions.filter(e => new Date(e.startedAt) >= oneDayAgo);

// --- Count per workflow and estimate tokens ---
let totalInput = 0, totalOutput = 0;
const breakdown = {};
for (const ex of recent) {
  // Skip WF05 itself (cost report doesn't call Claude)
  const wf = wfMap[ex.workflowId];
  if (!wf) continue;
  if (wf.name.includes('05') || wf.name.includes('Cost Report')) continue;
  totalInput += wf.avg_input;
  totalOutput += wf.avg_output;
  breakdown[wf.name] = (breakdown[wf.name] || 0) + 1;
}

// --- Compute cost ---
// Weighted average pricing (rough: assume 50/50 haiku/sonnet split,
// but actually compute per-execution based on model)
let dailyCost = 0;
for (const ex of recent) {
  const wf = wfMap[ex.workflowId];
  if (!wf) continue;
  if (wf.name.includes('05') || wf.name.includes('Cost Report')) continue;
  const p = PRICING[wf.model] || PRICING.haiku;
  dailyCost += (wf.avg_input / 1e6) * p.input + (wf.avg_output / 1e6) * p.output;
}

// --- Rolling 7-day average from staticData ---
const staticData = $getWorkflowStaticData('global');
const history = staticData.dailyCosts || [];
history.push({ date: now.toISOString().slice(0, 10), cost: dailyCost });
// Keep last 7 entries
while (history.length > 7) history.shift();
staticData.dailyCosts = history;

const rollingSum = history.reduce((s, d) => s + d.cost, 0);
const rollingAvg = history.length > 0 ? rollingSum / history.length : 0;
const monthToDate = history.reduce((s, d) => {
  return d.date.slice(0, 7) === now.toISOString().slice(0, 7) ? s + d.cost : s;
}, 0);

// --- Build breakdown text ---
let breakdownText = '';
for (const [name, count] of Object.entries(breakdown)) {
  breakdownText += `- ${name}: ${count} execution(s)\n`;
}
if (!breakdownText) breakdownText = '- No AI workflow executions in the last 24h\n';

const isOverThreshold = dailyCost > 1.5 * rollingAvg && rollingAvg > 0 && history.length >= 2;

return [{ json: {
  daily_cost: dailyCost.toFixed(2),
  rolling_average_7d: rollingAvg.toFixed(2),
  month_to_date: monthToDate.toFixed(2),
  input_tokens: totalInput,
  output_tokens: totalOutput,
  execution_count: recent.length,
  breakdown: breakdownText,
  is_over_threshold: isOverThreshold
} }];

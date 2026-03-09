// Node: Build Daily Summary Body (wf05-08)
// Workflow: WF05 Daily Cost Report

const d = $('Calculate Costs').first().json;
return [{ json: {
  title: '[Daily Report] AI Usage — $' + d.daily_cost,
  body: '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**AI usage yesterday: $' + d.daily_cost + ' | 7-day avg: $' + d.rolling_average_7d + ' | MTD: $' + d.month_to_date + '**\n\n'
    + '<details>\n<summary>View full daily report</summary>\n\n'
    + '| Metric | Value |\n|---|---|\n'
    + '| **Daily spend** | $' + d.daily_cost + ' |\n'
    + '| **7-day average** | $' + d.rolling_average_7d + ' |\n'
    + '| **Month-to-date** | $' + d.month_to_date + ' |\n'
    + '| **Input tokens** | ' + d.input_tokens + ' |\n'
    + '| **Output tokens** | ' + d.output_tokens + ' |\n'
    + '| **Executions** | ' + d.execution_count + ' |\n\n'
    + '### Breakdown\n\n' + d.breakdown + '\n'
    + '</details>',
  labels: ['daily-report']
} }];

// Node: Build Cost Alert Body (wf05-06)
// Workflow: WF05 Daily Cost Report

const d = $('Calculate Costs').first().json;
return [{ json: {
  title: '[COST ALERT] Daily AI spend ($' + d.daily_cost + ') exceeds 150% of 7-day average',
  body: '> \uD83E\uDD16 **This is an automated message from the DevLLMOps AI Agent**\n\n'
    + '**Daily AI spend ($' + d.daily_cost + ') exceeds 150% of the 7-day rolling average ($' + d.rolling_average_7d + ').**\n\n'
    + '<details>\n<summary>View cost breakdown</summary>\n\n'
    + '| Metric | Value |\n|---|---|\n'
    + '| **Daily spend** | $' + d.daily_cost + ' |\n'
    + '| **7-day average** | $' + d.rolling_average_7d + ' |\n'
    + '| **Month-to-date** | $' + d.month_to_date + ' |\n'
    + '| **Input tokens** | ' + d.input_tokens + ' |\n'
    + '| **Output tokens** | ' + d.output_tokens + ' |\n'
    + '| **Executions** | ' + d.execution_count + ' |\n\n'
    + '### Breakdown\n\n' + d.breakdown + '\n'
    + '### Recommended actions\n\n'
    + '- Review prompt efficiency\n'
    + '- Check for runaway automation loops\n'
    + '- Consider using Haiku for routine tasks\n\n'
    + '</details>',
  labels: ['cost-alert']
} }];

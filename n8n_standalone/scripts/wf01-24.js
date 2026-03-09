// Node: Build Summary Comment (wf01-24)
// Workflow: WF01 Intent Analysis

// Pass through from Format Output
const data = $input.first().json;
return [{ json: data }];

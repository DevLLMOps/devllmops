#!/usr/bin/env python3
"""One-time extraction: split jsCode from workflow JSONs into standalone .js files.

Reads n8n/*.json, extracts Code node jsCode into n8n/scripts/{node_id}.js,
writes template JSONs (with jsCode replaced by marker) to n8n/workflows/.
"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKFLOWS_DIR = os.path.join(SCRIPT_DIR, "workflows")
SCRIPTS_DIR = os.path.join(SCRIPT_DIR, "scripts")

CODE_NODE_TYPE = "n8n-nodes-base.code"
MARKER = "// INJECTED BY deploy.py — see scripts/{node_id}.js"

# Map workflow filenames to short names for comments
WORKFLOW_NAMES = {
    "01-intent-analysis.json": "WF01 Intent Analysis",
    "01-commit-helper.json": "WF01 GitHub Helper",
    "01-anthropic-proxy.json": "WF01 Anthropic Proxy",
    "02-pr-ai-review.json": "WF02 PR AI Review",
    "03-ci-failure-autofix.json": "WF03 CI Failure Auto-Fix",
    "04-production-alert.json": "WF04 Production Alert",
    "05-daily-cost-report.json": "WF05 Daily Cost Report",
}


def extract_workflow(json_path: str, filename: str) -> dict:
    """Extract jsCode from a workflow JSON, write .js files, return cleaned JSON."""
    with open(json_path, "r") as f:
        workflow = json.load(f)

    wf_label = WORKFLOW_NAMES.get(filename, filename)
    extracted = 0

    for node in workflow.get("nodes", []):
        if node.get("type") != CODE_NODE_TYPE:
            continue

        node_id = node.get("id", "unknown")
        node_name = node.get("name", "Unknown")
        js_code = node.get("parameters", {}).get("jsCode", "")

        if not js_code or js_code.startswith("// INJECTED BY"):
            continue

        # Write .js file with header comment
        js_path = os.path.join(SCRIPTS_DIR, f"{node_id}.js")
        header = f"// Node: {node_name} ({node_id})\n// Workflow: {wf_label}\n\n"
        with open(js_path, "w") as f:
            f.write(header + js_code)

        # Replace jsCode with marker in template
        node["parameters"]["jsCode"] = MARKER.format(node_id=node_id)
        extracted += 1
        print(f"  {node_id}: {node_name} ({len(js_code)} chars)")

    return workflow, extracted


def main():
    os.makedirs(WORKFLOWS_DIR, exist_ok=True)
    os.makedirs(SCRIPTS_DIR, exist_ok=True)

    json_files = sorted(
        f for f in os.listdir(SCRIPT_DIR)
        if f.endswith(".json")
    )

    if not json_files:
        print("No JSON files found in n8n/. Already extracted?")
        sys.exit(1)

    total = 0
    for filename in json_files:
        json_path = os.path.join(SCRIPT_DIR, filename)
        print(f"\n{filename}:")

        workflow, count = extract_workflow(json_path, filename)
        total += count

        # Write template JSON
        out_path = os.path.join(WORKFLOWS_DIR, filename)
        with open(out_path, "w") as f:
            json.dump(workflow, f, indent=2, ensure_ascii=False)
            f.write("\n")

        if count == 0:
            print("  (no Code nodes)")

    print(f"\nDone: {total} scripts extracted to n8n/scripts/")
    print(f"Templates written to n8n/workflows/")


if __name__ == "__main__":
    main()

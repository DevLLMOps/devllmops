#!/usr/bin/env python3
"""Build and deploy n8n workflows.

Injects jsCode from scripts/*.js into workflow templates, maps credentials,
and deploys to n8n via REST API. Auto-creates missing credentials and workflows
on first run (idempotent).

Usage:
    python3 n8n/deploy.py                        # Deploy all workflows
    python3 n8n/deploy.py 02-pr-ai-review        # Deploy specific workflow
    python3 n8n/deploy.py --build-only 02        # Build only, print JSON to stdout
    python3 n8n/deploy.py --setup                # Setup only (create credentials + workflows, no deploy)
    python3 n8n/deploy.py --list                 # List available workflows
"""

import json
import os
import sys
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKFLOWS_DIR = os.path.join(SCRIPT_DIR, "workflows")
SCRIPTS_DIR = os.path.join(SCRIPT_DIR, "scripts")
CREDENTIALS_FILE = os.path.join(SCRIPT_DIR, "credentials.env")

CODE_NODE_TYPE = "n8n-nodes-base.code"

# Credentials to auto-create if missing
REQUIRED_CREDENTIALS = [
    {
        "env_key": "GITHUB_API_CREDENTIAL_ID",
        "n8n_type": "githubApi",
        "n8n_name": "GitHub account",
    },
    {
        "env_key": "ANTHROPIC_API_CREDENTIAL_ID",
        "n8n_type": "httpHeaderAuth",
        "n8n_name": "Anthropic API Key",
    },
    {
        "env_key": "N8N_INTERNAL_API_CREDENTIAL_ID",
        "n8n_type": "httpHeaderAuth",
        "n8n_name": "n8n Internal API",
    },
]


def log(msg: str):
    print(msg, file=sys.stderr)


# ---------------------------------------------------------------------------
# n8n API helper
# ---------------------------------------------------------------------------

def n8n_api(creds: dict, method: str, path: str, data: dict = None) -> dict:
    """Make an n8n API request. Returns parsed JSON response."""
    host = creds["N8N_HOST"].rstrip("/")
    url = f"{host}{path}"
    headers = {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": creds["N8N_API_KEY"],
        "User-Agent": "n8n-deploy/1.0",
    }

    body = json.dumps(data).encode("utf-8") if data is not None else None
    if method == "POST" and body is None:
        body = b""

    req = urllib.request.Request(url, data=body, method=method, headers=headers)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"n8n API {method} {path} failed ({e.code}): {err_body}")


# ---------------------------------------------------------------------------
# credentials.env management
# ---------------------------------------------------------------------------

def load_credentials() -> dict:
    """Load credentials from credentials.env file."""
    creds = {}
    if not os.path.exists(CREDENTIALS_FILE):
        log(f"Error: {CREDENTIALS_FILE} not found.")
        log(f"Copy credentials.env.example to credentials.env and fill in N8N_HOST + N8N_API_KEY_FILE.")
        sys.exit(1)

    with open(CREDENTIALS_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            creds[key.strip()] = value.strip()

    required = ["N8N_HOST", "N8N_API_KEY_FILE"]
    for key in required:
        if key not in creds or not creds[key] or creds[key] == "REPLACE_ME":
            log(f"Error: {key} must be set in credentials.env (not REPLACE_ME)")
            sys.exit(1)

    # Read API key from file
    key_file = os.path.expanduser(creds["N8N_API_KEY_FILE"])
    try:
        with open(key_file, "r") as f:
            creds["N8N_API_KEY"] = f.read().strip()
    except FileNotFoundError:
        log(f"Error: API key file not found: {key_file}")
        sys.exit(1)

    return creds


def update_credentials_env(key: str, value: str):
    """Update a key in credentials.env. Replaces existing or appends."""
    lines = []
    found = False

    if os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE, "r") as f:
            lines = f.readlines()

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("#") or "=" not in stripped:
            continue
        k = stripped.split("=", 1)[0].strip()
        if k == key:
            lines[i] = f"{key}={value}\n"
            found = True
            break

    if not found:
        lines.append(f"{key}={value}\n")

    with open(CREDENTIALS_FILE, "w") as f:
        f.writelines(lines)


def is_configured(creds: dict, key: str) -> bool:
    """Check if a credential env key is set to a real value."""
    val = creds.get(key, "")
    return val and val != "REPLACE_ME"


# ---------------------------------------------------------------------------
# Setup: auto-create credentials and workflows
# ---------------------------------------------------------------------------

def setup_credentials(creds: dict):
    """Create missing n8n credentials and save IDs to credentials.env."""
    created_any = False

    for spec in REQUIRED_CREDENTIALS:
        env_key = spec["env_key"]

        if is_configured(creds, env_key):
            log(f"  {spec['n8n_name']}: already configured ({creds[env_key]})")
            continue

        log(f"  {spec['n8n_name']}: creating...")
        try:
            result = n8n_api(creds, "POST", "/api/v1/credentials", {
                "name": spec["n8n_name"],
                "type": spec["n8n_type"],
                "data": {},
            })
        except RuntimeError as e:
            log(f"    Failed: {e}")
            continue

        cred_id = result["id"]
        update_credentials_env(env_key, cred_id)
        creds[env_key] = cred_id
        created_any = True
        log(f"    Created: {cred_id}")

    if created_any:
        log("\n  NOTE: Configure credential secrets in the n8n UI:")
        log(f"    {creds['N8N_HOST']}/home/credentials")


def setup_workflows(creds: dict):
    """Create missing n8n workflows and save IDs to credentials.env."""
    # Fetch existing workflows from n8n to avoid duplicates
    existing = {}
    try:
        result = n8n_api(creds, "GET", "/api/v1/workflows?limit=200")
        for wf in result.get("data", []):
            existing[wf["name"]] = wf["id"]
    except RuntimeError as e:
        log(f"  Warning: could not list workflows: {e}")

    for filename in sorted(os.listdir(WORKFLOWS_DIR)):
        if not filename.endswith(".json"):
            continue

        slug = filename.replace(".json", "")
        env_key = "WF_ID_" + slug.replace("-", "_").upper()

        if is_configured(creds, env_key):
            log(f"  {slug}: already configured ({creds[env_key]})")
            continue

        # Load template to get the workflow name
        template_path = os.path.join(WORKFLOWS_DIR, filename)
        with open(template_path, "r") as f:
            template = json.load(f)
        wf_name = template.get("name", slug)

        # Check if workflow already exists on n8n (by name)
        if wf_name in existing:
            wf_id = existing[wf_name]
            update_credentials_env(env_key, wf_id)
            creds[env_key] = wf_id
            log(f"  {slug}: found existing '{wf_name}' ({wf_id})")
            continue

        # Create new workflow
        log(f"  {slug}: creating '{wf_name}'...")
        try:
            result = n8n_api(creds, "POST", "/api/v1/workflows", {
                "name": wf_name,
                "nodes": template.get("nodes", []),
                "connections": template.get("connections", {}),
                "settings": template.get("settings", {}),
            })
        except RuntimeError as e:
            log(f"    Failed: {e}")
            continue

        wf_id = result["id"]
        update_credentials_env(env_key, wf_id)
        creds[env_key] = wf_id
        log(f"    Created: {wf_id}")


# ---------------------------------------------------------------------------
# Build and deploy
# ---------------------------------------------------------------------------

def discover_workflows(creds: dict) -> dict:
    """Discover available workflows and their IDs from credentials.env."""
    workflows = {}

    for filename in sorted(os.listdir(WORKFLOWS_DIR)):
        if not filename.endswith(".json"):
            continue
        slug = filename.replace(".json", "")
        env_key = "WF_ID_" + slug.replace("-", "_").upper()
        wf_id = creds.get(env_key)
        if wf_id == "REPLACE_ME":
            wf_id = None
        workflows[slug] = {
            "filename": filename,
            "path": os.path.join(WORKFLOWS_DIR, filename),
            "workflow_id": wf_id,
        }

    return workflows


def build_workflow(template_path: str) -> tuple:
    """Build a deployable workflow JSON from template + scripts."""
    with open(template_path, "r") as f:
        workflow = json.load(f)

    injected = 0
    for node in workflow.get("nodes", []):
        if node.get("type") != CODE_NODE_TYPE:
            continue

        node_id = node.get("id", "unknown")
        script_path = os.path.join(SCRIPTS_DIR, f"{node_id}.js")

        if not os.path.exists(script_path):
            log(f"  Warning: script not found for {node_id}, skipping")
            continue

        with open(script_path, "r") as f:
            content = f.read()

        # Strip header comments (lines starting with // at the top)
        lines = content.split("\n")
        while lines and lines[0].startswith("//"):
            lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)

        node["parameters"]["jsCode"] = "\n".join(lines)
        injected += 1

    return workflow, injected


def map_host(workflow: dict, creds: dict) -> dict:
    """Replace host and repo placeholders in node URLs."""
    host = creds["N8N_HOST"].rstrip("/")
    # Strip https:// prefix to get bare hostname (for URL templates)
    bare_host = host.replace("https://", "").replace("http://", "")

    raw = json.dumps(workflow)
    raw = raw.replace("<YOUR_N8N_HOST>", bare_host)

    # Replace standalone N8N_HOST in URLs (but not in env key references)
    # Targets: "https://N8N_HOST/..." patterns
    raw = raw.replace("https://N8N_HOST/", f"https://{bare_host}/")
    raw = raw.replace("'N8N_HOST'", f"'{bare_host}'")

    # Replace OWNER/REPO placeholder in GitHub API URLs
    report_repo = creds.get("GITHUB_REPORT_REPO", "")
    if report_repo and report_repo != "REPLACE_ME" and report_repo != "OWNER/REPO":
        raw = raw.replace("/repos/OWNER/REPO/", f"/repos/{report_repo}/")

    return json.loads(raw)


def map_env_vars(workflow: dict, creds: dict) -> dict:
    """Replace environment-specific placeholders with values from credentials.env.

    Fails hard if any required variable is missing or set to REPLACE_ME.
    """
    placeholders = {
        "GITHUB_PROJECT_ID_PLACEHOLDER": "GITHUB_PROJECT_ID",
        "GITHUB_PROJECT_STATUS_FIELD_ID_PLACEHOLDER": "GITHUB_PROJECT_STATUS_FIELD_ID",
        "GITHUB_PROJECT_IN_PROGRESS_OPTION_ID_PLACEHOLDER": "GITHUB_PROJECT_IN_PROGRESS_OPTION_ID",
    }

    raw = json.dumps(workflow)

    missing = []
    for placeholder, env_key in placeholders.items():
        if placeholder not in raw:
            continue
        value = creds.get(env_key, "")
        if not value or value == "REPLACE_ME":
            missing.append(env_key)
            continue
        raw = raw.replace(placeholder, value)

    if missing:
        log(f"  Error: missing required env vars in credentials.env: {', '.join(missing)}")
        sys.exit(1)

    return json.loads(raw)


def map_credentials(workflow: dict, creds: dict) -> tuple:
    """Replace REPLACE_ME credential IDs with actual values."""
    credential_map = {
        ("githubApi", None): creds.get("GITHUB_API_CREDENTIAL_ID"),
        ("httpHeaderAuth", "Anthropic API Key"): creds.get("ANTHROPIC_API_CREDENTIAL_ID"),
        ("httpHeaderAuth", "n8n Internal API"): creds.get("N8N_INTERNAL_API_CREDENTIAL_ID"),
    }

    replaced = 0
    for node in workflow.get("nodes", []):
        node_creds = node.get("credentials", {})
        for cred_type, cred_info in node_creds.items():
            if not isinstance(cred_info, dict) or cred_info.get("id") != "REPLACE_ME":
                continue

            cred_name = cred_info.get("name")
            new_id = credential_map.get((cred_type, cred_name))
            if new_id is None:
                new_id = credential_map.get((cred_type, None))

            if new_id and new_id != "REPLACE_ME":
                cred_info["id"] = new_id
                replaced += 1
            else:
                log(f"  Warning: no credential mapping for {cred_type}/{cred_name} in node {node.get('id')}")

    return workflow, replaced


def deploy_workflow(workflow: dict, workflow_id: str, creds: dict) -> bool:
    """Deploy workflow to n8n via REST API."""
    try:
        result = n8n_api(creds, "PUT", f"/api/v1/workflows/{workflow_id}", workflow)
        log(f"  Deployed: {result.get('name', 'unknown')} (id: {workflow_id})")
    except RuntimeError as e:
        log(f"  Deploy failed: {e}")
        return False

    try:
        n8n_api(creds, "POST", f"/api/v1/workflows/{workflow_id}/activate")
        log(f"  Activated")
    except RuntimeError:
        log(f"  Activation skipped (may already be active)")

    return True


def match_workflow(query: str, workflows: dict) -> list:
    """Match a query string against workflow slugs (partial match)."""
    if query in workflows:
        return [query]
    return [slug for slug in workflows if query in slug]


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]

    if "--list" in args:
        creds = load_credentials()
        workflows = discover_workflows(creds)
        print("Available workflows:")
        for slug, info in workflows.items():
            wf_id = info["workflow_id"] or "(not configured)"
            print(f"  {slug:30s} {wf_id}")
        return

    build_only = "--build-only" in args
    if build_only:
        args.remove("--build-only")

    setup_only = "--setup" in args
    if setup_only:
        args.remove("--setup")

    creds = load_credentials()

    # --- Setup phase (idempotent) ---
    if not build_only:
        log("=== Setup: credentials ===")
        setup_credentials(creds)
        log("\n=== Setup: workflows ===")
        setup_workflows(creds)

        if setup_only:
            log("\nSetup complete.")
            return

    # --- Deploy phase ---
    workflows = discover_workflows(creds)

    if args:
        targets = []
        for query in args:
            matches = match_workflow(query, workflows)
            if not matches:
                log(f"Error: no workflow matching '{query}'")
                log(f"Available: {', '.join(workflows.keys())}")
                sys.exit(1)
            targets.extend(matches)
    else:
        targets = list(workflows.keys())

    success = True
    for slug in targets:
        info = workflows[slug]
        log(f"\n{'Building' if build_only else 'Deploying'}: {slug}")

        workflow, injected = build_workflow(info["path"])
        log(f"  Injected {injected} scripts")

        if build_only:
            sys.stdout.write(json.dumps(workflow, indent=2, ensure_ascii=False))
            sys.stdout.write("\n")
            continue

        workflow = map_host(workflow, creds)
        workflow = map_env_vars(workflow, creds)
        workflow, replaced = map_credentials(workflow, creds)
        log(f"  Mapped {replaced} credentials")

        if not info["workflow_id"]:
            env_key = "WF_ID_" + slug.replace("-", "_").upper()
            log(f"  Skipping deploy: no workflow ID (set {env_key} in credentials.env)")
            success = False
            continue

        if not deploy_workflow(workflow, info["workflow_id"], creds):
            success = False

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()

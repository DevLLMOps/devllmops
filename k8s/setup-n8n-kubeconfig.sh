#!/usr/bin/env bash
#
# setup-n8n-kubeconfig.sh
#
# Creates the minimal K8s resources for n8n to launch Claude Code jobs:
#   1. Namespace:      devllmops-jobs
#   2. ServiceAccount: n8n-job-launcher
#   3. Role:           n8n-job-launcher (Jobs CRUD + Pods/logs read)
#   4. RoleBinding:    n8n-job-launcher
#   5. Long-lived token Secret for the ServiceAccount
#   6. Kubeconfig file scoped to this SA + namespace
#
# Usage:
#   ./setup-n8n-kubeconfig.sh [OUTPUT_FILE]
#
# OUTPUT_FILE defaults to ./n8n-kubeconfig.yaml
#
# Prerequisites:
#   - kubectl configured with cluster-admin access
#   - jq installed
#
set -euo pipefail

NAMESPACE="devllmops-jobs"
SERVICE_ACCOUNT="n8n-job-launcher"
ROLE_NAME="n8n-job-launcher"
SECRET_NAME="n8n-job-launcher-token"
OUTPUT_FILE="${1:-./n8n-kubeconfig.yaml}"

# ── Preflight checks ───────────────────────────────────────────────
for cmd in kubectl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: $cmd is required but not found in PATH." >&2
    exit 1
  fi
done

echo "==> Checking cluster access..."
if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: Cannot connect to Kubernetes cluster. Check your kubeconfig." >&2
  exit 1
fi

CLUSTER_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
echo "    Cluster: ${CLUSTER_NAME} (${CLUSTER_SERVER})"

# ── 1. Namespace ───────────────────────────────────────────────────
echo "==> Creating namespace '${NAMESPACE}'..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# ── 2. ServiceAccount ─────────────────────────────────────────────
echo "==> Creating ServiceAccount '${SERVICE_ACCOUNT}'..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${SERVICE_ACCOUNT}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/part-of: devllmops
    app.kubernetes.io/component: job-launcher
EOF

# ── 3. Role (namespace-scoped, minimal permissions) ────────────────
echo "==> Creating Role '${ROLE_NAME}'..."
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ${ROLE_NAME}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/part-of: devllmops
rules:
  # Jobs: create, read, delete (no update/patch — jobs are immutable)
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "get", "list", "watch", "delete"]
  # Pods: read-only (to find job pods and check status)
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  # Pod logs: read (to stream Claude Code output)
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
EOF

# ── 4. RoleBinding ─────────────────────────────────────────────────
echo "==> Creating RoleBinding '${ROLE_NAME}'..."
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ${ROLE_NAME}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/part-of: devllmops
subjects:
  - kind: ServiceAccount
    name: ${SERVICE_ACCOUNT}
    namespace: ${NAMESPACE}
roleRef:
  kind: Role
  name: ${ROLE_NAME}
  apiGroup: rbac.authorization.k8s.io
EOF

# ── 5. Long-lived token Secret ─────────────────────────────────────
# K8s 1.24+ no longer auto-creates SA tokens. We create an explicit
# Secret of type kubernetes.io/service-account-token that is bound
# to the ServiceAccount and does not expire.
echo "==> Creating token Secret '${SECRET_NAME}'..."
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: ${SECRET_NAME}
  namespace: ${NAMESPACE}
  labels:
    app.kubernetes.io/part-of: devllmops
  annotations:
    kubernetes.io/service-account.name: ${SERVICE_ACCOUNT}
type: kubernetes.io/service-account-token
EOF

# Wait for the token to be populated by the token controller
echo "    Waiting for token to be populated..."
for i in $(seq 1 30); do
  TOKEN=$(kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" \
    -o jsonpath='{.data.token}' 2>/dev/null || true)
  if [ -n "${TOKEN}" ]; then
    break
  fi
  sleep 1
done

if [ -z "${TOKEN}" ]; then
  echo "ERROR: Token was not populated after 30s." >&2
  exit 1
fi

SA_TOKEN=$(echo "${TOKEN}" | base64 -d)

# ── 6. Extract cluster CA certificate ──────────────────────────────
CA_DATA=$(kubectl get secret "${SECRET_NAME}" -n "${NAMESPACE}" \
  -o jsonpath='{.data.ca\.crt}')

# Fallback: get CA from kubeconfig if not in the secret
if [ -z "${CA_DATA}" ]; then
  CA_DATA=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
fi

if [ -z "${CA_DATA}" ]; then
  echo "ERROR: Could not extract cluster CA certificate." >&2
  exit 1
fi

# ── 7. Generate kubeconfig ─────────────────────────────────────────
echo "==> Generating kubeconfig at '${OUTPUT_FILE}'..."
cat > "${OUTPUT_FILE}" <<EOF
apiVersion: v1
kind: Config
preferences: {}

clusters:
  - name: devllmops-cluster
    cluster:
      server: ${CLUSTER_SERVER}
      certificate-authority-data: ${CA_DATA}

contexts:
  - name: devllmops-n8n
    context:
      cluster: devllmops-cluster
      namespace: ${NAMESPACE}
      user: ${SERVICE_ACCOUNT}

current-context: devllmops-n8n

users:
  - name: ${SERVICE_ACCOUNT}
    user:
      token: ${SA_TOKEN}
EOF

chmod 600 "${OUTPUT_FILE}"

# ── 8. Verify ──────────────────────────────────────────────────────
echo "==> Verifying generated kubeconfig..."
echo "    Testing: can create jobs?"
if kubectl --kubeconfig="${OUTPUT_FILE}" auth can-i create jobs -n "${NAMESPACE}" 2>/dev/null | grep -q "yes"; then
  echo "    ✓ create jobs"
else
  echo "    ✗ create jobs — RBAC may not have propagated yet" >&2
fi

echo "    Testing: can get pods/log?"
if kubectl --kubeconfig="${OUTPUT_FILE}" auth can-i get pods/log -n "${NAMESPACE}" 2>/dev/null | grep -q "yes"; then
  echo "    ✓ get pods/log"
else
  echo "    ✗ get pods/log" >&2
fi

echo "    Testing: CANNOT create secrets?"
if kubectl --kubeconfig="${OUTPUT_FILE}" auth can-i create secrets -n "${NAMESPACE}" 2>/dev/null | grep -q "no"; then
  echo "    ✓ cannot create secrets (good)"
else
  echo "    ✗ can create secrets — Role may be too permissive!" >&2
fi

echo "    Testing: CANNOT access other namespaces?"
if kubectl --kubeconfig="${OUTPUT_FILE}" auth can-i list pods -n default 2>/dev/null | grep -q "no"; then
  echo "    ✓ cannot access default namespace (good)"
else
  echo "    ✗ can access default namespace — check ClusterRole bindings" >&2
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " Done. Kubeconfig written to: ${OUTPUT_FILE}"
echo ""
echo " This kubeconfig grants '${SERVICE_ACCOUNT}' in namespace"
echo " '${NAMESPACE}' permission to:"
echo "   • Create, get, list, watch, delete Jobs"
echo "   • Get, list, watch Pods"
echo "   • Get Pod logs"
echo ""
echo " Next steps:"
echo "   1. Store this file as an n8n credential (HTTP Header Auth"
echo "      or custom kubeconfig depending on your n8n K8s setup)"
echo "   2. Create secrets in the namespace:"
echo "      kubectl create secret generic anthropic-api-key \\"
echo "        -n ${NAMESPACE} --from-literal=key=sk-ant-..."
echo "      kubectl create secret generic github-credentials \\"
echo "        -n ${NAMESPACE} --from-literal=token=ghp_..."
echo "   3. Build and push the Claude Code Docker image"
echo "   4. Update WF01 to use HTTP Request nodes against the K8s API"
echo ""
echo " WARNING: Keep this file safe — it contains a bearer token"
echo "          with write access to the ${NAMESPACE} namespace."
echo "═══════════════════════════════════════════════════════════"

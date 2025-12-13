# Harness GitOps Reference

Complete guide to GitOps implementation with Harness NextGen CD.

## GitOps Overview

GitOps uses Git repositories as the single source of truth for declarative infrastructure and applications. Harness GitOps is based on Argo CD.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Application** | Deployment unit that syncs manifests from Git to Kubernetes |
| **Repository** | Git repo containing Kubernetes manifests, Helm charts, or Kustomize |
| **Cluster** | Target Kubernetes cluster |
| **Agent** | GitOps agent running in Kubernetes cluster |
| **Sync** | Process of applying Git manifests to cluster |
| **Drift Detection** | Identifying differences between Git and live state |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Harness Platform                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          GitOps Application Configuration             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              GitOps Agent (Argo CD)                   │   │
│  │  - Monitors Git repositories                          │   │
│  │  - Syncs to Kubernetes                                │   │
│  │  - Detects drift                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Application Workloads                       │   │
│  │  - Deployments                                        │   │
│  │  - Services                                           │   │
│  │  - ConfigMaps                                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Sync
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Git Repository                          │
│  - Kubernetes manifests                                      │
│  - Helm charts                                               │
│  - Kustomize configurations                                  │
└─────────────────────────────────────────────────────────────┘
```

## GitOps Agent Installation

### Install via Helm

```bash
# Add Harness GitOps repository
helm repo add harness https://harness.github.io/gitops-helm
helm repo update

# Install GitOps agent
helm install gitops-agent harness/gitops-agent \
  --namespace harness-gitops \
  --create-namespace \
  --set agent.identifier="my-agent" \
  --set agent.accountId="YOUR_ACCOUNT_ID" \
  --set agent.token="YOUR_AGENT_TOKEN"
```

### Install via Manifest

```bash
# Download and apply manifest
kubectl create namespace harness-gitops
kubectl apply -n harness-gitops -f \
  https://app.harness.io/gitops/agent/manifest?accountId=xxx&agentId=yyy
```

### Agent Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gitops-agent-config
  namespace: harness-gitops
data:
  ACCOUNT_ID: "your-account-id"
  AGENT_IDENTIFIER: "my-agent"
  AGENT_TOKEN: "your-agent-token"
  AGENT_NAMESPACE: "harness-gitops"
```

## Cluster Configuration

### Register Cluster

```yaml
cluster:
  name: Production Cluster
  identifier: prod_cluster
  orgIdentifier: default
  projectIdentifier: default
  agentIdentifier: gitops_agent
  spec:
    config:
      type: KubernetesDirect
      spec:
        connectorRef: k8s_connector
```

### In-Cluster Configuration

For agents running in the same cluster as the workloads:

```yaml
cluster:
  name: In-Cluster
  identifier: in_cluster
  agentIdentifier: gitops_agent
  spec:
    config:
      type: KubernetesDirect
      spec:
        connectorRef: account.InCluster
```

### External Cluster Configuration

For agents managing external clusters:

```yaml
cluster:
  name: External Cluster
  identifier: external_cluster
  agentIdentifier: gitops_agent
  spec:
    config:
      type: KubernetesDirect
      spec:
        connectorRef: external_k8s_connector
        namespace: default
```

## Repository Configuration

### Git Repository

```yaml
repository:
  name: My Application Repo
  identifier: myapp_repo
  orgIdentifier: default
  projectIdentifier: default
  agentIdentifier: gitops_agent
  spec:
    type: Git
    connectionType: HTTPS_ANONYMOUS | HTTPS | SSH
    url: https://github.com/myorg/myapp
    # For HTTPS with credentials
    credentialsRef: github_creds
    # For SSH
    sshKeyRef: github_ssh_key
```

### Helm Repository

```yaml
repository:
  name: Helm Repository
  identifier: helm_repo
  agentIdentifier: gitops_agent
  spec:
    type: Helm
    url: https://charts.example.com
    credentialsRef: helm_creds
```

### OCI Repository

```yaml
repository:
  name: OCI Repository
  identifier: oci_repo
  agentIdentifier: gitops_agent
  spec:
    type: OCI
    url: oci://ghcr.io/myorg/charts
    credentialsRef: ghcr_creds
```

## Application Configuration

### Basic Application

```yaml
application:
  name: My Application
  identifier: myapp
  orgIdentifier: default
  projectIdentifier: default
  agentIdentifier: gitops_agent
  clusterRef: prod_cluster
  repoRef: myapp_repo
  spec:
    source:
      type: Git
      spec:
        path: kubernetes/
        targetRevision: main
        repoURL: https://github.com/myorg/myapp
    destination:
      namespace: production
      server: https://kubernetes.default.svc
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
      syncOptions:
        - CreateNamespace=true
        - PrunePropagationPolicy=foreground
        - PruneLast=true
```

### Helm Application

```yaml
application:
  name: Helm App
  identifier: helm_app
  agentIdentifier: gitops_agent
  clusterRef: prod_cluster
  spec:
    source:
      type: Helm
      spec:
        repoURL: https://charts.example.com
        chart: myapp
        targetRevision: 1.0.0
        helm:
          releaseName: myapp-release
          valueFiles:
            - values.yaml
            - values-prod.yaml
          parameters:
            - name: image.tag
              value: v1.0.0
            - name: replicaCount
              value: "3"
          values: |
            # Override values
            image:
              repository: myorg/myapp
              tag: v1.0.0
            service:
              type: LoadBalancer
    destination:
      namespace: production
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
```

### Kustomize Application

```yaml
application:
  name: Kustomize App
  identifier: kustomize_app
  agentIdentifier: gitops_agent
  clusterRef: prod_cluster
  spec:
    source:
      type: Git
      spec:
        repoURL: https://github.com/myorg/myapp
        path: overlays/production
        targetRevision: main
        kustomize:
          images:
            - myorg/myapp:v1.0.0
          namePrefix: prod-
          nameSuffix: -v1
          commonLabels:
            env: production
          commonAnnotations:
            managed-by: harness-gitops
    destination:
      namespace: production
    syncPolicy:
      automated:
        prune: true
        selfHeal: true
```

### Multi-Source Application

```yaml
application:
  name: Multi-Source App
  identifier: multi_source_app
  agentIdentifier: gitops_agent
  clusterRef: prod_cluster
  spec:
    sources:
      - type: Helm
        spec:
          repoURL: https://charts.example.com
          chart: myapp
          targetRevision: 1.0.0
          helm:
            valueFiles:
              - $values/helm/values.yaml
      - type: Git
        spec:
          repoURL: https://github.com/myorg/config
          targetRevision: main
          ref: values
    destination:
      namespace: production
```

## Sync Policies

### Automated Sync

```yaml
syncPolicy:
  automated:
    prune: true          # Delete resources not in Git
    selfHeal: true       # Override manual changes
    allowEmpty: false    # Prevent empty sync
  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

### Manual Sync

```yaml
syncPolicy:
  automated: null  # Disable automated sync
  syncOptions:
    - CreateNamespace=true
```

### Sync Options

| Option | Description |
|--------|-------------|
| `CreateNamespace=true` | Auto-create namespace if missing |
| `PrunePropagationPolicy=foreground` | Wait for deletion to complete |
| `PruneLast=true` | Prune resources after sync |
| `ApplyOutOfSyncOnly=true` | Only sync out-of-sync resources |
| `RespectIgnoreDifferences=true` | Honor ignore differences |
| `ServerSideApply=true` | Use server-side apply |

## Sync Waves

Control sync order with annotations:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "-5"  # Sync first

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: config
  annotations:
    argocd.argoproj.io/sync-wave: "0"   # Sync second

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "5"   # Sync last
```

## Resource Hooks

Execute actions at specific sync phases:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    argocd.argoproj.io/hook: PreSync          # Run before sync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded  # Delete after success
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: myapp-migrate:v1.0.0
        command: ["./migrate.sh"]
      restartPolicy: Never
```

### Hook Types

| Hook | When |
|------|------|
| `PreSync` | Before sync operation |
| `Sync` | During sync (rare) |
| `PostSync` | After sync completes |
| `SyncFail` | If sync fails |
| `Skip` | Skip resource in sync |

### Hook Delete Policies

| Policy | Description |
|--------|-------------|
| `HookSucceeded` | Delete if hook succeeds |
| `HookFailed` | Delete if hook fails |
| `BeforeHookCreation` | Delete before creating new |

## Health Checks

### Custom Health Checks

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: harness-gitops
data:
  resource.customizations: |
    apps/Deployment:
      health.lua: |
        hs = {}
        if obj.status ~= nil then
          if obj.status.replicas ~= nil and obj.status.readyReplicas == obj.status.replicas then
            hs.status = "Healthy"
            hs.message = "All replicas ready"
            return hs
          end
        end
        hs.status = "Progressing"
        hs.message = "Waiting for replicas"
        return hs
```

## Ignore Differences

Ignore specific fields during drift detection:

```yaml
application:
  spec:
    ignoreDifferences:
      - group: apps
        kind: Deployment
        jsonPointers:
          - /spec/replicas
      - group: ""
        kind: Secret
        jqPathExpressions:
          - .data
```

## PR-Based GitOps Workflow

### PR Pipeline

```yaml
pipeline:
  name: GitOps PR Workflow
  identifier: gitops_pr
  stages:
    - stage:
        name: Preview Environment
        identifier: preview
        type: Custom
        spec:
          execution:
            steps:
              # Create preview namespace
              - step:
                  type: ShellScript
                  spec:
                    shell: Bash
                    source:
                      type: Inline
                      spec:
                        script: |
                          NAMESPACE="pr-<+trigger.payload.pull_request.number>"
                          kubectl create namespace $NAMESPACE || true

              # Update GitOps application
              - step:
                  type: ShellScript
                  spec:
                    script: |
                      cat <<EOF | kubectl apply -f -
                      apiVersion: argoproj.io/v1alpha1
                      kind: Application
                      metadata:
                        name: myapp-pr-<+trigger.payload.pull_request.number>
                        namespace: harness-gitops
                      spec:
                        project: default
                        source:
                          repoURL: <+trigger.payload.pull_request.head.repo.clone_url>
                          targetRevision: <+trigger.payload.pull_request.head.ref>
                          path: kubernetes/
                        destination:
                          server: https://kubernetes.default.svc
                          namespace: pr-<+trigger.payload.pull_request.number>
                        syncPolicy:
                          automated:
                            prune: true
                            selfHeal: true
                      EOF

              # Comment on PR with preview URL
              - step:
                  type: Http
                  spec:
                    url: <+trigger.payload.pull_request.comments_url>
                    method: POST
                    headers:
                      - key: Authorization
                        value: token <+secrets.getValue("github_token")>
                    requestBody: |
                      {
                        "body": "Preview environment deployed: https://pr-<+trigger.payload.pull_request.number>.example.com"
                      }
```

## Progressive Delivery with Argo Rollouts

### Canary Rollout

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 1m}
        - setWeight: 20
        - pause: {duration: 1m}
        - setWeight: 50
        - pause: {duration: 2m}
        - setWeight: 80
        - pause: {duration: 2m}
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:v2.0.0
```

### Blue-Green Rollout

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    blueGreen:
      activeService: myapp-active
      previewService: myapp-preview
      autoPromotionEnabled: false
      scaleDownDelaySeconds: 300
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:v2.0.0
```

## Application Sets

Manage multiple applications with templates:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-env-apps
  namespace: harness-gitops
spec:
  generators:
    - list:
        elements:
          - env: dev
            namespace: development
          - env: staging
            namespace: staging
          - env: prod
            namespace: production
  template:
    metadata:
      name: 'myapp-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp
        targetRevision: main
        path: 'overlays/{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Monitoring and Observability

### Application Status

```bash
# Check application status
harness gitops app get myapp

# Watch sync progress
harness gitops app sync myapp --watch

# View application history
harness gitops app history myapp

# Get application manifests
harness gitops app manifests myapp
```

### Sync Metrics

Monitor these metrics:
- Sync duration
- Sync success/failure rate
- Drift detection frequency
- Resource count
- Application health

## Disaster Recovery

### Backup Application Manifests

```bash
# Export all applications
harness gitops app list -o yaml > apps-backup.yaml

# Export specific application
harness gitops app get myapp -o yaml > myapp-backup.yaml
```

### Restore Application

```bash
# Restore application
kubectl apply -f myapp-backup.yaml
```

## Best Practices

1. **Use Git as single source of truth** - All changes via Git
2. **Enable automated sync** - With self-heal for production
3. **Implement sync waves** - Control deployment order
4. **Use hooks for migrations** - Run before/after sync
5. **Tag resources properly** - For better organization
6. **Monitor drift** - Set up alerts for manual changes
7. **Use Application Sets** - For multi-environment deployments
8. **Implement RBAC** - Control who can sync applications
9. **Version control everything** - Applications, repos, clusters
10. **Test in lower environments** - Before promoting to production
11. **Use preview environments** - For PR-based workflows
12. **Implement progressive delivery** - With Argo Rollouts
13. **Monitor sync metrics** - Track deployment health
14. **Document ignore differences** - Explain why fields are ignored
15. **Regular backups** - Export application configs

## Troubleshooting

### Application Out of Sync

**Check:**
1. View diff in Harness UI
2. Check for manual changes in cluster
3. Verify Git repository is accessible
4. Review sync policies

**Solution:**
```bash
# Force sync
harness gitops app sync myapp --force

# Sync specific resource
harness gitops app sync myapp --resource Deployment:myapp
```

### Sync Failed

**Check:**
1. Review sync logs
2. Check resource health
3. Verify RBAC permissions
4. Review hook execution

**Solution:**
```bash
# View sync logs
harness gitops app logs myapp

# Retry failed sync
harness gitops app sync myapp --retry
```

### Drift Detected

**Solution:**
```bash
# View differences
harness gitops app diff myapp

# Override manual changes
harness gitops app sync myapp --prune --force
```

### Agent Not Connecting

**Check:**
1. Verify agent token
2. Check network connectivity
3. Review agent logs
4. Verify namespace permissions

**Solution:**
```bash
# Check agent logs
kubectl logs -n harness-gitops -l app=gitops-agent

# Restart agent
kubectl rollout restart deployment/gitops-agent -n harness-gitops
```

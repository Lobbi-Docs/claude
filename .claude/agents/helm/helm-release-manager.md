# Helm Release Manager Agent

## Agent Metadata
```yaml
name: helm-release-manager
type: coordinator
model: sonnet
category: helm
priority: high
keywords:
  - helm
  - release
  - upgrade
  - rollback
  - deploy
  - history
capabilities:
  - release_management
  - deployment_coordination
  - rollback_handling
  - release_history
  - multi_cluster
```

## Description

The Helm Release Manager Agent specializes in managing Helm releases across environments, handling upgrades, rollbacks, and release lifecycle management. This agent ensures safe deployments with proper validation, monitoring, and recovery procedures.

## Core Responsibilities

1. **Release Management**
   - Install new releases
   - Upgrade existing releases
   - Handle atomic deployments
   - Manage release metadata

2. **Rollback Operations**
   - Detect deployment failures
   - Execute rollbacks
   - Maintain release history
   - Post-rollback validation

3. **Multi-Environment Coordination**
   - Promote releases across environments
   - Coordinate blue-green deployments
   - Handle canary releases
   - Manage feature flags

4. **Release Validation**
   - Pre-deployment checks
   - Post-deployment verification
   - Health monitoring
   - Smoke testing

## Release Lifecycle Commands

### Installation
```bash
# Install new release
helm install alpha-members ./deployment/helm/alpha-members \
  -n production \
  -f values.yaml \
  -f values-prod.yaml \
  --create-namespace \
  --wait \
  --timeout 10m

# Install with atomic (auto-rollback on failure)
helm install alpha-members ./deployment/helm/alpha-members \
  -n production \
  --atomic \
  --timeout 10m
```

### Upgrade
```bash
# Standard upgrade
helm upgrade alpha-members ./deployment/helm/alpha-members \
  -n production \
  -f values.yaml \
  -f values-prod.yaml \
  --set image.tag=v1.2.0

# Atomic upgrade (rollback on failure)
helm upgrade alpha-members ./deployment/helm/alpha-members \
  -n production \
  --atomic \
  --timeout 10m \
  --set image.tag=v1.2.0

# Install or upgrade
helm upgrade --install alpha-members ./deployment/helm/alpha-members \
  -n production \
  --wait
```

### Rollback
```bash
# View release history
helm history alpha-members -n production

# Rollback to previous revision
helm rollback alpha-members -n production

# Rollback to specific revision
helm rollback alpha-members 3 -n production --wait

# Rollback with timeout
helm rollback alpha-members 5 -n production --timeout 5m
```

### Status & History
```bash
# Get release status
helm status alpha-members -n production

# Get release history
helm history alpha-members -n production --max 10

# Get release values
helm get values alpha-members -n production

# Get all release info
helm get all alpha-members -n production

# Get release manifest
helm get manifest alpha-members -n production
```

## Deployment Strategies

### Standard Deployment
```yaml
# Deployment with rolling update
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
```

### Blue-Green Deployment
```bash
# Deploy green version
helm install alpha-members-green ./chart \
  -n production \
  --set service.name=alpha-members-green \
  --set image.tag=v2.0.0

# Test green version
kubectl port-forward svc/alpha-members-green 8080:80 -n production
# Run tests against localhost:8080

# Switch traffic (update ingress)
kubectl patch ingress alpha-members -n production \
  --type=json \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "alpha-members-green"}]'

# Remove blue version after validation
helm uninstall alpha-members-blue -n production
```

### Canary Deployment
```yaml
# Using Flagger or manual canary
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: alpha-members
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alpha-members
  progressDeadlineSeconds: 60
  service:
    port: 80
    targetPort: 3000
  analysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

## Pre-Deployment Checklist

```yaml
Pre-Deploy Validation:
  Chart:
    - [ ] helm lint passes
    - [ ] helm template renders correctly
    - [ ] values schema validation passes

  Environment:
    - [ ] Target namespace exists
    - [ ] Secrets are configured
    - [ ] Resource quotas allow deployment
    - [ ] Network policies configured

  Dependencies:
    - [ ] Database accessible
    - [ ] Redis available
    - [ ] Keycloak reachable
    - [ ] External services healthy

  Change Management:
    - [ ] Change ticket approved
    - [ ] Rollback plan documented
    - [ ] Stakeholders notified
    - [ ] Maintenance window (if needed)
```

## Post-Deployment Validation

```bash
#!/bin/bash
# post-deploy-validation.sh

RELEASE="alpha-members"
NAMESPACE="production"
TIMEOUT=300

echo "=== Post-Deployment Validation ==="

# 1. Check release status
echo "Checking release status..."
helm status $RELEASE -n $NAMESPACE

# 2. Wait for pods to be ready
echo "Waiting for pods..."
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/instance=$RELEASE \
  -n $NAMESPACE \
  --timeout=${TIMEOUT}s

# 3. Check pod health
echo "Checking pod health..."
kubectl get pods -l app.kubernetes.io/instance=$RELEASE -n $NAMESPACE

# 4. Run helm tests
echo "Running helm tests..."
helm test $RELEASE -n $NAMESPACE --timeout 5m

# 5. Check endpoints
echo "Checking service endpoints..."
kubectl get endpoints -l app.kubernetes.io/instance=$RELEASE -n $NAMESPACE

# 6. Health check
echo "Running health check..."
POD=$(kubectl get pod -l app.kubernetes.io/instance=$RELEASE -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
kubectl exec $POD -n $NAMESPACE -- wget -qO- http://localhost:3000/health

# 7. Smoke test (if available)
echo "Running smoke tests..."
# curl -f https://members.example.com/health || exit 1

echo "=== Validation Complete ==="
```

## Rollback Procedures

### Automatic Rollback (Atomic)
```bash
# Helm handles rollback automatically on failure
helm upgrade alpha-members ./chart \
  -n production \
  --atomic \
  --timeout 10m
```

### Manual Rollback Process
```bash
#!/bin/bash
# rollback.sh

RELEASE="alpha-members"
NAMESPACE="production"
REVISION=${1:-""}

echo "=== Starting Rollback ==="

# 1. Get current state
echo "Current release status:"
helm status $RELEASE -n $NAMESPACE

# 2. Get history
echo "Release history:"
helm history $RELEASE -n $NAMESPACE

# 3. Determine target revision
if [ -z "$REVISION" ]; then
  # Get previous revision
  REVISION=$(helm history $RELEASE -n $NAMESPACE -o json | jq -r '.[-2].revision')
fi

echo "Rolling back to revision: $REVISION"

# 4. Execute rollback
helm rollback $RELEASE $REVISION -n $NAMESPACE --wait --timeout 5m

# 5. Verify rollback
echo "Verifying rollback..."
helm status $RELEASE -n $NAMESPACE

# 6. Check pods
kubectl get pods -l app.kubernetes.io/instance=$RELEASE -n $NAMESPACE

echo "=== Rollback Complete ==="
```

### Rollback Decision Matrix
```yaml
Automatic Rollback Triggers:
  - Pod crash loops (> 3 restarts)
  - Readiness probe failures (> 30s)
  - OOMKilled containers
  - Image pull failures

Manual Rollback Triggers:
  - Error rate spike (> 5%)
  - Latency increase (> 2x baseline)
  - Customer-reported issues
  - Security vulnerability discovered

No Rollback Needed:
  - Cosmetic issues
  - Non-critical feature bugs
  - Performance within acceptable range
```

## Release Promotion Pipeline

```yaml
# GitLab CI example
stages:
  - build
  - deploy-dev
  - deploy-staging
  - deploy-prod

deploy-dev:
  stage: deploy-dev
  script:
    - helm upgrade --install alpha-members ./chart
      -n development
      -f values.yaml -f values-dev.yaml
      --set image.tag=$CI_COMMIT_SHA
      --atomic --timeout 5m
  environment:
    name: development

deploy-staging:
  stage: deploy-staging
  script:
    - helm upgrade --install alpha-members ./chart
      -n staging
      -f values.yaml -f values-staging.yaml
      --set image.tag=$CI_COMMIT_SHA
      --atomic --timeout 10m
  environment:
    name: staging
  when: manual
  needs: [deploy-dev]

deploy-prod:
  stage: deploy-prod
  script:
    - helm upgrade --install alpha-members ./chart
      -n production
      -f values.yaml -f values-prod.yaml
      --set image.tag=$CI_COMMIT_TAG
      --atomic --timeout 15m
  environment:
    name: production
  when: manual
  only:
    - tags
  needs: [deploy-staging]
```

## Multi-Cluster Management

```bash
# Deploy to multiple clusters
CLUSTERS=("cluster-east" "cluster-west" "cluster-eu")

for CLUSTER in "${CLUSTERS[@]}"; do
  echo "Deploying to $CLUSTER..."
  kubectl config use-context $CLUSTER

  helm upgrade --install alpha-members ./chart \
    -n production \
    -f values.yaml \
    -f values-prod.yaml \
    -f values-$CLUSTER.yaml \
    --atomic --timeout 10m
done
```

## Monitoring Integration

```yaml
# Prometheus alerts for release health
groups:
  - name: helm-release-alerts
    rules:
      - alert: HelmReleaseDeploymentFailed
        expr: |
          kube_deployment_status_replicas_unavailable{
            namespace="production",
            deployment=~"alpha-members.*"
          } > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Helm release deployment failed"

      - alert: HelmReleasePodCrashLooping
        expr: |
          rate(kube_pod_container_status_restarts_total{
            namespace="production",
            pod=~"alpha-members.*"
          }[15m]) > 0
        for: 5m
        labels:
          severity: warning
```

## Best Practices

1. **Always use --atomic** for production deployments
2. **Set appropriate timeouts** based on app startup time
3. **Maintain release history** for quick rollbacks
4. **Test in lower environments** before production
5. **Use semantic versioning** for releases
6. **Document rollback procedures** for each service
7. **Monitor deployment metrics** (success rate, duration)

## Project Context

Release name: `alpha-members`
Environments: development, staging, production
Deployment tool: Helm 3.x with ArgoCD

## Collaboration Points

- Works with **helm-chart-developer** for chart changes
- Coordinates with **helm-values-manager** for configs
- Supports **sre-engineer** for incident response
- Integrates with **cicd-engineer** for pipeline automation

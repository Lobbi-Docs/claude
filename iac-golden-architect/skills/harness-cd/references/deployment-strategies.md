# Harness Deployment Strategies Reference

Complete guide to all deployment strategies in Harness NextGen CD.

## Rolling Deployment

Gradually replaces instances of the previous version with the new version. This is the default and safest strategy.

### Use Cases

- Standard deployments with minimal risk
- Stateless applications
- When you can tolerate brief mixed-version states
- Gradual rollout with health checks

### Configuration

```yaml
execution:
  steps:
    - step:
        name: Rolling Deployment
        identifier: rollingDeployment
        type: K8sRollingDeploy
        timeout: 10m
        spec:
          skipDryRun: false
          pruningEnabled: false
  rollbackSteps:
    - step:
        name: Rolling Rollback
        identifier: rollingRollback
        type: K8sRollingRollback
        timeout: 10m
        spec: {}
```

### Kubernetes Manifest Requirements

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max pods above desired count
      maxUnavailable: 1  # Max pods unavailable during update
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:<+artifact.tag>
        readinessProbe:  # Critical for rolling deployments
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Advantages

- Simple and predictable
- No additional infrastructure needed
- Built-in Kubernetes support
- Automatic rollback on failures

### Disadvantages

- Brief period with mixed versions
- Slower than recreate strategy
- May cause issues with breaking changes

---

## Blue-Green Deployment

Creates a new environment (green) alongside the existing one (blue), then switches traffic atomically.

### Use Cases

- Zero-downtime deployments
- When you need instant rollback capability
- Testing in production environment before cutover
- Database schema changes requiring version compatibility

### Configuration

```yaml
execution:
  steps:
    - step:
        name: Stage Deployment
        identifier: stageDeployment
        type: K8sBlueGreenDeploy
        timeout: 10m
        spec:
          skipDryRun: false

    # Optional: Verification/Testing
    - step:
        name: Verify Green Environment
        identifier: verifyGreen
        type: ShellScript
        spec:
          shell: Bash
          source:
            type: Inline
            spec:
              script: |
                # Run smoke tests against green environment
                curl -f http://<+service.name>-stage/health

    - step:
        name: Manual Approval
        identifier: approval
        type: HarnessApproval
        timeout: 1h
        spec:
          approvalMessage: Approve traffic switch to green?
          approvers:
            minimumCount: 1
            userGroups:
              - account.DevOps

    - step:
        name: Swap Primary with Stage
        identifier: bgSwapServices
        type: K8sBlueGreenSwap
        timeout: 10m
        spec:
          skipDryRun: false

  rollbackSteps:
    - step:
        name: Swap Rollback
        identifier: rollbackBgSwap
        type: K8sBlueGreenSwapRollback
        timeout: 10m
        spec: {}
```

### Kubernetes Service Configuration

```yaml
# Primary Service (receives production traffic)
apiVersion: v1
kind: Service
metadata:
  name: myapp-primary
spec:
  selector:
    app: myapp
    harness.io/color: blue  # Initially points to blue
  ports:
  - port: 80
    targetPort: 8080

---
# Stage Service (for testing green)
apiVersion: v1
kind: Service
metadata:
  name: myapp-stage
spec:
  selector:
    app: myapp
    harness.io/color: green
  ports:
  - port: 80
    targetPort: 8080
```

### Traffic Flow

1. **Initial State**: Primary service → Blue deployment
2. **Deploy Green**: Stage service → Green deployment
3. **Test**: Verify green via stage service
4. **Swap**: Primary service → Green deployment
5. **Rollback**: Primary service → Blue deployment (instant)

### Advantages

- Instant rollback capability
- Zero-downtime deployments
- Can test in production environment
- Complete isolation between versions

### Disadvantages

- Requires 2x infrastructure during deployment
- More complex setup
- Database compatibility considerations
- Not suitable for stateful applications

---

## Canary Deployment

Gradually rolls out changes to a small subset of users before rolling out to entire infrastructure.

### Use Cases

- High-risk deployments
- Testing performance impact
- Gradual feature rollout
- A/B testing scenarios

### Configuration

```yaml
execution:
  steps:
    # Deploy canary instances
    - step:
        name: Canary Deployment
        identifier: canaryDeployment
        type: K8sCanaryDeploy
        timeout: 10m
        spec:
          instanceSelection:
            type: Count
            spec:
              count: 1  # Deploy to 1 pod
          skipDryRun: false

    # Verify canary
    - step:
        name: Verify Canary
        identifier: verifyCanary
        type: Verify
        timeout: 10m
        spec:
          type: Prometheus
          spec:
            connectorRef: prometheus_connector
            query: |
              sum(rate(http_requests_total{app="myapp",version="<+artifact.tag>"}[5m]))
            threshold: 100

    # Canary analysis
    - step:
        name: Canary Metrics Analysis
        identifier: canaryAnalysis
        type: ShellScript
        spec:
          shell: Bash
          source:
            type: Inline
            spec:
              script: |
                # Check error rate
                ERROR_RATE=$(curl -s prometheus:9090/api/v1/query \
                  --data-urlencode 'query=rate(http_errors_total{version="<+artifact.tag>"}[5m])' \
                  | jq -r '.data.result[0].value[1]')

                if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
                  echo "Error rate too high: $ERROR_RATE"
                  exit 1
                fi

    # Approval to proceed
    - step:
        name: Approve Full Rollout
        identifier: approveRollout
        type: HarnessApproval
        timeout: 1h
        spec:
          approvalMessage: Canary metrics look good. Proceed with full rollout?
          approvers:
            minimumCount: 1
            userGroups:
              - account.DevOps

    # Delete canary
    - step:
        name: Canary Delete
        identifier: canaryDelete
        type: K8sCanaryDelete
        timeout: 10m
        spec: {}

    # Full rollout
    - step:
        name: Rolling Deployment
        identifier: rollingDeployment
        type: K8sRollingDeploy
        timeout: 10m
        spec:
          skipDryRun: false

  rollbackSteps:
    - step:
        name: Canary Delete
        identifier: rollbackCanaryDelete
        type: K8sCanaryDelete
        timeout: 10m
        spec: {}
    - step:
        name: Rolling Rollback
        identifier: rollingRollback
        type: K8sRollingRollback
        timeout: 10m
        spec: {}
```

### Percentage-Based Canary

```yaml
- step:
    name: Canary 25%
    type: K8sCanaryDeploy
    spec:
      instanceSelection:
        type: Percentage
        spec:
          percentage: 25
```

### Multi-Phase Canary

```yaml
execution:
  steps:
    # Phase 1: 10%
    - step:
        name: Canary 10%
        type: K8sCanaryDeploy
        spec:
          instanceSelection:
            type: Percentage
            spec:
              percentage: 10
    - step:
        name: Wait
        type: Wait
        timeout: 10m
    - step:
        name: Canary Delete
        type: K8sCanaryDelete

    # Phase 2: 25%
    - step:
        name: Canary 25%
        type: K8sCanaryDeploy
        spec:
          instanceSelection:
            type: Percentage
            spec:
              percentage: 25
    - step:
        name: Wait
        type: Wait
        timeout: 10m
    - step:
        name: Canary Delete
        type: K8sCanaryDelete

    # Phase 3: 50%
    - step:
        name: Canary 50%
        type: K8sCanaryDeploy
        spec:
          instanceSelection:
            type: Percentage
            spec:
              percentage: 50
    - step:
        name: Wait
        type: Wait
        timeout: 10m
    - step:
        name: Canary Delete
        type: K8sCanaryDelete

    # Full rollout
    - step:
        name: Rolling Deployment
        type: K8sRollingDeploy
```

### Advantages

- Minimize blast radius of failures
- Real production testing with minimal risk
- Can abort deployment early
- Gather metrics before full rollout

### Disadvantages

- Complex setup and monitoring
- Longer deployment time
- Requires sophisticated metrics/monitoring
- May affect user experience if routing is visible

---

## Native Helm Deployment

Uses Helm's native capabilities for deployment.

### Configuration

```yaml
service:
  serviceDefinition:
    type: NativeHelm
    spec:
      manifests:
        - manifest:
            identifier: helm_chart
            type: HelmChart
            spec:
              store:
                type: Http
                spec:
                  connectorRef: helm_repo
              chartName: myapp
              chartVersion: <+input>
              helmVersion: V3

execution:
  steps:
    - step:
        name: Helm Deploy
        identifier: helmDeploy
        type: HelmDeploy
        timeout: 10m
        spec:
          skipDryRun: false

  rollbackSteps:
    - step:
        name: Helm Rollback
        identifier: helmRollback
        type: HelmRollback
        timeout: 10m
```

---

## Recreate Deployment

Terminates all old pods before creating new ones.

### Use Cases

- Stateful applications that cannot run multiple versions
- Resource-constrained environments
- Development/testing environments

### Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: Recreate  # All pods stopped before new ones created
```

### Advantages

- Simple and straightforward
- No version compatibility issues
- Lower resource usage

### Disadvantages

- Downtime during deployment
- Not suitable for production
- No gradual rollout

---

## Custom Deployment

For non-standard deployment patterns or custom orchestration.

### Configuration

```yaml
stage:
  type: Custom
  spec:
    execution:
      steps:
        - step:
            name: Custom Deploy Step 1
            type: ShellScript
            spec:
              shell: Bash
              source:
                type: Inline
                spec:
                  script: |
                    # Custom deployment logic
                    ./deploy.sh <+artifact.tag>

        - step:
            name: Custom Deploy Step 2
            type: Http
            spec:
              url: https://api.example.com/deploy
              method: POST
              requestBody: |
                {
                  "version": "<+artifact.tag>",
                  "environment": "<+env.name>"
                }
```

---

## Comparison Matrix

| Strategy | Downtime | Rollback Speed | Resource Usage | Complexity | Risk |
|----------|----------|----------------|----------------|------------|------|
| Rolling | Minimal | Medium | 1x + surge | Low | Low |
| Blue-Green | None | Instant | 2x | Medium | Low |
| Canary | None | Fast | 1x + canary | High | Very Low |
| Native Helm | Minimal | Fast | 1x + surge | Medium | Low |
| Recreate | Yes | Slow | 1x | Very Low | High |

## Best Practices

### Rolling Deployments

1. Always configure readiness probes
2. Set appropriate `maxSurge` and `maxUnavailable`
3. Monitor deployment progress
4. Have rollback plan ready

### Blue-Green Deployments

1. Ensure database compatibility between versions
2. Test green environment thoroughly before swap
3. Keep blue environment for quick rollback
4. Automate swap only after verification

### Canary Deployments

1. Define clear success metrics
2. Start with small percentage (1-5%)
3. Gradually increase canary percentage
4. Automate metric collection and analysis
5. Set automatic rollback triggers

### General Guidelines

1. **Always test in lower environments first**
2. **Implement health checks and readiness probes**
3. **Monitor application metrics during deployment**
4. **Use approval gates for production**
5. **Document rollback procedures**
6. **Test rollback process regularly**
7. **Use feature flags for additional control**
8. **Implement circuit breakers**
9. **Set appropriate timeouts**
10. **Log all deployment activities**

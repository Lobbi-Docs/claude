# Deployment Strategist Agent

## Agent Metadata
```yaml
name: deployment-strategist
type: architect
model: sonnet
category: container-workflow
priority: high
keywords:
  - deployment
  - strategy
  - blue-green
  - canary
  - rolling
  - release
  - production
capabilities:
  - deployment_planning
  - strategy_selection
  - rollback_design
  - traffic_management
  - risk_mitigation
```

## Description

The Deployment Strategist Agent specializes in planning and recommending deployment strategies for containerized applications. This agent analyzes application requirements, risk tolerance, and infrastructure capabilities to suggest optimal deployment patterns including blue-green, canary, rolling updates, and recreate strategies.

## When to Use

Use this agent when:
- Planning a production deployment strategy
- Designing zero-downtime deployments
- Implementing progressive delivery patterns
- Creating rollback procedures
- Evaluating deployment risks
- Migrating deployment strategies

<example>
Context: Team planning production release for critical service
User: "deployment planning needed for our payment service"
Assistant: "I'll design a deployment strategy for your payment service. Given the critical nature, I recommend:

**Strategy: Blue-Green Deployment**
- Deploy new version (green) alongside current (blue)
- Run smoke tests on green environment
- Switch traffic via load balancer
- Keep blue environment for 24h rollback window

Let me create the deployment plan with:
1. Infrastructure requirements
2. Traffic switching procedure
3. Validation checkpoints
4. Rollback procedure
5. Monitoring alerts

Creating deployment strategy..."
</example>

<example>
Context: New feature needs gradual rollout
User: "production release for new recommendation algorithm"
Assistant: "For a new algorithm, I recommend a Canary Deployment strategy:

**Canary Release Plan:**
- Week 1: 5% traffic to new version
- Week 2: 25% if metrics are healthy
- Week 3: 50% with A/B testing
- Week 4: 100% rollout

I'll set up:
1. Traffic splitting configuration
2. Metrics collection and comparison
3. Automated rollback triggers
4. Progressive rollout schedule

Creating canary deployment plan..."
</example>

<example>
Context: High-traffic application needs update
User: "We need to update our API without downtime"
Assistant: "For zero-downtime API updates, I recommend a Rolling Update strategy:

**Rolling Update Plan:**
- Update 1 pod at a time
- Wait for health checks (30s)
- Max unavailable: 0
- Max surge: 1

This ensures:
- Always have healthy pods serving traffic
- Gradual transition minimizes risk
- Quick rollback if issues detected

Creating rolling update configuration..."
</example>

## Core Responsibilities

1. **Strategy Selection**
   - Analyze application characteristics
   - Assess risk tolerance
   - Evaluate infrastructure capabilities
   - Recommend deployment pattern

2. **Deployment Planning**
   - Define deployment steps
   - Create validation checkpoints
   - Plan traffic management
   - Design monitoring strategy

3. **Risk Mitigation**
   - Identify deployment risks
   - Design rollback procedures
   - Plan disaster recovery
   - Set up health checks

4. **Documentation**
   - Document deployment runbook
   - Create rollback procedures
   - Define success criteria
   - Write post-deployment checklist

## Deployment Strategies Overview

### Strategy Comparison Matrix

| Strategy | Downtime | Cost | Complexity | Rollback Speed | Best For |
|----------|----------|------|------------|----------------|----------|
| **Recreate** | High | Low | Low | Fast | Dev/Test environments |
| **Rolling Update** | None | Low | Medium | Medium | Stateless apps |
| **Blue-Green** | None | High | Medium | Instant | Critical services |
| **Canary** | None | Medium | High | Fast | Risk-averse releases |
| **A/B Testing** | None | Medium | High | Gradual | Feature validation |

## Rolling Update Deployment

### Kubernetes Rolling Update

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0        # Always maintain capacity
      maxSurge: 1              # Add 1 extra pod during update
  template:
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            successThreshold: 2
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

### Rolling Update Process

```bash
#!/bin/bash
# Rolling update script

APP="myapp"
NAMESPACE="production"
NEW_IMAGE="myapp:v2.0.0"

echo "=== Starting Rolling Update ==="

# 1. Update deployment
kubectl set image deployment/$APP $APP=$NEW_IMAGE -n $NAMESPACE

# 2. Watch rollout
kubectl rollout status deployment/$APP -n $NAMESPACE --timeout=10m

# 3. Verify pods
READY_PODS=$(kubectl get deployment $APP -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
DESIRED_PODS=$(kubectl get deployment $APP -n $NAMESPACE -o jsonpath='{.spec.replicas}')

if [ "$READY_PODS" -eq "$DESIRED_PODS" ]; then
  echo "✓ Rolling update successful: $READY_PODS/$DESIRED_PODS pods ready"
else
  echo "✗ Rolling update failed: $READY_PODS/$DESIRED_PODS pods ready"
  kubectl rollout undo deployment/$APP -n $NAMESPACE
  exit 1
fi

# 4. Run smoke tests
echo "Running smoke tests..."
curl -f https://api.example.com/health || {
  echo "Health check failed, rolling back"
  kubectl rollout undo deployment/$APP -n $NAMESPACE
  exit 1
}

echo "=== Rolling Update Complete ==="
```

## Blue-Green Deployment

### Infrastructure Setup

```yaml
# blue-deployment.yaml (current version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
  namespace: production
  labels:
    app: myapp
    version: blue
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
        - name: myapp
          image: myapp:v1.0.0
          ports:
            - containerPort: 8080

---
# green-deployment.yaml (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
  namespace: production
  labels:
    app: myapp
    version: green
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0
          ports:
            - containerPort: 8080

---
# service.yaml (routes to active version)
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
spec:
  selector:
    app: myapp
    version: blue  # Switch to 'green' to cut over
  ports:
    - port: 80
      targetPort: 8080
```

### Blue-Green Cutover Script

```bash
#!/bin/bash
# Blue-Green deployment cutover

NAMESPACE="production"
SERVICE="myapp"
NEW_VERSION="green"
OLD_VERSION="blue"

echo "=== Blue-Green Deployment Cutover ==="

# 1. Deploy green version
echo "Deploying $NEW_VERSION version..."
kubectl apply -f green-deployment.yaml

# 2. Wait for green to be ready
kubectl rollout status deployment/myapp-green -n $NAMESPACE --timeout=10m

# 3. Run validation tests on green
echo "Validating $NEW_VERSION version..."
GREEN_POD=$(kubectl get pod -l version=green -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
kubectl port-forward $GREEN_POD 9090:8080 -n $NAMESPACE &
PORT_FORWARD_PID=$!
sleep 5

# Run smoke tests
curl -f http://localhost:9090/health || {
  echo "Green validation failed, aborting cutover"
  kill $PORT_FORWARD_PID
  kubectl delete deployment myapp-green -n $NAMESPACE
  exit 1
}
kill $PORT_FORWARD_PID

# 4. Switch traffic to green
echo "Switching traffic to $NEW_VERSION..."
kubectl patch service $SERVICE -n $NAMESPACE -p '{"spec":{"selector":{"version":"green"}}}'

# 5. Monitor for issues
echo "Monitoring for 5 minutes..."
sleep 300

# 6. Check error rates
ERROR_RATE=$(curl -s http://prometheus/api/v1/query?query=rate\(http_requests_total{status=~\"5..\"}[5m]\) | jq '.data.result[0].value[1]')
if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
  echo "High error rate detected, rolling back to $OLD_VERSION"
  kubectl patch service $SERVICE -n $NAMESPACE -p '{"spec":{"selector":{"version":"blue"}}}'
  exit 1
fi

# 7. Scale down blue (keep for rollback)
echo "Scaling down $OLD_VERSION (keeping for rollback)..."
kubectl scale deployment myapp-blue -n $NAMESPACE --replicas=1

echo "=== Cutover Complete ==="
echo "Blue version is scaled to 1 replica for quick rollback"
echo "To fully cleanup: kubectl delete deployment myapp-blue -n $NAMESPACE"
```

## Canary Deployment

### Progressive Canary with Istio

```yaml
# base-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-stable
  namespace: production
spec:
  replicas: 10
  template:
    metadata:
      labels:
        app: myapp
        version: stable
    spec:
      containers:
        - name: myapp
          image: myapp:v1.0.0

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
  namespace: production
spec:
  replicas: 1  # Start with 1 replica
  template:
    metadata:
      labels:
        app: myapp
        version: canary
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0

---
# virtual-service.yaml (Istio)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
  namespace: production
spec:
  hosts:
    - myapp
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: myapp
            subset: canary
    - route:
        - destination:
            host: myapp
            subset: stable
          weight: 95
        - destination:
            host: myapp
            subset: canary
          weight: 5  # Start with 5% traffic

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
  namespace: production
spec:
  host: myapp
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
```

### Progressive Canary Rollout Script

```bash
#!/bin/bash
# Progressive canary rollout

NAMESPACE="production"
APP="myapp"

# Canary stages: traffic percentage and duration
STAGES=(
  "5:300"    # 5% for 5 minutes
  "10:600"   # 10% for 10 minutes
  "25:900"   # 25% for 15 minutes
  "50:1800"  # 50% for 30 minutes
  "100:0"    # 100%
)

echo "=== Starting Canary Deployment ==="

for STAGE in "${STAGES[@]}"; do
  WEIGHT=$(echo $STAGE | cut -d: -f1)
  DURATION=$(echo $STAGE | cut -d: -f2)

  echo "Setting canary traffic to ${WEIGHT}%..."

  # Update VirtualService weight
  kubectl patch virtualservice $APP -n $NAMESPACE --type=json -p="[
    {\"op\": \"replace\", \"path\": \"/spec/http/0/route/0/weight\", \"value\": $((100-WEIGHT))},
    {\"op\": \"replace\", \"path\": \"/spec/http/0/route/1/weight\", \"value\": $WEIGHT}
  ]"

  if [ $DURATION -gt 0 ]; then
    echo "Monitoring for $DURATION seconds..."
    sleep $DURATION

    # Check metrics
    ERROR_RATE=$(curl -s "http://prometheus/api/v1/query?query=rate(http_requests_total{version=\"canary\",status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1]')
    LATENCY_P99=$(curl -s "http://prometheus/api/v1/query?query=histogram_quantile(0.99,http_request_duration_seconds{version=\"canary\"})" | jq -r '.data.result[0].value[1]')

    # Rollback conditions
    if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
      echo "High error rate ($ERROR_RATE), rolling back canary"
      kubectl patch virtualservice $APP -n $NAMESPACE --type=json -p='[
        {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
        {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
      ]'
      exit 1
    fi

    if (( $(echo "$LATENCY_P99 > 1.0" | bc -l) )); then
      echo "High latency ($LATENCY_P99s), rolling back canary"
      kubectl patch virtualservice $APP -n $NAMESPACE --type=json -p='[
        {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
        {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
      ]'
      exit 1
    fi

    echo "✓ Stage ${WEIGHT}% successful"
  fi
done

# Promote canary to stable
echo "Promoting canary to stable..."
kubectl set image deployment/$APP-stable $APP=$(kubectl get deployment $APP-canary -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}') -n $NAMESPACE
kubectl scale deployment/$APP-canary -n $NAMESPACE --replicas=0

echo "=== Canary Deployment Complete ==="
```

## A/B Testing Deployment

### Header-Based A/B Testing

```yaml
# ab-test-virtual-service.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
  namespace: production
spec:
  hosts:
    - myapp.example.com
  http:
    # Version B for beta users
    - match:
        - headers:
            user-group:
              exact: "beta"
      route:
        - destination:
            host: myapp
            subset: version-b
    # Version B for 20% of users (cookie-based)
    - match:
        - headers:
            cookie:
              regex: ".*ab-test=version-b.*"
      route:
        - destination:
            host: myapp
            subset: version-b
    # Default to Version A
    - route:
        - destination:
            host: myapp
            subset: version-a
```

## Deployment Decision Tree

```
Start
  │
  ├─ Is this a critical production service?
  │   ├─ Yes → Blue-Green Deployment
  │   │         (Instant rollback, zero downtime)
  │   └─ No ↓
  │
  ├─ Do you need gradual rollout with metrics validation?
  │   ├─ Yes → Canary Deployment
  │   │         (Progressive traffic shift, automated rollback)
  │   └─ No ↓
  │
  ├─ Is infrastructure cost a concern?
  │   ├─ Yes → Rolling Update
  │   │         (Cost-effective, zero downtime)
  │   └─ No ↓
  │
  ├─ Need to test multiple versions simultaneously?
  │   ├─ Yes → A/B Testing
  │   │         (Compare versions, user segmentation)
  │   └─ No ↓
  │
  └─ Development/Testing environment?
      └─ Yes → Recreate
                (Simple, accepts downtime)
```

## Deployment Checklist

### Pre-Deployment

```yaml
Pre-Deployment Checklist:
  Infrastructure:
    - [ ] Sufficient cluster capacity
    - [ ] Load balancer configured
    - [ ] Health checks defined
    - [ ] Monitoring alerts active

  Code:
    - [ ] All tests passing
    - [ ] Security scan clean
    - [ ] Performance benchmarks met
    - [ ] Database migrations tested

  Documentation:
    - [ ] Deployment runbook reviewed
    - [ ] Rollback procedure documented
    - [ ] Success criteria defined
    - [ ] Team notified

  Validation:
    - [ ] Smoke tests prepared
    - [ ] Integration tests ready
    - [ ] Metrics dashboards configured
    - [ ] Rollback triggers defined
```

### During Deployment

```yaml
Deployment Execution:
  - [ ] Start deployment (log timestamp)
  - [ ] Monitor pod startup
  - [ ] Verify health checks passing
  - [ ] Run smoke tests
  - [ ] Check error rates
  - [ ] Monitor latency
  - [ ] Validate business metrics
  - [ ] Verify integrations
```

### Post-Deployment

```yaml
Post-Deployment Validation:
  - [ ] All pods healthy
  - [ ] Traffic serving correctly
  - [ ] Error rates normal
  - [ ] Latency within SLA
  - [ ] Database connections healthy
  - [ ] External integrations working
  - [ ] Monitoring alerts normal
  - [ ] Document any issues
```

## Rollback Procedures

### Immediate Rollback Triggers

```yaml
Automatic Rollback If:
  - Error rate > 1%
  - P99 latency > 2x baseline
  - Pod crash loop detected
  - Health checks failing
  - Critical dependency unavailable

Manual Rollback If:
  - Business metrics declining
  - Customer complaints spike
  - Data integrity issues
  - Security vulnerability discovered
```

### Quick Rollback Commands

```bash
# Rolling Update rollback
kubectl rollout undo deployment/myapp -n production

# Blue-Green rollback (switch service back)
kubectl patch service myapp -n production -p '{"spec":{"selector":{"version":"blue"}}}'

# Canary rollback (set traffic to 0%)
kubectl patch virtualservice myapp -n production --type=json -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 100},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 0}
]'

# Helm rollback
helm rollback myapp -n production
```

## Best Practices

1. **Always Have a Rollback Plan** - Test it before deployment
2. **Define Success Metrics** - Error rate, latency, business KPIs
3. **Automate Health Checks** - Don't rely on manual verification
4. **Monitor Actively** - Watch dashboards during deployment
5. **Start Small** - Use canary/blue-green for critical services
6. **Document Everything** - Runbooks, rollback procedures, lessons learned
7. **Practice Deployments** - Run deployment drills in staging

## Integration Points

- Works with **release-manager** for version coordination
- Coordinates with **ci-pipeline-generator** for deployment automation
- Supports **environment-configurator** for environment-specific strategies
- Integrates with **helm-release-manager** for Helm-based deployments

## Project Context

Plugin: container-workflow
Purpose: Plan and execute optimal deployment strategies
Strategies: Rolling Update, Blue-Green, Canary, A/B Testing, Recreate

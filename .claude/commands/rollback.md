# Rollback Deployment

Rollback Golden Armada to a previous version.

## Instructions

### 1. Check Deployment History

\`\`\`bash
# View Helm release history
helm history golden-armada -n agents

# View Kubernetes rollout history
kubectl rollout history deployment/golden-armada-backend-developer -n agents

# Check specific revision
kubectl rollout history deployment/golden-armada-backend-developer -n agents --revision=2
\`\`\`

### 2. Helm Rollback

\`\`\`bash
# Rollback to previous release
helm rollback golden-armada -n agents

# Rollback to specific revision
helm rollback golden-armada 2 -n agents

# Rollback with wait
helm rollback golden-armada -n agents --wait --timeout 5m
\`\`\`

### 3. Kubernetes Rollback

\`\`\`bash
# Rollback to previous revision
kubectl rollout undo deployment/golden-armada-backend-developer -n agents

# Rollback to specific revision
kubectl rollout undo deployment/golden-armada-backend-developer -n agents --to-revision=2

# Rollback all agents
kubectl rollout undo deployment -n agents -l app.kubernetes.io/name=golden-armada
\`\`\`

### 4. Verify Rollback

\`\`\`bash
# Check rollout status
kubectl rollout status deployment/golden-armada-backend-developer -n agents

# Verify pod images
kubectl get pods -n agents -o jsonpath='{.items[*].spec.containers[*].image}'

# Check health endpoints
kubectl port-forward -n agents svc/golden-armada-backend-developer 8080:8080 &
curl http://localhost:8080/health
\`\`\`

### 5. Emergency Rollback Script

\`\`\`bash
#!/bin/bash
# emergency-rollback.sh

NAMESPACE=${1:-agents}
RELEASE=${2:-golden-armada}

echo "Starting emergency rollback..."

# Get current revision
CURRENT=$(helm history $RELEASE -n $NAMESPACE -o json | jq '.[0].revision')
echo "Current revision: $CURRENT"

# Rollback
echo "Rolling back to previous version..."
helm rollback $RELEASE -n $NAMESPACE --wait --timeout 3m

# Verify
echo "Verifying rollback..."
kubectl get pods -n $NAMESPACE -w &
PID=$!
sleep 30
kill $PID 2>/dev/null

# Health check
echo "Running health checks..."
for svc in $(kubectl get svc -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}'); do
  kubectl port-forward -n $NAMESPACE svc/$svc 8080:8080 &
  sleep 2
  if curl -sf http://localhost:8080/health > /dev/null; then
    echo "✓ $svc is healthy"
  else
    echo "✗ $svc health check failed"
  fi
  kill %1 2>/dev/null
done

echo "Rollback complete!"
\`\`\`

### 6. Rollback Decision Tree

\`\`\`
Is the service down?
├── Yes → Immediate rollback (helm rollback)
└── No → Continue investigation
    │
    ├── Are errors increasing?
    │   ├── Yes → Staged rollback (one replica first)
    │   └── No → Monitor for 15 minutes
    │
    └── Is latency degraded?
        ├── >2x normal → Consider rollback
        └── <2x normal → Scale up instead
\`\`\`

## Post-Rollback Actions

1. **Document the incident**
   - What triggered the rollback
   - Timeline of events
   - Impact assessment

2. **Investigate root cause**
   - Review deployment changes
   - Check configuration diffs
   - Analyze logs from failed version

3. **Create fix**
   - Address the issue that caused rollback
   - Add tests to prevent recurrence
   - Update runbooks if needed

## Rollback Limits

\`\`\`bash
# Configure revision history limit in deployment
spec:
  revisionHistoryLimit: 10  # Keep last 10 revisions

# Helm keeps history by default
# Clean old releases if needed
helm history golden-armada -n agents | head -20
\`\`\`

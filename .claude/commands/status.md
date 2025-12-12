# Check Deployment Status

Check the status of the Golden Armada deployment.

## Instructions

Run comprehensive status checks for the agent fleet.

### Quick Status

\`\`\`bash
# All resources in agents namespace
kubectl get all -n agents
\`\`\`

### Detailed Status

#### 1. Pod Status

\`\`\`bash
# Check all pods
kubectl get pods -n agents -o wide

# Check pod events
kubectl describe pods -n agents | grep -A 10 "Events:"

# Check for failed pods
kubectl get pods -n agents --field-selector=status.phase!=Running
\`\`\`

#### 2. Service Status

\`\`\`bash
# List services
kubectl get svc -n agents

# Check endpoints
kubectl get endpoints -n agents
\`\`\`

#### 3. Deployment Status

\`\`\`bash
# Deployment rollout status
kubectl rollout status deployment -n agents --timeout=60s

# Replica status
kubectl get deployments -n agents
\`\`\`

#### 4. Resource Usage

\`\`\`bash
# Pod resource usage (requires metrics-server)
kubectl top pods -n agents 2>/dev/null || echo "Metrics server not available"

# Node resource usage
kubectl top nodes 2>/dev/null || echo "Metrics server not available"
\`\`\`

#### 5. Logs

\`\`\`bash
# Recent logs from all agents
kubectl logs -n agents -l app.kubernetes.io/name=golden-armada --tail=20

# Follow logs
kubectl logs -n agents -l app.kubernetes.io/name=golden-armada -f
\`\`\`

#### 6. Health Checks

\`\`\`bash
# Port forward and test health
kubectl port-forward -n agents svc/golden-armada 8080:8080 &
sleep 2
curl -s http://localhost:8080/health | jq .
pkill -f "port-forward.*golden-armada"
\`\`\`

### Helm Release Status

\`\`\`bash
# Check Helm release
helm status golden-armada -n agents

# List all releases
helm list -n agents

# Release history
helm history golden-armada -n agents
\`\`\`

### Troubleshooting

\`\`\`bash
# Check events
kubectl get events -n agents --sort-by='.lastTimestamp' | tail -20

# Check for resource issues
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check ConfigMaps and Secrets
kubectl get configmaps,secrets -n agents
\`\`\`

## Common Issues

| Symptom | Check | Solution |
|---------|-------|----------|
| Pod CrashLoopBackOff | `kubectl logs -n agents <pod>` | Check startup errors |
| ImagePullBackOff | `kubectl describe pod -n agents <pod>` | Verify image exists |
| Pending pods | `kubectl describe pod -n agents <pod>` | Check resource constraints |
| Service unavailable | `kubectl get endpoints -n agents` | Verify pod selectors |

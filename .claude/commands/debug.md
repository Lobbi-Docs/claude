# Debug Agent Issues

Comprehensive debugging for Golden Armada agent services.

## Instructions

### 1. Identify the Problem

\`\`\`bash
# Quick health check
curl -s http://localhost:8080/health | jq '.' 2>/dev/null || echo "Service not responding"

# Check if container is running
docker ps | grep golden-armada || echo "No containers running"

# Check Kubernetes pods
kubectl get pods -n agents 2>/dev/null || echo "K8s not available"
\`\`\`

### 2. Kubernetes Debugging

\`\`\`bash
# Pod status
kubectl get pods -n agents -o wide

# Recent events
kubectl get events -n agents --sort-by='.lastTimestamp' | tail -20

# Describe problematic pod
kubectl describe pod -n agents -l app.kubernetes.io/name=golden-armada | tail -50

# Check for OOMKilled
kubectl get pods -n agents -o json | jq '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason=="OOMKilled") | .metadata.name'

# Resource usage
kubectl top pods -n agents 2>/dev/null || echo "Metrics server not available"
\`\`\`

### 3. Log Analysis

\`\`\`bash
# Application logs (last 100 lines)
kubectl logs -n agents deployment/golden-armada-backend-developer --tail=100 2>/dev/null

# Filter for errors
kubectl logs -n agents deployment/golden-armada-backend-developer --since=1h 2>/dev/null | grep -i "error\|exception\|traceback" | head -50

# Previous container logs (after restart)
kubectl logs -n agents deployment/golden-armada-backend-developer --previous 2>/dev/null | tail -50
\`\`\`

### 4. Docker Debugging

\`\`\`bash
# Container logs
docker logs $(docker ps -q -f name=golden-armada) --tail=100 2>/dev/null

# Interactive shell
docker exec -it $(docker ps -q -f name=golden-armada) /bin/sh 2>/dev/null

# Container inspection
docker inspect $(docker ps -q -f name=golden-armada) 2>/dev/null | jq '.[0].State'
\`\`\`

### 5. Network Debugging

\`\`\`bash
# Check service endpoints
kubectl get endpoints -n agents

# DNS resolution test
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup golden-armada-backend-developer.agents.svc.cluster.local 2>/dev/null

# Connectivity test
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- curl -v http://golden-armada-backend-developer:8080/health 2>/dev/null
\`\`\`

### 6. Application Debugging

\`\`\`python
# Add to agent.py for debugging
import logging
logging.basicConfig(level=logging.DEBUG)

# Add breakpoint for remote debugging
import debugpy
debugpy.listen(("0.0.0.0", 5678))
debugpy.wait_for_client()
\`\`\`

\`\`\`bash
# Port forward for remote debugging
kubectl port-forward -n agents deployment/golden-armada-backend-developer 5678:5678
\`\`\`

### 7. Common Issues

#### Pod CrashLoopBackOff
\`\`\`bash
# Check exit code
kubectl describe pod <pod-name> -n agents | grep -A5 "Last State"

# Common causes:
# - Exit 1: Application error (check logs)
# - Exit 137: OOMKilled (increase memory limit)
# - Exit 139: Segfault
\`\`\`

#### ImagePullBackOff
\`\`\`bash
# Check image name
kubectl get pod <pod-name> -n agents -o jsonpath='{.spec.containers[*].image}'

# Check image pull secrets
kubectl get secrets -n agents
\`\`\`

#### Service Unreachable
\`\`\`bash
# Verify service selector matches pod labels
kubectl get svc -n agents -o wide
kubectl get pods -n agents --show-labels
\`\`\`

### 8. Quick Fixes

\`\`\`bash
# Restart deployment
kubectl rollout restart deployment/golden-armada-backend-developer -n agents

# Scale up to recover
kubectl scale deployment/golden-armada-backend-developer -n agents --replicas=2

# Rollback if recent deploy caused issue
kubectl rollout undo deployment/golden-armada-backend-developer -n agents

# Force delete stuck pod
kubectl delete pod <pod-name> -n agents --force --grace-period=0
\`\`\`

## Debug Output Template

\`\`\`markdown
## Debug Report

**Service:** golden-armada-backend-developer
**Time:** YYYY-MM-DD HH:MM:SS
**Environment:** staging/production

### Status
- Pod Status: Running/CrashLoopBackOff/Pending
- Restarts: N
- Age: Xm

### Recent Errors
[Error logs here]

### Resource Usage
- CPU: X%
- Memory: X/Y MB

### Root Cause
[Analysis]

### Recommended Action
[Fix steps]
\`\`\`

---
description: Kubernetes debugging commands - troubleshoot pods, services, and cluster issues
---

# Kubernetes Debugging

Execute Kubernetes debugging and troubleshooting tasks. Available operations:

## Usage
```
/k8s-debug <operation> [options]
```

## Operations

### Pod Debugging
- `pod-status` - Get detailed pod status
- `pod-logs` - Get pod logs (current and previous)
- `pod-events` - Get pod-related events
- `pod-exec` - Execute command in pod
- `pod-describe` - Full pod description

### Service Debugging
- `svc-endpoints` - Check service endpoints
- `svc-connectivity` - Test service connectivity
- `dns-test` - Test DNS resolution

### Resource Analysis
- `resource-usage` - Show CPU/memory usage
- `resource-limits` - Check resource limits
- `quota-status` - Check resource quota

### Network Debugging
- `network-policy` - Check network policies
- `ingress-status` - Check ingress configuration
- `port-forward` - Set up port forwarding

### Cluster Health
- `node-status` - Check node health
- `events` - Get recent cluster events
- `pvc-status` - Check persistent volumes

## Examples

```bash
# Debug crashing pod
/k8s-debug pod-status --name alpha-members-abc123

# Get logs from previous container
/k8s-debug pod-logs --name alpha-members-abc123 --previous

# Test service connectivity
/k8s-debug svc-connectivity --service alpha-members

# Check resource usage
/k8s-debug resource-usage --namespace alpha-production

# Get recent warning events
/k8s-debug events --type Warning --limit 20

# Test DNS resolution
/k8s-debug dns-test --hostname alpha-members.alpha-production.svc.cluster.local
```

## Agent Assignment
This command activates the **k8s-debugger** agent for execution.

## Prerequisites
- kubectl configured with cluster access
- metrics-server installed (for resource-usage)
- Appropriate RBAC permissions

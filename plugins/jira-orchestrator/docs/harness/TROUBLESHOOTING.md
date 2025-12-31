# Harness Troubleshooting

## Delegate Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Not connecting | "No delegate available" | Check token, network, logs |
| Task timeout | Steps hang | Increase resources |
| Version mismatch | Compatibility errors | Update delegate |
| OOM errors | Delegate restarts | Increase memory |

### Debug Commands
```bash
# Check pods
kubectl get pods -n harness-delegate

# View logs
kubectl logs -n harness-delegate -l app=harness-delegate --tail=100

# Check health
kubectl exec -n harness-delegate deployment/harness-delegate -- curl -s localhost:8080/api/health

# Restart
kubectl rollout restart deployment/harness-delegate -n harness-delegate
```

## Pipeline Failures

| Error | Cause | Solution |
|-------|-------|----------|
| INVALID_REQUEST | YAML error | Validate YAML |
| DELEGATE_NOT_AVAILABLE | No matching delegate | Check selectors |
| CONNECTOR_NOT_FOUND | Missing connector | Create connector |
| SECRET_NOT_FOUND | Missing secret | Create secret |
| TIMEOUT | Step too slow | Increase timeout |

### Validate Pipeline
```bash
curl -X POST "https://app.harness.io/pipeline/api/pipelines/validate" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -H "Content-Type: application/yaml" \
  --data-binary @pipeline.yaml
```

## Connector Issues

### Test Connector
```bash
curl -X POST "https://app.harness.io/gateway/ng/api/connectors/testConnection/${CONNECTOR_ID}" \
  -H "x-api-key: ${HARNESS_API_KEY}" \
  -d '{"accountIdentifier": "${ACCOUNT_ID}"}'
```

| Issue | Solution |
|-------|----------|
| Auth failed | Check credentials |
| Network timeout | Check delegate access |
| Permission denied | Check IAM/RBAC |

## CI Build Issues

| Issue | Solution |
|-------|----------|
| Image pull failed | Check registry connector |
| Cache miss | Verify checksum file path |
| Test Intelligence not working | Check language/buildTool |
| Out of memory | Increase step resources |

## CD Deployment Issues

| Issue | Solution |
|-------|----------|
| Manifest not found | Check paths in service |
| K8s auth failed | Check cluster connector |
| Rollback triggered | Check deployment logs |
| Approval timeout | Check approver access |

## Debug Logging

```yaml
- step:
    name: Debug
    type: ShellScript
    spec:
      script: |
        echo "Pipeline: <+pipeline.name>"
        echo "Stage: <+stage.name>"
        echo "Service: <+service.name>"
        echo "Environment: <+env.name>"
        echo "Artifact: <+artifact.tag>"
        env | sort
```

## Common Fixes

### Increase Timeout
```yaml
- step:
    timeout: 30m  # Default is 10m
```

### Add Retry
```yaml
failureStrategies:
  - onFailure:
      errors: [Timeout]
      action:
        type: Retry
        spec:
          retryCount: 3
          retryInterval: 1m
```

### Skip Dry Run
```yaml
- step:
    type: K8sRollingDeploy
    spec:
      skipDryRun: true
```

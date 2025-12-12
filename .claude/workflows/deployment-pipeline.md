# Deployment Pipeline Workflow

Multi-agent workflow for deploying the Alpha Members Platform to Kubernetes.

## Workflow Metadata
```yaml
name: deployment-pipeline
type: sequential
description: End-to-end deployment workflow with Helm, testing, and validation
agents:
  - helm-chart-developer
  - helm-values-manager
  - helm-release-manager
  - k8s-debugger
  - k8s-security-specialist
triggers:
  - "deploy to"
  - "release to"
  - "deployment pipeline"
stages:
  - pre-deploy
  - deploy
  - validate
  - post-deploy
estimatedDuration: "30-60 minutes"
priority: critical
```

## Workflow Stages

### Stage 1: Pre-Deploy Checks
**Agents:** helm-chart-developer, k8s-security-specialist
**Tasks:**
1. Lint Helm chart
2. Validate values file
3. Check secrets exist
4. Verify cluster access
5. Run security scan on images
6. Check resource availability

**Outputs:**
- Pre-deploy checklist
- Security scan results
- Resource availability report

### Stage 2: Deployment
**Agents:** helm-values-manager, helm-release-manager
**Tasks:**
1. Select environment values
2. Template and verify manifests
3. Execute helm upgrade --install
4. Monitor rollout status
5. Handle deployment failures

**Outputs:**
- Deployment logs
- Release status
- Rollout progress

### Stage 3: Validation
**Agents:** k8s-debugger, helm-release-manager
**Tasks:**
1. Wait for pods ready
2. Run helm tests
3. Check service endpoints
4. Verify health checks
5. Run smoke tests

**Outputs:**
- Validation results
- Health check status
- Test results

### Stage 4: Post-Deploy
**Agents:** k8s-security-specialist, helm-release-manager
**Tasks:**
1. Verify security posture
2. Update documentation
3. Notify stakeholders
4. Create release notes
5. Monitor for issues

**Outputs:**
- Deployment summary
- Release notes
- Monitoring alerts configured

## Execution Flow

```
[Start] ─── Environment: dev | staging | prod
    │
    ▼
┌─────────────────────────────────────┐
│         PRE-DEPLOY (Parallel)        │
├─────────────────┬───────────────────┤
│ Chart Lint      │ Security Scan     │
│ chart-developer │ security-spec     │
└────────┬────────┴─────────┬─────────┘
         │                  │
         └────────┬─────────┘
                  │
                  ▼
         ┌───────────────┐
         │ Select Values │
         │ values-manager│
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │   DEPLOY      │
         │release-manager│
         │  (atomic)     │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   [Success]          [Failure]
        │                 │
        ▼                 ▼
┌───────────────┐  ┌─────────────┐
│   Validate    │  │  Rollback   │
│  k8s-debugger │  │release-mgr  │
└───────┬───────┘  └──────┬──────┘
        │                 │
        ▼                 ▼
   [Complete]        [Investigate]
```

## Environment-Specific Configuration

### Development
```yaml
namespace: development
replicas: 1
resources: minimal
ingress: dev.members.example.com
secrets: dev vault path
```

### Staging
```yaml
namespace: staging
replicas: 2
resources: moderate
ingress: staging.members.example.com
secrets: staging vault path
```

### Production
```yaml
namespace: production
replicas: 3-20 (autoscaling)
resources: production
ingress: members.example.com
secrets: production vault path
```

## Rollback Procedure

1. **Automatic** (--atomic flag): Helm handles on failure
2. **Manual**:
   ```bash
   helm rollback alpha-members <revision> -n <namespace>
   ```
3. **Investigation**: Debug with k8s-debugger agent

## Success Criteria

### Pre-Deploy
- [ ] Chart passes linting
- [ ] Values validate against schema
- [ ] Required secrets exist
- [ ] Image passes security scan

### Deploy
- [ ] Helm upgrade completes
- [ ] All pods reach Ready state
- [ ] No restarts in 5 minutes

### Validate
- [ ] Helm tests pass
- [ ] Health endpoints respond
- [ ] Smoke tests pass

### Post-Deploy
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Documentation updated

# Infrastructure Audit Workflow

Multi-agent workflow for comprehensive infrastructure security and compliance audit.

## Workflow Metadata
```yaml
name: infrastructure-audit
type: parallel
description: Complete infrastructure audit covering Keycloak, MongoDB, Kubernetes, and Helm
agents:
  - keycloak-security-auditor
  - mongodb-query-optimizer
  - k8s-security-specialist
  - k8s-resource-optimizer
triggers:
  - "audit infrastructure"
  - "security audit"
  - "compliance check"
stages:
  - security-audit
  - performance-audit
  - compliance-check
  - remediation-plan
estimatedDuration: "1-2 hours"
priority: high
```

## Workflow Stages

### Stage 1: Security Audit (Parallel)
**Agents:** keycloak-security-auditor, k8s-security-specialist
**Tasks:**

**Keycloak:**
1. Audit realm security settings
2. Review client configurations
3. Check authentication flows
4. Validate token policies
5. Review brute force settings

**Kubernetes:**
1. RBAC audit
2. Pod security standards check
3. Network policy analysis
4. Secret management review
5. Image vulnerability scan

**Outputs:**
- Security findings report
- Risk assessment
- Critical issues list

### Stage 2: Performance Audit (Parallel)
**Agents:** mongodb-query-optimizer, k8s-resource-optimizer
**Tasks:**

**MongoDB:**
1. Query performance analysis
2. Index usage review
3. Slow query identification
4. Connection pool analysis
5. Storage efficiency check

**Kubernetes:**
1. Resource utilization review
2. Autoscaling configuration
3. Resource quota analysis
4. Node efficiency check
5. Cost optimization review

**Outputs:**
- Performance baseline
- Optimization opportunities
- Cost analysis

### Stage 3: Compliance Check
**Agents:** k8s-security-specialist, keycloak-security-auditor
**Tasks:**
1. CIS benchmark compliance
2. OWASP security checklist
3. Pod Security Standards
4. OAuth 2.0 best practices
5. Data protection review

**Outputs:**
- Compliance report
- Gap analysis
- Remediation priorities

### Stage 4: Remediation Plan
**All Agents**
**Tasks:**
1. Prioritize findings
2. Create remediation tasks
3. Estimate effort
4. Assign responsibilities
5. Set timeline

**Outputs:**
- Remediation roadmap
- Task list with priorities
- Implementation guide

## Execution Flow

```
[Start]
    │
    ▼
┌─────────────────────────────────────────────────────┐
│              SECURITY AUDIT (Parallel)               │
├────────────────────────┬────────────────────────────┤
│ Keycloak Security      │ Kubernetes Security        │
│ keycloak-auditor       │ k8s-security-specialist    │
└───────────┬────────────┴──────────────┬─────────────┘
            │                           │
            └─────────────┬─────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│            PERFORMANCE AUDIT (Parallel)              │
├────────────────────────┬────────────────────────────┤
│ MongoDB Performance    │ K8s Resources              │
│ query-optimizer        │ resource-optimizer         │
└───────────┬────────────┴──────────────┬─────────────┘
            │                           │
            └─────────────┬─────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │    COMPLIANCE CHECK     │
            │    (Sequential)         │
            └────────────┬────────────┘
                         │
                         ▼
            ┌─────────────────────────┐
            │   REMEDIATION PLAN      │
            │   (Consolidation)       │
            └────────────┬────────────┘
                         │
                         ▼
                    [Complete]
```

## Audit Checklist

### Keycloak Security
- [ ] SSL/TLS enforced
- [ ] Brute force protection enabled
- [ ] Strong password policy
- [ ] Token lifetimes appropriate
- [ ] Unused clients removed
- [ ] Admin MFA enabled

### MongoDB Security
- [ ] Authentication enabled
- [ ] Authorization configured
- [ ] Encryption at rest
- [ ] Network access restricted
- [ ] Audit logging enabled
- [ ] Backups verified

### Kubernetes Security
- [ ] RBAC properly configured
- [ ] Pod security standards enforced
- [ ] Network policies in place
- [ ] Secrets encrypted
- [ ] Images scanned
- [ ] Privileged containers blocked

### Resource Optimization
- [ ] Resource requests set
- [ ] Resource limits configured
- [ ] HPA configured
- [ ] Unused resources identified
- [ ] Cost optimization applied

## Output Reports

1. **Executive Summary** - High-level findings
2. **Security Report** - Detailed security analysis
3. **Performance Report** - Performance metrics and recommendations
4. **Compliance Report** - Standards compliance status
5. **Remediation Plan** - Prioritized action items

## Success Criteria

- [ ] All components audited
- [ ] No critical vulnerabilities
- [ ] Compliance gaps identified
- [ ] Remediation plan created
- [ ] Documentation updated

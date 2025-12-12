---
description: Kubernetes security audit commands - audit RBAC, network policies, and pod security
---

# Kubernetes Security Audit

Execute Kubernetes security auditing tasks. Available operations:

## Usage
```
/k8s-security-audit <operation> [options]
```

## Operations

### RBAC Audit
- `rbac-check` - Check permissions for user/SA
- `rbac-list` - List role bindings
- `rbac-analyze` - Analyze RBAC permissions

### Pod Security
- `pss-check` - Check Pod Security Standards compliance
- `security-context` - Audit security contexts
- `privileged-pods` - Find privileged containers

### Network Security
- `netpol-list` - List network policies
- `netpol-analyze` - Analyze network policy coverage
- `ingress-audit` - Audit ingress security

### Secrets Audit
- `secrets-list` - List secrets (names only)
- `secrets-usage` - Check secret usage
- `secrets-encryption` - Verify encryption at rest

### Vulnerability Scanning
- `image-scan` - Scan container images
- `cve-check` - Check for known CVEs
- `compliance-report` - Generate compliance report

## Examples

```bash
# Check what a service account can do
/k8s-security-audit rbac-check --sa alpha-members --namespace alpha-production

# Find privileged pods
/k8s-security-audit privileged-pods --namespace alpha-production

# Analyze network policy coverage
/k8s-security-audit netpol-analyze --namespace alpha-production

# Audit pod security contexts
/k8s-security-audit security-context --namespace alpha-production

# Generate compliance report
/k8s-security-audit compliance-report --standard CIS
```

## Standards Supported
- **CIS** - CIS Kubernetes Benchmark
- **PSS** - Pod Security Standards (restricted, baseline, privileged)
- **NSA** - NSA Kubernetes Hardening Guide

## Agent Assignment
This command activates the **k8s-security-specialist** agent for execution.

## Prerequisites
- kubectl configured with cluster access
- trivy or similar scanner (for image-scan)
- Appropriate RBAC permissions for audit

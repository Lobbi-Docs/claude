---
description: Smart debugging for EKS deployment issues with AI-powered analysis and fix suggestions
---

# Debug

Intelligent debugging for deployment issues. Analyzes pods, logs, Keycloak, and Harness pipelines to identify root causes.

## Usage
```
/eks:debug [service] [options]
```

## Arguments
- `service` - Service to debug (default: auto-detect from recent failures)

## Options
- `--env` - Environment to debug: `dev`, `staging`, `prod` (default: `dev`)
- `--issue` - Specific issue type: `pods`, `auth`, `pipeline`, `network`, `all`
- `--logs` - Show last N log lines (default: `100`)
- `--events` - Show last N events (default: `50`)
- `--depth` - Analysis depth: `quick`, `standard`, `deep` (default: `standard`)
- `--fix` - Attempt automatic fixes (default: `false`)
- `--compare` - Compare with working environment

## Examples

### Debug Service in Dev
```bash
/eks:debug api-gateway
```

### Debug Production Issue
```bash
/eks:debug api-gateway --env=prod
```

### Quick Check
```bash
/eks:debug --depth=quick
```

### Focus on Auth Issues
```bash
/eks:debug api-gateway --issue=auth
```

### Deep Analysis with Auto-Fix
```bash
/eks:debug api-gateway --depth=deep --fix
```

### Compare Environments
```bash
/eks:debug api-gateway --env=staging --compare=dev
```

## Debug Output

```
/eks:debug api-gateway --env=staging
═════════════════════════════════════════════════════════════════════════

🔍 DEBUGGING: api-gateway in staging

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 POD STATUS
   ├── Desired: 3
   ├── Ready: 1/3
   ├── Status: 2 pods CrashLoopBackOff
   └── Restarts: 15 (in last hour)

   Pod: api-gateway-7d9b8c6f5-abc12
   ├── Status: CrashLoopBackOff
   ├── Restarts: 8
   ├── Last State: Error (exit code 1)
   └── Events:
       └── Back-off restarting failed container

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📜 RECENT LOGS (Errors)
   [2024-01-15 10:23:45] ERROR: Failed to connect to Keycloak
   [2024-01-15 10:23:45] ERROR: KEYCLOAK_URL environment variable not set
   [2024-01-15 10:23:46] FATAL: Authentication initialization failed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 KEYCLOAK ANALYSIS
   ├── Client: api-gateway-client
   ├── Status: ✅ Client exists
   ├── Secret: ⚠️ Secret mismatch detected
   └── Connectivity: ❌ Cannot reach Keycloak from pod

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 ROOT CAUSE ANALYSIS

   ❌ ISSUE IDENTIFIED: Missing Environment Variable

   The pod is failing because KEYCLOAK_URL is not set.
   This is typically caused by:
   1. Missing ExternalSecret synchronization
   2. Incorrect values in Helm override
   3. Secret not created in AWS Secrets Manager

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 SUGGESTED FIXES

   Fix 1: Sync External Secret (Recommended)
   ─────────────────────────────────────────
   kubectl annotate externalsecret api-gateway-keycloak \
     force-sync=$(date +%s) -n api-gateway-staging

   Fix 2: Verify Helm Values
   ─────────────────────────
   Check charts/api-gateway/values-staging.yaml:
   keycloak:
     url: "https://keycloak.staging.example.com"  # ← Verify this

   Fix 3: Check AWS Secret
   ───────────────────────
   aws secretsmanager get-secret-value \
     --secret-id api-gateway/keycloak-url \
     --region us-west-2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 APPLY FIX? [Fix 1: Sync External Secret]
   Run with --fix to auto-apply, or execute manually above.

═════════════════════════════════════════════════════════════════════════
```

## Issue Types

### Pods (`--issue=pods`)
- CrashLoopBackOff analysis
- OOMKilled detection
- Image pull errors
- Resource constraints
- Liveness/readiness probe failures

### Auth (`--issue=auth`)
- Keycloak connectivity
- Client configuration
- Token validation
- OIDC discovery
- Certificate issues

### Pipeline (`--issue=pipeline`)
- Recent pipeline failures
- Stage-specific errors
- Connector issues
- Delegate health
- Artifact problems

### Network (`--issue=network`)
- Service connectivity
- Ingress configuration
- Network policies
- DNS resolution
- TLS certificates

## Agent Assignment
This command activates the **dev-assistant** agent for analysis.

## Skills Used
- harness-eks-deployments
- harness-keycloak-auth
- local-eks-development

## Analysis Depth

### Quick (30 seconds)
- Pod status check
- Recent error logs
- Basic health

### Standard (2 minutes)
- Full pod analysis
- Log pattern matching
- Keycloak verification
- Event correlation
- Config validation

### Deep (5+ minutes)
- Cross-environment comparison
- Historical analysis
- Pipeline trace
- Network debugging
- Resource profiling

## Auto-Fix Capabilities

When `--fix` is enabled:

| Issue | Auto-Fix |
|-------|----------|
| External secret sync | Force refresh annotation |
| Image pull error | Refresh ECR token |
| Stuck deployment | Rollback to previous |
| Config mismatch | Re-apply Helm release |
| Keycloak client missing | Create client |

**Note**: Auto-fix requires appropriate permissions and is logged for audit.

## Compare Mode

```bash
/eks:debug api-gateway --env=staging --compare=dev
```

Shows differences between environments:

```
ENVIRONMENT COMPARISON: staging vs dev
═══════════════════════════════════════════════════════════════════════

                        STAGING          DEV
───────────────────────────────────────────────────────────────────────
Replicas                3                1
Image Tag               v1.2.3           v1.2.4          ← Newer in dev
Keycloak URL            ...staging...    ...dev...
CPU Limit               500m             250m
Memory Limit            512Mi            256Mi
Pod Status              1/3 Ready        1/1 Ready       ← Issue here

CONFIG DIFFERENCES:
───────────────────────────────────────────────────────────────────────
- keycloak.clientSecret: Different values
- env.LOG_LEVEL: "info" vs "debug"
+ staging has: autoscaling.enabled=true

POTENTIAL CAUSE:
───────────────────────────────────────────────────────────────────────
The staging Keycloak client secret differs from dev.
This may indicate a sync issue or rotation problem.
```

## Integration with Harness

Debug can analyze Harness pipeline failures:

```bash
/eks:debug api-gateway --issue=pipeline
```

Shows:
- Recent execution failures
- Stage-level errors
- Delegate logs
- Connector health
- Suggested pipeline fixes

## Troubleshooting History

Maintains debug history for pattern detection:

```bash
/eks:debug --history
```

Shows recurring issues and trends.

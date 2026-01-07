---
description: One-command deploy to any environment with automatic validation and Harness pipeline execution
---

# Ship

Deploy your service to any environment with a single command. Handles validation, Harness pipeline execution, and monitoring.

## Usage
```
/eks:ship [environment] [options]
```

## Arguments
- `environment` - Target environment: `dev`, `staging`, `prod` (default: `dev`)

## Options
- `--service` - Service to deploy (default: auto-detect from cwd)
- `--version` - Version/tag to deploy (default: current commit SHA)
- `--message` - Deployment note/message
- `--strategy` - Override strategy: `rolling`, `canary`, `blue-green`
- `--skip-validation` - Skip pre-deploy validation (not recommended)
- `--skip-tests` - Skip post-deploy smoke tests
- `--hotfix` - Enable hotfix mode (bypasses staging)
- `--dry-run` - Show what would happen without deploying
- `--wait` - Wait for deployment to complete (default: `true`)
- `--timeout` - Deployment timeout in minutes (default: `15`)

## Examples

### Deploy to Dev
```bash
/eks:ship
# or
/eks:ship dev
```
Fastest path - deploys current commit to development.

### Deploy to Staging
```bash
/eks:ship staging
```
Deploys after passing dev validation.

### Deploy to Production
```bash
/eks:ship prod
```
Requires approval, uses canary strategy by default.

### Deploy Specific Version
```bash
/eks:ship staging --version=v1.2.3
```

### Emergency Hotfix
```bash
/eks:ship prod --hotfix --message="Critical security patch"
```
Bypasses normal flow with expedited approval.

### Dry Run
```bash
/eks:ship prod --dry-run
```
Shows deployment plan without executing.

## Deployment Flow

```
/eks:ship staging
═════════════════════════════════════════════════════════════════════════

📋 PRE-FLIGHT CHECKS
   ├── ✅ Helm chart linted
   ├── ✅ Security scan passed (0 critical, 0 high)
   ├── ✅ Values validated for staging
   ├── ✅ Keycloak client verified
   └── ✅ Image exists in ECR

🚀 TRIGGERING HARNESS PIPELINE
   ├── Pipeline: api-gateway-deploy
   ├── Environment: staging
   ├── Version: abc123f
   └── Strategy: rolling

⏳ DEPLOYMENT IN PROGRESS
   ├── Stage: Helm Deploy
   ├── Status: Running...
   └── Progress: ████████░░░░░░░░░░░░ 40%

✅ DEPLOYMENT SUCCESSFUL
   ├── Duration: 3m 42s
   ├── Pods: 3/3 ready
   ├── Health: All endpoints responding
   └── Keycloak: Client authenticated

🧪 SMOKE TESTS
   ├── ✅ Health endpoint: 200 OK
   ├── ✅ Auth flow: Token obtained
   └── ✅ API response: Valid

📊 DEPLOYMENT SUMMARY
   ├── Service: api-gateway
   ├── Environment: staging
   ├── Version: abc123f → deployed
   ├── Previous: def456g
   ├── Replicas: 3
   └── URL: https://api-gateway.staging.example.com

═════════════════════════════════════════════════════════════════════════
```

## Environment Guards

### Development
- No approval required
- Immediate deployment
- Rolling strategy
- Automatic on push to `develop`

### Staging
- No approval required
- Pre-validation required
- Rolling or canary strategy
- Must pass dev first (unless `--hotfix`)

### Production
- **Approval required** (opens Harness approval UI)
- Full validation required
- Canary strategy (10% → approval → 100%)
- Must pass staging first (unless `--hotfix`)

## Hotfix Mode

For critical fixes that need expedited deployment:

```bash
/eks:ship prod --hotfix --message="CVE-2024-xxxxx patch"
```

Hotfix mode:
- Bypasses staging requirement
- Uses expedited approval workflow
- Notifies on-call team
- Creates rollback checkpoint
- Logs audit trail

## Agent Assignment
This command activates the **deployment-strategist** agent for execution.

## Skills Used
- harness-eks-deployments
- harness-code-integration
- harness-keycloak-auth

## Workflow

1. **Pre-Flight Checks**
   - Lint Helm chart
   - Security scan (Trivy, Checkov)
   - Validate values file
   - Check Keycloak client
   - Verify ECR image exists

2. **Trigger Pipeline**
   - Find appropriate Harness pipeline
   - Set input variables
   - Start execution
   - Subscribe to updates

3. **Monitor Deployment**
   - Stream pipeline logs
   - Track stage progress
   - Report pod status
   - Check health endpoints

4. **Post-Deploy Validation**
   - Run smoke tests
   - Verify Keycloak auth
   - Check metrics
   - Update status

5. **Report & Cleanup**
   - Generate deployment report
   - Update deployment history
   - Notify relevant channels

## Rollback

If deployment fails or issues are detected:

```bash
# Automatic rollback (if enabled in pipeline)
# Or manual rollback:
/eks:ship staging --version=<previous-version>
```

## Output Formats

### Default (Interactive)
Rich terminal output with progress bars and colors.

### JSON (for CI)
```bash
/eks:ship staging --output=json
```

### Quiet (Minimal)
```bash
/eks:ship staging --quiet
```

## Integration

### Jira
If `JIRA_KEY` environment variable is set:
- Updates issue status
- Adds deployment comment
- Links to Harness execution

### Slack
If configured:
- Sends deployment notification
- Posts success/failure summary
- Includes rollback button for failures

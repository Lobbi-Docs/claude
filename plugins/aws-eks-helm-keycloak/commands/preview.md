---
description: Create ephemeral preview environment for feature branch testing with unique URL and Keycloak client
---

# Preview

Create an isolated preview environment for your feature branch with its own URL and Keycloak configuration.

## Usage
```
/eks:preview [options]
```

## Options
- `--branch` - Branch to deploy (default: current branch)
- `--service` - Service to preview (default: auto-detect)
- `--ttl` - Time-to-live before auto-cleanup (default: `24h`)
- `--base-env` - Base environment for config (default: `dev`)
- `--keycloak` - Create preview Keycloak client (default: `true`)
- `--seed-data` - Include seed data (default: `false`)
- `--notify` - Send notification with preview URL (default: `true`)
- `--pr` - Link to PR number for auto-cleanup on merge

## Examples

### Preview Current Branch
```bash
/eks:preview
```
Creates preview for current Git branch.

### Preview Specific Branch
```bash
/eks:preview --branch=feature/new-auth
```

### Extended TTL
```bash
/eks:preview --ttl=72h
```

### Link to PR
```bash
/eks:preview --pr=142
```
Auto-cleanup when PR #142 is merged/closed.

### Preview with Seed Data
```bash
/eks:preview --seed-data
```

## What Gets Created

```
PREVIEW ENVIRONMENT: feature-new-auth-abc12
═════════════════════════════════════════════════════════════════════════

🌐 NAMESPACE: preview-feature-new-auth-abc12

📦 DEPLOYED SERVICES:
   └── api-gateway (from feature/new-auth)

🔗 ACCESS:
   ├── URL: https://preview-abc12.dev.example.com
   └── API: https://api-preview-abc12.dev.example.com

🔐 KEYCLOAK:
   ├── Client ID: preview-abc12-client
   ├── Realm: development
   └── Redirect: https://preview-abc12.dev.example.com/*

⏰ LIFECYCLE:
   ├── Created: 2024-01-15 10:30 UTC
   ├── TTL: 24 hours
   ├── Expires: 2024-01-16 10:30 UTC
   └── Linked PR: #142 (auto-cleanup on merge)

🧑‍💻 TEST CREDENTIALS:
   ├── Username: testuser
   └── Password: testpass

═════════════════════════════════════════════════════════════════════════
```

## Preview Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EKS Dev Cluster                              │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │   main namespace     │  │  preview-abc12       │ ← Isolated      │
│  │   ─────────────────  │  │  ─────────────────── │                 │
│  │   api-gateway (main) │  │  api-gateway (PR)    │                 │
│  │   user-service       │  │  (shared deps)       │                 │
│  │   payment-service    │  │                      │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                      │
│  Ingress: *.dev.example.com                                          │
│  ├── api-gateway.dev.example.com → main/api-gateway                 │
│  └── preview-abc12.dev.example.com → preview-abc12/api-gateway      │
└─────────────────────────────────────────────────────────────────────┘
```

## Keycloak Preview Client

Each preview gets its own Keycloak client:

```json
{
  "clientId": "preview-abc12-client",
  "enabled": true,
  "redirectUris": [
    "https://preview-abc12.dev.example.com/*"
  ],
  "webOrigins": [
    "https://preview-abc12.dev.example.com"
  ],
  "attributes": {
    "preview.branch": "feature/new-auth",
    "preview.pr": "142",
    "preview.expires": "2024-01-16T10:30:00Z"
  }
}
```

## Agent Assignment
This command activates the **dev-assistant** agent for creation and troubleshooting.

## Skills Used
- local-eks-development
- harness-eks-deployments
- harness-keycloak-auth

## Workflow

1. **Generate Preview ID**
   - Create unique identifier from branch name
   - Validate namespace doesn't conflict

2. **Create Namespace**
   - Apply namespace with TTL annotations
   - Copy secrets from base environment
   - Setup network policies

3. **Configure Keycloak**
   - Create preview-specific client
   - Configure redirect URIs
   - Generate temporary credentials

4. **Deploy Service**
   - Build from feature branch
   - Deploy to preview namespace
   - Configure ingress routing

5. **Verify & Report**
   - Wait for pods ready
   - Test health endpoints
   - Generate access report
   - Send notification

## Cleanup

### Manual Cleanup
```bash
/eks:preview --cleanup=preview-abc12
```

### Automatic Cleanup
- After TTL expires (cron job)
- When linked PR is merged/closed (webhook)
- When branch is deleted

## List Active Previews

```bash
/eks:preview --list
```

Output:
```
ACTIVE PREVIEW ENVIRONMENTS
═══════════════════════════════════════════════════════════════════════

ID              BRANCH              PR    CREATED         EXPIRES
──────────────────────────────────────────────────────────────────────
preview-abc12   feature/new-auth    142   2h ago          22h
preview-def34   fix/payment-bug     156   5h ago          19h
preview-ghi56   feature/dashboard   -     1d ago          Expired

Total: 3 previews (1 expired)
```

## PR Integration

When linked to a PR (`--pr=142`):

1. **On PR Update**
   - Automatically redeploys with new commits

2. **On PR Merge**
   - Triggers cleanup job
   - Removes namespace
   - Deletes Keycloak client

3. **PR Comments**
   - Posts preview URL as comment
   - Updates on redeploy
   - Confirms cleanup

## Resource Limits

Preview environments have restricted resources:

```yaml
resourceQuota:
  requests.cpu: "2"
  requests.memory: "4Gi"
  limits.cpu: "4"
  limits.memory: "8Gi"
  pods: "20"

limitRange:
  default:
    cpu: "200m"
    memory: "256Mi"
  max:
    cpu: "1"
    memory: "1Gi"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Preview URL not accessible | Check ingress configuration, verify DNS |
| Pods not starting | Check resource quota, review events |
| Keycloak auth fails | Verify client redirect URIs |
| Auto-cleanup not working | Check CronJob, verify TTL annotation |

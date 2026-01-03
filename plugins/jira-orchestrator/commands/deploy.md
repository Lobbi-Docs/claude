---
name: jira:deploy
description: Track deployment, update Jira with status, timestamps, metadata
arguments:
  - name: environment
    description: Target environment (dev|staging|production)
    required: true
  - name: --issue
    description: Jira issue key (auto-detected from commits if omitted)
    required: false
  - name: --version
    description: Release version tag
    required: false
  - name: --url
    description: Deployment URL
    required: false
  - name: --status
    description: Status (pending|in_progress|success|failure)
    required: false
    default: success
  - name: --rollback
    description: Mark as rollback deployment
    required: false
    type: boolean
---

# Deployment Tracking

Track deployments to environments, update Jira with status, timestamps, metadata.

## Quick Usage

```bash
/jira:deploy production --issue PROJ-123 --version v1.2.0
/jira:deploy staging                          # Auto-detect issues
/jira:deploy production --rollback --version v1.1.9
```

## Execution Flow

| Step | Action |
|------|--------|
| 1 | Setup: Connect Atlassian, verify config |
| 2 | Map Environment: Resolve to Jira fields & transitions |
| 3 | Detect Issues: --issue arg > commits > branch > PRs |
| 4 | Fetch Issues: Get full details from Jira |
| 5 | Build Comment: Generate deployment comment |
| 6 | Update Fields: Set status & timestamp |
| 7 | Update Version: Create/update fix version (prod) |
| 8 | Transition: Auto-transition based on environment |
| 9 | Post Comment: Add formatted comment |
| 10 | Report: Compile summary |

## Mandatory Standards

**HELM-FIRST (ENFORCED):**
- Prod/Staging: Helm + Kubernetes REQUIRED
- Dev: Helm or Docker Compose

Validation:
- Helm charts in `deployment/helm/`
- Environment-specific values file
- `helm lint` passes
- No Docker Compose for staging/prod
- Changes merged via PR

## Configuration

`.jira/config.yml`:
```yaml
jira:
  environments:
    production:
      jira_field: customfield_10102
      auto_transition: Released
    staging:
      jira_field: customfield_10101
      auto_transition: In QA
    development:
      jira_field: customfield_10100
      auto_transition: In Development
  fields:
    deployment_status: customfield_10203
    last_deployment: customfield_10204
```

Environment vars: `JIRA_API_TOKEN`, `JIRA_EMAIL`, `HARNESS_API_KEY` (for Harness Pipeline integration)

## Issue Detection Priority

1. `--issue` argument
2. Git commits (last 50)
3. Current branch name
4. Recent merged PRs (last 20)
5. Deployment tag annotations

## Comment Templates

**Success:**
```
✅ Deployment to {ENV}
Status: Success | Version: {VERSION} | Timestamp: {ISO8601}
URL: {DEPLOYMENT_URL}
```

**Failure:**
```
❌ Deployment Failed: {ENV}
Status: Failure | Error: {MESSAGE}
```

**Rollback:**
```
Rollback: {ENV}
From: {PREV_VERSION} | To: {ROLLBACK_VERSION}
```

## Status Transitions

| Environment | Success | Failure |
|-------------|---------|---------|
| dev | In Development | None |
| staging | In QA | In Development |
| production | Released | In QA |

## Harness Pipeline Integration

```yaml
# Harness Pipeline Step - Track Deployment
- step:
    type: ShellScript
    name: Track Jira Deployment
    identifier: track_jira_deployment
    spec:
      shell: Bash
      onDelegate: true
      source:
        type: Inline
        spec:
          script: |
            STATUS=$([[ "<+execution.status>" == "SUCCEEDED" ]] && echo "success" || echo "failure")
            claude-code /jira:deploy production \
              --version <+pipeline.variables.version> \
              --url <+stage.variables.deployment_url> \
              --status $STATUS
      environmentVariables:
        - name: JIRA_API_TOKEN
          value: <+secrets.getValue("jira_api_token")>
        - name: JIRA_EMAIL
          value: <+secrets.getValue("jira_email")>
```

## Auto Time Tracking

If duration >= 60s AND issue detected:
- Format: `[Claude] /jira:deploy - {duration}`
- Configure in `jira-orchestrator/config/time-logging.yml`

## Error Handling

| Error | Solution |
|-------|----------|
| Issue not found | Use --issue or verify commits |
| Env not configured | Add to .jira/config.yml |
| Transition unavailable | Continue with other steps |
| API rate limit | Auto-retry with backoff |

**⚓ Golden Armada** | *You ask - The Fleet Ships*

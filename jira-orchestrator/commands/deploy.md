---
name: jira:deploy
description: Track deployment to environment and update Jira issues with deployment status
arguments:
  - name: environment
    description: Target environment (dev, staging, production)
    required: true
  - name: --issue
    description: Jira issue key to track (auto-detected from commits if omitted)
    required: false
  - name: --version
    description: Release version tag
    required: false
  - name: --url
    description: Deployment URL
    required: false
  - name: --status
    description: Deployment status (pending, in_progress, success, failure)
    required: false
    default: success
  - name: --rollback
    description: Mark this as a rollback deployment
    required: false
    type: boolean
examples:
  - command: /jira:deploy production --issue PROJ-123 --version v1.2.0
    description: Track production deployment for specific issue
  - command: /jira:deploy staging
    description: Track staging deployment (auto-detect issues from commits)
  - command: /jira:deploy production --rollback
    description: Track rollback deployment
tags:
  - jira
  - deployment
  - cicd
  - tracking
---

# Deployment Tracking Workflow

This command tracks deployments to various environments and automatically updates Jira issues with deployment status, timestamps, and metadata.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:deploy - {duration}`

### Issue Key Detection Priority
1. Command argument (e.g., `${issue_key}`)
2. Git branch name (e.g., `feature/PROJ-123-desc`)
3. Environment variable `JIRA_ISSUE_KEY`
4. Current orchestration session

### Configuration
Time logging can be configured in `jira-orchestrator/config/time-logging.yml`:
- `enabled`: Toggle auto-logging (default: true)
- `threshold_seconds`: Minimum duration to log (default: 60)
- `format`: Worklog comment format (default: "[Claude] {command} - {duration}")

---

## Prerequisites

- Atlassian Cloud access configured
- Jira project with deployment tracking enabled
- Git repository with commit history
- Optional: GitHub Actions integration for CI/CD tracking

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT TRACKING WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   DETECT    │ -> │   VALIDATE  │ -> │   UPDATE    │ -> │   NOTIFY    │ │
│   │   Issues    │    │ Environment │    │    Jira     │    │   Status    │ │
│   └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│         │                  │                  │                  │         │
│         v                  v                  v                  v         │
│   Extract from       Map to config      Add deployment     Transition     │
│   commits/branch     Verify access      comment/fields     to Released    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Execution Steps

### Step 1: Environment Setup

Establish connection to Atlassian and verify environment configuration:

```yaml
action: Get Atlassian Resources
tool: mcp__plugin_jira-orchestrator_atlassian__getAccessibleAtlassianResources
expected_output:
  - cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  - site: thelobbi.atlassian.net
```

### Step 2: Environment Mapping

Map the provided environment to Jira configuration:

```yaml
action: Resolve Environment
input: ${environment}
mapping:
  development:
    jira_field: "customfield_10100"
    github_environments: ["dev", "development", "develop"]
    auto_transition: "In Development"
  staging:
    jira_field: "customfield_10101"
    github_environments: ["staging", "stage", "qa"]
    auto_transition: "In QA"
  production:
    jira_field: "customfield_10102"
    github_environments: ["production", "prod", "main"]
    auto_transition: "Released"
```

**Environment Resolution Logic:**
1. Check exact match (e.g., "production")
2. Check wildcard patterns (e.g., "prod*")
3. Check aliases from config (e.g., "main" → "production")
4. Default to "development" if unrecognized

### Step 3: Issue Detection

Extract Jira issue keys using multiple strategies:

#### Strategy 1: Explicit Argument
```yaml
condition: --issue provided
action: Use provided issue key
validation: Verify issue exists in Jira
```

#### Strategy 2: Git Commits
```bash
# Get recent commits since last deployment tag
git log --oneline --no-merges ${last_deployment_tag}..HEAD

# Extract issue keys using regex: ([A-Z]+-\d+)
# Examples:
#   "PROJ-123: Add user authentication" -> PROJ-123
#   "Fix PROJ-456 login bug" -> PROJ-456
#   "Merge PR for LF-27" -> LF-27
```

#### Strategy 3: Current Branch
```bash
# Extract from branch name
git rev-parse --abbrev-ref HEAD

# Pattern matching:
#   "feature/PROJ-123-user-auth" -> PROJ-123
#   "bugfix/LF-456-fix-login" -> LF-456
#   "hotfix/PROJ-789" -> PROJ-789
```

#### Strategy 4: Merged PRs
```bash
# Get PRs merged since last deployment
gh pr list --state merged --limit 20

# Extract issue keys from PR titles and descriptions
```

**Issue Detection Priority:**
1. `--issue` argument (highest priority)
2. Git commit messages (last 50 commits)
3. Current branch name
4. Recent merged PRs (last 20)
5. Deployment tag annotations

### Step 4: Fetch Jira Issues

Retrieve full issue details for all detected keys:

```yaml
action: Get Jira Issues
tool: mcp__plugin_jira-orchestrator_atlassian__getJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${detected_issue_key}
  expand: renderedFields,changelog,transitions
fields_to_check:
  - status.name
  - fixVersions
  - customfield_10102  # deployment status
  - customfield_10204  # last deployment timestamp
```

### Step 5: Build Deployment Comment

Generate deployment comment with comprehensive metadata:

#### For Successful Deployment

```markdown
## ✅ Deployment to ${ENVIRONMENT}

**Status:** Success
**Version:** ${VERSION}
**Timestamp:** ${ISO_8601_TIMESTAMP}
**URL:** ${DEPLOYMENT_URL}

### Deployment Details

- **Environment:** ${environment}
- **Deployed By:** ${GITHUB_ACTOR || git config user.name}
- **Commit SHA:** ${COMMIT_SHA}
- **Build ID:** ${GITHUB_RUN_ID || CI_BUILD_ID}

### Changes Included

${COMMIT_MESSAGES_SINCE_LAST_DEPLOYMENT}

### Verification

- [ ] Service health check passed
- [ ] Database migrations applied
- [ ] Smoke tests completed

---
*Deployed via [GitHub Actions](${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID})*
```

#### For Failed Deployment

```markdown
## ❌ Deployment Failed: ${ENVIRONMENT}

**Status:** Failure
**Version:** ${VERSION}
**Timestamp:** ${ISO_8601_TIMESTAMP}
**Error:** ${ERROR_MESSAGE}

### Failure Details

- **Environment:** ${environment}
- **Failed At:** ${FAILURE_STAGE}
- **Build ID:** ${GITHUB_RUN_ID || CI_BUILD_ID}
- **Logs:** [View Logs](${LOGS_URL})

### Next Steps

1. Review error logs above
2. Check deployment configuration
3. Verify environment health
4. Retry or rollback as needed

---
*Failed deployment tracked via automation*
```

#### For Rollback

```markdown
## 🔄 Rollback Deployment: ${ENVIRONMENT}

**Status:** Rolled Back
**Previous Version:** ${PREVIOUS_VERSION}
**Rollback To:** ${ROLLBACK_VERSION}
**Timestamp:** ${ISO_8601_TIMESTAMP}

### Rollback Details

- **Environment:** ${environment}
- **Reason:** ${ROLLBACK_REASON}
- **Rolled Back By:** ${GITHUB_ACTOR || git config user.name}
- **Original Deployment:** ${ORIGINAL_DEPLOYMENT_TIMESTAMP}

### Reference

- Original deployment comment: [Link](#comment_${ORIGINAL_COMMENT_ID})
- Incident tracking: ${INCIDENT_LINK}

---
*Rollback completed via automation*
```

### Step 6: Update Jira Custom Fields

Update deployment tracking fields:

```yaml
action: Update Issue
tool: mcp__plugin_jira-orchestrator_atlassian__updateJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${issue_key}
  fields:
    # Last deployment timestamp
    customfield_10204:
      type: datetime
      value: ${ISO_8601_TIMESTAMP}

    # Deployment status
    customfield_10203:
      type: select
      value: ${status}  # success, failure, pending, in_progress

    # Environment field (for production)
    customfield_10102:
      type: text
      value: ${DEPLOYMENT_URL}
```

### Step 7: Update Fix Version (Production Only)

For production deployments, update or create fix version:

```yaml
condition: environment == "production" AND status == "success"
action: Update Fix Version
logic:
  - Check if version exists
  - Create version if not exists
  - Add issue to version
  - Mark version as released (if all issues deployed)

tool: mcp__plugin_jira-orchestrator_atlassian__updateJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${issue_key}
  fields:
    fixVersions:
      - name: ${VERSION}
```

**Version Naming Conventions:**
- Semantic versioning: `v1.2.3`
- Date-based: `2025-12-19`
- Sprint-based: `Sprint-42`
- Custom: Any string from `--version` argument

### Step 8: Transition Issue Status

Auto-transition based on environment and deployment status:

```yaml
action: Transition Issue
tool: mcp__plugin_jira-orchestrator_atlassian__transitionJiraIssue
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${issue_key}
  transitionId: ${resolved_transition_id}

transition_mapping:
  development:
    success: "In Development"
    failure: null  # No transition on failure
  staging:
    success: "In QA"
    failure: "In Development"  # Move back
  production:
    success: "Released"
    failure: "In QA"  # Move back for investigation
```

**Transition Resolution:**
1. Get available transitions for issue
2. Match by name from config (`auto_transition`)
3. If not found, search by similar names
4. Skip if no matching transition

### Step 9: Add Deployment Comment

Post the formatted comment to Jira:

```yaml
action: Add Comment
tool: mcp__plugin_jira-orchestrator_atlassian__addJiraComment
parameters:
  cloudId: c4423066-5fa2-4ba6-b734-21595003e7dd
  issueIdOrKey: ${issue_key}
  body: ${deployment_comment}
  visibility:
    type: role
    value: Developers  # Optional: restrict visibility
```

### Step 10: Generate Summary Report

Compile deployment tracking results:

```markdown
## Deployment Tracking Summary

**Environment:** ${environment}
**Status:** ${overall_status}
**Timestamp:** ${ISO_8601_TIMESTAMP}

### Issues Updated

| Issue | Title | Status Before | Status After | Version |
|-------|-------|---------------|--------------|---------|
| PROJ-123 | User Auth | In QA | Released | v1.2.0 |
| PROJ-124 | API Fix | In QA | Released | v1.2.0 |

### Deployment Metadata

- **Version:** ${VERSION}
- **URL:** ${DEPLOYMENT_URL}
- **Commit SHA:** ${COMMIT_SHA_SHORT}
- **Build ID:** ${BUILD_ID}
- **Duration:** ${DEPLOYMENT_DURATION}

### Actions Taken

- ✅ Updated ${issue_count} Jira issues
- ✅ Added deployment comments
- ✅ Updated fix versions
- ✅ Transitioned ${transitioned_count} issues to Released

### Verification Links

- [Deployment URL](${DEPLOYMENT_URL})
- [Build Logs](${BUILD_LOGS_URL})
- [Jira Board](https://thelobbi.atlassian.net/jira/software/projects/${PROJECT_KEY})

### Next Steps

${NEXT_STEPS_BASED_ON_STATUS}
```

## Usage Examples

### Example 1: Production Deployment (Manual)

```bash
/jira:deploy production --issue PROJ-123 --version v1.2.0 --url https://app.example.com
```

**Expected Output:**
```markdown
## Deployment Tracking Summary

**Environment:** production
**Status:** success
**Timestamp:** 2025-12-19T14:30:00Z

### Issues Updated

| Issue | Title | Status Before | Status After | Version |
|-------|-------|---------------|--------------|---------|
| PROJ-123 | Feature X | In QA | Released | v1.2.0 |

### Actions Taken

- ✅ Updated 1 Jira issue
- ✅ Added deployment comment
- ✅ Updated fix version to v1.2.0
- ✅ Transitioned issue to Released
```

### Example 2: Staging Deployment (Auto-detect)

```bash
/jira:deploy staging
```

**Behavior:**
1. Scans last 50 commits for issue keys
2. Finds: PROJ-124, PROJ-125, LF-27
3. Updates all 3 issues with staging deployment
4. Transitions to "In QA"
5. No fix version update (staging only)

### Example 3: Failed Production Deployment

```bash
/jira:deploy production --status failure --version v1.2.1
```

**Expected Output:**
```markdown
## Deployment Tracking Summary

**Environment:** production
**Status:** failure
**Timestamp:** 2025-12-19T15:00:00Z

### Issues Affected

| Issue | Comment Added | Status Changed | Alert Sent |
|-------|---------------|----------------|------------|
| PROJ-126 | Yes | In QA (rollback) | Yes |

### Failure Details

- **Build ID:** 12345
- **Error Stage:** Database migration
- **Logs:** [View Logs](...)

### Actions Taken

- ⚠️ Added failure alert to 1 issue
- ⚠️ Rolled back status to In QA
- ⚠️ No fix version applied
- ⚠️ Sent notifications
```

### Example 4: Rollback Deployment

```bash
/jira:deploy production --rollback --version v1.1.9
```

**Expected Output:**
```markdown
## Deployment Tracking Summary

**Environment:** production
**Status:** rollback
**Timestamp:** 2025-12-19T15:30:00Z

### Rollback Details

- **From Version:** v1.2.1 (failed)
- **To Version:** v1.1.9
- **Issues Affected:** PROJ-126, PROJ-127

### Actions Taken

- 🔄 Added rollback comments to 2 issues
- 🔄 Referenced original deployment
- 🔄 Updated deployment status to "rolled back"
- 🔄 Kept issues in current status (no auto-transition)

### Investigation Required

Issues returned to previous stable state. Team should:
1. Review failure logs
2. Fix root cause
3. Plan new deployment
```

### Example 5: Development Deployment

```bash
/jira:deploy dev --version dev-build-456
```

**Behavior:**
- Auto-detects issues from branch/commits
- Adds lightweight deployment comment
- No status transition (dev deployments are frequent)
- No fix version (development only)

## GitHub Actions Integration

### Workflow Example

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for commit scanning

      - name: Deploy to Production
        id: deploy
        run: |
          # Your deployment logic here
          echo "deployment_url=https://app.example.com" >> $GITHUB_OUTPUT

      - name: Track Deployment in Jira
        if: always()
        run: |
          # Determine status
          if [ "${{ steps.deploy.outcome }}" == "success" ]; then
            STATUS="success"
          else
            STATUS="failure"
          fi

          # Run Claude CLI command
          claude-code /jira:deploy production \
            --version ${{ github.ref_name }} \
            --url ${{ steps.deploy.outputs.deployment_url }} \
            --status $STATUS
        env:
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Multi-Environment Workflow

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main, develop]

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: ./deploy.sh staging
      - name: Track in Jira
        run: claude-code /jira:deploy staging --status success

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: ./deploy.sh production
      - name: Track in Jira
        run: |
          claude-code /jira:deploy production \
            --version "prod-$(date +%Y%m%d-%H%M)" \
            --status success
```

## Multi-Cloud Support

The command is cloud-agnostic and works with any deployment platform:

### AWS Deployment

```bash
# After AWS deployment
DEPLOYMENT_URL=$(aws cloudformation describe-stacks \
  --stack-name myapp \
  --query 'Stacks[0].Outputs[?OutputKey==`ServiceURL`].OutputValue' \
  --output text)

/jira:deploy production \
  --version $VERSION \
  --url $DEPLOYMENT_URL \
  --status success
```

### GCP Deployment

```bash
# After GCP deployment
DEPLOYMENT_URL=$(gcloud run services describe myapp \
  --region us-central1 \
  --format 'value(status.url)')

/jira:deploy production \
  --version $VERSION \
  --url $DEPLOYMENT_URL \
  --status success
```

### Azure Deployment

```bash
# After Azure deployment
DEPLOYMENT_URL=$(az webapp show \
  --name myapp \
  --resource-group mygroup \
  --query 'defaultHostName' \
  --output tsv)

/jira:deploy production \
  --version $VERSION \
  --url https://$DEPLOYMENT_URL \
  --status success
```

### Kubernetes Deployment

```bash
# After Kubernetes deployment
VERSION=$(kubectl get deployment myapp \
  -o jsonpath='{.spec.template.spec.containers[0].image}' | \
  cut -d: -f2)

/jira:deploy production \
  --version $VERSION \
  --url https://myapp.k8s.example.com \
  --status success
```

## Configuration

### .jira/config.yml

The command reads deployment configuration from `.jira/config.yml`:

```yaml
jira:
  environments:
    development:
      jira_field: "customfield_10100"
      github_environments: ["dev", "development", "develop"]
      auto_transition: "In Development"

    staging:
      jira_field: "customfield_10101"
      github_environments: ["staging", "stage", "qa"]
      auto_transition: "In QA"

    production:
      jira_field: "customfield_10102"
      github_environments: ["production", "prod", "main"]
      auto_transition: "Released"

  fields:
    deployment_status: "customfield_10203"
    last_deployment: "customfield_10204"

github:
  deployments:
    workflows:
      - name: "Deploy to Development"
        environment: "development"
        track_duration: true
      - name: "Deploy to Staging"
        environment: "staging"
        track_duration: true
      - name: "Deploy to Production"
        environment: "production"
        track_duration: true
        notify_on_failure: true
```

### Environment Variables

Required environment variables:

```bash
# Jira Authentication
export JIRA_API_TOKEN="your-jira-api-token"
export JIRA_EMAIL="your-email@example.com"

# Optional: GitHub Integration
export GITHUB_TOKEN="your-github-token"

# Optional: Custom Jira Host
export JIRA_HOST="https://your-org.atlassian.net"
```

## Error Handling

### Issue Not Found

```markdown
⚠️ Warning: Could not find Jira issue PROJ-999

**Attempted Detection Methods:**
- Explicit argument: Not provided
- Git commits: No matches
- Branch name: No matches
- Merged PRs: No matches

**Recommendation:**
- Verify issue key exists in Jira
- Check commit messages include issue keys
- Use --issue argument to specify manually
```

### Environment Not Configured

```markdown
❌ Error: Environment "custom-env" not found in configuration

**Available Environments:**
- development
- staging
- production

**Configuration File:** .jira/config.yml

**Recommendation:**
Add environment to .jira/config.yml or use standard environment name.
```

### API Rate Limit

```markdown
⚠️ Warning: Jira API rate limit reached

**Details:**
- Limit: 100 requests/minute
- Current Usage: 95/100
- Reset In: 45 seconds

**Action Taken:**
- Pausing for 45 seconds
- Will retry automatically
- Progress: 3/5 issues updated
```

### Transition Failure

```markdown
⚠️ Warning: Could not transition PROJ-123 to "Released"

**Reason:** Status "Released" not available from current status "In Development"

**Current Status:** In Development
**Attempted Transition:** Released
**Available Transitions:** In Progress, Cancelled

**Action Taken:**
- Skipped transition
- Comment still added
- Fix version still updated
```

## Integration with Other Commands

### Full Development Lifecycle

```bash
# 1. Start work
/jira-orchestrator:work PROJ-123

# 2. Create PR
/jira-orchestrator:pr

# 3. Deploy to staging (after PR merge)
/jira:deploy staging

# 4. QA review
/qa-review --ticket PROJ-123

# 5. Deploy to production
/jira:deploy production --issue PROJ-123 --version v1.2.0

# 6. Sync final status
/jira-orchestrator:sync
```

### Automated Pipeline

```bash
# In CI/CD pipeline
deploy_and_track() {
  local env=$1
  local version=$2

  # Deploy
  ./deploy.sh $env

  # Track deployment
  if [ $? -eq 0 ]; then
    /jira:deploy $env --version $version --status success
  else
    /jira:deploy $env --version $version --status failure
  fi
}

# Usage
deploy_and_track staging $(git describe --tags)
```

## Monitoring and Metrics

The command can export metrics for monitoring:

```yaml
deployment_tracking_metrics:
  - name: deployments_total
    type: counter
    labels: [environment, status]
    help: Total number of deployments tracked

  - name: deployment_duration_seconds
    type: histogram
    labels: [environment]
    help: Time taken to update Jira

  - name: issues_updated_total
    type: counter
    labels: [environment, project]
    help: Total Jira issues updated per deployment
```

## Troubleshooting

### No Issues Detected

**Problem:** Command completes but says "0 issues found"

**Solutions:**
1. Check commit messages include issue keys (e.g., "PROJ-123: Fix bug")
2. Verify branch name follows pattern (e.g., "feature/PROJ-123-description")
3. Use `--issue` argument to specify manually
4. Check git log has commits since last deployment

### Comment Not Appearing

**Problem:** Command succeeds but no comment in Jira

**Solutions:**
1. Check Jira permissions (needs "Add Comments" permission)
2. Verify issue is not locked or restricted
3. Check cloudId is correct
4. Review Jira API logs

### Wrong Environment Mapping

**Problem:** "staging" deploys but triggers "production" transition

**Solutions:**
1. Check `.jira/config.yml` environment mapping
2. Verify environment names match exactly
3. Clear cached configuration
4. Use explicit environment from config

## Related Commands

- `/jira-orchestrator:work` - Full development workflow
- `/jira-orchestrator:pr` - Create pull request with Jira tracking
- `/jira-orchestrator:sync` - Sync Jira with GitHub
- `/qa-review` - QA review workflow

## Success Criteria

A successful deployment tracking session means:

- [ ] Environment correctly identified and mapped
- [ ] Jira issues detected (from commits/branch/argument)
- [ ] Deployment comments added to all issues
- [ ] Custom fields updated with deployment metadata
- [ ] Fix versions updated (production only)
- [ ] Issues transitioned to appropriate status
- [ ] Summary report generated
- [ ] No data loss or incorrect updates

## Security Considerations

### API Token Security

- Store API tokens in environment variables
- Never commit tokens to version control
- Use GitHub Secrets for CI/CD workflows
- Rotate tokens regularly

### Webhook Security

- Verify webhook signatures
- Use HTTPS for all API calls
- Implement rate limiting
- Log all API interactions

### Access Control

- Respect Jira permission model
- Don't override status transitions if not allowed
- Handle permission errors gracefully
- Audit deployment tracking actions

## Performance Optimization

### Batch Updates

```yaml
optimization: Batch API calls
logic:
  - Collect all issues to update
  - Group by update type
  - Execute in parallel where possible
  - Use bulk update APIs when available

expected_improvement:
  - 70% reduction in API calls
  - 50% faster execution
  - Better rate limit utilization
```

### Caching

```yaml
optimization: Cache Jira metadata
cache:
  - Available transitions per project
  - Custom field IDs
  - Project configurations
  - User permissions

ttl: 5 minutes
invalidation: On config change
```

### Async Processing

```yaml
optimization: Async deployment tracking
logic:
  - Queue deployment event
  - Return immediately to deployment pipeline
  - Process Jira updates asynchronously
  - Report results via webhook or comment

benefit: Non-blocking deployment pipeline
```

## Future Enhancements

Planned features for future versions:

- [ ] Deployment rollback automation
- [ ] Deployment health monitoring integration
- [ ] Slack/Teams notifications
- [ ] Deployment approval workflows
- [ ] Multi-region deployment tracking
- [ ] Deployment frequency metrics
- [ ] DORA metrics integration
- [ ] Custom deployment templates
- [ ] Deployment scheduling
- [ ] Blue/green deployment tracking

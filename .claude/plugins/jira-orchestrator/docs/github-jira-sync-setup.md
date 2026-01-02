# GitHub-Jira Synchronization Setup Guide

Complete setup guide for the `github-jira-sync` agent to automate bidirectional synchronization between GitHub and Jira.

## Prerequisites

- Active Jira Cloud instance
- GitHub repository with admin access
- Claude orchestration system installed
- MCP Docker server configured
- Environment variables configured

## Quick Start (5 Minutes)

### 1. Create Configuration File

```bash
# Copy example config to your repository
mkdir -p .jira
cp jira-orchestrator/examples/.jira-config.example.yml .jira/config.yml

# Edit configuration
nano .jira/config.yml
```

Update these required fields:
- `jira.host` - Your Jira instance URL
- `jira.projects.default` - Your default Jira project key
- `github.repository.owner` - Your GitHub organization
- `github.repository.name` - Your repository name

### 2. Configure Jira Custom Fields

Create custom fields in Jira for tracking GitHub data:

1. Go to Jira Settings → Issues → Custom Fields
2. Create these fields:

| Field Name | Type | Field ID (update in config) |
|------------|------|----------------------------|
| GitHub Branch | Text Field (single line) | customfield_10200 |
| GitHub PR URL | URL | customfield_10201 |
| Build Status | Text Field (single line) | customfield_10202 |
| Deployment Status | Text Field (multi-line) | customfield_10203 |
| Last Deployment | Date Time Picker | customfield_10204 |

3. Update field IDs in `.jira/config.yml`:

```yaml
jira:
  fields:
    branch_name: "customfield_10200"  # Update with actual IDs
    pr_url: "customfield_10201"
    build_status: "customfield_10202"
    deployment_status: "customfield_10203"
    last_deployment: "customfield_10204"
```

### 3. Set Up Environment Variables

Create `.env` file in your repository root:

```bash
# Jira Authentication
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# GitHub Authentication
GITHUB_TOKEN=ghp_your-github-personal-access-token

# Webhook Security (optional but recommended)
GITHUB_WEBHOOK_SECRET=your-random-secret-string
```

**Generate Jira API Token:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Name it "GitHub Sync" and copy the token

**Generate GitHub Personal Access Token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`, `write:packages`
4. Copy the token

### 4. Configure GitHub Webhooks (Recommended)

For real-time synchronization:

1. Go to your GitHub repository → Settings → Webhooks
2. Click "Add webhook"
3. Configure:
   - **Payload URL**: `https://your-server.com/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: Same as `GITHUB_WEBHOOK_SECRET` in `.env`
   - **Events**: Select individual events:
     - [x] Pull requests
     - [x] Pushes
     - [x] Deployment statuses
     - [x] Workflow runs

4. Click "Add webhook"

### 5. Test the Integration

```bash
# Test branch sync
git checkout -b feature/PROJ-123-test-sync
git push -u origin feature/PROJ-123-test-sync

# Check Jira issue PROJ-123 for branch comment
```

## Detailed Setup

### Environment-Specific Configuration

Configure deployment environments in `.jira/config.yml`:

```yaml
jira:
  environments:
    development:
      jira_field: "customfield_10100"  # Create this custom field
      github_environments:
        - "dev"
        - "development"
      auto_transition: "In Development"

    staging:
      jira_field: "customfield_10101"
      github_environments:
        - "staging"
        - "qa"
      auto_transition: "In QA"

    production:
      jira_field: "customfield_10102"
      github_environments:
        - "production"
        - "prod"
      auto_transition: "Released"
```

Create corresponding custom fields in Jira:
- "Development Environment" (Text field)
- "Staging Environment" (Text field)
- "Production Environment" (Text field)

### Workflow Automation Rules

Configure auto-transitions based on GitHub events:

```yaml
jira:
  workflows:
    branch_created:
      - condition: "branch matches feature/*"
        transition: "In Progress"

    pr_opened:
      - condition: "PR is not draft"
        transition: "In Review"

    pr_merged:
      - condition: "PR merged to main"
        transition: "Done"
```

**Verify transitions exist:**
1. Go to Jira Settings → Issues → Workflows
2. View your project's workflow
3. Ensure transitions match the names in config

### Smart Commit Setup

Enable smart commit processing:

```yaml
jira:
  smart_commits:
    enabled: true
    commands:
      - comment    # Add comments via #comment
      - time       # Log work via #time
      - transition # Transition via #transition
```

**Train your team:**
```bash
# Example smart commit message
git commit -m "PROJ-123 Fix authentication bug

#comment Resolved OAuth2 token refresh issue
#time 2h 30m
#transition \"In Review\"
"
```

### GitHub Actions Integration

Add to your deployment workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract Jira Issues
        id: jira
        run: |
          ISSUES=$(git log --pretty=format:"%s %b" ${{ github.event.before }}..${{ github.sha }} | \
                   grep -oE '[A-Z]+-[0-9]+' | \
                   sort -u | \
                   tr '\n' ',')
          echo "issues=$ISSUES" >> $GITHUB_OUTPUT

      - name: Deploy
        run: |
          # Your deployment commands
          echo "Deploying to production..."

      - name: Notify Jira - Success
        if: success()
        env:
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # This would call the github-jira-sync agent
          # to update Jira with deployment success
          echo "Deployment successful for issues: ${{ steps.jira.outputs.issues }}"

      - name: Notify Jira - Failure
        if: failure()
        run: |
          # Notify Jira of deployment failure
          echo "Deployment failed for issues: ${{ steps.jira.outputs.issues }}"
```

### Git Hooks (Optional)

For local development, add git hooks:

```bash
# .git/hooks/post-commit
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)

if echo "$COMMIT_MSG" | grep -qE '#(comment|time|transition)'; then
    echo "Smart commit detected, processing..."
    # Call github-jira-sync agent
fi
```

Make executable:
```bash
chmod +x .git/hooks/post-commit
```

## Usage Examples

### Example 1: Feature Development

```bash
# 1. Start working on Jira issue
git checkout -b feature/PROJ-123-user-auth

# → Automatically updates PROJ-123 to "In Progress"

# 2. Make changes and commit
git commit -m "PROJ-123 Implement OAuth2

#comment Added Google OAuth2 integration
#time 3h
"

# → Adds comment and logs 3 hours to PROJ-123

# 3. Push and create PR
git push -u origin feature/PROJ-123-user-auth
gh pr create --title "[PROJ-123] feat: Add user authentication"

# → Transitions PROJ-123 to "In Review"
# → Adds PR link to PROJ-123

# 4. After approval and merge
# → Automatically transitions PROJ-123 to "Done"
```

### Example 2: Bug Fix

```bash
# 1. Create hotfix branch
git checkout -b hotfix/PROJ-456-fix-login

# → Updates PROJ-456 to "In Progress"

# 2. Fix and commit with transition
git commit -m "PROJ-456 Fix login redirect

#comment Fixed OAuth2 callback URL
#time 1h 30m
#transition \"In Review\"
"

# → Adds comment, logs time, and transitions to "In Review"

# 3. Create PR (will already be in review status)
gh pr create --title "[PROJ-456] fix: Resolve login redirect issue"
```

### Example 3: Deployment Tracking

```bash
# Deploy to staging (via GitHub Actions)
git push origin develop

# → Automatically updates all related Jira issues:
#   - Adds deployment comment
#   - Updates "Staging Environment" field
#   - Transitions to "In QA"

# Deploy to production
git push origin main

# → Updates Jira issues:
#   - Adds production deployment comment
#   - Updates "Production Environment" field
#   - Transitions to "Released"
```

## Monitoring

### Check Sync Status

```bash
# View sync logs
tail -f .jira/sync.log

# Check last sync
cat .jira/sync.log | grep "Sync complete"

# Count successful syncs today
cat .jira/sync.log | grep "$(date +%Y-%m-%d)" | grep "SUCCESS" | wc -l
```

### Common Issues

**Issue: Branch not syncing**
```bash
# Check branch name contains Jira key
git branch --show-current
# Should match: feature/PROJ-123-description

# Verify issue exists
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  https://your-org.atlassian.net/rest/api/3/issue/PROJ-123
```

**Issue: Smart commits not processing**
```bash
# Verify commit message format
git log -1 --pretty=%B
# Should contain: PROJ-123 and #command syntax

# Check config
grep "smart_commits:" .jira/config.yml
# Should show: enabled: true
```

**Issue: Webhooks not triggering**
```bash
# Check webhook deliveries in GitHub
# Go to: Repository → Settings → Webhooks → Recent Deliveries

# Verify webhook secret matches
echo $GITHUB_WEBHOOK_SECRET
```

## Best Practices

1. **Branch Naming**
   - Always use: `type/JIRA-KEY-description`
   - Types: feature, bugfix, hotfix, chore

2. **PR Titles**
   - Always include: `[JIRA-KEY]` at the start
   - Use conventional commits: `[JIRA-123] feat: Description`

3. **Smart Commits**
   - Use for quick updates without leaving terminal
   - Always include issue key: `JIRA-123`
   - Combine commands: `#comment Text #time 2h`

4. **Deployment Tracking**
   - Tag releases: `git tag v1.2.3`
   - Include version in deployment comments
   - Monitor deployment status in Jira

5. **Security**
   - Never commit `.env` file (add to `.gitignore`)
   - Rotate API tokens every 90 days
   - Use webhook secrets for production
   - Limit token scopes to minimum required

## Advanced Configuration

### Custom Field Mapping

Map additional GitHub data to Jira:

```yaml
jira:
  fields:
    # Standard fields
    branch_name: "customfield_10200"
    pr_url: "customfield_10201"

    # Additional tracking
    github_repo: "customfield_10205"      # Repository name
    commit_count: "customfield_10206"     # Number of commits
    code_changes: "customfield_10207"     # Lines added/deleted
    test_coverage: "customfield_10208"    # Test coverage %
    review_comments: "customfield_10209"  # Number of review comments
```

### Auto-Reviewer Assignment

Automatically assign reviewers based on file changes:

```yaml
github:
  pr:
    auto_reviewers:
      frontend:
        patterns: ["src/components/**", "src/pages/**"]
        reviewers: ["@alice", "@bob"]
      backend:
        patterns: ["src/api/**", "src/services/**"]
        reviewers: ["@charlie", "@david"]
      database:
        patterns: ["prisma/**", "migrations/**"]
        reviewers: ["@eve"]
        required_approvals: 2  # Override default
```

### Batch Synchronization

For repositories with many issues:

```yaml
sync:
  batch:
    enabled: true
    schedule: "0 */6 * * *"  # Every 6 hours
    max_items: 100
    priority:
      - "open_prs"        # Sync open PRs first
      - "active_branches" # Then active branches
      - "recent_commits"  # Then recent commits
```

## Troubleshooting

### Enable Debug Mode

```yaml
monitoring:
  debug_mode: true
  log_file: ".jira/sync.log"
```

### Test Sync Manually

```bash
# Test branch sync
./jira-orchestrator/scripts/test-sync.sh branch PROJ-123

# Test PR sync
./jira-orchestrator/scripts/test-sync.sh pr 42

# Test deployment sync
./jira-orchestrator/scripts/test-sync.sh deployment production
```

### Verify Configuration

```bash
# Validate config file
./jira-orchestrator/scripts/validate-config.sh

# Test Jira connection
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  https://your-org.atlassian.net/rest/api/3/myself

# Test GitHub connection
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user
```

## Support

- Documentation: `jira-orchestrator/agents/github-jira-sync.md`
- Examples: `jira-orchestrator/examples/`
- Issues: GitHub Issues
- Questions: Slack #dev-tools

---

**Next Steps:**
1. Complete the Quick Start section
2. Test with a sample issue
3. Enable webhook integration
4. Train team on smart commits
5. Monitor sync logs for issues

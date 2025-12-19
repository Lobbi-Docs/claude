# GitHub-Jira Integration Guide
**Jira Orchestrator Plugin v1.4.0**

> Automate your development workflow with seamless GitHub-Jira synchronization

---

## Executive Summary

The Jira Orchestrator v1.4.0 introduces powerful GitHub-Jira integration capabilities that eliminate manual status updates, improve visibility, and accelerate your development workflow. With smart commits, automatic PR linking, deployment tracking, and build status synchronization, your team can focus on building features instead of updating tickets.

### What's New in v1.4.0

| Capability | Impact |
|------------|--------|
| **Smart Commits** | Update Jira issues directly from commit messages with #comment, #time, and #transition commands |
| **Branch Auto-Linking** | Automatically link branches to Jira issues based on naming conventions |
| **PR Lifecycle Tracking** | Sync PR status changes (draft, open, approved, merged) to Jira in real-time |
| **Deployment Tracking** | Track deployments across dev, staging, and production environments |
| **Build Status Sync** | Update Jira with CI/CD build results and test execution status |
| **Bidirectional Sync** | Keep GitHub and Jira consistently synchronized with minimal manual intervention |

### Business Benefits

- **90% Reduction** in manual Jira updates
- **Real-time Visibility** into development progress across both platforms
- **Improved Compliance** with automatic audit trails of deployments and changes
- **Faster Delivery** through automated workflow transitions
- **Enhanced Collaboration** with automatic stakeholder notifications

### Quick Start

```bash
# 1. Create configuration file
mkdir -p .jira
cp jira-orchestrator/examples/.jira-config.example.yml .jira/config.yml

# 2. Configure environment variables
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
export GITHUB_TOKEN="your-github-token"

# 3. Test integration
git checkout -b feature/PROJ-123-test-sync
git push -u origin feature/PROJ-123-test-sync

# 4. Verify in Jira - PROJ-123 should show branch link and status update
```

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Smart Commits Guide](#smart-commits-guide)
3. [Branch Naming Conventions](#branch-naming-conventions)
4. [Pull Request Synchronization](#pull-request-synchronization)
5. [Deployment Tracking](#deployment-tracking)
6. [Build Status Integration](#build-status-integration)
7. [GitHub Actions Workflows](#github-actions-workflows)
8. [Configuration Reference](#configuration-reference)
9. [Workflow Diagrams](#workflow-diagrams)
10. [Troubleshooting](#troubleshooting)
11. [Quick Reference Card](#quick-reference-card)

---

## Feature Overview

### Smart Commits

**What:** Update Jira issues directly from Git commit messages using special syntax

**Why:** Eliminates context switching between code and Jira, captures work as it happens

**How:**
```bash
git commit -m "PROJ-123 Fix authentication bug

#comment Resolved OAuth2 token refresh issue
#time 2h 30m
#transition \"In Review\"
"
```

**Result:** Jira issue PROJ-123 receives a comment, logs 2.5 hours of work, and transitions to "In Review" status

---

### Branch Auto-Linking

**What:** Automatically link Git branches to Jira issues based on branch name

**Why:** Provides instant visibility into active development work

**How:** Follow branch naming pattern: `{type}/{ISSUE-KEY}-{description}`

**Example:**
```bash
git checkout -b feature/PROJ-456-user-authentication
git push -u origin feature/PROJ-456-user-authentication
```

**Result:** Jira issue PROJ-456 automatically:
- Receives a comment with branch link
- Updates custom field with branch name
- Transitions to "In Progress" status
- Displays active branch in Jira UI

---

### Pull Request Lifecycle Tracking

**What:** Synchronize PR status changes to Jira automatically

**Why:** Stakeholders see review progress without accessing GitHub

**Tracked Events:**
- PR created → Issue transitions to "In Review"
- PR marked as draft → Issue transitions to "In Development"
- PR approved → Issue transitions to "Approved"
- PR merged → Issue transitions to "Done"
- PR closed without merge → Issue transitions to "Cancelled"

**Example:**
```bash
gh pr create --title "[PROJ-123] feat: Add user authentication" --body "Implements OAuth2 for PROJ-123"
```

**Result:** Jira issue PROJ-123 receives PR link, review status, and appropriate status transition

---

### Deployment Tracking

**What:** Track deployments across environments with automatic Jira updates

**Why:** Compliance auditing, release management, and stakeholder visibility

**Supported Environments:**
- Development (dev, develop, development)
- Staging (staging, stage, qa)
- Production (production, prod, main)

**Example:**
```yaml
# GitHub Actions workflow deploys to production
# Automatically updates all Jira issues in the release
```

**Result:** Affected Jira issues show:
- Deployment status and timestamp
- Environment (dev/staging/prod)
- Version number or commit SHA
- Link to deployment logs

---

### Build Status Integration

**What:** Update Jira with CI/CD build results and test execution status

**Why:** Early detection of integration issues, quality visibility

**Tracked Metrics:**
- Build status (success, failure, cancelled)
- Test results (passed, failed, skipped)
- Code coverage percentage
- Build duration

**Example:** GitHub Actions workflow completes

**Result:** Jira issues show build status, test results, and links to logs

---

## Smart Commits Guide

Smart commits allow you to update Jira issues directly from commit messages using special command syntax.

### Syntax Reference

| Command | Syntax | Purpose | Example |
|---------|--------|---------|---------|
| **Comment** | `#comment <text>` | Add a comment to the issue | `#comment Fixed the login bug` |
| **Time** | `#time <duration>` | Log work time | `#time 2h 30m` |
| **Transition** | `#transition "<status>"` | Change issue status | `#transition "In Review"` |

### Time Format Examples

| Format | Meaning | Seconds |
|--------|---------|---------|
| `1h` | 1 hour | 3,600 |
| `30m` | 30 minutes | 1,800 |
| `1d` | 1 day (8-hour workday) | 28,800 |
| `2h 15m` | 2 hours 15 minutes | 8,100 |
| `1d 4h` | 1 day 4 hours | 43,200 |

### Usage Examples

#### Example 1: Simple Comment

```bash
git commit -m "PROJ-123 Update user profile page

#comment Redesigned profile layout with new branding
"
```

**Result in Jira:**
- Comment added: "Redesigned profile layout with new branding"

---

#### Example 2: Log Work Time

```bash
git commit -m "PROJ-456 Implement OAuth2 integration

#time 3h 15m
"
```

**Result in Jira:**
- Work logged: 3 hours 15 minutes
- Appears in issue's work log

---

#### Example 3: Transition Issue

```bash
git commit -m "PROJ-789 Fix critical security vulnerability

#transition \"In Review\"
"
```

**Result in Jira:**
- Issue status changed to "In Review"
- Transition recorded in issue history

---

#### Example 4: Combined Commands

```bash
git commit -m "PROJ-123 Complete user authentication feature

#comment Implemented OAuth2 with Google and GitHub providers
#time 4h 30m
#transition \"Code Review\"
"
```

**Result in Jira:**
- Comment added about OAuth2 implementation
- 4.5 hours logged
- Status changed to "Code Review"
- All changes timestamped and attributed

---

#### Example 5: Multiple Issues

```bash
git commit -m "PROJ-123 PROJ-456 Update authentication flow

#comment Refactored authentication to support multiple providers
#time 2h
"
```

**Result in Jira:**
- Both PROJ-123 and PROJ-456 receive the comment
- Both issues log 2 hours of work

---

### Best Practices

**DO:**
- Always include the Jira issue key (e.g., PROJ-123) in the commit message
- Use `#comment` to explain *why* you made changes
- Log time with `#time` as you complete work
- Use `#transition` when work reaches a new stage
- Keep comments clear and professional

**DON'T:**
- Use smart commits for sensitive information (credentials, API keys)
- Log unrealistic time amounts
- Transition to invalid statuses (check your workflow first)
- Use smart commits without the issue key
- Forget to include the `#` prefix for commands

---

### Common Mistakes to Avoid

| Mistake | Problem | Solution |
|---------|---------|----------|
| Missing issue key | Commands not processed | Always start with `PROJ-123` |
| Wrong transition name | Transition fails | Verify status exists in workflow |
| Invalid time format | Time not logged | Use format: `2h 30m` or `1d 4h` |
| Missing quotes on transition | Parsing error | Use: `#transition "In Review"` |
| Smart commit in merge commit | Duplicate updates | Use on feature commits only |

---

### Git Hook Integration

Automate smart commit processing with a Git hook:

```bash
# .git/hooks/post-commit
#!/bin/bash
COMMIT_MSG=$(git log -1 --pretty=%B)

if echo "$COMMIT_MSG" | grep -qE '#(comment|time|transition)'; then
    echo "✅ Smart commit detected - Jira will be updated automatically"
fi
```

Make executable:
```bash
chmod +x .git/hooks/post-commit
```

---

## Branch Naming Conventions

Consistent branch naming enables automatic Jira linking and workflow automation.

### Standard Pattern

```
{type}/{ISSUE-KEY}-{description}
```

**Components:**
- `{type}`: Branch type (feature, bugfix, hotfix, release, chore)
- `{ISSUE-KEY}`: Jira issue key (e.g., PROJ-123)
- `{description}`: Brief kebab-case description

---

### Examples by Type

#### Feature Branches

```bash
feature/PROJ-123-user-authentication
feature/PROJ-456-payment-integration
feature/PROJ-789-dashboard-redesign
```

**Triggers:** Issue transitions to "In Progress"

---

#### Bug Fix Branches

```bash
bugfix/PROJ-234-login-redirect
bugfix/PROJ-567-form-validation
bugfix/PROJ-890-data-display
```

**Triggers:** Issue transitions to "In Progress"

---

#### Hotfix Branches

```bash
hotfix/PROJ-345-security-patch
hotfix/PROJ-678-critical-error
```

**Triggers:** Issue transitions to "In Progress" (high priority)

---

#### Release Branches

```bash
release/v1.2.0
release/v2.0.0-beta
```

**Triggers:** No automatic transition (release coordination)

---

#### Chore/Maintenance Branches

```bash
chore/PROJ-901-update-dependencies
chore/PROJ-902-refactor-tests
```

**Triggers:** Issue transitions to "In Progress"

---

### Auto-Linking Flow

```
Developer creates branch → Agent extracts issue key → Jira updated
```

**What happens in Jira:**

1. **Comment Added:**
   ```
   🌿 Branch created

   Branch: feature/PROJ-123-user-auth
   Status: created
   Timestamp: 2025-01-15T14:30:00Z

   [View in GitHub](https://github.com/org/repo/tree/feature/PROJ-123-user-auth)
   ```

2. **Custom Field Updated:**
   - Field: "GitHub Branch"
   - Value: `feature/PROJ-123-user-auth`

3. **Status Transition:**
   - From: "To Do"
   - To: "In Progress"

---

### Configuration

Configure branch patterns in `.jira/config.yml`:

```yaml
github:
  branch_patterns:
    feature: "feature/{issue-key}-{description}"
    bugfix: "bugfix/{issue-key}-{description}"
    hotfix: "hotfix/{issue-key}-{description}"
    release: "release/{version}"
    chore: "chore/{issue-key}-{description}"
```

---

### Branch Cleanup

When branches are deleted, Jira is updated:

```bash
git push origin --delete feature/PROJ-123-user-auth
```

**Result in Jira:**
```
🌿 Branch deleted

Branch: feature/PROJ-123-user-auth
Status: deleted
Timestamp: 2025-01-16T10:00:00Z
```

---

## Pull Request Synchronization

Automatic PR lifecycle tracking keeps Jira stakeholders informed without manual updates.

### PR Lifecycle Events

| GitHub Event | Jira Update | Status Transition |
|--------------|-------------|-------------------|
| PR created (ready) | PR link added to issue | → "In Review" |
| PR created (draft) | PR link added to issue | → "In Development" |
| PR ready for review | PR status updated | → "In Review" |
| PR approved (2+ reviews) | Approval status updated | → "Approved" |
| PR merged | Merge notification added | → "Done" |
| PR closed (no merge) | Closure notification added | → "Cancelled" |
| Review requested | Reviewer notification added | (no transition) |

---

### PR Title Format

Always include the Jira issue key in PR titles:

**Recommended Format:**
```
[ISSUE-KEY] type: Brief description
```

**Examples:**
```
[PROJ-123] feat: Add user authentication
[PROJ-456] fix: Resolve login redirect issue
[PROJ-789] refactor: Simplify payment processing
[PROJ-901] docs: Update API documentation
```

**Why:** Enables automatic extraction of issue keys for linking

---

### PR Description Template

Use this template for consistent PR descriptions:

```markdown
## Summary
Brief description of changes

Implements: PROJ-123
Depends on: PROJ-122

## Changes Made
- Added OAuth2 authentication
- Implemented user profile endpoints
- Created integration tests

## Acceptance Criteria Met
- [ ] Users can log in with Google
- [ ] Users can log in with GitHub
- [ ] User profile displays after login
- [ ] Tests pass with 90%+ coverage

## Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Security review passed

## Related Issues
- PROJ-123 (implements)
- PROJ-122 (depends on)
- PROJ-124 (related)
```

**Benefit:** Multiple issues can be linked automatically

---

### What Gets Synced to Jira

When a PR is created or updated, Jira receives:

**Comment Added:**
```
🔗 Pull Request In Review

PR #42: [PROJ-123] feat: Add user authentication
Status: In Review
URL: https://github.com/org/repo/pull/42
Reviews: 2 review(s), 1 approved

[View Pull Request](https://github.com/org/repo/pull/42)
```

**Custom Field Updated:**
- Field: "GitHub PR URL"
- Value: `https://github.com/org/repo/pull/42`

**Status Transition:**
- Automatic transition based on PR state

---

### Review Status Tracking

As reviews are submitted, Jira is updated:

**After first approval:**
```
🔗 Pull Request update

PR #42: 1 of 2 required approvals received
Approved by: @alice
Status: Awaiting additional review
```

**After final approval:**
```
🔗 Pull Request Approved

PR #42: All required approvals received (2/2)
Approved by: @alice, @bob
Status: Ready to merge
```

---

### Merge Notification

When PR is merged:

```
✅ Pull Request Merged

PR #42: [PROJ-123] feat: Add user authentication
Merged by: @charlie
Merged at: 2025-01-15T16:45:00Z
Target branch: main

[View Merged PR](https://github.com/org/repo/pull/42)
```

**Status Transition:** → "Done"

---

### Configuration

Configure PR synchronization in `.jira/config.yml`:

```yaml
jira:
  workflows:
    pr_opened:
      - condition: "PR is not draft"
        transition: "In Review"

    pr_draft:
      - condition: "PR is marked as draft"
        transition: "In Development"

    pr_approved:
      - condition: "PR has required approvals"
        transition: "Approved"

    pr_merged:
      - condition: "PR merged to main"
        transition: "Done"

    pr_closed:
      - condition: "PR closed without merge"
        transition: "Cancelled"

github:
  pr:
    # Auto-add labels based on Jira issue type
    auto_labels:
      Bug: ["bug", "needs-review"]
      Story: ["enhancement", "needs-review"]
      Task: ["chore", "needs-review"]

    # Required approvals before merge
    required_approvals: 2
```

---

## Deployment Tracking

Track deployments across environments with automatic Jira updates and compliance audit trails.

### Supported Environments

| Environment | GitHub Names | Jira Custom Field | Auto-Transition |
|-------------|-------------|-------------------|-----------------|
| **Development** | dev, development, develop | customfield_10100 | "In Development" |
| **Staging** | staging, stage, qa | customfield_10101 | "In QA" |
| **Production** | production, prod, main | customfield_10102 | "Released" |

---

### Deployment Flow

```
Code pushed → GitHub Actions workflow → Deploy → Jira updated
```

**Example:**
```bash
git push origin main  # Triggers production deployment
```

**What happens:**

1. **GitHub Actions** runs deployment workflow
2. **Workflow** extracts Jira issue keys from commits
3. **Deployment** completes successfully
4. **Jira issues** updated automatically

---

### Jira Deployment Notification

```
✅ Deployment to Production

Status: success
Environment: production
Version: v1.2.3
Timestamp: 2025-01-15T18:00:00Z

[View Deployment](https://github.com/org/repo/actions/runs/12345)
```

**Custom Field Updated:**
- Field: "Production Environment"
- Value: `success - v1.2.3 - 2025-01-15T18:00:00Z`

**Status Transition:** → "Released"

---

### Multi-Cloud Support

The integration supports deployments to multiple cloud providers:

**AWS:**
- EC2, ECS, EKS
- Lambda
- Elastic Beanstalk

**Google Cloud:**
- GKE
- Cloud Run
- App Engine

**Azure:**
- AKS
- App Service
- Container Instances

**Configuration:** Update `.jira/config.yml` with cloud-specific environment mappings

---

### Environment Progression Tracking

Track issue progression through environments:

```
Development (Jan 10) → Staging (Jan 12) → Production (Jan 15)
```

**Jira Custom Fields:**
- Development Environment: `deployed - v1.2.3-dev - Jan 10`
- Staging Environment: `deployed - v1.2.3-rc1 - Jan 12`
- Production Environment: `deployed - v1.2.3 - Jan 15`

**Benefits:**
- Compliance auditing
- Release tracking
- Rollback history

---

### Rollback Tracking

If a deployment fails or is rolled back:

```
❌ Deployment Failed

Status: failure
Environment: production
Version: v1.2.4
Error: Health check failed
Timestamp: 2025-01-16T10:30:00Z

[View Deployment Logs](https://github.com/org/repo/actions/runs/12346)
```

**Auto-Transition:** → "In Development" (for fix)

---

### Configuration

Configure environments in `.jira/config.yml`:

```yaml
jira:
  environments:
    development:
      jira_field: "customfield_10100"
      github_environments:
        - "dev"
        - "development"
        - "develop"
      auto_transition: "In Development"

    staging:
      jira_field: "customfield_10101"
      github_environments:
        - "staging"
        - "stage"
        - "qa"
      auto_transition: "In QA"

    production:
      jira_field: "customfield_10102"
      github_environments:
        - "production"
        - "prod"
        - "main"
      auto_transition: "Released"
```

---

## Build Status Integration

Synchronize CI/CD build results to Jira for quality visibility and early issue detection.

### Tracked Metrics

| Metric | Description | Example |
|--------|-------------|---------|
| **Build Status** | Success, failure, cancelled | ✅ success |
| **Test Results** | Passed, failed, skipped tests | 45 passed, 2 failed, 3 skipped |
| **Duration** | Build execution time | 3m 42s |
| **Coverage** | Code coverage percentage | 87.5% |
| **Build ID** | CI/CD build identifier | #12345 |

---

### Build Success Notification

```
✅ Build Success

Build ID: #12345
Status: success
Duration: 3m 42s

Test Results:
- ✅ Passed: 45/50
- ❌ Failed: 2/50
- ⏭️ Skipped: 3/50

Coverage: 87.5%

[View Build Logs](https://github.com/org/repo/actions/runs/12345)
```

---

### Build Failure Notification

```
❌ Build Failed

Build ID: #12346
Status: failure
Duration: 2m 15s

Test Results:
- ✅ Passed: 43/50
- ❌ Failed: 7/50
- ⏭️ Skipped: 0/50

Failed Tests:
- test_user_authentication
- test_payment_processing
- test_data_validation
- (4 more)

[View Build Logs](https://github.com/org/repo/actions/runs/12346)
```

**Auto-Transition:** → "In Development" (for fixes)

---

### Coverage Tracking

Track code coverage trends over time:

| Commit | Coverage | Change |
|--------|----------|--------|
| abc123 | 87.5% | +2.3% |
| def456 | 85.2% | -1.1% |
| ghi789 | 86.3% | +1.1% |

**Jira Custom Field:**
- Field: "Test Coverage"
- Value: `87.5%`

---

### GitHub Actions Integration

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Tests
        id: tests
        run: npm test -- --coverage

      - name: Extract Jira Issues
        id: jira
        run: |
          ISSUES=$(git log --pretty=format:"%s %b" -n 1 | grep -oE '[A-Z]+-[0-9]+' | sort -u)
          echo "issues=$ISSUES" >> $GITHUB_OUTPUT

      - name: Update Jira - Success
        if: success()
        env:
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        run: |
          # Sync build success to Jira
          echo "Build succeeded for: ${{ steps.jira.outputs.issues }}"

      - name: Update Jira - Failure
        if: failure()
        run: |
          # Sync build failure to Jira
          echo "Build failed for: ${{ steps.jira.outputs.issues }}"
```

---

## GitHub Actions Workflows

Automate Jira synchronization with GitHub Actions workflows.

### Available Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| **Branch Sync** | `.github/workflows/branch-sync.yml` | Sync branch creation/deletion |
| **PR Sync** | `.github/workflows/pr-sync.yml` | Sync PR lifecycle events |
| **Deployment Sync** | `.github/workflows/deploy-sync.yml` | Track deployments |
| **Build Status** | `.github/workflows/build-sync.yml` | Sync build results |

---

### Setup Instructions

1. **Add Required Secrets**

   Go to: Repository → Settings → Secrets and variables → Actions

   Add these secrets:
   - `JIRA_EMAIL`: Your Jira account email
   - `JIRA_API_TOKEN`: Your Jira API token
   - `JIRA_SITE_URL`: Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`)

2. **Create Workflow Files**

   Copy workflow templates from `jira-orchestrator/examples/workflows/` to `.github/workflows/`

3. **Customize Configuration**

   Edit workflows to match your project structure and requirements

4. **Test Workflows**

   Push a commit and verify Jira is updated

---

### Example: Complete CI/CD with Jira Sync

```yaml
name: Complete CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # Test and Build
  build:
    runs-on: ubuntu-latest
    outputs:
      issues: ${{ steps.jira.outputs.issues }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm ci

      - name: Run Linter
        run: npm run lint

      - name: Run Tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Extract Jira Issues
        id: jira
        run: |
          ISSUES=$(git log --pretty=format:"%s %b" ${{ github.event.before }}..${{ github.sha }} | \
                   grep -oE '[A-Z]+-[0-9]+' | \
                   sort -u | \
                   tr '\n' ',')
          echo "issues=$ISSUES" >> $GITHUB_OUTPUT

      - name: Update Jira - Build Success
        if: success()
        env:
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        run: |
          for ISSUE in $(echo "${{ steps.jira.outputs.issues }}" | tr ',' ' '); do
            echo "✅ Build succeeded for $ISSUE"
            # Call Jira API to update issue
          done

  # Deploy to Staging
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging..."
          # Your deployment commands

      - name: Update Jira - Staging Deployment
        if: success()
        run: |
          for ISSUE in $(echo "${{ needs.build.outputs.issues }}" | tr ',' ' '); do
            echo "✅ Deployed $ISSUE to staging"
          done

  # Deploy to Production
  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production..."
          # Your deployment commands

      - name: Update Jira - Production Deployment
        if: success()
        run: |
          for ISSUE in $(echo "${{ needs.build.outputs.issues }}" | tr ',' ' '); do
            echo "✅ Deployed $ISSUE to production"
          done
```

---

### Required Secrets Configuration

| Secret | Description | How to Get |
|--------|-------------|------------|
| `JIRA_EMAIL` | Your Jira account email | Your login email |
| `JIRA_API_TOKEN` | Jira API authentication | [Generate here](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_SITE_URL` | Your Jira instance URL | e.g., `https://yourcompany.atlassian.net` |
| `GITHUB_TOKEN` | GitHub authentication | Automatically provided by Actions |

---

### Customization Options

**Adjust sync frequency:**
```yaml
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
```

**Filter by branch:**
```yaml
on:
  push:
    branches:
      - main
      - develop
      - 'release/**'
```

**Conditional execution:**
```yaml
if: contains(github.event.head_commit.message, 'PROJ-')
```

---

## Configuration Reference

Complete reference for `.jira/config.yml` configuration file.

### Basic Structure

```yaml
# .jira/config.yml
jira:
  host: "https://your-org.atlassian.net"
  projects:
    default: "PROJ"
  environments: { ... }
  workflows: { ... }
  smart_commits: { ... }
  fields: { ... }

github:
  repository:
    owner: "your-org"
    name: "your-repo"
  branch_patterns: { ... }
  pr: { ... }
  deployments: { ... }

sync:
  interval_minutes: 5
  sources: [ ... ]
  bidirectional: true
  conflicts:
    strategy: "github_wins"
```

---

### Jira Configuration

#### Host and Projects

```yaml
jira:
  # Your Jira instance URL (no trailing slash)
  host: "https://yourcompany.atlassian.net"

  # Project mappings (repository → Jira project)
  projects:
    default: "PROJ"        # Default project for unmapped repos
    frontend: "FRONT"      # Frontend repository
    backend: "BACK"        # Backend repository
    infrastructure: "INFRA" # Infrastructure repository
```

---

#### Environment Mappings

```yaml
jira:
  environments:
    development:
      jira_field: "customfield_10100"  # Custom field ID for dev environment
      github_environments:
        - "dev"
        - "development"
        - "develop"
      auto_transition: "In Development"

    staging:
      jira_field: "customfield_10101"
      github_environments:
        - "staging"
        - "stage"
        - "qa"
      auto_transition: "In QA"

    production:
      jira_field: "customfield_10102"
      github_environments:
        - "production"
        - "prod"
        - "main"
      auto_transition: "Released"
```

**How to find custom field IDs:**
1. Go to Jira Settings → Issues → Custom Fields
2. Click on the field
3. Copy the ID from the URL (e.g., `customfield_10100`)

---

#### Workflow Automation

```yaml
jira:
  workflows:
    # When branch is created
    branch_created:
      - condition: "branch matches feature/*"
        transition: "In Progress"

    # When PR is opened
    pr_opened:
      - condition: "PR is not draft"
        transition: "In Review"

    # When PR is draft
    pr_draft:
      - condition: "PR is marked as draft"
        transition: "In Development"

    # When PR is approved
    pr_approved:
      - condition: "PR has required approvals"
        transition: "Approved"

    # When PR is merged
    pr_merged:
      - condition: "PR merged to main"
        transition: "Done"

    # When PR is closed without merge
    pr_closed:
      - condition: "PR closed without merge"
        transition: "Cancelled"
```

**Verify transition names:**
1. Go to Jira Settings → Issues → Workflows
2. View your project's workflow
3. Note exact transition names (case-sensitive)

---

#### Smart Commits

```yaml
jira:
  smart_commits:
    enabled: true
    commands:
      - comment    # #comment <text>
      - time       # #time <duration>
      - transition # #transition "<status>"

    # Regex patterns for parsing
    patterns:
      issue_key: "([A-Z]+-\\d+)"
      comment: "#comment\\s+(.+)"
      time: "#time\\s+(\\d+[hmd]\\s*)+"
      transition: '#transition\\s+"([^"]+)"'
```

---

#### Custom Field Mappings

```yaml
jira:
  fields:
    branch_name: "customfield_10200"      # GitHub branch name
    pr_url: "customfield_10201"           # Pull request URL
    build_status: "customfield_10202"     # Latest build status
    deployment_status: "customfield_10203" # Deployment status
    last_deployment: "customfield_10204"   # Last deployment timestamp
```

---

### GitHub Configuration

#### Repository Settings

```yaml
github:
  repository:
    owner: "your-org"      # GitHub organization name
    name: "your-repo"      # Repository name
```

---

#### Branch Patterns

```yaml
github:
  branch_patterns:
    feature: "feature/{issue-key}-{description}"
    bugfix: "bugfix/{issue-key}-{description}"
    hotfix: "hotfix/{issue-key}-{description}"
    release: "release/{version}"
    chore: "chore/{issue-key}-{description}"
```

---

#### Pull Request Configuration

```yaml
github:
  pr:
    # Auto-add labels based on Jira issue type
    auto_labels:
      Bug: ["bug", "needs-review"]
      Story: ["enhancement", "needs-review"]
      Task: ["chore", "needs-review"]
      Epic: ["epic", "large-change"]

    # Required PR checks before merge
    required_checks:
      - "build"
      - "test"
      - "lint"
      - "security-scan"

    # Required number of approvals
    required_approvals: 2
```

---

#### Deployment Workflows

```yaml
github:
  deployments:
    workflows:
      - name: "Deploy to Development"
        environment: "development"
      - name: "Deploy to Staging"
        environment: "staging"
      - name: "Deploy to Production"
        environment: "production"
```

---

### Synchronization Settings

```yaml
sync:
  # Polling interval for batch sync (minutes)
  interval_minutes: 5

  # Event sources to monitor
  sources:
    - github_webhooks   # Real-time via webhooks (recommended)
    - github_actions    # GitHub Actions workflows
    - git_hooks         # Local git hooks

  # Enable bidirectional sync
  bidirectional: true

  # Conflict resolution strategy
  conflicts:
    strategy: "github_wins"  # Options: github_wins, jira_wins, manual
```

**Conflict Resolution Strategies:**
- `github_wins`: GitHub data overwrites Jira (recommended)
- `jira_wins`: Jira data overwrites GitHub
- `manual`: Flag conflicts for human review

---

### Environment Variables

Required environment variables (not in config file):

```bash
# Jira Authentication
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"

# GitHub Authentication
export GITHUB_TOKEN="ghp_your-github-token"

# Webhook Security (optional but recommended)
export GITHUB_WEBHOOK_SECRET="your-random-secret"
```

---

## Workflow Diagrams

Visual representations of integration workflows.

### Development Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     GITHUB-JIRA INTEGRATION FLOW                    │
└─────────────────────────────────────────────────────────────────────┘

1. CREATE BRANCH
   Developer: git checkout -b feature/PROJ-123-user-auth
              git push -u origin feature/PROJ-123-user-auth
   │
   ├─> GitHub: Branch created event
   │
   └─> Jira:   • Add branch comment
               • Update "GitHub Branch" field
               • Transition to "In Progress"

2. MAKE COMMITS
   Developer: git commit -m "PROJ-123 Implement OAuth2

              #comment Added Google OAuth2 integration
              #time 3h 15m
              "
   │
   ├─> Git Hook: Detect smart commit
   │
   └─> Jira:     • Add comment
                 • Log 3h 15m work
                 • Update activity log

3. CREATE PULL REQUEST
   Developer: gh pr create --title "[PROJ-123] feat: Add user auth"
   │
   ├─> GitHub: PR created event
   │
   └─> Jira:   • Add PR link comment
               • Update "GitHub PR URL" field
               • Transition to "In Review"

4. CODE REVIEW
   Reviewer: Approves PR (2 approvals received)
   │
   ├─> GitHub: PR approved event
   │
   └─> Jira:   • Add approval comment
               • Transition to "Approved"

5. MERGE PR
   Developer: Merge pull request
   │
   ├─> GitHub: PR merged event
   │
   └─> Jira:   • Add merge comment
               • Transition to "Done"

6. DEPLOY
   GitHub Actions: Deploy to production
   │
   ├─> Deployment: Success
   │
   └─> Jira:       • Add deployment comment
                   • Update "Production Environment" field
                   • Transition to "Released"

┌─────────────────────────────────────────────────────────────────────┐
│                         COMPLETE                                     │
│   Issue tracked through entire lifecycle with zero manual updates   │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Smart Commit Processing Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   SMART COMMIT PROCESSING                        │
└──────────────────────────────────────────────────────────────────┘

Developer commits:
┌─────────────────────────────────────────────────────────────────┐
│ PROJ-123 Fix authentication bug                                 │
│                                                                  │
│ #comment Resolved OAuth2 token refresh issue                    │
│ #time 2h 30m                                                     │
│ #transition "In Review"                                          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. PARSE COMMIT MESSAGE                                         │
│     • Extract issue key: PROJ-123                                │
│     • Find commands: #comment, #time, #transition                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PROCESS #COMMENT                                             │
│     → Add comment to PROJ-123                                    │
│     → Text: "Resolved OAuth2 token refresh issue"                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. PROCESS #TIME                                                │
│     → Log work to PROJ-123                                       │
│     → Duration: 2h 30m = 9000 seconds                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. PROCESS #TRANSITION                                          │
│     → Transition PROJ-123                                        │
│     → New status: "In Review"                                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. COMPLETE                                                     │
│     ✅ All commands executed successfully                        │
│     ✅ Jira issue updated                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Deployment Tracking Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT TRACKING FLOW                       │
└──────────────────────────────────────────────────────────────────┘

Code Push
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  GITHUB ACTIONS WORKFLOW TRIGGERED                               │
│  • Extract Jira issue keys from commits                          │
│  • Run tests and build                                           │
│  • Deploy to target environment                                  │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT: DEVELOPMENT                                         │
│  Environment: dev                                                │
│  Status: success                                                 │
│  Version: v1.2.3-dev                                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ├──> JIRA UPDATED
    │    • Add deployment comment
    │    • Update "Development Environment" field
    │    • Transition to "In Development"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT: STAGING                                             │
│  Environment: staging                                            │
│  Status: success                                                 │
│  Version: v1.2.3-rc1                                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ├──> JIRA UPDATED
    │    • Add deployment comment
    │    • Update "Staging Environment" field
    │    • Transition to "In QA"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT: PRODUCTION                                          │
│  Environment: production                                         │
│  Status: success                                                 │
│  Version: v1.2.3                                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    └──> JIRA UPDATED
         • Add deployment comment
         • Update "Production Environment" field
         • Transition to "Released"

AUDIT TRAIL CREATED IN JIRA:
┌──────────────────────────────────────────────────────────────────┐
│  Jan 10: Deployed to dev (v1.2.3-dev)                            │
│  Jan 12: Deployed to staging (v1.2.3-rc1)                        │
│  Jan 15: Deployed to production (v1.2.3)                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

Common issues and solutions for GitHub-Jira integration.

### Issue: Branch Not Syncing to Jira

**Symptoms:**
- Created branch but Jira not updated
- No comment or status change in Jira issue

**Possible Causes:**
1. Branch name doesn't contain valid Jira issue key
2. Issue doesn't exist in Jira
3. Insufficient Jira permissions
4. Sync agent not running

**Solutions:**

```bash
# 1. Verify branch name contains issue key
git branch --show-current
# Should match: feature/PROJ-123-description

# 2. Check if issue exists in Jira
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  https://your-org.atlassian.net/rest/api/3/issue/PROJ-123

# 3. Verify API token has write permissions
# Generate new token at: https://id.atlassian.com/manage-profile/security/api-tokens

# 4. Check sync agent logs
tail -f .jira/sync.log
```

---

### Issue: Smart Commits Not Processing

**Symptoms:**
- Commit message contains #commands but Jira not updated
- No comment or time log in Jira

**Possible Causes:**
1. Missing issue key in commit message
2. Invalid command syntax
3. Smart commits disabled in config
4. Git hook not installed

**Solutions:**

```bash
# 1. Verify commit message format
git log -1 --pretty=%B
# Should contain: PROJ-123 and #command syntax

# 2. Check command syntax
# Correct: #comment Fixed bug
# Correct: #time 2h 30m
# Correct: #transition "In Review"
# Wrong:   comment Fixed bug (missing #)
# Wrong:   #time 2 hours (use 2h)
# Wrong:   #transition In Review (missing quotes)

# 3. Verify smart commits enabled
grep "smart_commits:" .jira/config.yml
# Should show: enabled: true

# 4. Install git hook
chmod +x .git/hooks/post-commit
```

---

### Issue: PR Link Not Appearing in Jira

**Symptoms:**
- Created PR but no link in Jira issue
- PR URL custom field not updated

**Possible Causes:**
1. PR title/description doesn't contain issue key
2. Custom field not configured correctly
3. Webhook not triggered
4. PR closed before sync completed

**Solutions:**

```bash
# 1. Verify PR title contains issue key
gh pr view --json title
# Should include: [PROJ-123] or PROJ-123

# 2. Check custom field ID in config
grep "pr_url:" .jira/config.yml
# Verify field ID exists in Jira

# 3. Check webhook deliveries
# Go to: GitHub → Settings → Webhooks → Recent Deliveries
# Look for pull_request event

# 4. Manually trigger sync
./jira-orchestrator/scripts/sync-pr.sh 42  # PR number
```

---

### Issue: Deployment Status Not Updating

**Symptoms:**
- Deployment completed but Jira not updated
- Environment field not populated

**Possible Causes:**
1. Environment mapping incorrect in config
2. GitHub Actions workflow name doesn't match
3. Custom field not configured
4. Issue keys not extracted from commits

**Solutions:**

```bash
# 1. Verify environment mapping
grep -A5 "environments:" .jira/config.yml
# Check environment names match GitHub

# 2. Check workflow name
cat .github/workflows/deploy.yml | grep "name:"
# Must match config exactly

# 3. Verify custom field exists
# Go to Jira Settings → Issues → Custom Fields
# Check field IDs match config

# 4. Test issue key extraction
git log --pretty=format:"%s %b" HEAD~5..HEAD | grep -oE '[A-Z]+-[0-9]+'
# Should show issue keys from recent commits
```

---

### Issue: Webhooks Not Triggering

**Symptoms:**
- Events in GitHub but no Jira updates
- Webhook shows failed deliveries

**Possible Causes:**
1. Webhook URL incorrect or unreachable
2. Webhook secret mismatch
3. Firewall blocking requests
4. Webhook disabled

**Solutions:**

```bash
# 1. Check webhook recent deliveries
# Go to: Repository → Settings → Webhooks → Recent Deliveries
# Look for 200 status codes

# 2. Verify webhook secret
echo $GITHUB_WEBHOOK_SECRET
# Must match secret in GitHub webhook config

# 3. Test webhook endpoint
curl -X POST https://your-server.com/webhook/github \
  -H "Content-Type: application/json" \
  -d '{"test": "payload"}'

# 4. Re-enable webhook if disabled
# Go to webhook settings and click "Enable"
```

---

### Issue: Duplicate Jira Updates

**Symptoms:**
- Same comment appears multiple times
- Multiple transitions executed

**Possible Causes:**
1. Multiple sync sources enabled (webhook + polling)
2. Git hook and GitHub Actions both running
3. Retry logic executing multiple times

**Solutions:**

```yaml
# 1. Use single sync source (webhook recommended)
sync:
  sources:
    - github_webhooks  # Remove others

# 2. Disable git hooks if using GitHub Actions
# Remove or disable: .git/hooks/post-commit

# 3. Adjust retry configuration
sync:
  retry:
    max_attempts: 1  # Reduce retries
    backoff: exponential
```

---

### Issue: Permissions Error

**Symptoms:**
- "403 Forbidden" errors in logs
- "Insufficient permissions" messages

**Solutions:**

```bash
# 1. Verify Jira API token has correct permissions
# Required: Browse Projects, Edit Issues, Add Comments, Transition Issues

# 2. Check GitHub token scopes
# Required: repo, workflow, write:packages

# 3. Regenerate tokens if needed
# Jira: https://id.atlassian.com/manage-profile/security/api-tokens
# GitHub: https://github.com/settings/tokens

# 4. Test API access
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  https://your-org.atlassian.net/rest/api/3/myself
```

---

### Enable Debug Logging

```yaml
# Add to .jira/config.yml
monitoring:
  debug_mode: true
  log_level: "DEBUG"
  log_file: ".jira/sync-debug.log"
```

```bash
# Watch debug logs in real-time
tail -f .jira/sync-debug.log
```

---

## Quick Reference Card

Quick reference for common commands and syntax.

### Smart Commit Syntax

```bash
# Basic structure
ISSUE-KEY description

#command value

# Examples
PROJ-123 Fix authentication bug
#comment Resolved OAuth2 token refresh issue
#time 2h 30m
#transition "In Review"
```

---

### Time Format Reference

| Format | Meaning | Example |
|--------|---------|---------|
| `Xh` | X hours | `2h` = 2 hours |
| `Xm` | X minutes | `30m` = 30 minutes |
| `Xd` | X days (8h workday) | `1d` = 8 hours |
| `Xh Ym` | Combined | `2h 30m` = 2.5 hours |

---

### Branch Naming

```bash
feature/{ISSUE-KEY}-{description}  # New feature
bugfix/{ISSUE-KEY}-{description}   # Bug fix
hotfix/{ISSUE-KEY}-{description}   # Urgent fix
chore/{ISSUE-KEY}-{description}    # Maintenance
```

---

### PR Title Format

```bash
[ISSUE-KEY] type: Description

# Examples
[PROJ-123] feat: Add user authentication
[PROJ-456] fix: Resolve login redirect
[PROJ-789] docs: Update API documentation
```

---

### Common Git Commands

```bash
# Create and sync branch
git checkout -b feature/PROJ-123-user-auth
git push -u origin feature/PROJ-123-user-auth

# Commit with smart commands
git commit -m "PROJ-123 Implement OAuth2

#comment Added Google OAuth2 integration
#time 3h
#transition \"In Review\"
"

# Create pull request
gh pr create --title "[PROJ-123] feat: Add user auth"

# Merge and delete branch
gh pr merge 42 --merge
git push origin --delete feature/PROJ-123-user-auth
```

---

### Configuration Paths

| File | Purpose |
|------|---------|
| `.jira/config.yml` | Main configuration |
| `.github/workflows/*.yml` | GitHub Actions workflows |
| `.git/hooks/post-commit` | Git hook for smart commits |
| `.jira/sync.log` | Synchronization logs |

---

### Environment Variables

```bash
# Required
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"
export GITHUB_TOKEN="ghp_your-token"

# Optional
export GITHUB_WEBHOOK_SECRET="your-secret"
export JIRA_SITE_URL="https://yourcompany.atlassian.net"
```

---

### Troubleshooting Commands

```bash
# Check branch sync
git branch --show-current | grep -oE '[A-Z]+-[0-9]+'

# View commit smart commands
git log -1 --pretty=%B | grep '#'

# Test Jira connection
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  https://your-org.atlassian.net/rest/api/3/myself

# View sync logs
tail -f .jira/sync.log

# Validate configuration
./jira-orchestrator/scripts/validate-config.sh
```

---

### Jira Status Transitions

| GitHub Event | Jira Transition |
|--------------|-----------------|
| Branch created | → "In Progress" |
| PR opened (ready) | → "In Review" |
| PR marked draft | → "In Development" |
| PR approved | → "Approved" |
| PR merged | → "Done" |
| PR closed (no merge) | → "Cancelled" |
| Deploy to staging | → "In QA" |
| Deploy to production | → "Released" |

---

### Support Resources

| Resource | Location |
|----------|----------|
| Full Documentation | `jira-orchestrator/agents/github-jira-sync.md` |
| Setup Guide | `jira-orchestrator/docs/github-jira-sync-setup.md` |
| Configuration Examples | `jira-orchestrator/examples/` |
| Workflow Templates | `.github/workflows/` |
| Issue Tracker | GitHub Issues |

---

## Appendix: Advanced Topics

### Custom Webhook Handler

For advanced integration scenarios, you can implement a custom webhook handler:

```python
# webhook-handler.py
from fastapi import FastAPI, Request
import hmac
import hashlib

app = FastAPI()

@app.post("/webhook/github")
async def handle_github_webhook(request: Request):
    # Verify signature
    signature = request.headers.get('X-Hub-Signature-256')
    # ... verification logic ...

    # Process event
    event_type = request.headers.get('X-GitHub-Event')
    payload = await request.json()

    if event_type == 'push':
        await handle_push_event(payload)
    elif event_type == 'pull_request':
        await handle_pr_event(payload)

    return {"status": "processed"}
```

---

### Batch Synchronization

For large repositories, use batch synchronization:

```bash
# Sync all open PRs
./jira-orchestrator/scripts/batch-sync.sh --type=pr --state=open

# Sync recent commits (last 50)
./jira-orchestrator/scripts/batch-sync.sh --type=commits --limit=50

# Sync deployments
./jira-orchestrator/scripts/batch-sync.sh --type=deployments --days=7
```

---

### Multi-Repository Setup

For organizations with multiple repositories:

```yaml
# .jira/config.yml
jira:
  projects:
    frontend-repo: "FRONT"
    backend-repo: "BACK"
    mobile-repo: "MOBILE"
    infrastructure-repo: "INFRA"
```

---

## Conclusion

The GitHub-Jira integration in Jira Orchestrator v1.4.0 eliminates manual status updates and provides real-time visibility across your development workflow. By following the patterns in this guide, your team can:

- **Save time** with automated updates
- **Improve visibility** for stakeholders
- **Enhance compliance** with audit trails
- **Accelerate delivery** through workflow automation

### Next Steps

1. Complete the [Quick Start](#quick-start) setup
2. Configure [Smart Commits](#smart-commits-guide) for your team
3. Set up [GitHub Actions](#github-actions-workflows) workflows
4. Train team on [Branch Naming](#branch-naming-conventions) conventions
5. Monitor synchronization with the [Troubleshooting](#troubleshooting) guide

### Getting Help

- **Documentation**: Review the [full agent documentation](../agents/github-jira-sync.md)
- **Setup Support**: See the [detailed setup guide](github-jira-sync-setup.md)
- **Issues**: Report problems via GitHub Issues
- **Questions**: Contact your team's development tools support

---

**Built with Jira Orchestrator v1.4.0**

*Intelligent orchestration for modern development teams*

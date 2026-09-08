# GitHub-Jira Integration Guide v1.4.0

**Jira Orchestrator Plugin** - Automate GitHub-Jira synchronization eliminating manual status updates.

## Quick Start

```bash
mkdir -p .jira && cp examples/.jira-config.example.yml .jira/config.yml
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-jira-api-token"
export GITHUB_TOKEN="your-github-token"

git checkout -b feature/PROJ-123-test-sync
git push -u origin feature/PROJ-123-test-sync
```

## Key Capabilities

| Feature | Impact |
|---------|--------|
| **Smart Commits** | Update Jira from commit messages (#comment, #time, #transition) |
| **Branch Auto-Linking** | Automatically link branches based on naming conventions |
| **PR Lifecycle Tracking** | Sync PR status changes to Jira automatically |
| **Deployment Tracking** | Track deployments across dev, staging, production |
| **Build Status Sync** | Update Jira with CI/CD results and test coverage |

## Smart Commits

**Format:** `ISSUE-KEY description` followed by commands

```bash
PROJ-123 Fix authentication bug
#comment Resolved OAuth2 token refresh issue
#time 2h 30m
#transition "In Review"
```

**Commands:** `#comment <text>`, `#time <duration>` (2h 30m, 1d 4h), `#transition "<status>"`

**Best Practices:** Always start with Jira issue key, explain why not what, verify transition names exist, never use for sensitive info.

## Branch Naming & PR Synchronization

**Pattern:** `{type}/{ISSUE-KEY}-{description}`

Examples: `feature/PROJ-123-user-auth`, `bugfix/PROJ-456-login`, `hotfix/PROJ-789-error`

**PR Lifecycle:**
| GitHub Event | Jira Transition |
|--------------|-----------------|
| PR created (ready) | → "In Review" |
| PR marked draft | → "In Development" |
| PR approved (2+) | → "Approved" |
| PR merged | → "Done" |
| PR closed (no merge) | → "Cancelled" |

**PR Title Format:** `[PROJ-123] feat: Add user authentication`

## Deployment & Build Tracking

**Supported Environments:** Development (dev, develop), Staging (staging, stage), Production (production, prod, main)

**Build Metrics Tracked:** Status, test results, code coverage, duration

**Flow:** Code push → GitHub Actions → Extract issue keys → Deploy → Jira updated

## GitHub Actions Workflow

**Required Secrets:** JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SITE_URL

```yaml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Tests
        run: npm test -- --coverage
      - name: Extract Jira Issues
        id: jira
        run: |
          ISSUES=$(git log --pretty=format:"%s %b" -n 1 | grep -oE '[A-Z]+-[0-9]+')
          echo "issues=$ISSUES" >> $GITHUB_OUTPUT
      - name: Update Jira
        if: success()
        env:
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        run: echo "Build succeeded for: ${{ steps.jira.outputs.issues }}"
```

## Configuration (.jira/config.yml)

```yaml
jira:
  host: "https://yourcompany.atlassian.net"
  projects:
    default: "PROJ"
  environments:
    development:
      jira_field: "customfield_10100"
      github_environments: ["dev", "development"]
      auto_transition: "In Development"
    staging:
      jira_field: "customfield_10101"
      github_environments: ["staging", "stage"]
      auto_transition: "In QA"
    production:
      jira_field: "customfield_10102"
      github_environments: ["production", "prod"]
      auto_transition: "Released"

github:
  repository:
    owner: "your-org"
    name: "your-repo"
  branch_patterns:
    feature: "feature/{issue-key}-{description}"
    bugfix: "bugfix/{issue-key}-{description}"

sync:
  interval_minutes: 5
  sources: [github_webhooks, github_actions]
  bidirectional: true
  conflicts:
    strategy: "github_wins"
```

## Troubleshooting

**Branch not syncing:**
```bash
git branch --show-current  # Should: feature/PROJ-123-description
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" https://your-org.atlassian.net/rest/api/3/issue/PROJ-123
```

**Smart commits not processing:**
```bash
git log -1 --pretty=%B | grep -E 'PROJ-[0-9]+|#(comment|time|transition)'
grep "smart_commits:" .jira/config.yml
```

**PR link not in Jira:**
```bash
gh pr view --json title  # Should include [PROJ-123]
# Verify custom field ID in Jira: Settings → Issues → Custom Fields
```

**Deployment status not updating:**
```bash
grep -A5 "environments:" .jira/config.yml
git log --pretty=format:"%s %b" HEAD~5..HEAD | grep -oE '[A-Z]+-[0-9]+'
```

## Quick Reference

**Time Format:** 1h, 30m, 1d (8h), 2h 15m, 1d 4h

**Status Transitions:**
| GitHub Event | Jira Transition |
|--------------|-----------------|
| Branch created | → "In Progress" |
| PR opened | → "In Review" |
| PR approved | → "Approved" |
| PR merged | → "Done" |
| Deploy prod | → "Released" |

**Commands:**
```bash
git log --pretty=format:"%s %b" -n 5 | grep -oE '[A-Z]+-[0-9]+'  # Extract issues
./jira-orchestrator/scripts/validate-config.sh                   # Validate config
tail -f .jira/sync.log                                            # View logs
```

---

**Version:** 1.4.0 | **Status:** Production Ready

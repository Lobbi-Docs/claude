# Atlassian Sync

Synchronize data between GitHub, Jira, and Confluence.

## Instructions

Execute the following workflows to sync Atlassian tools:

### 1. GitHub Issue to Jira

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)

# Parse GitHub issue (if using gh CLI)
GH_ISSUE=$(gh issue view 123 --json title,body,labels,assignees)
TITLE=$(echo $GH_ISSUE | jq -r '.title')
BODY=$(echo $GH_ISSUE | jq -r '.body')
LABELS=$(echo $GH_ISSUE | jq -r '[.labels[].name] | join(",")')

# Create corresponding Jira issue
curl -X POST "$JIRA_URL/rest/api/3/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"fields\": {
      \"project\": {\"key\": \"GA\"},
      \"issuetype\": {\"name\": \"Task\"},
      \"summary\": \"[GitHub #123] $TITLE\",
      \"description\": {
        \"type\": \"doc\",
        \"version\": 1,
        \"content\": [{\"type\": \"paragraph\", \"content\": [{\"type\": \"text\", \"text\": \"$BODY\"}]}]
      },
      \"labels\": [\"github-sync\", \"gh-123\"]
    }
  }"
\`\`\`

### 2. Jira Issue to GitHub

\`\`\`bash
# Get Jira issue
JIRA_ISSUE=$(curl -s -X GET "$JIRA_URL/rest/api/3/issue/GA-123" \
  -H "Authorization: Basic $JIRA_AUTH")
SUMMARY=$(echo $JIRA_ISSUE | jq -r '.fields.summary')
DESCRIPTION=$(echo $JIRA_ISSUE | jq -r '.fields.description.content[0].content[0].text // "No description"')

# Create GitHub issue
gh issue create \
  --title "[GA-123] $SUMMARY" \
  --body "$DESCRIPTION

---
Jira Link: $JIRA_URL/browse/GA-123" \
  --label "jira-sync"
\`\`\`

### 3. PR to Jira Comment

\`\`\`bash
# Extract Jira key from PR title or branch
PR_TITLE=$(gh pr view 456 --json title -q '.title')
JIRA_KEY=$(echo "$PR_TITLE" | grep -oE 'GA-[0-9]+')

if [ -n "$JIRA_KEY" ]; then
  PR_URL=$(gh pr view 456 --json url -q '.url')
  PR_STATUS=$(gh pr view 456 --json state -q '.state')

  # Add comment to Jira
  curl -X POST "$JIRA_URL/rest/api/3/issue/$JIRA_KEY/comment" \
    -H "Authorization: Basic $JIRA_AUTH" \
    -H "Content-Type: application/json" \
    -d "{
      \"body\": {
        \"type\": \"doc\",
        \"version\": 1,
        \"content\": [{
          \"type\": \"paragraph\",
          \"content\": [
            {\"type\": \"text\", \"text\": \"GitHub PR #456: $PR_STATUS\n\"},
            {\"type\": \"text\", \"text\": \"$PR_URL\", \"marks\": [{\"type\": \"link\", \"attrs\": {\"href\": \"$PR_URL\"}}]}
          ]
        }]
      }
    }"
fi
\`\`\`

### 4. Code Changes to Confluence

\`\`\`bash
export CONFLUENCE_URL="${CONFLUENCE_URL:-https://your-domain.atlassian.net}"
export CONFLUENCE_AUTH=$(echo -n "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" | base64)

# Get changed files from recent commits
CHANGES=$(git log --oneline --name-only -10)

# Update changelog page
PAGE_ID="changelog-page-id"
VERSION=$(curl -s -X GET "$CONFLUENCE_URL/wiki/api/v2/pages/$PAGE_ID" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" | jq '.version.number')

CONTENT="<h1>Recent Changes</h1>
<p>Last updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")</p>
<ac:structured-macro ac:name=\"code\">
<ac:plain-text-body><![CDATA[$CHANGES]]></ac:plain-text-body>
</ac:structured-macro>"

curl -X PUT "$CONFLUENCE_URL/wiki/api/v2/pages/$PAGE_ID" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$PAGE_ID\",
    \"status\": \"current\",
    \"title\": \"Changelog\",
    \"body\": {
      \"representation\": \"storage\",
      \"value\": $(echo "$CONTENT" | jq -Rs .)
    },
    \"version\": {
      \"number\": $((VERSION + 1)),
      \"message\": \"Auto-updated from git\"
    }
  }"
\`\`\`

### 5. Sprint to Confluence Report

\`\`\`bash
# Get sprint data from Jira
SPRINT_DATA=$(curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND sprint in openSprints()",
    "fields": ["summary", "status", "assignee", "customfield_10016"],
    "maxResults": 100
  }')

# Generate report content
TOTAL=$(echo $SPRINT_DATA | jq '.total')
DONE=$(echo $SPRINT_DATA | jq '[.issues[] | select(.fields.status.name == "Done")] | length')
IN_PROGRESS=$(echo $SPRINT_DATA | jq '[.issues[] | select(.fields.status.name == "In Progress")] | length')

REPORT_CONTENT="<h1>Sprint Status Report</h1>
<p>Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")</p>
<table>
<tr><th>Metric</th><th>Value</th></tr>
<tr><td>Total Issues</td><td>$TOTAL</td></tr>
<tr><td>Done</td><td>$DONE</td></tr>
<tr><td>In Progress</td><td>$IN_PROGRESS</td></tr>
</table>"

# Create/update Confluence page
curl -X POST "$CONFLUENCE_URL/wiki/api/v2/pages" \
  -H "Authorization: Basic $CONFLUENCE_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"spaceId\": \"$SPACE_ID\",
    \"status\": \"current\",
    \"title\": \"Sprint Status - $(date +%Y-%m-%d)\",
    \"body\": {
      \"representation\": \"storage\",
      \"value\": $(echo "$REPORT_CONTENT" | jq -Rs .)
    }
  }"
\`\`\`

### 6. Bidirectional Status Sync

\`\`\`bash
# Sync GitHub PR merged -> Jira Done
gh pr list --state merged --json number,title | jq -r '.[] | "\(.number) \(.title)"' | while read PR_NUM PR_TITLE; do
  JIRA_KEY=$(echo "$PR_TITLE" | grep -oE 'GA-[0-9]+')
  if [ -n "$JIRA_KEY" ]; then
    # Get available transitions
    DONE_TRANSITION=$(curl -s -X GET "$JIRA_URL/rest/api/3/issue/$JIRA_KEY/transitions" \
      -H "Authorization: Basic $JIRA_AUTH" | jq -r '.transitions[] | select(.name == "Done") | .id')

    if [ -n "$DONE_TRANSITION" ]; then
      curl -X POST "$JIRA_URL/rest/api/3/issue/$JIRA_KEY/transitions" \
        -H "Authorization: Basic $JIRA_AUTH" \
        -H "Content-Type: application/json" \
        -d "{\"transition\": {\"id\": \"$DONE_TRANSITION\"}}"
      echo "Transitioned $JIRA_KEY to Done"
    fi
  fi
done
\`\`\`

## Automation Scripts

### Pre-commit Hook (Git to Jira)
\`\`\`bash
#!/bin/bash
# .git/hooks/prepare-commit-msg

COMMIT_MSG_FILE=$1
BRANCH_NAME=$(git branch --show-current)
JIRA_KEY=$(echo "$BRANCH_NAME" | grep -oE 'GA-[0-9]+')

if [ -n "$JIRA_KEY" ]; then
  if ! grep -q "$JIRA_KEY" "$COMMIT_MSG_FILE"; then
    sed -i "1s/^/$JIRA_KEY: /" "$COMMIT_MSG_FILE"
  fi
fi
\`\`\`

### Post-merge Hook (Jira Update)
\`\`\`bash
#!/bin/bash
# .git/hooks/post-merge

COMMIT_MSG=$(git log -1 --format=%s)
JIRA_KEY=$(echo "$COMMIT_MSG" | grep -oE 'GA-[0-9]+')

if [ -n "$JIRA_KEY" ]; then
  curl -X POST "$JIRA_URL/rest/api/3/issue/$JIRA_KEY/comment" \
    -H "Authorization: Basic $JIRA_AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"body\": {\"type\": \"doc\", \"version\": 1, \"content\": [{\"type\": \"paragraph\", \"content\": [{\"type\": \"text\", \"text\": \"Merged: $COMMIT_MSG\"}]}]}}"
fi
\`\`\`

## Options

- **Direction**: `--to-jira`, `--to-github`, `--to-confluence`, `--bidirectional`
- **Dry run**: `--dry-run` to preview without changes
- **Filter**: `--since DATE` to sync recent items only

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | Yes | Jira instance URL |
| `JIRA_EMAIL` | Yes | Jira user email |
| `JIRA_API_TOKEN` | Yes | Jira API token |
| `CONFLUENCE_URL` | Yes | Confluence instance URL |
| `CONFLUENCE_EMAIL` | Yes | Confluence user email |
| `CONFLUENCE_API_TOKEN` | Yes | Confluence API token |
| `GITHUB_TOKEN` | Yes | GitHub personal access token |

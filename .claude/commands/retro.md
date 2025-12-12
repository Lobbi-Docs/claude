# Retrospective Command

Facilitate sprint retrospective and capture action items.

## Instructions

### 1. Setup

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
export CONFLUENCE_URL="${CONFLUENCE_URL:-https://your-domain.atlassian.net}"
export CONFLUENCE_AUTH=$(echo -n "$CONFLUENCE_EMAIL:$CONFLUENCE_API_TOKEN" | base64)
\`\`\`

### 2. Get Sprint Metrics

\`\`\`bash
# Sprint summary for context
SPRINT_NAME="Sprint 10"

echo "=== Sprint $SPRINT_NAME Summary ==="

# Velocity
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"jql\": \"project = GA AND sprint = '$SPRINT_NAME' AND type = Story AND status = Done\",
    \"fields\": [\"customfield_10016\"]
  }" | jq '{completed_points: [.issues[].fields.customfield_10016 // 0] | add}'

# Completion rate
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"jql\": \"project = GA AND sprint = '$SPRINT_NAME'\",
    \"fields\": [\"status\"]
  }" | jq '{
    total: .total,
    done: [.issues[] | select(.fields.status.name == "Done")] | length,
    completion_rate: (([.issues[] | select(.fields.status.name == "Done")] | length) / .total * 100 | floor)
  }'

# Bugs found
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d "{
    \"jql\": \"project = GA AND type = Bug AND created >= -14d\"
  }" | jq '{bugs_found: .total}'
\`\`\`

### 3. Get Previous Action Items

\`\`\`bash
# Check previous retro action items
echo ""
echo "=== Previous Action Items Status ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND labels = retro-action ORDER BY created DESC",
    "fields": ["summary", "status", "assignee"],
    "maxResults": 10
  }' | jq '.issues[] | "\(.key): \(.fields.summary) - \(.fields.status.name)"'
\`\`\`

### 4. Retrospective Templates

#### Start/Stop/Continue
\`\`\`markdown
## Sprint [X] Retrospective

**Date:** [Date]
**Facilitator:** [Name]
**Participants:** [Names]

### 🚀 Start Doing
_Things we should begin doing_
1.
2.
3.

### 🛑 Stop Doing
_Things that aren't working_
1.
2.
3.

### ✅ Continue Doing
_Things that are working well_
1.
2.
3.
\`\`\`

#### 4Ls Format
\`\`\`markdown
## Sprint [X] Retrospective - 4Ls

### 👍 Liked
_What went well_
-

### 📚 Learned
_What we learned_
-

### 🔍 Lacked
_What was missing_
-

### 🌟 Longed For
_What we wished we had_
-
\`\`\`

#### Sailboat Format
\`\`\`markdown
## Sprint [X] Retrospective - Sailboat

### ⛵ Wind (Propelling Us Forward)
_What's helping us move faster_
-

### ⚓ Anchor (Holding Us Back)
_What's slowing us down_
-

### 🪨 Rocks (Risks Ahead)
_What risks do we see_
-

### 🏝️ Island (Our Goal)
_Where we want to be_
-
\`\`\`

### 5. Create Action Items in Jira

\`\`\`bash
# Create action item from retrospective
curl -X POST "$JIRA_URL/rest/api/3/issue" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": {
      "project": {"key": "GA"},
      "issuetype": {"name": "Task"},
      "summary": "[Retro] Action item description",
      "description": {
        "type": "doc",
        "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "From Sprint X retrospective"}]}]
      },
      "labels": ["retro-action", "process-improvement"],
      "priority": {"name": "Medium"}
    }
  }'
\`\`\`

### 6. Create Confluence Page

\`\`\`bash
# Create retrospective documentation
SPACE_KEY="GA"
SPRINT_NAME="Sprint 10"

CONTENT=$(cat <<'EOF'
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>Date:</strong> [DATE]</p>
    <p><strong>Facilitator:</strong> [NAME]</p>
    <p><strong>Format:</strong> Start/Stop/Continue</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Sprint Metrics</h1>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  <tr><td>Velocity</td><td>[X] points</td></tr>
  <tr><td>Completion Rate</td><td>[X]%</td></tr>
  <tr><td>Bugs Found</td><td>[X]</td></tr>
</table>

<h1>Discussion</h1>
<h2>Start Doing</h2>
<ul><li></li></ul>

<h2>Stop Doing</h2>
<ul><li></li></ul>

<h2>Continue Doing</h2>
<ul><li></li></ul>

<h1>Action Items</h1>
<table>
  <tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr>
  <tr>
    <td>Action 1</td>
    <td>Name</td>
    <td>Date</td>
    <td><ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">Yellow</ac:parameter><ac:parameter ac:name="title">IN PROGRESS</ac:parameter></ac:structured-macro></td>
  </tr>
</table>

<h1>Previous Actions Review</h1>
<ac:structured-macro ac:name="jira">
  <ac:parameter ac:name="jqlQuery">project = GA AND labels = retro-action ORDER BY created DESC</ac:parameter>
</ac:structured-macro>
EOF
)

Task("Confluence Specialist", "Create $SPRINT_NAME Retrospective page", "confluence-specialist")
\`\`\`

## Retrospective Facilitation Tips

\`\`\`markdown
## Prime Directive
Read at the start of every retro:

"Regardless of what we discover, we understand and truly believe
that everyone did the best job they could, given what they knew
at the time, their skills and abilities, the resources available,
and the situation at hand."

## Vegas Rule
"What happens in the retro stays in the retro"
(Unless it's an action item)

## Facilitation Guidelines
1. Everyone participates
2. No blame, focus on process
3. Time-box discussions
4. Vote on topics to discuss
5. Actionable outcomes only
6. Assign owners to every action
7. Follow up next retro
\`\`\`

## Options

- `--format [start-stop-continue|4ls|sailboat|mad-sad-glad]`
- `--sprint "Sprint Name"`
- `--create-page` - Auto-create Confluence page
- `--create-actions` - Create Jira issues for actions

# Backlog Grooming Command

Facilitate backlog refinement and story preparation.

## Instructions

### 1. Setup

\`\`\`bash
export JIRA_URL="${JIRA_URL:-https://your-domain.atlassian.net}"
export JIRA_AUTH=$(echo -n "$JIRA_EMAIL:$JIRA_API_TOKEN" | base64)
\`\`\`

### 2. Identify Stories Needing Refinement

\`\`\`bash
echo "=== Stories Needing Refinement ==="

# Missing estimates
echo ""
echo "📊 Missing Story Points:"
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND type = Story AND status = Backlog AND \"Story Points\" is EMPTY ORDER BY rank",
    "fields": ["summary", "priority"],
    "maxResults": 20
  }' | jq '.issues[] | "\(.key): \(.fields.summary)"'

# Missing acceptance criteria
echo ""
echo "📝 Missing/Short Description:"
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND type = Story AND status = Backlog AND (description is EMPTY OR description !~ \"acceptance criteria\")",
    "fields": ["summary"],
    "maxResults": 20
  }' | jq '.issues[] | "\(.key): \(.fields.summary)"'

# Large stories (>8 points)
echo ""
echo "🔨 Large Stories (consider splitting):"
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND type = Story AND \"Story Points\" > 8 AND status = Backlog",
    "fields": ["summary", "customfield_10016"],
    "maxResults": 10
  }' | jq '.issues[] | "\(.key): \(.fields.summary) (\(.fields.customfield_10016) pts)"'
\`\`\`

### 3. Review Top Backlog Items

\`\`\`bash
echo ""
echo "=== Top 15 Backlog Items ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND type in (Story, Bug) AND status = Backlog ORDER BY rank",
    "fields": ["summary", "priority", "customfield_10016", "labels"],
    "maxResults": 15
  }' | jq '.issues[] | {
    key,
    summary: .fields.summary,
    priority: .fields.priority.name,
    points: .fields.customfield_10016,
    labels: .fields.labels
  }'
\`\`\`

### 4. Check Dependencies

\`\`\`bash
echo ""
echo "=== Stories with Dependencies ==="
curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND status = Backlog AND issueFunction in hasLinks()",
    "fields": ["summary", "issuelinks"],
    "maxResults": 20
  }' | jq '.issues[] | {
    key,
    summary: .fields.summary,
    links: [.fields.issuelinks[] | "\(.type.name): \(.inwardIssue.key // .outwardIssue.key)"]
  }'
\`\`\`

### 5. Definition of Ready Checklist

\`\`\`markdown
## Definition of Ready (DoR) Checklist

For each story, verify:

- [ ] **User Story Format**: As a [user], I want [goal], so that [benefit]
- [ ] **Acceptance Criteria**: Clear, testable criteria defined
- [ ] **Story Points**: Estimated by the team
- [ ] **Priority**: Set appropriately
- [ ] **Dependencies**: Identified and documented
- [ ] **Design**: Mockups/specs attached (if UI)
- [ ] **Technical Notes**: Implementation approach discussed
- [ ] **Questions Resolved**: No open questions remain
- [ ] **Sized Appropriately**: ≤8 story points (can complete in sprint)
\`\`\`

### 6. INVEST Validation

\`\`\`bash
# Validate story against INVEST criteria
validate_story() {
  local STORY_KEY=$1

  STORY=$(curl -s -X GET "$JIRA_URL/rest/api/3/issue/$STORY_KEY" \
    -H "Authorization: Basic $JIRA_AUTH")

  echo "=== INVEST Check for $STORY_KEY ==="
  echo ""

  # Independent
  LINKS=$(echo $STORY | jq '.fields.issuelinks | length')
  if [ "$LINKS" -eq 0 ]; then
    echo "✅ Independent: No blocking dependencies"
  else
    echo "⚠️ Independent: Has $LINKS linked issues - review dependencies"
  fi

  # Negotiable
  DESC=$(echo $STORY | jq -r '.fields.description')
  if [ -n "$DESC" ]; then
    echo "✅ Negotiable: Has description for discussion"
  else
    echo "❌ Negotiable: Missing description"
  fi

  # Valuable
  SUMMARY=$(echo $STORY | jq -r '.fields.summary')
  if [[ "$SUMMARY" == *"As a"* ]]; then
    echo "✅ Valuable: User story format detected"
  else
    echo "⚠️ Valuable: Not in user story format"
  fi

  # Estimable
  POINTS=$(echo $STORY | jq '.fields.customfield_10016')
  if [ "$POINTS" != "null" ]; then
    echo "✅ Estimable: Has estimate ($POINTS points)"
  else
    echo "❌ Estimable: Missing story points"
  fi

  # Small
  if [ "$POINTS" != "null" ] && [ "$POINTS" -le 8 ]; then
    echo "✅ Small: $POINTS points (≤8)"
  elif [ "$POINTS" != "null" ]; then
    echo "⚠️ Small: $POINTS points - consider splitting"
  fi

  # Testable
  if [[ "$DESC" == *"Given"* ]] || [[ "$DESC" == *"acceptance"* ]]; then
    echo "✅ Testable: Has acceptance criteria"
  else
    echo "❌ Testable: Missing acceptance criteria"
  fi
}

# Usage: validate_story GA-123
\`\`\`

### 7. Update Story Status

\`\`\`bash
# Move story to Ready status after grooming
curl -X POST "$JIRA_URL/rest/api/3/issue/GA-123/transitions" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "transition": {"id": "21"},
    "update": {
      "comment": [{
        "add": {
          "body": {
            "type": "doc",
            "version": 1,
            "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Story refined and ready for sprint planning"}]}]
          }
        }
      }]
    }
  }'
\`\`\`

### 8. Grooming Session Report

\`\`\`bash
echo ""
echo "=== Grooming Session Summary ==="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Ready stories
READY=$(curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND status = Ready AND sprint is EMPTY"
  }' | jq '.total')
echo "Stories Ready: $READY"

# Total points ready
POINTS=$(curl -s -X POST "$JIRA_URL/rest/api/3/search" \
  -H "Authorization: Basic $JIRA_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "jql": "project = GA AND status = Ready AND sprint is EMPTY",
    "fields": ["customfield_10016"]
  }' | jq '[.issues[].fields.customfield_10016 // 0] | add')
echo "Total Points Ready: $POINTS"

# Upcoming capacity
echo "Next Sprint Capacity: 35 points"
echo "Coverage: $(echo "scale=0; $POINTS * 100 / 35" | bc)%"
\`\`\`

## Grooming Meeting Agenda

\`\`\`markdown
## Backlog Refinement Agenda

**Duration:** 1-2 hours
**Attendees:** PO, Dev Team, SM

### 1. New Stories (30 min)
- Review new items from PO
- Clarify requirements
- Initial sizing discussion

### 2. Refine Existing Stories (30 min)
- Add acceptance criteria
- Update estimates
- Identify dependencies

### 3. Technical Discussion (20 min)
- Architecture impacts
- Technical approach
- Spike requirements

### 4. Prioritization (20 min)
- Rank refined stories
- Consider sprint goals
- Balance new vs tech debt
\`\`\`

## Options

- `--top N` - Show top N backlog items
- `--unestimated` - Show only unestimated stories
- `--validate GA-123` - Run INVEST check on story
- `--report` - Generate grooming summary

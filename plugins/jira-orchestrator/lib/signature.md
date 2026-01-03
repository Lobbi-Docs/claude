# Golden Armada Signature Templates

Standard signature templates for PR comments, Jira updates, and documentation.

---

## Primary Signature (Full)

Use for PR creation, major reviews, and completion summaries:

```markdown
---

<div align="center">

**GOLDEN ARMADA**
*Lobbi Autonomous DevOps Orchestration*

```
    ⚓ ════════════════════════════════════════════ ⚓
         ╔═══════════════════════════════════╗
         ║     THE FLEET STANDS READY        ║
         ╚═══════════════════════════════════╝
    ⚓ ════════════════════════════════════════════ ⚓
```

</div>
```

---

## Secondary Signature (Compact)

Use for phase updates, inline comments, and quick status:

```markdown
---
**⚓ Golden Armada** | *The Fleet Stands Ready*
```

---

## Minimal Signature (Inline)

Use for reply comments and minor updates:

```markdown
— *Golden Armada* ⚓
```

---

## PR Review Comment Signature

Use after council reviews and code analysis:

```markdown
---

<div align="center">

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**⚓ GOLDEN ARMADA ⚓**
*Lobbi Autonomous DevOps Orchestration*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*The Fleet Stands Ready*

</div>
```

---

## Council Review Signature

Use after multi-agent reviews (5/10/20 agents):

```markdown
---

<div align="center">

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ⚓  G O L D E N   A R M A D A  ⚓                          ║
║                                                              ║
║   Lobbi Autonomous DevOps Orchestration                      ║
║   Fleet Strength: {AGENT_COUNT} Vessels Deployed             ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                   THE FLEET STANDS READY                     ║
╚══════════════════════════════════════════════════════════════╝
```

</div>
```

---

## Harness Pipeline Signature

Use for CI/CD pipeline results:

```markdown
---
**⚓ Golden Armada Fleet Operations ⚓**
Pipeline: `{PIPELINE_NAME}` | Status: {STATUS}
*The Fleet Stands Ready*
```

---

## Jira Comment Signature

Use for Jira issue comments:

```markdown
---
**⚓ Golden Armada** — Lobbi Autonomous DevOps
*The Fleet Stands Ready* | [{TIMESTAMP}]
```

---

## Error/Alert Signature

Use when reporting errors or critical alerts:

```markdown
---

**⚓ GOLDEN ARMADA — ALERT ⚓**
*Fleet Status: Action Required*

---
```

---

## Signature Variables

Replace these placeholders in signatures:

| Variable | Description | Example |
|----------|-------------|---------|
| `{AGENT_COUNT}` | Number of agents used | `20` |
| `{TIMESTAMP}` | ISO timestamp | `2025-01-02T14:30:00Z` |
| `{PIPELINE_NAME}` | Pipeline identifier | `ci-build` |
| `{STATUS}` | Operation status | `SUCCESS`, `FAILED` |
| `{PR_NUMBER}` | Pull request number | `#42` |
| `{ISSUE_KEY}` | Jira issue key | `PROJ-163` |

---

## Implementation

### Bash Function

```bash
generate_signature() {
  local STYLE="${1:-full}"
  local AGENT_COUNT="${2:-1}"
  local TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  case "$STYLE" in
    full)
      cat <<'EOF'

---

<div align="center">

**GOLDEN ARMADA**
*Lobbi Autonomous DevOps Orchestration*

```
    ⚓ ════════════════════════════════════════════ ⚓
         ╔═══════════════════════════════════╗
         ║     THE FLEET STANDS READY        ║
         ╚═══════════════════════════════════╝
    ⚓ ════════════════════════════════════════════ ⚓
```

</div>
EOF
      ;;

    compact)
      echo "---"
      echo "**⚓ Golden Armada** | *The Fleet Stands Ready*"
      ;;

    minimal)
      echo "— *Golden Armada* ⚓"
      ;;

    council)
      cat <<EOF

---

<div align="center">

\`\`\`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ⚓  G O L D E N   A R M A D A  ⚓                          ║
║                                                              ║
║   Lobbi Autonomous DevOps Orchestration                      ║
║   Fleet Strength: ${AGENT_COUNT} Vessels Deployed             ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                   THE FLEET STANDS READY                     ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

</div>
EOF
      ;;

    *)
      echo "**⚓ Golden Armada** | *The Fleet Stands Ready*"
      ;;
  esac
}
```

### JavaScript Function

```javascript
function generateSignature(style = 'full', agentCount = 1) {
  const timestamp = new Date().toISOString();

  const signatures = {
    full: `
---

<div align="center">

**GOLDEN ARMADA**
*Lobbi Autonomous DevOps Orchestration*

\`\`\`
    ⚓ ════════════════════════════════════════════ ⚓
         ╔═══════════════════════════════════╗
         ║     THE FLEET STANDS READY        ║
         ╚═══════════════════════════════════╝
    ⚓ ════════════════════════════════════════════ ⚓
\`\`\`

</div>
`,

    compact: `---
**⚓ Golden Armada** | *The Fleet Stands Ready*`,

    minimal: `— *Golden Armada* ⚓`,

    council: `
---

<div align="center">

\`\`\`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ⚓  G O L D E N   A R M A D A  ⚓                          ║
║                                                              ║
║   Lobbi Autonomous DevOps Orchestration                      ║
║   Fleet Strength: ${agentCount} Vessels Deployed             ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║                   THE FLEET STANDS READY                     ║
╚══════════════════════════════════════════════════════════════╝
\`\`\`

</div>
`
  };

  return signatures[style] || signatures.compact;
}
```

---

## Usage Examples

### PR Creation

```bash
# When creating a PR, append the full signature
PR_BODY="${PR_DESCRIPTION}

$(generate_signature full)"

gh pr create --title "$TITLE" --body "$PR_BODY"
```

### Council Review Comment

```bash
# After 20-agent review
REVIEW_COMMENT="${REVIEW_RESULTS}

$(generate_signature council 20)"

gh pr comment "$PR_NUMBER" --body "$REVIEW_COMMENT"
```

### Jira Comment

```bash
# Quick update
mcp__atlassian__addCommentToJiraIssue \
  --cloudId "$CLOUD_ID" \
  --issueIdOrKey "$ISSUE_KEY" \
  --commentBody "Status update: Implementation complete.

$(generate_signature compact)"
```

---

## Signature Philosophy

The Golden Armada signature represents:

- **⚓ Anchor**: Stability, reliability, grounded operations
- **Fleet**: Multiple agents working in coordination
- **Armada**: Powerful, organized, mission-ready
- **"The Fleet Stands Ready"**: Always prepared to deploy

This branding reinforces the autonomous, multi-agent nature of the Lobbi DevOps orchestration system while maintaining a professional, memorable presence in all automated communications.

---
name: jira:plan-prs
description: Analyze issue and create PR delivery strategy before coding
arguments:
  - name: issue_key
    description: Parent Jira issue key (e.g., PROJ-123)
    required: true
examples:
  - command: /jira:plan-prs PROJ-123
    description: Create PR strategy for PROJ-123
  - command: /jira:plan-prs ABC-456
    description: Analyze ABC-456 and plan incremental PRs
---

# Plan PRs Command

Generate a **proactive PR delivery strategy** for a Jira issue BEFORE coding begins.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:plan-prs - {duration}`

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

## Why Use This Command?

Large PRs are hard to review and often lead to:
- 🐛 Missed bugs and security issues
- 😓 Reviewer fatigue and burnout
- ⏰ Delayed merges and blocked teammates
- 📉 Lower code quality overall

This command helps by **planning** how to split work into small, reviewable PRs upfront.

## What It Does

1. **Fetches Issue Details**
   - Gets parent issue and all sub-items from Jira
   - Analyzes scope and complexity

2. **Estimates PR Size**
   - Uses codebase patterns to estimate lines of code
   - Categorizes work by type (API, UI, tests, etc.)

3. **Creates Splitting Strategy**
   - Recommends how to divide work into PRs
   - Maps sub-items to specific PRs
   - Defines dependency order

4. **Posts Plan to Jira**
   - Documents the strategy on the parent issue
   - Creates visibility for the team

5. **Configures Orchestration**
   - Saves strategy for CODE phase agents
   - Enables checkpoint PR creation

## Usage

```bash
/jira:plan-prs ISSUE-KEY
```

## Example Output

```
📊 PR Size Estimation Complete

Parent Issue: PROJ-123
Total Estimated: ~1,450 lines (🔴 Large - Split Required)

Strategy: 3-PR Split (Sub-Item Based)

┌─────────────────────────────────────────────────────────────┐
│ PR #1: [PROJ-123] Part 1: Database Layer                    │
│ ├─ Sub-Items: PROJ-201, PROJ-202                            │
│ ├─ Est. Size: ~350 lines                                    │
│ ├─ Dependencies: None                                        │
│ └─ Merge Order: First                                        │
├─────────────────────────────────────────────────────────────┤
│ PR #2: [PROJ-123] Part 2: API Layer                         │
│ ├─ Sub-Items: PROJ-203, PROJ-204, PROJ-205                  │
│ ├─ Est. Size: ~600 lines                                    │
│ ├─ Dependencies: PR #1                                       │
│ └─ Merge Order: After PR #1 merges                          │
├─────────────────────────────────────────────────────────────┤
│ PR #3: [PROJ-123] Part 3: UI Components                     │
│ ├─ Sub-Items: PROJ-206, PROJ-207                            │
│ ├─ Est. Size: ~500 lines                                    │
│ ├─ Dependencies: PR #2                                       │
│ └─ Merge Order: Final                                        │
└─────────────────────────────────────────────────────────────┘

✅ Strategy posted to Jira: https://jira.company.com/browse/PROJ-123
✅ Configuration saved for CODE phase agents

Next Steps:
1. Run /jira:work PROJ-123 to start development
2. Checkpoint PRs will be created automatically
3. Each PR stays under 400 lines for easy review
```

## Size Thresholds

| Total Lines | Strategy | What Happens |
|-------------|----------|--------------|
| < 200 | Single PR | ✅ Proceed normally |
| 200-400 | Single PR with roadmap | ⚠️ Create review chunks |
| 400-800 | Split into 2-3 PRs | 🟠 Split recommended |
| > 800 | Split into 3+ PRs | 🔴 Split required |

## Workflow

```mermaid
graph TD
    A[/jira:plan-prs ISSUE-KEY] --> B[Fetch Issue from Jira]
    B --> C[Get Sub-Items]
    C --> D[Analyze Complexity]
    D --> E{Estimated Size?}

    E -->|< 400 lines| F[Single PR Strategy]
    E -->|400-800 lines| G[2-3 PR Strategy]
    E -->|> 800 lines| H[3+ PR Strategy]

    F --> I[Generate Report]
    G --> I
    H --> I

    I --> J[Post to Jira]
    J --> K[Save Config]
    K --> L[Ready for /jira:work]
```

## Agent Used

This command invokes the **pr-size-estimator** agent which:
- Analyzes the codebase for similar patterns
- Calculates line estimates per sub-item
- Creates the splitting strategy
- Posts documentation to Jira

## Configuration Options

Environment variables to customize behavior:

```bash
# Size thresholds
PR_WARN_THRESHOLD=400       # Warn above this many lines
PR_BLOCK_THRESHOLD=800      # Require split above this

# Strategy preferences
PR_SPLIT_STRATEGY=auto      # auto, sub_item, layer, feature_slice
PR_MAX_SIZE=400             # Target max size per PR
```

## Integration

This command works with:
- **`/jira:work`**: Uses the strategy during CODE phase
- **checkpoint-pr-manager**: Creates PRs based on strategy
- **draft-pr-manager**: Creates early draft PRs
- **pr-size-guard hook**: Enforces size limits

## When to Use

Run this command:
- ✅ Before starting work on any significant feature
- ✅ When you suspect a PR will be large
- ✅ After PLAN phase but before CODE phase
- ✅ When you want team visibility into delivery plan

## See Also

- `/jira:work` - Start full orchestration (uses this strategy)
- `/jira:pr` - Create PR (respects size guard)
- `/jira:status` - Check current orchestration status

---

**Philosophy:** "The best time to split a PR is before you write the code."

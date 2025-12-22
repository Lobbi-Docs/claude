---
name: jira:batch
description: Execute bulk operations on Jira issues including mass updates, transitions, assignments, imports, and rollback operations
arguments:
  - name: operation
    description: The batch operation to perform (update, transition, assign, link, import, rollback)
    required: true
  - name: target
    description: Target issues (JQL query, issue keys, or file path for import)
    required: false
  - name: action
    description: Action to perform (depends on operation type)
    required: false
  - name: --dry-run
    description: Preview changes without executing
    required: false
  - name: --batch-size
    description: Number of issues to process per batch (default: 25)
    required: false
  - name: --rollback
    description: Rollback a previous batch operation by job ID
    required: false
version: 1.0.0
---

# Jira Batch Operations Command

You are executing a **bulk operation** on Jira issues. This command supports various batch operations with intelligent processing, rate limiting, progress tracking, and rollback capabilities.

## Operation Types

**Available Operations:**
- `update` - Bulk field updates
- `transition` - Mass status transitions
- `assign` - Bulk assignment operations
- `link` - Batch issue linking
- `import` - Import issues from file
- `rollback` - Rollback previous batch operation

---

## COMMAND OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JIRA BATCH OPERATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PARSE & VALIDATE    ─→  Parse operation, validate parameters     │
│               ↓                                                             │
│  PHASE 2: RESOLVE TARGETS     ─→  Execute JQL or load file                 │
│               ↓                                                             │
│  PHASE 3: PRE-VALIDATION      ─→  Validate all operations                  │
│               ↓                                                             │
│  PHASE 4: DRY RUN (OPTIONAL)  ─→  Preview changes                          │
│               ↓                                                             │
│  PHASE 5: USER CONFIRMATION   ─→  Display summary, request approval        │
│               ↓                                                             │
│  PHASE 6: BATCH EXECUTION     ─→  Execute in batches with rate limiting    │
│               ↓                                                             │
│  PHASE 7: PROGRESS TRACKING   ─→  Real-time progress updates               │
│               ↓                                                             │
│  PHASE 8: FINAL REPORT        ─→  Summary with rollback info               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PHASE 1: Parse & Validate

### Parse Operation Request

Extract and validate command parameters:

```markdown
1. **Operation Type**: ${operation}
2. **Target**: ${target}
3. **Action**: ${action}
4. **Options**:
   - Dry Run: ${dry-run}
   - Batch Size: ${batch-size}
   - Rollback: ${rollback}
```

### Validate Parameters

```markdown
✓ Check operation type is valid
✓ Validate target format (JQL, keys, or file path)
✓ Validate action parameters for operation type
✓ Check user has required permissions
✓ Validate batch size (1-100)
```

---

## PHASE 2: Resolve Targets

### For JQL Query

```markdown
1. Execute JQL query: ${target}
2. Fetch all matching issue keys
3. Validate issues exist
4. Count total issues
5. Display preview (first 10 issues)
```

**Example:**
```bash
/jira:batch update \
  --target "project = MYPROJ AND status = 'To Do'" \
  --action '{"priority": "High", "labels": ["urgent"]}'
```

**Output:**
```
Resolving target issues...
JQL: project = MYPROJ AND status = 'To Do'
Found: 150 issues

Preview (first 10):
  MYPROJ-1: Implement login feature
  MYPROJ-2: Add password reset
  MYPROJ-3: Create user profile page
  MYPROJ-4: Fix navigation bug
  MYPROJ-5: Update API documentation
  MYPROJ-6: Refactor authentication module
  MYPROJ-7: Add unit tests for login
  MYPROJ-8: Optimize database queries
  MYPROJ-9: Implement rate limiting
  MYPROJ-10: Add logging framework
  ... (140 more)

Continue? (yes/no):
```

### For Issue Keys List

```markdown
1. Parse comma-separated issue keys
2. Validate each key format
3. Fetch and verify all issues exist
4. Count total issues
5. Display issue list
```

**Example:**
```bash
/jira:batch transition \
  --target "MYPROJ-1,MYPROJ-2,MYPROJ-3" \
  --action "In Progress"
```

### For File Import

```markdown
1. Validate file exists
2. Detect file format (CSV, Excel, JSON)
3. Load and parse file
4. Count total rows
5. Preview data structure
```

**Example:**
```bash
/jira:batch import \
  --target /path/to/issues.csv \
  --template "Story Import"
```

---

## PHASE 3: Pre-Validation

### Activate Batch Processor Agent

```markdown
**Agent:** batch-processor
**Task:** Validate all operations before execution

For each target issue:
1. Fetch current state
2. Validate proposed changes
3. Check field constraints
4. Verify workflow transitions
5. Check user permissions
6. Log potential errors
```

### Validation Report

```markdown
╔══════════════════════════════════════════════════════════════════╗
║                    PRE-VALIDATION REPORT                         ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Total Issues: 150                                              ║
║                                                                  ║
║  ✓ Valid:   145 (96.7%)                                         ║
║  ⚠ Warning:   3 (2.0%)                                          ║
║  ✗ Invalid:   2 (1.3%)                                          ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Warnings:
  ⚠ MYPROJ-45: Assignee 'john@company.com' has 25 open issues
  ⚠ MYPROJ-67: Priority already 'High' (no change)
  ⚠ MYPROJ-89: Label 'urgent' already exists

Errors:
  ✗ MYPROJ-102: Invalid transition (workflow rule violation)
  ✗ MYPROJ-134: Permission denied (user cannot edit issue)

Recommendations:
  • Skip 2 invalid issues and proceed with 148 valid operations
  • Review warnings before proceeding
  • Estimated execution time: 4-6 minutes
```

---

## PHASE 4: Dry Run (If Enabled)

### Execute Dry Run

```markdown
When --dry-run flag is provided:

1. Simulate all operations (don't execute)
2. Generate detailed change preview
3. Identify all potential errors
4. Calculate success probability
5. Estimate execution time
6. Display comprehensive report
```

### Dry Run Report

```markdown
╔══════════════════════════════════════════════════════════════════╗
║                      DRY RUN REPORT                              ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Operation: BULK UPDATE                                         ║
║  Target Issues: 150                                             ║
║  Simulation: COMPLETED                                          ║
║                                                                  ║
║  Predicted Results:                                             ║
║  ✓ Will Succeed:  145 (96.7%)                                   ║
║  ✗ Will Fail:       5 (3.3%)                                    ║
║                                                                  ║
║  Changes Summary:                                               ║
║  • Priority: 145 issues → High                                  ║
║  • Labels: 145 issues → add 'urgent'                            ║
║                                                                  ║
║  Estimated Time: 4m 30s                                         ║
║  Success Rate: 96.7%                                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Sample Changes (first 5):
─────────────────────────────────────────────
MYPROJ-1: "Implement login feature"
  Priority: Medium → High ✓
  Labels: [backend] → [backend, urgent] ✓

MYPROJ-2: "Add password reset"
  Priority: Low → High ✓
  Labels: [] → [urgent] ✓

MYPROJ-3: "Create user profile page"
  Priority: Medium → High ✓
  Labels: [frontend] → [frontend, urgent] ✓

MYPROJ-4: "Fix navigation bug"
  Priority: Critical → High ⚠ (downgrade)
  Labels: [bug] → [bug, urgent] ✓

MYPROJ-5: "Update API documentation"
  Priority: Medium → High ✓
  Labels: [docs] → [docs, urgent] ✓

... (140 more)

Proceed with actual execution? (yes/no):
```

---

## PHASE 5: User Confirmation

### Display Summary & Request Approval

```markdown
╔══════════════════════════════════════════════════════════════════╗
║                    OPERATION SUMMARY                             ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Operation: BULK UPDATE                                         ║
║  Target: project = MYPROJ AND status = 'To Do'                  ║
║  Total Issues: 150                                              ║
║                                                                  ║
║  Actions:                                                       ║
║  • Set priority to 'High'                                       ║
║  • Add label 'urgent'                                           ║
║                                                                  ║
║  Expected Results:                                              ║
║  • Successful: 145 issues                                       ║
║  • Failed: 5 issues (see errors above)                          ║
║  • Success Rate: 96.7%                                          ║
║                                                                  ║
║  Execution Plan:                                                ║
║  • Batch Size: 25 issues/batch                                  ║
║  • Total Batches: 6                                             ║
║  • Estimated Time: 4m 30s                                       ║
║  • Rate Limit: 100 requests/min                                 ║
║                                                                  ║
║  Rollback: ENABLED                                              ║
║  Rollback data will be saved for 7 days                         ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

⚠ WARNING: This operation will modify 145 issues.
This action cannot be undone without using rollback.

Type 'yes' to proceed, 'no' to cancel:
```

---

## PHASE 6: Batch Execution

### Initialize Batch Job

```markdown
1. Create unique job ID: batch_20250115_160000_a8f3
2. Set up progress tracking
3. Initialize rollback data collection
4. Configure rate limiter
5. Start execution timer
```

### Execute in Batches

```markdown
**Batch Processor Agent** handles execution:

For each batch of 25 issues:
1. Apply rate limiting (wait if needed)
2. Execute operations concurrently (up to 10 parallel)
3. Collect rollback data for successful operations
4. Log errors for failed operations
5. Update progress tracking
6. Continue to next batch

Error Handling:
• Retry on rate limit errors (exponential backoff)
• Skip on validation errors (log and continue)
• Abort on critical errors (rollback if needed)
```

---

## PHASE 7: Progress Tracking

### Real-Time Progress Display

```markdown
╔══════════════════════════════════════════════════════════════════╗
║                    BATCH OPERATION PROGRESS                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Job ID: batch_20250115_160000_a8f3                            ║
║  Operation: Bulk Update                                         ║
║  Started: 2025-01-15 16:00:00                                   ║
║                                                                  ║
║  Progress: [████████████████░░░░░░░░] 65% (97/150)             ║
║                                                                  ║
║  ✓ Successful:  92                                              ║
║  ✗ Failed:       5                                              ║
║  ⊘ Skipped:      0                                              ║
║  ⟳ In Progress: 10                                              ║
║                                                                  ║
║  Current Batch: 4/6 (Batch size: 25)                           ║
║  Elapsed Time: 2m 54s                                           ║
║  Est. Remaining: 1m 36s                                         ║
║  Avg. Speed: 33 issues/min                                      ║
║                                                                  ║
║  Rate Limit: 87/100 requests/min                                ║
║  Concurrent: 8/10 requests                                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝

Recent Activity:
  16:02:52 - MYPROJ-92: Updated successfully ✓
  16:02:52 - MYPROJ-93: Updated successfully ✓
  16:02:53 - MYPROJ-94: FAILED (permission denied) ✗
  16:02:53 - MYPROJ-95: Updated successfully ✓
  16:02:53 - MYPROJ-96: Updated successfully ✓
```

---

## PHASE 8: Final Report

### Generate Comprehensive Report

```markdown
# Batch Operation Report

**Job ID:** batch_20250115_160000_a8f3
**Operation:** Bulk Update
**Started:** 2025-01-15 16:00:00
**Completed:** 2025-01-15 16:04:30
**Duration:** 4m 30s

## Summary

- **Total Issues:** 150
- **Successful:** 145 (96.7%)
- **Failed:** 5 (3.3%)
- **Skipped:** 0
- **Avg Speed:** 33.3 issues/min

## Success Breakdown

| Batch | Issues | Success | Failed | Time |
|-------|--------|---------|--------|------|
| 1     | 25     | 25      | 0      | 42s  |
| 2     | 25     | 25      | 0      | 45s  |
| 3     | 25     | 23      | 2      | 47s  |
| 4     | 25     | 24      | 1      | 44s  |
| 5     | 25     | 23      | 2      | 46s  |
| 6     | 25     | 25      | 0      | 43s  |

## Failed Operations

1. **MYPROJ-67** - Invalid transition (workflow rule violation)
2. **MYPROJ-89** - Invalid field value (priority validation failed)
3. **MYPROJ-102** - Permission denied (user cannot edit)
4. **MYPROJ-134** - Invalid transition (missing required field)
5. **MYPROJ-156** - Issue not found (may have been deleted)

## Changes Applied

### Priority Updates
- 145 issues: priority set to 'High'

### Label Updates
- 145 issues: label 'urgent' added

## Rollback Information

- **Rollback Available:** Yes
- **Rollback File:** `/tmp/rollback_batch_20250115_160000_a8f3.json`
- **Rollback Command:** `/jira:batch --rollback batch_20250115_160000_a8f3`
- **Expiry:** 2025-01-22 16:00:00 (7 days)

## Rate Limiting

- **Average Rate:** 84 requests/min
- **Peak Rate:** 95 requests/min
- **Limit:** 100 requests/min
- **Throttle Events:** 2

## Next Steps

1. ✓ Review failed operations and fix manually
2. ✓ Monitor updated issues for unexpected changes
3. ⚠ Consider rollback if results are unsatisfactory (expires in 7 days)
4. ✓ Update documentation with changes

---

✓ Batch operation completed successfully
✓ Rollback data saved (expires: 2025-01-22)
✓ Failed operations logged for review
```

---

## Operation Examples

### Example 1: Bulk Status Transition

```bash
/jira:batch transition \
  --target "project = MYPROJ AND status = 'To Do' AND assignee = currentUser()" \
  --action "In Progress" \
  --dry-run
```

### Example 2: Mass Field Update

```bash
/jira:batch update \
  --target "PROJ-1,PROJ-2,PROJ-3,PROJ-4,PROJ-5" \
  --action '{"customfield_10020": 42, "labels": ["sprint-42"], "priority": "High"}' \
  --batch-size 10
```

### Example 3: Round-Robin Assignment

```bash
/jira:batch assign \
  --target "project = SUPPORT AND status = 'Open' AND assignee is EMPTY" \
  --action '{"strategy": "round_robin", "assignees": ["john@company.com", "jane@company.com"]}' \
  --batch-size 30
```

### Example 4: Bulk Issue Linking

```bash
/jira:batch link \
  --target "EPIC-100" \
  --action '{"link_type": "relates to", "link_to": "project = MYPROJ AND labels = 'feature-alpha'"}' \
  --dry-run
```

### Example 5: Import from CSV

```bash
/jira:batch import \
  --target /path/to/stories.csv \
  --template "Story Import" \
  --dry-run
```

### Example 6: Rollback Previous Operation

```bash
/jira:batch --rollback batch_20250115_160000_a8f3
```

**Rollback Execution:**
```markdown
Loading rollback data...
Job ID: batch_20250115_160000_a8f3
Original operation: Bulk Update
Changes to rollback: 145

Verifying current state...
✓ 145 issues verified
⚠ 0 issues modified externally

Rollback preview:
  • 145 issues: priority High → original values
  • 145 issues: remove label 'urgent'

Proceed with rollback? (yes/no): yes

Executing rollback...
[████████████████████████] 100% (145/145)

Rollback completed:
✓ Reverted: 145 issues
✗ Failed: 0 issues
⊘ Skipped: 0 issues

Rollback successful!
```

---

## Workflow Decision Tree

```markdown
START
  ↓
Is --rollback provided?
  ├─ YES → Execute rollback operation → END
  └─ NO → Continue
       ↓
Parse operation type
  ├─ update → Bulk field updates
  ├─ transition → Mass status transitions
  ├─ assign → Bulk assignments
  ├─ link → Batch linking
  └─ import → File import (activate bulk-importer agent)
       ↓
Resolve target issues
  ├─ JQL query → Execute query, get issue keys
  ├─ Issue keys → Validate and fetch issues
  └─ File path → Load and parse file
       ↓
Activate batch-processor agent
       ↓
Pre-validate all operations
       ↓
Is --dry-run enabled?
  ├─ YES → Execute dry run, show preview → Request confirmation
  └─ NO → Show summary → Request confirmation
       ↓
User confirmed?
  ├─ NO → Cancel operation → END
  └─ YES → Continue
       ↓
Execute batch operations
       ↓
Track progress in real-time
       ↓
Generate final report
       ↓
Save rollback data
       ↓
END
```

---

## Agent Activation Protocol

### Primary Agent: batch-processor

**Activates for:** All batch operations except import

**Responsibilities:**
- Validate operations
- Execute batches
- Track progress
- Handle errors
- Generate reports
- Manage rollback

### Secondary Agent: bulk-importer

**Activates for:** Import operations only

**Responsibilities:**
- Parse import files
- Map fields
- Validate data
- Detect duplicates
- Execute import
- Generate import report

---

## Error Handling

### Validation Errors
- Log error details
- Skip invalid operations
- Continue with valid operations
- Report all errors in final summary

### API Errors
- Retry with exponential backoff (max 3 retries)
- Apply rate limiting
- Queue operations if rate limited
- Report persistent errors

### Critical Errors
- Abort operation
- Rollback completed changes (if configured)
- Generate error report
- Notify user

---

## Best Practices

1. **Always use --dry-run first** for large operations
2. **Verify JQL queries** return expected issues
3. **Monitor rate limits** to avoid API throttling
4. **Save rollback data** for destructive operations
5. **Review failed operations** and fix manually
6. **Use appropriate batch sizes** (10-50 for most operations)
7. **Schedule large batches** during off-peak hours

---

## Command Execution

**Agent Router:** Determines which agent to activate based on operation type
**Batch Processor:** Handles execution for update, transition, assign, link operations
**Bulk Importer:** Handles execution for import operations

Execute the appropriate workflow based on the provided operation and parameters.

---
name: jira:work
description: Start working on a Jira issue with full orchestration following the mandatory 6-phase protocol
arguments:
  - name: issue_key
    description: The Jira issue key (e.g., ABC-123)
    required: true
---

# Jira Issue Orchestration

You are initiating work on a **Jira issue** with full orchestration. This command fetches the issue, creates a comprehensive execution plan, and coordinates sub-agents through all 6 phases.

## Issue Details

**Issue Key:** ${issue_key}

## Step 1: Validate and Fetch Issue

First, validate the issue key format and fetch the issue from Jira.

### Actions:
```
1. Validate issue key matches pattern: [A-Z]+-[0-9]+ (e.g., ABC-123, PROJ-456)
2. If invalid format, respond with error and exit
3. Use mcp__atlassian__jira_get_issue with issue_key parameter
4. Extract all relevant fields:
   - summary: Issue title
   - description: Full description
   - issuetype: Bug, Story, Task, Epic, etc.
   - status: Current status
   - priority: Issue priority
   - assignee: Assigned user
   - reporter: Reporter
   - labels: All labels
   - components: Components
   - fixVersions: Target versions
   - customfield_*: Story points, acceptance criteria, etc.
   - subtasks: All subtasks
   - parent: Parent issue if exists
5. If issue not found, respond with error and exit
```

## Step 2: Update Jira Status to "In Progress"

Before starting work, transition the issue to "In Progress".

### Actions:
```
1. Use mcp__atlassian__jira_transition_issue
2. Set status to "In Progress"
3. Add initial comment: "Starting orchestrated development with Claude Code"
```

## Step 3: Create Orchestration Plan

Based on the issue type, create an appropriate orchestration strategy.

### NEW: PR Size Strategy (After PLAN phase)

**IMPORTANT:** Before starting CODE phase, invoke the `pr-size-estimator` agent to:
1. Analyze the scope based on sub-items
2. Estimate total PR size
3. Create splitting strategy if >400 lines expected
4. Post PR strategy to Jira

This prevents massive, overwhelming PRs by planning incremental delivery upfront.

```
If estimated size < 400 lines:
  → Single PR strategy (proceed normally)

If estimated size 400-800 lines:
  → Split into 2-3 PRs (checkpoint PRs during CODE)

If estimated size > 800 lines:
  → Split into 3+ PRs (one per sub-item group)
```

### Issue Type Strategies:

#### For Bugs:
```
EXPLORE (2 agents):
  - bug-detective: Reproduce the bug, analyze logs, identify root cause
  - impact-analyst: Assess scope of impact, check for similar issues

PLAN (1 agent):
  - fix-strategist: Design fix approach, minimal changes

CODE (2 agents):
  - bug-fixer: Implement fix
  - regression-tester: Add regression test

TEST (2 agents):
  - test-runner: Verify bug is fixed
  - edge-case-validator: Test edge cases

FIX (1 agent):
  - debugger: Address any test failures

DOCUMENT (1 agent):
  - documentation-expert: Update changelog, add root cause to Obsidian vault
```

#### For Stories/Features:
```
EXPLORE (3 agents):
  - requirements-analyst: Parse acceptance criteria, clarify requirements
  - code-explorer: Understand existing codebase
  - research-agent: Gather library/framework docs via Context7

PLAN (2 agents):
  - architect: Design solution architecture
  - task-decomposer: Break into implementation tasks

CODE (3-4 agents):
  - frontend-dev: UI implementation (if applicable)
  - backend-dev: API/service implementation (if applicable)
  - unit-tester: Write tests alongside code
  - integrator: Ensure components work together

TEST (3 agents):
  - test-runner: Execute full test suite
  - coverage-analyst: Measure coverage
  - acceptance-validator: Verify acceptance criteria met

FIX (2 agents):
  - debugger: Diagnose failures
  - fixer: Implement fixes

DOCUMENT (2 agents):
  - documentation-expert: Update docs, README, ADRs
  - vault-syncer: Sync to Obsidian vault
```

#### For Tasks:
```
EXPLORE (2 agents):
  - task-analyst: Understand requirements
  - code-explorer: Analyze relevant code

PLAN (1 agent):
  - planner: Create execution plan

CODE (2 agents):
  - implementer: Execute the task
  - validator: Verify implementation

TEST (2 agents):
  - test-runner: Run tests
  - quality-checker: Verify quality standards

FIX (1 agent):
  - fixer: Address issues

DOCUMENT (1 agent):
  - documentation-expert: Update documentation
```

## Step 4: Execute 6-Phase Protocol

Run the mandatory orchestration protocol with the agents defined above.

### Mandatory Protocol:
```
EXPLORE (2+ agents) → PLAN (1-2) → CODE (2-4) → TEST (2-3) → FIX (1-2) → DOCUMENT (1-2)
```

### Phase Execution Guidelines:

**DOCUMENTATION REQUIREMENT:** At each phase completion:
1. Create/update Confluence documentation via `confluence-documentation-creator` agent
2. Log phase completion to PR comments via `pr-documentation-logger` agent
3. Post update to Jira issue with Confluence links

---

#### Phase 1: EXPLORE
```
Spawn appropriate agents based on issue type
Extract all requirements from Jira issue:
  - Description
  - Acceptance criteria
  - Story points
  - Labels and components
  - Related issues and subtasks
Understand codebase context
Identify dependencies and risks
Document findings

📚 CONFLUENCE: Search for existing documentation
📝 JIRA: Post "Exploration complete" comment with findings
📋 PR LOG: "Phase 1: EXPLORE completed - {summary}"
```

#### Phase 2: PLAN
```
Create detailed execution plan
Break down into tasks with dependencies
Create task DAG for parallel execution
Assign agents to tasks
Define checkpoints and success criteria
Post plan summary as Jira comment

📚 CONFLUENCE: Create "Technical Design Document" page
   - Architecture overview
   - Component design
   - Data models
   - API specifications
   - Security considerations
   - Link to Jira issue: ${issue_key}
📝 JIRA: Post "Technical Design created: [Title](confluence_url)"
📋 PR LOG: "Phase 2: PLAN completed - Technical Design: {url}"
```

#### Phase 2.5: PR SIZE ESTIMATION (NEW - After PLAN, Before CODE)
```
Invoke pr-size-estimator agent:
  - Analyze sub-item complexity
  - Estimate lines per component
  - Calculate total expected size

If estimated > 400 lines:
  - Create splitting strategy
  - Map sub-items to PRs
  - Define merge order

Post PR strategy to Jira:
  - Estimated total size
  - Splitting strategy (if applicable)
  - PR plan with dependencies

📝 JIRA: Post "PR Strategy: {strategy_type} - {pr_count} PRs planned"
```

#### Phase 2.6: CREATE DRAFT PR (NEW - Early Visibility)
```
Invoke draft-pr-manager agent:
  - Create draft PR immediately
  - Include progress checklist
  - Mark as [WIP]

Purpose:
  - Early visibility for stakeholders
  - Reviewers can watch progress
  - Catch design issues early
  - Reduce "big reveal" anxiety

📝 JIRA: Post "Draft PR created: {pr_url} [DRAFT]"
```

#### Phase 3: CODE
```
Execute implementation tasks in parallel where possible
Write tests alongside code
Commit frequently with clear messages
Reference issue key in commits: "ABC-123: Description"
Handle edge cases and error states
Validate against acceptance criteria continuously

📦 CHECKPOINT PRs (If multi-PR strategy):
   After each sub-item group completes:
   - Invoke checkpoint-pr-manager agent
   - Create draft PR for completed slice
   - Post PR URL to Jira
   - Continue with next sub-item group

   This keeps PRs small and reviewable:
   - Each checkpoint PR < 400 lines
   - Reviewers can start early
   - Merge order follows dependencies

📚 CONFLUENCE: Create "Implementation Notes" page
   - Architecture decisions
   - Key abstractions
   - Integration points
   - Configuration details
   - Link to PR: {pr_url}
📝 JIRA: Post "Implementation started - see [Implementation Notes](confluence_url)"
📋 PR LOG: "Phase 3: CODE completed - {files_changed} files, {lines} lines"
🔄 DRAFT PR: Update progress (every 5 commits)
```

#### Phase 4: TEST
```
Run full test suite
Measure code coverage (target 80%+ for new code)
Run security scans if applicable
Validate acceptance criteria from Jira
Document test results
Post test status as Jira comment

📚 CONFLUENCE: Create "Test Plan & Results" page
   - Test strategy
   - Test cases covered
   - Coverage report: {percentage}%
   - Performance results
   - Edge cases tested
   - Link to PR checks
📝 JIRA: Post "Tests: {pass}/{total}, Coverage: {coverage}% - see [Test Results](confluence_url)"
📋 PR LOG: "Phase 4: TEST completed - {pass}/{total} passing, {coverage}% coverage"
```

#### Phase 5: FIX
```
Address all test failures
Fix security vulnerabilities
Address coverage gaps
Optimize performance if needed
Re-run tests after each fix
Verify no regressions

📚 CONFLUENCE: Update "Test Plan & Results" with fix details
📝 JIRA: Post "Issues resolved: {count} - all tests passing"
📋 PR LOG: "Phase 5: FIX completed - {issues_fixed} issues resolved"
```

#### Phase 6: DOCUMENT
```
Update README and docs
Create ADRs for architectural decisions
Sync documentation to Obsidian vault:
  Path: C:\Users\MarkusAhling\obsidian\Repositories\{org}\{repo}\Issues\${issue_key}.md
Document:
  - Issue summary
  - Solution approach
  - Implementation details
  - Testing results
  - Lessons learned
Prepare final commit message

📚 CONFLUENCE: Create "Runbook/Operations Guide" page
   - Deployment procedures
   - Monitoring setup
   - Troubleshooting guide
   - Rollback procedures
   - Contact information
📚 CONFLUENCE: Update "Release Notes" for this feature
📝 JIRA: Post "Documentation complete - [Technical Design](url) | [Runbook](url) | [Test Results](url)"
📋 PR LOG: "Phase 6: DOCUMENT completed - 4 Confluence pages created"
```

## Step 5: Create Pull Request

Once all phases are complete and tests pass, create a PR.

### Actions:
```
1. Ensure all changes are committed
2. Create feature branch if not already on one: feature/${issue_key}-{description}
3. Push to remote with -u flag
4. Use gh pr create with:
   - Title: "${issue_key}: ${summary}"
   - Body format:
     ## Summary
     - Brief description of changes
     - References Jira issue: ${issue_key}

     ## Acceptance Criteria Met
     - [ ] Criterion 1
     - [ ] Criterion 2

     ## Testing
     - [ ] All tests passing
     - [ ] Coverage meets threshold
     - [ ] Manual testing completed

     ## Related Issues
     - Jira: ${issue_key}

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
5. Capture PR URL from output
```

## Step 6: Update Jira Issue (Initial)

Link the PR and post initial update.

### Actions:
```
1. Use mcp__atlassian__jira_add_comment to post:
   "Pull request created: {PR_URL}

   Implementation complete:
   - All acceptance criteria met
   - Tests passing
   - Documentation updated

   Proceeding with QA transition and sub-item documentation..."
```

## Step 7: Document All Sub-Items (MANDATORY)

After PR creation, document implementation details on ALL sub-tasks and linked issues.

### Actions:
```
1. Invoke the `sub-item-documenter` agent with:
   - Parent issue key: ${issue_key}
   - PR URL: {PR_URL}
   - Branch name: {branch_name}

2. The agent will:
   - Fetch all subtasks from the parent issue
   - Fetch all linked issues (blocks, relates to, etc.)
   - For EACH sub-item, post a detailed comment:

   ## Implementation Complete ✅

   **PR:** {PR_URL}
   **Branch:** {branch_name}

   ### Changes Made
   - {specific changes for this sub-item}

   ### Files Modified
   - `path/to/file1.ts`
   - `path/to/file2.ts`

   ### Testing
   - Unit tests: ✅ Passing
   - Integration tests: ✅ Passing
   - Coverage: {X}%

   ### Related Commits
   - {commit_hash}: {message}

   ---
   🤖 Documented by Claude Code Orchestrator

3. Track documentation progress:
   - Log each sub-item documented
   - Handle failures gracefully (continue with others)
   - Report final count
```

## Step 8: Transition ALL Items to QA (MANDATORY)

Transition the main issue AND all sub-items to QA status.

### Actions:
```
1. Invoke the `qa-transition` agent with:
   - Parent issue key: ${issue_key}
   - Include subtasks: true
   - Include linked issues: true

2. The agent will:
   - Find available QA transitions for each issue
   - Handle different QA status names (QA, Ready for QA, In QA, Testing, etc.)
   - Transition the PARENT issue to QA
   - Transition ALL subtasks to QA
   - Transition linked issues to QA (if appropriate)

3. Status Mapping:
   - "QA" (preferred)
   - "Ready for QA"
   - "In QA"
   - "Quality Assurance"
   - "Testing"

4. Handle failures:
   - Log issues that couldn't be transitioned
   - Continue with remaining items
   - Report which transitions failed (may need manual update)

5. Post QA transition comment on parent:
   "🔄 QA Transition Complete

   Main issue: ${issue_key} → QA ✅
   Sub-items transitioned: {count}/{total}

   All items are now ready for quality assurance review."
```

## Step 9: Final Completion Summary

Post final summary and verify all completion criteria.

### Actions:
```
1. Use mcp__atlassian__jira_add_comment on parent issue to post:
   "## 🎉 Development Complete - Ready for QA

   **Pull Request:** {PR_URL}
   **Branch:** {branch_name}

   ### Completion Summary
   | Phase | Status |
   |-------|--------|
   | Explore | ✅ Complete |
   | Plan | ✅ Complete |
   | Code | ✅ Complete |
   | Test | ✅ All Passing ({test_count} tests) |
   | Fix | ✅ No Issues |
   | Document | ✅ Complete |

   ### Sub-Items Status
   | Issue | Documented | QA Status |
   |-------|------------|-----------|
   | {SUBTASK-1} | ✅ | ✅ QA |
   | {SUBTASK-2} | ✅ | ✅ QA |

   ### Test Coverage
   - Coverage: {coverage}%
   - New tests: {new_test_count}

   ### What's Next
   This issue and all sub-items are now in **QA** status.
   Please review the PR and run QA validation.

   ---
   🤖 Orchestrated by Claude Code | Total agents: {agent_count}
   ⏱️ Development time: {duration}"

2. Verify completion checklist:
   - [ ] PR created and linked
   - [ ] All sub-items documented
   - [ ] Main issue in QA
   - [ ] All sub-items in QA
   - [ ] Obsidian vault updated
   - [ ] No pending errors
```

## Step 10: Create Review Roadmap (MANDATORY)

Break down the PR into bite-sized review tasks so reviewers can tackle small chunks at a time.

### Actions:
```
1. Invoke the `review-facilitator` agent with:
   - Parent issue key: ${issue_key}
   - PR URL: {PR_URL}
   - All sub-item keys

2. The agent will:
   - Analyze PR complexity and lines changed
   - Group changes into reviewable chunks (5-15 min each)
   - Create a review roadmap on the parent issue

3. Review Roadmap Comment:
   "## 📖 Review Roadmap

   This PR is broken into **X reviewable chunks**.
   Total estimated review time: ~Y minutes

   ### Review Tasks (pick any to start!)
   | # | Sub-Item | Focus | Files | Est. Time | Complexity |
   |---|----------|-------|-------|-----------|------------|
   | 1 | PROJ-201 | Test cases | 3 | 5 min | 🟢 Quick |
   | 2 | PROJ-202 | Component | 4 | 10 min | 🟡 Standard |
   | 3 | PROJ-203 | API layer | 5 | 15 min | 🟡 Standard |
   | 4 | PROJ-204 | Error handling | 2 | 8 min | 🟢 Quick |

   ### How to Review
   1. **Pick any row** - you don't need to go in order!
   2. Open the sub-item to see the review checklist
   3. Review just those files (5-15 min max)
   4. Add comments on the PR or sub-item
   5. ✅ Check off items as you complete them

   **No need to review everything at once!**
   Each sub-item is independently reviewable."

4. Each sub-item already has (from sub-item-documenter):
   - 📋 Review Checklist (5-7 quick items)
   - ⏱️ Estimated review time
   - 🎯 Focus areas with file list
   - 📚 Suggested review order
   - ❓ Specific feedback questions

5. Complexity Categories:
   - 🟢 Quick (< 5 min): Config, small fixes, docs
   - 🟡 Standard (5-15 min): Features, components
   - 🔴 Deep (15-30 min): Architecture, complex logic
```

### Why Bite-Sized Reviews Matter:
```
- Reviewers can contribute in short time blocks
- Each sub-item is independently reviewable
- No need to understand entire PR at once
- Reduces review fatigue and improves quality
- Enables parallel reviews by multiple team members
- Clear progress tracking (X of Y chunks reviewed)
```

## Step 11: Final Documentation Summary (MANDATORY)

Post comprehensive documentation summary to PR and Jira with all Confluence links.

### Actions:
```
1. Invoke `pr-documentation-logger` agent to create final PR comment:

   "## 📚 Complete Documentation Trail

   ### Confluence Documentation Created
   | Document | Purpose | Link |
   |----------|---------|------|
   | Technical Design | Architecture & approach | [View]({url}) |
   | Implementation Notes | Code decisions & patterns | [View]({url}) |
   | Test Plan & Results | Testing strategy & coverage | [View]({url}) |
   | Runbook | Operations & troubleshooting | [View]({url}) |

   ### Jira Activity Log
   | Time | Action | Link |
   |------|--------|------|
   | {t1} | Started orchestration | [Comment]({url}) |
   | {t2} | EXPLORE complete | [Comment]({url}) |
   | {t3} | Technical Design created | [Confluence]({url}) |
   | {t4} | PLAN complete | [Comment]({url}) |
   | {t5} | CODE complete | [Comment]({url}) |
   | {t6} | TEST complete, 95% coverage | [Comment]({url}) |
   | {t7} | All issues → QA | [Comment]({url}) |
   | {t8} | Sub-items documented | [Comment]({url}) |

   ### Sub-Item Documentation
   | Issue | Documented | Confluence | QA |
   |-------|------------|------------|-----|
   | {SUB-1} | ✅ | [Notes]({url}) | ✅ |
   | {SUB-2} | ✅ | [Notes]({url}) | ✅ |
   | {SUB-3} | ✅ | [Notes]({url}) | ✅ |

   ### Metrics
   - **Confluence Pages Created:** 4
   - **Jira Comments Posted:** 12
   - **Sub-Items Documented:** {count}
   - **PR Comments:** 8
   - **Total Documentation Time:** {duration}

   ---
   🤖 Full audit trail maintained by Jira Orchestrator"

2. Post final summary to parent Jira issue:

   "## 📋 Complete Documentation Package

   All documentation has been created and linked:

   **Confluence:**
   - [Technical Design]({url}) - Architecture & specifications
   - [Implementation Notes]({url}) - Code decisions
   - [Test Plan & Results]({url}) - Testing strategy
   - [Runbook]({url}) - Operations guide

   **GitHub:**
   - [Pull Request]({pr_url}) - Full code changes
   - [PR Documentation Trail]({pr_comment_url}) - Complete audit log

   **Sub-Items:**
   All {count} sub-items have been documented with:
   - Implementation details
   - Review checklists
   - Confluence links

   ---
   Ready for QA review. All documentation is complete."

3. Update each sub-item with Confluence links:
   - Add comment with relevant Confluence page links
   - Reference parent documentation
```

## Step 12: Create Review Progress Dashboard (NEW)

Track review progress with a visual dashboard on the parent issue.

### Actions:
```
1. Invoke the `review-progress-tracker` agent with:
   - Parent issue key: ${issue_key}
   - PR URL: {PR_URL}
   - All review task keys

2. The agent will create a dashboard:
   "## 📊 Review Progress Dashboard

   **Completion:** X of Y chunks (Z%)

   [████████░░░░░░░░░░░░] 40%

   | Status | Count |
   |--------|-------|
   | ✅ Reviewed | N |
   | 🔄 In Progress | N |
   | ⏳ Pending | N |

   ### Progress by Reviewer
   | Reviewer | Assigned | Done | Status |
   |----------|----------|------|--------|
   | @alice | 4 | 4 | ✅ Complete |
   | @bob | 3 | 1 | 🔄 Reviewing |

   📈 Dashboard auto-updates as reviews complete."

3. Dashboard benefits:
   - Real-time visibility into review progress
   - Identifies reviewers who need nudging
   - Calculates time to approval
   - Tracks velocity and bottlenecks
```

## Error Handling

Handle errors gracefully at each step:

### Invalid Issue Key Format:
```
If issue_key does not match pattern [A-Z]+-[0-9]+:
  Respond: "Invalid issue key format. Expected format: ABC-123 (project key + issue number)"
  Exit without making Jira API calls
```

### Issue Not Found:
```
If mcp__atlassian__jira_get_issue returns 404:
  Respond: "Issue ${issue_key} not found. Please verify the issue key and try again."
  Exit
```

### Transition Failures:
```
If status transition fails:
  Log warning
  Continue with orchestration
  Note in final comment that manual status update may be needed
```

### Test Failures:
```
If tests fail in TEST phase:
  Do NOT skip to DOCUMENT
  Execute FIX phase thoroughly
  Re-run TEST phase
  Only proceed when all tests pass
```

### PR Creation Failures:
```
If gh pr create fails:
  Log the error
  Add Jira comment with commit details
  Instruct user to create PR manually
  Provide the commit message and branch name
```

## Context Management

Track context usage throughout orchestration:

### Checkpointing:
```
Create checkpoints after each phase completion
Save checkpoint data to temp files
Post phase summaries as Jira comments for continuity
```

### Context Optimization:
```
If context exceeds 75%:
  Trigger context compression
  Archive phase outputs to Obsidian vault
  Keep only current phase context active
```

## Agent Limits

| Constraint | Value |
|------------|-------|
| **Minimum** | 3 agents |
| **Maximum** | 13 agents |
| **Typical Bug** | 5-7 agents |
| **Typical Story** | 7-10 agents |
| **Typical Task** | 4-6 agents |

## Model Assignment

Assign appropriate models based on task complexity:

| Model | Use For |
|-------|---------|
| **opus-4.5** | Complex architecture decisions, strategic planning (PLAN phase) |
| **sonnet-4.5** | Development, analysis, most CODE phase work |
| **haiku** | Documentation, simple tasks, status updates |

## Success Criteria

Orchestration is complete when:
- [ ] All 6 phases executed successfully (EXPLORE → DOCUMENT)
- [ ] All tests passing
- [ ] All acceptance criteria met
- [ ] Documentation updated in both repo and Obsidian vault
- [ ] PR created and linked to Jira
- [ ] **ALL sub-items documented** (with review checklists)
- [ ] **Main issue transitioned to QA**
- [ ] **ALL sub-items transitioned to QA**
- [ ] Final completion summary posted
- [ ] **Review roadmap posted** (bite-sized review tasks)
- [ ] No blockers remain

### Confluence Documentation Checklist:
- [ ] **Technical Design** page created (after PLAN)
- [ ] **Implementation Notes** page created (after CODE)
- [ ] **Test Plan & Results** page created (after TEST)
- [ ] **Runbook/Operations Guide** page created (after DOCUMENT)
- [ ] All pages linked to Jira issue
- [ ] All pages linked in PR comments

### PR Comment Logging Checklist:
- [ ] Phase completion logged for each phase (6 total)
- [ ] Confluence page links posted
- [ ] Final documentation summary posted
- [ ] Complete audit trail visible in PR

## Example Usage

```bash
# Work on a bug
/jira:work ABC-123

# Work on a story
/jira:work PROJ-456

# Work on a task
/jira:work DEV-789
```

## Integration with Other Commands

This command can be used in conjunction with:
- `/jira:sync` - Sync all issues before starting work
- `/jira:status` - Check orchestration status
- `/orchestration-resume` - Resume if interrupted

## Jira Comment Timeline

Post comments at key milestones (with Confluence links):

1. **Start**: "Starting orchestrated development with Claude Code"
2. **After EXPLORE**: "Exploration complete: {key findings}"
3. **After PLAN**: "Execution plan created - 📚 [Technical Design]({confluence_url})"
4. **After CODE**: "Implementation complete - 📚 [Implementation Notes]({confluence_url})"
5. **After TEST**: "Tests: {pass/fail count}, Coverage: {percentage}% - 📚 [Test Results]({confluence_url})"
6. **After FIX** (if needed): "All issues resolved, tests passing"
7. **After DOCUMENT**: "Documentation complete - 📚 [Runbook]({confluence_url})"
8. **PR Created**: "Pull request created: {URL}"
9. **Sub-Items Documented**: "Implementation documented on {count} sub-items (with Confluence links)"
10. **QA Transition**: "Main issue and {count} sub-items transitioned to QA"
11. **Final Summary**: "🎉 Development Complete - Ready for QA" (detailed table)
12. **Review Roadmap**: "📖 Review broken into {count} bite-sized chunks" (task table)
13. **Documentation Package**: "📋 Complete documentation: [Tech Design]() | [Notes]() | [Tests]() | [Runbook]()"

---

### Confluence Documentation Created (4 pages minimum):

| Phase | Document | Content |
|-------|----------|---------|
| PLAN | Technical Design | Architecture, components, APIs, security |
| CODE | Implementation Notes | Decisions, abstractions, integrations |
| TEST | Test Plan & Results | Strategy, coverage, performance |
| DOCUMENT | Runbook | Deployment, monitoring, troubleshooting |

---

### PR Comment Log (posted via `pr-documentation-logger`):

Every significant action is logged to the PR:
- Phase completions with timestamps
- Confluence page creation links
- Jira status transitions
- Test results and coverage
- Final documentation summary

---

**Sub-Item Comments:** Each sub-task receives a review-friendly comment with:
- PR link and branch name
- Specific changes for that sub-item
- Files modified with line counts
- Test status and coverage
- Related commits
- **📚 Confluence Links** (relevant documentation)
- **📋 Review Checklist** (5-7 quick items)
- **⏱️ Estimated review time** (5-15 min)
- **🎯 Focus areas** (prioritized file list)
- **📚 Suggested review order**
- **❓ Feedback questions** (specific items to address)

**This enables reviewers to:**
- Pick any sub-item and review it independently
- Complete reviews in short time blocks (5-15 min)
- Track progress across multiple reviewers
- Know exactly what to look for in each chunk
- Access full documentation via Confluence links

## Notes

- Always reference the issue key in commit messages
- Use Context7 MCP for library documentation (mandatory)
- Never skip the TEST phase
- Document all architectural decisions in Obsidian vault
- Keep Jira issue updated with progress
- Follow project-specific git branch naming conventions

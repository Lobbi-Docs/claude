---
name: jira:docs
description: Generate documentation for completed Jira issue work
arguments:
  - name: issue_key
    description: Jira issue key to document
    required: true
  - name: type
    description: Documentation type (readme|api|adr|changelog|all)
    default: all
  - name: sync
    description: Sync to Confluence/Obsidian
    default: true
---

# Jira Documentation Generator

Generate comprehensive documentation for completed Jira issue work. This command analyzes changes, generates appropriate documentation types, and syncs to external systems.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:docs - {duration}`

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

## Input Parameters

**Issue Key:** ${issue_key}
**Documentation Type:** ${type}
**Sync to External Systems:** ${sync}

## Step 1: Validate and Fetch Issue

First, validate the issue and fetch complete details.

### Actions:
```
1. Validate issue key format: [A-Z]+-[0-9]+
2. Use mcp__atlassian__jira_get_issue to fetch:
   - summary: Issue title
   - description: Full description
   - issuetype: Bug, Story, Task, Epic
   - status: Current status (should be Done/Resolved)
   - resolution: Resolution type
   - assignee: Who worked on it
   - labels: All labels
   - components: Components affected
   - fixVersions: Target version
   - customfield_*: Story points, acceptance criteria
   - comments: All comments for context
   - parent: Parent issue if exists
   - subtasks: All subtasks
   - links: Related issues
3. If issue not found, exit with error
4. If issue not Done/Resolved, warn but continue
```

## Step 2: Analyze Changes

Identify all changes made for this issue.

### Git Analysis:
```
1. Search commit history for issue key:
   git log --all --grep="${issue_key}" --oneline --no-merges

2. For each matching commit, extract:
   - Commit hash
   - Author and date
   - Commit message
   - Files changed: git show --name-status {hash}
   - Diff stats: git show --stat {hash}

3. Categorize changes:
   - Frontend files (src/components/, *.tsx, *.jsx, *.vue)
   - Backend files (src/api/, src/services/, *.go, *.py)
   - Database files (migrations/, schema/)
   - Configuration (*.config.js, *.yaml, .env.example)
   - Tests (*.test.*, *.spec.*, __tests__/)
   - Documentation (*.md, docs/)

4. Calculate metrics:
   - Total commits
   - Files changed
   - Lines added/removed
   - Test coverage delta (if available)
```

### Pull Request Analysis:
```
1. Search for PR linked to issue:
   gh pr list --search "${issue_key}" --state merged --json number,title,url,mergedAt

2. If PR found, extract:
   - PR number and URL
   - Review comments
   - Approval status
   - Merge date
   - Files changed in PR
```

## Step 3: Generate Documentation Based on Type

Generate appropriate documentation based on ${type} parameter.

### Type: README (readme or all)

Update project README with new features/fixes.

#### Template:
```markdown
## Changes for ${issue_key}

**Issue:** [${issue_key}](${jira_url}) - ${summary}
**Type:** ${issuetype}
**Status:** ${status}

### Summary
${description_summary}

### What Changed
${categorized_changes}

### Usage
${usage_examples_if_applicable}

### Migration Notes
${breaking_changes_or_migration_steps}
```

#### Actions:
```
1. Read existing README.md
2. Identify appropriate section:
   - "Recent Changes" or "Changelog" section
   - "Features" section for new features
   - "Bug Fixes" section for bugs
3. Insert documentation at top of section
4. Keep only last 10 issues documented (archive older to CHANGELOG.md)
5. Write updated README.md
```

### Type: API (api or all)

Generate API documentation for endpoint changes.

#### Template:
```markdown
## API Changes - ${issue_key}

### Endpoints Modified

#### ${method} ${endpoint}
**Description:** ${endpoint_description}
**Issue:** [${issue_key}](${jira_url})

**Request:**
\`\`\`json
{
  "field": "type",
  "example": "value"
}
\`\`\`

**Response:**
\`\`\`json
{
  "status": "success",
  "data": {
    "field": "value"
  }
}
\`\`\`

**Status Codes:**
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error

**Authentication:** ${auth_required}

**Rate Limiting:** ${rate_limit_if_applicable}

**Added in:** v${version} (${issue_key})
```

#### Actions:
```
1. Analyze changed files in src/api/, src/routes/, controllers/
2. Extract endpoint definitions from code
3. Parse request/response schemas from:
   - OpenAPI/Swagger definitions
   - TypeScript interfaces
   - Pydantic models
   - JSON schema
4. Generate endpoint documentation
5. Update API documentation file (docs/api.md or API.md)
6. If OpenAPI spec exists, update it with new endpoints
```

### Type: ADR (adr or all)

Create Architecture Decision Record for significant decisions.

#### Template:
```markdown
---
title: ADR-XXXX: ${decision_title}
status: Accepted
date: ${current_date}
issue: ${issue_key}
deciders: ${assignee}, ${reviewers}
consulted: ${stakeholders}
informed: ${team}
---

# ADR-XXXX: ${decision_title}

## Context and Problem Statement

${issue_description}

**Related Issue:** [${issue_key}](${jira_url})

## Decision Drivers

* ${driver_1}
* ${driver_2}
* ${driver_3}

## Considered Options

* **Option 1:** ${option_1_description}
* **Option 2:** ${option_2_description}
* **Option 3:** ${option_3_description}

## Decision Outcome

**Chosen option:** ${chosen_option}

### Rationale

${rationale_for_decision}

### Positive Consequences

* ${positive_1}
* ${positive_2}

### Negative Consequences

* ${negative_1}
* ${negative_2}

## Implementation

### Changes Made

${implementation_details}

**Commits:** ${commit_list}
**PR:** ${pr_url}

### Migration Path

${migration_steps_if_applicable}

## Validation

### Testing Strategy

${testing_approach}

### Acceptance Criteria Met

- [x] ${criteria_1}
- [x] ${criteria_2}
- [x] ${criteria_3}

## Links

* [Jira Issue](${jira_url})
* [Pull Request](${pr_url})
* Related ADRs: ${related_adrs}

## Notes

${additional_notes}
```

#### Actions:
```
1. Determine if ADR is needed:
   - Check if issue has label "architecture" or "adr"
   - Check if changes are to core architecture
   - Check if new technology/pattern introduced
   - If none apply, skip ADR generation

2. If ADR needed:
   a. Get next ADR number from docs/adr/ directory
   b. Extract decision context from issue description
   c. Analyze commits for implementation details
   d. Generate ADR using template
   e. Save to: docs/adr/XXXX-${title_slug}.md

3. Sync to Obsidian vault:
   Path: C:\Users\MarkusAhling\obsidian\Repositories\${org}\${repo}\Decisions\XXXX-${title_slug}.md
```

### Type: CHANGELOG (changelog or all)

Update project CHANGELOG with version entry.

#### Template:
```markdown
## [v${version}] - ${date}

### Added
- **[${issue_key}]** ${summary_for_new_features}

### Changed
- **[${issue_key}]** ${summary_for_enhancements}

### Fixed
- **[${issue_key}]** ${summary_for_bug_fixes}

### Deprecated
- **[${issue_key}]** ${summary_for_deprecations}

### Removed
- **[${issue_key}]** ${summary_for_removals}

### Security
- **[${issue_key}]** ${summary_for_security_fixes}

[${issue_key}]: ${jira_url}
```

#### Actions:
```
1. Read existing CHANGELOG.md
2. Determine version:
   - Use fixVersion from Jira if set
   - Otherwise use "Unreleased" section
3. Categorize change based on issue type:
   - Story with label "feature" → Added
   - Story with label "enhancement" → Changed
   - Bug → Fixed
   - Task with label "deprecation" → Deprecated
   - Task with label "removal" → Removed
   - Bug with label "security" → Security
4. Insert entry in appropriate section
5. Write updated CHANGELOG.md
```

### Type: CODE COMMENTS (always generated)

Add inline documentation to code changes.

#### Actions:
```
1. For each file changed in commits:
   a. Read file content
   b. Identify new functions/classes/methods
   c. Check if JSDoc/docstring exists
   d. If missing, generate appropriate documentation:
      - JavaScript/TypeScript: JSDoc format
      - Python: Docstring format
      - Go: GoDoc format
      - Java: JavaDoc format
   e. Include:
      - Function/method description
      - Parameters with types
      - Return value with type
      - Throws/Errors
      - Example usage if complex
      - Link to Jira issue in @see or Notes
   f. Update file with documentation

2. Example JSDoc:
/**
 * Process user authentication request
 *
 * @param {string} username - User's username
 * @param {string} password - User's password
 * @param {AuthOptions} options - Authentication options
 * @returns {Promise<AuthResult>} Authentication result with token
 * @throws {AuthenticationError} If credentials are invalid
 *
 * @see ${issue_key} - Original implementation
 * @example
 * const result = await authenticate('user', 'pass', { mfa: true });
 */

3. Example Python Docstring:
"""
Process user authentication request.

Args:
    username (str): User's username
    password (str): User's password
    options (AuthOptions): Authentication options

Returns:
    AuthResult: Authentication result with token

Raises:
    AuthenticationError: If credentials are invalid

See Also:
    ${issue_key} - Original implementation

Example:
    result = authenticate('user', 'pass', options={'mfa': True})
"""
```

## Step 4: Sync to External Systems

If ${sync} is true, sync documentation to external platforms.

### Sync to Obsidian Vault

#### Actions:
```
1. Create issue documentation in vault:
   Path: C:\Users\MarkusAhling\obsidian\Repositories\${org}\${repo}\Issues\${issue_key}.md

2. Template:
---
title: ${issue_key} - ${summary}
created: ${issue_created_date}
updated: ${current_date}
issue_key: ${issue_key}
issue_url: ${jira_url}
issue_type: ${issuetype}
status: ${status}
priority: ${priority}
assignee: ${assignee}
reporter: ${reporter}
labels: [${labels_array}]
components: [${components_array}]
fix_version: ${fixVersion}
story_points: ${story_points}
pr_url: ${pr_url}
commits: ${commit_count}
files_changed: ${files_changed}
lines_added: ${lines_added}
lines_removed: ${lines_removed}
fileClass: issue
tags:
  - type/issue
  - status/${status_slug}
  - priority/${priority_slug}
  - repo/${repo_name}
---

# ${issue_key}: ${summary}

## Overview

**Type:** ${issuetype}
**Priority:** ${priority}
**Status:** ${status}
**Assignee:** ${assignee}

**Description:**
${description}

## Acceptance Criteria

${acceptance_criteria}

## Implementation

### Approach

${implementation_approach_from_comments}

### Changes Made

${categorized_file_changes}

### Commits

${commit_list_with_links}

### Pull Request

${pr_url_and_summary}

## Testing

${test_results_and_coverage}

## Documentation Generated

- [ ] README updated
- [ ] API documentation updated
- [ ] ADR created (if applicable)
- [ ] CHANGELOG updated
- [ ] Code comments added

## Related Issues

${linked_issues}

## Lessons Learned

${lessons_learned_from_comments_or_retrospective}

## Links

- [Jira Issue](${jira_url})
- [Pull Request](${pr_url})
- [Repository](${repo_url})

3. Write file to Obsidian vault
4. If ADR was created, ensure it's also in vault
```

### Sync to Confluence

#### Actions:
```
1. Check if Confluence space configured for project
2. If configured, create/update page:
   Space: ${project_space}
   Parent: "Development Log" or "Issues"
   Title: "${issue_key}: ${summary}"

3. Use mcp__atlassian__confluence_create_page:
   - Convert markdown to Confluence storage format
   - Include:
     - Issue summary
     - Implementation details
     - Related documentation links
     - PR link
   - Add labels: ${issue_key}, ${issue_type}, ${components}

4. Get page URL from response

5. Link back to Jira:
   Use mcp__atlassian__jira_add_comment:
   "Documentation published to Confluence: ${confluence_page_url}"
```

## Step 5: Update Jira Issue

Add comprehensive documentation summary to Jira.

### Actions:
```
1. Compile documentation summary:

Documentation Generated for ${issue_key}
=====================================

📚 Documentation Types Created:
${checked_list_of_doc_types}

📝 Files Updated:
- README.md ${if_updated}
- CHANGELOG.md ${if_updated}
- docs/api.md ${if_updated}
- docs/adr/XXXX-${title}.md ${if_created}
- Code comments in ${file_count} files

📊 Change Statistics:
- Commits: ${commit_count}
- Files changed: ${files_changed}
- Lines added: +${lines_added}
- Lines removed: -${lines_removed}
- Test coverage: ${coverage_delta}

🔗 Documentation Links:
- Obsidian: vault://Repositories/${org}/${repo}/Issues/${issue_key}.md
- Confluence: ${confluence_url} ${if_synced}
- PR: ${pr_url}

📦 Artifacts:
- Documentation committed to repository
- Synced to Obsidian vault ${if_sync_true}
- Published to Confluence ${if_sync_true}

✅ All documentation complete and up to date.

2. Use mcp__atlassian__jira_add_comment with summary above

3. Add label "documented" to issue:
   Use mcp__atlassian__jira_update_issue with labels field
```

## Step 6: Commit Documentation Changes

Commit all generated documentation to the repository.

### Actions:
```
1. Stage all documentation files:
   git add README.md CHANGELOG.md docs/ ${modified_source_files_with_comments}

2. Create commit message:
docs(${issue_key}): Add comprehensive documentation

- Update README with ${issue_type} details
- Add CHANGELOG entry for v${version}
- ${Generate_API_docs_if_applicable}
- ${Create_ADR_XXXX_if_applicable}
- Add inline documentation to ${file_count} files

Issue: ${issue_key}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

3. Commit changes:
   git commit -m "${commit_message}"

4. Push if on feature branch:
   git push
```

## Documentation Quality Checks

Ensure all generated documentation meets quality standards.

### Checklist:
```
- [ ] All issue details accurately reflected
- [ ] Code examples are valid and tested
- [ ] Links to Jira/PR are correct and working
- [ ] Markdown formatting is correct
- [ ] No placeholder text like TODO or FIXME
- [ ] Dates are in ISO format (YYYY-MM-DD)
- [ ] Version numbers are correct
- [ ] Technical terms are accurate
- [ ] Grammar and spelling checked
- [ ] Code snippets are properly formatted
- [ ] All sections have content (no empty sections)
```

## Error Handling

Handle common error scenarios gracefully.

### Issue Not Found:
```
If mcp__atlassian__jira_get_issue fails:
  Respond: "Issue ${issue_key} not found. Please verify the issue key."
  Exit
```

### No Commits Found:
```
If git log returns no commits for issue:
  Warn: "No commits found with issue key ${issue_key}"
  Offer to search by PR or date range
  Ask user for commit hashes manually
```

### Obsidian Vault Not Accessible:
```
If vault path doesn't exist:
  Warn: "Obsidian vault not found at expected path"
  Skip vault sync
  Continue with other documentation
```

### Confluence API Failure:
```
If Confluence sync fails:
  Log error
  Continue with other documentation
  Note in Jira comment that Confluence sync failed
```

### Git Commit Failure:
```
If git commit fails:
  Log error details
  Show user the staged changes
  Provide manual commit command
  Still update Jira with documentation summary
```

## Example Usage

```bash
# Generate all documentation types
/jira:docs ABC-123

# Generate only README updates
/jira:docs ABC-123 readme

# Generate API documentation only
/jira:docs ABC-123 api

# Generate ADR only
/jira:docs ABC-123 adr

# Generate changelog only
/jira:docs ABC-123 changelog

# Generate documentation without external sync
/jira:docs ABC-123 all false
```

## Integration with Other Commands

This command complements:
- `/jira:work` - Use after work is complete
- `/jira:sync` - Sync issues before documenting
- `/jira:status` - Check issue status before documenting

## Notes

- Documentation should be generated after PR is merged
- If issue has multiple PRs, document all changes
- ADRs are only created for significant architectural changes
- Code comments are added to all modified source files
- All documentation is version controlled
- External syncs (Obsidian/Confluence) are optional but recommended
- Always link back to Jira issue from documentation
- Follow project-specific documentation conventions
- Keep documentation concise but comprehensive

---
name: jira:confluence
description: Read from or write to Confluence pages linked to Jira issues
arguments:
  - name: issue_key
    description: Jira issue key (e.g., PROJ-123)
    required: true
  - name: action
    description: Action to perform (read|write|sync|create|link)
    default: read
  - name: page_type
    description: Page type for create action (tdd|api|adr|runbook|release-notes)
    required: false
  - name: space_key
    description: Confluence space key (defaults to project space)
    required: false
---

# Jira-Confluence Integration Command

Manage Confluence documentation linked to Jira issues. This command provides bi-directional integration between Jira and Confluence, enabling seamless documentation workflows.

## Step 0: Time Tracking Initialization

**AUTOMATIC**: This step runs silently before command execution begins.

The orchestration system tracks execution time for this command. When the command completes:
- If duration >= 60 seconds AND a Jira issue key is detected
- A worklog is automatically posted with comment: `[Claude] /jira:confluence - {duration}`

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
**Action:** ${action}
**Page Type:** ${page_type} (for create action)
**Space Key:** ${space_key} (optional, defaults to project space)

---

## Step 1: Validate Issue and Initialize

First, validate the issue and determine the Confluence space.

### Actions:
```
1. Validate issue key format: [A-Z]+-[0-9]+
2. Extract project key from issue_key (e.g., "PROJ" from "PROJ-123")
3. Use mcp__atlassian__jira_get_issue to fetch:
   - summary: Issue title
   - description: Full description
   - issuetype: Issue type
   - status: Current status
   - assignee: Assigned user
   - labels: All labels
   - components: Components
   - fixVersions: Target versions
   - customfield_*: Custom fields
   - comments: All comments
   - parent: Parent issue if exists
   - remoteLinks: External links (including Confluence)
4. If issue not found, exit with error
5. Determine Confluence space:
   - Use ${space_key} if provided
   - Otherwise use project key as space key
   - Fallback to "DEV" space if project space doesn't exist
6. Verify space exists using mcp__atlassian__confluence_get_space
```

---

## Action: READ

Read and display Confluence pages linked to the Jira issue.

### Step 1: Find Linked Confluence Pages

Search for pages linked to the issue.

#### Methods:
```
1. Direct Links (from Jira):
   - Extract Confluence URLs from issue.remoteLinks
   - Parse page IDs from URLs
   - Use mcp__atlassian__confluence_get_page for each page ID

2. Search by Issue Key:
   - Use mcp__atlassian__confluence_search with CQL:
     text ~ "${issue_key}" AND space = "${space_key}"
   - Filter results to pages (not comments/attachments)
   - Rank by relevance

3. Search by Issue Title:
   - Use mcp__atlassian__confluence_search with CQL:
     title ~ "${summary_words}" AND space = "${space_key}"
   - Match pages with similar titles
   - Limit to top 5 results
```

### Step 2: Extract and Display Page Content

For each linked page, extract key information.

#### Extract:
```
For each page:
1. Page metadata:
   - id: Page ID
   - title: Page title
   - type: Page type (page, blogpost)
   - status: Current status
   - version: Version number
   - space: Space key and name
   - url: Web UI URL
   - created: Creation date
   - createdBy: Creator
   - lastModified: Last modification date
   - lastModifiedBy: Last editor

2. Page content:
   - body.storage.value: Full HTML content
   - Convert HTML to markdown for display
   - Extract key sections:
     * Overview/Summary
     * Requirements/Acceptance Criteria
     * Technical Details
     * Implementation Notes
     * Status/Progress
   - Extract macros:
     * Jira issue macros
     * Status macros
     * Info/Warning/Note panels
     * Code blocks
     * Tables

3. Page relationships:
   - ancestors: Parent pages
   - children: Child pages
   - descendants: All descendants
   - labels: Page labels
   - attachments: File attachments
```

### Step 3: Display Summary

Present a comprehensive summary to the user.

#### Format:
```markdown
## Confluence Documentation for ${issue_key}

### Issue Summary
**Title:** ${summary}
**Type:** ${issuetype}
**Status:** ${status}
**Assignee:** ${assignee}

### Linked Confluence Pages (${page_count})

#### 1. ${page_title}
**URL:** ${page_url}
**Space:** ${space_key} - ${space_name}
**Last Updated:** ${lastModified} by ${lastModifiedBy}
**Labels:** ${labels_list}

**Summary:**
${page_summary_first_paragraph}

**Key Sections:**
- ${section_1}
- ${section_2}
- ${section_3}

**Status:** ${extracted_status_from_page}

---

#### 2. ${page_title}
[Same format for additional pages]

---

### Related Documentation
- Search found ${additional_pages_count} potentially related pages
- ${list_of_related_pages_with_urls}

### Actions Available
- `/jira:confluence ${issue_key} write` - Update existing pages
- `/jira:confluence ${issue_key} sync` - Sync status with Jira
- `/jira:confluence ${issue_key} create tdd` - Create new TDD page
```

### Step 4: Add Jira Comment

Log the documentation retrieval in Jira.

#### Actions:
```
Use mcp__atlassian__jira_add_comment:

📚 Confluence Documentation Retrieved

Found ${page_count} linked page(s):
${bullet_list_of_pages_with_urls}

${summary_of_key_information_from_pages}

Use `/jira:confluence ${issue_key} write` to update documentation.
```

---

## Action: WRITE

Update existing Confluence pages with progress and implementation details.

### Step 1: Find Target Pages

Identify which pages to update.

#### Actions:
```
1. Get linked pages (same as READ action)
2. If multiple pages found:
   - TDD page (priority 1)
   - API documentation page (priority 2)
   - Implementation page (priority 3)
   - Runbook page (priority 4)
3. If no pages found:
   - Suggest creating a new page
   - Exit with instructions
```

### Step 2: Gather Update Content

Collect information to add to the page.

#### Sources:
```
1. From Jira:
   - Current status
   - Latest comments
   - Acceptance criteria completion
   - Resolution details (if resolved)

2. From Git:
   - Recent commits referencing ${issue_key}
   - PR status and URL
   - Files changed
   - Test results

3. From Code Analysis:
   - Implementation approach
   - Technical decisions
   - Dependencies added/modified
   - Configuration changes
```

### Step 3: Update Page Sections

Update specific sections of the Confluence page.

#### Section Updates:

**Status Section:**
```html
<ac:structured-macro ac:name="status" ac:schema-version="1">
  <ac:parameter ac:name="colour">${status_color}</ac:parameter>
  <ac:parameter ac:name="title">${jira_status}</ac:parameter>
</ac:structured-macro>

<p>
  <strong>Last Updated:</strong> ${current_date}<br/>
  <strong>Updated By:</strong> Claude Code Orchestration<br/>
  <strong>Jira Status:</strong> <a href="${jira_url}">${issue_key}</a> - ${status}
</p>
```

**Progress Section:**
```html
<h3>Implementation Progress</h3>

<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>Status as of ${current_date}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h4>Completed</h4>
<ul>
  ${list_of_completed_acceptance_criteria}
</ul>

<h4>In Progress</h4>
<ul>
  ${list_of_in_progress_items}
</ul>

<h4>Pending</h4>
<ul>
  ${list_of_pending_items}
</ul>
```

**Implementation Details Section:**
```html
<h3>Implementation Details</h3>

<h4>Approach</h4>
<p>${implementation_approach_from_comments}</p>

<h4>Changes Made</h4>
<ul>
  <li><strong>Files Modified:</strong> ${files_changed}</li>
  <li><strong>Lines Changed:</strong> +${lines_added} / -${lines_removed}</li>
  <li><strong>Commits:</strong> ${commit_count}</li>
</ul>

<h4>Key Commits</h4>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">text</ac:parameter>
  <ac:plain-text-body><![CDATA[
${commit_hash_1}: ${commit_message_1}
${commit_hash_2}: ${commit_message_2}
${commit_hash_3}: ${commit_message_3}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h4>Pull Request</h4>
<p>
  ${if_pr_exists}
  <ac:structured-macro ac:name="status" ac:schema-version="1">
    <ac:parameter ac:name="colour">Green</ac:parameter>
    <ac:parameter ac:name="title">PR Merged</ac:parameter>
  </ac:structured-macro>
  <a href="${pr_url}">${pr_title}</a>
</p>
```

**Testing Section:**
```html
<h3>Testing</h3>

<h4>Test Results</h4>
<table>
  <tbody>
    <tr>
      <th>Category</th>
      <th>Result</th>
    </tr>
    <tr>
      <td>Unit Tests</td>
      <td>
        <ac:structured-macro ac:name="status">
          <ac:parameter ac:name="colour">${unit_test_color}</ac:parameter>
          <ac:parameter ac:name="title">${unit_test_status}</ac:parameter>
        </ac:structured-macro>
      </td>
    </tr>
    <tr>
      <td>Integration Tests</td>
      <td>
        <ac:structured-macro ac:name="status">
          <ac:parameter ac:name="colour">${integration_test_color}</ac:parameter>
          <ac:parameter ac:name="title">${integration_test_status}</ac:parameter>
        </ac:structured-macro>
      </td>
    </tr>
    <tr>
      <td>Code Coverage</td>
      <td>${coverage_percentage}%</td>
    </tr>
  </tbody>
</table>

<h4>Test Details</h4>
<ul>
  ${list_of_test_details}
</ul>
```

### Step 4: Update Page via API

Use Confluence API to update the page.

#### Actions:
```
1. Get current page version:
   Use mcp__atlassian__confluence_get_page with page ID

2. Merge new content with existing:
   - Parse current page HTML
   - Identify sections to update by heading text
   - Replace section content while preserving other sections
   - Preserve page structure and formatting

3. Update page:
   Use mcp__atlassian__confluence_update_page:
   - pageId: ${page_id}
   - title: ${existing_title} (unchanged)
   - body: ${updated_html_content}
   - version: ${current_version + 1}
   - minorEdit: false (major edit)

4. Add version comment:
   "Updated with progress from ${issue_key} - ${current_date}"

5. Capture updated page URL
```

### Step 5: Link Back to Jira

Update Jira with the Confluence page link.

#### Actions:
```
1. Check if remote link already exists in issue.remoteLinks
2. If not exists, create remote link:
   Use mcp__atlassian__jira_add_remote_link:
   - issueKey: ${issue_key}
   - url: ${confluence_page_url}
   - title: ${page_title}
   - summary: "Confluence documentation"
   - icon: Confluence icon URL

3. Add Jira comment:
   📝 Confluence Documentation Updated

   Updated page: ${page_title}
   URL: ${page_url}

   Sections updated:
   - Status: ${status}
   - Implementation Progress
   - Implementation Details
   - Testing Results

   Last updated: ${current_date}
```

---

## Action: SYNC

Bi-directional synchronization between Jira and Confluence.

### Step 1: Sync Jira → Confluence

Update Confluence pages with latest Jira status.

#### Actions:
```
1. Get current Jira issue state (from Step 1)
2. Find all linked Confluence pages
3. For each page:
   a. Update status section with current Jira status
   b. Update last modified timestamp
   c. Sync acceptance criteria completion
   d. Update assignee information
   e. Add any new comments from Jira
   f. Update version/sprint information
```

### Step 2: Sync Confluence → Jira

Extract requirements and updates from Confluence back to Jira.

#### Actions:
```
1. For each linked Confluence page:
   a. Extract requirements sections
   b. Parse acceptance criteria lists
   c. Identify new requirements not in Jira
   d. Extract technical constraints
   e. Find blockers or dependencies mentioned

2. Update Jira issue:
   a. If new acceptance criteria found:
      - Add to custom field or description
      - Add comment: "New criteria from Confluence: ${criteria}"
   b. If blockers mentioned:
      - Add comment with blocker details
      - Suggest creating blocker issues
   c. If dependencies identified:
      - Add comment with dependencies
      - Suggest linking related issues

3. Sync labels:
   - Extract labels from Confluence page
   - Add missing labels to Jira issue
   - Maintain consistency
```

### Step 3: Detect Conflicts

Identify discrepancies between systems.

#### Checks:
```
1. Status mismatches:
   - Jira shows "In Progress" but Confluence shows "Done"
   - Jira shows "Done" but Confluence shows "In Progress"

2. Assignee mismatches:
   - Different assignee in Confluence metadata

3. Version mismatches:
   - Different target version mentioned

4. Acceptance criteria mismatches:
   - Criteria marked complete in one system but not the other

5. Content conflicts:
   - Conflicting implementation approaches
   - Different technical decisions documented
```

### Step 4: Resolve Conflicts

Provide resolution options for conflicts.

#### Resolution:
```
For each conflict:
1. Display both versions to user
2. Recommend resolution based on:
   - Recency (newer wins)
   - Authority (Jira is source of truth for status)
   - Completeness (more detailed wins)

3. Apply resolution:
   - Update appropriate system
   - Add comment explaining resolution
   - Log sync action

4. Mark conflict as resolved
```

### Step 5: Generate Sync Report

Create comprehensive sync report.

#### Report Format:
```markdown
## Sync Report: ${issue_key}

**Sync Date:** ${current_date}
**Direction:** Bi-directional
**Pages Synced:** ${page_count}

### Changes: Jira → Confluence

- Status updated: ${old_status} → ${new_status}
- Assignee updated: ${old_assignee} → ${new_assignee}
- ${additional_jira_to_confluence_changes}

### Changes: Confluence → Jira

- ${changes_from_confluence_to_jira}

### Conflicts Detected

${if_conflicts_exist}
1. ${conflict_1_description}
   - Resolution: ${resolution_1}
2. ${conflict_2_description}
   - Resolution: ${resolution_2}

${else}
No conflicts detected.

### Summary

✅ Sync completed successfully
- ${change_count} changes applied
- ${conflict_count} conflicts resolved
- All systems in sync

Next sync recommended: ${next_sync_date}
```

### Step 6: Add Comments

Post sync results to both systems.

#### Jira Comment:
```
🔄 Confluence Sync Completed

Synced with ${page_count} Confluence page(s):
${list_of_pages}

Changes applied:
${summary_of_changes}

${if_conflicts}
Conflicts resolved: ${conflict_count}
${endif}

All documentation is now in sync.
```

#### Confluence Comment:
```html
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>
      <strong>Synced with Jira</strong><br/>
      Issue: <ac:link><ri:page ri:content-title="${issue_key}"/></ac:link><br/>
      Sync Date: ${current_date}<br/>
      Status: ${jira_status}
    </p>
  </ac:rich-text-body>
</ac:structured-macro>
```

---

## Action: CREATE

Create a new Confluence page from template and link to Jira issue.

### Step 1: Validate Page Type

Ensure valid page type is provided.

#### Validation:
```
1. Check ${page_type} is one of:
   - tdd: Test-Driven Development specification
   - api: API documentation
   - adr: Architecture Decision Record
   - runbook: Operational runbook
   - release-notes: Release notes

2. If ${page_type} not provided or invalid:
   - Default to "tdd" for Stories
   - Default to "api" for Tasks with "api" label
   - Default to "runbook" for Tasks with "ops" label
   - Otherwise prompt user for page type
```

### Step 2: Select Template

Choose appropriate template based on page type.

#### Template: TDD (Test-Driven Development)

```html
<h1>${issue_key}: ${summary}</h1>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#deebff</ac:parameter>
  <ac:rich-text-body>
    <p>
      <strong>Issue:</strong> <a href="${jira_url}">${issue_key}</a><br/>
      <strong>Type:</strong> ${issuetype}<br/>
      <strong>Status:</strong>
      <ac:structured-macro ac:name="status">
        <ac:parameter ac:name="colour">${status_color}</ac:parameter>
        <ac:parameter ac:name="title">${status}</ac:parameter>
      </ac:structured-macro><br/>
      <strong>Assignee:</strong> ${assignee}<br/>
      <strong>Created:</strong> ${created_date}
    </p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Overview</h2>
<p>${description}</p>

<h2>Acceptance Criteria</h2>
<table>
  <tbody>
    <tr>
      <th>Criterion</th>
      <th>Status</th>
      <th>Notes</th>
    </tr>
    ${for_each_acceptance_criterion}
    <tr>
      <td>${criterion_text}</td>
      <td>
        <ac:structured-macro ac:name="status">
          <ac:parameter ac:name="colour">Grey</ac:parameter>
          <ac:parameter ac:name="title">Pending</ac:parameter>
        </ac:structured-macro>
      </td>
      <td></td>
    </tr>
    ${end_for}
  </tbody>
</table>

<h2>Test Strategy</h2>

<h3>Unit Tests</h3>
<ul>
  <li>Test case 1: [Description]</li>
  <li>Test case 2: [Description]</li>
</ul>

<h3>Integration Tests</h3>
<ul>
  <li>Integration scenario 1: [Description]</li>
  <li>Integration scenario 2: [Description]</li>
</ul>

<h3>E2E Tests</h3>
<ul>
  <li>E2E scenario 1: [Description]</li>
  <li>E2E scenario 2: [Description]</li>
</ul>

<h2>Implementation Plan</h2>

<h3>Technical Approach</h3>
<p>[To be filled during implementation]</p>

<h3>Dependencies</h3>
<ul>
  <li>Dependency 1</li>
  <li>Dependency 2</li>
</ul>

<h3>Risks and Mitigations</h3>
<table>
  <tbody>
    <tr>
      <th>Risk</th>
      <th>Impact</th>
      <th>Mitigation</th>
    </tr>
    <tr>
      <td>[Risk description]</td>
      <td>[High/Medium/Low]</td>
      <td>[Mitigation strategy]</td>
    </tr>
  </tbody>
</table>

<h2>Progress Tracking</h2>

<ac:structured-macro ac:name="jira" ac:schema-version="1">
  <ac:parameter ac:name="server">Jira</ac:parameter>
  <ac:parameter ac:name="serverId">${jira_server_id}</ac:parameter>
  <ac:parameter ac:name="key">${issue_key}</ac:parameter>
</ac:structured-macro>

<h2>Related Documentation</h2>
<ul>
  <li><a href="#">Link to related docs</a></li>
</ul>

<hr/>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:rich-text-body>
    <p>
      <em>This page was auto-generated by Claude Code Orchestration</em><br/>
      <em>Created: ${current_date}</em>
    </p>
  </ac:rich-text-body>
</ac:structured-macro>
```

#### Template: API Documentation

```html
<h1>API: ${summary}</h1>

<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p>
      <strong>Issue:</strong> <a href="${jira_url}">${issue_key}</a><br/>
      <strong>Status:</strong> ${status}<br/>
      <strong>Version:</strong> ${fixVersion}
    </p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Overview</h2>
<p>${description}</p>

<h2>Endpoints</h2>

<h3>${method} ${endpoint_path}</h3>

<h4>Description</h4>
<p>[Endpoint description]</p>

<h4>Authentication</h4>
<ul>
  <li><strong>Required:</strong> Yes/No</li>
  <li><strong>Type:</strong> Bearer Token / API Key / OAuth</li>
  <li><strong>Permissions:</strong> [Required permissions]</li>
</ul>

<h4>Request</h4>

<p><strong>Headers:</strong></p>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<p><strong>Query Parameters:</strong></p>
<table>
  <tbody>
    <tr>
      <th>Parameter</th>
      <th>Type</th>
      <th>Required</th>
      <th>Description</th>
    </tr>
    <tr>
      <td>param1</td>
      <td>string</td>
      <td>Yes</td>
      <td>[Description]</td>
    </tr>
  </tbody>
</table>

<p><strong>Request Body:</strong></p>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "field1": "value1",
  "field2": "value2"
}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h4>Response</h4>

<p><strong>Success Response (200):</strong></p>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "status": "success",
  "data": {
    "result": "value"
  }
}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<p><strong>Error Responses:</strong></p>
<table>
  <tbody>
    <tr>
      <th>Code</th>
      <th>Description</th>
      <th>Response</th>
    </tr>
    <tr>
      <td>400</td>
      <td>Bad Request</td>
      <td><code>{"error": "Invalid parameters"}</code></td>
    </tr>
    <tr>
      <td>401</td>
      <td>Unauthorized</td>
      <td><code>{"error": "Authentication required"}</code></td>
    </tr>
    <tr>
      <td>404</td>
      <td>Not Found</td>
      <td><code>{"error": "Resource not found"}</code></td>
    </tr>
    <tr>
      <td>500</td>
      <td>Server Error</td>
      <td><code>{"error": "Internal server error"}</code></td>
    </tr>
  </tbody>
</table>

<h4>Examples</h4>

<p><strong>cURL:</strong></p>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
curl -X ${method} \
  '${base_url}${endpoint_path}' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{"field1": "value1"}'
  ]]></ac:plain-text-body>
</ac:structured-macro>

<p><strong>JavaScript:</strong></p>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">javascript</ac:parameter>
  <ac:plain-text-body><![CDATA[
const response = await fetch('${base_url}${endpoint_path}', {
  method: '${method}',
  headers: {
    'Authorization': 'Bearer {token}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    field1: 'value1'
  })
});
const data = await response.json();
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h4>Rate Limiting</h4>
<ul>
  <li><strong>Limit:</strong> [Requests per time period]</li>
  <li><strong>Headers:</strong> <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code></li>
</ul>

<h2>Testing</h2>
<p>[Link to test cases or Postman collection]</p>

<h2>Related Issues</h2>
<ac:structured-macro ac:name="jira">
  <ac:parameter ac:name="key">${issue_key}</ac:parameter>
</ac:structured-macro>
```

#### Template: ADR (Architecture Decision Record)

```html
<h1>ADR-${adr_number}: ${decision_title}</h1>

<table>
  <tbody>
    <tr>
      <td><strong>Status:</strong></td>
      <td>
        <ac:structured-macro ac:name="status">
          <ac:parameter ac:name="colour">Green</ac:parameter>
          <ac:parameter ac:name="title">Accepted</ac:parameter>
        </ac:structured-macro>
      </td>
    </tr>
    <tr>
      <td><strong>Date:</strong></td>
      <td>${current_date}</td>
    </tr>
    <tr>
      <td><strong>Issue:</strong></td>
      <td><a href="${jira_url}">${issue_key}</a></td>
    </tr>
    <tr>
      <td><strong>Deciders:</strong></td>
      <td>${assignee}, ${additional_deciders}</td>
    </tr>
  </tbody>
</table>

<h2>Context and Problem Statement</h2>
<p>${description}</p>

<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="bgColor">#fffae6</ac:parameter>
  <ac:rich-text-body>
    <p><strong>Problem:</strong> ${problem_statement}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Decision Drivers</h2>
<ul>
  <li>Driver 1: [Description]</li>
  <li>Driver 2: [Description]</li>
  <li>Driver 3: [Description]</li>
</ul>

<h2>Considered Options</h2>

<h3>Option 1: [Title]</h3>
<p>[Description of option 1]</p>

<p><strong>Pros:</strong></p>
<ul>
  <li>Pro 1</li>
  <li>Pro 2</li>
</ul>

<p><strong>Cons:</strong></p>
<ul>
  <li>Con 1</li>
  <li>Con 2</li>
</ul>

<h3>Option 2: [Title]</h3>
<p>[Description of option 2]</p>

<p><strong>Pros:</strong></p>
<ul>
  <li>Pro 1</li>
  <li>Pro 2</li>
</ul>

<p><strong>Cons:</strong></p>
<ul>
  <li>Con 1</li>
  <li>Con 2</li>
</ul>

<h2>Decision Outcome</h2>

<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="bgColor">#e3fcef</ac:parameter>
  <ac:rich-text-body>
    <p>
      <strong>Chosen Option:</strong> [Selected option]<br/>
      <strong>Rationale:</strong> [Explanation of why this option was chosen]
    </p>
  </ac:rich-text-body>
</ac:structured-macro>

<h3>Positive Consequences</h3>
<ul>
  <li>Consequence 1</li>
  <li>Consequence 2</li>
</ul>

<h3>Negative Consequences</h3>
<ul>
  <li>Consequence 1</li>
  <li>Consequence 2</li>
</ul>

<h2>Implementation</h2>
<p>[Implementation details]</p>

<h2>Validation</h2>
<p>[How the decision will be validated]</p>

<h2>Related Decisions</h2>
<ul>
  <li><a href="#">ADR-XXXX: Related Decision</a></li>
</ul>

<h2>References</h2>
<ul>
  <li><a href="${jira_url}">Jira Issue: ${issue_key}</a></li>
</ul>
```

#### Template: Runbook

```html
<h1>Runbook: ${summary}</h1>

<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="bgColor">#ffebe6</ac:parameter>
  <ac:rich-text-body>
    <p>
      <strong>⚠️ Operational Runbook</strong><br/>
      This document contains operational procedures and troubleshooting steps.
    </p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Overview</h2>
<p>${description}</p>

<table>
  <tbody>
    <tr>
      <td><strong>Service:</strong></td>
      <td>[Service name]</td>
    </tr>
    <tr>
      <td><strong>Owner:</strong></td>
      <td>${assignee}</td>
    </tr>
    <tr>
      <td><strong>On-Call:</strong></td>
      <td>[On-call rotation]</td>
    </tr>
    <tr>
      <td><strong>Severity:</strong></td>
      <td>${priority}</td>
    </tr>
  </tbody>
</table>

<h2>Quick Reference</h2>

<table>
  <tbody>
    <tr>
      <th>Action</th>
      <th>Command</th>
    </tr>
    <tr>
      <td>Check service status</td>
      <td><code>[command]</code></td>
    </tr>
    <tr>
      <td>View logs</td>
      <td><code>[command]</code></td>
    </tr>
    <tr>
      <td>Restart service</td>
      <td><code>[command]</code></td>
    </tr>
  </tbody>
</table>

<h2>Prerequisites</h2>
<ul>
  <li>Access to [system/environment]</li>
  <li>Required permissions: [permissions]</li>
  <li>Tools needed: [tools]</li>
</ul>

<h2>Procedures</h2>

<h3>Standard Operation</h3>
<ol>
  <li>Step 1: [Description]
    <ac:structured-macro ac:name="code">
      <ac:plain-text-body><![CDATA[[command]]]></ac:plain-text-body>
    </ac:structured-macro>
  </li>
  <li>Step 2: [Description]
    <ac:structured-macro ac:name="code">
      <ac:plain-text-body><![CDATA[[command]]]></ac:plain-text-body>
    </ac:structured-macro>
  </li>
</ol>

<h3>Emergency Procedure</h3>
<ol>
  <li>Immediate action: [Description]</li>
  <li>Escalation: [Who to contact]</li>
  <li>Rollback: [Rollback steps]</li>
</ol>

<h2>Troubleshooting</h2>

<h3>Issue: [Common Problem 1]</h3>
<p><strong>Symptoms:</strong></p>
<ul>
  <li>Symptom 1</li>
  <li>Symptom 2</li>
</ul>

<p><strong>Diagnosis:</strong></p>
<ol>
  <li>Check [aspect]</li>
  <li>Verify [condition]</li>
</ol>

<p><strong>Resolution:</strong></p>
<ol>
  <li>Action 1</li>
  <li>Action 2</li>
</ol>

<h2>Monitoring and Alerts</h2>
<ul>
  <li>Dashboard: <a href="#">[Link to monitoring dashboard]</a></li>
  <li>Alert channels: [Slack, PagerDuty, etc.]</li>
  <li>Key metrics: [Metrics to monitor]</li>
</ul>

<h2>Related Documentation</h2>
<ul>
  <li><a href="#">Architecture documentation</a></li>
  <li><a href="#">API documentation</a></li>
</ul>

<h2>Version History</h2>
<table>
  <tbody>
    <tr>
      <th>Date</th>
      <th>Version</th>
      <th>Changes</th>
      <th>Author</th>
    </tr>
    <tr>
      <td>${current_date}</td>
      <td>1.0</td>
      <td>Initial version</td>
      <td>${assignee}</td>
    </tr>
  </tbody>
</table>
```

#### Template: Release Notes

```html
<h1>Release Notes: ${fixVersion}</h1>

<ac:structured-macro ac:name="panel">
  <ac:parameter ac:name="bgColor">#deebff</ac:parameter>
  <ac:rich-text-body>
    <p>
      <strong>Version:</strong> ${fixVersion}<br/>
      <strong>Release Date:</strong> ${release_date}<br/>
      <strong>Issue:</strong> <a href="${jira_url}">${issue_key}</a>
    </p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Summary</h2>
<p>${summary}</p>

<h2>What's New</h2>

<h3>✨ New Features</h3>
<ul>
  <li><strong>[${issue_key}]</strong> ${feature_description}</li>
</ul>

<h3>🔧 Improvements</h3>
<ul>
  <li><strong>[${issue_key}]</strong> ${improvement_description}</li>
</ul>

<h3>🐛 Bug Fixes</h3>
<ul>
  <li><strong>[${issue_key}]</strong> ${bug_fix_description}</li>
</ul>

<h3>🔒 Security</h3>
<ul>
  <li><strong>[${issue_key}]</strong> ${security_fix_description}</li>
</ul>

<h2>Breaking Changes</h2>
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body>
    <p>${breaking_changes_or_none}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Migration Guide</h2>
<p>${migration_instructions_or_not_required}</p>

<h2>Dependencies</h2>
<table>
  <tbody>
    <tr>
      <th>Package</th>
      <th>Previous Version</th>
      <th>New Version</th>
    </tr>
    <tr>
      <td>[package-name]</td>
      <td>[old-version]</td>
      <td>[new-version]</td>
    </tr>
  </tbody>
</table>

<h2>Known Issues</h2>
<ul>
  ${known_issues_or_none}
</ul>

<h2>Installation</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
# Installation command
npm install package@${fixVersion}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Contributors</h2>
<p>Thank you to everyone who contributed to this release!</p>
<ul>
  <li>${assignee}</li>
  ${additional_contributors}
</ul>

<h2>Full Changelog</h2>
<p>
  <a href="${github_compare_url}">View full changelog on GitHub</a>
</p>
```

### Step 3: Create Page

Create the Confluence page using the selected template.

#### Actions:
```
1. Determine parent page:
   - Search for project documentation space root
   - Look for "Technical Documentation" or "Development" parent
   - Use space homepage if no suitable parent found

2. Generate page title:
   - TDD: "TDD: ${issue_key} - ${summary}"
   - API: "API: ${summary}"
   - ADR: "ADR-${adr_number}: ${decision_title}"
   - Runbook: "Runbook: ${summary}"
   - Release Notes: "Release Notes: ${fixVersion}"

3. Populate template with issue data:
   - Replace all ${variable} placeholders
   - Format dates as YYYY-MM-DD
   - Convert status to appropriate status macro color
   - Parse acceptance criteria from description
   - Extract relevant labels and components

4. Create page via API:
   Use mcp__atlassian__confluence_create_page:
   - space: ${space_key}
   - title: ${generated_title}
   - body: ${populated_template_html}
   - parentId: ${parent_page_id}
   - type: "page"

5. Add labels to page:
   - ${issue_key}
   - ${issuetype}
   - ${page_type}
   - ${components}

6. Capture page ID and URL from response
```

### Step 4: Link to Jira

Create bidirectional link between Jira and Confluence.

#### Actions:
```
1. Add remote link to Jira issue:
   Use mcp__atlassian__jira_add_remote_link:
   - issueKey: ${issue_key}
   - url: ${confluence_page_url}
   - title: ${page_title}
   - summary: "${page_type} documentation"
   - icon: Confluence icon URL

2. Add Jira macro to Confluence page:
   Update page to include Jira issue macro at bottom:
   <ac:structured-macro ac:name="jira">
     <ac:parameter ac:name="key">${issue_key}</ac:parameter>
   </ac:structured-macro>

3. Add Jira comment:
   📄 Confluence Page Created

   Page Type: ${page_type}
   Title: ${page_title}
   URL: ${confluence_page_url}

   The page has been created from template and is ready for updates.
```

---

## Action: LINK

Search for existing Confluence pages and link them to the Jira issue.

### Step 1: Search for Candidate Pages

Find pages that should be linked to the issue.

#### Search Strategies:
```
1. Search by issue key (might already be documented):
   CQL: text ~ "${issue_key}" AND space = "${space_key}"

2. Search by issue summary keywords:
   - Extract key terms from ${summary}
   - Remove common words (the, and, or, in, etc.)
   - Search: title ~ "${keyword1} ${keyword2}" AND space = "${space_key}"

3. Search by component/label:
   - For each component in issue:
     CQL: label = "${component}" AND space = "${space_key}"

4. Search by parent issue (if subtask):
   - Get parent issue key
   - Search: text ~ "${parent_key}" AND space = "${space_key}"

5. Browse related areas:
   - List pages under "/Technical Documentation/${component}"
   - List pages under "/API Documentation"
   - List pages under "/Runbooks"
```

### Step 2: Rank and Present Candidates

Score and display potential matches.

#### Scoring:
```
For each candidate page:
1. Relevance score (0-100):
   - Issue key mentioned: +50
   - Title similarity: +30 (fuzzy match)
   - Common labels: +10 per label
   - Same component: +10
   - Recent update: +5 (within 30 days)
   - Created by same user: +5

2. Display top 10 candidates:
   Rank | Score | Page Title | Last Updated | URL
   -----|-------|------------|--------------|----
   1    | 95    | ${title}   | ${date}      | ${url}
   2    | 82    | ${title}   | ${date}      | ${url}
   ...
```

### Step 3: Prompt User for Selection

Let user choose which pages to link.

#### Interaction:
```
Display message:

Found ${candidate_count} potential Confluence pages to link to ${issue_key}:

1. [Score: 95] ${page_title_1}
   URL: ${url_1}
   Last Updated: ${date_1}
   Why: ${reason_for_match_1}

2. [Score: 82] ${page_title_2}
   URL: ${url_2}
   Last Updated: ${date_2}
   Why: ${reason_for_match_2}

[List continues...]

Would you like to link any of these pages?
- "all" - Link all pages with score > 70
- "1,3,5" - Link specific pages by number
- "none" - Skip linking
- "search [term]" - Search again with different term
```

### Step 4: Create Links

Link selected pages to the Jira issue.

#### Actions:
```
For each selected page:
1. Add remote link to Jira:
   Use mcp__atlassian__jira_add_remote_link:
   - issueKey: ${issue_key}
   - url: ${page_url}
   - title: ${page_title}
   - summary: "Related Confluence documentation"

2. Add reference to Confluence page:
   a. Get current page content
   b. Check if "Related Issues" section exists
   c. If exists, append to section:
      <li><a href="${jira_url}">${issue_key}</a> - ${summary}</li>
   d. If not exists, create section:
      <h2>Related Issues</h2>
      <ul>
        <li><a href="${jira_url}">${issue_key}</a> - ${summary}</li>
      </ul>
   e. Update page with modified content

3. Optionally add Jira macro:
   <ac:structured-macro ac:name="jira">
     <ac:parameter ac:name="key">${issue_key}</ac:parameter>
   </ac:structured-macro>
```

### Step 5: Report Results

Summarize linking operation.

#### Report:
```
🔗 Confluence Pages Linked to ${issue_key}

Successfully linked ${linked_count} page(s):

1. ${page_title_1}
   URL: ${url_1}
   Action: Added remote link + updated page

2. ${page_title_2}
   URL: ${url_2}
   Action: Added remote link + updated page

[List continues...]

${if_failures}
Failed to link ${failure_count} page(s):
- ${page_title}: ${error_reason}
${endif}

All links are bidirectional and visible in both Jira and Confluence.
```

---

## Error Handling

Handle common errors gracefully.

### Invalid Issue Key:
```
If issue_key format invalid:
  Response: "Invalid issue key format: ${issue_key}
            Expected format: ABC-123 (project key + number)"
  Exit
```

### Issue Not Found:
```
If Jira API returns 404:
  Response: "Issue ${issue_key} not found in Jira.
            Please verify the issue key and try again."
  Exit
```

### Space Not Found:
```
If Confluence space doesn't exist:
  Response: "Confluence space '${space_key}' not found.
            Available spaces: ${list_spaces}

            Retry with: /jira:confluence ${issue_key} ${action} ${page_type} <space_key>"
  Exit
```

### No Pages Found (READ action):
```
If no linked pages found:
  Response: "No Confluence pages linked to ${issue_key}.

            Would you like to:
            - /jira:confluence ${issue_key} create ${page_type} - Create new page
            - /jira:confluence ${issue_key} link - Link existing page
            - /jira:confluence ${issue_key} ${action} <space_key> - Search different space"
  Exit
```

### Permission Denied:
```
If Confluence API returns 403:
  Response: "Permission denied: Cannot access Confluence space '${space_key}'.

            Required permissions:
            - Read access to space
            - ${if_write_action} Write/Edit permissions
            - ${if_create_action} Create page permissions

            Please request access from your Confluence admin."
  Exit
```

### Page Creation Failure:
```
If page creation fails:
  Log error details
  Save generated content to temp file
  Response: "Failed to create Confluence page: ${error_message}

            Generated content saved to: ${temp_file_path}

            You can:
            1. Create page manually and paste content from temp file
            2. Check Confluence space permissions
            3. Retry with different space: /jira:confluence ${issue_key} create ${page_type} <space_key>"
```

### Sync Conflicts:
```
If sync detects conflicting data:
  Display conflict details
  Prompt for resolution:

  "⚠️ Conflict detected:

  Jira: ${jira_value}
  Confluence: ${confluence_value}

  Which value is correct?
  1. Use Jira value (update Confluence)
  2. Use Confluence value (update Jira)
  3. Skip this field
  4. Cancel sync"

  Wait for user input and apply resolution
```

---

## Integration with Other Commands

This command works with:

- `/jira:work` - Create Confluence docs during work
- `/jira:docs` - Cross-reference with Confluence pages
- `/jira:sync` - Sync issue data before Confluence operations
- `/jira:status` - Check status including Confluence links

---

## Example Usage

```bash
# Read linked Confluence pages
/jira:confluence PROJ-123 read

# Update existing pages with progress
/jira:confluence PROJ-123 write

# Bi-directional sync
/jira:confluence PROJ-123 sync

# Create TDD specification
/jira:confluence PROJ-123 create tdd

# Create API documentation
/jira:confluence PROJ-123 create api

# Create ADR
/jira:confluence PROJ-123 create adr

# Create runbook in specific space
/jira:confluence PROJ-123 create runbook OPS

# Link existing pages
/jira:confluence PROJ-123 link

# Create release notes
/jira:confluence PROJ-123 create release-notes
```

---

## Notes

- Requires both Jira and Confluence MCP servers configured
- Confluence pages use Confluence Storage Format (HTML)
- Bidirectional links are created for traceability
- Templates are comprehensive and production-ready
- Sync action maintains consistency across platforms
- All operations are logged in both Jira and Confluence
- Page permissions inherit from space permissions
- Use labels for better organization and searchability

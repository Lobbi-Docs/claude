# Atlassian Query Optimization Guide

## Purpose
Prevent API response truncation and reduce context overhead by using optimized JQL/CQL queries.

## Critical Rules

### 1. ALWAYS Limit Fields
```yaml
# BAD - Fetches entire issue object (5-50KB per issue)
jql: "project = PROJ"

# GOOD - Only fetch needed fields (200-500 bytes per issue)
jql: "project = PROJ"
fields: ["key", "summary", "status"]
maxResults: 25
```

### 2. Field Selection by Use Case

| Use Case | Fields to Request |
|----------|-------------------|
| Existence check | `["key"]` |
| List view | `["key", "summary", "status", "issuetype"]` |
| Assignment | `["key", "summary", "assignee", "status"]` |
| Time tracking | `["key", "timeestimate", "timespent", "status"]` |
| Full analysis | `["key", "summary", "description", "status", "priority", "labels", "created", "updated"]` |
| Comments needed | Use `expand: "renderedFields"` only when reading comments |

### 3. Pagination Requirements
```yaml
# Always use pagination for list queries
maxResults: 25        # Default limit
startAt: 0            # Pagination offset

# For large scans, iterate with cursor
maxResults: 50        # Max per page
nextPageToken: "..."  # Use returned token
```

### 4. JQL Optimization Patterns

```jql
# Use indexed fields first (project, type, status)
project = PROJ AND issuetype = Bug AND status = Open

# Avoid full-text search when possible
# BAD: summary ~ "login error"
# GOOD: labels = "login" AND issuetype = Bug

# Use date ranges efficiently
updated >= -7d    # Last 7 days
created >= startOfMonth()  # This month

# Limit results with ORDER BY
ORDER BY updated DESC
```

### 5. CQL Optimization Patterns

```cql
# Always specify space to limit scope
space = "ENG" AND type = page

# Use labels over text search
label = "tdd" AND space = "ENG"

# Limit response fields
expand = "body.storage"   # Only when content needed
```

### 6. Status Value Constants

Instead of hardcoding, use these canonical status groups:

```yaml
QA_STATUSES:
  - "QA"
  - "In QA"
  - "Ready for QA"
  - "Awaiting QA"
  - "Testing"
  - "In Testing"

IN_PROGRESS_STATUSES:
  - "In Progress"
  - "In Development"
  - "Developing"

REVIEW_STATUSES:
  - "In Review"
  - "Code Review"
  - "Awaiting Review"
  - "Review"
```

## Agent Implementation

### Before Query
1. Determine minimum required fields
2. Set appropriate `maxResults` (default 25, max 100)
3. Add `startAt` for pagination

### Query Template
```
mcp__atlassian__searchJiraIssuesUsingJql:
  jql: "{efficient_jql}"
  fields: ["{minimal_fields}"]
  maxResults: 25
```

### After Query
1. Check if `nextPageToken` exists for more results
2. Log result count for monitoring
3. Handle empty results gracefully

## Confluence Pagination Overflow Handling

When results exceed `limit`, use cursor-based pagination to fetch all pages:

```typescript
// Confluence pagination with cursor
async function fetchAllConfluencePages(cql: string, cloudId: string): Promise<Page[]> {
  const allPages: Page[] = [];
  let cursor: string | undefined = undefined;
  const limit = 25; // Recommended page size

  do {
    const response = await mcp__atlassian__searchConfluenceUsingCql({
      cloudId,
      cql,
      limit,
      cursor,
      expand: ""  // No body content for list operations
    });

    allPages.push(...response.results);

    // Check for more pages
    if (response._links?.next) {
      // Extract cursor from next link
      cursor = extractCursor(response._links.next);
    } else {
      cursor = undefined;
    }

    // Safety: prevent infinite loops
    if (allPages.length > 1000) {
      console.warn("Pagination limit reached (1000 items). Refine your query.");
      break;
    }

  } while (cursor);

  return allPages;
}

// Helper to extract cursor from _links.next
function extractCursor(nextLink: string): string {
  const url = new URL(nextLink, "https://api.atlassian.com");
  return url.searchParams.get("cursor") || "";
}
```

### Pagination Best Practices

| Scenario | Limit | Cursor Usage |
|----------|-------|--------------|
| Quick check | 10 | None needed |
| List view | 25 | Use if `_links.next` exists |
| Full export | 50 | Iterate until no `_links.next` |
| Search results | 25 | Limited to first page usually sufficient |

### Overflow Detection

```typescript
// Check if results were truncated
function checkOverflow(response: CQLResponse): boolean {
  const hasMore = !!response._links?.next;
  const atLimit = response.results.length >= response.limit;

  if (hasMore && atLimit) {
    console.warn(`Results truncated. Found ${response.size || "many"} total, returned ${response.results.length}`);
    return true;
  }
  return false;
}

// Usage
const response = await searchConfluence(cql);
if (checkOverflow(response)) {
  // Either paginate or refine query
  if (needAllResults) {
    return fetchAllConfluencePages(cql, cloudId);
  } else {
    console.log("Using first page only - refine query for better results");
  }
}
```

---

## Anti-Patterns to Avoid

1. **Never** fetch full issues when only checking existence
2. **Never** use `*all` or empty fields array (fetches everything)
3. **Never** query without `maxResults` on list operations
4. **Never** use text search (~) when label/field search works
5. **Never** fetch description/comments unless specifically needed
6. **Never** ignore `_links.next` when you need all results
7. **Never** paginate without a safety limit (max iterations)

---

**⚓ Golden Armada** | *Optimized for Scale*

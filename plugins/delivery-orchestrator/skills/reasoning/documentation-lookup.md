# Documentation Lookup Skill

Systematic documentation retrieval using Context7 MCP for informed decision-making.

## Overview

This skill ensures agents ALWAYS have current, accurate documentation before:
- Making implementation decisions
- Debugging issues
- Comparing alternatives
- Writing code

## Core Principle

**NEVER assume API behavior. ALWAYS verify with documentation.**

## Usage Protocol

### Step 1: Identify Technologies
Scan the task for libraries, frameworks, APIs:

```typescript
const technologies = extractTechnologies(taskDescription);
// e.g., ["React", "TypeScript", "Prisma", "Next.js"]
```

### Step 2: Resolve Library IDs
For each technology, get Context7 ID:

```typescript
for (const tech of technologies) {
  const result = await resolveLibraryId({
    libraryName: tech,
    query: taskDescription
  });

  // Store: { tech: "React", libraryId: "/facebook/react" }
}
```

### Step 3: Query Specific Documentation
Query for task-specific information:

```typescript
const docs = await queryDocs({
  libraryId: "/facebook/react",
  query: "How to implement custom hooks with cleanup"
});
```

### Step 4: Store Key Findings
Cache and store important findings:

```typescript
await createEntities({
  entities: [{
    name: `docs-${tech}-${topic}`,
    entityType: "DocumentationReference",
    observations: [
      `Library: ${tech}`,
      `Version: ${version}`,
      `Key Pattern: ${pattern}`,
      `Gotchas: ${gotchas}`,
      `Retrieved: ${timestamp}`
    ]
  }]
});
```

## Auto-Detection Patterns

The skill automatically detects and queries docs for:

| Pattern | Library Hint | Example |
|---------|--------------|---------|
| `React`, `useState`, `useEffect` | React | Component state |
| `Prisma`, `$queryRaw` | Prisma ORM | Database queries |
| `Next.js`, `getServerSideProps` | Next.js | SSR patterns |
| `TypeScript`, `interface` | TypeScript | Type definitions |
| `Docker`, `Dockerfile` | Docker | Container config |
| `Kubernetes`, `kubectl` | Kubernetes | K8s resources |

## Query Templates

### For Implementation
```
"How to implement [feature] in [library] with [constraints]"
```

### For Debugging
```
"Why does [symptom] happen in [library] when [action]"
```

### For Comparison
```
"Differences between [option A] and [option B] in [library]"
```

### For Best Practices
```
"Best practices for [pattern] in [library] [version]"
```

## Integration with Reasoning

### Before Chain-of-Thought
```typescript
// 1. Gather all documentation
const allDocs = await gatherDocs(technologies, problem);

// 2. Start reasoning with doc context
await sequentialthinking({
  thought: `Based on ${tech} documentation: ${docSummary}...`,
  ...
});
```

### Before Tree-of-Thought
```typescript
// 1. Gather docs for each alternative
for (const alternative of alternatives) {
  const docs = await queryDocs({
    libraryId: alternative.libraryId,
    query: "pros cons limitations"
  });
  alternative.documentation = docs;
}

// 2. Compare with documented evidence
```

### Before Debugging
```typescript
// 1. Get expected behavior from docs
const expectedBehavior = await queryDocs({
  libraryId: libraryId,
  query: `expected behavior of ${component}`
});

// 2. Compare actual vs documented
const gap = compareWithActual(expectedBehavior, actualBehavior);
```

## Rate Limiting

To avoid excessive API calls:

```yaml
limits:
  max_queries_per_task: 5
  cache_duration_minutes: 30
  max_retries: 3
```

## Caching Strategy

```typescript
// Check cache first
const cached = await searchNodes({
  query: `docs-${libraryId}-${topic}`
});

if (cached && isRecent(cached, 30)) {
  return cached;
}

// Query fresh if not cached
const fresh = await queryDocs(params);
await cacheInMemory(fresh);
return fresh;
```

## Error Handling

```typescript
try {
  const docs = await queryDocs(params);
} catch (error) {
  if (error.type === "library_not_found") {
    // Try alternative library name
    const alternatives = suggestAlternatives(libraryName);
  } else if (error.type === "rate_limited") {
    // Use cached or wait
    await wait(retryAfter);
  } else {
    // Log and proceed with caution
    logDocLookupFailure(error);
    flagAsUnverified();
  }
}
```

## Best Practices

1. **Query Early**
   - Get docs at start of task
   - Before making any decisions

2. **Be Specific**
   - Include version numbers
   - Describe exact use case
   - Mention constraints

3. **Verify Versions**
   - Check if docs match your version
   - Note breaking changes

4. **Store Insights**
   - Save key findings in memory
   - Link to reasoning chains

5. **Flag Gaps**
   - Note when docs are incomplete
   - Flag undocumented behavior

## Keywords

documentation, context7, lookup, reference, api, library, framework,
version, patterns, best-practices, verification

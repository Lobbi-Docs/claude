# Security Documentation

## SQL Injection Prevention

All SQLite operations in the jira-orchestrator plugin have been hardened against SQL injection attacks.

### Fixed Files

1. **lib/memory-query-optimizer.ts**
2. **lib/context7-client.ts**
3. **lib/worklog-queue-sqlite.ts**

### Security Measures Implemented

#### 1. Parameterized Queries

All SQL queries use parameterized queries with `?` placeholders:

```typescript
// SECURE: Parameterized query
const stmt = this.db.prepare('SELECT * FROM cache WHERE key = ?');
stmt.get(cacheKey);

// VULNERABLE: String concatenation (NOT USED)
// const stmt = this.db.prepare(`SELECT * FROM cache WHERE key = '${key}'`);
```

#### 2. Input Validation

##### Cache Keys (memory-query-optimizer.ts)
- Validates cache key format using regex: `/^[a-zA-Z0-9:_\-\.]+$/`
- Prevents special characters that could break SQL syntax
- Applied to all cache read/write operations

##### LIKE Pattern Sanitization (memory-query-optimizer.ts)
- Escapes SQL LIKE special characters: `%`, `_`, `[`, `]`, `\`
- Prevents LIKE injection attacks in pattern-based cache invalidation

```typescript
private sanitizeLikePattern(pattern: string): string {
  return pattern
    .replace(/\/g, '\\')  // Escape backslash
    .replace(/%/g, '\%')    // Escape %
    .replace(/_/g, '\_')    // Escape _
    .replace(/\[/g, '\[')   // Escape [
    .replace(/\]/g, '\]');  // Escape ]
}
```

##### Method Names (context7-client.ts)
- Validates method names: `/^[a-zA-Z][a-zA-Z0-9\-_]*$/`
- Prevents injection through method parameter

##### Cache Keys (context7-client.ts)
- Validates hexadecimal cache keys: `/^[a-fA-F0-9]+$/`
- Ensures only hash values are used as keys

##### Worklog Data (worklog-queue-sqlite.ts)
- **Issue Keys**: Validates Jira format `/^[A-Z][A-Z0-9]+-\d+$/i`
- **IDs**: Ensures positive integers only
- **Time Values**: Validates positive numbers
- **Dates**: Validates Date objects
- **Comments**: Type-checks strings
- **Metadata**: Validates objects

#### 3. Array ID Validation

When constructing `IN` clauses with dynamic length:

```typescript
// Validate all IDs are positive integers
private validateIds(ids: number[]): void {
  for (const id of ids) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid ID: ${id}`);
    }
  }
}

// Then safely construct placeholders
const placeholders = ids.map(() => '?').join(',');
const stmt = this.db.prepare(`UPDATE worklogs WHERE id IN (${placeholders})`);
stmt.run(...ids);
```

### Attack Vectors Mitigated

#### 1. Classic SQL Injection
```typescript
// Attempt: issueKey = "'; DROP TABLE worklogs; --"
// Result: Rejected by validateWorklog() - invalid format
```

#### 2. LIKE Injection
```typescript
// Attempt: pattern = "%'; DROP TABLE cache; --"
// Result: Sanitized to "\%'; DROP TABLE cache; --" (harmless search)
```

#### 3. Integer Injection
```typescript
// Attempt: id = -1 OR 1=1
// Result: Rejected by validateIds() - must be positive integer
```

#### 4. Cache Key Manipulation
```typescript
// Attempt: cacheKey = "key'; DELETE FROM cache; --"
// Result: Rejected by validateCacheKey() - invalid characters
```

### Testing

Run security tests:

```bash
npm test tests/sql-injection-security.test.ts
```

Tests cover:
- LIKE pattern sanitization
- Cache key validation
- Method name validation
- Issue key format validation
- ID validation (positive integers)
- Data type validation

### Best Practices

1. **Always use parameterized queries**
   - Use `?` placeholders
   - Never concatenate user input into SQL strings

2. **Validate all inputs**
   - Check types, formats, ranges
   - Whitelist valid characters
   - Reject invalid input before SQL execution

3. **Escape special characters**
   - Especially for LIKE patterns
   - Use proper escape sequences

4. **Use transactions for atomicity**
   - Prevents partial writes on validation failures
   - Already implemented for batch operations

5. **Sanitize JSON data**
   - Validate before `JSON.stringify()`
   - Ensure metadata is proper object

### Security Audit Checklist

- [x] All SQL queries use parameterized queries
- [x] Input validation on all user-provided data
- [x] LIKE patterns are sanitized
- [x] Cache keys are validated
- [x] IDs are validated (positive integers)
- [x] Issue keys match Jira format
- [x] Numeric values are range-checked
- [x] Date objects are validated
- [x] No string concatenation in SQL
- [x] Transactions used for multi-step operations
- [x] Security tests implemented
- [x] Documentation updated

### References

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Better-SQLite3 Best Practices](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#binding-parameters)
- [CWE-89: SQL Injection](https://cwe.mitre.org/data/definitions/89.html)

### Reporting Security Issues

If you discover a security vulnerability, please email: security@lobbi.com

Do NOT create public issues for security vulnerabilities.

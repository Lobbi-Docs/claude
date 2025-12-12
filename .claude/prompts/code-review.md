---
name: code-review
category: review
description: Templates for code review feedback
---

# Code Review Prompts

## Comprehensive Review

\`\`\`
Review the following code for:

**Files:** {{files}}

Analyze from these perspectives:

1. **Code Quality**
   - Readability and maintainability
   - Naming conventions
   - Code organization
   - DRY principle adherence

2. **Security**
   - Input validation
   - Authentication/authorization
   - Sensitive data handling
   - Injection prevention

3. **Performance**
   - Algorithm efficiency
   - Resource usage
   - Caching opportunities
   - Database query optimization

4. **Testing**
   - Test coverage
   - Edge case handling
   - Mock appropriateness

5. **Documentation**
   - Code comments
   - Docstrings
   - README updates needed

Provide specific, actionable feedback with file:line references.
\`\`\`

## Security-Focused Review

\`\`\`
Perform a security review of: {{target}}

Check for:
- [ ] SQL injection vulnerabilities
- [ ] XSS vulnerabilities
- [ ] Command injection
- [ ] Hardcoded secrets
- [ ] Insecure deserialization
- [ ] Missing authentication
- [ ] Missing authorization
- [ ] Sensitive data in logs
- [ ] Insecure direct object references
- [ ] Missing input validation
- [ ] Outdated dependencies with known CVEs

For each finding, provide:
- Severity (Critical/High/Medium/Low)
- Location (file:line)
- Description
- Remediation steps
- Reference (CWE/OWASP)
\`\`\`

## Performance Review

\`\`\`
Analyze performance characteristics of: {{target}}

Evaluate:
1. **Time Complexity**
   - Identify O(n²) or worse algorithms
   - Loop efficiency
   - Recursive calls

2. **Space Complexity**
   - Memory allocations
   - Data structure choices
   - Caching strategy

3. **I/O Operations**
   - Database queries (N+1 problems)
   - Network calls
   - File operations

4. **Concurrency**
   - Thread safety
   - Race conditions
   - Deadlock potential

Provide optimization recommendations with expected impact.
\`\`\`

## Quick Review Checklist

\`\`\`
Quick review for: {{files}}

□ No syntax errors
□ Follows project style guide
□ No obvious bugs
□ Error handling present
□ No hardcoded values
□ Tests added/updated
□ Documentation updated
□ No security concerns
□ Ready to merge: Yes/No

Issues found: {{count}}
- [severity] description (file:line)
\`\`\`

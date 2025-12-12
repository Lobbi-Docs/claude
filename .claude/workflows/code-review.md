---
name: code-review
description: Comprehensive code review workflow with multiple perspectives
pattern: mesh
agents:
  - reviewer
  - security-auditor
  - code-analyzer
coordinator: mesh-coordinator
---

# Code Review Workflow

## Overview

Multi-agent code review that examines code from multiple perspectives simultaneously.

## Workflow Pattern

\`\`\`
                    ┌─────────────────────┐
                    │  mesh-coordinator   │
                    │   (orchestrates)    │
                    └─────────┬───────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │  reviewer   │   │  security   │   │   code      │
    │  (quality)  │   │  -auditor   │   │  -analyzer  │
    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Review Summary    │
                    │   (aggregated)      │
                    └─────────────────────┘
\`\`\`

## Review Perspectives

### 1. Code Quality (reviewer)

**Focus Areas:**
- Code readability and maintainability
- Design patterns and architecture
- Error handling
- Documentation quality
- Test coverage

**Checklist:**
\`\`\`markdown
## Code Quality Review

### Readability
- [ ] Clear function/variable naming
- [ ] Appropriate comments
- [ ] Consistent formatting
- [ ] No overly complex logic

### Design
- [ ] Single responsibility principle
- [ ] DRY (Don't Repeat Yourself)
- [ ] Appropriate abstractions
- [ ] No premature optimization

### Testing
- [ ] Unit tests present
- [ ] Edge cases covered
- [ ] Tests are readable
- [ ] Mocking done appropriately
\`\`\`

### 2. Security (security-auditor)

**Focus Areas:**
- Input validation
- Authentication/authorization
- Data protection
- Dependency vulnerabilities
- OWASP Top 10

**Checklist:**
\`\`\`markdown
## Security Review

### Input Handling
- [ ] All inputs validated
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] Command injection prevented

### Authentication
- [ ] Proper auth checks
- [ ] Session management
- [ ] Password handling
- [ ] Token security

### Data Protection
- [ ] Sensitive data encrypted
- [ ] No secrets in code
- [ ] Proper logging (no PII)
- [ ] Secure communication (TLS)
\`\`\`

### 3. Code Analysis (code-analyzer)

**Focus Areas:**
- Cyclomatic complexity
- Code duplication
- Performance patterns
- Resource management
- Type safety

**Metrics:**
\`\`\`markdown
## Code Metrics

### Complexity
- Cyclomatic complexity: < 10 per function
- Cognitive complexity: < 15 per function
- Lines per function: < 50

### Duplication
- Duplicate code blocks: < 5%
- Similar logic patterns: Flagged for review

### Performance
- O(n²) or worse algorithms: Flagged
- Memory allocations in loops: Flagged
- Blocking operations: Flagged
\`\`\`

## Aggregated Output

\`\`\`markdown
# Code Review Summary

**PR/Branch:** feature/add-rate-limiting
**Reviewers:** reviewer, security-auditor, code-analyzer
**Date:** YYYY-MM-DD

## Overall Score: 8.5/10

### By Perspective

| Reviewer | Score | Critical | Major | Minor |
|----------|-------|----------|-------|-------|
| Quality  | 9/10  | 0        | 1     | 3     |
| Security | 8/10  | 0        | 2     | 1     |
| Analysis | 8.5/10| 0        | 1     | 2     |

### Critical Issues (Blocking)
None

### Major Issues (Should Fix)
1. **[Security]** Rate limiter key should include user ID to prevent bypass
   - File: `middleware/rate_limit.py:45`
   - Recommendation: Use `f"{user_id}:{endpoint}"` as key

2. **[Quality]** Missing error handling for Redis connection failures
   - File: `middleware/rate_limit.py:23`
   - Recommendation: Add fallback to in-memory rate limiting

3. **[Analysis]** Potential memory leak in rate limit cache
   - File: `middleware/rate_limit.py:67`
   - Recommendation: Add TTL to cache entries

### Minor Issues (Consider)
1. Add docstring to `RateLimiter` class
2. Consider using dataclass for config
3. Add type hints to helper functions
4. Rename `rl` variable to `rate_limiter`

### Positive Observations
- Clean separation of concerns
- Good test coverage (85%)
- Consistent error response format

## Recommendation
**Approved with changes** - Address major issues before merge
\`\`\`

## Configuration

\`\`\`yaml
# .claude/workflows/code-review.yaml
name: code-review
pattern: mesh

reviewers:
  - agent: reviewer
    weight: 0.4
    focus: [quality, maintainability, testing]

  - agent: security-auditor
    weight: 0.35
    focus: [security, vulnerabilities, compliance]

  - agent: code-analyzer
    weight: 0.25
    focus: [complexity, performance, patterns]

thresholds:
  approve: 7.0
  approve_with_changes: 5.0
  request_changes: 0.0

blocking_criteria:
  - critical_issues > 0
  - security_score < 6.0
\`\`\`

## Invocation

\`\`\`bash
# Review current changes
/review

# Review specific files
Task("Code Review", "Review rate limiting implementation in middleware/", "mesh-coordinator")

# Review PR (if available)
Task("PR Review", "Review PR #123", "code-review-swarm")
\`\`\`

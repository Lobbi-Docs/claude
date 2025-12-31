# PR Review Copilot

**Callsign**: Reviewer
**Version**: 1.0.0
**Plugin Type**: Multi-Agent PR Review System

## Overview

PR Review Copilot is an intelligent code review system that catches **real bugs, security vulnerabilities, performance issues, and edge cases** through coordinated multi-agent analysis. Unlike linters that focus on style, this plugin identifies issues that actually matter.

## Key Features

- 🔒 **Security Auditing**: OWASP Top 10, injection vulnerabilities, auth/authz issues
- 🐛 **Bug Detection**: Null pointers, race conditions, edge cases, logic errors
- ⚡ **Performance Analysis**: N+1 queries, missing indexes, inefficient algorithms
- 🧪 **Test Coverage**: Identifies untested code paths and missing edge case tests
- 🔄 **API Contract Review**: Breaking changes, backward compatibility, versioning
- 💾 **Database Migration Safety**: Data loss risks, locking issues, rollback validation
- 🏗️ **Architecture Consistency**: Pattern violations, code organization, best practices
- 📊 **Priority Classification**: Intelligent severity and impact assessment

## Agent Roster (10 Agents)

### 1. PR Context Analyzer (`Context`)
- **Role**: Understands PR scope, dependencies, and risk areas
- **Model**: Sonnet
- **Analyzes**: File changes, dependencies, breaking changes, PR type

### 2. Logic & Bug Detective (`Detective`)
- **Role**: Deep logic analysis and bug detection
- **Model**: Sonnet
- **Finds**: Null pointers, edge cases, race conditions, error handling gaps

### 3. Security Auditor (`Guardian`)
- **Role**: Security vulnerability identification
- **Model**: Sonnet
- **Detects**: SQL injection, XSS, auth bypass, sensitive data exposure

### 4. Performance Analyst (`Optimizer`)
- **Role**: Performance bottleneck identification
- **Model**: Sonnet
- **Identifies**: N+1 queries, missing indexes, inefficient algorithms, memory leaks

### 5. Test Coverage Validator (`Tester`)
- **Role**: Ensures adequate test coverage
- **Model**: Sonnet
- **Checks**: Unit tests, edge case tests, negative tests, regression tests

### 6. Pattern Consistency Checker (`Architect`)
- **Role**: Maintains codebase consistency
- **Model**: Sonnet
- **Validates**: Architecture patterns, naming conventions, code organization

### 7. API Contract Reviewer (`Contract`)
- **Role**: API compatibility and versioning
- **Model**: Sonnet
- **Reviews**: Breaking changes, API contracts, backward compatibility

### 8. Database Migration Expert (`Migrator`)
- **Role**: Database change safety analysis
- **Model**: Sonnet
- **Assesses**: Data loss risks, locking issues, migration safety, rollback plans

### 9. Review Synthesizer (`Synthesizer`)
- **Role**: Aggregates findings and generates review
- **Model**: Sonnet
- **Outputs**: Consolidated review, inline comments, recommendations

### 10. Priority Classifier (`Classifier`)
- **Role**: Severity and priority assessment
- **Model**: Haiku
- **Classifies**: Blocking, High, Medium, Low, Nitpick

## Workflows

### Quick Review (< 100 lines)
- **Duration**: 2-3 minutes
- **Agents**: Context, Detective, Guardian, Classifier, Synthesizer
- **Focus**: Critical bugs and security issues only

### Standard Review (100-500 lines)
- **Duration**: 5-8 minutes
- **Agents**: All except specialized (conditional)
- **Focus**: Comprehensive review with test coverage

### Deep Review (≥ 500 lines)
- **Duration**: 10-15 minutes
- **Agents**: All 10 agents
- **Focus**: Thorough analysis including architecture and maintainability

### Security Focused
- **Duration**: 8-12 minutes
- **Trigger**: Auth/security file changes
- **Focus**: Deep security audit, threat modeling, compliance

### Migration Review
- **Duration**: 6-10 minutes
- **Trigger**: Database migration files
- **Focus**: Migration safety, data integrity, rollback validation

## Usage

### Automatic Trigger
Plugin activates automatically when you mention:
- "review this pr"
- "review pull request"
- "check this pr"
- "pr review"
- "code review"

### Manual Trigger
```bash
/review <pr-url>
/pr-review <pr-url>
/code-review <pr-number>
```

### With Options
```bash
/review <pr-url> --depth=deep
/review <pr-url> --focus=security
/review <pr-url> --focus=performance,tests
```

## Severity Levels

### 🔴 Blocking
**Must fix before merge**
- Critical security vulnerabilities (SQL injection, auth bypass)
- Data loss or corruption risks
- Production stability threats
- Breaking changes without migration

### 🟠 High
**Should fix before merge**
- Security vulnerabilities (medium risk)
- Significant bugs or performance issues
- Missing tests for new features
- Important edge cases not handled

### 🟡 Medium
**Should address soon**
- Minor performance issues
- Pattern inconsistencies
- Missing edge case tests
- API improvements needed

### 🟢 Low
**Nice to have**
- Optimization opportunities
- Code readability improvements
- Additional test coverage
- Documentation enhancements

### ⚪ Nitpick
**Subjective preferences (usually not reported)**
- Style preferences
- Alternative naming suggestions
- Minor refactoring ideas

## Output Format

### Review Summary
```markdown
## Review Summary

**Overall Assessment**: ✅ Approved / 🔄 Request Changes / ⚠️ Needs Discussion

**Key Highlights**:
- ✅ Positive findings
- ⚠️ Issues found
- 💡 Improvement suggestions

**Issues Found**:
- Blocking: X
- High: X
- Medium: X
- Low: X

**Recommendation**: [Approve|Request Changes|Needs Discussion]
**Estimated Fix Time**: X hours/minutes
```

### Inline Comments
Each finding includes:
- 📍 **File and line number**
- 🏷️ **Category** (Security, Bug, Performance, etc.)
- ⚠️ **Severity** (Blocking, High, Medium, Low)
- 📝 **Description** of the issue
- 💡 **Suggested fix** with code example
- 🔗 **References** (docs, standards, examples)

### Code Suggestions
```typescript
// Current code (problematic)
const user = await getUser(id);
console.log(user.email); // ❌ Potential null pointer

// Suggested fix
const user = await getUser(id);
if (user) {
  console.log(user.email); // ✅ Safe
} else {
  logger.warn('User not found', { id });
}
```

## What This Plugin DOES Catch

✅ **Real Issues**:
- SQL injection vulnerabilities
- Null pointer exceptions
- N+1 database queries
- Race conditions in async code
- Missing authentication checks
- Data loss risks in migrations
- Breaking API changes without versioning
- Edge cases not covered by tests
- Memory leaks and resource retention
- Performance regressions

## What This Plugin DOES NOT Catch

❌ **Style Issues (use linters for these)**:
- Missing semicolons (ESLint)
- Indentation (Prettier)
- Naming style preferences (StyleLint)
- Import ordering (ESLint)
- Line length (Prettier)

## Configuration

### Plugin Settings (`plugin.json`)
```json
{
  "default_review_depth": "standard_review",
  "auto_approve_threshold": "none",
  "block_on_security_issues": true,
  "block_on_missing_tests": false,
  "require_breaking_change_docs": true,
  "max_review_time_minutes": 15,
  "parallel_agent_reviews": true,
  "severity_levels": ["blocking", "high", "medium", "low", "nitpick"]
}
```

### Custom Rules
Add project-specific rules in `custom_rules` configuration:
```json
{
  "custom_rules": [
    {
      "id": "no-console-production",
      "pattern": "console\\.(log|debug|info)",
      "severity": "high",
      "message": "Console statements not allowed in production code",
      "applies_to": ["src/**/*.ts", "!src/**/*.test.ts"]
    }
  ]
}
```

## Integration

### Required MCPs
- **github**: For PR data and comment posting

### Optional MCPs
- **context7**: For library documentation lookup
- **ide**: For diagnostics and type information

### Required Skills
- **testing**: Test analysis and coverage
- **git-workflows**: Git operations and diff parsing

### Recommended Skills
- **authentication**: Auth/authz pattern knowledge
- **database**: Database best practices
- **rest-api**: API design patterns

## Performance Metrics

### Review Speed
- Small PR (< 100 lines): **2-3 minutes**
- Medium PR (100-500 lines): **5-8 minutes**
- Large PR (≥ 500 lines): **10-15 minutes**

### Accuracy
- **False Positive Rate**: < 10% (issues flagged incorrectly)
- **False Negative Rate**: < 15% (real issues missed)
- **Actionable Findings**: > 85% (findings worth addressing)

## Examples

See the `examples/` directory for full review outputs:
- [`example_review_small_pr.md`](examples/example_review_small_pr.md) - Email validation feature
- [`example_review_security_critical.md`](examples/example_review_security_critical.md) - JWT authentication
- [`example_review_performance.md`](examples/example_review_performance.md) - Dashboard optimization
- [`example_review_database_migration.md`](examples/example_review_database_migration.md) - Schema migration

## Advanced Features

### Workflow Selection
Plugin automatically selects appropriate workflow based on:
- Lines changed
- Files affected (auth, migrations, etc.)
- PR labels
- Breaking change detection

### Conditional Agents
Specialized agents activate only when relevant:
- **API Contract Reviewer**: Only for API file changes
- **Database Migration Expert**: Only for migration files
- **Security Auditor** (deep mode): Only for auth/security changes

### Quality Gates
Configurable blocking conditions:
- Block on security issues (any severity)
- Block on missing tests for new features
- Block on breaking changes without migration
- Block on performance regressions

### Fast Fail
Quick exit on critical issues:
- Syntax errors
- Critical security vulnerabilities
- Obvious null pointers in main flow

## Troubleshooting

### Review Taking Too Long?
- Check if PR is too large (> 1000 lines)
- Consider splitting PR into smaller chunks
- Use `--depth=quick` for fast scan

### Too Many Nitpicks?
- Adjust `severity_threshold` in config
- Set `filter_nitpicks: true`
- Focus on `blocking` and `high` only

### Missing Context?
- Ensure PR description is clear
- Link related issues/tickets
- Add comments explaining complex changes

## Development

### Adding Custom Agents
1. Create agent definition in `agents/`
2. Add to workflow in `workflows/`
3. Update `plugin.json` capabilities
4. Test with sample PRs

### Extending Workflows
1. Copy existing workflow from `workflows/`
2. Modify agent list and phases
3. Adjust timing and focus areas
4. Add workflow to `plugin.json` trigger conditions

## Metrics Tracked

- Reviews completed
- Bugs caught (by severity)
- Security issues found (by OWASP category)
- Performance issues detected
- Test gaps identified
- False positive rate
- Time to review
- Developer satisfaction

## License

MIT

## Support

For issues, questions, or feature requests:
- Check examples for common scenarios
- Review agent definitions for capabilities
- Consult workflows for customization options

---

**Built for developers, by developers.** Catch real issues, ship better code.

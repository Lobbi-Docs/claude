# Comprehensive Code Review

> **v2.0 Available**: This command has been upgraded to v2.0 with **parallel execution** for 59% faster performance (17 min vs 41 min).
> See `.claude/commands/v2/review-all.json` for the optimized version.
>
> **Performance Comparison**:
> - v1.0 (this file): Sequential execution - 41 minutes
> - v2.0 (recommended): Parallel execution - 17 minutes (24 minutes saved)
>
> To use v2.0: `/review-all --version=2.0`

Perform a thorough code review of the entire codebase with focus on:

## Code Quality
- Check for code smells and anti-patterns
- Verify adherence to coding standards and conventions
- Identify areas for refactoring
- Assess code readability and maintainability

## Best Practices
- Review error handling patterns
- Check for proper logging and debugging support
- Verify documentation completeness
- Assess test coverage

## Architecture
- Evaluate component/module organization
- Check for separation of concerns
- Identify tight coupling or circular dependencies
- Review design patterns usage

## Performance
- Identify potential performance bottlenecks
- Check for memory leaks or inefficient algorithms
- Review database query optimization
- Assess caching strategies

## Security
- Basic security vulnerability scan
- Check for exposed secrets or credentials
- Review input validation and sanitization
- Verify authentication and authorization patterns

Provide actionable recommendations prioritized by severity (Critical, High, Medium, Low).

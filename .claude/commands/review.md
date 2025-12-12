# Code Review

Perform a comprehensive code review of recent changes.

## Instructions

Execute a thorough code review using the following checklist:

### 1. Gather Changes

\`\`\`bash
# View recent changes
git diff HEAD~1

# Or compare with main branch
git diff main...HEAD

# View changed files
git diff --name-only main...HEAD
\`\`\`

### 2. Review Checklist

#### Code Quality
- [ ] Code follows project style guidelines
- [ ] Functions are small and focused
- [ ] No duplicate code
- [ ] Clear variable/function naming
- [ ] Appropriate error handling

#### Security
- [ ] No hardcoded secrets or API keys
- [ ] Input validation present
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] No sensitive data in logs

#### Testing
- [ ] Unit tests for new functionality
- [ ] Edge cases covered
- [ ] Tests are meaningful (not just coverage)
- [ ] Integration tests if needed

#### Documentation
- [ ] Docstrings for public functions
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Changelog entry added

#### Kubernetes/Helm
- [ ] Resource limits defined
- [ ] Health checks configured
- [ ] Security context set (non-root)
- [ ] Secrets properly managed

### 3. Static Analysis

\`\`\`bash
# Python linting
python -m flake8 deployment/docker/ --max-line-length=100

# Security scan
pip install bandit
bandit -r deployment/docker/ -ll

# Helm validation
helm lint ./deployment/helm/golden-armada
\`\`\`

### 4. Review Output Format

Provide feedback in this format:

\`\`\`markdown
## Code Review Summary

**Files Reviewed:** X
**Issues Found:** X (Critical: X, Major: X, Minor: X)

### Critical Issues
1. [File:Line] Description

### Major Issues
1. [File:Line] Description

### Minor Issues / Suggestions
1. [File:Line] Suggestion

### Positive Observations
- Good use of error handling in X
- Clear documentation in Y

### Recommendation
[ ] Approved
[ ] Approved with minor changes
[ ] Requires changes before merge
\`\`\`

## Agent Selection

For comprehensive reviews, consider spawning multiple agents:
- `security-auditor` - Security-focused review
- `code-analyzer` - Code quality analysis
- `reviewer` - General code review

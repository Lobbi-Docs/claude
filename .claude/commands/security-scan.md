# Security Scan

Perform a comprehensive security audit of the codebase.

## Instructions

Execute security scanning across multiple dimensions:

### 1. Secrets Detection

\`\`\`bash
# Search for potential secrets
grep -rn "password\|secret\|api_key\|token\|credential" \
  --include="*.py" --include="*.yaml" --include="*.yml" --include="*.json" \
  --exclude-dir=".git" .

# Check for AWS keys
grep -rn "AKIA[0-9A-Z]{16}" .

# Check for private keys
grep -rn "BEGIN.*PRIVATE KEY" .

# Check environment files
find . -name ".env*" -o -name "*.env" | xargs cat 2>/dev/null
\`\`\`

### 2. Dependency Vulnerabilities

\`\`\`bash
# Python dependencies
pip install safety
safety check -r deployment/docker/claude/requirements.txt
safety check -r deployment/docker/orchestrator/requirements.txt

# Or use pip-audit
pip install pip-audit
pip-audit -r deployment/docker/claude/requirements.txt
\`\`\`

### 3. Container Security

\`\`\`bash
# Scan Docker images with Trivy
docker pull aquasec/trivy:latest

# Scan Claude agent image
trivy image golden-armada/claude-agent:latest --severity HIGH,CRITICAL

# Scan Dockerfile for best practices
docker run --rm -i hadolint/hadolint < deployment/docker/claude/Dockerfile
\`\`\`

### 4. Kubernetes Security

\`\`\`bash
# Check for security misconfigurations
# Look for:
# - Privileged containers
# - Root users
# - Missing resource limits
# - hostNetwork/hostPID usage

# Using kube-score
helm template golden-armada ./deployment/helm/golden-armada | kube-score score -

# Or manual checks
helm template golden-armada ./deployment/helm/golden-armada | \
  grep -E "privileged|runAsRoot|hostNetwork|hostPID"
\`\`\`

### 5. Code Security (SAST)

\`\`\`bash
# Python security analysis
pip install bandit
bandit -r deployment/docker/ -f json -o bandit-report.json

# View summary
bandit -r deployment/docker/ -ll
\`\`\`

### 6. OWASP Checks

Review code for OWASP Top 10:

\`\`\`python
# Injection - Look for:
# - f-strings in SQL
# - os.system() with user input
# - subprocess with shell=True

# XSS - Look for:
# - Direct HTML output without escaping
# - innerHTML assignments

# Sensitive Data - Look for:
# - Passwords in logs
# - Tokens in error messages
# - PII without encryption
\`\`\`

## Output Format

\`\`\`markdown
## Security Scan Report

**Date:** YYYY-MM-DD
**Scanner:** security-scan command

### Summary
| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Secrets  | X        | X    | X      | X   |
| Deps     | X        | X    | X      | X   |
| Code     | X        | X    | X      | X   |
| Config   | X        | X    | X      | X   |

### Critical Findings
1. **[CRITICAL]** Finding description
   - Location: file:line
   - Remediation: How to fix

### Recommendations
1. Priority action items
2. Process improvements
\`\`\`

## Remediation Priority

1. **Immediate** - Secrets exposure, critical CVEs
2. **This Sprint** - High severity vulnerabilities
3. **Backlog** - Medium/Low improvements

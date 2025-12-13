---
name: scan
description: Security vulnerability scanning with Trivy and compliance checking
argument-hint: <image> [--severity <CRITICAL|HIGH|MEDIUM|LOW>] [--format <table|json|sarif>]
allowed-tools: [Bash, Read, Write]
---

# Instructions for Claude: Security Vulnerability Scanning

You are helping the user scan Docker images for security vulnerabilities and compliance issues. Follow these steps:

## 1. Parse Arguments

Extract from the user's request:
- **image**: Required. Image name to scan (e.g., `my-app:latest` or `ghcr.io/org/app:v1.0.0`)
- **--severity**: Optional. Minimum severity to report (default: `MEDIUM`)
  - Options: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`
- **--format**: Optional. Output format (default: `table`)
  - Options: `table`, `json`, `sarif`, `cyclonedx`, `spdx`

## 2. Check Trivy Installation

Verify Trivy is installed:

```bash
if ! command -v trivy &> /dev/null; then
    echo "Trivy not found. Installing..."
fi
```

If not installed, provide installation instructions:

**macOS**:
```bash
brew install trivy
```

**Linux**:
```bash
# Debian/Ubuntu
sudo apt-get install wget
wget https://github.com/aquasecurity/trivy/releases/download/v0.48.0/trivy_0.48.0_Linux-64bit.deb
sudo dpkg -i trivy_0.48.0_Linux-64bit.deb

# Or via script
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin
```

**Windows**:
```powershell
# Via Chocolatey
choco install trivy

# Or download from releases
# https://github.com/aquasecurity/trivy/releases
```

## 3. Verify Image Exists

Check if the image exists locally:

```bash
docker images <image> --format "{{.Repository}}:{{.Tag}}"
```

If not found locally, check if it should be pulled:
- If it's a registry URL (contains `/` or `:`), suggest pulling
- If it's a local name, suggest building first

```bash
# Pull if needed
docker pull <image>
```

## 4. Update Vulnerability Database

Ensure Trivy has latest vulnerability data:

```bash
trivy image --download-db-only
```

This ensures scans use the most current CVE information.

## 5. Run Vulnerability Scan

Execute Trivy scan with appropriate options:

```bash
trivy image \
  --severity <severity-levels> \
  --format <format> \
  --output scan-results.<format> \
  <image>
```

Example for comprehensive scan:
```bash
trivy image \
  --severity CRITICAL,HIGH,MEDIUM \
  --format table \
  --output scan-results.txt \
  my-app:latest
```

## 6. Scan for Specific Vulnerability Types

Run additional specialized scans:

### A. OS Package Vulnerabilities
```bash
trivy image --vuln-type os <image>
```

### B. Application Dependencies
```bash
trivy image --vuln-type library <image>
```

### C. Secrets Detection
```bash
trivy image --scanners secret <image>
```

### D. Configuration Issues
```bash
trivy image --scanners config <image>
```

### E. License Compliance
```bash
trivy image --scanners license <image>
```

## 7. Parse and Analyze Results

Process the scan output:

### Count Vulnerabilities by Severity
```bash
# Example parsing from table output
CRITICAL=$(grep -c "CRITICAL" scan-results.txt || echo "0")
HIGH=$(grep -c "HIGH" scan-results.txt || echo "0")
MEDIUM=$(grep -c "MEDIUM" scan-results.txt || echo "0")
LOW=$(grep -c "LOW" scan-results.txt || echo "0")
```

### Identify Critical Issues

For each CRITICAL and HIGH vulnerability:
- CVE ID
- Package affected
- Installed version
- Fixed version (if available)
- Severity score (CVSS)
- Description

## 8. Generate Security Report

Create comprehensive report in `.claude/security/scan-report-<timestamp>.md`:

```markdown
# Security Scan Report

**Image**: my-app:latest
**Scan Date**: 2024-01-15 14:30:00
**Scanner**: Trivy v0.48.0
**Scan Duration**: 12.5s

## 🎯 Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2     |
| HIGH     | 5     |
| MEDIUM   | 12    |
| LOW      | 8     |

**Overall Risk**: 🔴 HIGH (2 critical vulnerabilities)

## 🚨 Critical Vulnerabilities

### 1. CVE-2024-12345 - OpenSSL Buffer Overflow
- **Package**: openssl
- **Installed**: 1.1.1k
- **Fixed In**: 1.1.1w
- **CVSS Score**: 9.8 (Critical)
- **Description**: Buffer overflow in SSL/TLS handshake allows remote code execution
- **Recommendation**: Upgrade to openssl 1.1.1w or later

### 2. CVE-2024-67890 - Node.js Prototype Pollution
- **Package**: nodejs
- **Installed**: 18.12.0
- **Fixed In**: 18.19.0
- **CVSS Score**: 9.1 (Critical)
- **Description**: Prototype pollution vulnerability in object handling
- **Recommendation**: Upgrade to Node.js 18.19.0 or later

## ⚠️ High Severity Issues

[List HIGH severity vulnerabilities with same detail]

## 📋 Medium Severity Issues

[Condensed list of MEDIUM issues]

## 🔍 Additional Findings

### Secrets Detected
- ❌ Potential API key found in /app/config/defaults.json (line 15)
- ❌ Private SSH key detected in /root/.ssh/id_rsa

### Configuration Issues
- ⚠️ Container running as root user
- ⚠️ No resource limits defined
- ⚠️ Insecure permissions on /app/data (777)

### License Compliance
- ✅ All dependencies use compatible licenses
- ⚠️ 2 packages have GPL licenses (may require attribution)

## 🎯 Remediation Priority

### Immediate (Critical)
1. Upgrade OpenSSL to 1.1.1w
2. Upgrade Node.js to 18.19.0
3. Remove hardcoded credentials

### Short-term (High)
1. Update Python to 3.11.7
2. Patch nginx vulnerability CVE-2024-xxx
3. Implement non-root user

### Medium-term
1. Address remaining MEDIUM severity issues
2. Fix configuration security issues
3. Review and update dependency licenses

## 🛠️ Suggested Dockerfile Changes

```dockerfile
# Use updated base image
FROM node:18.19-alpine  # Updated from 18.12

# Install security updates
RUN apk update && apk upgrade --no-cache

# Run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Remove secrets
# DELETE: ENV API_KEY=secret123
```

## 📊 Comparison with Previous Scan

| Metric | Previous (v1.2.3) | Current (v1.3.0) | Change |
|--------|-------------------|------------------|--------|
| Critical | 3 | 2 | ✅ -1 |
| High | 8 | 5 | ✅ -3 |
| Medium | 15 | 12 | ✅ -3 |
| Total | 26 | 19 | ✅ -7 |

**Progress**: 27% reduction in total vulnerabilities

## 🔗 References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [CVE Details](https://cve.mitre.org/)
- [National Vulnerability Database](https://nvd.nist.gov/)
```

## 9. Check Against Security Policies

Compare findings against defined security policies:

```bash
# Example: Fail if critical vulnerabilities exist
if [ $CRITICAL -gt 0 ]; then
    echo "❌ POLICY VIOLATION: Critical vulnerabilities found"
    exit 1
fi

# Example: Warn if high vulnerabilities exceed threshold
if [ $HIGH -gt 10 ]; then
    echo "⚠️ WARNING: High vulnerability count exceeds threshold (10)"
fi
```

Check configuration in `.claude/container-workflow.local.md`:
```markdown
## Security Policy
- **Critical**: 0 allowed (fail build)
- **High**: Max 5 (warn above threshold)
- **Secrets**: 0 allowed (fail build)
```

## 10. Suggest Fixes

For each vulnerability, provide actionable remediation:

### Update Base Image
```dockerfile
# Current
FROM node:18.12-alpine

# Recommended
FROM node:18.19-alpine
```

### Update Dependencies
```bash
# For npm
npm audit fix

# For Python
pip install --upgrade package-name

# For apt packages
RUN apt-get update && apt-get upgrade -y package-name
```

### Remove Secrets
```dockerfile
# Remove hardcoded secrets
# REMOVE: ENV API_KEY=secret123

# Use build args instead
ARG API_KEY
ENV API_KEY=${API_KEY}
```

### Fix Configuration
```dockerfile
# Run as non-root
RUN useradd -m -u 1001 appuser
USER appuser

# Set proper permissions
RUN chmod 750 /app/data
```

## 11. Continuous Scanning

Suggest integration into CI/CD:

### GitHub Actions
```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build image
        run: docker build -t ${{ github.repository }}:${{ github.sha }} .

      - name: Run Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ github.repository }}:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Fail on critical
        run: |
          if grep -q "CRITICAL" trivy-results.sarif; then
            echo "Critical vulnerabilities found!"
            exit 1
          fi
```

### GitLab CI
```yaml
container_scanning:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker run --rm -v /var/run/docker.sock:/var/run/docker.sock
        aquasec/trivy image --exit-code 1 --severity CRITICAL,HIGH
        $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## 12. Export Results

Save results in multiple formats:

```bash
# Table for human reading
trivy image --format table <image> > scan-results.txt

# JSON for parsing/automation
trivy image --format json <image> > scan-results.json

# SARIF for GitHub Security
trivy image --format sarif <image> > scan-results.sarif

# SBOM (Software Bill of Materials)
trivy image --format cyclonedx <image> > sbom.json
```

## 13. Summary Report

Provide clear, actionable summary:

```
🔒 Security Scan Complete

📦 Image: my-app:latest (256MB)
⏱️ Scan Duration: 12.5s

🎯 Results:
   🔴 CRITICAL: 2
   🟠 HIGH: 5
   🟡 MEDIUM: 12
   🔵 LOW: 8

❌ Security Status: FAILED (2 critical vulnerabilities)

🚨 Action Required:
   1. Upgrade OpenSSL: 1.1.1k → 1.1.1w
   2. Upgrade Node.js: 18.12.0 → 18.19.0
   3. Remove API key from /app/config/defaults.json

📊 Risk Score: 8.5/10 (High Risk)

📄 Full Report: .claude/security/scan-report-20240115-143000.md
🔗 Remediation Guide: .claude/security/remediation-guide.md

💡 Next Steps:
   1. Review full report
   2. Apply suggested Dockerfile changes
   3. Rebuild and rescan
   4. Deploy only after CRITICAL issues resolved
```

## Example Interaction

**User**: "Scan my-app:latest for critical vulnerabilities"

**You**:
1. Check Trivy installed ✓
2. Verify image exists locally ✓
3. Update vulnerability DB
4. Run scan: `trivy image --severity CRITICAL,HIGH my-app:latest`
5. Parse results: 2 critical, 5 high found
6. Generate detailed report in `.claude/security/`
7. Identify: OpenSSL and Node.js need updates
8. Suggest Dockerfile changes
9. Provide summary with risk score
10. Recommend: Fix before deployment

## Error Handling

- **Trivy not installed**: Provide installation instructions
- **Image not found**: Suggest build or pull
- **Database update fails**: Check network, try mirror
- **Scan fails**: Check Docker daemon, image corruption
- **Permission denied**: Check Docker socket permissions

## Important Notes

- Update vulnerability database regularly
- Scan images before deployment (CI/CD integration)
- Set clear security policies (max vulnerabilities by severity)
- Track vulnerability trends over time
- Don't just fix CVEs - remove unnecessary packages
- Consider using distroless images for minimal attack surface
- Secrets in images are CRITICAL - never commit them

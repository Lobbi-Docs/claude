# Dependency Health Agent

**Callsign:** Auditor
**Faction:** Promethean
**Model:** haiku

## Purpose

Checks dependency health, outdated packages, vulnerable dependencies, and license compliance. Ensures supply chain security.

## Health Checks

| Check | Severity | Description |
|-------|----------|-------------|
| Vulnerabilities | Critical/High | Known CVEs in dependencies |
| Outdated Major | Medium | Major version updates available |
| Outdated Minor | Low | Minor/patch updates available |
| Deprecated | High | Packages marked deprecated |
| Unmaintained | Medium | No updates in 2+ years |
| License Compliance | High | Incompatible licenses |
| Duplicate Dependencies | Low | Multiple versions of same package |

## Tools Integration

| Tool | Ecosystem | Purpose |
|------|-----------|---------|
| npm audit | Node.js | Vulnerability scanning |
| npm outdated | Node.js | Version checking |
| pip-audit | Python | Vulnerability scanning |
| pip list --outdated | Python | Version checking |
| cargo audit | Rust | Vulnerability scanning |
| go mod tidy | Go | Dependency cleanup |
| Snyk | Multi | Deep vulnerability analysis |
| Dependabot | Multi | Automated updates |

## Activation Triggers

- "dependencies"
- "outdated"
- "npm audit"
- "pip audit"
- "dependency check"
- "update packages"
- "vulnerability scan"

## Execution Flow

```bash
#!/bin/bash
# Dependency Health Check

# Node.js
check_npm_health() {
  npm audit --json > /tmp/npm-audit.json
  npm outdated --json > /tmp/npm-outdated.json
  npm ls --json > /tmp/npm-tree.json
}

# Python
check_pip_health() {
  pip-audit -r requirements.txt --format json > /tmp/pip-audit.json
  pip list --outdated --format json > /tmp/pip-outdated.json
}

# Go
check_go_health() {
  go list -m -u all > /tmp/go-outdated.txt
  govulncheck ./... > /tmp/go-vulns.txt
}

# License Check
check_licenses() {
  npx license-checker --json > /tmp/licenses.json
}
```

## Health Score Calculation

```typescript
interface DependencyHealth {
  score: number;  // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: {
    vulnerabilities: number;    // Weight: 40%
    freshness: number;          // Weight: 25%
    maintenance: number;        // Weight: 20%
    licenses: number;           // Weight: 15%
  };
}

function calculateHealthScore(deps: Dependency[]): DependencyHealth {
  const vulnScore = 100 - (criticalVulns * 20 + highVulns * 10 + medVulns * 5);
  const freshnessScore = (upToDate / total) * 100;
  const maintenanceScore = (maintained / total) * 100;
  const licenseScore = (compatible / total) * 100;

  const overall =
    vulnScore * 0.40 +
    freshnessScore * 0.25 +
    maintenanceScore * 0.20 +
    licenseScore * 0.15;

  return {
    score: Math.round(overall),
    grade: scoreToGrade(overall),
    factors: { vulnerabilities: vulnScore, freshness: freshnessScore,
               maintenance: maintenanceScore, licenses: licenseScore }
  };
}
```

## Output Format

```json
{
  "agent": "dependency-health-agent",
  "timestamp": "2025-12-26T12:00:00Z",
  "passed": false,
  "healthScore": 72,
  "grade": "C",
  "summary": {
    "totalDependencies": 156,
    "directDependencies": 42,
    "vulnerabilities": { "critical": 0, "high": 2, "medium": 5, "low": 8 },
    "outdated": { "major": 3, "minor": 12, "patch": 28 },
    "deprecated": 1,
    "unmaintained": 2
  },
  "vulnerabilities": [
    {
      "package": "lodash",
      "version": "4.17.19",
      "severity": "HIGH",
      "cve": "CVE-2021-23337",
      "fixVersion": "4.17.21",
      "description": "Prototype Pollution"
    }
  ],
  "outdated": [
    {
      "package": "react",
      "current": "17.0.2",
      "latest": "18.2.0",
      "type": "major",
      "updateType": "breaking"
    }
  ],
  "licenseIssues": [
    {
      "package": "gpl-package",
      "license": "GPL-3.0",
      "issue": "Incompatible with MIT project license"
    }
  ],
  "recommendations": [
    { "action": "upgrade", "package": "lodash", "from": "4.17.19", "to": "4.17.21", "priority": "high" },
    { "action": "review", "package": "react", "reason": "Major version with breaking changes" },
    { "action": "replace", "package": "deprecated-pkg", "with": "recommended-alternative" }
  ],
  "autoFixAvailable": true,
  "autoFixCommand": "npm audit fix && npm update lodash@4.17.21"
}
```

## License Compatibility Matrix

| Project License | Compatible Deps | Incompatible Deps |
|-----------------|-----------------|-------------------|
| MIT | MIT, BSD, ISC, Apache-2.0 | GPL, AGPL, SSPL |
| Apache-2.0 | MIT, BSD, Apache-2.0 | GPL-3.0, AGPL |
| GPL-3.0 | All open source | Proprietary |

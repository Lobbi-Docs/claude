# Harness STO (Security Testing Orchestration)

## Scanner Types

| Category | Tools |
|----------|-------|
| SAST | SonarQube, Checkmarx, Semgrep, Bandit |
| DAST | OWASP ZAP, Burp Suite, Nikto |
| SCA | Snyk, OWASP Dependency-Check |
| Container | Aqua Trivy, Grype, Prisma Cloud |
| Secrets | Gitleaks, TruffleHog |
| IaC | Checkov, Terrascan, KICS |

## SAST Scan

```yaml
- step:
    name: SAST Scan
    type: Security
    spec:
      privileged: true
      settings:
        product_name: sonarqube
        product_config_name: sonarqube-agent
        policy_type: orchestratedScan
        scan_type: repository
```

## Container Scan

```yaml
- step:
    name: Container Scan
    type: AquaTrivy
    spec:
      mode: orchestration
      config: default
      target:
        type: container
      privileged: true
      image:
        type: docker_v2
        name: myorg/myapp
        tag: <+pipeline.sequenceId>
```

## SCA Scan

```yaml
- step:
    name: Dependency Scan
    type: Snyk
    spec:
      mode: orchestration
      config: default
      target:
        type: repository
      auth:
        access_token: <+secrets.getValue("snyk_token")>
```

## Security Gate

```yaml
- step:
    name: Security Gate
    type: SecurityTests
    spec:
      type: container
      failOnSeverity: CRITICAL
      exemptions:
        - cve: CVE-2023-12345
          reason: "False positive"
          expires: "2024-12-31"
```

## Policy Enforcement

```rego
package harness.sto

deny[msg] {
    input.severity == "CRITICAL"
    not input.exempted
    msg := sprintf("Critical vulnerability: %s", [input.cve])
}
```

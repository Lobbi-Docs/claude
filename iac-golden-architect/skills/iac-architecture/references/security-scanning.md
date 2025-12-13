# Security Scanning for Infrastructure as Code

## Overview

This document provides comprehensive guidance on integrating security scanning tools into IaC workflows. It covers scanner selection, configuration, CI/CD integration, and remediation workflows for enterprise-grade infrastructure security.

---

## Scanner Comparison Matrix

| Tool | Languages | Policy as Code | CI/CD | Severity Levels | Custom Rules | Cost |
|------|-----------|----------------|-------|-----------------|--------------|------|
| **tfsec** | Terraform, HCL | ✅ | ✅ | High/Med/Low | ✅ (Go) | Free |
| **checkov** | Terraform, CloudFormation, K8s, Helm, ARM, Dockerfile | ✅ | ✅ | Critical/High/Med/Low | ✅ (Python) | Free/Enterprise |
| **trivy** | Terraform, CloudFormation, K8s, Dockerfile | ✅ | ✅ | Critical/High/Med/Low | ✅ (Rego) | Free |
| **terrascan** | Terraform, K8s, Helm, Dockerfiles | ✅ (Rego) | ✅ | High/Med/Low | ✅ (Rego) | Free |
| **Snyk IaC** | Terraform, CloudFormation, K8s, ARM | ❌ | ✅ | Critical/High/Med/Low | ✅ (Custom policies) | Paid |
| **Sentinel** | Terraform (TFE/TFC only) | ✅ (Sentinel) | ✅ | Advisory/Soft/Hard | ✅ (Sentinel) | Enterprise |

---

## tfsec - Terraform Security Scanning

### Installation

```bash
# macOS
brew install tfsec

# Linux
curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash

# Windows
choco install tfsec

# Docker
docker pull aquasec/tfsec:latest
```

### Basic Usage

```bash
# Scan current directory
tfsec .

# Scan specific directory
tfsec /path/to/terraform

# Output as JSON
tfsec . --format json

# Output as JUnit (for CI/CD)
tfsec . --format junit

# Output as SARIF (for GitHub Security)
tfsec . --format sarif > tfsec.sarif

# Fail on medium and above
tfsec . --minimum-severity MEDIUM

# Exclude specific checks
tfsec . --exclude aws-s3-enable-versioning

# Include specific checks only
tfsec . --include aws-s3-*
```

### Configuration File

**`.tfsec/config.yml`**
```yaml
# Severity threshold
minimum_severity: MEDIUM

# Exclude checks
exclude:
  - aws-s3-enable-versioning  # Handled by lifecycle policy
  - aws-ec2-no-public-ip-subnet  # Public subnets intentional

# Custom check directories
custom_check_dir: .tfsec/custom

# Include patterns
include:
  - aws-*
  - azure-*

# Ignore specific resources
exclude_paths:
  - modules/legacy/**
  - examples/**

# Output format
format: json

# Soft fail (don't exit 1 on findings)
soft_fail: false
```

### Custom tfsec Checks

**`.tfsec/custom/aws_custom_tagging.go`**
```go
package custom

import (
    "github.com/aquasecurity/tfsec/pkg/result"
    "github.com/aquasecurity/tfsec/pkg/scanner"
    "github.com/aquasecurity/tfsec/pkg/severity"
)

const CustomAWSRequiredTags = scanner.RuleCode("custom-aws-required-tags")

func init() {
    scanner.RegisterCheckRule(scanner.Rule{
        ID: CustomAWSRequiredTags,
        Documentation: scanner.RuleDocumentation{
            Summary:     "AWS resources must have required tags",
            Impact:      "Resources without proper tags cannot be tracked for cost or compliance",
            Resolution:  "Add required tags: Environment, Owner, CostCenter, SOC2_Control",
            Explanation: "All AWS resources must be tagged according to company policy",
            BadExample: `
resource "aws_s3_bucket" "bad" {
    bucket = "my-bucket"
}
`,
            GoodExample: `
resource "aws_s3_bucket" "good" {
    bucket = "my-bucket"
    tags = {
        Environment   = "prod"
        Owner         = "platform-team"
        CostCenter    = "engineering"
        SOC2_Control  = "CC6.1"
    }
}
`,
        },
        Provider:        "aws",
        RequiredTypes:   []string{"resource"},
        RequiredLabels:  []string{"aws_*"},
        DefaultSeverity: severity.High,
        CheckFunc: func(check *scanner.Check, block *scanner.Block) {
            requiredTags := []string{"Environment", "Owner", "CostCenter"}

            tagsBlock := block.GetAttribute("tags")
            if tagsBlock.IsNil() {
                check.NewResultWithValueAnnotation(
                    "Resource does not have tags attribute",
                    block.Range(),
                    block,
                    severity.High,
                )
                return
            }

            tags := tagsBlock.MapValue(check.Range())
            for _, tag := range requiredTags {
                if _, exists := tags[tag]; !exists {
                    check.NewResultWithValueAnnotation(
                        fmt.Sprintf("Required tag '%s' is missing", tag),
                        tagsBlock.Range(),
                        tagsBlock,
                        severity.High,
                    )
                }
            }
        },
    })
}
```

### CI/CD Integration

**GitHub Actions**
```yaml
name: tfsec

on:
  pull_request:
    paths:
      - '**.tf'
      - '.tfsec/**'

jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: false
          format: sarif
          additional_args: --minimum-severity MEDIUM

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: tfsec.sarif
```

**GitLab CI**
```yaml
tfsec:
  stage: security
  image: aquasec/tfsec:latest
  script:
    - tfsec . --format json --minimum-severity MEDIUM --out tfsec.json
  artifacts:
    reports:
      tfsec: tfsec.json
    paths:
      - tfsec.json
    expire_in: 30 days
  allow_failure: false
```

---

## checkov - Multi-IaC Policy Scanning

### Installation

```bash
# pip
pip install checkov

# Docker
docker pull bridgecrew/checkov:latest

# Homebrew
brew install checkov
```

### Basic Usage

```bash
# Scan Terraform
checkov -d /path/to/terraform

# Scan specific frameworks
checkov -d . --framework terraform

# Multiple frameworks
checkov -d . --framework terraform cloudformation kubernetes

# Output formats
checkov -d . --output json
checkov -d . --output junitxml
checkov -d . --output sarif

# Fail on severity
checkov -d . --check CRITICAL,HIGH

# Skip specific checks
checkov -d . --skip-check CKV_AWS_19,CKV_AWS_20

# Run specific checks only
checkov -d . --check CKV_AWS_*

# Compact output
checkov -d . --compact

# Quiet mode (errors only)
checkov -d . --quiet
```

### Configuration File

**`.checkov.yml`**
```yaml
# Directory to scan
directory:
  - ./terraform
  - ./cloudformation

# Frameworks to scan
framework:
  - terraform
  - cloudformation
  - kubernetes

# Skip checks
skip-check:
  - CKV_AWS_19  # S3 bucket encryption with customer keys
  - CKV_AWS_145 # S3 bucket KMS encryption

# Run only specific checks
check:
  - CKV_AWS_*
  - CKV2_AWS_*

# Minimum severity
check-severity: CRITICAL,HIGH

# Output format
output: json

# Compact output
compact: true

# External checks directory
external-checks-dir:
  - ./.checkov/custom

# Soft fail
soft-fail: false

# Download external policies
download-external-modules: true

# Enable secret scanning
enable-secret-scan-all-files: true

# Policy metadata filters
policy-metadata-filter:
  category: Networking,Logging
```

### Custom checkov Checks

**`.checkov/custom/RequiredTags.py`**
```python
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class RequiredTags(BaseResourceCheck):
    def __init__(self):
        name = "Ensure all resources have required tags"
        id = "CKV_CUSTOM_1"
        supported_resources = ['aws_*']
        categories = [CheckCategories.CONVENTION]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        """
        Looks for required tags on AWS resources
        """
        required_tags = ['Environment', 'Owner', 'CostCenter', 'Application']

        if 'tags' not in conf:
            self.evaluated_keys = ['tags']
            return CheckResult.FAILED

        tags = conf['tags'][0] if isinstance(conf['tags'], list) else conf['tags']

        missing_tags = []
        for tag in required_tags:
            if tag not in tags:
                missing_tags.append(tag)

        if missing_tags:
            self.evaluated_keys = ['tags']
            return CheckResult.FAILED

        return CheckResult.PASSED

check = RequiredTags()
```

**`.checkov/custom/SOC2Compliance.py`**
```python
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class SOC2ComplianceTag(BaseResourceCheck):
    def __init__(self):
        name = "Ensure resources have SOC2_Control tag"
        id = "CKV_CUSTOM_SOC2_1"
        supported_resources = ['aws_s3_bucket', 'aws_db_instance', 'aws_kms_key']
        categories = [CheckCategories.GENERAL_SECURITY]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        if 'tags' not in conf:
            return CheckResult.FAILED

        tags = conf['tags'][0] if isinstance(conf['tags'], list) else conf['tags']

        if 'SOC2_Control' not in tags:
            return CheckResult.FAILED

        # Validate SOC2_Control format (e.g., CC6.1, CC7.2)
        control = tags['SOC2_Control']
        if not control.startswith('CC') and not control.startswith('A'):
            return CheckResult.FAILED

        return CheckResult.PASSED

check = SOC2ComplianceTag()
```

### CI/CD Integration

**GitHub Actions**
```yaml
name: checkov

on:
  pull_request:
    paths:
      - '**.tf'
      - '**.yml'
      - '**.yaml'

jobs:
  checkov:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Run checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform,kubernetes
          output_format: sarif
          output_file_path: checkov.sarif
          soft_fail: false
          api-key: ${{ secrets.BRIDGECREW_API_KEY }}  # Optional: for policy updates

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: checkov.sarif
```

---

## trivy - Comprehensive Security Scanner

### Installation

```bash
# macOS
brew install aquasecurity/trivy/trivy

# Debian/Ubuntu
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy

# Docker
docker pull aquasec/trivy:latest
```

### Basic Usage

```bash
# Scan IaC
trivy config /path/to/iac

# Scan Terraform
trivy config --tf-vars terraform.tfvars terraform/

# Output formats
trivy config --format json terraform/
trivy config --format sarif terraform/ > trivy.sarif

# Severity filtering
trivy config --severity CRITICAL,HIGH terraform/

# Skip specific checks
trivy config --skip-check AVD-AWS-0001 terraform/

# Include specific namespaces
trivy config --include-namespaces aws,azure terraform/

# Exit code on findings
trivy config --exit-code 1 terraform/

# Ignore unfixed vulnerabilities
trivy config --ignore-unfixed terraform/
```

### Configuration File

**`trivy.yaml`**
```yaml
# Severity levels to include
severity:
  - CRITICAL
  - HIGH
  - MEDIUM

# Security checks to include
security-checks:
  - config

# Skip specific checks
skip-checks:
  - AVD-AWS-0001

# Include namespaces
include-namespaces:
  - aws
  - azure
  - google

# Output format
format: sarif

# Exit code on findings
exit-code: 1

# Timeout
timeout: 5m

# Cache directory
cache-dir: .trivycache

# Ignore file
ignorefile: .trivyignore
```

**`.trivyignore`**
```
# Ignore specific AVDs
AVD-AWS-0001  # S3 bucket has an ACL defined which allows public access
AVD-AWS-0086  # S3 Bucket does not have logging enabled

# Ignore by file path
terraform/examples/**

# Ignore by expiration date
AVD-AWS-0001 exp:2024-12-31

# Ignore with reason
AVD-AWS-0088  # Public subnet intentional for ALB
```

### Custom Policies (Rego)

**`policies/required_tags.rego`**
```rego
package user.terraform.AWS001

import data.lib.terraform

__rego_metadata__ := {
	"id": "AWS001",
	"title": "Resources must have required tags",
	"severity": "HIGH",
	"type": "Terraform Security Check",
	"description": "All AWS resources must be tagged with Environment, Owner, and CostCenter",
}

deny[msg] {
	resource := terraform.resources[_]
	startswith(resource.type, "aws_")
	not has_required_tags(resource)
	msg := sprintf("Resource %s does not have required tags", [resource.address])
}

has_required_tags(resource) {
	resource.values.tags.Environment
	resource.values.tags.Owner
	resource.values.tags.CostCenter
}
```

**`policies/soc2_controls.rego`**
```rego
package user.terraform.SOC2001

import data.lib.terraform

__rego_metadata__ := {
	"id": "SOC2001",
	"title": "S3 buckets must have SOC2 control tag",
	"severity": "HIGH",
	"type": "Terraform Security Check",
	"description": "S3 buckets storing sensitive data must reference SOC2 control",
}

deny[msg] {
	bucket := terraform.resources[_]
	bucket.type == "aws_s3_bucket"
	not has_soc2_tag(bucket)
	msg := sprintf("S3 bucket %s missing SOC2_Control tag", [bucket.address])
}

has_soc2_tag(bucket) {
	bucket.values.tags.SOC2_Control
	startswith(bucket.values.tags.SOC2_Control, "CC")
}
```

### CI/CD Integration

**GitHub Actions**
```yaml
name: trivy

on:
  pull_request:
    paths:
      - '**.tf'
      - 'policies/**'

jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Run trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: './terraform'
          format: 'sarif'
          output: 'trivy.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: trivy.sarif
```

---

## terrascan - Policy as Code Scanner

### Installation

```bash
# macOS
brew install terrascan

# Linux
curl -L "$(curl -s https://api.github.com/repos/tenable/terrascan/releases/latest | grep -o -E "https://.+?_Linux_x86_64.tar.gz")" > terrascan.tar.gz
tar -xf terrascan.tar.gz terrascan && rm terrascan.tar.gz
sudo mv terrascan /usr/local/bin/

# Docker
docker pull tenable/terrascan:latest
```

### Basic Usage

```bash
# Scan Terraform
terrascan scan -t terraform

# Scan specific directory
terrascan scan -d /path/to/terraform -t terraform

# Output formats
terrascan scan -o json
terrascan scan -o sarif
terrascan scan -o junit-xml

# Severity filtering
terrascan scan --severity high,medium

# Skip rules
terrascan scan --skip-rules AWS.S3Bucket.DS.High.1043

# Use specific policy
terrascan scan --policy-path ./policies

# Config file
terrascan scan --config-path terrascan-config.toml
```

### Configuration File

**`terrascan-config.toml`**
```toml
[severity]
level = "high"

[rules]
skip-rules = [
    "AWS.S3Bucket.DS.High.1043",  # S3 bucket ACL
]

[notifications]
webhook-url = "https://webhook.site/..."

[k8s-admission-control]
dashboard = true
save-requests = true

[policy]
path = "./policies"
rego-subdir = "rego"

[output]
type = "sarif"
```

### Custom Policies (Rego)

**`policies/rego/required_tags.rego`**
```rego
package accurics

requiredTags = ["Environment", "Owner", "CostCenter"]

requiredTagsS3[api.id] {
    api := input.aws_s3_bucket[_]
    not has_all_tags(api)
}

has_all_tags(resource) {
    tags := object.get(resource.config, "tags", {})
    count([tag | requiredTags[tag]; not object.get(tags, tag, null)]) == 0
}
```

---

## Multi-Scanner CI/CD Pipeline

### Complete Security Pipeline

**`.github/workflows/security-scan.yml`**
```yaml
name: IaC Security Scan

on:
  pull_request:
    paths:
      - '**.tf'
      - '**.tfvars'
  push:
    branches:
      - main

jobs:
  security-scan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        scanner: [tfsec, checkov, trivy, terrascan]
      fail-fast: false

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Run tfsec
        if: matrix.scanner == 'tfsec'
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: false
          format: sarif
          additional_args: --minimum-severity MEDIUM

      - name: Run checkov
        if: matrix.scanner == 'checkov'
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          output_format: sarif
          output_file_path: checkov.sarif

      - name: Run trivy
        if: matrix.scanner == 'trivy'
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy.sarif'

      - name: Run terrascan
        if: matrix.scanner == 'terrascan'
        run: |
          docker run --rm -v $(pwd):/iac tenable/terrascan scan -t terraform -d /iac -o sarif > terrascan.sarif

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: ${{ matrix.scanner }}.sarif
          category: ${{ matrix.scanner }}

  aggregate-results:
    runs-on: ubuntu-latest
    needs: security-scan
    if: always()
    steps:
      - name: Check scan results
        run: |
          if [[ "${{ needs.security-scan.result }}" == "failure" ]]; then
            echo "Security scans failed"
            exit 1
          fi
```

---

## Remediation Workflows

### Automated Fix Generation

**`scripts/auto-fix-findings.sh`**
```bash
#!/bin/bash
set -e

# Run tfsec with JSON output
tfsec . --format json > tfsec-results.json

# Parse results and create fixes
python3 << 'EOF'
import json
import re

with open('tfsec-results.json', 'r') as f:
    results = json.load(f)

fixes = []
for result in results.get('results', []):
    check_id = result.get('rule_id')
    location = result.get('location', {})
    filename = location.get('filename')

    # Example: Add versioning to S3 buckets
    if check_id == 'aws-s3-enable-versioning':
        fix = {
            'file': filename,
            'line': location.get('start_line'),
            'fix': 'Add versioning block to S3 bucket'
        }
        fixes.append(fix)

print(f"Generated {len(fixes)} potential fixes")
EOF
```

### Security Finding Dashboard

**`scripts/security-dashboard.sh`**
```bash
#!/bin/bash

# Run all scanners and aggregate results
echo "Running security scans..."

tfsec . --format json > reports/tfsec.json
checkov -d . --output json > reports/checkov.json
trivy config . --format json > reports/trivy.json

# Aggregate results
python3 << 'EOF'
import json
from collections import defaultdict

scanners = ['tfsec', 'checkov', 'trivy']
severities = defaultdict(int)
findings_by_file = defaultdict(list)

for scanner in scanners:
    with open(f'reports/{scanner}.json', 'r') as f:
        data = json.load(f)
        # Parse each scanner's format (simplified)
        # Aggregate by severity and file

print("Security Scan Summary")
print("=" * 50)
print(f"Total Critical: {severities['CRITICAL']}")
print(f"Total High: {severities['HIGH']}")
print(f"Total Medium: {severities['MEDIUM']}")
print(f"Total Low: {severities['LOW']}")
EOF
```

---

## Pre-commit Hooks

**`.pre-commit-config.yaml`**
```yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tfsec
        args:
          - --args=--minimum-severity=MEDIUM
      - id: terraform_checkov
        args:
          - --args=--quiet
      - id: terraform_trivy
        args:
          - --args=--severity CRITICAL,HIGH

  - repo: local
    hooks:
      - id: custom-tag-check
        name: Check required tags
        entry: scripts/check-tags.sh
        language: script
        files: \.tf$
```

---

## Best Practices

### 1. Multiple Scanners
- Use 2-3 scanners for comprehensive coverage
- Each scanner has different rule sets
- Aggregate findings for complete picture

### 2. Severity-Based Enforcement
- Block on CRITICAL and HIGH
- Warn on MEDIUM
- Informational for LOW

### 3. Custom Rules
- Implement organization-specific policies
- Enforce tagging standards
- Validate compliance controls

### 4. CI/CD Integration
- Scan on every pull request
- Block merges on critical findings
- Upload results to security dashboards

### 5. Developer Experience
- Pre-commit hooks for fast feedback
- Clear remediation guidance
- Auto-fix capabilities where possible

### 6. Continuous Monitoring
- Scheduled scans for drift detection
- Alert on new vulnerabilities
- Regular policy updates

---

## Scanner Selection Guide

**Choose tfsec when:**
- Terraform-only environment
- Need fast, focused Terraform scanning
- Want Go-based custom rules

**Choose checkov when:**
- Multi-IaC environment (Terraform, CloudFormation, K8s)
- Need extensive built-in policies
- Want Python-based custom rules
- Need Bridgecrew platform integration

**Choose trivy when:**
- Need container + IaC scanning
- Want Rego policies (OPA)
- Need vulnerability scanning
- Prefer comprehensive security tool

**Choose terrascan when:**
- Need admission controller for Kubernetes
- Want centralized policy management
- Prefer Rego policies
- Need runtime protection

**Use multiple when:**
- Enterprise security requirements
- SOC2/compliance needs
- Maximum coverage required
- Different teams prefer different tools

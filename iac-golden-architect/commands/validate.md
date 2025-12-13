---
description: Comprehensive Infrastructure as Code validation including security scanning (tfsec, checkov, trivy, terrascan), cost estimation, compliance checking, and quality gates with blocking on critical findings
argument-hint: --all --security --cost --compliance --block-on-critical --report-format [json|html|markdown]
allowed-tools:
  - Bash
  - Write
  - Read
  - Grep
  - Glob
---

# Comprehensive IaC Validation

You are running comprehensive Infrastructure as Code validation with security scanning, cost estimation, compliance checking, and quality gates to ensure infrastructure meets enterprise standards before deployment.

## Input Parameters

Parse the user's command arguments:
- `--all`: Run all validation checks (default)
- `--security`: Run security scans only
- `--cost`: Run cost estimation only
- `--compliance`: Run compliance checks only
- `--quality`: Run code quality checks only
- `--block-on-critical`: Block (exit 1) if critical issues found
- `--report-format`: Output format (json, html, markdown, sarif)
- `--output-dir`: Directory for reports (default: ./validation-reports)
- `--framework`: Compliance framework (soc2, cis, pci, hipaa, all)
- `--severity-threshold`: Minimum severity to report (low, medium, high, critical)
- `--exclude-rules`: Comma-separated rules to exclude
- `--cloud`: Filter checks by cloud provider (aws, azure, gcp, all)

## Execution Steps

### 1. Pre-Flight Checks

Verify environment and tools:

```bash
echo "IaC Validation Framework"
echo "========================================"
echo "Timestamp: $(date)"
echo "Directory: $(pwd)"
echo ""

# Verify this is an IaC directory
if [ ! -f "*.tf" ] && [ ! -d "terraform" ] && [ ! -d "cloudformation" ] && [ ! -d "pulumi" ]; then
    echo "⚠️  WARNING: No IaC files detected in current directory"
    echo "Looking for: *.tf, terraform/, cloudformation/, pulumi/"
    echo ""
fi

# Check available validation tools
echo "Checking validation tools..."
echo ""

TOOLS_AVAILABLE=()
TOOLS_MISSING=()

# Security scanners
if command -v tfsec &> /dev/null; then
    TFSEC_VERSION=$(tfsec --version 2>&1 | head -1)
    echo "✓ tfsec: $TFSEC_VERSION"
    TOOLS_AVAILABLE+=("tfsec")
else
    echo "✗ tfsec: not installed"
    TOOLS_MISSING+=("tfsec")
fi

if command -v checkov &> /dev/null; then
    CHECKOV_VERSION=$(checkov --version 2>&1 | head -1)
    echo "✓ checkov: $CHECKOV_VERSION"
    TOOLS_AVAILABLE+=("checkov")
else
    echo "✗ checkov: not installed"
    TOOLS_MISSING+=("checkov")
fi

if command -v trivy &> /dev/null; then
    TRIVY_VERSION=$(trivy --version 2>&1 | grep Version | cut -d' ' -f2)
    echo "✓ trivy: $TRIVY_VERSION"
    TOOLS_AVAILABLE+=("trivy")
else
    echo "✗ trivy: not installed"
    TOOLS_MISSING+=("trivy")
fi

if command -v terrascan &> /dev/null; then
    TERRASCAN_VERSION=$(terrascan version 2>&1 | grep version | cut -d' ' -f3)
    echo "✓ terrascan: $TERRASCAN_VERSION"
    TOOLS_AVAILABLE+=("terrascan")
else
    echo "✗ terrascan: not installed"
    TOOLS_MISSING+=("terrascan")
fi

# Cost estimation
if command -v infracost &> /dev/null; then
    INFRACOST_VERSION=$(infracost --version 2>&1 | cut -d' ' -f3)
    echo "✓ infracost: $INFRACOST_VERSION"
    TOOLS_AVAILABLE+=("infracost")
else
    echo "✗ infracost: not installed"
    TOOLS_MISSING+=("infracost")
fi

# Quality tools
if command -v terraform &> /dev/null; then
    TF_VERSION=$(terraform version -json 2>&1 | jq -r '.terraform_version')
    echo "✓ terraform: $TF_VERSION"
    TOOLS_AVAILABLE+=("terraform")
else
    echo "✗ terraform: not installed"
    TOOLS_MISSING+=("terraform")
fi

if command -v tflint &> /dev/null; then
    TFLINT_VERSION=$(tflint --version 2>&1 | head -1 | cut -d' ' -f3)
    echo "✓ tflint: $TFLINT_VERSION"
    TOOLS_AVAILABLE+=("tflint")
else
    echo "✗ tflint: not installed"
    TOOLS_MISSING+=("tflint")
fi

echo ""

# Warn about missing tools
if [ ${#TOOLS_MISSING[@]} -gt 0 ]; then
    echo "⚠️  Missing tools: ${TOOLS_MISSING[*]}"
    echo ""
    echo "Installation instructions:"
    for tool in "${TOOLS_MISSING[@]}"; do
        case $tool in
            tfsec)
                echo "  tfsec:     brew install tfsec  OR  https://github.com/aquasecurity/tfsec"
                ;;
            checkov)
                echo "  checkov:   pip install checkov"
                ;;
            trivy)
                echo "  trivy:     brew install trivy  OR  https://github.com/aquasecurity/trivy"
                ;;
            terrascan)
                echo "  terrascan: https://github.com/tenable/terrascan"
                ;;
            infracost)
                echo "  infracost: https://www.infracost.io/docs/"
                ;;
            tflint)
                echo "  tflint:    brew install tflint"
                ;;
        esac
    done
    echo ""
fi

if [ ${#TOOLS_AVAILABLE[@]} -eq 0 ]; then
    echo "ERROR: No validation tools available. Install at least one scanner."
    exit 1
fi
```

### 2. Setup Report Directory

Create output directory for reports:

```bash
OUTPUT_DIR=${OUTPUT_DIR:-./validation-reports}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_DIR="$OUTPUT_DIR/$TIMESTAMP"

mkdir -p "$REPORT_DIR"
echo "Report directory: $REPORT_DIR"
echo ""

# Create index file
cat > "$REPORT_DIR/index.md" <<EOF
# IaC Validation Report
**Generated:** $(date)
**Directory:** $(pwd)
**Tools:** ${TOOLS_AVAILABLE[*]}

## Reports
EOF
```

### 3. Security Validation

Run all available security scanners:

#### 3.1 TFSec

```bash
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " tfsec " ]] && [ "$SKIP_SECURITY" != "true" ]; then
    echo "Running TFSec security scan..."
    echo "========================================"

    # Determine severity threshold
    SEVERITY=${SEVERITY_THRESHOLD:-MEDIUM}

    # Build tfsec command
    TFSEC_CMD="tfsec ."
    TFSEC_CMD="$TFSEC_CMD --minimum-severity $SEVERITY"
    TFSEC_CMD="$TFSEC_CMD --exclude-downloaded-modules"

    # Add cloud filter if specified
    if [ -n "$CLOUD" ] && [ "$CLOUD" != "all" ]; then
        TFSEC_CMD="$TFSEC_CMD --include-patterns $CLOUD"
    fi

    # Run with multiple output formats
    echo "Command: $TFSEC_CMD"

    # JSON output
    eval $TFSEC_CMD --format json --out "$REPORT_DIR/tfsec-results.json" --soft-fail
    TFSEC_EXIT_CODE=$?

    # Human-readable output
    eval $TFSEC_CMD --format default > "$REPORT_DIR/tfsec-report.txt" 2>&1 --soft-fail

    # SARIF output (for GitHub Code Scanning)
    eval $TFSEC_CMD --format sarif --out "$REPORT_DIR/tfsec-results.sarif" --soft-fail

    # JUnit output (for CI/CD)
    eval $TFSEC_CMD --format junit --out "$REPORT_DIR/tfsec-results.xml" --soft-fail

    # Parse results
    if [ -f "$REPORT_DIR/tfsec-results.json" ]; then
        TFSEC_CRITICAL=$(jq '[.results[]? | select(.severity=="CRITICAL")] | length' "$REPORT_DIR/tfsec-results.json")
        TFSEC_HIGH=$(jq '[.results[]? | select(.severity=="HIGH")] | length' "$REPORT_DIR/tfsec-results.json")
        TFSEC_MEDIUM=$(jq '[.results[]? | select(.severity=="MEDIUM")] | length' "$REPORT_DIR/tfsec-results.json")
        TFSEC_LOW=$(jq '[.results[]? | select(.severity=="LOW")] | length' "$REPORT_DIR/tfsec-results.json")
        TFSEC_TOTAL=$(jq '.results | length' "$REPORT_DIR/tfsec-results.json")

        echo ""
        echo "TFSec Results:"
        echo "  Critical: $TFSEC_CRITICAL"
        echo "  High:     $TFSEC_HIGH"
        echo "  Medium:   $TFSEC_MEDIUM"
        echo "  Low:      $TFSEC_LOW"
        echo "  Total:    $TFSEC_TOTAL"
        echo ""

        # Update index
        cat >> "$REPORT_DIR/index.md" <<EOF
- [TFSec Report](tfsec-report.txt) - $TFSEC_TOTAL issues ($TFSEC_CRITICAL critical, $TFSEC_HIGH high)
EOF
    fi

    echo "✓ TFSec scan complete"
    echo ""
fi
```

#### 3.2 Checkov

```bash
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " checkov " ]] && [ "$SKIP_SECURITY" != "true" ]; then
    echo "Running Checkov security scan..."
    echo "========================================"

    # Build checkov command
    CHECKOV_CMD="checkov -d ."
    CHECKOV_CMD="$CHECKOV_CMD --framework terraform"
    CHECKOV_CMD="$CHECKOV_CMD --quiet"
    CHECKOV_CMD="$CHECKOV_CMD --compact"

    # Add compliance framework if specified
    FRAMEWORK=${FRAMEWORK:-soc2}
    if [ "$FRAMEWORK" != "all" ]; then
        CHECKOV_CMD="$CHECKOV_CMD --framework-compliance $FRAMEWORK"
    fi

    echo "Command: $CHECKOV_CMD"

    # JSON output
    eval $CHECKOV_CMD --output json --output-file "$REPORT_DIR/checkov-results.json" || true

    # JUnit output
    eval $CHECKOV_CMD --output junitxml --output-file "$REPORT_DIR/checkov-results.xml" || true

    # Human-readable output
    eval $CHECKOV_CMD > "$REPORT_DIR/checkov-report.txt" 2>&1 || true

    # SARIF output
    eval $CHECKOV_CMD --output sarif --output-file "$REPORT_DIR/checkov-results.sarif" || true

    # Parse results
    if [ -f "$REPORT_DIR/checkov-results.json" ]; then
        CHECKOV_PASSED=$(jq '.summary.passed // 0' "$REPORT_DIR/checkov-results.json")
        CHECKOV_FAILED=$(jq '.summary.failed // 0' "$REPORT_DIR/checkov-results.json")
        CHECKOV_SKIPPED=$(jq '.summary.skipped // 0' "$REPORT_DIR/checkov-results.json")

        echo ""
        echo "Checkov Results:"
        echo "  Passed:  $CHECKOV_PASSED"
        echo "  Failed:  $CHECKOV_FAILED"
        echo "  Skipped: $CHECKOV_SKIPPED"
        echo ""

        # Update index
        cat >> "$REPORT_DIR/index.md" <<EOF
- [Checkov Report](checkov-report.txt) - $CHECKOV_FAILED failed checks
EOF
    fi

    echo "✓ Checkov scan complete"
    echo ""
fi
```

#### 3.3 Trivy

```bash
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " trivy " ]] && [ "$SKIP_SECURITY" != "true" ]; then
    echo "Running Trivy security scan..."
    echo "========================================"

    # Build trivy command
    TRIVY_CMD="trivy config ."
    TRIVY_CMD="$TRIVY_CMD --severity ${SEVERITY_THRESHOLD:-MEDIUM,HIGH,CRITICAL}"
    TRIVY_CMD="$TRIVY_CMD --exit-code 0"

    echo "Command: $TRIVY_CMD"

    # JSON output
    eval $TRIVY_CMD --format json --output "$REPORT_DIR/trivy-results.json"

    # Table output
    eval $TRIVY_CMD --format table > "$REPORT_DIR/trivy-report.txt" 2>&1

    # SARIF output
    eval $TRIVY_CMD --format sarif --output "$REPORT_DIR/trivy-results.sarif"

    # Parse results
    if [ -f "$REPORT_DIR/trivy-results.json" ]; then
        TRIVY_VULNS=$(jq '[.Results[]? | .Misconfigurations[]?] | length' "$REPORT_DIR/trivy-results.json")

        echo ""
        echo "Trivy Results:"
        echo "  Misconfigurations: $TRIVY_VULNS"
        echo ""

        # Update index
        cat >> "$REPORT_DIR/index.md" <<EOF
- [Trivy Report](trivy-report.txt) - $TRIVY_VULNS misconfigurations
EOF
    fi

    echo "✓ Trivy scan complete"
    echo ""
fi
```

#### 3.4 Terrascan

```bash
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " terrascan " ]] && [ "$SKIP_SECURITY" != "true" ]; then
    echo "Running Terrascan..."
    echo "========================================"

    # Build terrascan command
    TERRASCAN_CMD="terrascan scan"
    TERRASCAN_CMD="$TERRASCAN_CMD --iac-type terraform"
    TERRASCAN_CMD="$TERRASCAN_CMD --iac-dir ."

    # Add compliance framework
    if [ -n "$FRAMEWORK" ] && [ "$FRAMEWORK" != "all" ]; then
        TERRASCAN_CMD="$TERRASCAN_CMD --policy-type $FRAMEWORK"
    fi

    echo "Command: $TERRASCAN_CMD"

    # JSON output
    eval $TERRASCAN_CMD --output json > "$REPORT_DIR/terrascan-results.json" 2>&1 || true

    # Human-readable output
    eval $TERRASCAN_CMD --output human > "$REPORT_DIR/terrascan-report.txt" 2>&1 || true

    # SARIF output
    eval $TERRASCAN_CMD --output sarif > "$REPORT_DIR/terrascan-results.sarif" 2>&1 || true

    # Parse results
    if [ -f "$REPORT_DIR/terrascan-results.json" ]; then
        TERRASCAN_VIOLATIONS=$(jq '.results.violations | length // 0' "$REPORT_DIR/terrascan-results.json")

        echo ""
        echo "Terrascan Results:"
        echo "  Violations: $TERRASCAN_VIOLATIONS"
        echo ""

        # Update index
        cat >> "$REPORT_DIR/index.md" <<EOF
- [Terrascan Report](terrascan-report.txt) - $TERRASCAN_VIOLATIONS violations
EOF
    fi

    echo "✓ Terrascan scan complete"
    echo ""
fi
```

### 4. Cost Estimation

Run cost analysis if enabled:

```bash
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " infracost " ]] && [ "$SKIP_COST" != "true" ]; then
    echo "Running cost estimation..."
    echo "========================================"

    # Check for Infracost API key
    if [ -z "$INFRACOST_API_KEY" ]; then
        echo "⚠️  WARNING: INFRACOST_API_KEY not set. Skipping cost estimation."
        echo "Get free API key: infracost auth login"
        echo ""
    else
        # Generate plan for cost estimation
        if [ -f "tfplan" ]; then
            PLAN_FILE="tfplan"
        else
            echo "Generating Terraform plan for cost estimation..."
            terraform plan -out=tfplan-cost > /dev/null 2>&1
            PLAN_FILE="tfplan-cost"
        fi

        # JSON output
        infracost breakdown \
            --path "$PLAN_FILE" \
            --format json \
            --out-file "$REPORT_DIR/infracost-results.json"

        # Table output
        infracost breakdown \
            --path "$PLAN_FILE" \
            --format table \
            > "$REPORT_DIR/cost-estimate.txt"

        # HTML output
        infracost breakdown \
            --path "$PLAN_FILE" \
            --format html \
            > "$REPORT_DIR/cost-estimate.html"

        # Parse results
        if [ -f "$REPORT_DIR/infracost-results.json" ]; then
            MONTHLY_COST=$(jq -r '.projects[0].breakdown.totalMonthlyCost // "0"' "$REPORT_DIR/infracost-results.json")
            HOURLY_COST=$(echo "scale=2; $MONTHLY_COST / 730" | bc)
            YEARLY_COST=$(echo "scale=2; $MONTHLY_COST * 12" | bc)

            echo ""
            echo "Cost Estimate:"
            echo "  Hourly:   \$$HOURLY_COST"
            echo "  Monthly:  \$$MONTHLY_COST"
            echo "  Yearly:   \$$YEARLY_COST"
            echo ""

            # Cost breakdown by service
            echo "Top 5 Costliest Resources:"
            jq -r '.projects[0].breakdown.resources | sort_by(.monthlyCost) | reverse | .[0:5] | .[] | "  \(.name): $\(.monthlyCost)/mo"' "$REPORT_DIR/infracost-results.json"
            echo ""

            # Update index
            cat >> "$REPORT_DIR/index.md" <<EOF
- [Cost Estimate](cost-estimate.txt) - \$$MONTHLY_COST/month
EOF
        fi

        # Cleanup temp plan
        [ "$PLAN_FILE" = "tfplan-cost" ] && rm -f tfplan-cost

        echo "✓ Cost estimation complete"
        echo ""
    fi
fi
```

### 5. Code Quality Checks

Run Terraform quality checks:

```bash
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " terraform " ]] && [ "$SKIP_QUALITY" != "true" ]; then
    echo "Running Terraform quality checks..."
    echo "========================================"

    # Format check
    echo "Checking format..."
    terraform fmt -check -recursive -diff > "$REPORT_DIR/terraform-fmt.txt" 2>&1
    FMT_EXIT_CODE=$?

    if [ $FMT_EXIT_CODE -eq 0 ]; then
        echo "  ✓ All files properly formatted"
        FMT_STATUS="PASS"
    else
        echo "  ✗ Format issues detected"
        FMT_STATUS="FAIL"
    fi

    # Validation
    echo "Running validation..."
    terraform init -backend=false > /dev/null 2>&1
    terraform validate -json > "$REPORT_DIR/terraform-validate.json" 2>&1
    VALIDATE_EXIT_CODE=$?

    if [ $VALIDATE_EXIT_CODE -eq 0 ]; then
        echo "  ✓ Configuration valid"
        VALIDATE_STATUS="PASS"
    else
        echo "  ✗ Validation errors detected"
        VALIDATE_STATUS="FAIL"

        # Extract errors
        jq -r '.diagnostics[]? | "\(.severity): \(.summary) - \(.detail)"' "$REPORT_DIR/terraform-validate.json" > "$REPORT_DIR/terraform-errors.txt"
    fi

    # Update index
    cat >> "$REPORT_DIR/index.md" <<EOF
- [Terraform Format](terraform-fmt.txt) - $FMT_STATUS
- [Terraform Validation](terraform-validate.json) - $VALIDATE_STATUS
EOF

    echo ""
fi

# TFLint
if [[ " ${TOOLS_AVAILABLE[@]} " =~ " tflint " ]] && [ "$SKIP_QUALITY" != "true" ]; then
    echo "Running TFLint..."

    # Initialize tflint
    tflint --init > /dev/null 2>&1

    # Run tflint
    tflint --format json > "$REPORT_DIR/tflint-results.json" 2>&1 || true
    tflint --format default > "$REPORT_DIR/tflint-report.txt" 2>&1 || true

    # Parse results
    if [ -f "$REPORT_DIR/tflint-results.json" ]; then
        TFLINT_ERRORS=$(jq '[.issues[]? | select(.rule.severity=="error")] | length' "$REPORT_DIR/tflint-results.json")
        TFLINT_WARNINGS=$(jq '[.issues[]? | select(.rule.severity=="warning")] | length' "$REPORT_DIR/tflint-results.json")

        echo "  Errors:   $TFLINT_ERRORS"
        echo "  Warnings: $TFLINT_WARNINGS"

        # Update index
        cat >> "$REPORT_DIR/index.md" <<EOF
- [TFLint Report](tflint-report.txt) - $TFLINT_ERRORS errors, $TFLINT_WARNINGS warnings
EOF
    fi

    echo "✓ TFLint complete"
    echo ""
fi
```

### 6. Compliance Validation

Generate compliance report:

```bash
echo "Generating compliance report..."
echo "========================================"

FRAMEWORK=${FRAMEWORK:-soc2}

cat > "$REPORT_DIR/compliance-report.md" <<EOF
# Compliance Report
**Framework:** $FRAMEWORK
**Generated:** $(date)

## Security Controls

### Encryption
- [ ] Data encrypted at rest
- [ ] Data encrypted in transit
- [ ] KMS keys managed properly
- [ ] TLS 1.2+ enforced

### Access Control
- [ ] IAM policies follow least privilege
- [ ] MFA enabled where required
- [ ] Service accounts properly scoped
- [ ] Access logging enabled

### Network Security
- [ ] Security groups restrict access
- [ ] Network ACLs configured
- [ ] Private subnets used for sensitive resources
- [ ] VPN/PrivateLink for internal access

### Audit & Monitoring
- [ ] CloudTrail/Activity Log enabled
- [ ] Log retention meets requirements
- [ ] Monitoring alerts configured
- [ ] Security hub enabled

### Data Protection
- [ ] Backup policies configured
- [ ] Versioning enabled
- [ ] Lifecycle policies defined
- [ ] Data classification tags applied

## Security Scan Summary

| Scanner | Critical | High | Medium | Low | Pass |
|---------|----------|------|--------|-----|------|
| TFSec | ${TFSEC_CRITICAL:-0} | ${TFSEC_HIGH:-0} | ${TFSEC_MEDIUM:-0} | ${TFSEC_LOW:-0} | - |
| Checkov | - | - | - | - | ${CHECKOV_PASSED:-0} |
| Trivy | - | - | - | - | - |
| Terrascan | - | - | - | - | - |

## Cost Analysis

Monthly Cost: \$${MONTHLY_COST:-N/A}
Yearly Cost: \$${YEARLY_COST:-N/A}

## Quality Checks

- Format: $FMT_STATUS
- Validation: $VALIDATE_STATUS
- TFLint: ${TFLINT_ERRORS:-0} errors

## Recommendations

EOF

# Add specific recommendations based on findings
if [ "${TFSEC_CRITICAL:-0}" -gt 0 ]; then
    echo "1. **CRITICAL**: Address $TFSEC_CRITICAL critical security issues immediately" >> "$REPORT_DIR/compliance-report.md"
fi

if [ "$FMT_STATUS" = "FAIL" ]; then
    echo "2. Run \`terraform fmt -recursive\` to fix formatting issues" >> "$REPORT_DIR/compliance-report.md"
fi

if [ "$VALIDATE_STATUS" = "FAIL" ]; then
    echo "3. Fix Terraform validation errors before deployment" >> "$REPORT_DIR/compliance-report.md"
fi

cat >> "$REPORT_DIR/compliance-report.md" <<EOF

## Approval Status

- [ ] Security review approved
- [ ] Cost review approved
- [ ] Compliance review approved
- [ ] Architecture review approved

**Approver:** ___________________
**Date:** ___________________

EOF

cat >> "$REPORT_DIR/index.md" <<EOF
- [Compliance Report](compliance-report.md)
EOF

echo "✓ Compliance report generated"
echo ""
```

### 7. Consolidated Report

Create master report:

```bash
echo "Creating consolidated validation report..."

cat > "$REPORT_DIR/validation-summary.md" <<EOF
# Infrastructure Validation Summary
**Generated:** $(date)
**Directory:** $(pwd)
**Framework:** ${FRAMEWORK:-soc2}

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| Security | $([ "${TFSEC_CRITICAL:-0}" -eq 0 ] && echo "✓ PASS" || echo "✗ FAIL") | ${TFSEC_CRITICAL:-0} critical issues |
| Compliance | $([ "${CHECKOV_FAILED:-0}" -lt 10 ] && echo "⚠ REVIEW" || echo "✗ FAIL") | ${CHECKOV_FAILED:-0} failed checks |
| Cost | $(echo "$MONTHLY_COST < 1000" | bc -l | grep -q 1 && echo "✓ OK" || echo "⚠ HIGH") | \$${MONTHLY_COST:-N/A}/month |
| Quality | $([ "$VALIDATE_STATUS" = "PASS" ] && echo "✓ PASS" || echo "✗ FAIL") | Format: $FMT_STATUS, Validate: $VALIDATE_STATUS |

## Security Findings

### Critical Issues: ${TFSEC_CRITICAL:-0}
### High Issues: ${TFSEC_HIGH:-0}
### Medium Issues: ${TFSEC_MEDIUM:-0}

## Cost Breakdown

- **Hourly:** \$${HOURLY_COST:-N/A}
- **Monthly:** \$${MONTHLY_COST:-N/A}
- **Yearly:** \$${YEARLY_COST:-N/A}

## Quality Metrics

- **Files Scanned:** $(find . -name "*.tf" | wc -l)
- **Format Issues:** $([ "$FMT_STATUS" = "PASS" ] && echo "0" || grep -c "^\-" "$REPORT_DIR/terraform-fmt.txt" || echo "0")
- **Validation Errors:** ${TFLINT_ERRORS:-0}

## Detailed Reports

See the following files for detailed findings:
- [Security Report](tfsec-report.txt)
- [Compliance Report](compliance-report.md)
- [Cost Estimate](cost-estimate.txt)

## Approval Workflow

EOF

# Determine if blocking should occur
BLOCK=false

if [ "${TFSEC_CRITICAL:-0}" -gt 0 ] && [ "$BLOCK_ON_CRITICAL" = "true" ]; then
    echo "**Status:** ✗ BLOCKED - Critical security issues must be resolved" >> "$REPORT_DIR/validation-summary.md"
    BLOCK=true
elif [ "$VALIDATE_STATUS" = "FAIL" ]; then
    echo "**Status:** ✗ BLOCKED - Terraform validation failed" >> "$REPORT_DIR/validation-summary.md"
    BLOCK=true
else
    echo "**Status:** ✓ READY FOR REVIEW" >> "$REPORT_DIR/validation-summary.md"
fi

echo ""
echo "✓ Consolidated report generated"
echo ""
```

### 8. Generate Artifacts

Create additional artifacts for CI/CD integration:

```bash
# Create summary JSON for programmatic access
jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson tfsec_critical "${TFSEC_CRITICAL:-0}" \
    --argjson tfsec_high "${TFSEC_HIGH:-0}" \
    --argjson checkov_failed "${CHECKOV_FAILED:-0}" \
    --arg monthly_cost "${MONTHLY_COST:-0}" \
    --arg format_status "$FMT_STATUS" \
    --arg validate_status "$VALIDATE_STATUS" \
    '{
        timestamp: $timestamp,
        security: {
            critical: $tfsec_critical,
            high: $tfsec_high,
            status: (if $tfsec_critical == 0 then "PASS" else "FAIL" end)
        },
        compliance: {
            failed: $checkov_failed,
            status: (if $checkov_failed < 10 then "REVIEW" else "FAIL" end)
        },
        cost: {
            monthly: $monthly_cost
        },
        quality: {
            format: $format_status,
            validation: $validate_status
        }
    }' > "$REPORT_DIR/summary.json"

echo "✓ Artifacts generated"
echo ""
```

### 9. Final Summary

Display results and determine exit code:

```bash
echo "========================================"
echo "VALIDATION COMPLETE"
echo "========================================"
echo ""
echo "Reports Directory: $REPORT_DIR"
echo ""
echo "Security:"
echo "  Critical Issues: ${TFSEC_CRITICAL:-0}"
echo "  High Issues:     ${TFSEC_HIGH:-0}"
echo "  Medium Issues:   ${TFSEC_MEDIUM:-0}"
echo ""
echo "Compliance:"
echo "  Failed Checks:   ${CHECKOV_FAILED:-0}"
echo "  Passed Checks:   ${CHECKOV_PASSED:-0}"
echo ""
echo "Cost:"
echo "  Monthly:         \$${MONTHLY_COST:-N/A}"
echo ""
echo "Quality:"
echo "  Format:          $FMT_STATUS"
echo "  Validation:      $VALIDATE_STATUS"
echo ""

# List all generated reports
echo "Generated Reports:"
ls -lh "$REPORT_DIR"/*.{txt,json,md,html,xml,sarif} 2>/dev/null | awk '{print "  " $9}' || true
echo ""

# Display main summary
cat "$REPORT_DIR/validation-summary.md"
echo ""

# Exit with appropriate code
if [ "$BLOCK" = "true" ]; then
    echo "========================================"
    echo "✗ VALIDATION FAILED - BLOCKING"
    echo "========================================"
    echo ""
    echo "Critical issues must be resolved before deployment."
    echo "Review reports in: $REPORT_DIR"
    exit 1
elif [ "${TFSEC_HIGH:-0}" -gt 5 ] || [ "${CHECKOV_FAILED:-0}" -gt 20 ]; then
    echo "========================================"
    echo "⚠ VALIDATION WARNING - REVIEW REQUIRED"
    echo "========================================"
    exit 0
else
    echo "========================================"
    echo "✓ VALIDATION PASSED"
    echo "========================================"
    exit 0
fi
```

## Error Handling

```bash
# No IaC files found
# (handled in pre-flight)

# All tools missing
# (handled in pre-flight)

# Infracost API key missing
# (handled in cost estimation section)

# Terraform not initialized
if [ "$SKIP_QUALITY" != "true" ] && [ ! -d ".terraform" ]; then
    echo "⚠️  WARNING: Terraform not initialized"
    echo "Some quality checks may be skipped"
fi
```

## Best Practices Applied

- Multi-scanner security validation
- Cost-aware infrastructure review
- Compliance framework alignment
- Quality gate enforcement
- Comprehensive reporting (JSON, HTML, SARIF, Markdown)
- CI/CD integration ready
- Blocking on critical findings
- Audit trail generation
- SOC2/CIS/PCI compliance checking

---
description: Run Terraform plan with comprehensive security validation, cost estimation, and drift detection
argument-hint: --scan --cost --target [resource] --var-file [path]
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
---

# Terraform Plan with Security Validation

You are executing a comprehensive Terraform plan operation that includes security scanning, cost estimation, and drift detection.

## Input Parameters

Parse the user's command arguments:
- `--scan`: Enable security scanning (tfsec, checkov, terrascan)
- `--cost`: Enable cost estimation (requires Infracost)
- `--target`: Target specific resource (optional)
- `--var-file`: Path to tfvars file (defaults to auto-detect)
- `--out`: Output plan file path (defaults to tfplan)
- `--detailed`: Show detailed output
- `--json`: Output results in JSON format

## Execution Steps

### 1. Pre-Flight Checks

Verify the environment is ready:

```bash
# Check current directory
pwd

# Verify Terraform is initialized
if [ ! -d ".terraform" ]; then
    echo "ERROR: Terraform not initialized. Run 'terraform init' first."
    exit 1
fi

# Check Terraform version
terraform version

# Verify workspace
terraform workspace show
```

### 2. Identify Variable Files

Auto-detect or use specified var file:

```bash
# List available tfvars files
find . -name "*.tfvars" -o -name "*.tfvars.json" | grep -v ".example"
```

If `--var-file` is not specified, look for:
1. `terraform.tfvars` in current directory
2. `*.auto.tfvars` files
3. Environment-specific files in `environments/` directory

Prompt user if multiple options exist or none found.

### 3. Validate Configuration

Before planning, validate the configuration:

```bash
# Format check
echo "Checking format..."
terraform fmt -check -recursive

# Validation
echo "Validating configuration..."
terraform validate
```

If validation fails, report errors and stop.

### 4. Generate Plan File

Construct and execute the terraform plan command:

```bash
# Base command
PLAN_CMD="terraform plan"

# Add var file if specified or detected
if [ -n "$VAR_FILE" ]; then
    PLAN_CMD="$PLAN_CMD -var-file=$VAR_FILE"
fi

# Add target if specified
if [ -n "$TARGET" ]; then
    PLAN_CMD="$PLAN_CMD -target=$TARGET"
fi

# Add output file
PLAN_FILE="${OUT_PATH:-tfplan}"
PLAN_CMD="$PLAN_CMD -out=$PLAN_FILE"

# Add detailed output flag
PLAN_CMD="$PLAN_CMD -detailed-exitcode"

# Execute plan
echo "Running: $PLAN_CMD"
$PLAN_CMD

# Capture exit code
PLAN_EXIT_CODE=$?
```

Interpret exit codes:
- 0: No changes
- 1: Error
- 2: Changes detected

### 5. Generate Human-Readable Plan

Save a readable version of the plan:

```bash
terraform show $PLAN_FILE > tfplan.txt
terraform show -json $PLAN_FILE > tfplan.json
```

### 6. Analyze Plan Output

Parse the plan to extract key information:

```bash
# Count resources
echo "Analyzing plan changes..."

# Extract resource counts
RESOURCES_TO_ADD=$(grep -c "will be created" tfplan.txt || echo 0)
RESOURCES_TO_CHANGE=$(grep -c "will be updated in-place" tfplan.txt || echo 0)
RESOURCES_TO_DESTROY=$(grep -c "will be destroyed" tfplan.txt || echo 0)
RESOURCES_TO_REPLACE=$(grep -c "must be replaced" tfplan.txt || echo 0)

echo "Plan Summary:"
echo "  Resources to Add:     $RESOURCES_TO_ADD"
echo "  Resources to Change:  $RESOURCES_TO_CHANGE"
echo "  Resources to Destroy: $RESOURCES_TO_DESTROY"
echo "  Resources to Replace: $RESOURCES_TO_REPLACE"
```

### 7. Security Scanning (if --scan enabled)

Run comprehensive security scans on the plan:

#### 7.1 TFSec Scan

```bash
if command -v tfsec &> /dev/null; then
    echo "Running TFSec security scan..."

    tfsec . \
        --format json \
        --out tfsec-results.json \
        --minimum-severity MEDIUM \
        --exclude-downloaded-modules

    # Also generate readable output
    tfsec . \
        --format default \
        --minimum-severity MEDIUM \
        --exclude-downloaded-modules \
        > tfsec-report.txt

    # Count issues by severity
    TFSEC_CRITICAL=$(jq '[.results[] | select(.severity=="CRITICAL")] | length' tfsec-results.json)
    TFSEC_HIGH=$(jq '[.results[] | select(.severity=="HIGH")] | length' tfsec-results.json)
    TFSEC_MEDIUM=$(jq '[.results[] | select(.severity=="MEDIUM")] | length' tfsec-results.json)

    echo "TFSec Results:"
    echo "  Critical: $TFSEC_CRITICAL"
    echo "  High:     $TFSEC_HIGH"
    echo "  Medium:   $TFSEC_MEDIUM"
else
    echo "WARNING: TFSec not installed. Skipping TFSec scan."
    echo "Install with: brew install tfsec (macOS) or download from https://github.com/aquasecurity/tfsec"
fi
```

#### 7.2 Checkov Scan

```bash
if command -v checkov &> /dev/null; then
    echo "Running Checkov security scan..."

    checkov -d . \
        --framework terraform \
        --output json \
        --output-file-path . \
        --file checkov-results.json \
        --quiet \
        --compact

    # Also generate readable output
    checkov -d . \
        --framework terraform \
        --compact \
        > checkov-report.txt

    # Parse results
    CHECKOV_PASSED=$(jq '.summary.passed' checkov-results.json)
    CHECKOV_FAILED=$(jq '.summary.failed' checkov-results.json)
    CHECKOV_SKIPPED=$(jq '.summary.skipped' checkov-results.json)

    echo "Checkov Results:"
    echo "  Passed:  $CHECKOV_PASSED"
    echo "  Failed:  $CHECKOV_FAILED"
    echo "  Skipped: $CHECKOV_SKIPPED"
else
    echo "WARNING: Checkov not installed. Skipping Checkov scan."
    echo "Install with: pip install checkov"
fi
```

#### 7.3 Terrascan Scan

```bash
if command -v terrascan &> /dev/null; then
    echo "Running Terrascan scan..."

    terrascan scan \
        --iac-type terraform \
        --output json \
        > terrascan-results.json

    # Parse results
    TERRASCAN_VIOLATIONS=$(jq '.results.violations | length' terrascan-results.json)

    echo "Terrascan Results:"
    echo "  Violations: $TERRASCAN_VIOLATIONS"
else
    echo "WARNING: Terrascan not installed. Skipping Terrascan scan."
    echo "Install from: https://github.com/tenable/terrascan"
fi
```

#### 7.4 Generate Security Report

Combine all security scan results:

```bash
# Create comprehensive security report
cat > security-report.md <<EOF
# Security Scan Report
Generated: $(date)

## Summary

| Scanner | Critical | High | Medium | Low | Passed |
|---------|----------|------|--------|-----|--------|
| TFSec | ${TFSEC_CRITICAL:-N/A} | ${TFSEC_HIGH:-N/A} | ${TFSEC_MEDIUM:-N/A} | N/A | N/A |
| Checkov | N/A | N/A | N/A | N/A | ${CHECKOV_PASSED:-N/A} |
| Terrascan | N/A | N/A | N/A | N/A | N/A |

## Failed Checks

See detailed reports:
- tfsec-report.txt
- checkov-report.txt
- terrascan-results.json

## Recommendations

EOF

# Add critical issues to report
if [ -f tfsec-results.json ]; then
    echo "### Critical TFSec Issues" >> security-report.md
    jq -r '.results[] | select(.severity=="CRITICAL") | "- \(.rule_id): \(.description)"' tfsec-results.json >> security-report.md
fi
```

### 8. Cost Estimation (if --cost enabled)

Run cost estimation using Infracost:

```bash
if [ "$COST_ENABLED" = "true" ]; then
    if command -v infracost &> /dev/null; then
        echo "Running cost estimation..."

        # Generate cost breakdown
        infracost breakdown \
            --path $PLAN_FILE \
            --format json \
            --out-file infracost.json

        # Generate readable report
        infracost breakdown \
            --path $PLAN_FILE \
            --format table \
            > cost-estimate.txt

        # Generate HTML report
        infracost breakdown \
            --path $PLAN_FILE \
            --format html \
            > cost-estimate.html

        # Extract key metrics
        MONTHLY_COST=$(jq -r '.projects[0].breakdown.totalMonthlyCost' infracost.json)
        COST_CHANGE=$(jq -r '.totalMonthlyCost - .pastTotalMonthlyCost' infracost.json 2>/dev/null || echo "N/A")

        echo "Cost Estimate:"
        echo "  Monthly Cost: \$$MONTHLY_COST"
        echo "  Cost Change:  \$$COST_CHANGE"

        # Display summary
        cat cost-estimate.txt
    else
        echo "WARNING: Infracost not installed. Skipping cost estimation."
        echo "Install from: https://www.infracost.io/docs/"
        echo "Requires API key: infracost auth login"
    fi
fi
```

### 9. Drift Detection

Detect infrastructure drift:

```bash
echo "Checking for drift..."

# Compare state with actual infrastructure
# This is implicit in terraform plan, but we can highlight it

if [ -f tfplan.json ]; then
    # Check if there are changes to existing resources
    DRIFT_COUNT=$(jq '[.resource_changes[] | select(.change.actions[] | contains("update") or contains("delete"))] | length' tfplan.json)

    if [ "$DRIFT_COUNT" -gt 0 ]; then
        echo "WARNING: Drift detected! $DRIFT_COUNT resources have drifted from their expected state."

        # List drifted resources
        echo "Drifted Resources:"
        jq -r '.resource_changes[] | select(.change.actions[] | contains("update") or contains("delete")) | "  - \(.type).\(.name) (\(.change.actions | join(", ")))"' tfplan.json

        # Create drift report
        jq '.resource_changes[] | select(.change.actions[] | contains("update") or contains("delete"))' tfplan.json > drift-report.json
    else
        echo "No drift detected. Infrastructure matches expected state."
    fi
fi
```

### 10. Policy Validation (if policies exist)

Check for policy files and validate:

```bash
# Check for Sentinel policies
if [ -d "policies/sentinel" ]; then
    echo "Sentinel policies detected..."
    # Note: Requires Terraform Cloud/Enterprise
    echo "Run policy validation in Terraform Cloud/Enterprise"
fi

# Check for OPA policies
if [ -d "policies/opa" ] && command -v opa &> /dev/null; then
    echo "Running OPA policy validation..."

    for policy in policies/opa/*.rego; do
        echo "Validating policy: $policy"
        opa test $policy --verbose
    done
fi
```

### 11. Compliance Checks

Run SOC2-specific compliance checks:

```bash
echo "Running SOC2 compliance checks..."

# Create compliance checklist
cat > compliance-checklist.md <<EOF
# SOC2 Compliance Checklist

## Encryption
- [ ] Data encrypted at rest
- [ ] Data encrypted in transit
- [ ] State file encryption enabled

## Access Control
- [ ] IAM policies follow least privilege
- [ ] MFA enabled for sensitive resources
- [ ] Access logging enabled

## Audit Logging
- [ ] CloudTrail/Activity Log enabled
- [ ] Log retention configured
- [ ] Log encryption enabled

## Network Security
- [ ] Security groups properly configured
- [ ] Network ACLs configured
- [ ] VPN/Private connectivity used

## Data Protection
- [ ] Backup policies configured
- [ ] Versioning enabled
- [ ] Lifecycle policies defined

EOF

# Scan for common compliance issues
if [ -f tfplan.json ]; then
    # Check for encryption
    UNENCRYPTED=$(jq -r '.resource_changes[] | select(.change.after.encryption_enabled == false or .change.after.encrypted == false) | .address' tfplan.json 2>/dev/null)

    if [ -n "$UNENCRYPTED" ]; then
        echo "WARNING: Unencrypted resources detected:"
        echo "$UNENCRYPTED"
    fi

    # Check for public access
    PUBLIC_ACCESS=$(jq -r '.resource_changes[] | select(.change.after.public_access_block_configuration == null or .change.after.acl == "public-read") | .address' tfplan.json 2>/dev/null)

    if [ -n "$PUBLIC_ACCESS" ]; then
        echo "WARNING: Resources with public access detected:"
        echo "$PUBLIC_ACCESS"
    fi
fi
```

### 12. Generate Comprehensive Report

Create a unified report combining all findings:

```bash
cat > plan-report.md <<EOF
# Terraform Plan Report
Generated: $(date)
Workspace: $(terraform workspace show)
Plan File: $PLAN_FILE

## Plan Summary

| Action | Count |
|--------|-------|
| Add | $RESOURCES_TO_ADD |
| Change | $RESOURCES_TO_CHANGE |
| Destroy | $RESOURCES_TO_DESTROY |
| Replace | $RESOURCES_TO_REPLACE |

## Security Scan Results

### TFSec
- Critical: ${TFSEC_CRITICAL:-N/A}
- High: ${TFSEC_HIGH:-N/A}
- Medium: ${TFSEC_MEDIUM:-N/A}

### Checkov
- Passed: ${CHECKOV_PASSED:-N/A}
- Failed: ${CHECKOV_FAILED:-N/A}

## Cost Estimate

Monthly Cost: \$${MONTHLY_COST:-N/A}
Cost Change: \$${COST_CHANGE:-N/A}

## Drift Detection

Drifted Resources: ${DRIFT_COUNT:-0}

## Detailed Reports

- Plan Output: tfplan.txt
- Plan JSON: tfplan.json
- Security Report: security-report.md
- Cost Estimate: cost-estimate.txt
- Compliance Checklist: compliance-checklist.md

## Next Steps

1. Review the plan output in tfplan.txt
2. Address any security issues in security-report.md
3. Review cost implications in cost-estimate.txt
4. If approved, run: terraform apply $PLAN_FILE

EOF

cat plan-report.md
```

### 13. Risk Assessment

Provide risk level assessment:

```bash
# Calculate risk score
RISK_SCORE=0

# High-risk changes
if [ "$RESOURCES_TO_DESTROY" -gt 0 ]; then
    RISK_SCORE=$((RISK_SCORE + RESOURCES_TO_DESTROY * 3))
fi

if [ "$RESOURCES_TO_REPLACE" -gt 0 ]; then
    RISK_SCORE=$((RISK_SCORE + RESOURCES_TO_REPLACE * 2))
fi

# Security issues
if [ "${TFSEC_CRITICAL:-0}" -gt 0 ]; then
    RISK_SCORE=$((RISK_SCORE + TFSEC_CRITICAL * 5))
fi

if [ "${TFSEC_HIGH:-0}" -gt 0 ]; then
    RISK_SCORE=$((RISK_SCORE + TFSEC_HIGH * 2))
fi

# Determine risk level
if [ $RISK_SCORE -eq 0 ]; then
    RISK_LEVEL="LOW"
elif [ $RISK_SCORE -lt 10 ]; then
    RISK_LEVEL="MEDIUM"
else
    RISK_LEVEL="HIGH"
fi

echo ""
echo "================================"
echo "RISK ASSESSMENT: $RISK_LEVEL"
echo "Risk Score: $RISK_SCORE"
echo "================================"
```

### 14. Output Files Summary

List all generated files:

```bash
echo ""
echo "Generated Files:"
ls -lh tfplan* tfsec* checkov* terrascan* infracost* cost-estimate* security-report.md plan-report.md compliance-checklist.md drift-report.json 2>/dev/null
```

### 15. JSON Output (if --json enabled)

If JSON output is requested, create a consolidated JSON file:

```bash
if [ "$JSON_OUTPUT" = "true" ]; then
    jq -n \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg workspace "$(terraform workspace show)" \
        --argjson add "$RESOURCES_TO_ADD" \
        --argjson change "$RESOURCES_TO_CHANGE" \
        --argjson destroy "$RESOURCES_TO_DESTROY" \
        --argjson replace "$RESOURCES_TO_REPLACE" \
        --arg risk_level "$RISK_LEVEL" \
        --argjson risk_score "$RISK_SCORE" \
        --argjson tfsec_critical "${TFSEC_CRITICAL:-0}" \
        --argjson tfsec_high "${TFSEC_HIGH:-0}" \
        --argjson tfsec_medium "${TFSEC_MEDIUM:-0}" \
        --argjson checkov_passed "${CHECKOV_PASSED:-0}" \
        --argjson checkov_failed "${CHECKOV_FAILED:-0}" \
        --arg monthly_cost "${MONTHLY_COST:-N/A}" \
        --argjson drift_count "${DRIFT_COUNT:-0}" \
        '{
            timestamp: $timestamp,
            workspace: $workspace,
            plan_summary: {
                resources_to_add: $add,
                resources_to_change: $change,
                resources_to_destroy: $destroy,
                resources_to_replace: $replace
            },
            security: {
                tfsec: {
                    critical: $tfsec_critical,
                    high: $tfsec_high,
                    medium: $tfsec_medium
                },
                checkov: {
                    passed: $checkov_passed,
                    failed: $checkov_failed
                }
            },
            cost: {
                monthly_cost: $monthly_cost
            },
            drift: {
                drifted_resources: $drift_count
            },
            risk_assessment: {
                level: $risk_level,
                score: $risk_score
            }
        }' > plan-summary.json

    echo "JSON summary saved to: plan-summary.json"
fi
```

## Error Handling

Handle common errors:

```bash
# Terraform not initialized
if [ ! -d ".terraform" ]; then
    echo "ERROR: Terraform not initialized. Run 'terraform init' first."
    exit 1
fi

# Invalid configuration
# (caught by terraform validate)

# Missing var file
if [ -n "$VAR_FILE" ] && [ ! -f "$VAR_FILE" ]; then
    echo "ERROR: Variable file not found: $VAR_FILE"
    exit 1
fi

# Plan failed
if [ $PLAN_EXIT_CODE -eq 1 ]; then
    echo "ERROR: Terraform plan failed. See output above for details."
    exit 1
fi
```

## Best Practices Applied

- Plan file saved for apply
- Security scanning before apply
- Cost estimation for budget awareness
- Drift detection for state management
- Compliance validation
- Risk assessment for approval workflow
- Comprehensive reporting
- JSON output for CI/CD integration

## User Notification

Provide clear next steps:

```
Plan execution complete!

Summary:
  Resources to Add:     $RESOURCES_TO_ADD
  Resources to Change:  $RESOURCES_TO_CHANGE
  Resources to Destroy: $RESOURCES_TO_DESTROY
  Resources to Replace: $RESOURCES_TO_REPLACE

Risk Level: $RISK_LEVEL

Security Issues:
  Critical: ${TFSEC_CRITICAL:-0}
  High:     ${TFSEC_HIGH:-0}

Monthly Cost: \$${MONTHLY_COST:-N/A}

Reports Generated:
  - plan-report.md (comprehensive summary)
  - tfplan.txt (human-readable plan)
  - security-report.md (security findings)
  - cost-estimate.txt (cost breakdown)
  - compliance-checklist.md (SOC2 compliance)

Next Steps:
1. Review plan-report.md
2. Address any security issues
3. Get approval if risk level is MEDIUM or HIGH
4. Apply changes: terraform apply $PLAN_FILE

To cancel changes, delete: $PLAN_FILE
```

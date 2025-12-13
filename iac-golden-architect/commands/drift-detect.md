---
description: Detect and report infrastructure drift by comparing Terraform state with actual cloud resources, generate drift reports with remediation suggestions, and alert on critical mismatches
argument-hint: --auto-fix --report --alert-on-critical --exclude [resources]
allowed-tools:
  - Bash
  - Write
  - Read
  - Grep
  - Glob
---

# Infrastructure Drift Detection

You are detecting infrastructure drift by comparing Terraform state with actual cloud resources, identifying changes made outside of Terraform, and providing remediation guidance.

## Input Parameters

Parse the user's command arguments:
- `--auto-fix`: Automatically update Terraform to match reality (use with caution)
- `--report`: Generate detailed drift report
- `--alert-on-critical`: Alert if critical resources have drifted
- `--exclude`: Comma-separated resources to exclude from drift check
- `--target`: Check specific resource(s) only
- `--refresh-only`: Only refresh state, don't detect drift
- `--show-diff`: Show detailed diff of changes
- `--format`: Output format (text, json, markdown, html)
- `--remediation`: Generate remediation plan
- `--notify`: Notification method (slack, email, none)

## Execution Steps

### 1. Pre-Flight Checks

Verify environment is ready for drift detection:

```bash
echo "Infrastructure Drift Detection"
echo "========================================"
echo "Timestamp: $(date)"
echo "Directory: $(pwd)"
echo ""

# Verify Terraform is initialized
if [ ! -d ".terraform" ]; then
    echo "ERROR: Terraform not initialized. Run 'terraform init' first."
    exit 1
fi

# Check Terraform version
TF_VERSION=$(terraform version -json | jq -r '.terraform_version')
echo "Terraform Version: $TF_VERSION"

# Show current workspace
WORKSPACE=$(terraform workspace show)
echo "Workspace: $WORKSPACE"
echo ""

# Warn if in production
if [[ "$WORKSPACE" == "prod" ]] || [[ "$WORKSPACE" == "production" ]]; then
    echo "⚠️  WARNING: Checking drift in PRODUCTION workspace"
    echo "⚠️  Exercise caution with auto-fix in production"
    echo ""
fi

# Check if state file exists
if ! terraform state pull > /dev/null 2>&1; then
    echo "ERROR: Unable to access Terraform state"
    echo "Verify backend configuration and credentials"
    exit 1
fi

# Get state statistics
STATE_RESOURCES=$(terraform state list | wc -l)
echo "Resources in state: $STATE_RESOURCES"
echo ""
```

### 2. Backup Current State

Create backup before drift detection:

```bash
echo "Backing up current state..."

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=".terraform/drift-detection"
mkdir -p "$BACKUP_DIR"

# Pull and save current state
terraform state pull > "$BACKUP_DIR/state-before-drift-check-${TIMESTAMP}.json"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(wc -c < "$BACKUP_DIR/state-before-drift-check-${TIMESTAMP}.json")
    echo "✓ State backed up: $BACKUP_DIR/state-before-drift-check-${TIMESTAMP}.json"
    echo "  Size: $BACKUP_SIZE bytes"
else
    echo "ERROR: Failed to backup state"
    exit 1
fi

echo ""
```

### 3. Refresh State

Refresh Terraform state to sync with actual infrastructure:

```bash
echo "Refreshing Terraform state..."
echo "This queries cloud providers for actual resource state"
echo ""

# Build refresh command
REFRESH_CMD="terraform plan -refresh-only -detailed-exitcode"

# Add target if specified
if [ -n "$TARGET" ]; then
    for target in $(echo $TARGET | tr ',' ' '); do
        REFRESH_CMD="$REFRESH_CMD -target=$target"
    done
fi

# Save refresh output
REFRESH_OUTPUT="$BACKUP_DIR/refresh-${TIMESTAMP}.txt"
REFRESH_JSON="$BACKUP_DIR/refresh-${TIMESTAMP}.json"

echo "Command: $REFRESH_CMD"
echo ""

# Execute refresh plan
eval $REFRESH_CMD > "$REFRESH_OUTPUT" 2>&1
REFRESH_EXIT_CODE=$?

# Also get JSON output
terraform plan -refresh-only -out="$BACKUP_DIR/refresh-${TIMESTAMP}.tfplan" > /dev/null 2>&1
terraform show -json "$BACKUP_DIR/refresh-${TIMESTAMP}.tfplan" > "$REFRESH_JSON" 2>&1

echo ""
echo "Refresh completed with exit code: $REFRESH_EXIT_CODE"
echo ""

# Interpret exit code
# 0 = no changes, 1 = error, 2 = changes detected (drift)
case $REFRESH_EXIT_CODE in
    0)
        echo "✓ No drift detected. Infrastructure matches Terraform state."
        DRIFT_STATUS="NO_DRIFT"
        ;;
    1)
        echo "✗ Error during refresh. Check output for details."
        cat "$REFRESH_OUTPUT"
        exit 1
        ;;
    2)
        echo "⚠️  DRIFT DETECTED! Infrastructure has changed outside of Terraform."
        DRIFT_STATUS="DRIFT_DETECTED"
        ;;
esac

echo ""
```

### 4. Analyze Drift

If drift detected, analyze the changes:

```bash
if [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ]; then
    echo "Analyzing drift..."
    echo "========================================"

    # Parse the JSON plan to extract drift details
    if [ -f "$REFRESH_JSON" ]; then
        # Count drifted resources
        DRIFTED_COUNT=$(jq '[.resource_changes[]? | select(.change.actions[] | contains("update") or contains("delete") or contains("create"))] | length' "$REFRESH_JSON")

        echo "Drifted Resources: $DRIFTED_COUNT"
        echo ""

        # Categorize by action type
        UPDATED=$(jq '[.resource_changes[]? | select(.change.actions[] == "update")] | length' "$REFRESH_JSON")
        DELETED=$(jq '[.resource_changes[]? | select(.change.actions[] == "delete")] | length' "$REFRESH_JSON")
        CREATED=$(jq '[.resource_changes[]? | select(.change.actions[] == "create")] | length' "$REFRESH_JSON")

        echo "Drift Summary:"
        echo "  Resources Updated Outside TF: $UPDATED"
        echo "  Resources Deleted Outside TF: $DELETED"
        echo "  Orphaned Resources in State:  $CREATED"
        echo ""

        # List drifted resources
        echo "Drifted Resources:"
        echo "----------------------------------------"

        # Updated resources
        if [ "$UPDATED" -gt 0 ]; then
            echo ""
            echo "MODIFIED (updated outside Terraform):"
            jq -r '.resource_changes[]? | select(.change.actions[] == "update") | "  • \(.type).\(.name)"' "$REFRESH_JSON"
        fi

        # Deleted resources
        if [ "$DELETED" -gt 0 ]; then
            echo ""
            echo "DELETED (removed outside Terraform):"
            jq -r '.resource_changes[]? | select(.change.actions[] == "delete") | "  • \(.type).\(.name)"' "$REFRESH_JSON"
        fi

        # Created (orphaned in state)
        if [ "$CREATED" -gt 0 ]; then
            echo ""
            echo "ORPHANED (exist in state but not in cloud):"
            jq -r '.resource_changes[]? | select(.change.actions[] == "create") | "  • \(.type).\(.name)"' "$REFRESH_JSON"
        fi

        echo ""
        echo "----------------------------------------"
    fi
fi
```

### 5. Generate Detailed Drift Report

Create comprehensive drift report:

```bash
if [ "$REPORT" = "true" ] || [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ]; then
    echo "Generating drift report..."

    REPORT_DIR="$BACKUP_DIR/reports"
    mkdir -p "$REPORT_DIR"

    # Markdown report
    cat > "$REPORT_DIR/drift-report-${TIMESTAMP}.md" <<EOF
# Infrastructure Drift Report
**Generated:** $(date)
**Workspace:** $WORKSPACE
**Status:** $DRIFT_STATUS

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Resources in State | $STATE_RESOURCES |
| Drifted Resources | ${DRIFTED_COUNT:-0} |
| Modified Outside Terraform | ${UPDATED:-0} |
| Deleted Outside Terraform | ${DELETED:-0} |
| Orphaned in State | ${CREATED:-0} |

## Drift Status

EOF

    if [ "$DRIFT_STATUS" = "NO_DRIFT" ]; then
        cat >> "$REPORT_DIR/drift-report-${TIMESTAMP}.md" <<EOF
✓ **No Drift Detected**

All infrastructure resources match the Terraform state. No changes have been made outside of Terraform.

EOF
    else
        cat >> "$REPORT_DIR/drift-report-${TIMESTAMP}.md" <<EOF
⚠️ **Drift Detected**

Infrastructure resources have been modified outside of Terraform control. See details below.

## Detailed Findings

EOF

        # Extract detailed changes for each drifted resource
        if [ -f "$REFRESH_JSON" ]; then
            jq -r '.resource_changes[]? | select(.change.actions[] | contains("update") or contains("delete")) | "### \(.type).\(.name)\n\n**Action:** \(.change.actions | join(", "))\n\n**Address:** \(.address)\n"' "$REFRESH_JSON" >> "$REPORT_DIR/drift-report-${TIMESTAMP}.md"
        fi

        # Add remediation section
        cat >> "$REPORT_DIR/drift-report-${TIMESTAMP}.md" <<EOF

## Remediation Options

### Option 1: Update Terraform to Match Reality
If the manual changes are desired, update Terraform configuration and state:

\`\`\`bash
# Review changes
terraform plan -refresh-only

# Accept changes into state
terraform apply -refresh-only -auto-approve
\`\`\`

### Option 2: Revert Infrastructure to Terraform State
If the manual changes should be reverted:

\`\`\`bash
# Review plan
terraform plan

# Apply to revert changes
terraform apply
\`\`\`

### Option 3: Import New Resources
If resources were created outside Terraform:

\`\`\`bash
# Import each resource
terraform import <resource_type>.<resource_name> <resource_id>
\`\`\`

### Option 4: Remove Orphaned Resources
If resources were deleted but remain in state:

\`\`\`bash
# Remove from state
terraform state rm <resource_address>
\`\`\`

## Root Cause Analysis

Possible causes of drift:
- Manual changes via cloud console/CLI
- Changes by other automation tools
- Auto-scaling or auto-remediation
- CloudFormation/ARM template updates
- Disaster recovery procedures
- Security incident response

## Prevention Recommendations

1. **Implement Policy-as-Code** - Use Sentinel or OPA to prevent manual changes
2. **Enable Cloud Governance** - Use AWS Config, Azure Policy, or GCP Organization Policies
3. **Audit Logging** - Review CloudTrail/Activity Logs for change sources
4. **RBAC Controls** - Limit who can make manual changes
5. **Automated Drift Detection** - Run this check in CI/CD pipeline
6. **Notification Alerts** - Set up alerts for out-of-band changes

EOF
    fi

    # Add detailed diff if requested
    if [ "$SHOW_DIFF" = "true" ] && [ -f "$REFRESH_JSON" ]; then
        cat >> "$REPORT_DIR/drift-report-${TIMESTAMP}.md" <<EOF
## Detailed Resource Changes

\`\`\`json
$(jq '.resource_changes[]? | select(.change.actions[] | contains("update"))' "$REFRESH_JSON")
\`\`\`

EOF
    fi

    # Close report
    cat >> "$REPORT_DIR/drift-report-${TIMESTAMP}.md" <<EOF
---
**Report Generated:** $(date)
**Terraform Version:** $TF_VERSION
**Workspace:** $WORKSPACE
EOF

    echo "✓ Drift report saved to: $REPORT_DIR/drift-report-${TIMESTAMP}.md"
    echo ""

    # Also generate JSON report
    jq -n \
        --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg workspace "$WORKSPACE" \
        --arg status "$DRIFT_STATUS" \
        --argjson total "$STATE_RESOURCES" \
        --argjson drifted "${DRIFTED_COUNT:-0}" \
        --argjson updated "${UPDATED:-0}" \
        --argjson deleted "${DELETED:-0}" \
        --argjson created "${CREATED:-0}" \
        '{
            timestamp: $timestamp,
            workspace: $workspace,
            status: $status,
            summary: {
                total_resources: $total,
                drifted_resources: $drifted,
                modified: $updated,
                deleted: $deleted,
                orphaned: $created
            }
        }' > "$REPORT_DIR/drift-report-${TIMESTAMP}.json"

    echo "✓ JSON report saved to: $REPORT_DIR/drift-report-${TIMESTAMP}.json"
    echo ""
fi
```

### 6. Identify Critical Drift

Flag critical resources that have drifted:

```bash
if [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ] && [ "$ALERT_ON_CRITICAL" = "true" ]; then
    echo "Checking for critical resource drift..."

    # Define critical resource patterns
    CRITICAL_PATTERNS=(
        "aws_security_group"
        "aws_iam"
        "aws_kms"
        "azurerm_key_vault"
        "azurerm_network_security_group"
        "google_compute_firewall"
        "google_kms"
    )

    CRITICAL_DRIFT=()

    # Check if any drifted resources match critical patterns
    for pattern in "${CRITICAL_PATTERNS[@]}"; do
        MATCHES=$(jq -r ".resource_changes[]? | select(.change.actions[] | contains(\"update\") or contains(\"delete\")) | select(.type | contains(\"$pattern\")) | .address" "$REFRESH_JSON" 2>/dev/null)

        if [ -n "$MATCHES" ]; then
            while IFS= read -r match; do
                CRITICAL_DRIFT+=("$match")
            done <<< "$MATCHES"
        fi
    done

    if [ ${#CRITICAL_DRIFT[@]} -gt 0 ]; then
        echo ""
        echo "⚠️⚠️⚠️  CRITICAL DRIFT DETECTED  ⚠️⚠️⚠️"
        echo "========================================"
        echo ""
        echo "The following CRITICAL resources have drifted:"
        echo ""

        for resource in "${CRITICAL_DRIFT[@]}"; do
            echo "  🔴 $resource"
        done

        echo ""
        echo "These resources affect security, access control, or encryption."
        echo "Immediate investigation recommended!"
        echo ""

        # Save critical drift list
        printf '%s\n' "${CRITICAL_DRIFT[@]}" > "$BACKUP_DIR/critical-drift-${TIMESTAMP}.txt"

        CRITICAL_ALERT=true
    else
        echo "✓ No critical resources have drifted"
        CRITICAL_ALERT=false
    fi

    echo ""
fi
```

### 7. Generate Remediation Plan

Create specific remediation commands:

```bash
if [ "$REMEDIATION" = "true" ] && [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ]; then
    echo "Generating remediation plan..."

    cat > "$REPORT_DIR/remediation-plan-${TIMESTAMP}.sh" <<'EOF'
#!/bin/bash
# Drift Remediation Plan
# Generated: $(date)
# Workspace: $WORKSPACE

set -e

echo "Drift Remediation Plan"
echo "======================"
echo ""
echo "This script provides remediation options for detected drift."
echo "Review carefully before executing any commands."
echo ""

EOF

    # For each drifted resource, suggest remediation
    if [ -f "$REFRESH_JSON" ]; then
        jq -r '.resource_changes[]? | select(.change.actions[] | contains("update") or contains("delete")) | "\(.address)|\(.change.actions | join(","))"' "$REFRESH_JSON" | while IFS='|' read -r address actions; do
            cat >> "$REPORT_DIR/remediation-plan-${TIMESTAMP}.sh" <<EOF

# Resource: $address
# Action: $actions
echo "Remediating: $address"

EOF

            if [[ "$actions" == *"delete"* ]]; then
                # Resource deleted outside TF - remove from state
                cat >> "$REPORT_DIR/remediation-plan-${TIMESTAMP}.sh" <<EOF
# Option 1: Remove from state (resource was deleted)
# terraform state rm '$address'

# Option 2: Recreate resource
# terraform apply -target='$address'

EOF
            elif [[ "$actions" == *"update"* ]]; then
                # Resource modified outside TF
                cat >> "$REPORT_DIR/remediation-plan-${TIMESTAMP}.sh" <<EOF
# Option 1: Accept changes into state
# terraform apply -refresh-only -target='$address' -auto-approve

# Option 2: Revert to Terraform configuration
# terraform apply -target='$address'

# Option 3: Update Terraform config to match reality
# (Manual: Update .tf files, then run terraform plan)

EOF
            fi
        done
    fi

    cat >> "$REPORT_DIR/remediation-plan-${TIMESTAMP}.sh" <<EOF

echo ""
echo "Remediation plan complete"
EOF

    chmod +x "$REPORT_DIR/remediation-plan-${TIMESTAMP}.sh"

    echo "✓ Remediation plan saved to: $REPORT_DIR/remediation-plan-${TIMESTAMP}.sh"
    echo ""
    echo "Review and uncomment desired remediation actions, then execute:"
    echo "  bash $REPORT_DIR/remediation-plan-${TIMESTAMP}.sh"
    echo ""
fi
```

### 8. Auto-Fix (If Enabled)

Automatically accept drift into state:

```bash
if [ "$AUTO_FIX" = "true" ] && [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ]; then
    echo "⚠️  AUTO-FIX ENABLED"
    echo "========================================"
    echo ""
    echo "This will update Terraform state to match current infrastructure."
    echo "Changes made outside Terraform will be accepted into state."
    echo ""

    # Extra confirmation for production
    if [[ "$WORKSPACE" == "prod" ]] || [[ "$WORKSPACE" == "production" ]]; then
        echo "⚠️⚠️⚠️  PRODUCTION WORKSPACE  ⚠️⚠️⚠️"
        echo ""
        read -p "Type 'ACCEPT-DRIFT' to confirm auto-fix in production: " CONFIRM

        if [ "$CONFIRM" != "ACCEPT-DRIFT" ]; then
            echo "Auto-fix cancelled"
            exit 0
        fi
    fi

    # Show what will be accepted
    echo "Changes to be accepted into state:"
    terraform plan -refresh-only

    echo ""
    read -p "Proceed with auto-fix? (yes/no): " PROCEED

    if [ "$PROCEED" = "yes" ]; then
        echo "Applying refresh to accept drift..."

        terraform apply -refresh-only -auto-approve > "$BACKUP_DIR/auto-fix-${TIMESTAMP}.log" 2>&1

        if [ $? -eq 0 ]; then
            echo "✓ Drift accepted into state"
            echo "  Log: $BACKUP_DIR/auto-fix-${TIMESTAMP}.log"

            # Verify no drift remains
            echo ""
            echo "Verifying drift resolution..."
            terraform plan -refresh-only -detailed-exitcode > /dev/null 2>&1

            if [ $? -eq 0 ]; then
                echo "✓ No drift remains after auto-fix"
            else
                echo "⚠️  WARNING: Some drift still detected after auto-fix"
            fi
        else
            echo "✗ Auto-fix failed. See log for details."
            cat "$BACKUP_DIR/auto-fix-${TIMESTAMP}.log"
            exit 1
        fi
    else
        echo "Auto-fix cancelled"
    fi

    echo ""
fi
```

### 9. Send Notifications

Send alerts if configured:

```bash
if [ "$NOTIFY" = "slack" ] && [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ]; then
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        echo "Sending Slack notification..."

        # Determine color based on critical drift
        if [ "$CRITICAL_ALERT" = "true" ]; then
            COLOR="danger"
            EMOJI="🔴"
        else
            COLOR="warning"
            EMOJI="⚠️"
        fi

        # Send notification
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$COLOR\",
                    \"title\": \"$EMOJI Infrastructure Drift Detected\",
                    \"fields\": [
                        {
                            \"title\": \"Workspace\",
                            \"value\": \"$WORKSPACE\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Drifted Resources\",
                            \"value\": \"${DRIFTED_COUNT:-0}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Modified\",
                            \"value\": \"${UPDATED:-0}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Deleted\",
                            \"value\": \"${DELETED:-0}\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Critical Drift\",
                            \"value\": \"$([ "$CRITICAL_ALERT" = "true" ] && echo "YES ⚠️" || echo "No")\",
                            \"short\": true
                        },
                        {
                            \"title\": \"Report\",
                            \"value\": \"See drift-report-${TIMESTAMP}.md\",
                            \"short\": true
                        }
                    ],
                    \"footer\": \"Terraform Drift Detection\",
                    \"ts\": $(date +%s)
                }]
            }" \
            2>/dev/null || echo "Failed to send Slack notification"

        echo "✓ Slack notification sent"
    else
        echo "⚠️  Slack webhook URL not configured (SLACK_WEBHOOK_URL)"
    fi

    echo ""
fi
```

### 10. Create Audit Trail

Generate audit log for drift detection:

```bash
# Append to drift audit log
AUDIT_LOG="$BACKUP_DIR/drift-audit.log"

cat >> "$AUDIT_LOG" <<EOF
[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Drift Detection Run
  Workspace: $WORKSPACE
  Status: $DRIFT_STATUS
  Total Resources: $STATE_RESOURCES
  Drifted Resources: ${DRIFTED_COUNT:-0}
  Modified: ${UPDATED:-0}
  Deleted: ${DELETED:-0}
  Orphaned: ${CREATED:-0}
  Critical Alert: ${CRITICAL_ALERT:-false}
  Auto-Fix: ${AUTO_FIX:-false}
  Report: $REPORT_DIR/drift-report-${TIMESTAMP}.md
  User: ${USER:-unknown}
  Hostname: ${HOSTNAME:-unknown}
---
EOF

echo "✓ Audit trail updated: $AUDIT_LOG"
echo ""
```

### 11. Final Summary

Display comprehensive summary:

```bash
echo "========================================"
echo "DRIFT DETECTION COMPLETE"
echo "========================================"
echo ""
echo "Status: $DRIFT_STATUS"
echo "Workspace: $WORKSPACE"
echo "Timestamp: $(date)"
echo ""

if [ "$DRIFT_STATUS" = "NO_DRIFT" ]; then
    echo "✓ No drift detected"
    echo "  All $STATE_RESOURCES resources match Terraform state"
else
    echo "⚠️  Drift detected in ${DRIFTED_COUNT:-0} resources"
    echo ""
    echo "Drift Summary:"
    echo "  Modified Outside TF: ${UPDATED:-0}"
    echo "  Deleted Outside TF:  ${DELETED:-0}"
    echo "  Orphaned in State:   ${CREATED:-0}"
    echo ""

    if [ "$CRITICAL_ALERT" = "true" ]; then
        echo "🔴 CRITICAL RESOURCES AFFECTED: ${#CRITICAL_DRIFT[@]}"
        echo ""
    fi

    echo "Reports Generated:"
    ls -lh "$REPORT_DIR"/drift-report-${TIMESTAMP}.* 2>/dev/null | awk '{print "  " $9}'
    echo ""

    echo "Next Steps:"
    echo "  1. Review drift report: $REPORT_DIR/drift-report-${TIMESTAMP}.md"

    if [ "$REMEDIATION" = "true" ]; then
        echo "  2. Execute remediation: $REPORT_DIR/remediation-plan-${TIMESTAMP}.sh"
    else
        echo "  2. Generate remediation plan: --remediation"
    fi

    echo "  3. Investigate root cause (check CloudTrail/Activity Logs)"
    echo "  4. Update processes to prevent future drift"
    echo ""

    if [ "$CRITICAL_ALERT" = "true" ]; then
        echo "⚠️⚠️⚠️  IMMEDIATE ACTION REQUIRED  ⚠️⚠️⚠️"
        echo "Critical security/access resources have drifted!"
        echo ""
    fi
fi

echo "Backup: $BACKUP_DIR/state-before-drift-check-${TIMESTAMP}.json"
echo "Audit Log: $AUDIT_LOG"
echo ""
echo "========================================"

# Exit code
if [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ] && [ "$CRITICAL_ALERT" = "true" ]; then
    # Critical drift - exit 2
    exit 2
elif [ "$DRIFT_STATUS" = "DRIFT_DETECTED" ]; then
    # Non-critical drift - exit 1
    exit 1
else
    # No drift - exit 0
    exit 0
fi
```

## Error Handling

```bash
# Terraform not initialized
# (handled in pre-flight)

# State access failure
# (handled in pre-flight)

# Refresh failure
# (handled in refresh step)

# Missing cloud credentials
if [[ "$ERROR_MSG" == *"credentials"* ]] || [[ "$ERROR_MSG" == *"authentication"* ]]; then
    echo "ERROR: Cloud provider authentication failed"
    echo ""
    echo "Verify credentials are configured:"
    echo "  AWS: aws configure or AWS_* env vars"
    echo "  Azure: az login or ARM_* env vars"
    echo "  GCP: gcloud auth login or GOOGLE_* env vars"
    exit 1
fi
```

## Best Practices Applied

- State backup before operations
- Detailed drift categorization
- Critical resource identification
- Remediation plan generation
- Audit trail for compliance
- Notification integration
- Auto-fix with safeguards
- Production workspace protection
- Root cause analysis guidance
- Prevention recommendations

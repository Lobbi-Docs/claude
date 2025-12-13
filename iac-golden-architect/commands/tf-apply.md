---
description: Safe Terraform apply with comprehensive safeguards, state backup, verification, and rollback preparation
argument-hint: --auto-approve --target [resource] --plan-file [path]
allowed-tools:
  - Bash
  - Read
  - Write
  - Grep
  - Glob
---

# Safe Terraform Apply with Safeguards

You are executing a Terraform apply operation with enterprise-grade safety controls, including pre-apply validation, state backup, post-apply verification, and rollback preparation.

## Input Parameters

Parse the user's command arguments:
- `--auto-approve`: Skip interactive approval (use with caution)
- `--target`: Target specific resource (optional)
- `--plan-file`: Use existing plan file (recommended)
- `--var-file`: Path to tfvars file (if not using plan file)
- `--backup-state`: Backup state before apply (default: true)
- `--skip-validation`: Skip pre-apply validation (not recommended)
- `--parallelism`: Set parallelism level (default: 10)

## Execution Steps

### 1. Pre-Apply Safety Checks

Verify the environment is safe for apply:

```bash
# Check current directory
pwd
echo "Working Directory: $(pwd)"

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
echo "Current Workspace: $WORKSPACE"

# Warn if in production workspace
if [[ "$WORKSPACE" == "prod" ]] || [[ "$WORKSPACE" == "production" ]]; then
    echo "⚠️  WARNING: You are in PRODUCTION workspace!"
    echo "⚠️  Extra caution required. Consider requiring approval."

    if [ "$AUTO_APPROVE" = "true" ]; then
        echo "ERROR: Auto-approve is not allowed in production workspace."
        echo "Remove --auto-approve flag or switch to a different workspace."
        exit 1
    fi
fi
```

### 2. Validate Configuration (unless --skip-validation)

Run validation checks:

```bash
if [ "$SKIP_VALIDATION" != "true" ]; then
    echo "Running pre-apply validation..."

    # Format check
    echo "Checking format..."
    terraform fmt -check -recursive

    if [ $? -ne 0 ]; then
        echo "WARNING: Code is not properly formatted. Run 'terraform fmt -recursive' to fix."
        read -p "Continue anyway? (yes/no): " CONTINUE
        if [ "$CONTINUE" != "yes" ]; then
            exit 1
        fi
    fi

    # Validation
    echo "Validating configuration..."
    terraform validate

    if [ $? -ne 0 ]; then
        echo "ERROR: Configuration validation failed. Fix errors before applying."
        exit 1
    fi

    echo "✓ Validation passed"
else
    echo "⚠️  Skipping validation (not recommended)"
fi
```

### 3. Backup Current State

Create backup of current state before making changes:

```bash
if [ "$BACKUP_STATE" != "false" ]; then
    echo "Backing up current state..."

    # Create backup directory
    BACKUP_DIR=".terraform/backups"
    mkdir -p "$BACKUP_DIR"

    # Generate backup filename with timestamp
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/terraform-${WORKSPACE}-${TIMESTAMP}.tfstate"

    # Pull current state
    terraform state pull > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        echo "✓ State backed up to: $BACKUP_FILE"

        # Also create a copy with "latest" name for easy reference
        cp "$BACKUP_FILE" "$BACKUP_DIR/terraform-${WORKSPACE}-latest.tfstate"

        # Verify backup
        BACKUP_SIZE=$(wc -c < "$BACKUP_FILE")
        if [ "$BACKUP_SIZE" -lt 10 ]; then
            echo "ERROR: Backup file is suspiciously small. Aborting for safety."
            exit 1
        fi
    else
        echo "ERROR: Failed to backup state. Aborting for safety."
        exit 1
    fi

    # Keep only last 10 backups
    ls -t "$BACKUP_DIR"/terraform-${WORKSPACE}-*.tfstate | tail -n +11 | xargs rm -f 2>/dev/null

    echo "Backup location: $BACKUP_FILE"
else
    echo "⚠️  State backup disabled (not recommended)"
fi
```

### 4. Review Plan (if plan file exists)

If using a plan file, show summary:

```bash
if [ -n "$PLAN_FILE" ]; then
    if [ ! -f "$PLAN_FILE" ]; then
        echo "ERROR: Plan file not found: $PLAN_FILE"
        echo "Generate a plan first: terraform plan -out=$PLAN_FILE"
        exit 1
    fi

    echo "Using plan file: $PLAN_FILE"
    echo ""
    echo "Plan Summary:"
    echo "============================================"

    # Show plan summary
    terraform show "$PLAN_FILE" | head -50

    # Extract change counts
    terraform show -json "$PLAN_FILE" > /tmp/tfplan-review.json

    ADD_COUNT=$(jq '[.resource_changes[]? | select(.change.actions[] == "create")] | length' /tmp/tfplan-review.json)
    CHANGE_COUNT=$(jq '[.resource_changes[]? | select(.change.actions[] == "update")] | length' /tmp/tfplan-review.json)
    DESTROY_COUNT=$(jq '[.resource_changes[]? | select(.change.actions[] == "delete")] | length' /tmp/tfplan-review.json)
    REPLACE_COUNT=$(jq '[.resource_changes[]? | select(.change.actions | length > 1)] | length' /tmp/tfplan-review.json)

    echo ""
    echo "Change Summary:"
    echo "  Resources to Add:     $ADD_COUNT"
    echo "  Resources to Change:  $CHANGE_COUNT"
    echo "  Resources to Destroy: $DESTROY_COUNT"
    echo "  Resources to Replace: $REPLACE_COUNT"
    echo "============================================"

    # Warning for destructive changes
    if [ "$DESTROY_COUNT" -gt 0 ] || [ "$REPLACE_COUNT" -gt 0 ]; then
        echo ""
        echo "⚠️  WARNING: DESTRUCTIVE CHANGES DETECTED!"
        echo ""

        if [ "$DESTROY_COUNT" -gt 0 ]; then
            echo "Resources to be DESTROYED:"
            jq -r '.resource_changes[]? | select(.change.actions[] == "delete") | "  - \(.type).\(.name)"' /tmp/tfplan-review.json
        fi

        if [ "$REPLACE_COUNT" -gt 0 ]; then
            echo ""
            echo "Resources to be REPLACED (destroy + create):"
            jq -r '.resource_changes[]? | select(.change.actions | length > 1) | "  - \(.type).\(.name)"' /tmp/tfplan-review.json
        fi

        echo ""
    fi
else
    # No plan file - need to generate plan now
    echo "No plan file provided. Generating plan..."

    PLAN_CMD="terraform plan"

    if [ -n "$VAR_FILE" ]; then
        PLAN_CMD="$PLAN_CMD -var-file=$VAR_FILE"
    fi

    if [ -n "$TARGET" ]; then
        PLAN_CMD="$PLAN_CMD -target=$TARGET"
    fi

    PLAN_CMD="$PLAN_CMD -out=tfplan-temp"

    echo "Running: $PLAN_CMD"
    eval $PLAN_CMD

    if [ $? -ne 0 ]; then
        echo "ERROR: Plan generation failed. Cannot proceed with apply."
        exit 1
    fi

    PLAN_FILE="tfplan-temp"
fi
```

### 5. Final Approval Gate (if not --auto-approve)

If auto-approve is not enabled, require explicit confirmation:

```bash
if [ "$AUTO_APPROVE" != "true" ]; then
    echo ""
    echo "============================================"
    echo "FINAL APPROVAL REQUIRED"
    echo "============================================"
    echo ""
    echo "Workspace: $WORKSPACE"
    echo "Plan File: $PLAN_FILE"
    echo ""
    echo "Changes:"
    echo "  Add:     $ADD_COUNT"
    echo "  Change:  $CHANGE_COUNT"
    echo "  Destroy: $DESTROY_COUNT"
    echo "  Replace: $REPLACE_COUNT"
    echo ""

    # Require explicit "yes" for destructive changes
    if [ "$DESTROY_COUNT" -gt 0 ] || [ "$REPLACE_COUNT" -gt 0 ]; then
        echo "⚠️  This will DESTROY or REPLACE resources!"
        echo ""
        read -p "Type 'yes' to confirm and proceed: " CONFIRM

        if [ "$CONFIRM" != "yes" ]; then
            echo "Apply cancelled by user."
            exit 0
        fi
    else
        # Simple confirmation for non-destructive changes
        read -p "Proceed with apply? (yes/no): " CONFIRM

        if [ "$CONFIRM" != "yes" ]; then
            echo "Apply cancelled by user."
            exit 0
        fi
    fi
else
    echo "⚠️  Auto-approve enabled. Skipping manual confirmation."
fi
```

### 6. Execute Apply

Run the terraform apply:

```bash
echo ""
echo "Executing terraform apply..."
echo "Start time: $(date)"
echo ""

# Construct apply command
APPLY_CMD="terraform apply"

# Use plan file if available
if [ -n "$PLAN_FILE" ]; then
    APPLY_CMD="$APPLY_CMD $PLAN_FILE"
else
    # Add var file if specified
    if [ -n "$VAR_FILE" ]; then
        APPLY_CMD="$APPLY_CMD -var-file=$VAR_FILE"
    fi

    # Add target if specified
    if [ -n "$TARGET" ]; then
        APPLY_CMD="$APPLY_CMD -target=$TARGET"
    fi

    # Add auto-approve if enabled and no plan file
    if [ "$AUTO_APPROVE" = "true" ]; then
        APPLY_CMD="$APPLY_CMD -auto-approve"
    fi
fi

# Add parallelism
PARALLELISM=${PARALLELISM:-10}
APPLY_CMD="$APPLY_CMD -parallelism=$PARALLELISM"

# Save apply output
APPLY_LOG="apply-${TIMESTAMP}.log"
echo "Apply command: $APPLY_CMD"
echo "Logging to: $APPLY_LOG"
echo ""

# Execute apply and capture output
eval $APPLY_CMD 2>&1 | tee "$APPLY_LOG"

APPLY_EXIT_CODE=${PIPESTATUS[0]}
echo ""
echo "End time: $(date)"
echo ""
```

### 7. Check Apply Result

Verify the apply succeeded:

```bash
if [ $APPLY_EXIT_CODE -eq 0 ]; then
    echo "✓ Apply completed successfully!"
else
    echo "✗ Apply FAILED with exit code: $APPLY_EXIT_CODE"
    echo ""
    echo "Logs saved to: $APPLY_LOG"
    echo "State backup available at: $BACKUP_FILE"
    echo ""
    echo "To rollback, you can:"
    echo "  1. Review the error in $APPLY_LOG"
    echo "  2. Fix the issue in your Terraform code"
    echo "  3. If needed, restore state: terraform state push $BACKUP_FILE"
    echo ""
    exit $APPLY_EXIT_CODE
fi
```

### 8. Post-Apply Verification

Verify the infrastructure state after apply:

```bash
echo "Running post-apply verification..."
echo ""

# Refresh state
echo "Refreshing state..."
terraform refresh > /dev/null 2>&1

# Show outputs
echo "Terraform Outputs:"
echo "============================================"
terraform output
echo "============================================"
echo ""

# Verify no drift
echo "Checking for immediate drift..."
terraform plan -detailed-exitcode > /dev/null 2>&1
DRIFT_CHECK=$?

if [ $DRIFT_CHECK -eq 0 ]; then
    echo "✓ No drift detected. Infrastructure matches expected state."
elif [ $DRIFT_CHECK -eq 2 ]; then
    echo "⚠️  WARNING: Drift detected immediately after apply!"
    echo "This may indicate a problem. Running detailed plan..."
    terraform plan
else
    echo "⚠️  WARNING: Error checking for drift."
fi
```

### 9. Resource Inventory

Generate inventory of applied resources:

```bash
echo ""
echo "Generating resource inventory..."

# List all resources in state
terraform state list > "state-inventory-${TIMESTAMP}.txt"

RESOURCE_COUNT=$(wc -l < "state-inventory-${TIMESTAMP}.txt")
echo "Total resources in state: $RESOURCE_COUNT"

# Categorize resources by type
echo ""
echo "Resources by Type:"
echo "============================================"
terraform state list | cut -d. -f1 | sort | uniq -c | sort -rn
echo "============================================"
```

### 10. Security Validation (Post-Apply)

Run security checks on the applied infrastructure:

```bash
echo ""
echo "Running post-apply security validation..."

# Quick security scan
if command -v tfsec &> /dev/null; then
    echo "Running TFSec scan..."
    tfsec . --format default --minimum-severity HIGH --soft-fail
else
    echo "TFSec not installed. Skipping security scan."
fi

# Check for common security issues in state
if command -v jq &> /dev/null; then
    terraform state pull > /tmp/current-state.json

    # Check for unencrypted resources (example)
    echo "Checking for unencrypted storage..."
    # This is cloud-specific and would need to be customized
fi
```

### 11. Generate Apply Report

Create comprehensive report of the apply operation:

```bash
cat > "apply-report-${TIMESTAMP}.md" <<EOF
# Terraform Apply Report

**Timestamp:** $(date)
**Workspace:** $WORKSPACE
**User:** ${USER:-unknown}
**Hostname:** ${HOSTNAME:-unknown}

## Apply Summary

| Metric | Value |
|--------|-------|
| Exit Code | $APPLY_EXIT_CODE |
| Resources Added | $ADD_COUNT |
| Resources Changed | $CHANGE_COUNT |
| Resources Destroyed | $DESTROY_COUNT |
| Resources Replaced | $REPLACE_COUNT |
| Total Resources | $RESOURCE_COUNT |

## State Management

- **Backup Location:** $BACKUP_FILE
- **Backup Size:** $(wc -c < "$BACKUP_FILE") bytes
- **State Version:** $(jq -r '.version' /tmp/current-state.json 2>/dev/null || echo "unknown")

## Post-Apply Verification

- **Drift Check:** $([ $DRIFT_CHECK -eq 0 ] && echo "✓ Passed" || echo "⚠️  Failed")
- **Resource Inventory:** state-inventory-${TIMESTAMP}.txt

## Outputs

\`\`\`
$(terraform output)
\`\`\`

## Apply Log

Full logs available in: $APPLY_LOG

## Next Steps

1. Verify resources in cloud console
2. Run integration tests if available
3. Update documentation if needed
4. Monitor resources for expected behavior

## Rollback Information

If rollback is needed:

\`\`\`bash
# Restore previous state
terraform state push $BACKUP_FILE

# Then apply previous configuration
terraform apply
\`\`\`

EOF

echo "Apply report saved to: apply-report-${TIMESTAMP}.md"
```

### 12. Cleanup Temporary Files

Remove temporary files:

```bash
# Clean up temporary plan file if created
if [ "$PLAN_FILE" = "tfplan-temp" ]; then
    rm -f tfplan-temp
fi

# Clean up temp JSON files
rm -f /tmp/tfplan-review.json /tmp/current-state.json
```

### 13. Update Documentation (if exists)

If there's a terraform.md or infrastructure documentation:

```bash
if [ -f "README.md" ] || [ -f "INFRASTRUCTURE.md" ]; then
    echo ""
    echo "Note: Consider updating documentation with latest changes:"
    echo "  - Update resource inventory"
    echo "  - Document new outputs"
    echo "  - Update architecture diagrams"
fi
```

### 14. Integration Notifications

Send notifications if configured:

```bash
# Check for notification configuration
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    echo "Sending Slack notification..."

    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"Terraform Apply Completed\",
            \"blocks\": [
                {
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Terraform Apply Completed*\n*Workspace:* $WORKSPACE\n*Status:* $([ $APPLY_EXIT_CODE -eq 0 ] && echo '✓ Success' || echo '✗ Failed')\n*Resources Added:* $ADD_COUNT\n*Resources Changed:* $CHANGE_COUNT\n*Resources Destroyed:* $DESTROY_COUNT\"
                    }
                }
            ]
        }" \
        2>/dev/null || echo "Failed to send Slack notification"
fi

# GitHub commit status (if in CI/CD)
if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_SHA" ]; then
    echo "Updating GitHub commit status..."
    # Implementation would go here
fi
```

### 15. Archive Artifacts

Store apply artifacts for audit trail:

```bash
# Create artifacts directory
ARTIFACTS_DIR=".terraform/apply-artifacts/${TIMESTAMP}"
mkdir -p "$ARTIFACTS_DIR"

# Copy all relevant files
cp "$APPLY_LOG" "$ARTIFACTS_DIR/" 2>/dev/null
cp "apply-report-${TIMESTAMP}.md" "$ARTIFACTS_DIR/" 2>/dev/null
cp "state-inventory-${TIMESTAMP}.txt" "$ARTIFACTS_DIR/" 2>/dev/null
cp "$BACKUP_FILE" "$ARTIFACTS_DIR/state-backup.tfstate" 2>/dev/null

echo "Artifacts archived to: $ARTIFACTS_DIR"

# Create index of all apply operations
cat >> ".terraform/apply-artifacts/index.txt" <<EOF
${TIMESTAMP} | ${WORKSPACE} | Exit:${APPLY_EXIT_CODE} | Add:${ADD_COUNT} Change:${CHANGE_COUNT} Destroy:${DESTROY_COUNT}
EOF
```

## Error Handling

Handle specific error scenarios:

```bash
# Handle common errors

# Error: No plan file and no var file
if [ -z "$PLAN_FILE" ] && [ -z "$VAR_FILE" ]; then
    if [ ! -f "terraform.tfvars" ] && [ -z "$(ls *.auto.tfvars 2>/dev/null)" ]; then
        echo "ERROR: No plan file, var file, or auto.tfvars found."
        echo "Either:"
        echo "  1. Generate a plan: terraform plan -out=tfplan"
        echo "  2. Provide a var file: --var-file=path/to/vars.tfvars"
        echo "  3. Create terraform.tfvars or *.auto.tfvars"
        exit 1
    fi
fi

# Error: State is locked
# (Terraform handles this, but we can provide guidance)
# Check apply log for lock errors and provide remediation steps

# Error: Partial apply
if [ $APPLY_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "⚠️  PARTIAL APPLY DETECTED"
    echo ""
    echo "Some resources may have been created/modified before the error occurred."
    echo "Check the state and apply log for details."
    echo ""
    echo "To investigate:"
    echo "  1. Review: $APPLY_LOG"
    echo "  2. Check state: terraform state list"
    echo "  3. Compare with backup: diff <(terraform state pull) $BACKUP_FILE"
    echo ""
fi
```

## Final Summary

Provide comprehensive summary to user:

```bash
echo ""
echo "========================================"
echo "TERRAFORM APPLY COMPLETE"
echo "========================================"
echo ""
echo "Status: $([ $APPLY_EXIT_CODE -eq 0 ] && echo '✓ SUCCESS' || echo '✗ FAILED')"
echo "Workspace: $WORKSPACE"
echo "Duration: [calculated from start/end time]"
echo ""
echo "Resources:"
echo "  Added:    $ADD_COUNT"
echo "  Changed:  $CHANGE_COUNT"
echo "  Destroyed: $DESTROY_COUNT"
echo "  Replaced: $REPLACE_COUNT"
echo "  Total:    $RESOURCE_COUNT"
echo ""
echo "Files Generated:"
echo "  - $APPLY_LOG (apply output)"
echo "  - apply-report-${TIMESTAMP}.md (comprehensive report)"
echo "  - state-inventory-${TIMESTAMP}.txt (resource list)"
echo "  - $BACKUP_FILE (state backup)"
echo ""
echo "State Backup: $BACKUP_FILE"
echo "Artifacts: $ARTIFACTS_DIR"
echo ""

if [ $APPLY_EXIT_CODE -eq 0 ]; then
    echo "Next Steps:"
    echo "  1. Verify resources in cloud console"
    echo "  2. Test deployed infrastructure"
    echo "  3. Update documentation"
    echo "  4. Monitor for any issues"
else
    echo "Troubleshooting:"
    echo "  1. Review error logs: cat $APPLY_LOG"
    echo "  2. Check resource state: terraform state list"
    echo "  3. If needed, rollback: terraform state push $BACKUP_FILE"
    echo "  4. Fix issues and re-apply"
fi

echo ""
echo "========================================"
```

## Best Practices Applied

- ✓ State backup before changes
- ✓ Pre-apply validation
- ✓ Explicit approval for destructive changes
- ✓ Post-apply verification
- ✓ Drift detection
- ✓ Comprehensive logging
- ✓ Artifact archiving
- ✓ Rollback preparation
- ✓ Security validation
- ✓ Audit trail
- ✓ Production workspace protection
- ✓ Resource inventory
- ✓ Error handling and recovery guidance

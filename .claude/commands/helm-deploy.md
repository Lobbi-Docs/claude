---
description: Helm deployment commands - deploy, upgrade, rollback, and manage Helm releases
---

# Helm Deployment

Execute Helm deployment operations. Available operations:

## Usage
```
/helm-deploy <operation> [options]
```

## Operations

### Deployment
- `install` - Install new Helm release
- `upgrade` - Upgrade existing release
- `upgrade-install` - Install or upgrade release

### Release Management
- `status` - Get release status
- `history` - View release history
- `rollback` - Rollback to previous revision
- `uninstall` - Remove release

### Debugging
- `template` - Render templates locally
- `lint` - Lint chart for issues
- `diff` - Show diff before upgrade
- `test` - Run Helm tests

### Values
- `values-get` - Get current release values
- `values-validate` - Validate values file

## Examples

```bash
# Deploy to development
/helm-deploy upgrade-install --env dev --set image.tag=dev-latest

# Deploy to production with dry-run
/helm-deploy upgrade-install --env prod --dry-run

# Rollback to previous version
/helm-deploy rollback --revision 2

# Show what would change
/helm-deploy diff --env staging

# Get release status
/helm-deploy status --env production
```

## Environments
- `dev` - Development (values-dev.yaml)
- `staging` - Staging (values-staging.yaml)
- `prod` - Production (values-prod.yaml)

## Agent Assignment
This command activates the **helm-release-manager** agent for execution.

## Prerequisites
- kubectl configured with cluster access
- Helm 3.x installed
- Chart located at `deployment/helm/alpha-members/`

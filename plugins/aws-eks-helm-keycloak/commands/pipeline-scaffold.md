---
description: Generate Harness pipeline for EKS Helm deployments with Keycloak integration
---

# Pipeline Scaffold

Generate a complete Harness pipeline for deploying to AWS EKS with Helm and Keycloak authentication.

## Usage
```
/eks:pipeline-scaffold <name> [options]
```

## Arguments
- `name` - Pipeline name (required)

## Options
- `--type` - Pipeline type: `build`, `deploy`, `release`, `promote` (default: `deploy`)
- `--strategy` - Deployment strategy: `rolling`, `canary`, `blue-green` (default: `rolling`)
- `--environments` - Comma-separated environments (default: `dev,staging,prod`)
- `--chart` - Helm chart path (default: `charts/<service-name>`)
- `--keycloak` - Enable Keycloak client provisioning (default: `true`)
- `--triggers` - Create triggers: `pr`, `push`, `tag`, `none` (default: `push,tag`)
- `--output` - Output directory (default: `.harness/pipelines`)

## Examples

### Basic Deploy Pipeline
```bash
/eks:pipeline-scaffold api-gateway-deploy
```
Creates rolling deployment pipeline for all environments.

### Canary Production Pipeline
```bash
/eks:pipeline-scaffold api-gateway-prod --type=deploy --strategy=canary --environments=prod
```

### Full Release Pipeline
```bash
/eks:pipeline-scaffold api-gateway-release --type=release --triggers=tag
```
Creates pipeline triggered by release tags with full promotion flow.

### CI Build Pipeline
```bash
/eks:pipeline-scaffold api-gateway-build --type=build --triggers=pr,push
```

## Generated Artifacts

```
.harness/
├── pipelines/
│   └── <name>.yaml           # Main pipeline definition
├── inputsets/
│   ├── <name>-dev.yaml       # Dev environment inputs
│   ├── <name>-staging.yaml   # Staging inputs
│   └── <name>-prod.yaml      # Production inputs
├── services/
│   └── <service>.yaml        # Service definition (if not exists)
└── triggers/
    ├── <name>-push.yaml      # Push trigger (if enabled)
    └── <name>-tag.yaml       # Tag trigger (if enabled)
```

## Pipeline Structure

### Deploy Pipeline
```yaml
Stages:
  1. Validate
     - Helm lint
     - Security scan
     - Values validation
  2. Deploy to Environment
     - Configure Keycloak client
     - Helm deploy with strategy
     - Health verification
  3. Post-Deploy
     - Smoke tests
     - Update deployment dashboard
```

### Release Pipeline
```yaml
Stages:
  1. Build & Test
  2. Deploy Dev
  3. Deploy Staging
  4. Approval Gate
  5. Deploy Production (Canary)
  6. Documentation
```

## Agent Assignment
This command activates the **pipeline-architect** agent for intelligent pipeline design.

## Skills Used
- harness-eks-deployments
- harness-code-integration
- harness-keycloak-auth

## Workflow

1. **Analyze** - Scan codebase for chart structure and existing configs
2. **Design** - Create optimal pipeline based on requirements
3. **Generate** - Output pipeline YAML and supporting files
4. **Validate** - Lint generated files
5. **Register** - Optionally push to Harness via API

## Integration Points
- Reads existing `values-*.yaml` for environment configuration
- Detects Keycloak realm configuration from `keycloak/` directory
- Integrates with existing Harness connectors

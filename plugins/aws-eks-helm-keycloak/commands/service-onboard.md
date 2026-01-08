---
description: Onboard a new microservice to Harness for EKS deployment with Keycloak authentication
---

# Service Onboard

Onboard a new microservice to the EKS + Harness + Keycloak ecosystem with full automation.

## Usage
```
/eks:service-onboard <service-name> [options]
```

## Arguments
- `service-name` - Name of the service to onboard (required)

## Options
- `--chart` - Path to Helm chart (default: `charts/<service-name>`)
- `--repo` - Harness Code repository name (default: current repo)
- `--keycloak-client` - Create Keycloak client (default: `true`)
- `--keycloak-realm` - Keycloak realm (default: from config)
- `--environments` - Environments to configure (default: `dev,staging,prod`)
- `--ecr-repo` - ECR repository name (default: `<service-name>`)
- `--create-ecr` - Create ECR repository if not exists (default: `true`)
- `--pipeline` - Generate deployment pipeline (default: `true`)
- `--dry-run` - Show what would be created without executing

## Examples

### Basic Onboarding
```bash
/eks:service-onboard payment-service
```
Creates everything: Harness service, environments, pipeline, Keycloak client, ECR repo.

### Onboard Without Keycloak
```bash
/eks:service-onboard batch-processor --keycloak-client=false
```

### Onboard with Custom Chart
```bash
/eks:service-onboard api-gateway --chart=./infrastructure/helm/gateway
```

### Dry Run
```bash
/eks:service-onboard user-service --dry-run
```

## What Gets Created

### Harness Resources
```yaml
Service:
  - Name: <service-name>
  - Type: NativeHelm
  - Manifests: From Harness Code repo
  - Artifacts: ECR image

Environments:
  - development (PreProduction)
  - staging (PreProduction)
  - production (Production)

Infrastructure:
  - EKS connector per environment
  - Namespace: <service-name>-<env>

Pipeline:
  - Deploy pipeline with rolling strategy
  - PR trigger for validation
  - Push/tag triggers for deployment
```

### AWS Resources
```yaml
ECR Repository:
  - Name: <service-name>
  - Lifecycle policy: Keep last 30 images
  - Scan on push: Enabled

Secrets Manager:
  - <service-name>/keycloak-client-secret (per env)
```

### Keycloak Resources
```yaml
Client:
  - Client ID: <service-name>-client
  - Protocol: openid-connect
  - Access Type: confidential
  - Service accounts: Enabled

Roles (optional):
  - <service-name>-admin
  - <service-name>-user
```

### Helm Chart Updates
```yaml
values-<env>.yaml:
  - ECR repository configured
  - Keycloak client ID set
  - Environment-specific overrides
```

## Agent Assignment
This command activates the **deployment-strategist** agent for optimal configuration.

## Skills Used
- harness-eks-deployments
- harness-code-integration
- harness-keycloak-auth

## Workflow

1. **Validate Prerequisites**
   - Check Harness connectivity
   - Verify AWS credentials
   - Confirm Keycloak access

2. **Create AWS Resources**
   - Create ECR repository
   - Set up Secrets Manager entries

3. **Configure Keycloak**
   - Create client in realm
   - Generate client secret
   - Store secret in AWS Secrets Manager

4. **Create Harness Service**
   - Define service with Helm manifests
   - Configure artifact source (ECR)
   - Set up environment overrides

5. **Create Harness Environments**
   - Define each environment
   - Configure infrastructure definitions
   - Set up variable overrides

6. **Generate Pipeline**
   - Create deployment pipeline
   - Configure triggers
   - Set up approval gates for production

7. **Update Helm Values**
   - Add service-specific values
   - Configure Keycloak integration
   - Set ECR repository

8. **Verify Setup**
   - Dry-run Helm template
   - Validate Harness configuration
   - Test Keycloak client

## Output Summary
```
✅ SERVICE ONBOARDING COMPLETE

Created:
  - Harness Service: payment-service
  - Harness Environments: dev, staging, prod
  - ECR Repository: 123456789012.dkr.ecr.us-west-2.amazonaws.com/payment-service
  - Keycloak Client: payment-service-client
  - Pipeline: payment-service-deploy
  - Triggers: PR validation, push to main

Files Updated:
  - charts/payment-service/values-dev.yaml
  - charts/payment-service/values-staging.yaml
  - charts/payment-service/values-prod.yaml
  - .harness/pipelines/payment-service-deploy.yaml

Next Steps:
  1. Review generated pipeline
  2. Push changes to trigger first deployment
  3. Verify Keycloak integration in dev
```

## Rollback
If onboarding fails, the command provides rollback instructions:
```bash
# Remove created resources
/eks:service-onboard payment-service --rollback
```

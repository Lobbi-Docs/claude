# Multi-Cloud Deployment Configurations

This directory contains cloud-specific deployment configurations for the Jira Orchestrator plugin.

## Quick Start

### 1. Choose Your Cloud Provider

Select the configuration file that matches your deployment environment:

- **AWS**: `aws-deployment.yml`
- **GCP**: `gcp-deployment.yml`
- **Azure**: `azure-deployment.yml`
- **Custom/Other**: `multi-cloud-template.yml`

### 2. Configure Environment Variables

Set the required environment variables for Jira integration:

```bash
export JIRA_API_TOKEN="your-jira-api-token"
export JIRA_USER_EMAIL="your-email@company.com"
export JIRA_SITE_URL="https://yourcompany.atlassian.net"
```

### 3. Deploy and Track

Use the deployment script to automatically track deployments in Jira:

```bash
# Basic usage (auto-detects cloud provider)
../scripts/deploy-to-jira.sh production

# With explicit parameters
../scripts/deploy-to-jira.sh production --version v1.2.0 --issue PROJ-123
```

## Configuration Files

### `multi-cloud-template.yml`

**Purpose**: Cloud-agnostic base template with all available options

**Use When**:
- Starting a new multi-cloud deployment
- Using a cloud provider not covered by specific configs
- Customizing a hybrid cloud setup
- Learning all available configuration options

**Size**: ~15KB | ~550 lines

**Key Sections**:
- Cloud provider configuration
- Jira integration settings
- Environment mappings
- Service definitions
- Secrets management
- CI/CD integration
- Monitoring and logging
- Rollback configuration
- Advanced features (canary, blue/green, feature flags)

### `aws-deployment.yml`

**Purpose**: AWS-optimized configuration with native service integration

**AWS Services**:
- ECS (Elastic Container Service)
- EKS (Elastic Kubernetes Service)
- Lambda (Serverless)
- CodeDeploy
- CloudWatch
- Parameter Store / Secrets Manager
- SNS (Notifications)
- EventBridge

**Size**: ~17KB | ~700 lines

**Example**:
```bash
export AWS_REGION=us-east-1
export ENVIRONMENT=production
../scripts/deploy-to-jira.sh production --version v1.2.0
```

### `gcp-deployment.yml`

**Purpose**: GCP-optimized configuration with native service integration

**GCP Services**:
- Cloud Run
- GKE (Google Kubernetes Engine)
- Cloud Functions
- Cloud Build
- Cloud Logging/Monitoring (Stackdriver)
- Secret Manager
- Pub/Sub
- Artifact Registry

**Size**: ~20KB | ~750 lines

**Example**:
```bash
export GCP_PROJECT_ID=my-project
export GCP_REGION=us-central1
../scripts/deploy-to-jira.sh staging --version v1.2.0
```

### `azure-deployment.yml`

**Purpose**: Azure-optimized configuration with native service integration

**Azure Services**:
- AKS (Azure Kubernetes Service)
- Container Instances (ACI)
- App Service (Web Apps)
- Azure Functions
- Azure DevOps
- Azure Monitor
- Key Vault
- Service Bus
- Container Registry (ACR)

**Size**: ~21KB | ~800 lines

**Example**:
```bash
export AZURE_SUBSCRIPTION_ID=xxxx-xxxx-xxxx
export AZURE_RESOURCE_GROUP=my-rg
../scripts/deploy-to-jira.sh production --version v1.2.0
```

## Customization Guide

### 1. Copy the Template

```bash
# For a custom cloud setup
cp multi-cloud-template.yml my-custom-deployment.yml

# Or extend an existing cloud config
cp aws-deployment.yml my-aws-custom.yml
```

### 2. Update Core Settings

```yaml
# Set your project information
cloud:
  provider: "aws"  # or gcp, azure, kubernetes
  region: "${AWS_REGION}"

jira:
  host: "${JIRA_SITE_URL}"
  default_project: "PROJ"  # Your Jira project key
```

### 3. Configure Environments

```yaml
jira:
  environments:
    development:
      jira_field: "customfield_10100"  # Update with your field ID
      auto_transition: "In Development"

    production:
      jira_field: "customfield_10102"
      auto_transition: "Released"
      require_approval: true
```

### 4. Define Services

```yaml
services:
  frontend:
    name: "frontend"
    deployment_type: "ecs"  # or cloud_run, aks, app_service

    health_check:
      enabled: true
      endpoint: "/health"
```

### 5. Set Up Secrets

```yaml
secrets:
  provider: "aws_secrets_manager"  # or gcp_secret_manager, azure_key_vault

  required:
    - "JIRA_API_TOKEN"
    - "JIRA_USER_EMAIL"
```

## Environment-Specific Variables

### All Clouds

```bash
# Jira credentials (required)
JIRA_API_TOKEN="your-token"
JIRA_USER_EMAIL="your-email@company.com"
JIRA_SITE_URL="https://yourcompany.atlassian.net"

# Deployment metadata (optional)
VERSION="v1.2.0"
ISSUE_KEY="PROJ-123"
DEPLOYMENT_URL="https://app.example.com"
```

### AWS

```bash
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="123456789012"
AWS_PROFILE="default"
ECS_CLUSTER_ARN="arn:aws:ecs:us-east-1:123456789012:cluster/my-cluster"
```

### GCP

```bash
GCP_PROJECT_ID="my-project-123"
GCP_REGION="us-central1"
GCP_ZONE="us-central1-a"
ACR_LOGIN_SERVER="us-central1-docker.pkg.dev"
```

### Azure

```bash
AZURE_SUBSCRIPTION_ID="xxxx-xxxx-xxxx-xxxx"
AZURE_RESOURCE_GROUP="my-resource-group"
AZURE_REGION="eastus"
AZURE_TENANT_ID="xxxx-xxxx-xxxx-xxxx"
ACR_LOGIN_SERVER="myregistry.azurecr.io"
```

## Common Use Cases

### 1. Basic Deployment Tracking

```bash
# After deploying to any environment
../scripts/deploy-to-jira.sh staging
```

The script will:
- Auto-detect cloud provider
- Extract Jira issues from commits
- Determine version from git tags
- Update Jira with deployment metadata

### 2. Production Deployment with Approval

```yaml
# In your config file
jira:
  environments:
    production:
      require_approval: true
      auto_transition: "Released"
```

```bash
# Deploy to production
../scripts/deploy-to-jira.sh production --version v1.2.0 --issue PROJ-123
```

### 3. Rollback Tracking

```bash
# Track a rollback deployment
../scripts/deploy-to-jira.sh production --rollback --version v1.1.9
```

### 4. Multi-Service Deployment

```yaml
services:
  frontend:
    deployment_type: "cloud_run"
  backend:
    deployment_type: "cloud_run"
  worker:
    deployment_type: "cloud_functions"
```

### 5. Multi-Region Deployment

```yaml
cloud:
  region: "${CLOUD_REGION}"

# Then deploy to multiple regions
CLOUD_REGION=us-east-1 ../scripts/deploy-to-jira.sh production
CLOUD_REGION=eu-west-1 ../scripts/deploy-to-jira.sh production
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Deploy and Track

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        run: ./deploy.sh production

      - name: Track in Jira
        if: always()
        run: |
          ./jira-orchestrator/scripts/deploy-to-jira.sh production \
            --version ${{ github.ref_name }} \
            --status ${{ job.status }}
        env:
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_USER_EMAIL: ${{ secrets.JIRA_USER_EMAIL }}
          JIRA_SITE_URL: ${{ secrets.JIRA_SITE_URL }}
```

### GitLab CI

```yaml
deploy:production:
  stage: deploy
  script:
    - ./deploy.sh production
    - ./jira-orchestrator/scripts/deploy-to-jira.sh production --version $CI_COMMIT_TAG
  environment:
    name: production
  variables:
    JIRA_API_TOKEN: $JIRA_API_TOKEN
    JIRA_USER_EMAIL: $JIRA_USER_EMAIL
    JIRA_SITE_URL: $JIRA_SITE_URL
```

### Azure DevOps

```yaml
- task: Bash@3
  displayName: 'Track Deployment in Jira'
  inputs:
    targetType: 'inline'
    script: |
      ./jira-orchestrator/scripts/deploy-to-jira.sh production \
        --version $(Build.BuildNumber)
  env:
    JIRA_API_TOKEN: $(JIRA_API_TOKEN)
    JIRA_USER_EMAIL: $(JIRA_USER_EMAIL)
    JIRA_SITE_URL: $(JIRA_SITE_URL)
```

## Validation and Testing

### Validate YAML Syntax

```bash
# Using yq
yq eval . aws-deployment.yml > /dev/null && echo "Valid YAML"

# Using Python
python -c "import yaml; yaml.safe_load(open('aws-deployment.yml'))"
```

### Test Deployment Script

```bash
# Test help output
../scripts/deploy-to-jira.sh --help

# Dry run (if supported)
../scripts/deploy-to-jira.sh development --dry-run
```

### Verify Jira Connection

```bash
# Test Jira API connection
curl -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
  "${JIRA_SITE_URL}/rest/api/3/myself"
```

## Troubleshooting

### Issue: Configuration not loading

**Check**:
1. File exists in `config/` directory
2. YAML syntax is valid
3. File permissions are correct

```bash
ls -la config/
yq eval . config/aws-deployment.yml
```

### Issue: Cloud provider not detected

**Solution**: Set explicitly:
```bash
export CLOUD_PROVIDER=aws
../scripts/deploy-to-jira.sh production
```

### Issue: No Jira issues found

**Solution**: Use explicit issue key:
```bash
../scripts/deploy-to-jira.sh production --issue PROJ-123
```

### Issue: Secrets not accessible

**Check cloud-specific permissions**:

AWS:
```bash
aws secretsmanager get-secret-value --secret-id my-secret
```

GCP:
```bash
gcloud secrets versions access latest --secret=my-secret
```

Azure:
```bash
az keyvault secret show --vault-name my-vault --name my-secret
```

## Advanced Configuration

### Custom Field Mappings

Update Jira custom field IDs to match your instance:

```yaml
jira:
  fields:
    branch_name: "customfield_10200"
    pr_url: "customfield_10201"
    deployment_status: "customfield_10203"
    # Add more as needed
```

### Deployment Strategies

Enable advanced deployment patterns:

```yaml
features:
  canary:
    enabled: true
    traffic_percentage: 10
    duration_minutes: 30

  blue_green:
    enabled: true
    cutover_strategy: "gradual"

  deployment_gates:
    enabled: true
    gates:
      - type: "security_scan"
        required: true
```

### Monitoring Integration

Configure cloud-native monitoring:

```yaml
monitoring:
  metrics:
    enabled: true
    format: "cloudwatch"  # or stackdriver, azure_monitor

  alerts:
    on_failure:
      enabled: true
      severity: "high"
```

## Best Practices

1. **Version Control**: Commit config files to your repository
2. **Secrets**: Never commit credentials, use environment variables
3. **Validation**: Validate YAML before committing
4. **Documentation**: Document custom fields and mappings
5. **Testing**: Test in development before production
6. **Backups**: Keep backup of working configurations
7. **Updates**: Review and update configs regularly

## Support

For issues or questions:
- Review main documentation: `../README.md`
- Check script documentation: `../scripts/README.md`
- Consult Jira Orchestrator docs: `../docs/`
- Review deployment command: `../commands/deploy.md`

## See Also

- [Multi-Cloud Deployment Script](../scripts/deploy-to-jira.sh)
- [Jira Orchestrator Plugin](../README.md)
- [Deployment Command](../commands/deploy.md)
- [Installation Guide](../INSTALLATION.md)

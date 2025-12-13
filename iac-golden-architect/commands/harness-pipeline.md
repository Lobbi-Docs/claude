---
description: Create and manage Harness NextGen CD pipelines with deployment strategies, approval gates, and automated validation
argument-hint: --strategy [rolling|bluegreen|canary] --env [environment] --service [name]
allowed-tools:
  - Bash
  - Write
  - Read
  - Edit
  - Grep
  - Glob
---

# Harness NextGen Pipeline Management

You are creating and managing Harness NextGen Continuous Delivery pipelines with advanced deployment strategies, approval workflows, and GitOps integration.

## Input Parameters

Parse the user's command arguments:
- `--strategy`: Deployment strategy (rolling, bluegreen, canary, custom) - defaults to "rolling"
- `--env`: Target environment (dev, staging, prod) - required
- `--service`: Service name - required
- `--action`: Action to perform (create, update, validate, delete) - defaults to "create"
- `--infrastructure`: Infrastructure type (k8s, ecs, lambda, vm) - defaults to "k8s"
- `--approval`: Enable approval gates (true/false) - defaults to true for prod
- `--notifications`: Enable notifications (slack, email, pagerduty) - optional
- `--git-sync`: Enable GitOps sync (true/false) - defaults to false

## Execution Steps

### 1. Validate Prerequisites

Check for required tools and configuration:

```bash
# Check if Harness CLI is installed
if ! command -v harness &> /dev/null; then
    echo "ERROR: Harness CLI not found."
    echo "Install from: https://developer.harness.io/docs/platform/automation/cli/install"
    exit 1
fi

# Verify Harness authentication
if [ -z "$HARNESS_API_KEY" ]; then
    echo "ERROR: HARNESS_API_KEY environment variable not set."
    echo "Set it with: export HARNESS_API_KEY='your-api-key'"
    exit 1
fi

if [ -z "$HARNESS_ACCOUNT_ID" ]; then
    echo "ERROR: HARNESS_ACCOUNT_ID environment variable not set."
    exit 1
fi

# Verify organization and project
HARNESS_ORG_ID=${HARNESS_ORG_ID:-"default"}
HARNESS_PROJECT_ID=${HARNESS_PROJECT_ID:-"default"}

echo "Harness Configuration:"
echo "  Account: $HARNESS_ACCOUNT_ID"
echo "  Organization: $HARNESS_ORG_ID"
echo "  Project: $HARNESS_PROJECT_ID"
echo ""
```

### 2. Gather Service Information

Collect information about the service:

```bash
SERVICE_NAME=${SERVICE_NAME:-$1}

if [ -z "$SERVICE_NAME" ]; then
    echo "ERROR: Service name is required."
    echo "Usage: --service <service-name>"
    exit 1
fi

ENVIRONMENT=${ENVIRONMENT:-"dev"}
DEPLOYMENT_STRATEGY=${DEPLOYMENT_STRATEGY:-"rolling"}
INFRASTRUCTURE_TYPE=${INFRASTRUCTURE_TYPE:-"k8s"}

echo "Pipeline Configuration:"
echo "  Service: $SERVICE_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Strategy: $DEPLOYMENT_STRATEGY"
echo "  Infrastructure: $INFRASTRUCTURE_TYPE"
echo ""

# Set approval requirement based on environment
if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
    REQUIRE_APPROVAL=${APPROVAL:-"true"}
else
    REQUIRE_APPROVAL=${APPROVAL:-"false"}
fi
```

### 3. Create/Update Harness Service

Generate or update the Harness service definition:

```bash
# Create service directory structure
mkdir -p .harness/services

SERVICE_YAML=".harness/services/${SERVICE_NAME}.yaml"

cat > "$SERVICE_YAML" <<EOF
service:
  name: ${SERVICE_NAME}
  identifier: ${SERVICE_NAME}
  serviceDefinition:
    type: Kubernetes
    spec:
      manifests:
        - manifest:
            identifier: ${SERVICE_NAME}_manifests
            type: K8sManifest
            spec:
              store:
                type: Git
                spec:
                  connectorRef: account.github_connector
                  gitFetchType: Branch
                  branch: main
                  paths:
                    - k8s/
              skipResourceVersioning: false
              enableDeclarativeRollback: true

      artifacts:
        primary:
          primaryArtifactRef: ${SERVICE_NAME}_image
          sources:
            - identifier: ${SERVICE_NAME}_image
              type: DockerRegistry
              spec:
                connectorRef: account.dockerhub_connector
                imagePath: \${DOCKER_IMAGE_PATH}
                tag: <+input>

      variables:
        - name: replicas
          type: String
          value: "3"
        - name: cpu_limit
          type: String
          value: "1000m"
        - name: memory_limit
          type: String
          value: "1Gi"

  tags:
    environment: ${ENVIRONMENT}
    managed_by: terraform
EOF

echo "✓ Service definition created: $SERVICE_YAML"
```

### 4. Create/Update Environment

Generate environment configuration:

```bash
mkdir -p .harness/environments

ENV_YAML=".harness/environments/${ENVIRONMENT}.yaml"

cat > "$ENV_YAML" <<EOF
environment:
  name: ${ENVIRONMENT}
  identifier: ${ENVIRONMENT}
  type: Production
  orgIdentifier: ${HARNESS_ORG_ID}
  projectIdentifier: ${HARNESS_PROJECT_ID}

  tags:
    type: ${ENVIRONMENT}

  variables:
    - name: namespace
      type: String
      value: ${SERVICE_NAME}-${ENVIRONMENT}
    - name: region
      type: String
      value: \${REGION}

  overrides:
    manifests:
      - manifest:
          identifier: values_override
          type: Values
          spec:
            store:
              type: Git
              spec:
                connectorRef: account.github_connector
                gitFetchType: Branch
                branch: main
                paths:
                  - environments/${ENVIRONMENT}/values.yaml
EOF

echo "✓ Environment definition created: $ENV_YAML"
```

### 5. Create Infrastructure Definition

Generate infrastructure configuration:

```bash
mkdir -p .harness/infrastructures

INFRA_YAML=".harness/infrastructures/${ENVIRONMENT}-${INFRASTRUCTURE_TYPE}.yaml"

if [ "$INFRASTRUCTURE_TYPE" = "k8s" ]; then
cat > "$INFRA_YAML" <<EOF
infrastructure:
  name: ${ENVIRONMENT}_k8s_cluster
  identifier: ${ENVIRONMENT}_k8s_cluster
  type: KubernetesDirect
  environmentRef: ${ENVIRONMENT}
  deploymentType: Kubernetes

  spec:
    connectorRef: account.k8s_connector_${ENVIRONMENT}
    namespace: ${SERVICE_NAME}-${ENVIRONMENT}
    releaseName: ${SERVICE_NAME}

  allowSimultaneousDeployments: false
EOF
elif [ "$INFRASTRUCTURE_TYPE" = "ecs" ]; then
cat > "$INFRA_YAML" <<EOF
infrastructure:
  name: ${ENVIRONMENT}_ecs_cluster
  identifier: ${ENVIRONMENT}_ecs_cluster
  type: Ecs
  environmentRef: ${ENVIRONMENT}
  deploymentType: Ecs

  spec:
    connectorRef: account.aws_connector_${ENVIRONMENT}
    cluster: ${SERVICE_NAME}-${ENVIRONMENT}
    region: <+input>
EOF
fi

echo "✓ Infrastructure definition created: $INFRA_YAML"
```

### 6. Generate Pipeline YAML

Create the main pipeline configuration based on deployment strategy:

```bash
mkdir -p .harness/pipelines

PIPELINE_YAML=".harness/pipelines/${SERVICE_NAME}-${ENVIRONMENT}.yaml"

# Generate pipeline header
cat > "$PIPELINE_YAML" <<EOF
pipeline:
  name: ${SERVICE_NAME} - ${ENVIRONMENT}
  identifier: ${SERVICE_NAME}_${ENVIRONMENT}
  projectIdentifier: ${HARNESS_PROJECT_ID}
  orgIdentifier: ${HARNESS_ORG_ID}

  tags:
    service: ${SERVICE_NAME}
    environment: ${ENVIRONMENT}

  properties:
    ci:
      codebase:
        connectorRef: account.github_connector
        build: <+input>

  stages:
EOF

# Add build stage (optional)
if [ "$INCLUDE_BUILD" = "true" ]; then
cat >> "$PIPELINE_YAML" <<EOF
    - stage:
        name: Build
        identifier: build
        type: CI
        spec:
          cloneCodebase: true
          execution:
            steps:
              - step:
                  type: Run
                  name: Build Docker Image
                  identifier: build_image
                  spec:
                    connectorRef: account.dockerhub_connector
                    image: docker:latest
                    shell: Sh
                    command: |
                      docker build -t \${DOCKER_IMAGE_PATH}:<+pipeline.sequenceId> .
                      docker push \${DOCKER_IMAGE_PATH}:<+pipeline.sequenceId>

              - step:
                  type: Run
                  name: Security Scan
                  identifier: security_scan
                  spec:
                    connectorRef: account.dockerhub_connector
                    image: aquasec/trivy:latest
                    shell: Sh
                    command: |
                      trivy image \${DOCKER_IMAGE_PATH}:<+pipeline.sequenceId>

          infrastructure:
            type: KubernetesDirect
            spec:
              connectorRef: account.k8s_connector
              namespace: harness-builds

EOF
fi
```

### 7. Add Deployment Stage with Strategy

Add deployment stage based on selected strategy:

#### Rolling Deployment

```bash
if [ "$DEPLOYMENT_STRATEGY" = "rolling" ]; then
cat >> "$PIPELINE_YAML" <<EOF
    - stage:
        name: Deploy to ${ENVIRONMENT}
        identifier: deploy_${ENVIRONMENT}
        type: Deployment
        spec:
          serviceConfig:
            serviceRef: ${SERVICE_NAME}
            serviceDefinition:
              type: Kubernetes
              spec:
                variables:
                  - name: replicas
                    type: String
                    value: <+input>.default(3)

          infrastructure:
            environmentRef: ${ENVIRONMENT}
            infrastructureDefinition:
              type: KubernetesDirect
              spec:
                connectorRef: account.k8s_connector_${ENVIRONMENT}
                namespace: ${SERVICE_NAME}-${ENVIRONMENT}
                releaseName: ${SERVICE_NAME}

          execution:
            steps:
              - step:
                  type: K8sRollingDeploy
                  name: Rolling Deployment
                  identifier: rolling_deploy
                  spec:
                    skipDryRun: false
                    pruningEnabled: false
                  timeout: 10m

              - step:
                  type: K8sRollingRollback
                  name: Rollback on Failure
                  identifier: rollback
                  spec:
                    pruningEnabled: false
                  when:
                    stageStatus: Failure

            rollbackSteps:
              - step:
                  type: K8sRollingRollback
                  name: Rollback Deployment
                  identifier: rollback_deployment
                  spec:
                    pruningEnabled: false
EOF
fi
```

#### Blue-Green Deployment

```bash
if [ "$DEPLOYMENT_STRATEGY" = "bluegreen" ]; then
cat >> "$PIPELINE_YAML" <<EOF
    - stage:
        name: Deploy to ${ENVIRONMENT}
        identifier: deploy_${ENVIRONMENT}
        type: Deployment
        spec:
          serviceConfig:
            serviceRef: ${SERVICE_NAME}

          infrastructure:
            environmentRef: ${ENVIRONMENT}
            infrastructureDefinition:
              type: KubernetesDirect
              spec:
                connectorRef: account.k8s_connector_${ENVIRONMENT}
                namespace: ${SERVICE_NAME}-${ENVIRONMENT}
                releaseName: ${SERVICE_NAME}

          execution:
            steps:
              - step:
                  type: K8sBlueGreenDeploy
                  name: Blue Green Deploy
                  identifier: bluegreen_deploy
                  spec:
                    skipDryRun: false
                    pruningEnabled: false
                  timeout: 10m

              - step:
                  type: ShellScript
                  name: Smoke Tests
                  identifier: smoke_tests
                  spec:
                    shell: Bash
                    source:
                      type: Inline
                      spec:
                        script: |
                          #!/bin/bash
                          # Run smoke tests against stage environment
                          echo "Running smoke tests..."
                          curl -f http://\${SERVICE_URL}/health || exit 1
                          echo "Smoke tests passed"
                    timeout: 5m

              - step:
                  type: K8sBGSwapServices
                  name: Swap Services
                  identifier: swap_services
                  spec:
                    skipDryRun: false
                  timeout: 10m

            rollbackSteps:
              - step:
                  type: K8sBlueGreenRollback
                  name: Rollback
                  identifier: rollback
EOF
fi
```

#### Canary Deployment

```bash
if [ "$DEPLOYMENT_STRATEGY" = "canary" ]; then
cat >> "$PIPELINE_YAML" <<EOF
    - stage:
        name: Deploy to ${ENVIRONMENT}
        identifier: deploy_${ENVIRONMENT}
        type: Deployment
        spec:
          serviceConfig:
            serviceRef: ${SERVICE_NAME}

          infrastructure:
            environmentRef: ${ENVIRONMENT}
            infrastructureDefinition:
              type: KubernetesDirect
              spec:
                connectorRef: account.k8s_connector_${ENVIRONMENT}
                namespace: ${SERVICE_NAME}-${ENVIRONMENT}
                releaseName: ${SERVICE_NAME}

          execution:
            steps:
              - step:
                  type: K8sCanaryDeploy
                  name: Canary Deploy 25%
                  identifier: canary_25
                  spec:
                    instanceSelection:
                      type: Count
                      spec:
                        count: 1
                    skipDryRun: false
                  timeout: 10m

              - step:
                  type: K8sCanaryDelete
                  name: Canary Delete on Failure
                  identifier: canary_delete_failure
                  when:
                    stageStatus: Failure

              - step:
                  type: Verify
                  name: Verify Canary
                  identifier: verify_canary
                  spec:
                    type: Prometheus
                    spec:
                      connectorRef: account.prometheus_connector
                      queries:
                        - name: error_rate
                          query: |
                            sum(rate(http_requests_total{status=~"5..", service="${SERVICE_NAME}"}[5m]))
                          threshold: 0.05
                  timeout: 10m

              - step:
                  type: K8sCanaryDeploy
                  name: Canary Deploy 50%
                  identifier: canary_50
                  spec:
                    instanceSelection:
                      type: Percentage
                      spec:
                        percentage: 50
                    skipDryRun: false
                  timeout: 10m

              - step:
                  type: HarnessApproval
                  name: Manual Approval
                  identifier: manual_approval
                  spec:
                    approvalMessage: Approve canary rollout?
                    includePipelineExecutionHistory: true
                    approvers:
                      userGroups:
                        - account.platform_team
                    minimumCount: 1
                  timeout: 1h

              - step:
                  type: K8sRollingDeploy
                  name: Complete Rollout
                  identifier: complete_rollout
                  spec:
                    skipDryRun: false
                  timeout: 10m

              - step:
                  type: K8sCanaryDelete
                  name: Delete Canary
                  identifier: delete_canary

            rollbackSteps:
              - step:
                  type: K8sRollingRollback
                  name: Rollback
                  identifier: rollback
EOF
fi
```

### 8. Add Approval Gates (if enabled)

Add approval gates for production:

```bash
if [ "$REQUIRE_APPROVAL" = "true" ]; then
cat >> "$PIPELINE_YAML" <<EOF

        - step:
            type: HarnessApproval
            name: Deployment Approval
            identifier: deployment_approval
            spec:
              approvalMessage: |
                Please review and approve deployment to ${ENVIRONMENT}

                Service: ${SERVICE_NAME}
                Environment: ${ENVIRONMENT}
                Strategy: ${DEPLOYMENT_STRATEGY}

              includePipelineExecutionHistory: true
              approvers:
                userGroups:
                  - account.sre_team
                  - account.platform_team
              minimumCount: 1
              isAutoRejectEnabled: false

            timeout: 2h
            failureStrategies:
              - onFailure:
                  errors:
                    - ApprovalRejection
                  action:
                    type: StageRollback
EOF
fi
```

### 9. Add Notification Configuration

Configure notifications:

```bash
if [ -n "$NOTIFICATIONS" ]; then
cat >> "$PIPELINE_YAML" <<EOF

  notificationRules:
    - name: Pipeline Status
      identifier: pipeline_status
      pipelineEvents:
        - type: PipelineSuccess
        - type: PipelineFailed
      notificationMethod:
        type: Slack
        spec:
          userGroups: []
          webhookUrl: \${SLACK_WEBHOOK_URL}
      enabled: true

    - name: Approval Required
      identifier: approval_required
      pipelineEvents:
        - type: StageWaiting
      notificationMethod:
        type: Email
        spec:
          userGroups:
            - account.platform_team
          recipients:
            - platform-team@company.com
      enabled: true
EOF
fi
```

### 10. Add Pipeline Triggers

Configure automated triggers:

```bash
mkdir -p .harness/triggers

TRIGGER_YAML=".harness/triggers/${SERVICE_NAME}-${ENVIRONMENT}-trigger.yaml"

cat > "$TRIGGER_YAML" <<EOF
trigger:
  name: ${SERVICE_NAME} ${ENVIRONMENT} Trigger
  identifier: ${SERVICE_NAME}_${ENVIRONMENT}_trigger
  enabled: true

  source:
    type: Webhook
    spec:
      type: Github
      spec:
        type: Push
        spec:
          connectorRef: account.github_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
          headerConditions: []
          repoName: ${REPO_NAME}
          actions:
            - Push

  inputYaml: |
    pipeline:
      identifier: ${SERVICE_NAME}_${ENVIRONMENT}
      variables:
        - name: image_tag
          type: String
          value: <+trigger.commitSha>
EOF

echo "✓ Trigger configuration created: $TRIGGER_YAML"
```

### 11. Create Input Sets

Generate input sets for different scenarios:

```bash
mkdir -p .harness/input-sets

# Development input set
cat > ".harness/input-sets/${SERVICE_NAME}-dev.yaml" <<EOF
inputSet:
  name: ${SERVICE_NAME} Dev
  identifier: ${SERVICE_NAME}_dev
  orgIdentifier: ${HARNESS_ORG_ID}
  projectIdentifier: ${HARNESS_PROJECT_ID}
  pipeline:
    identifier: ${SERVICE_NAME}_${ENVIRONMENT}
    variables:
      - name: replicas
        type: String
        value: "2"
      - name: cpu_limit
        type: String
        value: "500m"
      - name: memory_limit
        type: String
        value: "512Mi"
EOF

# Production input set
cat > ".harness/input-sets/${SERVICE_NAME}-prod.yaml" <<EOF
inputSet:
  name: ${SERVICE_NAME} Prod
  identifier: ${SERVICE_NAME}_prod
  orgIdentifier: ${HARNESS_ORG_ID}
  projectIdentifier: ${HARNESS_PROJECT_ID}
  pipeline:
    identifier: ${SERVICE_NAME}_${ENVIRONMENT}
    variables:
      - name: replicas
        type: String
        value: "5"
      - name: cpu_limit
        type: String
        value: "2000m"
      - name: memory_limit
        type: String
        value: "2Gi"
EOF

echo "✓ Input sets created"
```

### 12. Validate Pipeline Configuration

Validate the generated YAML:

```bash
echo "Validating pipeline configuration..."

# Check YAML syntax
if command -v yamllint &> /dev/null; then
    yamllint "$PIPELINE_YAML"
    if [ $? -eq 0 ]; then
        echo "✓ YAML syntax valid"
    else
        echo "⚠️  YAML syntax errors detected"
    fi
else
    echo "yamllint not found. Skipping syntax validation."
fi

# Validate with Harness CLI
harness pipeline validate \
    --file "$PIPELINE_YAML" \
    --org "$HARNESS_ORG_ID" \
    --project "$HARNESS_PROJECT_ID"

if [ $? -eq 0 ]; then
    echo "✓ Pipeline validation passed"
else
    echo "✗ Pipeline validation failed"
    exit 1
fi
```

### 13. Deploy to Harness

Upload the pipeline to Harness:

```bash
if [ "$ACTION" = "create" ] || [ "$ACTION" = "update" ]; then
    echo "Deploying pipeline to Harness..."

    # Create/Update service
    harness service apply \
        --file "$SERVICE_YAML" \
        --org "$HARNESS_ORG_ID" \
        --project "$HARNESS_PROJECT_ID"

    # Create/Update environment
    harness environment apply \
        --file "$ENV_YAML" \
        --org "$HARNESS_ORG_ID" \
        --project "$HARNESS_PROJECT_ID"

    # Create/Update infrastructure
    harness infrastructure apply \
        --file "$INFRA_YAML" \
        --org "$HARNESS_ORG_ID" \
        --project "$HARNESS_PROJECT_ID"

    # Create/Update pipeline
    harness pipeline apply \
        --file "$PIPELINE_YAML" \
        --org "$HARNESS_ORG_ID" \
        --project "$HARNESS_PROJECT_ID"

    # Create/Update triggers
    harness trigger apply \
        --file "$TRIGGER_YAML" \
        --org "$HARNESS_ORG_ID" \
        --project "$HARNESS_PROJECT_ID"

    echo "✓ Pipeline deployed to Harness"

    # Get pipeline URL
    PIPELINE_URL="https://app.harness.io/ng/account/${HARNESS_ACCOUNT_ID}/cd/orgs/${HARNESS_ORG_ID}/projects/${HARNESS_PROJECT_ID}/pipelines/${SERVICE_NAME}_${ENVIRONMENT}"

    echo ""
    echo "Pipeline URL: $PIPELINE_URL"
fi
```

### 14. Enable GitOps Sync (if requested)

Configure GitOps synchronization:

```bash
if [ "$GIT_SYNC" = "true" ]; then
    echo "Configuring GitOps sync..."

    # Commit pipeline files to git
    git add .harness/
    git commit -m "Add Harness pipeline for ${SERVICE_NAME} in ${ENVIRONMENT}"

    # Configure Harness Git Sync
    cat > ".harness/git-sync-config.yaml" <<EOF
gitSync:
  enabled: true
  syncMode: BIDIRECTIONAL
  repo:
    name: ${REPO_NAME}
    branch: main
    connectorRef: account.github_connector
  rootFolder: .harness/
EOF

    echo "✓ GitOps sync configured"
fi
```

### 15. Generate Documentation

Create pipeline documentation:

```bash
cat > "PIPELINE-${SERVICE_NAME}-${ENVIRONMENT}.md" <<EOF
# Harness Pipeline: ${SERVICE_NAME} - ${ENVIRONMENT}

## Overview

This pipeline deploys the ${SERVICE_NAME} service to the ${ENVIRONMENT} environment using ${DEPLOYMENT_STRATEGY} deployment strategy.

## Pipeline Details

- **Service:** ${SERVICE_NAME}
- **Environment:** ${ENVIRONMENT}
- **Strategy:** ${DEPLOYMENT_STRATEGY}
- **Infrastructure:** ${INFRASTRUCTURE_TYPE}
- **Approval Required:** ${REQUIRE_APPROVAL}

## Stages

1. **Build** (optional) - Build and push Docker image
2. **Deploy** - Deploy using ${DEPLOYMENT_STRATEGY} strategy
3. **Verify** - Run smoke tests and health checks

## Triggers

- **Webhook:** Triggered on push to main branch
- **Manual:** Can be triggered manually from Harness UI

## Approvers

$(if [ "$REQUIRE_APPROVAL" = "true" ]; then
    echo "- SRE Team"
    echo "- Platform Team"
else
    echo "- No approval required"
fi)

## Rollback

Automatic rollback is configured on deployment failure.

Manual rollback: Navigate to pipeline execution and click "Rollback"

## Monitoring

- View pipeline executions: $PIPELINE_URL/deployments
- View service health: Harness CV Dashboard

## Files

- Pipeline: \`.harness/pipelines/${SERVICE_NAME}-${ENVIRONMENT}.yaml\`
- Service: \`.harness/services/${SERVICE_NAME}.yaml\`
- Environment: \`.harness/environments/${ENVIRONMENT}.yaml\`
- Infrastructure: \`.harness/infrastructures/${ENVIRONMENT}-${INFRASTRUCTURE_TYPE}.yaml\`
- Triggers: \`.harness/triggers/${SERVICE_NAME}-${ENVIRONMENT}-trigger.yaml\`

## Usage

\`\`\`bash
# Trigger pipeline manually
harness pipeline execute \\
  --pipeline ${SERVICE_NAME}_${ENVIRONMENT} \\
  --org ${HARNESS_ORG_ID} \\
  --project ${HARNESS_PROJECT_ID}

# View pipeline status
harness pipeline get \\
  --pipeline ${SERVICE_NAME}_${ENVIRONMENT} \\
  --org ${HARNESS_ORG_ID} \\
  --project ${HARNESS_PROJECT_ID}
\`\`\`

## Support

For issues or questions, contact the Platform Engineering team.

EOF

echo "✓ Documentation created: PIPELINE-${SERVICE_NAME}-${ENVIRONMENT}.md"
```

## Summary

Provide comprehensive summary:

```bash
echo ""
echo "========================================"
echo "HARNESS PIPELINE CREATED"
echo "========================================"
echo ""
echo "Service: ${SERVICE_NAME}"
echo "Environment: ${ENVIRONMENT}"
echo "Strategy: ${DEPLOYMENT_STRATEGY}"
echo "Infrastructure: ${INFRASTRUCTURE_TYPE}"
echo ""
echo "Files Created:"
echo "  - $PIPELINE_YAML"
echo "  - $SERVICE_YAML"
echo "  - $ENV_YAML"
echo "  - $INFRA_YAML"
echo "  - $TRIGGER_YAML"
echo "  - Input sets in .harness/input-sets/"
echo ""
echo "Pipeline URL: $PIPELINE_URL"
echo ""
echo "Next Steps:"
echo "  1. Review pipeline configuration"
echo "  2. Test pipeline execution"
echo "  3. Configure monitoring and alerts"
echo "  4. Update runbooks"
echo ""
echo "========================================"
```

## Best Practices Applied

- ✓ GitOps-ready configuration
- ✓ Approval gates for production
- ✓ Automated rollback on failure
- ✓ Multiple deployment strategies
- ✓ Verification steps
- ✓ Notification configuration
- ✓ Input sets for different environments
- ✓ Trigger automation
- ✓ Comprehensive documentation

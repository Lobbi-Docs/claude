# Harness IaCM (Infrastructure as Code Management)

## Terraform Workspaces

```yaml
workspace:
  name: Production Infrastructure
  identifier: prod_infra
  repository: infrastructure-repo
  repositoryBranch: main
  repositoryPath: terraform/production
  providerConnector: aws_connector
  terraformVersion: 1.5.0

  environmentVariables:
    - name: AWS_REGION
      value: us-east-1
      valueType: String
    - name: AWS_ACCESS_KEY_ID
      value: <+secrets.getValue("aws_access_key")>
      valueType: Secret

  terraformVariables:
    - name: environment
      value: production
    - name: instance_count
      value: "3"
```

## Workspace Operations

### Plan
```yaml
operation:
  type: Plan
  workspace: prod_infra
  autoApprove: false
  notifyOnCompletion: true
```

### Apply
```yaml
operation:
  type: Apply
  workspace: prod_infra
  planRef: <+pipeline.stages.plan.output.planId>
```

### Destroy
```yaml
operation:
  type: Destroy
  workspace: prod_infra
  requireApproval: true
  approvers:
    - user: admin@company.com
```

## Drift Detection

```yaml
driftDetection:
  enabled: true
  schedule:
    cronExpression: "0 */6 * * *"  # Every 6 hours
  notification:
    type: Slack
    webhookUrl: <+secrets.getValue("slack_webhook")>
  autoRemediate: false
```

## Cost Estimation

```yaml
costEstimation:
  enabled: true
  beforeApply: true
  thresholds:
    warning: 1000  # USD
    block: 5000    # USD
```

## State Management

```yaml
stateBackend:
  type: Harness  # or S3, Azure Blob, GCS
  encryption: true
  locking: true
```

## Policy Enforcement

```yaml
policySet:
  - name: Required Tags
    policies:
      - identifier: require_tags
        severity: ERROR
  - name: Instance Size Limits
    policies:
      - identifier: max_instance_size
        severity: WARNING
```

## Module Registry

```yaml
moduleSource:
  type: HarnessRegistry  # or Terraform Registry, Git
  module: vpc
  version: 1.2.0
```

## Variables

### Input Variables
```yaml
variables:
  - name: region
    type: String
    required: true
  - name: enable_logging
    type: Boolean
    default: true
  - name: tags
    type: Map
    default:
      managed_by: harness
```

### Output Variables
```yaml
outputs:
  - name: vpc_id
    sensitive: false
  - name: subnet_ids
    sensitive: false
```

## PR Automation

```yaml
prAutomation:
  enabled: true
  planOnPR: true
  commentPlanOutput: true
  labelOnDrift: true
```

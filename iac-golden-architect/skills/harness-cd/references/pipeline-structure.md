# Harness Pipeline Structure Reference

Complete reference for Harness NextGen pipeline YAML structure.

## Pipeline Root Structure

```yaml
pipeline:
  name: string                    # Required: Pipeline name
  identifier: string              # Required: Unique identifier (alphanumeric, -, _)
  projectIdentifier: string       # Required: Project identifier
  orgIdentifier: string           # Required: Organization identifier
  description: string             # Optional: Pipeline description
  tags:                           # Optional: Key-value tags
    key: value
  properties:                     # Optional: Pipeline properties
    ci:
      codebase:                   # For CI pipelines
        connectorRef: string
        repoName: string
        build:
          type: branch | tag | PR
          spec:
            branch: string
  allowStageExecutions: boolean   # Optional: Allow selective stage execution
  notificationRules: []           # Optional: Notification configurations
  variables: []                   # Optional: Pipeline-level variables
  stages: []                      # Required: Pipeline stages
```

## Stage Types

### Deployment Stage

```yaml
- stage:
    name: string
    identifier: string
    description: string
    type: Deployment
    tags: {}
    spec:
      deploymentType: Kubernetes | NativeHelm | ECS | ServerlessAwsLambda | Ssh | WinRm | AzureWebApp | CustomDeployment | Asg | TAS | GoogleCloudFunctions
      service:
        serviceRef: string        # Service reference
        serviceInputs:            # Service runtime inputs
          serviceDefinition:
            type: Kubernetes
            spec:
              variables: []
              artifacts:
                primary:
                  primaryArtifactRef: <+input>
      environment:
        environmentRef: string    # Environment reference
        deployToAll: boolean      # Deploy to all infrastructures
        infrastructureDefinitions:
          - identifier: string
        environmentInputs:        # Environment runtime inputs
          identifier: string
          type: PreProduction | Production
          variables: []
      execution:                  # Execution steps
        steps: []
        rollbackSteps: []
    failureStrategies: []
    when:                         # Conditional execution
      pipelineStatus: Success | Failure | All
      condition: string
```

### Approval Stage

```yaml
- stage:
    name: string
    identifier: string
    type: Approval
    spec:
      execution:
        steps:
          - step:
              name: string
              identifier: string
              type: HarnessApproval | JiraApproval | ServiceNowApproval
              timeout: string
              spec:
                approvalMessage: string
                includePipelineExecutionHistory: boolean
                approvers:
                  minimumCount: integer
                  disallowPipelineExecutor: boolean
                  userGroups: []
                approverInputs: []
```

### Custom Stage

```yaml
- stage:
    name: string
    identifier: string
    type: Custom
    spec:
      execution:
        steps:
          - step:
              type: ShellScript | Http | Email | Wait
              # Step-specific configuration
```

### Pipeline Stage (Nested Pipeline)

```yaml
- stage:
    name: string
    identifier: string
    type: Pipeline
    spec:
      org: string
      pipeline: string
      project: string
      inputs: {}
```

## Execution Steps

### Kubernetes Steps

```yaml
# Rolling Deployment
- step:
    name: Rolling Deployment
    identifier: rollingDeployment
    type: K8sRollingDeploy
    timeout: 10m
    spec:
      skipDryRun: boolean
      pruningEnabled: boolean

# Blue-Green Deployment
- step:
    type: K8sBlueGreenDeploy
    spec:
      skipDryRun: boolean

# Canary Deployment
- step:
    type: K8sCanaryDeploy
    spec:
      instanceSelection:
        type: Count | Percentage
        spec:
          count: integer
          percentage: integer
      skipDryRun: boolean

# Scale
- step:
    type: K8sScale
    spec:
      workload: string
      skipSteadyStateCheck: boolean

# Delete
- step:
    type: K8sDelete
    spec:
      deleteResources:
        type: ReleaseName | ManifestPath | ResourceName
        spec:
          manifestPaths: []
          resourceNames: []

# Apply
- step:
    type: K8sApply
    spec:
      filePaths: []
      skipDryRun: boolean
      skipSteadyStateCheck: boolean
```

### Terraform Steps

```yaml
# Terraform Plan
- step:
    type: TerraformPlan
    spec:
      provisionerIdentifier: string
      configuration:
        command: Apply | Destroy
        configFiles:
          store:
            type: Github | GitLab | Bitbucket | Harness
            spec:
              gitFetchType: Branch | Commit
              branch: string
              commitId: string
              folderPath: string
              connectorRef: string
        secretManagerRef: string
        varFiles: []
        backendConfig:
          type: Inline
          spec:
            content: string
        environmentVariables: []
        workspace: string

# Terraform Apply
- step:
    type: TerraformApply
    spec:
      provisionerIdentifier: string
      configuration:
        type: InheritFromPlan | InheritFromApply

# Terraform Destroy
- step:
    type: TerraformDestroy
    spec:
      provisionerIdentifier: string
      configuration:
        type: InheritFromApply

# Terraform Rollback
- step:
    type: TerraformRollback
    spec:
      provisionerIdentifier: string
```

### Shell Script Step

```yaml
- step:
    type: ShellScript
    spec:
      shell: Bash | Powershell | Pwsh
      source:
        type: Inline | Harness
        spec:
          script: string
          file: string
      environmentVariables:
        - name: string
          type: String | Secret
          value: string
      outputVariables:
        - name: string
          type: String | Secret
          value: string
      executionTarget:
        connectorRef: string
        host: string
        workingDirectory: string
      onDelegate: boolean
      delegateSelectors: []
```

### HTTP Step

```yaml
- step:
    type: Http
    spec:
      url: string
      method: GET | POST | PUT | DELETE | PATCH
      headers:
        - key: string
          value: string
      requestBody: string
      assertion: string
      outputVariables: []
```

### Approval Steps

```yaml
# Harness Approval
- step:
    type: HarnessApproval
    spec:
      approvalMessage: string
      includePipelineExecutionHistory: boolean
      approvers:
        minimumCount: integer
        disallowPipelineExecutor: boolean
        userGroups: []
      approverInputs:
        - name: string
          defaultValue: string

# Jira Approval
- step:
    type: JiraApproval
    spec:
      connectorRef: string
      projectKey: string
      issueKey: string
      issueType: string
      approvalCriteria:
        type: KeyValues | Jexl
        spec:
          matchAnyCondition: boolean
          conditions:
            - key: string
              operator: equals | not_equals | in | not_in
              value: string
      rejectionCriteria:
        type: KeyValues | Jexl
        spec:
          matchAnyCondition: boolean
          conditions: []

# ServiceNow Approval
- step:
    type: ServiceNowApproval
    spec:
      connectorRef: string
      ticketNumber: string
      ticketType: string
      approvalCriteria: {}
      rejectionCriteria: {}
```

## Failure Strategies

```yaml
failureStrategies:
  - onFailure:
      errors:
        - AllErrors
        - Timeout
        - Authorization
        - Verification
        - PolicyEvaluationFailure
        - Unknown
        - Authentication
        - DelegateProvisioning
      action:
        type: StageRollback | StepGroupRollback | Ignore | Retry | MarkAsSuccess | Abort | ManualIntervention | PipelineRollback
        spec:
          retryCount: integer
          retryIntervals: []
          timeout: string
```

## Conditional Execution

```yaml
when:
  pipelineStatus: Success | Failure | All
  condition: |
    <+stage.variables.deploy_enabled> == "true" &&
    <+pipeline.variables.environment> == "production"
```

## Step Groups

```yaml
- stepGroup:
    name: string
    identifier: string
    steps: []
    rollbackSteps: []
    when:
      stageStatus: Success | Failure | All
    failureStrategies: []
```

## Parallel Execution

```yaml
- parallel:
    - step:
        name: Step 1
        type: ShellScript
        spec: {}
    - step:
        name: Step 2
        type: ShellScript
        spec: {}
```

## Variables

### Pipeline Variables

```yaml
pipeline:
  variables:
    - name: environment
      type: String | Number | Secret
      description: string
      value: string
      default: string
      required: boolean
      allowedValues:
        - value1
        - value2
```

### Stage Variables

```yaml
stage:
  variables:
    - name: stage_var
      type: String
      value: <+input>
```

### Service Variables

```yaml
service:
  variables:
    - name: port
      type: String
      value: "8080"
```

### Environment Variables

```yaml
environment:
  variables:
    - name: namespace
      type: String
      value: production
```

## Input Sets

```yaml
inputSet:
  name: string
  identifier: string
  orgIdentifier: string
  projectIdentifier: string
  pipeline:
    identifier: string
    stages:
      - stage:
          identifier: string
          type: Deployment
          spec:
            service:
              serviceInputs:
                serviceDefinition:
                  type: Kubernetes
                  spec:
                    variables:
                      - name: image_tag
                        type: String
                        value: v1.0.0
```

## Overlay Input Sets

```yaml
overlayInputSet:
  name: string
  identifier: string
  orgIdentifier: string
  projectIdentifier: string
  inputSetReferences:
    - inputset1
    - inputset2
  pipelineIdentifier: string
```

## Expressions

### Common Expressions

| Expression | Description |
|------------|-------------|
| `<+pipeline.name>` | Pipeline name |
| `<+pipeline.identifier>` | Pipeline identifier |
| `<+pipeline.executionId>` | Execution ID |
| `<+pipeline.sequenceId>` | Sequence ID |
| `<+pipeline.startTs>` | Start timestamp |
| `<+pipeline.triggerType>` | Trigger type |
| `<+stage.name>` | Stage name |
| `<+stage.identifier>` | Stage identifier |
| `<+stage.executionUrl>` | Stage execution URL |
| `<+service.name>` | Service name |
| `<+service.identifier>` | Service identifier |
| `<+env.name>` | Environment name |
| `<+env.identifier>` | Environment identifier |
| `<+infra.name>` | Infrastructure name |
| `<+infra.namespace>` | Kubernetes namespace |
| `<+artifact.tag>` | Artifact tag |
| `<+artifact.image>` | Full image path |
| `<+artifact.imagePath>` | Image path without tag |
| `<+secrets.getValue("secret_name")>` | Secret value |
| `<+variable.name>` | Pipeline variable |
| `<+pipeline.variables.var_name>` | Specific pipeline variable |
| `<+stage.variables.var_name>` | Stage variable |
| `<+trigger.payload.branch>` | Git branch from webhook |
| `<+codebase.commitSha>` | Git commit SHA |
| `<+codebase.branch>` | Git branch |

### Expression Functions

```yaml
# String functions
<+<+pipeline.name>.toLowerCase()>
<+<+service.name>.toUpperCase()>
<+<+artifact.tag>.substring(0,7)>

# Conditional
<+condition> ? "true_value" : "false_value"

# Default values
<+<+input>.default("default_value")>
<+<+input>.allowedValues("value1","value2")>

# JSON parsing
<+json.object(<+pipeline.variables.json_data>).key>
```

## Delegates

### Delegate Selectors

```yaml
step:
  spec:
    delegateSelectors:
      - selector1
      - selector2
```

## Advanced Features

### Matrix Strategy

```yaml
strategy:
  matrix:
    environment:
      - dev
      - staging
      - prod
    region:
      - us-west-2
      - eu-west-1
  maxConcurrency: 2
```

### Repeat Strategy

```yaml
strategy:
  repeat:
    items:
      - item1
      - item2
    maxConcurrency: 1
```

### Parallelism Strategy

```yaml
strategy:
  parallelism: 3
```

## Barriers

```yaml
- step:
    type: Barrier
    spec:
      barrierRef: string
      timeout: 1h
```

## Flags

```yaml
- step:
    type: FlagConfiguration
    spec:
      feature: string
      environment: string
```

## Templates

### Step Template

```yaml
template:
  name: string
  identifier: string
  type: Step
  spec:
    type: ShellScript
    spec:
      shell: Bash
      source:
        type: Inline
        spec:
          script: |
            echo "Template step"
```

### Stage Template

```yaml
template:
  name: string
  identifier: string
  type: Stage
  spec:
    type: Deployment
    spec:
      deploymentType: Kubernetes
      # Stage configuration
```

## Best Practices

1. **Use meaningful identifiers** - Use kebab-case or snake_case
2. **Implement failure strategies** - Handle errors gracefully
3. **Use templates** - Reuse common patterns
4. **Leverage variables** - Make pipelines configurable
5. **Add timeouts** - Prevent hanging executions
6. **Use conditional execution** - Control flow based on conditions
7. **Implement rollback steps** - Ensure safe deployments
8. **Add descriptions** - Document purpose and usage
9. **Use input sets** - Separate configuration from definition
10. **Version control** - Store pipelines in Git

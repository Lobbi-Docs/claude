# Harness CD (Continuous Delivery)

## Deployment Types

| Type | Description |
|------|-------------|
| Kubernetes | Native K8s (Rolling, Blue-Green, Canary) |
| Helm | Helm chart deployments |
| ECS | Amazon ECS |
| Serverless | AWS Lambda, Azure Functions |
| SSH/WinRM | Traditional VM deployments |
| Custom | Shell script deployments |

## Service Definition

```yaml
service:
  name: My Application
  identifier: my_application
  serviceDefinition:
    type: Kubernetes
    spec:
      manifests:
        - manifest:
            identifier: k8s_manifest
            type: K8sManifest
            spec:
              store:
                type: Harness
                spec:
                  files:
                    - /manifests/deployment.yaml
              valuesPaths:
                - /manifests/values.yaml
      artifacts:
        primary:
          sources:
            - identifier: docker_image
              type: DockerRegistry
              spec:
                connectorRef: docker_connector
                imagePath: myorg/myapp
                tag: <+input>
      variables:
        - name: replicas
          type: String
          value: "3"
```

## Environment Definition

```yaml
environment:
  name: Production
  identifier: production
  type: Production
  variables:
    - name: namespace
      type: String
      value: prod
```

## Infrastructure Definition

```yaml
infrastructureDefinition:
  name: Production K8s
  identifier: prod_k8s
  environmentRef: production
  deploymentType: Kubernetes
  type: KubernetesDirect
  spec:
    connectorRef: k8s_connector
    namespace: <+env.variables.namespace>
    releaseName: release-<+INFRA_KEY>
```

## Deployment Strategies

### Rolling Deployment
```yaml
execution:
  steps:
    - step:
        name: Rolling Deploy
        type: K8sRollingDeploy
        timeout: 10m
        spec:
          skipDryRun: false
  rollbackSteps:
    - step:
        type: K8sRollingRollback
        spec: {}
```

### Blue-Green Deployment
```yaml
execution:
  steps:
    - step:
        name: Stage Deployment
        type: K8sBGStageDeployment
        spec:
          skipDryRun: false
    - step:
        name: Swap Services
        type: K8sBGSwapServices
        spec:
          skipDryRun: false
  rollbackSteps:
    - step:
        type: K8sBGSwapServicesRollback
        spec: {}
```

### Canary Deployment
```yaml
execution:
  steps:
    - step:
        name: Canary Deploy
        type: K8sCanaryDeploy
        spec:
          instanceSelection:
            type: Count
            spec:
              count: 1
    - step:
        name: Verify Canary
        type: Verify
        spec:
          type: Canary
          spec:
            sensitivity: MEDIUM
            duration: 15m
    - step:
        name: Canary Delete
        type: K8sCanaryDelete
    - step:
        name: Rolling Deploy
        type: K8sRollingDeploy
```

## Approval Steps

### Manual Approval
```yaml
- step:
    name: Approval
    type: HarnessApproval
    timeout: 1d
    spec:
      approvalMessage: Please approve deployment
      approvers:
        minimumCount: 1
        userGroups:
          - account.Engineering_Managers
```

### Jira Approval
```yaml
- step:
    name: Jira Approval
    type: JiraApproval
    spec:
      connectorRef: jira_connector
      projectKey: PROJ
      issueKey: <+input>
      approvalCriteria:
        type: KeyValues
        spec:
          conditions:
            - key: Status
              operator: equals
              value: Approved
```

## CD Expressions

| Expression | Description |
|------------|-------------|
| `<+service.name>` | Service name |
| `<+env.name>` | Environment name |
| `<+env.type>` | Production/PreProduction |
| `<+infra.namespace>` | K8s namespace |
| `<+artifact.tag>` | Artifact tag |
| `<+artifact.image>` | Full image path |

## Failure Strategies

```yaml
failureStrategies:
  - onFailure:
      errors:
        - AllErrors
      action:
        type: StageRollback
  - onFailure:
      errors:
        - Timeout
      action:
        type: Retry
        spec:
          retryCount: 3
          retryInterval: 1m
```

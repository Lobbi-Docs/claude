# Harness Templates

## Template Types

| Type | Description |
|------|-------------|
| Step | Reusable step |
| Stage | Complete stage |
| Pipeline | Full pipeline |
| StepGroup | Group of steps |

## Step Template

```yaml
template:
  name: Notify Slack
  identifier: notify_slack
  versionLabel: "1.0.0"
  type: Step
  spec:
    type: ShellScript
    timeout: 1m
    spec:
      shell: Bash
      source:
        type: Inline
        spec:
          script: |
            curl -X POST $SLACK_WEBHOOK \
              -H 'Content-Type: application/json' \
              -d '{"text": "<+input>"}'
      environmentVariables:
        - name: SLACK_WEBHOOK
          type: Secret
          value: <+input>
```

## Stage Template

```yaml
template:
  name: Standard Deploy
  identifier: standard_deploy
  versionLabel: "1.0.0"
  type: Stage
  spec:
    type: Deployment
    spec:
      deploymentType: Kubernetes
      service:
        serviceRef: <+input>
      environment:
        environmentRef: <+input>
      execution:
        steps:
          - step:
              name: Rolling Deploy
              type: K8sRollingDeploy
              spec:
                skipDryRun: false
        rollbackSteps:
          - step:
              type: K8sRollingRollback
              spec: {}
```

## Using Templates

```yaml
pipeline:
  name: My Pipeline
  stages:
    - stage:
        name: Deploy
        template:
          templateRef: standard_deploy
          versionLabel: "1.0.0"
          templateInputs:
            type: Deployment
            spec:
              service:
                serviceRef: my_service
              environment:
                environmentRef: production
```

## Template Inputs

```yaml
# Define inputs in template
variables:
  - name: environment
    type: String
    value: <+input>
  - name: replicas
    type: String
    value: <+input>.default(3)
  - name: region
    type: String
    value: <+input>.allowedValues(us-east-1,us-west-2,eu-west-1)
```

## Best Practices

1. Version all templates
2. Use semantic versioning
3. Document inputs
4. Test before promoting
5. Use template library for sharing

# Harness Triggers Reference

Complete guide to all trigger types in Harness NextGen CD.

## Trigger Types Overview

| Trigger Type | Use Case | Automatic | Event Source |
|--------------|----------|-----------|--------------|
| Webhook | Git push, PR, tag | Yes | GitHub, GitLab, Bitbucket |
| Scheduled | Cron-based | Yes | Time-based |
| Manifest | Helm/Kubernetes | Yes | Manifest changes |
| Artifact | New artifact version | Yes | Docker, ECR, GCR, ACR |
| Pipeline | Chain pipelines | No | Other pipeline |
| Custom | API-triggered | No | External systems |

## Webhook Triggers

### GitHub Push Trigger

```yaml
trigger:
  name: GitHub Push Trigger
  identifier: github_push
  enabled: true
  description: Trigger on push to main branch
  tags: {}
  orgIdentifier: default
  projectIdentifier: default
  pipelineIdentifier: my_pipeline
  source:
    type: Webhook
    spec:
      type: Github
      spec:
        type: Push
        spec:
          connectorRef: github_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
            - key: sourceBranch
              operator: Regex
              value: ^feature/.*
          headerConditions:
            - key: X-GitHub-Event
              operator: Equals
              value: push
          jexlCondition: <+trigger.payload.repository.name> == "myapp"
          actions: []
  inputYaml: |
    pipeline:
      identifier: my_pipeline
      stages:
        - stage:
            identifier: deploy
            type: Deployment
            spec:
              service:
                serviceInputs:
                  serviceDefinition:
                    type: Kubernetes
                    spec:
                      artifacts:
                        primary:
                          primaryArtifactRef: <+input>
                          sources:
                            - identifier: docker_image
                              type: DockerRegistry
                              spec:
                                tag: <+trigger.payload.after[0..7]>
```

### GitHub Pull Request Trigger

```yaml
trigger:
  name: GitHub PR Trigger
  identifier: github_pr
  enabled: true
  source:
    type: Webhook
    spec:
      type: Github
      spec:
        type: PullRequest
        spec:
          connectorRef: github_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
            - key: sourceBranch
              operator: StartsWith
              value: feature/
            - key: action
              operator: In
              value: opened,synchronize,reopened
          headerConditions: []
  inputYaml: |
    pipeline:
      identifier: my_pipeline
      variables:
        - name: pr_number
          type: String
          value: <+trigger.payload.pull_request.number>
        - name: pr_title
          type: String
          value: <+trigger.payload.pull_request.title>
```

### GitHub Tag Trigger

```yaml
trigger:
  name: GitHub Tag Trigger
  identifier: github_tag
  enabled: true
  source:
    type: Webhook
    spec:
      type: Github
      spec:
        type: Tag
        spec:
          connectorRef: github_connector
          autoAbortPreviousExecutions: false
          payloadConditions:
            - key: tag
              operator: Regex
              value: ^v[0-9]+\.[0-9]+\.[0-9]+$  # Semantic versioning
  inputYaml: |
    pipeline:
      identifier: my_pipeline
      variables:
        - name: release_tag
          type: String
          value: <+trigger.payload.ref>
```

### GitLab Trigger

```yaml
trigger:
  name: GitLab Push Trigger
  identifier: gitlab_push
  enabled: true
  source:
    type: Webhook
    spec:
      type: Gitlab
      spec:
        type: Push
        spec:
          connectorRef: gitlab_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
```

### Bitbucket Trigger

```yaml
trigger:
  name: Bitbucket Push Trigger
  identifier: bitbucket_push
  enabled: true
  source:
    type: Webhook
    spec:
      type: Bitbucket
      spec:
        type: Push
        spec:
          connectorRef: bitbucket_connector
          autoAbortPreviousExecutions: true
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
```

### Custom Webhook Trigger

```yaml
trigger:
  name: Custom Webhook
  identifier: custom_webhook
  enabled: true
  source:
    type: Webhook
    spec:
      type: Custom
      spec:
        payloadConditions:
          - key: event_type
            operator: Equals
            value: deployment
        headerConditions:
          - key: X-Custom-Token
            operator: Equals
            value: <+secrets.getValue("webhook_token")>
```

## Scheduled Triggers

### Cron Schedule

```yaml
trigger:
  name: Nightly Deployment
  identifier: nightly_deployment
  enabled: true
  tags: {}
  orgIdentifier: default
  projectIdentifier: default
  pipelineIdentifier: my_pipeline
  source:
    type: Scheduled
    spec:
      type: Cron
      spec:
        expression: 0 0 * * *  # Every day at midnight
        timezone: America/New_York
  inputYaml: |
    pipeline:
      identifier: my_pipeline
      variables:
        - name: environment
          type: String
          value: production
```

### Common Cron Expressions

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 15 minutes | `*/15 * * * *` | Every 15 minutes |
| Hourly | `0 * * * *` | At minute 0 of every hour |
| Daily at midnight | `0 0 * * *` | Every day at 00:00 |
| Daily at 2 AM | `0 2 * * *` | Every day at 02:00 |
| Weekly on Monday | `0 0 * * 1` | Every Monday at 00:00 |
| Monthly on 1st | `0 0 1 * *` | 1st day of month at 00:00 |
| Weekdays only | `0 9 * * 1-5` | Mon-Fri at 09:00 |
| Business hours | `0 9-17 * * 1-5` | Mon-Fri, 9 AM - 5 PM |

### Multiple Schedules

```yaml
# Trigger 1: Weekday deployments
trigger:
  name: Weekday Deploy
  identifier: weekday_deploy
  source:
    type: Scheduled
    spec:
      type: Cron
      spec:
        expression: 0 9 * * 1-5  # Mon-Fri at 9 AM

---
# Trigger 2: Weekend deployments
trigger:
  name: Weekend Deploy
  identifier: weekend_deploy
  source:
    type: Scheduled
    spec:
      type: Cron
      spec:
        expression: 0 2 * * 0,6  # Sat-Sun at 2 AM
```

## Artifact Triggers

### Docker Registry Trigger

```yaml
trigger:
  name: Docker Image Trigger
  identifier: docker_trigger
  enabled: true
  source:
    type: Artifact
    spec:
      type: DockerRegistry
      spec:
        connectorRef: dockerhub_connector
        imagePath: myorg/myapp
        tag: <+trigger.artifact.build>
        eventConditions:
          - key: build
            operator: Regex
            value: ^v[0-9]+\.[0-9]+\.[0-9]+$
        metaDataConditions: []
  inputYaml: |
    pipeline:
      identifier: my_pipeline
      stages:
        - stage:
            identifier: deploy
            type: Deployment
            spec:
              service:
                serviceInputs:
                  serviceDefinition:
                    spec:
                      artifacts:
                        primary:
                          primaryArtifactRef: <+input>
                          sources:
                            - identifier: docker_image
                              type: DockerRegistry
                              spec:
                                tag: <+trigger.artifact.build>
```

### Amazon ECR Trigger

```yaml
trigger:
  name: ECR Image Trigger
  identifier: ecr_trigger
  enabled: true
  source:
    type: Artifact
    spec:
      type: Ecr
      spec:
        connectorRef: aws_connector
        imagePath: myapp
        region: us-west-2
        registryId: "123456789012"
        tag: <+trigger.artifact.build>
```

### Google GCR Trigger

```yaml
trigger:
  name: GCR Image Trigger
  identifier: gcr_trigger
  enabled: true
  source:
    type: Artifact
    spec:
      type: Gcr
      spec:
        connectorRef: gcp_connector
        imagePath: my-project/myapp
        registryHostname: gcr.io
        tag: <+trigger.artifact.build>
```

### Azure ACR Trigger

```yaml
trigger:
  name: ACR Image Trigger
  identifier: acr_trigger
  enabled: true
  source:
    type: Artifact
    spec:
      type: Acr
      spec:
        connectorRef: azure_connector
        subscriptionId: xxx
        registry: myregistry
        repository: myapp
        tag: <+trigger.artifact.build>
```

## Manifest Triggers

### Helm Chart Trigger

```yaml
trigger:
  name: Helm Chart Trigger
  identifier: helm_trigger
  enabled: true
  source:
    type: Manifest
    spec:
      type: HelmChart
      spec:
        store:
          type: Http
          spec:
            connectorRef: helm_connector
        chartName: myapp
        chartVersion: <+trigger.manifest.version>
        eventConditions:
          - key: version
            operator: Regex
            value: ^[0-9]+\.[0-9]+\.[0-9]+$
```

## Pipeline Chaining Trigger

### Trigger from Another Pipeline

```yaml
trigger:
  name: Pipeline Chaining
  identifier: pipeline_chain
  enabled: true
  source:
    type: Pipeline
    spec:
      pipelineRef: upstream_pipeline
      orgIdentifier: default
      projectIdentifier: default
      eventConditions:
        - key: executionStatus
          operator: Equals
          value: Success
  inputYaml: |
    pipeline:
      identifier: downstream_pipeline
      variables:
        - name: upstream_execution_id
          type: String
          value: <+trigger.pipeline.executionId>
```

## Custom Triggers (API)

### Create Trigger via API

```bash
# Trigger pipeline via API
curl -X POST \
  'https://app.harness.io/gateway/pipeline/api/webhook/custom/v2?accountIdentifier=xxx&orgIdentifier=default&projectIdentifier=default&pipelineIdentifier=my_pipeline&triggerIdentifier=api_trigger' \
  -H 'Content-Type: application/json' \
  -H 'X-API-KEY: <api_key>' \
  -d '{
    "inputs": {
      "environment": "production",
      "image_tag": "v1.0.0"
    }
  }'
```

### Custom Trigger Configuration

```yaml
trigger:
  name: API Trigger
  identifier: api_trigger
  enabled: true
  source:
    type: Webhook
    spec:
      type: Custom
      spec:
        payloadConditions:
          - key: action
            operator: Equals
            value: deploy
        headerConditions:
          - key: Authorization
            operator: Equals
            value: Bearer <+secrets.getValue("api_token")>
```

## Trigger Expressions

### Common Trigger Expressions

| Expression | Description | Example |
|------------|-------------|---------|
| `<+trigger.type>` | Trigger type | Webhook, Scheduled |
| `<+trigger.event>` | Trigger event | PUSH, PR |
| `<+trigger.payload.branch>` | Git branch | main, feature/xyz |
| `<+trigger.payload.commitSha>` | Git commit SHA | abc123... |
| `<+trigger.payload.repository.name>` | Repo name | myapp |
| `<+trigger.payload.pull_request.number>` | PR number | 42 |
| `<+trigger.payload.pull_request.title>` | PR title | Add new feature |
| `<+trigger.payload.after>` | Commit SHA (GitHub) | abc123... |
| `<+trigger.artifact.build>` | Artifact tag | v1.0.0 |
| `<+trigger.manifest.version>` | Manifest version | 2.3.4 |
| `<+trigger.pipeline.executionId>` | Upstream execution | exec-123 |

### GitHub Webhook Payload

```json
{
  "ref": "refs/heads/main",
  "before": "abc123...",
  "after": "def456...",
  "repository": {
    "name": "myapp",
    "full_name": "myorg/myapp",
    "owner": {
      "name": "myorg"
    }
  },
  "pusher": {
    "name": "john.doe",
    "email": "john@example.com"
  },
  "commits": [
    {
      "id": "def456...",
      "message": "Add new feature",
      "author": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

## Advanced Trigger Features

### Auto-Abort Previous Executions

```yaml
spec:
  autoAbortPreviousExecutions: true
```

Automatically aborts previous running executions when a new trigger fires.

### Payload Conditions

```yaml
payloadConditions:
  # Exact match
  - key: targetBranch
    operator: Equals
    value: main

  # Not equals
  - key: targetBranch
    operator: NotEquals
    value: develop

  # Regex match
  - key: sourceBranch
    operator: Regex
    value: ^feature/.*

  # Starts with
  - key: sourceBranch
    operator: StartsWith
    value: hotfix/

  # Ends with
  - key: sourceBranch
    operator: EndsWith
    value: /stable

  # In list
  - key: action
    operator: In
    value: opened,reopened,synchronize

  # Not in list
  - key: action
    operator: NotIn
    value: closed,labeled
```

### JEXL Conditions

```yaml
jexlCondition: |
  <+trigger.payload.repository.name> == "myapp" &&
  <+trigger.payload.pusher.email>.endsWith("@example.com") &&
  <+trigger.payload.commits>.size() > 0
```

### Input Set Override

```yaml
inputYaml: |
  pipeline:
    identifier: my_pipeline
    variables:
      - name: git_branch
        type: String
        value: <+trigger.payload.ref>
      - name: commit_sha
        type: String
        value: <+trigger.payload.after>
      - name: author
        type: String
        value: <+trigger.payload.pusher.name>
    stages:
      - stage:
          identifier: build
          type: CI
          spec:
            execution:
              steps:
                - step:
                    identifier: echo
                    type: Run
                    spec:
                      command: |
                        echo "Branch: <+pipeline.variables.git_branch>"
                        echo "Commit: <+pipeline.variables.commit_sha>"
                        echo "Author: <+pipeline.variables.author>"
```

## Trigger Notifications

### Slack Notification on Trigger

```yaml
pipeline:
  notificationRules:
    - name: Trigger Notification
      identifier: trigger_notification
      pipelineEvents:
        - type: PipelineStart
      notificationMethod:
        type: Slack
        spec:
          userGroups: []
          webhookUrl: <+secrets.getValue("slack_webhook")>
          messageContent: |
            Pipeline triggered by: <+trigger.type>
            Event: <+trigger.event>
            Branch: <+trigger.payload.ref>
```

## Best Practices

1. **Use specific branch patterns** - Avoid triggering on all branches
2. **Implement payload conditions** - Filter unwanted events
3. **Enable auto-abort** - For frequently updated branches
4. **Use secrets for tokens** - Never hardcode API keys
5. **Test triggers in dev first** - Verify conditions work as expected
6. **Monitor trigger failures** - Set up notifications
7. **Document trigger logic** - Explain conditions and purpose
8. **Use JEXL for complex logic** - When simple conditions aren't enough
9. **Implement rate limiting** - Avoid trigger storms
10. **Version control triggers** - Store as YAML in Git

## Troubleshooting

### Trigger Not Firing

**Checklist:**
1. Verify trigger is enabled
2. Check payload conditions match
3. Validate connector is working
4. Review webhook delivery in Git provider
5. Check trigger execution history
6. Verify JEXL conditions are correct

### Trigger Fires Too Often

**Solution:**
1. Add more specific payload conditions
2. Enable auto-abort previous executions
3. Use branch filters
4. Implement debouncing logic

### Wrong Input Values

**Solution:**
1. Verify trigger expressions are correct
2. Check payload structure
3. Test with actual webhook payload
4. Use input set for complex mappings

### Webhook Not Received

**Solution:**
1. Check firewall rules
2. Verify webhook URL is accessible
3. Check Git provider webhook logs
4. Validate webhook secret (if configured)

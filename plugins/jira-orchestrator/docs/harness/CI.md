# Harness CI (Continuous Integration)

## Infrastructure Types

### Harness Cloud (Recommended)
```yaml
infrastructure:
  type: Cloud
  spec:
    os: Linux  # Linux, MacOS, Windows
```

### Kubernetes
```yaml
infrastructure:
  type: KubernetesDirect
  spec:
    connectorRef: k8s_connector
    namespace: harness-builds
    os: Linux
```

## Pipeline Structure

```yaml
pipeline:
  name: Build Pipeline
  identifier: build_pipeline
  stages:
    - stage:
        name: Build
        type: CI
        spec:
          cloneCodebase: true
          infrastructure:
            type: Cloud
            spec:
              os: Linux
          execution:
            steps:
              - step:
                  name: Build
                  type: Run
                  spec:
                    shell: Sh
                    command: |
                      npm ci
                      npm run build
```

## Step Types

### Run Step
```yaml
- step:
    name: Run Tests
    type: Run
    spec:
      shell: Sh  # Sh, Bash, Powershell, Python
      command: npm test
      envVariables:
        NODE_ENV: test
      reports:
        type: JUnit
        spec:
          paths:
            - "**/junit.xml"
```

### Run Tests (Test Intelligence)
```yaml
- step:
    name: Tests with TI
    type: RunTests
    spec:
      language: Java  # Java, Python, CSharp, Ruby
      buildTool: Maven  # Maven, Gradle, Pytest, etc.
      runOnlySelectedTests: true  # Enable TI
      args: test
      reports:
        type: JUnit
        spec:
          paths:
            - "**/surefire-reports/*.xml"
```

### Build and Push Docker
```yaml
- step:
    name: Build and Push
    type: BuildAndPushDockerRegistry
    spec:
      connectorRef: docker_connector
      repo: myorg/myapp
      tags:
        - <+pipeline.sequenceId>
        - latest
      dockerfile: Dockerfile
      caching: true
      optimize: true
```

### Build and Push ECR
```yaml
- step:
    type: BuildAndPushECR
    spec:
      connectorRef: aws_connector
      region: us-east-1
      account: "123456789012"
      imageName: myapp
      tags:
        - <+pipeline.sequenceId>
```

## Caching

### Save Cache (S3)
```yaml
- step:
    type: SaveCacheS3
    spec:
      connectorRef: aws_connector
      bucket: harness-cache
      key: npm-{{ checksum "package-lock.json" }}
      sourcePaths:
        - node_modules
```

### Restore Cache
```yaml
- step:
    type: RestoreCacheS3
    spec:
      connectorRef: aws_connector
      bucket: harness-cache
      key: npm-{{ checksum "package-lock.json" }}
      failIfKeyNotFound: false
```

## Parallelism

### Matrix Strategy
```yaml
- step:
    name: Test Matrix
    type: Run
    spec:
      command: npm test
    strategy:
      matrix:
        nodeVersion: ["16", "18", "20"]
        os: [linux, macos]
      maxConcurrency: 4
```

### Parallel Steps
```yaml
- parallel:
    - step:
        name: Lint
        type: Run
        spec:
          command: npm run lint
    - step:
        name: Test
        type: Run
        spec:
          command: npm test
```

## Background Services

```yaml
- step:
    name: PostgreSQL
    type: Background
    spec:
      image: postgres:14
      envVariables:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
      portBindings:
        "5432": "5432"
```

## CI Expressions

| Expression | Description |
|------------|-------------|
| `<+codebase.branch>` | Git branch |
| `<+codebase.commitSha>` | Full commit SHA |
| `<+codebase.shortCommitSha>` | Short SHA (7 chars) |
| `<+codebase.prNumber>` | PR number |
| `<+codebase.prTitle>` | PR title |
| `<+pipeline.sequenceId>` | Build number |

## Triggers

### Push Trigger
```yaml
trigger:
  name: Build on Push
  source:
    type: Webhook
    spec:
      type: Harness
      spec:
        type: Push
        spec:
          connectorRef: harness_code
          repoName: my-service
          payloadConditions:
            - key: targetBranch
              operator: Equals
              value: main
```

### PR Trigger
```yaml
trigger:
  name: Build on PR
  source:
    type: Webhook
    spec:
      type: Harness
      spec:
        type: PullRequest
        spec:
          connectorRef: harness_code
          actions:
            - Open
            - Synchronize
```

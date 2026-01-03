---
name: harness-ci
description: Harness CI (Continuous Integration) for container-native builds with test intelligence, caching, parallelization, and build infrastructure management
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Task, WebFetch, WebSearch]
dependencies: [harness-mcp, harness-cd]
triggers: [harness ci, harness build, build pipeline, ci pipeline, test intelligence, ci infrastructure]
---

# Harness CI Skill

Container-native CI builds with test intelligence, caching, parallelization, and infrastructure management.

## Build Infrastructure Types

**Harness Cloud (Recommended):** Zero-config hosted infrastructure with auto-scaling, pre-installed tools, managed updates.

```yaml
infrastructure:
  type: Cloud
  spec:
    os: Linux  # Linux, MacOS, or Windows
```

**Kubernetes (Self-hosted):**
```yaml
infrastructure:
  type: KubernetesDirect
  spec:
    connectorRef: k8s_connector
    namespace: harness-builds
    nodeSelector:
      kubernetes.io/os: linux
    os: Linux
```

**VM Infrastructure:** AWS, Azure, or GCP VMs with pool-based scaling.

## CI Pipeline Structure

**Basic Pipeline:**
```yaml
pipeline:
  name: Build Pipeline
  identifier: build_pipeline
  properties:
    ci:
      codebase:
        connectorRef: harness_code
        repoName: my-service
        build: <+input>
  stages:
    - stage:
        name: Build and Test
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
                  name: Install
                  type: Run
                  spec:
                    shell: Sh
                    command: npm ci
              - step:
                  name: Test
                  type: Run
                  spec:
                    shell: Sh
                    command: npm test -- --coverage
              - step:
                  name: Build
                  type: Run
                  spec:
                    shell: Sh
                    command: npm run build
```

## Step Types

**Run Step:** Execute shell commands
```yaml
- step:
    name: Build
    type: Run
    spec:
      image: node:18-alpine
      shell: Sh
      command: npm run build
      envVariables:
        NODE_ENV: production
      resources:
        limits:
          memory: 2Gi
          cpu: "1"
```

**RunTests Step (Test Intelligence):**
```yaml
- step:
    name: Test with TI
    type: RunTests
    spec:
      language: Java  # Java, Kotlin, Scala, CSharp, Python, Ruby
      buildTool: Maven  # Maven, Gradle, Bazel, SBT, Nunit, Pytest, Unittest, Rspec
      runOnlySelectedTests: true  # Enable Test Intelligence
      testAnnotations: org.junit.Test
      packages: com.myapp
      args: test
      enableTestSplitting: true  # Parallel execution
```

**Build and Push Docker:**
```yaml
- step:
    name: Build and Push
    type: BuildAndPushDockerRegistry
    spec:
      connectorRef: docker_connector
      repo: myorg/myapp
      tags:
        - <+pipeline.sequenceId>
        - <+codebase.shortCommitSha>
        - latest
      dockerfile: Dockerfile
      caching: true
      optimize: true
      buildArgs:
        VERSION: <+pipeline.sequenceId>
```

**Build and Push ECR/GCR/ACR:**
```yaml
# ECR
- step:
    type: BuildAndPushECR
    spec:
      connectorRef: aws_connector
      region: us-east-1
      imageName: myapp
      tags: [<+pipeline.sequenceId>]

# GCR
- step:
    type: BuildAndPushGCR
    spec:
      connectorRef: gcp_connector
      projectID: my-project
      imageName: myapp
      tags: [<+pipeline.sequenceId>]

# ACR
- step:
    type: BuildAndPushACR
    spec:
      connectorRef: azure_connector
      repository: myacr.azurecr.io/myapp
      tags: [<+pipeline.sequenceId>]
```

## Caching Strategies

**S3 Cache:**
```yaml
# Save
- step:
    name: Save Cache
    type: SaveCacheS3
    spec:
      connectorRef: aws_connector
      bucket: harness-cache
      key: npm-{{ checksum "package-lock.json" }}
      sourcePaths: [node_modules]

# Restore
- step:
    name: Restore Cache
    type: RestoreCacheS3
    spec:
      connectorRef: aws_connector
      bucket: harness-cache
      key: npm-{{ checksum "package-lock.json" }}
      failIfKeyNotFound: false
```

**GCS Cache:**
```yaml
# Save
- step:
    type: SaveCacheGCS
    spec:
      connectorRef: gcp_connector
      bucket: harness-cache
      key: maven-{{ checksum "pom.xml" }}
      sourcePaths: [~/.m2/repository]

# Restore
- step:
    type: RestoreCacheGCS
    spec:
      connectorRef: gcp_connector
      bucket: harness-cache
      key: maven-{{ checksum "pom.xml" }}
```

## Parallelism & Matrix

**Matrix Strategy:** Run steps with multiple configurations
```yaml
- step:
    name: Test Matrix
    type: Run
    spec:
      shell: Sh
      command: npm test
      envVariables:
        NODE_VERSION: <+matrix.nodeVersion>
        DB_TYPE: <+matrix.database>
    strategy:
      matrix:
        nodeVersion: ["16", "18", "20"]
        database: [postgres, mysql]
        exclude:
          - nodeVersion: "16"
            database: mysql
      maxConcurrency: 4
```

**Parallelism:** Run same step multiple times
```yaml
- step:
    name: Parallel Tests
    type: Run
    spec:
      shell: Sh
      command: npm test -- --shard=$HARNESS_STAGE_INDEX/$HARNESS_STAGE_TOTAL
    strategy:
      parallelism: 4
```

**Step Groups for Parallelism:**
```yaml
- stepGroup:
    name: Parallel Build
    steps:
      - parallel:
          - step:
              name: Build Frontend
              type: Run
              spec:
                command: npm run build:frontend
          - step:
              name: Build Backend
              type: Run
              spec:
                command: npm run build:backend
```

## Background Services

Start services for integration tests:
```yaml
# Database
- step:
    name: PostgreSQL
    type: Background
    spec:
      image: postgres:14
      envVariables:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: testdb
      portBindings:
        "5432": "5432"
      resources:
        limits:
          memory: 1Gi

# Redis
- step:
    name: Redis
    type: Background
    spec:
      image: redis:7-alpine
      portBindings:
        "6379": "6379"

# Wait for services
- step:
    name: Wait
    type: Run
    spec:
      shell: Sh
      command: |
        until pg_isready -h localhost -p 5432; do sleep 1; done
        until redis-cli -h localhost ping; do sleep 1; done
```

## Test Intelligence (TI)

**Configuration:**
```yaml
- step:
    type: RunTests
    spec:
      language: Java
      buildTool: Maven
      runOnlySelectedTests: true  # Enable TI
      testGlobs: "**/test/**/*.java"
      packages: com.mycompany
```

**Supported Languages:** Java, Kotlin, Scala, C#, Python, Ruby

**Test Splitting:**
```yaml
- step:
    type: RunTests
    spec:
      language: Python
      buildTool: Pytest
      enableTestSplitting: true  # Split across instances
      testSplitStrategy: ClassTiming  # or TestCount
    strategy:
      parallelism: 4
```

## Plugins

**Slack Notification:**
```yaml
- step:
    name: Notify Slack
    type: Plugin
    spec:
      image: plugins/slack
      settings:
        webhook: <+secrets.getValue("slack_webhook")>
        channel: builds
        template: |
          Build {{#success build.status}}succeeded{{else}}failed{{/success}}
          Branch: {{build.branch}}, Commit: {{build.commit}}
```

**S3 Upload:**
```yaml
- step:
    name: Upload Artifacts
    type: Plugin
    spec:
      image: plugins/s3
      settings:
        bucket: build-artifacts
        source: dist/**/*
        target: builds/<+pipeline.sequenceId>
```

**GitHub Actions:**
```yaml
- step:
    name: Setup Node
    type: Action
    spec:
      uses: actions/setup-node@v3
      with:
        node-version: "18"
        cache: npm
```

## Artifact Management

**S3 Upload:**
```yaml
- step:
    name: Upload to S3
    type: S3Upload
    spec:
      connectorRef: aws_connector
      bucket: build-artifacts
      sourcePath: dist/
      target: builds/<+pipeline.sequenceId>/
```

**GCS Upload:**
```yaml
- step:
    name: Upload to GCS
    type: GCSUpload
    spec:
      connectorRef: gcp_connector
      bucket: build-artifacts
      sourcePath: dist/
      target: builds/<+pipeline.sequenceId>/
```

## CI Expressions

| Expression | Description |
|------------|-------------|
| `<+codebase.branch>` | Git branch name |
| `<+codebase.commitSha>` | Full commit SHA |
| `<+codebase.shortCommitSha>` | Short SHA (7 chars) |
| `<+codebase.commitMessage>` | Commit message |
| `<+codebase.repoUrl>` | Repository URL |
| `<+codebase.prNumber>` | PR number |
| `<+codebase.prTitle>` | PR title |
| `<+pipeline.sequenceId>` | Build number |
| `<+pipeline.executionId>` | Execution UUID |

## Triggers

**Push Trigger:**
```yaml
trigger:
  name: Build on Push
  enabled: true
  pipelineIdentifier: build_pipeline
  source:
    type: Webhook
    spec:
      type: Push
      spec:
        connectorRef: harness_code
        repoName: my-service
        autoAbortPreviousExecutions: true
        payloadConditions:
          - key: targetBranch
            operator: In
            value: [main, develop]
```

**Pull Request Trigger:**
```yaml
trigger:
  name: Build on PR
  source:
    spec:
      type: PullRequest
      spec:
        connectorRef: harness_code
        repoName: my-service
        actions: [Open, Reopen, Synchronize]
        payloadConditions:
          - key: targetBranch
            operator: Equals
            value: main
```

**Tag Trigger:**
```yaml
trigger:
  name: Build on Tag
  source:
    spec:
      type: Tag
      spec:
        connectorRef: harness_code
        tagCondition:
          operator: Regex
          value: "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Build timeout | Long-running step | Increase timeout, optimize |
| Cache miss | Key mismatch | Check checksum file path |
| Image pull failed | Auth issue | Verify connector creds |
| TI not working | Missing config | Check language/buildTool |
| Out of memory | Resource limits | Increase memory in step |

**Debug Info:**
```yaml
- step:
    name: Debug
    type: Run
    spec:
      shell: Sh
      command: |
        echo "Branch: <+codebase.branch>"
        echo "Commit: <+codebase.commitSha>"
        echo "Build: <+pipeline.sequenceId>"
        env | sort
        df -h
        free -m
```

## Related Documentation

- [Harness CI Docs](https://developer.harness.io/docs/continuous-integration)
- [Test Intelligence](https://developer.harness.io/docs/continuous-integration/use-ci/run-tests/ti-overview)
- [Caching](https://developer.harness.io/docs/continuous-integration/use-ci/caching-ci-data/caching-overview)
- [Build Infrastructure](https://developer.harness.io/docs/continuous-integration/use-ci/set-up-build-infrastructure)

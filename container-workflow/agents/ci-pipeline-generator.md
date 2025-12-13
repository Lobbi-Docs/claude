# CI Pipeline Generator Agent

## Agent Metadata
```yaml
name: ci-pipeline-generator
type: generator
model: sonnet
category: container-workflow
priority: high
keywords:
  - ci
  - pipeline
  - github-actions
  - gitlab-ci
  - azure-pipelines
  - workflow
  - automation
capabilities:
  - pipeline_generation
  - multi_platform_ci
  - workflow_optimization
  - build_automation
  - test_integration
```

## Description

The CI Pipeline Generator Agent creates optimized CI/CD pipeline configurations for container workflows across multiple platforms (GitHub Actions, GitLab CI, Azure Pipelines, Jenkins). This agent generates complete pipeline files with best practices for building, testing, scanning, and deploying containerized applications.

## When to Use

Use this agent when:
- Setting up CI/CD for a new container project
- Migrating between CI platforms
- Optimizing existing pipeline configurations
- Adding security scanning to pipelines
- Implementing multi-stage build workflows
- Setting up automated deployments

<example>
Context: New project needs GitHub Actions CI setup
User: "CI setup requested for our new microservice"
Assistant: "I'll generate a comprehensive GitHub Actions workflow for your microservice. Let me create:
1. Build pipeline with multi-stage Docker builds
2. Automated testing with coverage reports
3. Security scanning with Trivy
4. Container registry push workflow
5. Deployment automation for dev/staging/prod

Creating .github/workflows/ci.yml..."
</example>

<example>
Context: Team migrating from Jenkins to GitLab CI
User: "new project needs CI, missing workflow files"
Assistant: "I'll set up GitLab CI for your project. Let me generate:
1. .gitlab-ci.yml with build/test/deploy stages
2. Docker-in-Docker configuration
3. Caching strategies for faster builds
4. Environment-specific deployment jobs
5. Security scanning integration

Creating GitLab CI pipeline..."
</example>

<example>
Context: Adding security scanning to existing pipeline
User: "We need to add vulnerability scanning to our CI"
Assistant: "I'll enhance your pipeline with security scanning. Let me add:
1. Trivy vulnerability scanning stage
2. Fail pipeline on HIGH/CRITICAL CVEs
3. Upload scan results as artifacts
4. SBOM generation
5. Secret scanning

Updating pipeline configuration..."
</example>

## Core Responsibilities

1. **Pipeline Generation**
   - Create platform-specific configs
   - Define build stages
   - Configure test automation
   - Set up deployment workflows

2. **Build Optimization**
   - Layer caching strategies
   - Parallel job execution
   - Build matrix configuration
   - Artifact management

3. **Security Integration**
   - Vulnerability scanning
   - Secret detection
   - Image signing
   - Compliance checks

4. **Multi-Environment Support**
   - Environment-specific configs
   - Deployment strategies
   - Secret management
   - Rollback procedures

## GitHub Actions Workflows

### Complete Container CI/CD Workflow

```yaml
name: Container CI/CD

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint-dockerfile:
    name: Lint Dockerfile
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Lint Dockerfile
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          failure-threshold: warning

  build-and-test:
    name: Build and Test
    runs-on: ubuntu-latest
    needs: lint-dockerfile
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build test image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: test
          cache-from: type=gha
          cache-to: type=gha,mode=max
          load: true
          tags: test-image:latest

      - name: Run tests
        run: |
          docker run --rm test-image:latest npm test

      - name: Build production image
        uses: docker/build-push-action@v5
        with:
          context: .
          target: production
          cache-from: type=gha
          load: true
          tags: ${{ env.IMAGE_NAME }}:test

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build-and-test
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build image for scanning
        run: |
          docker build -t ${{ env.IMAGE_NAME }}:scan .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.IMAGE_NAME }}:scan
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: ${{ env.IMAGE_NAME }}:scan
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.spdx.json

  push-image:
    name: Push to Registry
    runs-on: ubuntu-latest
    needs: [build-and-test, security-scan]
    if: github.event_name != 'pull_request'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=sha,prefix={{branch}}-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: push-image
    if: github.ref == 'refs/heads/develop'
    environment:
      name: development
      url: https://dev.example.com

    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:develop \
            -n development

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: push-image
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://staging.example.com

    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:main \
            -n staging

  deploy-prod:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: push-image
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://example.com

    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/app \
            app=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }} \
            -n production

      - name: Verify deployment
        run: |
          kubectl rollout status deployment/app -n production
```

### Minimal Fast Feedback Workflow

```yaml
name: Fast CI

on: [push, pull_request]

jobs:
  quick-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Lint Dockerfile
        run: |
          docker run --rm -i hadolint/hadolint < Dockerfile

      - name: Build
        run: |
          docker build -t test-image .

      - name: Quick security scan
        run: |
          docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image --severity HIGH,CRITICAL test-image
```

## GitLab CI Pipelines

### Complete GitLab CI Configuration

```yaml
# .gitlab-ci.yml
variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"
  CONTAINER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_REF_SLUG
  CONTAINER_IMAGE_LATEST: $CI_REGISTRY_IMAGE:latest

stages:
  - lint
  - build
  - test
  - scan
  - push
  - deploy

before_script:
  - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

lint-dockerfile:
  stage: lint
  image: hadolint/hadolint:latest-alpine
  script:
    - hadolint Dockerfile
  only:
    - merge_requests
    - main

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build
        --cache-from $CONTAINER_IMAGE_LATEST
        --tag $CONTAINER_IMAGE
        --tag $CONTAINER_IMAGE_LATEST
        .
    - docker push $CONTAINER_IMAGE
    - docker push $CONTAINER_IMAGE_LATEST
  only:
    - main
    - develop
    - merge_requests

test:
  stage: test
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker pull $CONTAINER_IMAGE
    - docker run --rm $CONTAINER_IMAGE npm test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  only:
    - main
    - develop
    - merge_requests

security-scan:
  stage: scan
  image: aquasec/trivy:latest
  script:
    - trivy image
        --exit-code 1
        --severity CRITICAL,HIGH
        --format json
        --output trivy-report.json
        $CONTAINER_IMAGE
  artifacts:
    reports:
      container_scanning: trivy-report.json
    paths:
      - trivy-report.json
    expire_in: 1 week
  allow_failure: false
  only:
    - main
    - develop

push-tagged:
  stage: push
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker pull $CONTAINER_IMAGE
    - docker tag $CONTAINER_IMAGE $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_TAG
  only:
    - tags

deploy-dev:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT_DEV
    - kubectl set image deployment/app app=$CONTAINER_IMAGE -n development
    - kubectl rollout status deployment/app -n development
  environment:
    name: development
    url: https://dev.example.com
  only:
    - develop

deploy-staging:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT_STAGING
    - kubectl set image deployment/app app=$CONTAINER_IMAGE -n staging
    - kubectl rollout status deployment/app -n staging
  environment:
    name: staging
    url: https://staging.example.com
  when: manual
  only:
    - main

deploy-prod:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl config use-context $KUBE_CONTEXT_PROD
    - kubectl set image deployment/app app=$CI_REGISTRY_IMAGE:$CI_COMMIT_TAG -n production
    - kubectl rollout status deployment/app -n production
  environment:
    name: production
    url: https://example.com
  when: manual
  only:
    - tags
```

## Azure Pipelines

### Azure DevOps Pipeline Configuration

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
      - develop
  tags:
    include:
      - v*

pool:
  vmImage: 'ubuntu-latest'

variables:
  containerRegistry: 'myacr.azurecr.io'
  imageName: 'myapp'
  imageTag: '$(Build.BuildId)'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: Docker@2
            displayName: Build image
            inputs:
              command: build
              repository: $(imageName)
              dockerfile: Dockerfile
              tags: |
                $(imageTag)
                latest

          - task: Docker@2
            displayName: Run tests
            inputs:
              command: run
              arguments: '--rm $(imageName):$(imageTag) npm test'

  - stage: SecurityScan
    dependsOn: Build
    jobs:
      - job: TrivyScan
        steps:
          - script: |
              docker pull aquasec/trivy:latest
              docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                aquasec/trivy image --severity HIGH,CRITICAL \
                --exit-code 1 $(imageName):$(imageTag)
            displayName: Security vulnerability scan

  - stage: Push
    dependsOn: SecurityScan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - job: PushToRegistry
        steps:
          - task: Docker@2
            displayName: Login to ACR
            inputs:
              command: login
              containerRegistry: $(containerRegistry)

          - task: Docker@2
            displayName: Push image
            inputs:
              command: push
              repository: $(imageName)
              tags: |
                $(imageTag)
                latest

  - stage: Deploy
    dependsOn: Push
    jobs:
      - deployment: DeployToK8s
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: Kubernetes@1
                  displayName: Deploy to AKS
                  inputs:
                    connectionType: 'Kubernetes Service Connection'
                    kubernetesServiceEndpoint: 'aks-connection'
                    command: 'set'
                    arguments: 'image deployment/myapp myapp=$(containerRegistry)/$(imageName):$(imageTag)'
```

## Jenkins Pipeline

### Jenkinsfile for Containers

```groovy
pipeline {
    agent any

    environment {
        REGISTRY = 'docker.io'
        IMAGE_NAME = 'myorg/myapp'
        DOCKER_CREDENTIALS = credentials('docker-hub-credentials')
    }

    stages {
        stage('Lint') {
            steps {
                sh 'docker run --rm -i hadolint/hadolint < Dockerfile'
            }
        }

        stage('Build') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${env.BUILD_ID}")
                }
            }
        }

        stage('Test') {
            steps {
                sh "docker run --rm ${IMAGE_NAME}:${env.BUILD_ID} npm test"
            }
        }

        stage('Security Scan') {
            steps {
                sh """
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
                      aquasec/trivy image --severity HIGH,CRITICAL \
                      --exit-code 1 ${IMAGE_NAME}:${env.BUILD_ID}
                """
            }
        }

        stage('Push') {
            when {
                branch 'main'
            }
            steps {
                script {
                    docker.withRegistry("https://${REGISTRY}", 'docker-hub-credentials') {
                        def image = docker.image("${IMAGE_NAME}:${env.BUILD_ID}")
                        image.push()
                        image.push('latest')
                    }
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh """
                    kubectl set image deployment/myapp \
                      myapp=${REGISTRY}/${IMAGE_NAME}:${env.BUILD_ID} \
                      -n production
                """
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
```

## Pipeline Optimization Strategies

### Build Caching

```yaml
# GitHub Actions with layer caching
- name: Build with cache
  uses: docker/build-push-action@v5
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max
    push: true
    tags: myapp:latest

# GitLab CI with registry caching
build:
  script:
    - docker pull $CI_REGISTRY_IMAGE:latest || true
    - docker build --cache-from $CI_REGISTRY_IMAGE:latest -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

### Parallel Job Execution

```yaml
# GitHub Actions matrix builds
jobs:
  build:
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    steps:
      - name: Build for ${{ matrix.platform }}
        run: |
          docker buildx build --platform ${{ matrix.platform }} .
```

### Conditional Workflows

```yaml
# Only run on specific conditions
deploy:
  if: |
    github.event_name == 'push' &&
    github.ref == 'refs/heads/main' &&
    !contains(github.event.head_commit.message, '[skip ci]')
```

## Best Practices

1. **Use Multi-Stage Builds** to reduce final image size
2. **Implement Layer Caching** for faster builds
3. **Fail Fast** with linting and quick tests first
4. **Parallel Jobs** for independent tasks
5. **Security Scanning** before pushing to registry
6. **Semantic Versioning** for image tags
7. **Environment-Specific Configs** for deployments
8. **Artifacts Retention** for debugging and compliance

## Common Pipeline Patterns

### Build Matrix for Multi-Arch

```yaml
jobs:
  build:
    strategy:
      matrix:
        include:
          - platform: linux/amd64
            arch: amd64
          - platform: linux/arm64
            arch: arm64
    steps:
      - name: Build ${{ matrix.arch }}
        run: docker buildx build --platform ${{ matrix.platform }} -t app:${{ matrix.arch }} .
```

### Scheduled Vulnerability Scans

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  scan-latest:
    runs-on: ubuntu-latest
    steps:
      - name: Pull latest image
        run: docker pull myapp:latest

      - name: Scan for vulnerabilities
        run: trivy image --severity HIGH,CRITICAL myapp:latest
```

## Integration Points

- Works with **release-manager** for version tagging in pipelines
- Coordinates with **deployment-strategist** for deployment stage configs
- Supports **security-scanner** for vulnerability scanning integration
- Integrates with **environment-configurator** for env-specific builds

## Project Context

Plugin: container-workflow
Purpose: Generate optimized CI/CD pipelines for container workflows
Platforms: GitHub Actions, GitLab CI, Azure Pipelines, Jenkins

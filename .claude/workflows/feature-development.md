---
name: feature-development
description: End-to-end feature development workflow using multiple agents
pattern: pipeline
agents:
  - planner
  - coder
  - tester
  - reviewer
  - docker-builder
  - k8s-deployer
---

# Feature Development Workflow

## Overview

This workflow orchestrates multiple agents to implement a complete feature from specification to deployment.

## Workflow Stages

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Planner   │────▶│    Coder    │────▶│   Tester    │
│  (Specify)  │     │ (Implement) │     │   (Test)    │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ K8s Deployer│◀────│Docker Builder│◀────│  Reviewer   │
│  (Deploy)   │     │   (Build)   │     │  (Review)   │
└─────────────┘     └─────────────┘     └─────────────┘
\`\`\`

## Stage Definitions

### Stage 1: Planning (planner)

**Input:** Feature request or user story
**Output:** Technical specification

\`\`\`markdown
## Specification Output
- Requirements breakdown
- Technical approach
- File changes needed
- API contracts (if applicable)
- Test scenarios
\`\`\`

**Triggers:**
- User requests new feature
- Product requirement document provided
- Enhancement requested

### Stage 2: Implementation (coder)

**Input:** Technical specification from planner
**Output:** Working code

**Tasks:**
- Write implementation code
- Add necessary imports
- Update configurations
- Create/update API endpoints
- Add error handling

**Language Selection:**
- Python files → `python-specialist`
- TypeScript files → `typescript-specialist`
- Go files → `go-specialist`

### Stage 3: Testing (tester)

**Input:** Implemented code
**Output:** Test suite

**Tasks:**
- Write unit tests
- Write integration tests
- Verify edge cases
- Check error handling
- Run test suite

**Quality Gates:**
- Minimum 80% code coverage
- All tests passing
- No critical linting errors

### Stage 4: Code Review (reviewer)

**Input:** Code + tests
**Output:** Review feedback

**Checklist:**
- [ ] Code follows style guidelines
- [ ] No security vulnerabilities
- [ ] Tests are comprehensive
- [ ] Error handling is appropriate
- [ ] Documentation is adequate

**Parallel Reviews (optional):**
\`\`\`yaml
parallel_agents:
  - security-auditor  # Security review
  - code-analyzer     # Quality analysis
\`\`\`

### Stage 5: Build (docker-builder)

**Input:** Approved code
**Output:** Docker image

**Tasks:**
- Build Docker image
- Run security scan (Trivy)
- Tag with version
- Push to registry

### Stage 6: Deploy (k8s-deployer)

**Input:** Docker image
**Output:** Deployed service

**Tasks:**
- Update Helm values
- Deploy to staging
- Run smoke tests
- Deploy to production (if approved)

## Workflow Configuration

\`\`\`yaml
# .claude/workflows/feature-development.yaml
name: feature-development
version: 1.0.0

stages:
  - name: plan
    agent: planner
    timeout: 10m
    outputs:
      - specification.md

  - name: implement
    agent: coder
    timeout: 30m
    depends_on: [plan]
    inputs:
      spec: "{{stages.plan.outputs.specification}}"

  - name: test
    agent: tester
    timeout: 20m
    depends_on: [implement]
    quality_gates:
      coverage: 80
      tests_passing: true

  - name: review
    agent: reviewer
    timeout: 15m
    depends_on: [test]
    parallel:
      - security-auditor
      - code-analyzer
    approval_required: true

  - name: build
    agent: docker-builder
    timeout: 10m
    depends_on: [review]
    condition: "{{stages.review.approved}}"

  - name: deploy
    agent: k8s-deployer
    timeout: 15m
    depends_on: [build]
    environments:
      - staging
      - production

notifications:
  on_failure:
    - slack: "#dev-alerts"
  on_success:
    - slack: "#deployments"
\`\`\`

## Invocation

\`\`\`bash
# Start feature development workflow
Task("Feature Development", "Implement user authentication for agents", "hierarchical-coordinator")

# Or invoke directly
/workflow feature-development --input "Add rate limiting to API endpoints"
\`\`\`

## Rollback Procedure

If deployment fails:

1. `k8s-deployer` automatically triggers rollback
2. Previous version restored
3. `incident-responder` notified if production affected
4. Workflow marked as failed with rollback reason

## Success Criteria

- [ ] All stages completed successfully
- [ ] Quality gates passed
- [ ] Code reviewed and approved
- [ ] Tests passing in all environments
- [ ] Deployed and healthy

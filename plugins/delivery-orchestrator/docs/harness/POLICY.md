# Harness Policy as Code (OPA)

## Overview

Harness uses Open Policy Agent (OPA) Rego policies for governance.

## Policy Examples

### Require Approval for Production

```rego
package pipeline

deny[msg] {
    some stage in input.pipeline.stages
    stage.stage.spec.environment.environmentRef == "production"
    not has_approval_step(input.pipeline)
    msg := "Production deployments require approval"
}

has_approval_step(pipeline) {
    some stage in pipeline.stages
    some step in stage.stage.spec.execution.steps
    step.step.type == "HarnessApproval"
}
```

### Require Delegate Selectors

```rego
package pipeline

deny[msg] {
    some stage in input.pipeline.stages
    stage.stage.spec.environment.environmentRef == "production"
    not stage.stage.spec.infrastructure.spec.delegateSelectors
    msg := "Production stages must specify delegate selectors"
}
```

### Enforce Naming Conventions

```rego
package pipeline

deny[msg] {
    not startswith(input.pipeline.identifier, "deploy_")
    not startswith(input.pipeline.identifier, "build_")
    msg := "Pipeline must start with 'deploy_' or 'build_'"
}
```

### Require Tests Before Deploy

```rego
package pipeline

deny[msg] {
    has_deploy_stage(input.pipeline)
    not has_test_stage(input.pipeline)
    msg := "Must include test stage before deployment"
}

has_deploy_stage(pipeline) {
    some stage in pipeline.stages
    stage.stage.type == "Deployment"
}

has_test_stage(pipeline) {
    some stage in pipeline.stages
    stage.stage.type == "CI"
}
```

### Enforce Secret References

```rego
package pipeline

deny[msg] {
    step := input.pipeline.stages[_].stage.spec.execution.steps[_].step
    env := step.spec.envVariables[_]
    contains(lower(env.name), "password")
    not startswith(env.value, "<+secrets.")
    msg := sprintf("Variable '%s' must use secret reference", [env.name])
}
```

## Policy Set

```yaml
policySet:
  name: Production Governance
  identifier: prod_governance
  policies:
    - policyRef: require_approval
      severity: error
    - policyRef: naming_conventions
      severity: warning
  entitySelector:
    - type: PIPELINE
```

## Evaluation Points

| Point | Description |
|-------|-------------|
| On Save | When pipeline saved |
| On Run | Before execution |

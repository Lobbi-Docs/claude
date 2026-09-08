# Harness Chaos Engineering

## Chaos Experiments

```yaml
chaosExperiment:
  name: Pod Delete Test
  identifier: pod_delete_test
  chaosInfrastructure:
    identifier: k8s_chaos_infra
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: "30"
            - name: CHAOS_INTERVAL
              value: "10"
            - name: FORCE
              value: "false"
            - name: TARGET_PODS
              value: ""
            - name: PODS_AFFECTED_PERC
              value: "50"
        probe:
          - name: healthcheck
            type: httpProbe
            httpProbe/inputs:
              url: http://service/health
              expectedResponseCode: "200"
            mode: Continuous
            runProperties:
              probeTimeout: 5s
              interval: 2s
```

## Chaos Infrastructure

```yaml
chaosInfrastructure:
  name: K8s Chaos Infra
  identifier: k8s_chaos_infra
  platformName: Kubernetes
  namespace: litmus
  serviceAccount: litmus-admin
  environmentRef: production
```

## Probes

### HTTP Probe
```yaml
probe:
  name: API Health Check
  type: httpProbe
  httpProbe/inputs:
    url: "http://api-service:8080/health"
    method:
      get:
        criteria: ==
        responseCode: "200"
  mode: SOT  # Start of Test
  runProperties:
    probeTimeout: 10s
    retry: 3
    interval: 5s
```

### Command Probe
```yaml
probe:
  name: Database Check
  type: cmdProbe
  cmdProbe/inputs:
    command: "pg_isready -h localhost"
    comparator:
      type: string
      criteria: contains
      value: "accepting connections"
  mode: EOT  # End of Test
```

## GameDays

```yaml
gameDay:
  name: Q1 Resilience Test
  identifier: q1_resilience
  description: Quarterly chaos testing
  experiments:
    - experimentRef: pod_delete_test
      weight: 10
    - experimentRef: network_latency_test
      weight: 8
    - experimentRef: cpu_stress_test
      weight: 6
```

## Resilience Score

Calculated based on:
- Probe success rate
- Experiment pass rate
- Recovery time
- Blast radius

```bash
# Get resilience score
GET /chaos/api/experiments/{id}/resilience-score
```

## Common Faults

| Fault | Target | Use Case |
|-------|--------|----------|
| `pod-delete` | Pods | Test pod recovery |
| `pod-cpu-hog` | Pods | CPU stress testing |
| `pod-memory-hog` | Pods | Memory limits |
| `pod-network-latency` | Pods | Network resilience |
| `node-drain` | Nodes | Node failure |
| `node-cpu-hog` | Nodes | Node stress |
| `aws-ec2-stop` | AWS | Instance failure |
| `gcp-vm-stop` | GCP | VM failure |

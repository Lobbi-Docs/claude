# Harness SRM (Service Reliability Management)

## Monitored Services

```yaml
monitoredService:
  name: api-service
  identifier: api_service
  serviceRef: api
  environmentRef: production
  type: Application
  sources:
    healthSources:
      - name: Prometheus Metrics
        identifier: prometheus_metrics
        type: Prometheus
        spec:
          connectorRef: prometheus_connector
          metricDefinitions:
            - identifier: error_rate
              metricName: http_errors_total
              riskCategory: Errors
              sli:
                enabled: true
              analysis:
                deploymentVerification:
                  enabled: true
```

## SLO Configuration

```yaml
slo:
  name: API Availability
  identifier: api_availability
  target: 99.9
  type: Calender
  sloTargetPercentage: 99.9
  periodLength: Monthly
  serviceLevelIndicators:
    - type: Availability
      spec:
        type: Ratio
        spec:
          eventType: Good
          metric1: successful_requests
          metric2: total_requests
```

## Error Tracking

```yaml
errorTracking:
  enabled: true
  criticalExceptionTypes:
    - NullPointerException
    - OutOfMemoryError
  notificationRules:
    - condition: NEW_ERROR
      notificationMethod: SLACK
      channelRef: engineering_alerts
```

## Change Intelligence

```yaml
changeSource:
  name: Deployment Events
  identifier: deployment_events
  type: HarnessCDCurrentGen
  spec:
    harnessApplicationId: app_id
    harnessServiceId: service_id
    harnessEnvironmentId: env_id
```

## Health Score

Health scores are calculated based on:
- **Errors**: Exception rates and error logs
- **Performance**: Response times and throughput
- **Infrastructure**: Resource utilization

```bash
# Query health score via API
GET /cv/api/monitored-service/{identifier}/health-score
```

## Verification Jobs

```yaml
verificationJob:
  type: Canary
  sensitivity: MEDIUM
  duration: 15m
  failOnNoAnalysis: true
  baselineType: LAST_SUCCESSFUL
```

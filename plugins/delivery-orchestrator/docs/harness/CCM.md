# Harness CCM (Cloud Cost Management)

## Cost Categories

```yaml
costCategory:
  name: Engineering Teams
  identifier: engineering_teams
  rules:
    - name: Platform Team
      conditions:
        - viewField:
            fieldId: label
            fieldName: team
          operator: IN
          values: [platform]
    - name: Unallocated
      conditions:
        - viewField:
            fieldId: label
            fieldName: team
          operator: NULL
```

## Budgets

```yaml
budget:
  name: Q1 Production
  identifier: q1_prod
  scope:
    type: PERSPECTIVE
    perspectiveId: production_costs
  amount: 50000
  period: MONTHLY
  alertThresholds:
    - percentage: 75
      alertType: ACTUAL
      notificationChannels: [slack_finance]
    - percentage: 100
      alertType: FORECASTED
      notificationChannels: [slack_finance, email_leadership]
```

## AutoStopping

```yaml
autoStoppingRule:
  name: Dev AutoStop
  identifier: dev_autostop
  cloudProvider: AWS
  resourceType: EC2
  filter:
    tags:
      - key: Environment
        value: development
  schedule:
    timezone: America/New_York
    fixedSchedule:
      - days: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY]
        startTime: "09:00"
        endTime: "18:00"
  idleTimeout: 30
```

## Recommendations API

```bash
GET /ccm/api/recommendations
{
  "filter": {
    "resourceType": "EC2",
    "savingsPercentage": { "gte": 20 }
  }
}
```

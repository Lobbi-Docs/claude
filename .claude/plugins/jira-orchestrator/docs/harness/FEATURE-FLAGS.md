# Harness Feature Flags

## Flag Types

| Type | Use Case |
|------|----------|
| Boolean | Feature toggle |
| Multivariate | A/B testing |
| JSON | Complex config |

## JavaScript SDK

```typescript
import { initialize, Event } from '@harnessio/ff-javascript-client-sdk';

const client = initialize('sdk-key', {
  identifier: 'user-123',
  name: 'John Doe',
  attributes: { plan: 'enterprise' }
});

client.on(Event.READY, flags => {
  if (client.variation('dark_mode', false)) {
    enableDarkMode();
  }
});
```

## Python SDK

```python
from featureflags.client import CfClient

client = CfClient(sdk_key="server-sdk-key")
target = Target(identifier="user-123", name="John Doe")

if client.bool_variation("dark_mode", target, False):
    enable_dark_mode()
```

## Targeting Rules

```yaml
flag:
  identifier: new_feature
  kind: boolean
  defaultServe:
    variation: "false"
  rules:
    - priority: 1
      clauses:
        - attribute: email
          op: endsWith
          values: ["@company.com"]
      serve:
        variation: "true"
```

## Percentage Rollout

```yaml
flag:
  percentageRollout:
    variations:
      - variation: "true"
        weight: 10
      - variation: "false"
        weight: 90
    bucketBy: identifier
```

## Pipeline Integration

```yaml
- step:
    name: Enable Flag
    type: FlagConfiguration
    spec:
      feature: new_feature
      environment: production
      instructions:
        - kind: setFeatureFlagState
          parameters:
            state: "on"
```

---
name: jira:notify
description: Configure notification preferences, manage webhook endpoints, test notifications, and view notification history for Jira orchestration events
argument-hint: "[action] [options]"
---

# /jira:notify

**Quick Usage:** `/jira:notify [action] [options]`

Manage the Jira Orchestrator notification system including user preferences, webhook endpoints, notification testing, and delivery history.

## Core Actions

| Action | Purpose | Example |
|--------|---------|---------|
| `configure` | Configure user notification preferences | `/jira:notify configure --channel=slack` |
| `test` | Send test notifications | `/jira:notify test --channel=slack` |
| `history` | View notification delivery history | `/jira:notify history --limit=50` |
| `webhook add` | Register new webhook endpoint | `/jira:notify webhook add <url>` |
| `webhook list` | List webhook endpoints | `/jira:notify webhook list` |
| `webhook test` | Test webhook delivery | `/jira:notify webhook test <webhook-id>` |
| `webhook remove` | Remove webhook endpoint | `/jira:notify webhook remove <webhook-id>` |
| `channels` | List available notification channels | `/jira:notify channels` |
| `subscriptions` | Manage event subscriptions | `/jira:notify subscriptions` |

## Quick Examples

```bash
# Configure Slack notifications
/jira:notify configure --channel=slack --user-id=U12345678

# Test notification delivery
/jira:notify test --event=issue.assigned

# View recent notification history
/jira:notify history --limit=20 --status=failed

# Add webhook endpoint
/jira:notify webhook add https://api.company.com/webhooks/jira --secret=mysecret

# List all webhooks
/jira:notify webhook list

# Test webhook delivery
/jira:notify webhook test webhook-monitoring

# View subscription configuration
/jira:notify subscriptions --format=yaml
```

## Action Details

### 1. Configure Preferences

**Command:** `/jira:notify configure [options]`

Configure user-specific notification preferences.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--channel` | string | Channel to configure (slack, email, webhook) | `--channel=slack` |
| `--user-id` | string | User identifier for the channel | `--user-id=U12345678` |
| `--email` | string | Email address for email notifications | `--email=john@company.com` |
| `--quiet-hours` | string | Quiet hours range (HH:MM-HH:MM) | `--quiet-hours=22:00-08:00` |
| `--timezone` | string | User timezone | `--timezone=America/New_York` |
| `--digest-mode` | boolean | Enable digest mode | `--digest-mode=true` |
| `--digest-interval` | string | Digest interval (hourly, daily, weekly) | `--digest-interval=daily` |
| `--rate-limit` | number | Max notifications per hour | `--rate-limit=30` |
| `--dm-urgent` | boolean | DM for urgent notifications | `--dm-urgent=true` |
| `--enabled` | boolean | Enable/disable notifications | `--enabled=true` |

**Examples:**

```bash
# Enable Slack notifications with quiet hours
/jira:notify configure \
  --channel=slack \
  --user-id=U12345678 \
  --quiet-hours=22:00-08:00 \
  --timezone=America/New_York \
  --dm-urgent=true

# Configure email with daily digest
/jira:notify configure \
  --channel=email \
  --email=john@company.com \
  --digest-mode=true \
  --digest-interval=daily

# Set rate limits
/jira:notify configure \
  --rate-limit=50 \
  --enabled=true

# Disable notifications temporarily
/jira:notify configure --enabled=false
```

**Output:**

```yaml
Notification Preferences Updated
─────────────────────────────────

User: john.doe@company.com

Slack:
  Enabled: true
  User ID: U12345678
  DM for Urgent: true
  Thread Replies: true

Email:
  Enabled: true
  Address: john@company.com
  Digest Mode: true
  Digest Interval: daily

Rate Limits:
  Max per Hour: 50
  Max per Day: 200
  Urgent Bypass: true

Quiet Hours:
  Enabled: true
  Start: 22:00
  End: 08:00
  Timezone: America/New_York

Configuration saved to: ~/.jira-orchestrator/notifications.json
```

---

### 2. Test Notifications

**Command:** `/jira:notify test [options]`

Send test notifications to verify configuration.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--channel` | string | Channel to test (slack, email, webhook, all) | `--channel=slack` |
| `--event` | string | Event type to simulate | `--event=issue.assigned` |
| `--webhook-id` | string | Specific webhook to test | `--webhook-id=webhook-monitoring` |
| `--to` | string | Override recipient | `--to=U87654321` |

**Examples:**

```bash
# Test Slack notification
/jira:notify test --channel=slack --event=issue.assigned

# Test all channels
/jira:notify test --channel=all

# Test specific webhook
/jira:notify test --webhook-id=webhook-cicd

# Test email notification
/jira:notify test --channel=email --event=pr.created
```

**Output:**

```
Test Notification Results
─────────────────────────

Event: issue.assigned (test)
Timestamp: 2025-12-17 14:32:45 UTC

Slack:
  Status: ✅ Delivered
  Channel: DM to U12345678
  Message TS: 1702828365.123456
  Latency: 234ms

Email:
  Status: ✅ Queued (digest mode)
  Batch: hourly-digest-20251217-15
  Next Delivery: 2025-12-17 15:00:00 UTC

Webhook (webhook-monitoring):
  Status: ✅ Delivered
  Response Code: 200
  Latency: 145ms

All test notifications delivered successfully!
```

---

### 3. View Notification History

**Command:** `/jira:notify history [options]`

View notification delivery history with filtering.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--limit` | number | Max results to return | `--limit=50` |
| `--status` | string | Filter by status (sent, failed, pending, all) | `--status=failed` |
| `--channel` | string | Filter by channel | `--channel=slack` |
| `--event-type` | string | Filter by event type | `--event-type=issue.assigned` |
| `--issue-key` | string | Filter by issue key | `--issue-key=GA-123` |
| `--since` | string | Show notifications since timestamp | `--since=2025-12-17` |
| `--format` | string | Output format (table, json, detailed) | `--format=table` |

**Examples:**

```bash
# View recent notifications
/jira:notify history --limit=20

# View failed deliveries
/jira:notify history --status=failed --limit=50

# View notifications for specific issue
/jira:notify history --issue-key=GA-123

# View Slack notifications from today
/jira:notify history --channel=slack --since=2025-12-17

# Export as JSON
/jira:notify history --format=json --limit=100 > notifications.json
```

**Output (Table Format):**

```
Notification History
────────────────────────────────────────────────────────────────────

ID           Timestamp            Event Type         Channel  Status   Latency
──────────── ──────────────────── ────────────────── ──────── ──────── ────────
notif-123456 2025-12-17 14:32:45  issue.assigned     Slack    ✅ Sent  234ms
notif-123457 2025-12-17 14:32:45  issue.assigned     Email    📦 Batch  -
notif-123458 2025-12-17 14:30:12  pr.created         Slack    ✅ Sent  189ms
notif-123459 2025-12-17 14:28:33  workflow.blocked   Slack    ✅ Sent  156ms
notif-123460 2025-12-17 14:28:33  workflow.blocked   Webhook  ✅ Sent  145ms
notif-123461 2025-12-17 14:25:18  deployment.success Slack    ✅ Sent  201ms
notif-123462 2025-12-17 14:20:00  issue.commented    Slack    ⏭️  Skip  -
notif-123463 2025-12-17 14:18:45  pr.review_request  Slack    ✅ Sent  178ms
notif-123464 2025-12-17 14:15:22  issue.updated      Email    📦 Batch  -
notif-123465 2025-12-17 14:12:10  orchestration.done Slack    ✅ Sent  212ms

Total: 10 notifications (8 sent, 2 batched, 0 failed)
Success Rate: 100%
```

**Output (Detailed Format):**

```yaml
- notification_id: notif-123456
  timestamp: 2025-12-17T14:32:45Z
  event_type: issue.assigned
  issue_key: GA-123
  recipient:
    user_id: john.doe@company.com
    display_name: John Doe
  channel: slack
  delivery:
    status: sent
    message_ts: 1702828365.123456
    channel_id: U12345678
    latency_ms: 234
    retry_count: 0
  message:
    text: "GA-123: Add user profile page (assigned to you)"
    blocks: [...]

- notification_id: notif-123457
  timestamp: 2025-12-17T14:32:45Z
  event_type: issue.assigned
  issue_key: GA-123
  recipient:
    user_id: john.doe@company.com
  channel: email
  delivery:
    status: batched
    batch_id: hourly-digest-20251217-15
    next_delivery: 2025-12-17T15:00:00Z
```

---

### 4. Manage Webhooks

#### Add Webhook

**Command:** `/jira:notify webhook add <url> [options]`

Register a new webhook endpoint.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `<url>` | string | Webhook URL (required) | `https://api.company.com/webhooks` |
| `--secret` | string | Webhook signing secret | `--secret=mysecret123` |
| `--name` | string | Friendly name for webhook | `--name="Monitoring System"` |
| `--events` | string | Comma-separated event filters | `--events=issue.*,pr.merged` |
| `--labels` | string | Filter by issue labels | `--labels=critical,blocker` |
| `--timeout` | number | Request timeout in seconds | `--timeout=15` |
| `--retries` | number | Max retry attempts | `--retries=5` |
| `--enabled` | boolean | Enable immediately | `--enabled=true` |

**Examples:**

```bash
# Add monitoring webhook
/jira:notify webhook add https://monitoring.company.com/api/webhooks/jira \
  --secret=mon-secret-123 \
  --name="Monitoring System" \
  --events=deployment.*,orchestration.failed

# Add CI/CD webhook
/jira:notify webhook add https://cicd.company.com/webhooks/jira \
  --secret=cicd-secret-456 \
  --name="CI/CD Pipeline" \
  --events=pr.*,issue.transitioned \
  --labels=deployment,release

# Add analytics webhook (all events)
/jira:notify webhook add https://analytics.company.com/events \
  --secret=analytics-789 \
  --name="Analytics Platform" \
  --events=*
```

**Output:**

```
Webhook Endpoint Added
──────────────────────

Webhook ID: webhook-abc123
Name: Monitoring System
URL: https://monitoring.company.com/api/webhooks/jira
Status: Enabled ✅

Event Filters:
  - deployment.*
  - orchestration.failed

Configuration:
  Timeout: 10 seconds
  Max Retries: 5
  Signature Algorithm: sha256

Testing webhook delivery...
  ✅ Test delivery successful (HTTP 200, 145ms)

Webhook registered and ready to receive events!
```

---

#### List Webhooks

**Command:** `/jira:notify webhook list [options]`

List all registered webhook endpoints.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--format` | string | Output format (table, json, yaml) | `--format=table` |
| `--enabled` | boolean | Filter by enabled status | `--enabled=true` |
| `--status` | string | Filter by health status | `--status=healthy` |

**Examples:**

```bash
# List all webhooks
/jira:notify webhook list

# List only enabled webhooks
/jira:notify webhook list --enabled=true

# Export as YAML
/jira:notify webhook list --format=yaml
```

**Output:**

```
Registered Webhooks
───────────────────────────────────────────────────────────────────────────

ID                Name                URL                              Status   Events    Health
────────────────  ──────────────────  ───────────────────────────────  ───────  ────────  ───────
webhook-abc123    Monitoring System   monitoring.company.com/api/...   ✅ On    2 types   🟢 Good
webhook-def456    CI/CD Pipeline      cicd.company.com/webhooks/...    ✅ On    3 types   🟢 Good
webhook-ghi789    Analytics Platform  analytics.company.com/events     ✅ On    All       🟡 Slow
webhook-jkl012    Legacy System       old-api.company.com/hooks        ⏸️  Off   5 types   ⚫ Off

Total: 4 webhooks (3 enabled, 1 disabled)
Success Rate (24h): 98.5% (1,234 / 1,253)
```

**Detailed Output (YAML):**

```yaml
webhooks:
  - id: webhook-abc123
    name: Monitoring System
    url: https://monitoring.company.com/api/webhooks/jira
    enabled: true
    event_filters:
      - deployment.*
      - orchestration.failed
    created_at: 2025-12-01T10:00:00Z
    last_delivery: 2025-12-17T14:30:00Z
    health:
      status: healthy
      success_rate_24h: 99.2%
      avg_latency_ms: 145
      last_failure: null
      circuit_breaker: closed

  - id: webhook-def456
    name: CI/CD Pipeline
    url: https://cicd.company.com/webhooks/jira
    enabled: true
    event_filters:
      - pr.*
      - issue.transitioned
    filter_conditions:
      labels:
        - deployment
        - release
    created_at: 2025-11-15T08:30:00Z
    last_delivery: 2025-12-17T14:32:00Z
    health:
      status: healthy
      success_rate_24h: 100%
      avg_latency_ms: 132
      circuit_breaker: closed
```

---

#### Test Webhook

**Command:** `/jira:notify webhook test <webhook-id>`

Send a test event to a webhook endpoint.

**Examples:**

```bash
# Test specific webhook
/jira:notify webhook test webhook-abc123

# Test with custom event type
/jira:notify webhook test webhook-def456 --event=issue.created
```

**Output:**

```
Testing Webhook: webhook-abc123
────────────────────────────────

Webhook: Monitoring System
URL: https://monitoring.company.com/api/webhooks/jira

Sending test event: issue.assigned (simulated)

Request:
  Method: POST
  Headers:
    Content-Type: application/json
    X-Webhook-Signature: sha256=abc123...
    X-Event-Type: issue.assigned
    X-Event-ID: evt-test-123456
  Payload Size: 1.2 KB

Response:
  Status Code: 200 OK
  Response Time: 145ms
  Body: {"status": "received", "event_id": "evt-test-123456"}

✅ Test Successful!

Webhook is healthy and receiving events correctly.
```

---

#### Remove Webhook

**Command:** `/jira:notify webhook remove <webhook-id> [options]`

Remove a webhook endpoint.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--confirm` | boolean | Skip confirmation prompt | `--confirm=true` |
| `--keep-history` | boolean | Keep delivery history | `--keep-history=true` |

**Examples:**

```bash
# Remove webhook (with confirmation)
/jira:notify webhook remove webhook-jkl012

# Remove webhook (skip confirmation)
/jira:notify webhook remove webhook-jkl012 --confirm=true

# Remove but keep history
/jira:notify webhook remove webhook-jkl012 --confirm=true --keep-history=true
```

**Output:**

```
Remove Webhook
──────────────

Webhook ID: webhook-jkl012
Name: Legacy System
URL: https://old-api.company.com/hooks

Statistics (Last 30 days):
  Total Deliveries: 1,234
  Success Rate: 85.2%
  Last Delivery: 2025-12-10T16:45:00Z

⚠️  This action cannot be undone!

Are you sure you want to remove this webhook? [y/N]: y

✅ Webhook removed successfully.

Delivery history archived to: sessions/webhooks/archive/webhook-jkl012.log
```

---

### 5. List Channels

**Command:** `/jira:notify channels`

List all available notification channels and their status.

**Examples:**

```bash
# List all channels
/jira:notify channels
```

**Output:**

```
Available Notification Channels
────────────────────────────────────────────────────────────────────

Channel       Status      Configured   Features
────────────  ──────────  ───────────  ───────────────────────────────
Slack         ✅ Ready    Yes          DM, Channels, Threads, Buttons
Email         ✅ Ready    Yes          Digest Mode, HTML Templates
Microsoft Teams  ⚠️ Partial   No       DM, Channels (requires setup)
Webhooks      ✅ Ready    Yes (3)      Custom Endpoints, Filtering
SMS           ❌ Not Setup  No       (Requires Twilio integration)

Current Configuration:
  Active Channels: 2 (Slack, Email)
  Webhook Endpoints: 3
  Notification Recipients: 15 users

To configure a channel:
  /jira:notify configure --channel=<channel-name>
```

---

### 6. Manage Subscriptions

**Command:** `/jira:notify subscriptions [options]`

View and manage event subscriptions.

**Options:**

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--format` | string | Output format (table, yaml, json) | `--format=yaml` |
| `--add` | string | Add subscription | `--add=issue.assigned` |
| `--remove` | string | Remove subscription | `--remove=issue.updated` |
| `--channel` | string | Channel for subscription | `--channel=slack` |
| `--filter` | string | Filter condition (JSON) | `--filter='{"labels":["urgent"]}'` |

**Examples:**

```bash
# View current subscriptions
/jira:notify subscriptions

# Add subscription for assigned issues
/jira:notify subscriptions --add=issue.assigned --channel=slack

# Add subscription for critical blockers
/jira:notify subscriptions \
  --add=workflow.blocked \
  --channel=slack \
  --filter='{"labels":["critical","blocker"]}'

# Remove subscription
/jira:notify subscriptions --remove=issue.updated
```

**Output:**

```yaml
Notification Subscriptions
──────────────────────────

User: john.doe@company.com

Active Subscriptions:

  1. Issue Assigned to Me
     Event Pattern: issue.assigned
     Filter:
       assignee: me
     Channels: [slack, email]
     Priority: normal

  2. Mentioned in Comments
     Event Pattern: issue.mentioned
     Filter: {}
     Channels: [slack]
     Priority: normal

  3. PR Review Requests
     Event Pattern: pr.review_requested
     Filter:
       reviewer: me
     Channels: [slack]
     Priority: normal

  4. Critical Blockers
     Event Pattern: workflow.blocked
     Filter:
       projects: [GA, PLAT]
       labels: [critical, blocker]
     Channels: [slack, email]
     Priority: urgent

  5. Production Deployments
     Event Pattern: deployment.*
     Filter:
       environments: [production]
     Channels: [slack]
     Priority: normal

Total: 5 subscriptions
Estimated Notifications: ~50-75 per day
```

---

## Instructions for Claude

When executing this command:

### For `/jira:notify configure`:

1. **Validate Input**
   - Check channel is valid (slack, email, webhook)
   - Validate email format if provided
   - Verify quiet hours format (HH:MM-HH:MM)
   - Check timezone is valid

2. **Load Existing Config**
   - Read `~/.jira-orchestrator/notifications.json`
   - Merge with new preferences
   - Preserve existing subscriptions

3. **Update Configuration**
   - Apply changes to user preferences
   - Validate final configuration
   - Write back to notifications.json

4. **Test Configuration**
   - Optionally send test notification
   - Verify channel connectivity
   - Report any issues

### For `/jira:notify test`:

1. **Build Test Event**
   - Create realistic test event payload
   - Include sample issue/PR data
   - Set event type as specified

2. **Route Through System**
   - Call notification-router agent
   - Include all configured channels (or specific channel)
   - Track delivery outcomes

3. **Report Results**
   - Show delivery status per channel
   - Include latency metrics
   - Report any errors

### For `/jira:notify history`:

1. **Query Logs**
   - Read `sessions/notifications/audit.log`
   - Apply filters (status, channel, event type, etc.)
   - Limit results as specified

2. **Format Output**
   - Use table format by default
   - Support JSON/YAML export
   - Include summary statistics

### For `/jira:notify webhook add`:

1. **Validate Endpoint**
   - Check URL is well-formed
   - Verify HTTPS (warn if HTTP)
   - Test endpoint reachability

2. **Register Webhook**
   - Generate unique webhook ID
   - Store in `config/notifications.yaml`
   - Save webhook secret securely

3. **Test Delivery**
   - Send test event to endpoint
   - Verify signature validation
   - Report test results

### For `/jira:notify webhook list`:

1. **Load Webhooks**
   - Read webhook configurations
   - Load health metrics
   - Check circuit breaker states

2. **Format Output**
   - Show summary table
   - Include health indicators
   - Support detailed YAML export

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | For Slack | Slack bot OAuth token |
| `SLACK_SIGNING_SECRET` | For Slack | Slack signing secret |
| `SMTP_HOST` | For Email | SMTP server hostname |
| `SMTP_PORT` | For Email | SMTP server port |
| `SMTP_USER` | For Email | SMTP username |
| `SMTP_PASSWORD` | For Email | SMTP password |
| `WEBHOOK_SECRET_*` | For Webhooks | Webhook signing secrets |

## Related Commands

- `/jira:status` - View orchestration session status
- `/jira:work` - Start work on issue (triggers notifications)
- `/jira:pr` - Create PR (triggers notifications)
- `/jira:deploy` - Deploy (triggers notifications)

## Configuration Files

- **User Preferences:** `~/.jira-orchestrator/notifications.json`
- **System Config:** `jira-orchestrator/config/notifications.yaml`
- **Webhook Registry:** `jira-orchestrator/sessions/webhooks/endpoints.json`
- **Delivery Logs:** `jira-orchestrator/sessions/notifications/audit.log`

## References

- **notification-router agent:** `jira-orchestrator/agents/notification-router.md`
- **slack-notifier agent:** `jira-orchestrator/agents/slack-notifier.md`
- **webhook-publisher agent:** `jira-orchestrator/agents/webhook-publisher.md`
- **notifications.yaml config:** `jira-orchestrator/config/notifications.yaml`

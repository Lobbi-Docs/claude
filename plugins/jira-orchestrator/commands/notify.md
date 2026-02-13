---
name: jira:notify
description: Manage notifications, webhooks, channels, and subscriptions
argument-hint: "[action] [options]"
---

# /jira:notify

Manage Jira Orchestrator notification system: preferences, webhooks, channels, subscriptions.

## Actions

| Action | Command | Flags |
|--------|---------|-------|
| configure | `/jira:notify configure` | `--channel, --user-id, --email, --quiet-hours, --timezone, --digest-mode, --digest-interval, --rate-limit, --enabled` |
| test | `/jira:notify test` | `--channel, --event, --webhook-id, --to` |
| history | `/jira:notify history` | `--limit, --status, --channel, --event-type, --issue-key, --since, --format` |
| webhook add | `/jira:notify webhook add <url>` | `--secret, --name, --events, --labels, --timeout, --retries, --enabled` |
| webhook list | `/jira:notify webhook list` | `--format, --enabled, --status` |
| webhook test | `/jira:notify webhook test <id>` | `--event` |
| webhook remove | `/jira:notify webhook remove <id>` | `--confirm, --keep-history` |
| channels | `/jira:notify channels` | None |
| subscriptions | `/jira:notify subscriptions` | `--format, --add, --remove, --channel, --filter` |

## Configure (User Preferences)

```bash
/jira:notify configure --channel=slack --user-id=U12345678
/jira:notify configure --channel=email --email=john@company.com --digest-mode=true
```

**Key Options:**
- `--channel`: slack, teams, email, webhook
- `--quiet-hours`: HH:MM-HH:MM format
- `--digest-interval`: hourly, daily, weekly
- `--rate-limit`: Max per hour

**Process:** Validate input → Load existing config → Merge preferences → Save to `~/.jira-orchestrator/notifications.json`

## Test Notifications

```bash
/jira:notify test --channel=slack --event=issue.assigned
/jira:notify test --channel=all
```

**Process:** Build test payload → Route through notification system → Report delivery status per channel

## View History

```bash
/jira:notify history --limit=20
/jira:notify history --status=failed --channel=slack
```

**Options:** limit, status (sent/failed/pending), channel, event-type, issue-key, since, format (table/json/detailed)

## Webhooks

**Add:**
```bash
/jira:notify webhook add https://api.company.com/hooks --secret=key123 --name="System" --events=issue.*
```

**List:**
```bash
/jira:notify webhook list --format=yaml --enabled=true
```

**Test:**
```bash
/jira:notify webhook test webhook-abc123
```

**Remove:**
```bash
/jira:notify webhook remove webhook-abc123 --confirm=true
```

### Teams PR Updates Webhook

Use a Teams incoming webhook to post PR updates that include links to documentation and the Jira issue.

```bash
/jira:notify webhook add "${TEAMS_INCOMING_WEBHOOK_URL}" \
  --name="Teams PR Updates" \
  --events=pr.created,pr.updated,documentation.updated
```

The Teams webhook renders the `teams-pr-update` Adaptive Card template for a structured PR update.

**Expected payload fields:**
- `summary` (short summary line for the card header)
- `pr` (object with `title`, `number`, `url`, `status`, `author`, `source_branch`, `target_branch`)
- `repository` (object with `name`)
- `jira` (object with `key`, `url`)
- `documentation_links` (array of `{title, url}` objects)
- `documentation_primary_url` (primary documentation link for the card action)

## Channels

```bash
/jira:notify channels
```

Lists available channels (Slack, Email, Teams, Webhooks, SMS) with status and configuration.

## Subscriptions

```bash
/jira:notify subscriptions --format=yaml
/jira:notify subscriptions --add=issue.assigned --channel=slack
/jira:notify subscriptions --remove=issue.updated
```

**Options:** format, add (event pattern), remove (event pattern), channel, filter (JSON)

## Implementation Steps

### Configure
1. Validate input (channel type, email format, timezone)
2. Read `~/.jira-orchestrator/notifications.json`
3. Merge with new preferences, preserve subscriptions
4. Write back and optionally test

### Test
1. Build realistic test payload
2. Call notification-router agent
3. Report status per channel with latency

### History
1. Query `sessions/notifications/audit.log`
2. Apply filters (status, channel, event-type, issue-key, date range)
3. Format as table/JSON/detailed YAML

### Webhook Add
1. Validate URL (HTTPS check, reachability test)
2. Generate unique ID, store in `config/notifications.yaml`
3. Save secret securely
4. Send test delivery, verify signature

### Webhook List
1. Load configurations and health metrics
2. Check circuit breaker states
3. Format as table/JSON/YAML

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SLACK_BOT_TOKEN` | Slack bot OAuth |
| `SLACK_SIGNING_SECRET` | Slack signing secret |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Email config |
| `WEBHOOK_SECRET_*` | Webhook signing secrets |
| `TEAMS_INCOMING_WEBHOOK_URL` | Teams incoming webhook for PR updates |

## Config Files

- User preferences: `~/.jira-orchestrator/notifications.json`
- System config: `jira-orchestrator/config/notifications.yaml`
- Webhook registry: `jira-orchestrator/sessions/webhooks/endpoints.json`
- Audit log: `jira-orchestrator/sessions/notifications/audit.log`

## Analytics

View notification analytics and metrics.

```bash
# View analytics dashboard
/jira:notify analytics

# Analytics for specific period
/jira:notify analytics --period=7d

# Channel performance
/jira:notify analytics --channel=slack

# User engagement metrics
/jira:notify analytics --engagement
```

**Options:**
- `--period`: Time period (1d, 7d, 30d, custom)
- `--channel`: Filter by channel
- `--engagement`: Show user engagement metrics
- `--format`: Output format (table, json, dashboard)

## Related Commands

- `/jira:status` - Session status
- `/jira:work` - Work on issue (triggers notifications)
- `/jira:pr` - Create PR (triggers notifications)
- `/jira:deploy` - Deploy (triggers notifications)
- `/jira:docs-external` - External documentation publishing

## Agent References

- `jira-orchestrator/agents/notification-router.md`
- `jira-orchestrator/agents/slack-notifier.md`
- `jira-orchestrator/agents/webhook-publisher.md`

---
Generated with Golden Armada ✨

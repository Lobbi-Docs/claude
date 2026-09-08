# Database Setup Guide - Jira Orchestrator

**Version:** 7.5.0
**Date:** 2025-01-19
**Status:** Production Ready

---

## Overview

The Jira Orchestrator uses a **3-tier database architecture** for scalable, reliable data management:

| Tier | Technology | Purpose |
|------|------------|---------|
| **Primary Data** | **Neon PostgreSQL** | Orchestrations, events, metrics, relationships |
| **Caching** | **Upstash Redis** | Session state, rate limiting, real-time features |
| **Workflow** | **Temporal** *(Optional)* | Durable workflow execution, automatic retries |

---

## Quick Start

### 1. Install Dependencies

```bash
cd plugins/jira-orchestrator
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Push Schema to Database

```bash
npm run db:push
```

### 5. Verify Connection

```bash
npm run db:studio  # Opens Prisma Studio GUI
```

---

## Database Architecture

### Neon PostgreSQL

**Project:** `jira-orchestrator`
**Region:** `aws-us-east-2`
**Connection Pooling:** Enabled via `-pooler` suffix

#### Connection URLs

```bash
# Direct connection (for migrations)
NEON_DIRECT_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Pooled connection (for application)
NEON_POOLED_URL=postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Default (use pooled for better performance)
DATABASE_URL=${NEON_POOLED_URL}
```

#### Key Features

- **Serverless scaling** - Automatically scales to zero when idle
- **Branching** - Create database branches for testing
- **Point-in-time recovery** - 7-day history retention
- **Connection pooling** - Built-in pgBouncer

### Upstash Redis

**Instance:** `amazing-quagga-41373`
**Region:** Global (edge locations)

#### Connection Methods

```bash
# TCP Connection (Node.js)
UPSTASH_REDIS_URL=rediss://default:token@host:6379

# REST API (Serverless/Edge)
UPSTASH_REDIS_REST_URL=https://instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

#### Key Features

- **Serverless** - Pay per request
- **Global replication** - Low latency worldwide
- **REST API** - Works in edge/serverless environments
- **Rate limiting** - Built-in with `@upstash/ratelimit`

---

## Schema Overview

### Core Entities

```
Orchestration (1 per /jira-work session)
├── Events[] (event sourcing store)
├── Checkpoints[] (state snapshots)
├── AgentExecutions[] (agent invocations)
├── Metrics[] (quality/cost metrics)
├── Notifications[] (delivery tracking)
└── Approvals[] (approval workflows)

AgentMetric (aggregated per agent)
├── Execution counts
├── Duration percentiles
├── Token usage
└── Error types

Team
├── Members
├── Skills
├── Capacity
└── TeamCapacity[] (per sprint)

Pattern (learned patterns)
└── TaskOutcome[] (historical data)

SlaDefinition
└── SlaViolation[]
```

### Key Indexes

All tables are indexed for common query patterns:

- `orchestrations`: `issue_key`, `project_key`, `status`, `current_phase`, `started_at`
- `events`: `orchestration_id + timestamp`, `event_type`, `correlation_id`
- `agent_executions`: `orchestration_id`, `agent_name`, `status`
- `notifications`: `orchestration_id`, `channel`, `status`

---

## Usage Examples

### Database Client

```typescript
import { prisma, getOrCreateOrchestration, recordEvent } from '../lib/database';

// Start an orchestration
const orchestration = await getOrCreateOrchestration('PROJ-123', 'PROJ', 'user@example.com');

// Record an event
await recordEvent(orchestration.id, 'PhaseStarted', {
  phase: 'EXPLORE',
  timestamp: new Date().toISOString(),
}, {
  phase: 'EXPLORE',
  agentName: 'triage-agent',
});

// Query with relations
const full = await prisma.orchestration.findUnique({
  where: { id: orchestration.id },
  include: {
    events: { orderBy: { timestamp: 'desc' }, take: 100 },
    agents: { where: { status: 'RUNNING' } },
  },
});
```

### Redis Client

```typescript
import { redis, keys, setSession, getSession, withLock } from '../lib/redis';

// Session management
await setSession('session-123', {
  issueKey: 'PROJ-123',
  currentPhase: 'EXPLORE',
});

const session = await getSession('session-123');

// Rate limiting
import { apiRateLimiter, checkRateLimit } from '../lib/redis';
const { success, remaining } = await checkRateLimit(apiRateLimiter, 'user-123');

// Distributed locking
await withLock(keys.orchestrationLock('PROJ-123'), async () => {
  // Critical section - only one process can execute this
  await updateOrchestration();
});

// Caching
import { getOrSetCache, keys } from '../lib/redis';
const data = await getOrSetCache(
  keys.agentCache('triage-agent', 'hash123'),
  async () => fetchExpensiveData(),
  300 // 5 minute TTL
);
```

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run db:generate` | Generate Prisma client from schema |
| `npm run db:push` | Push schema changes to database (dev) |
| `npm run db:migrate` | Create and apply migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:reset` | Reset database and apply migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:setup` | Full setup (generate + push) |

---

## Migrations

### Development

```bash
# Create a new migration
npm run db:migrate -- --name add_new_field

# Apply pending migrations
npm run db:migrate
```

### Production

```bash
# Apply migrations without interaction
npm run db:migrate:deploy
```

---

## Troubleshooting

### Connection Issues

1. **SSL Required**: Neon requires SSL. Ensure `?sslmode=require` in connection string.

2. **Connection Pooling**: Use pooled URL for application, direct URL for migrations:
   ```bash
   # Application
   DATABASE_URL=${NEON_POOLED_URL}

   # Migrations
   DATABASE_URL=${NEON_DIRECT_URL}
   ```

3. **Firewall**: Neon IPs may need whitelisting. Check Neon dashboard for IP list.

### Redis Issues

1. **Authentication**: Ensure both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set.

2. **Edge/Serverless**: Use REST API (`@upstash/redis`) instead of TCP for edge functions.

3. **Rate Limits**: Upstash free tier has 10,000 daily commands. Monitor usage.

### Schema Issues

1. **Reset Database**: If schema changes are incompatible:
   ```bash
   npm run db:reset
   ```

2. **Force Push**: For development, force push schema changes:
   ```bash
   npx prisma db push --force-reset
   ```

---

## Security

### Credentials

- **Never commit `.env`** - It's in `.gitignore`
- **Rotate tokens regularly** - Update Neon/Upstash tokens periodically
- **Use environment-specific databases** - Separate dev/staging/prod

### Access Control

- **Neon**: Use project-level access controls
- **Upstash**: Use separate instances for environments
- **Prisma**: Use transactions for atomic operations

---

## Monitoring

### Neon Dashboard

- Query performance
- Storage usage
- Connection metrics
- Auto-scaling events

### Upstash Console

- Request volume
- Latency metrics
- Memory usage
- Rate limit hits

### Application Metrics

```typescript
import { prisma } from '../lib/database';
import { redis, getMetric } from '../lib/redis';

// Database health
const dbHealthy = await prisma.$queryRaw`SELECT 1`;

// Redis health
const redisHealthy = await redis.ping();

// Custom metrics
const activeOrchestrations = await prisma.orchestration.count({
  where: { status: 'ACTIVE' },
});
```

---

## Cost Optimization

### Neon

- **Free Tier**: 0.5 GB storage, 1 project
- **Compute**: Scales to zero when idle (no cost)
- **Storage**: $0.024/GB/month after free tier

### Upstash

- **Free Tier**: 10,000 commands/day
- **Pay-as-you-go**: $0.20 per 100,000 commands
- **Storage**: $0.25/GB/month

### Tips

1. Use connection pooling to reduce compute time
2. Set appropriate TTLs on Redis keys
3. Use batch operations where possible
4. Enable auto-suspend on Neon (default)

---

## Next Steps

1. **Enable Temporal** (optional) for durable workflow execution
2. **Add monitoring** via Neon/Upstash dashboards
3. **Set up backups** via Neon branching
4. **Configure alerts** for SLA violations

---

**Golden Armada** | *You ask - The Fleet Ships*

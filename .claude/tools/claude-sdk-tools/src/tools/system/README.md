# System Tools

System-level utilities for environment management, process execution, logging, metrics, and caching.

## Quick Start

```typescript
import { EnvManagerTool, ProcessExecutorTool, LoggerTool, MetricsCollectorTool, CacheManagerTool } from '@claude-sdk/tools/system';
import { createContext } from '@claude-sdk/tools';

const context = createContext('my-tool');
```

## Tools

### 1. EnvManagerTool

Manage environment variables with type coercion and .env parsing.

```typescript
// Get with type coercion
const port = await EnvManagerTool.execute({
  operation: 'get',
  key: 'PORT',
  defaultValue: '3000',
  typeCoerce: 'number'
}, context);

// Parse .env file
await EnvManagerTool.execute({
  operation: 'parse',
  envContent: fs.readFileSync('.env', 'utf-8')
}, context);

// Set in-memory
await EnvManagerTool.execute({
  operation: 'set',
  key: 'API_URL',
  value: 'https://api.example.com'
}, context);
```

**Operations**: `get`, `set`, `list`, `has`, `delete`, `parse`

### 2. ProcessExecutorTool

Execute shell commands safely with allowlist and timeout.

```typescript
// Execute git command
const result = await ProcessExecutorTool.execute({
  command: 'git',
  args: ['status', '--short'],
  cwd: '/path/to/repo',
  timeout: 10000
}, context);

console.log(result.data.stdout);
console.log('Exit code:', result.data.exitCode);

// Get allowed commands
const allowed = ProcessExecutorTool.getAllowedCommands();
```

**Security**: 35+ allowed commands (git, npm, docker, kubectl, etc.), dangerous commands blocked (rm, sudo, etc.)

### 3. LoggerTool

Structured logging with levels, correlation IDs, and export.

```typescript
// Log with data
await LoggerTool.execute({
  operation: 'log',
  level: 'info',
  message: 'User logged in',
  data: { userId: '123', ip: '192.168.1.1' },
  correlationId: 'req_abc'
}, context);

// Query error logs
const errors = await LoggerTool.execute({
  operation: 'query',
  filterLevel: 'error',
  limit: 50
}, context);

// Export to JSON
const logs = await LoggerTool.execute({
  operation: 'export',
  format: 'json'
}, context);

// Configure
await LoggerTool.execute({
  operation: 'configure',
  maxLogs: 5000,
  minLevel: 'info'
}, context);
```

**Levels**: `debug`, `info`, `warn`, `error`

### 4. MetricsCollectorTool

Collect and aggregate metrics with counters, gauges, and histograms.

```typescript
// Record counter
await MetricsCollectorTool.execute({
  operation: 'record',
  metricType: 'counter',
  name: 'http_requests_total',
  value: 1,
  labels: { method: 'GET', path: '/api/users' }
}, context);

// Record histogram (response times)
await MetricsCollectorTool.execute({
  operation: 'record',
  metricType: 'histogram',
  name: 'response_time_ms',
  value: 234,
  labels: { endpoint: '/api/users' }
}, context);

// Aggregate with percentiles
const stats = await MetricsCollectorTool.execute({
  operation: 'aggregate',
  filterName: 'response_time_ms',
  aggregationType: 'p95'
}, context);

// Export to Prometheus
const prom = await MetricsCollectorTool.execute({
  operation: 'export',
  format: 'prometheus'
}, context);
```

**Metric Types**: `counter`, `gauge`, `histogram`
**Aggregations**: `sum`, `avg`, `count`, `min`, `max`, `p50`, `p95`, `p99`

### 5. CacheManagerTool

In-memory cache with TTL and LRU eviction.

```typescript
// Set with 5 minute TTL
await CacheManagerTool.execute({
  operation: 'set',
  key: 'user:123',
  value: { name: 'John', email: 'john@example.com' },
  ttl: 300 // seconds
}, context);

// Get from cache
const user = await CacheManagerTool.execute({
  operation: 'get',
  key: 'user:123'
}, context);

if (user.data?.exists) {
  console.log('Cache hit:', user.data.value);
}

// Get statistics
const stats = await CacheManagerTool.execute({
  operation: 'stats'
}, context);

console.log('Hit rate:', stats.data.stats.hitRate + '%');

// Configure
await CacheManagerTool.execute({
  operation: 'configure',
  maxSize: 5000,
  defaultTtl: 600
}, context);
```

**Features**: TTL, LRU eviction, hit/miss tracking

## Error Handling

All tools return a `ToolResult`:

```typescript
const result = await CacheManagerTool.execute(input, context);

if (result.success) {
  console.log('Data:', result.data);
} else {
  console.error('Error:', result.error?.message);
  console.error('Code:', result.error?.code);
}
```

## Common Patterns

### With Retry

```typescript
import { withRetry } from '@claude-sdk/tools';

const result = await withRetry(
  () => ProcessExecutorTool.execute({ command: 'npm', args: ['install'] }, context),
  { retries: 3, delay: 1000 }
);
```

### With Timeout

```typescript
import { withTimeout } from '@claude-sdk/tools';

const result = await withTimeout(
  'cache-get',
  () => CacheManagerTool.execute({ operation: 'get', key: 'data' }, context),
  5000
);
```

### Logging + Metrics + Caching

```typescript
// Log request
await LoggerTool.execute({
  operation: 'log',
  level: 'info',
  message: 'API request',
  correlationId: context.requestId
}, context);

// Check cache
const cached = await CacheManagerTool.execute({
  operation: 'get',
  key: cacheKey
}, context);

if (cached.data?.exists) {
  // Record cache hit metric
  await MetricsCollectorTool.execute({
    operation: 'record',
    metricType: 'counter',
    name: 'cache_hits',
    value: 1
  }, context);

  return cached.data.value;
}

// Cache miss - fetch data
// ... fetch logic ...

// Cache result
await CacheManagerTool.execute({
  operation: 'set',
  key: cacheKey,
  value: data,
  ttl: 300
}, context);

// Record cache miss metric
await MetricsCollectorTool.execute({
  operation: 'record',
  metricType: 'counter',
  name: 'cache_misses',
  value: 1
}, context);
```

## Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('CacheManagerTool', () => {
  beforeEach(() => {
    CacheManagerTool.reset(); // Clear cache between tests
  });

  it('should cache values', async () => {
    const context = createContext('test');

    await CacheManagerTool.execute({
      operation: 'set',
      key: 'test',
      value: 'hello'
    }, context);

    const result = await CacheManagerTool.execute({
      operation: 'get',
      key: 'test'
    }, context);

    expect(result.success).toBe(true);
    expect(result.data?.value).toBe('hello');
  });
});
```

## Security Notes

### EnvManagerTool
- ✅ In-memory only (never writes to disk)
- ✅ Parsing validates format
- ⚠️ No secret detection

### ProcessExecutorTool
- ✅ Command allowlist
- ✅ Dangerous command blacklist
- ✅ Timeout protection
- ⚠️ Set `allowDangerous: false` in production

### CacheManagerTool
- ✅ In-memory only
- ✅ Automatic expiration
- ⚠️ No sensitive data validation

### LoggerTool
- ✅ Rotation limits
- ✅ Correlation IDs
- ⚠️ Log sensitive data carefully

### MetricsCollectorTool
- ✅ Type-safe labels
- ⚠️ No automatic PII filtering

## Performance

| Tool | Get/Set | Memory | Notes |
|------|---------|--------|-------|
| EnvManager | O(1) | O(n vars) | HashMap |
| ProcessExecutor | O(cmd) | O(output) | Command dependent |
| Logger | O(1) | O(n logs) | Rotation at max |
| MetricsCollector | O(1) | O(n metrics) | Agg is O(n log n) |
| CacheManager | O(1) | O(n entries) | LRU is O(n) |

## API Reference

See implementation files for complete API documentation:
- `env-manager.ts` - EnvManager API
- `process-executor.ts` - ProcessExecutor API
- `logger.ts` - Logger API
- `metrics-collector.ts` - MetricsCollector API
- `cache-manager.ts` - CacheManager API

# Testing Tools

Comprehensive testing utilities for AI agent workflows. These tools enable automated testing, benchmarking, mocking, and data generation for robust test coverage.

## Tools Overview

### 1. MockServerTool (`mock-server.ts`)

In-memory HTTP mock server for testing API integrations without external dependencies.

**Features:**
- Configure mock HTTP responses
- Pattern matching for URLs (exact, regex, prefix, suffix)
- Response delay simulation
- Request recording for verification
- Multiple HTTP methods support (GET, POST, PUT, PATCH, DELETE, etc.)

**Usage Example:**
```typescript
// Configure mock routes
await MockServerTool.execute({
  action: 'configure',
  routes: [
    {
      method: 'GET',
      pattern: '/api/users',
      matchMode: 'exact',
      response: {
        status: 200,
        body: { users: [] },
        delay: 100
      }
    }
  ]
});

// Match incoming request
await MockServerTool.execute({
  action: 'match',
  method: 'GET',
  url: '/api/users'
});

// Get recorded requests
await MockServerTool.execute({
  action: 'getRecorded',
  filter: { method: 'GET' }
});
```

### 2. DataFakerTool (`data-faker.ts`)

Generate realistic fake data for testing purposes with localization support.

**Features:**
- Generate names, emails, addresses, phone numbers
- Create UUIDs, dates, numbers, strings
- Lorem ipsum text generation
- Multi-locale support (en, es, fr, de, ja, zh)
- Seeded generation for reproducibility
- Batch generation support

**Supported Data Types:**
- `name` - Full names
- `email` - Email addresses
- `phone` - Phone numbers (locale-specific format)
- `address` - Complete addresses
- `uuid` - UUID v4
- `number` - Numbers with min/max/decimals
- `string` - Random strings
- `date` - Dates in various formats
- `lorem` - Lorem ipsum text
- `boolean` - Random booleans
- `url` - URLs
- `username` - Usernames
- `password` - Passwords
- `creditCard` - Credit card numbers
- `ipAddress` - IP addresses
- `company` - Company names

**Usage Example:**
```typescript
// Generate fake names
await DataFakerTool.execute({
  type: 'name',
  count: 10,
  options: { locale: 'en' }
});

// Generate emails with prefix/suffix
await DataFakerTool.execute({
  type: 'email',
  count: 5,
  options: {
    locale: 'en',
    prefix: 'test',
    suffix: 'dev'
  }
});

// Generate seeded data (reproducible)
await DataFakerTool.execute({
  type: 'number',
  count: 100,
  options: {
    seed: 12345,
    min: 1,
    max: 100
  }
});
```

### 3. AssertionHelperTool (`assertion-helper.ts`)

Comprehensive assertion utilities for testing with detailed error messages and diffs.

**Features:**
- Multiple assertion types (equal, deepEqual, contains, matches, etc.)
- Type checking assertions
- Numeric comparisons (greaterThan, lessThan, between)
- Object property assertions
- Empty/non-empty checks
- Detailed diff generation on failure
- Custom error messages

**Supported Assertions:**
- `equal` - Shallow equality
- `deepEqual` - Deep equality
- `notEqual` - Inequality
- `contains` - Array/string/object contains
- `matches` - Regex pattern matching
- `typeOf` - Type checking
- `truthy` / `falsy` - Truthiness
- `greaterThan` / `lessThan` - Numeric comparison
- `between` - Range checking
- `hasProperty` - Object property existence
- `isEmpty` / `isNotEmpty` - Emptiness checks

**Usage Example:**
```typescript
// Assert equality
await AssertionHelperTool.execute({
  assertion: 'equal',
  actual: 42,
  expected: 42,
  message: 'Answer should be 42'
});

// Assert deep equality
await AssertionHelperTool.execute({
  assertion: 'deepEqual',
  actual: { a: 1, b: { c: 2 } },
  expected: { a: 1, b: { c: 2 } }
});

// Assert pattern match
await AssertionHelperTool.execute({
  assertion: 'matches',
  value: 'test@example.com',
  pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$'
});

// Assert type
await AssertionHelperTool.execute({
  assertion: 'typeOf',
  value: [],
  expectedType: 'array'
});
```

### 4. BenchmarkRunnerTool (`benchmark-runner.ts`)

Performance benchmarking and comparison utilities for measuring code execution speed.

**Features:**
- Run functions multiple iterations
- Statistical analysis (min, max, mean, median, p95, p99, std dev)
- Warmup runs to stabilize measurements
- Operations per second calculation
- Memory usage tracking (optional)
- Compare multiple implementations
- Async function support

**Usage Example:**
```typescript
// Run single benchmark
await BenchmarkRunnerTool.execute({
  action: 'run',
  benchmark: {
    name: 'Array sort',
    fn: 'return [3, 1, 2].sort();',
    iterations: 1000,
    warmup: 10,
    options: {
      trackMemory: true
    }
  }
});

// Compare multiple implementations
await BenchmarkRunnerTool.execute({
  action: 'compare',
  benchmarks: [
    {
      name: 'For loop',
      fn: 'let sum = 0; for (let i = 0; i < 1000; i++) sum += i;',
      iterations: 1000
    },
    {
      name: 'Reduce',
      fn: 'const arr = Array.from({length: 1000}, (_, i) => i); arr.reduce((a, b) => a + b, 0);',
      iterations: 1000
    }
  ]
});
```

### 5. SnapshotTesterTool (`snapshot-tester.ts`)

Snapshot testing for data structures and outputs with diff generation.

**Features:**
- Create snapshots of any data
- Compare data against stored snapshots
- Update mode for snapshot updates
- Visual diff generation
- Ignore specific keys during comparison
- Key sorting for consistent snapshots
- In-memory storage (no file system access)

**Usage Example:**
```typescript
// Create snapshot
await SnapshotTesterTool.execute({
  action: 'create',
  name: 'user-response',
  data: { id: 1, name: 'John', email: 'john@example.com' },
  options: {
    pretty: true,
    sortKeys: true
  }
});

// Compare against snapshot
await SnapshotTesterTool.execute({
  action: 'compare',
  name: 'user-response',
  data: { id: 1, name: 'John', email: 'john@example.com' },
  options: {
    updateOnMismatch: false,
    ignoreKeys: ['timestamp']
  }
});

// Update snapshot
await SnapshotTesterTool.execute({
  action: 'update',
  name: 'user-response',
  data: { id: 1, name: 'Jane', email: 'jane@example.com' }
});

// List all snapshots
await SnapshotTesterTool.execute({
  action: 'list'
});
```

## Common Patterns

### Test Workflow Example

```typescript
// 1. Generate test data
const users = await DataFakerTool.execute({
  type: 'name',
  count: 5,
  options: { locale: 'en' }
});

// 2. Configure mock server
await MockServerTool.execute({
  action: 'configure',
  routes: [{
    method: 'GET',
    pattern: '/api/users',
    response: { status: 200, body: users.data }
  }]
});

// 3. Make request and verify
const response = await MockServerTool.execute({
  action: 'match',
  method: 'GET',
  url: '/api/users'
});

// 4. Assert response
await AssertionHelperTool.execute({
  assertion: 'equal',
  actual: response.data.matched,
  expected: true
});

// 5. Create snapshot
await SnapshotTesterTool.execute({
  action: 'create',
  name: 'users-response',
  data: response.data.response
});
```

### Performance Testing Example

```typescript
// 1. Create test data
const testData = await DataFakerTool.execute({
  type: 'number',
  count: 10000,
  options: { min: 1, max: 1000 }
});

// 2. Benchmark different algorithms
const results = await BenchmarkRunnerTool.execute({
  action: 'compare',
  benchmarks: [
    {
      name: 'Algorithm A',
      fn: `/* algorithm A code */`,
      iterations: 100
    },
    {
      name: 'Algorithm B',
      fn: `/* algorithm B code */`,
      iterations: 100
    }
  ]
});

// 3. Assert performance requirements
await AssertionHelperTool.execute({
  assertion: 'lessThan',
  value: results.data.benchmarks[0].mean,
  threshold: 10 // Must complete in < 10ms
});
```

## Design Philosophy

These testing tools are designed specifically for AI agent testing workflows:

1. **In-Memory Storage**: All tools use in-memory storage to avoid file system dependencies
2. **Serialization-Safe**: All data can be serialized to JSON for agent communication
3. **No External Dependencies**: Tools work standalone without external services
4. **Reproducible**: Support for seeded random generation and deterministic outputs
5. **Agent-Friendly**: Clear, structured inputs and outputs optimized for LLM understanding

## Integration

Import all testing tools:

```typescript
import {
  MockServerTool,
  DataFakerTool,
  AssertionHelperTool,
  BenchmarkRunnerTool,
  SnapshotTesterTool
} from '@claude-sdk/tools/testing';
```

## Type Safety

All tools include full TypeScript type definitions and Zod schema validation:

```typescript
import {
  MockServerSchema,
  DataFakerSchema,
  AssertionSchema,
  BenchmarkRunnerSchema,
  SnapshotTesterSchema
} from '@claude-sdk/tools/testing';
```

## Error Handling

All tools use the standardized `ToolResult<T>` pattern:

```typescript
const result = await DataFakerTool.execute({
  type: 'email',
  count: 10
});

if (result.success) {
  console.log(result.data); // { data: [...], count: 10 }
} else {
  console.error(result.error); // { code: string, message: string, ... }
}
```

## Performance Considerations

- **MockServerTool**: O(n) route matching, stores all requests in memory
- **DataFakerTool**: O(n) generation time, seeded RNG adds minimal overhead
- **AssertionHelperTool**: Deep equality is O(n) for nested structures
- **BenchmarkRunnerTool**: Execution time proportional to iterations × function time
- **SnapshotTesterTool**: Serialization time proportional to data size

## Future Enhancements

Potential improvements for future versions:

- Persistent storage adapters for snapshots
- More locales for DataFakerTool
- Custom faker plugins
- Advanced benchmark visualizations
- Assertion chaining API
- Mock server middleware support
- WebSocket mocking
- Test suite orchestration

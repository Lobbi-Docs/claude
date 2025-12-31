# Batch Processor Agent

**Callsign:** Forge
**Model:** haiku
**Role:** High-performance batch data processing

## Mission

Process large datasets efficiently through configurable batching, parallel execution, and memory-efficient streaming. Enable processing of datasets too large to fit in memory while maintaining checkpointing for recovery.

## Capabilities

### Batch Management
- Configurable batch sizes (100-10,000 records)
- Parallel batch processing
- Memory-efficient streaming
- Adaptive batch sizing based on performance

### Checkpointing
- Save state after each batch
- Resume from last checkpoint
- Track progress across batches
- Handle partial batch failures

### Performance Optimization
- Connection pooling
- Bulk insert operations
- Minimal memory footprint
- Progress estimation

## Input Protocol

```yaml
request:
  source_id: "uuid"
  config:
    batch_size: 1000
    parallel_batches: 4
    checkpoint_frequency: 1  # After every N batches

    memory_limit_mb: 1024
    streaming: true

    on_batch_error: "continue" | "stop" | "retry"
    max_retries_per_batch: 3

  resume_from:
    checkpoint_id: "cp-uuid"
    batch_number: 45
```

## Output Protocol

```yaml
response:
  processing_id: "uuid"
  status: "completed"

  timing:
    started_at: "2024-01-15T10:00:00Z"
    completed_at: "2024-01-15T11:58:45Z"
    duration_seconds: 7125

  progress:
    total_records: 150000
    processed_records: 150000
    successful_records: 149234
    failed_records: 766

    total_batches: 150
    completed_batches: 150
    failed_batches: 0
    retried_batches: 2

  performance:
    avg_batch_duration_ms: 4523
    avg_records_per_second: 21.1
    peak_records_per_second: 35.8
    peak_memory_mb: 856

  batches:
    - batch_number: 1
      status: "completed"
      records: 1000
      success: 998
      failed: 2
      duration_ms: 4234
      checkpoint_id: "cp-001"

    # ... abbreviated ...

    - batch_number: 150
      status: "completed"
      records: 1000
      success: 1000
      failed: 0
      duration_ms: 4102
      checkpoint_id: "cp-150"

  checkpoints:
    total: 150
    latest:
      id: "cp-150"
      batch_number: 150
      records_processed: 150000
      created_at: "2024-01-15T11:58:45Z"
```

## Processing Strategy

### Small Batches (< 100 records)
- Lower overhead, faster feedback
- Higher checkpoint frequency
- Good for testing

### Medium Batches (100-1000 records)
- Balanced throughput and memory
- Default for most migrations
- Good error isolation

### Large Batches (1000-10000 records)
- Maximum throughput
- Higher memory usage
- Use with caution

## Parallel Processing

```mermaid
graph LR
    A[Source Stream] --> B[Batch Creator]
    B --> C[Queue]
    C --> D1[Worker 1]
    C --> D2[Worker 2]
    C --> D3[Worker 3]
    C --> D4[Worker 4]
    D1 --> E[Results Collector]
    D2 --> E
    D3 --> E
    D4 --> E
    E --> F[Checkpoint Manager]
```

## Memory Management

| Dataset Size | Strategy |
|--------------|----------|
| < 100MB | Load all |
| 100MB - 1GB | Stream with buffer |
| > 1GB | Stream with minimal buffer |

## Integration Points

- **Controlled by:** Migration Executor Agent
- **Works with:** Transaction Manager Agent
- **Reports to:** Audit Logger Agent

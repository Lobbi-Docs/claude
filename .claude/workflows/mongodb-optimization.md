# MongoDB Optimization Workflow

Multi-agent workflow for optimizing MongoDB performance and schema design.

## Workflow Metadata
```yaml
name: mongodb-optimization
type: parallel
description: Comprehensive MongoDB optimization including schema review, index optimization, and query tuning
agents:
  - mongodb-schema-designer
  - mongodb-query-optimizer
  - mongodb-aggregation-specialist
triggers:
  - "optimize mongodb"
  - "mongodb performance"
  - "database optimization"
stages:
  - analysis
  - schema-review
  - index-optimization
  - query-tuning
  - validation
estimatedDuration: "1-3 hours"
priority: high
```

## Workflow Stages

### Stage 1: Analysis (Parallel)
**Agents:** mongodb-query-optimizer, mongodb-aggregation-specialist
**Tasks:**
1. Profile current query performance
2. Analyze slow query log
3. Review current index usage
4. Identify bottlenecks
5. Benchmark current performance

**Outputs:**
- Performance baseline report
- Slow query analysis
- Index usage statistics

### Stage 2: Schema Review
**Agent:** mongodb-schema-designer
**Tasks:**
1. Review document structure
2. Analyze embedding vs referencing
3. Check for anti-patterns
4. Validate Prisma schema alignment
5. Recommend schema improvements

**Outputs:**
- Schema review report
- Recommended changes
- Migration plan (if needed)

### Stage 3: Index Optimization
**Agent:** mongodb-query-optimizer
**Tasks:**
1. Analyze query patterns
2. Design optimal compound indexes
3. Identify unused indexes
4. Create covering indexes
5. Implement partial indexes

**Outputs:**
- Index recommendations
- Index creation scripts
- Unused index removal list

### Stage 4: Query Tuning
**Agents:** mongodb-query-optimizer, mongodb-aggregation-specialist
**Tasks:**
1. Rewrite inefficient queries
2. Optimize aggregation pipelines
3. Implement query hints
4. Configure read preferences
5. Optimize bulk operations

**Outputs:**
- Optimized query patterns
- Aggregation improvements
- Query best practices guide

### Stage 5: Validation
**Agent:** mongodb-query-optimizer
**Tasks:**
1. Benchmark optimized queries
2. Verify index usage
3. Compare before/after metrics
4. Generate performance report
5. Document improvements

**Outputs:**
- Performance comparison report
- Optimization documentation
- Monitoring recommendations

## Execution Flow

```
[Start]
    │
    ▼
┌─────────────────────────────────────────┐
│            ANALYSIS (Parallel)           │
├───────────────────┬─────────────────────┤
│ Query Profiling   │ Index Analysis      │
│ query-optimizer   │ aggregation-spec    │
└─────────┬─────────┴──────────┬──────────┘
          │                    │
          └────────┬───────────┘
                   │
                   ▼
          ┌───────────────┐
          │ Schema Review │
          │ schema-designer│
          └───────┬───────┘
                  │
                  ▼
          ┌───────────────┐
          │ Index Optimize│
          │ query-optimizer│
          └───────┬───────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │      QUERY TUNING (Parallel) │
    ├──────────────┬──────────────┤
    │ Query Rewrite│ Aggregation  │
    │ optimizer    │ specialist   │
    └──────┬───────┴───────┬──────┘
           │               │
           └───────┬───────┘
                   │
                   ▼
           ┌─────────────┐
           │ Validation  │
           │ optimizer   │
           └──────┬──────┘
                  │
                  ▼
              [Complete]
```

## Prerequisites

- MongoDB running and accessible
- Metrics server enabled
- Profiler enabled (level 1)
- Sufficient test data

## Key Metrics to Improve

| Metric | Target |
|--------|--------|
| Query latency P99 | < 100ms |
| Index hit ratio | > 95% |
| Docs examined / returned | < 1.1 |
| Collection scans | 0 for common queries |

## Success Criteria

- [ ] Baseline metrics captured
- [ ] Schema optimized for access patterns
- [ ] Indexes optimized (unused removed, new created)
- [ ] Slow queries identified and fixed
- [ ] Performance improved by measurable amount

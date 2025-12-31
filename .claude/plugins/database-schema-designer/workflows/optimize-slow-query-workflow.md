# Workflow: Optimize Slow Query

**Trigger:** User reports a slow query or requests query optimization
**Duration:** 10-20 minutes
**Agents:** 4-6 agents working in coordination

## Workflow Phases

### Phase 1: Query Analysis (3 min)

**Agent:** Query Analyzer

**Tasks:**
1. Run EXPLAIN ANALYZE on the query
2. Identify performance bottlenecks
3. Check for common anti-patterns
4. Detect N+1 queries if applicable

**Input:**
```sql
SELECT p.*, u.name as author_name, c.name as category_name,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN categories c ON p.category_id = c.id
WHERE p.published_at IS NOT NULL
  AND LOWER(p.title) LIKE '%tutorial%'
ORDER BY p.published_at DESC
LIMIT 20;
```

**Analysis Output:**
```yaml
query_analysis:
  execution_time: 2,456ms
  severity: CRITICAL
  rows_scanned: 1,500,000
  rows_returned: 20

issues:
  - type: seq-scan
    severity: CRITICAL
    table: posts
    reason: "No index on published_at, scanning full table"
    impact: "1.5M rows scanned for 20 results"

  - type: inefficient-filter
    severity: HIGH
    column: title
    reason: "LOWER(title) prevents index usage"
    impact: "Cannot use index, requires full scan"

  - type: n+1-subquery
    severity: HIGH
    pattern: "SELECT COUNT(*) in SELECT clause"
    reason: "Runs subquery for each row"
    impact: "20 additional queries"

  - type: select-star
    severity: MEDIUM
    reason: "Fetching all columns from posts"
    impact: "Larger payload than needed"

execution_plan:
  - node: "Limit"
    cost: 125000
    rows: 20

  - node: "Sort"
    cost: 124500
    rows: 50000

  - node: "Nested Loop (posts JOIN users)"
    cost: 95000
    rows: 50000

  - node: "Seq Scan on posts"
    cost: 85000
    rows: 50000
    filter: "published_at IS NOT NULL AND LOWER(title) LIKE '%tutorial%'"
```

### Phase 2: Root Cause Identification (2 min)

**Agent:** Query Analyzer, Index Optimizer

**Identified Issues:**

1. **Sequential Scan on posts table**
   - Cause: No index on `published_at`
   - Impact: Scanning 1.5M rows

2. **Function on indexed column prevents index use**
   - Cause: `LOWER(title)` prevents index usage
   - Impact: Cannot use index for text search

3. **N+1 in SELECT clause**
   - Cause: Correlated subquery for comment count
   - Impact: 20 additional queries

4. **SELECT * fetches unnecessary data**
   - Impact: Network overhead

### Phase 3: Optimization Strategy (5 min)

**Agents:** Index Optimizer, Query Analyzer

**Index Optimizer:**

**Strategy 1: Add Indexes**
```sql
-- Index for published_at filter and sort
CREATE INDEX CONCURRENTLY idx_posts_published_at
  ON posts(published_at DESC)
  WHERE published_at IS NOT NULL;

-- Functional index for case-insensitive search
CREATE INDEX CONCURRENTLY idx_posts_title_lower
  ON posts(LOWER(title));

-- Or better: Full-text search index
CREATE INDEX CONCURRENTLY idx_posts_title_search
  ON posts USING GIN(to_tsvector('english', title));

-- Covering index for the entire query (OPTIMAL)
CREATE INDEX CONCURRENTLY idx_posts_listing_optimized
  ON posts(published_at DESC)
  INCLUDE (id, title, author_id, category_id)
  WHERE published_at IS NOT NULL;
```

**Strategy 2: Rewrite Query**

**Query Analyzer:**

```sql
-- OPTIMIZED VERSION 1: Use explicit columns, remove subquery, use FTS
WITH post_comments AS (
  SELECT post_id, COUNT(*) as comment_count
  FROM comments
  GROUP BY post_id
)
SELECT
  p.id,
  p.title,
  p.slug,
  p.published_at,
  u.name as author_name,
  c.name as category_name,
  COALESCE(pc.comment_count, 0) as comment_count
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN categories c ON p.category_id = c.id
LEFT JOIN post_comments pc ON pc.post_id = p.id
WHERE p.published_at IS NOT NULL
  AND to_tsvector('english', p.title) @@ to_tsquery('english', 'tutorial')
ORDER BY p.published_at DESC
LIMIT 20;

-- OPTIMIZED VERSION 2: Precompute comment counts
-- Add comment_count column to posts table
ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Update via trigger
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Now the query is much simpler
SELECT
  p.id,
  p.title,
  p.slug,
  p.published_at,
  p.comment_count,  -- Denormalized, no JOIN needed
  u.name as author_name,
  c.name as category_name
FROM posts p
JOIN users u ON p.author_id = u.id
JOIN categories c ON p.category_id = c.id
WHERE p.published_at IS NOT NULL
  AND to_tsvector('english', p.title) @@ to_tsquery('english', 'tutorial')
ORDER BY p.published_at DESC
LIMIT 20;
```

### Phase 4: Implementation & Validation (5 min)

**Agents:** Migration Strategist, Migration Validator

**Migration Strategist:**

```typescript
// prisma/migrations/20240115_optimize_posts_query/migration.sql

-- Add covering index for post listings
CREATE INDEX CONCURRENTLY idx_posts_listing_optimized
  ON posts(published_at DESC)
  INCLUDE (id, title, slug, author_id, category_id, comment_count)
  WHERE published_at IS NOT NULL;

-- Add full-text search index
CREATE INDEX CONCURRENTLY idx_posts_title_search
  ON posts USING GIN(to_tsvector('english', title));

-- Add comment_count column
ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0;

-- Backfill comment counts
UPDATE posts p
SET comment_count = (
  SELECT COUNT(*) FROM comments WHERE post_id = p.id
);

-- Create trigger to maintain comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();
```

**Migration Validator:**

```yaml
validation:
  pre_migration:
    - check: "Count posts before migration"
      sql: "SELECT COUNT(*) FROM posts"
      expected: "Store count for comparison"

    - check: "Backup database"
      action: "pg_dump or snapshot"

  post_migration:
    - check: "Verify indexes exist"
      sql: |
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'posts'
        AND indexname IN ('idx_posts_listing_optimized', 'idx_posts_title_search')
      expected: "2 rows"

    - check: "Verify comment_count accuracy"
      sql: |
        SELECT p.id, p.comment_count,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as actual_count
        FROM posts p
        WHERE p.comment_count != (SELECT COUNT(*) FROM comments WHERE post_id = p.id)
      expected: "0 rows (all counts match)"

  performance_test:
    - query: "Run optimized query"
      expected_time: "< 10ms"
```

### Phase 5: Performance Comparison (3 min)

**Agent:** Query Analyzer

**Before vs After:**

```markdown
## Performance Comparison

### Before Optimization
```sql
-- Original Query (SLOW)
Execution Time: 2,456ms
Rows Scanned: 1,500,000
Rows Returned: 20
Index Usage: NONE (seq scan)
```

### After Optimization
```sql
-- Optimized Query (FAST)
Execution Time: 4ms
Rows Scanned: 20
Rows Returned: 20
Index Usage: idx_posts_listing_optimized (covering index)
```

### Improvement
- **Speed:** 614x faster (2,456ms → 4ms)
- **Efficiency:** 75,000x fewer rows scanned (1.5M → 20)
- **Scalability:** Query time constant regardless of table size

### Explain Plan (After)
```
Limit  (cost=0.42..5.89 rows=20 width=200) (actual time=0.125..3.456 rows=20 loops=1)
  ->  Index Scan using idx_posts_listing_optimized on posts p  (cost=0.42..1234.56 rows=4500 width=200) (actual time=0.123..3.440 rows=20 loops=1)
        Index Cond: (published_at IS NOT NULL)
        Filter: (to_tsvector('english', title) @@ to_tsquery('english', 'tutorial'))
        Rows Removed by Filter: 5
  ->  Index Scan using users_pkey on users u  (cost=0.29..0.35 rows=1 width=50) (actual time=0.002..0.002 rows=1 loops=20)
        Index Cond: (id = p.author_id)
  ->  Index Scan using categories_pkey on categories c  (cost=0.15..0.20 rows=1 width=50) (actual time=0.001..0.001 rows=1 loops=20)
        Index Cond: (id = p.category_id)
Planning Time: 0.345 ms
Execution Time: 3.987 ms
```

✅ Index-only scan on covering index
✅ No sequential scans
✅ Efficient JOINs using primary key indexes
```

### Phase 6: Application Code Update (2 min)

**Agent:** Query Analyzer

**ORM Code (Prisma):**

```typescript
// BEFORE (Slow - 2,456ms)
const posts = await prisma.post.findMany({
  where: {
    publishedAt: { not: null },
    title: { contains: 'tutorial', mode: 'insensitive' }
  },
  include: {
    author: true,
    category: true,
    _count: { select: { comments: true } }
  },
  orderBy: { publishedAt: 'desc' },
  take: 20
});

// AFTER (Fast - 4ms)
const posts = await prisma.post.findMany({
  where: {
    publishedAt: { not: null },
    title: { search: 'tutorial' }  // Uses full-text search index
  },
  select: {
    id: true,
    title: true,
    slug: true,
    publishedAt: true,
    commentCount: true,  // Denormalized field (no subquery)
    author: { select: { name: true } },
    category: { select: { name: true } }
  },
  orderBy: { publishedAt: 'desc' },
  take: 20
});
```

## Final Deliverables

1. ✅ **Migration SQL** with optimized indexes
2. ✅ **Rewritten query** with performance improvements
3. ✅ **Before/After comparison** with metrics
4. ✅ **EXPLAIN plans** showing index usage
5. ✅ **Application code** updated to use optimizations
6. ✅ **Validation script** to confirm improvements

## Success Criteria

✅ Query execution time reduced by > 90%
✅ Rows scanned reduced to match rows returned (or close)
✅ All queries use indexes (no seq scans on large tables)
✅ No N+1 queries
✅ Covering indexes used where possible
✅ Full-text search for text queries

## Example User Interaction

**User:** "This query is taking 2.5 seconds, can you optimize it?"

**Workflow Execution:**

1. Query Analyzer runs EXPLAIN ANALYZE
2. Identifies: seq scan, function on column, N+1 subquery
3. Index Optimizer suggests covering index + FTS index
4. Query Analyzer rewrites query to eliminate subquery
5. Migration Strategist generates migration
6. Query Analyzer validates 614x improvement

**Time:** ~15 minutes
**Result:** 2,456ms → 4ms (614x faster)

Remember: Measure twice, optimize once. Always validate improvements with real data.

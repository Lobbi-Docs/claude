# PR Review Example: Database Migration

**PR**: #4567 - Add user_preferences table and migrate data
**Size**: 178 lines changed (142 additions, 36 deletions)
**Workflow**: migration_review
**Review Duration**: 8m 23s
**Agents Used**: Context, Migrator, Detective, Optimizer, Contract, Tester, Classifier, Synthesizer

---

## Review Summary

**Overall Assessment**: 🔄 **Changes Requested**

This PR adds a `user_preferences` table and migrates data from JSON column. Found **1 blocking issue** (data loss risk during rollback) and **2 high-priority concerns** (missing concurrent index creation, no downtime plan).

**Migration Safety**:
- ✅ Forward migration is safe
- ❌ **BLOCKING**: Rollback migration causes data loss
- ❌ **HIGH**: Index creation will lock table (~30s on production)
- ❌ **HIGH**: Missing data validation before constraints

**Issues Found**:
- **Blocking**: 1
- **High**: 2
- **Medium**: 2
- **Low**: 1

**Estimated Downtime**: 30-45 seconds (with current approach)
**Zero-Downtime Alternative**: Available (see recommendations)

---

## 🚨 Blocking Issue

### Rollback Migration Causes Data Loss
**File**: `migrations/20240115_add_user_preferences.sql`
**Line**: 45-52 (down migration)
**Category**: Data Loss Risk
**Severity**: CRITICAL

**Issue**:
The rollback migration drops the `user_preferences` table without migrating data back to the original `users.preferences_json` column. If a rollback is needed after data has been migrated, **all user preferences will be permanently lost**.

**Dangerous Rollback Code**:
```sql
-- DOWN MIGRATION
ALTER TABLE users ADD COLUMN preferences_json JSONB;

-- DANGER: Drops table without preserving data!
DROP TABLE user_preferences;
```

**Data Loss Scenario**:
1. Migration runs in production → data migrated to `user_preferences`
2. Issue discovered → rollback needed
3. Rollback drops `user_preferences` → **ALL DATA LOST**
4. Original `preferences_json` column recreated empty
5. Users lose all their preference settings

**Required Fix**:
```sql
-- DOWN MIGRATION (Safe version)

-- Step 1: Add back the JSON column
ALTER TABLE users ADD COLUMN preferences_json JSONB;

-- Step 2: Migrate data BACK to JSON before dropping table
UPDATE users u
SET preferences_json = (
  SELECT jsonb_object_agg(key, value)
  FROM (
    SELECT
      p.preference_key as key,
      jsonb_build_object(
        'value', p.preference_value,
        'updated_at', p.updated_at
      ) as value
    FROM user_preferences p
    WHERE p.user_id = u.id
  ) subq
);

-- Step 3: Verify data migration
DO $$
DECLARE
  lost_prefs INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO lost_prefs
  FROM user_preferences p
  LEFT JOIN users u ON u.id = p.user_id
  WHERE u.preferences_json IS NULL;

  IF lost_prefs > 0 THEN
    RAISE EXCEPTION 'Data migration failed: % preferences would be lost', lost_prefs;
  END IF;
END $$;

-- Step 4: NOW safe to drop table
DROP TABLE user_preferences;

-- Step 5: Drop foreign key from users
ALTER TABLE users DROP COLUMN user_id;
```

**Additional Safety Measures**:
1. **Test rollback on staging with production data snapshot**
2. **Backup database before migration**
3. **Keep user_preferences table for 30 days before dropping**
4. **Add monitoring for data consistency**

---

## 🔴 High Priority Issues

### Index Creation Will Lock Table
**File**: `migrations/20240115_add_user_preferences.sql`
**Line**: 28-32
**Category**: Production Downtime Risk

**Issue**:
Creating indexes without `CONCURRENTLY` will acquire an exclusive lock on the table, blocking all reads and writes during index creation. On a table with 1M+ users, this takes 30-45 seconds.

**Blocking Index Creation**:
```sql
-- This will LOCK the table!
CREATE INDEX idx_user_preferences_user_id
  ON user_preferences(user_id);

CREATE INDEX idx_user_preferences_key
  ON user_preferences(user_id, preference_key);
```

**Production Impact**:
- **Lock Duration**: 30-45 seconds (estimated for 1M users)
- **User Impact**: All preference reads/writes fail
- **Service Impact**: Login, settings, dashboard all affected
- **Risk**: Potential timeout cascades, request queuing

**Safe Alternative (PostgreSQL)**:
```sql
-- Create indexes CONCURRENTLY (no table lock)
-- Note: Cannot run in transaction, run separately
CREATE INDEX CONCURRENTLY idx_user_preferences_user_id
  ON user_preferences(user_id);

CREATE INDEX CONCURRENTLY idx_user_preferences_key
  ON user_preferences(user_id, preference_key);

-- Add foreign key AFTER indexes are created
ALTER TABLE user_preferences
  ADD CONSTRAINT fk_user_preferences_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE;
```

**Migration Strategy**:
```sql
-- Option 1: Split into two migrations
-- Migration 1: Create table and indexes concurrently
-- Migration 2: Migrate data (run during low-traffic window)

-- Option 2: Create table, add indexes later with CONCURRENTLY
-- (Recommended for large tables)
```

---

### Missing Data Validation Before NOT NULL Constraint
**File**: `migrations/20240115_add_user_preferences.sql`
**Line**: 18
**Category**: Migration Safety

**Issue**:
Adding `NOT NULL` constraint on `preference_value` without validating existing data. If any preferences have NULL values, migration will fail mid-flight.

**Risky Code**:
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value TEXT NOT NULL,  -- What if existing data has NULLs?
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Safe Approach**:
```sql
-- Step 1: Create table WITHOUT NOT NULL constraint
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value TEXT,  -- Allow NULL initially
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Migrate data
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT ...;

-- Step 3: Validate no NULLs exist
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM user_preferences
  WHERE preference_value IS NULL;

  IF null_count > 0 THEN
    -- Option A: Fail and investigate
    RAISE EXCEPTION 'Found % NULL preference values', null_count;

    -- Option B: Set default value
    -- UPDATE user_preferences
    -- SET preference_value = ''
    -- WHERE preference_value IS NULL;
  END IF;
END $$;

-- Step 4: NOW safe to add NOT NULL constraint
ALTER TABLE user_preferences
  ALTER COLUMN preference_value SET NOT NULL;
```

---

## ⚠️ Medium Priority Issues

### Missing Unique Constraint on User + Preference Key
**File**: `migrations/20240115_add_user_preferences.sql`
**Line**: 13-22
**Category**: Data Integrity

**Issue**:
No unique constraint on `(user_id, preference_key)` allows duplicate preferences for the same user.

**Add Constraint**:
```sql
ALTER TABLE user_preferences
  ADD CONSTRAINT uq_user_preference_key
  UNIQUE (user_id, preference_key);

-- Or include in initial table creation:
CREATE TABLE user_preferences (
  -- ... columns ...
  CONSTRAINT uq_user_preference_key UNIQUE (user_id, preference_key)
);
```

---

### Data Migration Script Not Idempotent
**File**: `migrations/20240115_add_user_preferences.sql`
**Line**: 35-42
**Category**: Migration Safety

**Issue**:
If migration fails mid-way and is retried, it will create duplicate preference rows.

**Current Non-Idempotent Code**:
```sql
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT
  id,
  key,
  value
FROM users,
LATERAL jsonb_each_text(preferences_json);
```

**Idempotent Version**:
```sql
INSERT INTO user_preferences (user_id, preference_key, preference_value)
SELECT
  id,
  key,
  value
FROM users,
LATERAL jsonb_each_text(preferences_json)
ON CONFLICT (user_id, preference_key) DO NOTHING;
-- Or DO UPDATE SET preference_value = EXCLUDED.preference_value
```

---

## 💡 Low Priority

### Consider Adding Updated Trigger
**File**: `migrations/20240115_add_user_preferences.sql`
**Category**: Data Quality

**Suggestion**:
Add trigger to auto-update `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 🧪 Migration Testing Requirements

### Missing Tests
**File**: `migrations/tests/20240115_test.sql`

**Required Test Scenarios**:

```sql
-- Test 1: Forward migration success
BEGIN;
  -- Run migration
  \i migrations/20240115_add_user_preferences.sql

  -- Verify table created
  SELECT COUNT(*) FROM user_preferences;

  -- Verify data migrated correctly
  SELECT COUNT(*) FROM users WHERE preferences_json IS NOT NULL;
  SELECT COUNT(*) FROM user_preferences;
  -- Counts should match expected ratio
ROLLBACK;

-- Test 2: Rollback safety (CRITICAL)
BEGIN;
  -- Run forward migration
  \i migrations/20240115_add_user_preferences_up.sql

  -- Capture data
  CREATE TEMP TABLE original_prefs AS
    SELECT * FROM user_preferences;

  -- Run rollback
  \i migrations/20240115_add_user_preferences_down.sql

  -- Verify NO DATA LOST
  SELECT
    (SELECT COUNT(*) FROM original_prefs) as original_count,
    (SELECT COUNT(*) FROM users WHERE preferences_json IS NOT NULL) as restored_count;
  -- These must match!

ROLLBACK;

-- Test 3: Idempotency
BEGIN;
  -- Run migration twice
  \i migrations/20240115_add_user_preferences.sql
  \i migrations/20240115_add_user_preferences.sql

  -- Verify no duplicates
  SELECT user_id, preference_key, COUNT(*)
  FROM user_preferences
  GROUP BY user_id, preference_key
  HAVING COUNT(*) > 1;
  -- Should return 0 rows

ROLLBACK;

-- Test 4: Large dataset performance
BEGIN;
  -- Insert 1M test users
  INSERT INTO users (id, preferences_json)
  SELECT gen_random_uuid(), '{"theme": "dark", "lang": "en"}'::jsonb
  FROM generate_series(1, 1000000);

  -- Time the migration
  \timing on
  \i migrations/20240115_add_user_preferences.sql
  \timing off
  -- Should complete in < 2 minutes

ROLLBACK;
```

---

## Deployment Plan

### Recommended Zero-Downtime Strategy

**Phase 1: Add Table and Indexes** (Week 1)
```sql
-- Create table (no data yet)
CREATE TABLE user_preferences (...);

-- Create indexes CONCURRENTLY
CREATE INDEX CONCURRENTLY idx_user_preferences_user_id ...;
CREATE INDEX CONCURRENTLY idx_user_preferences_key ...;
```

**Phase 2: Dual-Write Mode** (Week 2)
- Deploy code that writes to BOTH `preferences_json` AND `user_preferences`
- Reads still from `preferences_json`
- No downtime

**Phase 3: Background Data Migration** (Week 2-3)
```sql
-- Migrate in batches to avoid locks
DO $$
DECLARE
  batch_size INTEGER := 10000;
  offset_val INTEGER := 0;
BEGIN
  LOOP
    INSERT INTO user_preferences (user_id, preference_key, preference_value)
    SELECT id, key, value
    FROM (
      SELECT * FROM users
      WHERE preferences_json IS NOT NULL
      ORDER BY id
      LIMIT batch_size OFFSET offset_val
    ) u,
    LATERAL jsonb_each_text(u.preferences_json)
    ON CONFLICT (user_id, preference_key) DO NOTHING;

    EXIT WHEN NOT FOUND;
    offset_val := offset_val + batch_size;

    -- Sleep to avoid DB overload
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;
```

**Phase 4: Switch Reads** (Week 3)
- Deploy code that reads from `user_preferences`
- Still dual-writing for safety
- Monitor for issues

**Phase 5: Stop Writing to JSON** (Week 4)
- Deploy code that only writes to `user_preferences`
- Keep `preferences_json` column for 30 days as backup

**Phase 6: Cleanup** (Week 8)
```sql
-- After 30 days of stability
ALTER TABLE users DROP COLUMN preferences_json;
```

---

## Risk Assessment

### Data Impact
| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| Data loss on rollback | High | Critical | Fix rollback migration |
| Duplicate preferences | Medium | High | Add unique constraint |
| NULL values breaking NOT NULL | Low | High | Validate before constraint |
| Migration failure | Low | Medium | Add idempotency, test thoroughly |

### Performance Impact
| Operation | Current | With Fix | Duration |
|-----------|---------|----------|----------|
| Index creation | BLOCKING | CONCURRENT | 30-45s → 0s downtime |
| Data migration | Single transaction | Batched | 2 min → 5 min (non-blocking) |
| Rollback | Data loss | Safe | N/A → 3 min |

### Production Readiness
- ❌ **Not Ready**: Rollback causes data loss
- ❌ **Not Ready**: Index creation causes downtime
- ⚠️ **Needs Work**: Missing validation and tests
- ✅ **Ready**: Table schema is correct

---

## Required Actions Before Merge

### Must Fix (BLOCKING):
1. ✅ Fix rollback migration to preserve data
2. ✅ Use CONCURRENT index creation
3. ✅ Add data validation before NOT NULL constraint
4. ✅ Add comprehensive migration tests
5. ✅ Test rollback on staging with prod data

### Should Fix:
6. ⚠️ Add unique constraint on (user_id, preference_key)
7. ⚠️ Make data migration idempotent
8. ⚠️ Create detailed deployment plan

### Recommended:
9. 💡 Use phased zero-downtime approach
10. 💡 Add updated_at trigger
11. 💡 Add monitoring for migration progress

---

## Estimated Timeline

**Current Approach** (risky):
- Migration time: 2-3 minutes
- Downtime: 30-45 seconds
- Rollback risk: **DATA LOSS**

**Recommended Approach** (safe):
- Total timeline: 4 weeks (phased)
- Downtime: **0 seconds**
- Rollback risk: **Safe at all stages**

---

## Review Decision

❌ **DO NOT MERGE** until blocking issues are resolved

This migration has a critical data loss risk in the rollback path and will cause production downtime with the current approach. The schema design is good, but the migration strategy needs significant improvements for production safety.

**Recommended Next Steps**:
1. Fix rollback migration immediately
2. Switch to CONCURRENT index creation
3. Add all required tests
4. Consider phased deployment for zero downtime
5. Request re-review from DBA team

---

## Agent Contributions

- **Context**: Mapped data flow and dependencies
- **Migrator**: Identified all migration risks and safety issues
- **Detective**: Verified migration logic
- **Optimizer**: Analyzed performance impact and index strategy
- **Contract**: Checked API compatibility with schema changes
- **Tester**: Specified required test scenarios
- **Classifier**: Assessed risk severity
- **Synthesizer**: Generated deployment strategy

---

*Migration review completed in 8m 23s with deep safety analysis. Critical issues must be resolved before production deployment.*

# Enforcement System Quick Reference

**Version:** 1.0.0 | **Status:** Production Ready

---

## What's Enforced?

### Context Management (90.7% Reduction System)
✅ Token budget limits (100K total)
✅ Auto-compression at 75% usage
✅ Phase checkpointing
✅ External knowledge base structure
✅ Lazy loading patterns

### Orchestration Protocol (CLAUDE.md)
✅ 3-13 sub-agents per task
✅ Sequential phase execution (explore→plan→code→test→fix→document)
✅ Testing REQUIRED before completion
✅ Documentation REQUIRED for code changes
✅ Context preservation across phases

---

## Quick Commands

### Check Status

```bash
# Context health
bash .claude/hooks/context-management-hook.sh status

# Compliance report
bash .claude/hooks/orchestration-protocol-enforcer.sh report

# View violations
tail -20 .claude/orchestration/state/protocol_violations.log
```

### Manual Enforcement

```bash
# Force checkpoint
bash .claude/hooks/context-management-hook.sh enforce-checkpoint "code" "coder" "task-123"

# Validate agent count
bash .claude/hooks/orchestration-protocol-enforcer.sh validate-agents 5 "my task"

# Validate phase transition
bash .claude/hooks/orchestration-protocol-enforcer.sh validate-phase "explore" "plan"
```

### Clear Violations

```bash
# Clear violation log (creates backup)
bash .claude/hooks/orchestration-protocol-enforcer.sh clear-violations
```

---

## Context Budget Thresholds

| Usage | Status | Action |
|-------|--------|--------|
| 0-74% | ✅ OK | Normal operation |
| 75-89% | ⚠️ WARNING | Auto-compression triggered |
| 90-100% | 🚨 CRITICAL | Immediate compression required |

**Budget:** 100,000 tokens total

---

## Protocol Violations

### Severity Levels

| Level | Impact | Example |
|-------|--------|---------|
| **CRITICAL** | -10% per violation | <3 agents, skipped phase, no tests |
| **ERROR** | -5% per violation | >13 agents, no context tracking |
| **WARNING** | No score impact | Missing documentation plan |

### Compliance Scoring

- **90-100%:** ✅ COMPLIANT
- **70-89%:** ⚠️ PARTIAL COMPLIANCE
- **<70%:** 🚨 NON-COMPLIANT

---

## Common Scenarios

### Starting a New Task

**Pre-task hook automatically:**
1. Checks context health
2. Validates agent count (3-13)
3. Validates starting phase
4. Auto-compresses if needed
5. Verifies external KB structure

**No action needed** - enforcement is automatic!

### Completing a Task

**Post-task hook automatically:**
1. Enforces checkpoint creation
2. Validates all phases completed
3. Checks tests were run
4. Verifies documentation updated
5. Generates compliance report

**No action needed** - enforcement is automatic!

### Handling Violations

**If violation occurs:**
1. Review violation log: `.claude/orchestration/state/protocol_violations.log`
2. Check compliance report: `bash .claude/hooks/orchestration-protocol-enforcer.sh report`
3. Fix the issue (add agents, run tests, create docs, etc.)
4. Re-run task or phase

---

## Agent Count Guidelines

| Task Complexity | Recommended Agents | Example |
|-----------------|-------------------|---------|
| **Simple** | 3-5 agents | Bug fix, small feature |
| **Medium** | 5-8 agents | Feature implementation |
| **Complex** | 8-13 agents | System architecture, major refactor |

**Minimum:** 3 agents (always)
**Maximum:** 13 agents (split into subtasks if more needed)

---

## Phase Execution Order

**MANDATORY sequence:**

```
EXPLORE → PLAN → CODE → TEST → FIX → DOCUMENT
```

**Cannot skip phases!** (except jumping to FIX from any phase)

**Example valid transitions:**
- explore → plan ✅
- plan → code ✅
- code → test ✅
- test → fix ✅
- fix → test ✅ (re-testing after fix)
- test → document ✅

**Example INVALID transitions:**
- explore → code ❌ (missing plan)
- plan → test ❌ (missing code)
- code → document ❌ (missing test)

---

## Testing Requirements

**Before marking task complete:**
- ✅ TEST phase must be completed
- ✅ Tests must have run
- ✅ Tests must be passing

**If tests fail:**
- Transition to FIX phase
- Fix issues
- Return to TEST phase
- Repeat until passing

---

## Documentation Requirements

**When code changes are made:**
- ✅ DOCUMENT phase is REQUIRED
- ✅ Update Obsidian vault (not project repo)
- ✅ Create ADRs for architectural decisions
- ✅ Log research insights

**Obsidian paths:**
- Repository docs: `Repositories/{org}/{repo}.md`
- ADRs: `Repositories/{org}/{repo}/Decisions/`
- Research: `Research/{topic}/`

---

## Troubleshooting

### "Context usage CRITICAL"
**Cause:** >90% of 100K token budget used
**Solution:** Run `bash .claude/hooks/context-management-hook.sh auto-compress`

### "SUB_AGENT_COUNT_LOW violation"
**Cause:** <3 agents assigned to task
**Solution:** Add more specialized agents (minimum 3)

### "PHASE_SKIPPED violation"
**Cause:** Attempted to skip from explore→code without plan
**Solution:** Execute skipped phases in sequence

### "NO_TESTS_RUN violation"
**Cause:** Marked task complete without TEST phase
**Solution:** Execute TEST phase, then retry completion

---

## Environment Variables

**Optional overrides:**

```bash
# Override agent count (for testing)
export CLAUDE_AGENT_COUNT=5

# Override starting phase
export CLAUDE_STARTING_PHASE=explore

# Disable enforcement (NOT RECOMMENDED)
export CLAUDE_SKIP_ENFORCEMENT=1
```

---

## Performance

**Overhead per task:** <1 second
**Resource usage:** <1MB memory, ~2KB disk

**Non-blocking:** Enforcement shows warnings but doesn't halt execution

---

## Log Locations

| Log Type | Path |
|----------|------|
| **Protocol violations** | `.claude/orchestration/state/protocol_violations.log` |
| **Orchestration DB** | `.claude/orchestration/db/agents.db` |
| **Daily logs** | `.claude/orchestration/logs/YYYY-MM-DD.log` |
| **Task logs** | `.claude/logs/tasks.log` |

---

## SQL Queries

### Recent Violations

```sql
sqlite3 .claude/orchestration/db/agents.db "
  SELECT timestamp, level, message
  FROM activity_log
  WHERE category = 'orchestration'
  AND action = 'protocol_violation'
  ORDER BY timestamp DESC
  LIMIT 10;
"
```

### Auto-Compression Events

```sql
sqlite3 .claude/orchestration/db/agents.db "
  SELECT timestamp, message
  FROM activity_log
  WHERE action = 'auto_compress'
  ORDER BY timestamp DESC
  LIMIT 10;
"
```

### Checkpoint History

```sql
sqlite3 .claude/orchestration/db/agents.db "
  SELECT timestamp, checkpoint_type, state
  FROM checkpoints
  WHERE task_id = 'task-123'
  ORDER BY timestamp;
"
```

---

## Best Practices

### For Developers

1. **Start with minimum 3 agents** for any non-trivial task
2. **Follow phase sequence** - don't skip phases
3. **Run tests** before marking complete
4. **Document in Obsidian** vault, not project repo
5. **Monitor context health** - compress at 75%

### For Coordinators

1. **Check compliance reports** after each task
2. **Review violations** weekly
3. **Analyze patterns** in non-compliant tasks
4. **Adjust thresholds** if needed (via hook config)
5. **Archive old logs** monthly

---

## Integration Points

### Pre-Task Hook
**File:** `.claude/hooks/pre-task.sh`
**Calls:**
- `context-management-hook.sh pre-operation`
- `orchestration-protocol-enforcer.sh pre-task`

### Post-Task Hook
**File:** `.claude/hooks/post-task.sh`
**Calls:**
- `context-management-hook.sh post-operation`
- `orchestration-protocol-enforcer.sh post-task`

---

## References

- **Full Documentation:** [[../../obsidian/System/Context-Management/ENFORCEMENT-VALIDATION.md]]
- **Context Management:** [[../../obsidian/System/Context-Management/FINAL-SUMMARY.md]]
- **CLAUDE.md Protocol:** [[../CLAUDE.md]]
- **Hook Scripts:** [[../hooks/]]

---

**Questions?** Check `.claude/orchestration/PROTOCOL.md` or run compliance report.

**Status:** ✅ Enforcement system active and operational

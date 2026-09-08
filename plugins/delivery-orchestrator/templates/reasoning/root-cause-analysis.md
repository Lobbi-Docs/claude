# Root Cause Analysis Template

Use this template for systematic root cause investigation.

## Incident Summary

**Incident ID**: {{INCIDENT_ID}}
**Jira Issue**: {{ISSUE_KEY}}
**Date/Time**: {{DATETIME}}
**Duration**: {{DURATION}}
**Severity**: {{SEVERITY}}
**Status**: {{STATUS}}

---

## Impact Assessment

| Metric | Value |
|--------|-------|
| Users Affected | {{USERS}} |
| Revenue Impact | {{REVENUE}} |
| Data Loss | {{DATA_LOSS}} |
| SLA Breach | {{SLA_BREACH}} |
| Reputation Impact | {{REPUTATION}} |

---

## Timeline

| Time | Event | System | Actor | Impact |
|------|-------|--------|-------|--------|
| {{T_MINUS_N}} | {{EVENT}} | {{SYSTEM}} | {{ACTOR}} | {{IMPACT}} |
| {{T_0}} | **Incident Start** | {{SYSTEM}} | - | {{IMPACT}} |
| {{T_PLUS_N}} | {{EVENT}} | {{SYSTEM}} | {{ACTOR}} | {{IMPACT}} |
| {{T_RESOLVED}} | **Resolution** | {{SYSTEM}} | {{ACTOR}} | Restored |

---

## Documentation Verification

### Expected Behavior (from Context7)

**System**: {{SYSTEM_NAME}}
**Library ID**: {{CONTEXT7_ID}}

**Expected**:
```
{{EXPECTED_BEHAVIOR}}
```

**Actual**:
```
{{ACTUAL_BEHAVIOR}}
```

**Gap**:
```
{{GAP_DESCRIPTION}}
```

---

## Five Whys Analysis

### Why 1: Why did {{SYMPTOM}} occur?
**Answer**: {{CAUSE_1}}
**Evidence**: {{EVIDENCE_1}}
**Documentation**: {{DOC_1}}

### Why 2: Why did {{CAUSE_1}} occur?
**Answer**: {{CAUSE_2}}
**Evidence**: {{EVIDENCE_2}}
**Documentation**: {{DOC_2}}

### Why 3: Why did {{CAUSE_2}} occur?
**Answer**: {{CAUSE_3}}
**Evidence**: {{EVIDENCE_3}}
**Documentation**: {{DOC_3}}

### Why 4: Why did {{CAUSE_3}} occur?
**Answer**: {{CAUSE_4}}
**Evidence**: {{EVIDENCE_4}}
**Documentation**: {{DOC_4}}

### Why 5: Why did {{CAUSE_4}} occur?
**Answer**: {{ROOT_CAUSE}}
**Evidence**: {{EVIDENCE_5}}
**Documentation**: {{DOC_5}}

---

## Root Cause Statement

**Root Cause**: {{ROOT_CAUSE_STATEMENT}}

**Category**: {{CATEGORY}} (Code / Config / Process / Infrastructure / External)

**Contributing Factors**:
1. {{FACTOR_1}}
2. {{FACTOR_2}}
3. {{FACTOR_3}}

---

## Fishbone Analysis

```
                    Methods              Machines (Systems)
                       │                        │
              ┌────────┴────────┐      ┌────────┴────────┐
              │ {{METHOD_1}}   │      │ {{MACHINE_1}}   │
              │ {{METHOD_2}}   │      │ {{MACHINE_2}}   │
              └────────┬────────┘      └────────┬────────┘
                       │                        │
                       ▼                        ▼
              ┌────────────────────────────────────────┐
              │                                        │
              │         {{PROBLEM_STATEMENT}}          │
              │                                        │
              └────────────────────────────────────────┘
                       ▲                        ▲
                       │                        │
              ┌────────┴────────┐      ┌────────┴────────┐
              │ {{MATERIAL_1}} │      │ {{PEOPLE_1}}    │
              │ {{MATERIAL_2}} │      │ {{PEOPLE_2}}    │
              └────────┬────────┘      └────────┬────────┘
                       │                        │
                  Materials               People/Process
```

---

## Prevention Actions

### Immediate (24-48 hours)
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| {{ACTION_1}} | {{OWNER_1}} | {{DATE_1}} | [ ] |
| {{ACTION_2}} | {{OWNER_2}} | {{DATE_2}} | [ ] |

### Short-term (1-2 weeks)
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| {{ACTION_3}} | {{OWNER_3}} | {{DATE_3}} | [ ] |
| {{ACTION_4}} | {{OWNER_4}} | {{DATE_4}} | [ ] |

### Long-term (1-3 months)
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| {{ACTION_5}} | {{OWNER_5}} | {{DATE_5}} | [ ] |
| {{ACTION_6}} | {{OWNER_6}} | {{DATE_6}} | [ ] |

---

## Lessons Learned

**What Went Well**:
- {{WELL_1}}
- {{WELL_2}}

**What Didn't Go Well**:
- {{NOT_WELL_1}}
- {{NOT_WELL_2}}

**Action Items**:
- {{AI_1}}
- {{AI_2}}

---

## Documentation Updates

| Document | Update Needed | Owner | Status |
|----------|--------------|-------|--------|
| {{DOC_1}} | {{UPDATE_1}} | {{OWNER}} | [ ] |
| {{DOC_2}} | {{UPDATE_2}} | {{OWNER}} | [ ] |

---

## Memory Storage

```yaml
entity:
  name: "rca-{{INCIDENT_ID}}"
  type: "RootCauseAnalysis"
  observations:
    - "Incident: {{SUMMARY}}"
    - "Root Cause: {{ROOT_CAUSE_STATEMENT}}"
    - "Category: {{CATEGORY}}"
    - "Prevention: {{KEY_PREVENTION}}"
    - "Date: {{DATE}}"

relations:
  - from: "rca-{{INCIDENT_ID}}"
    to: "system-{{SYSTEM}}"
    type: "affects"
  - from: "rca-{{INCIDENT_ID}}"
    to: "action-{{ACTION_ID}}"
    type: "prevented_by"
```

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Incident Lead | {{NAME}} | {{DATE}} | [ ] |
| Engineering Lead | {{NAME}} | {{DATE}} | [ ] |
| Product Owner | {{NAME}} | {{DATE}} | [ ] |

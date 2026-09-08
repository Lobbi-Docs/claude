# Chain-of-Thought Reasoning Template

Use this template for systematic, step-by-step problem analysis.

## Problem Statement

**Issue**: {{ISSUE_KEY}}
**Problem**: {{PROBLEM_DESCRIPTION}}
**Expected Outcome**: {{EXPECTED_OUTCOME}}

---

## Phase 1: Documentation Research

### Technologies Identified
| Technology | Context7 ID | Version | Relevance |
|------------|-------------|---------|-----------|
| {{TECH_1}} | {{ID_1}}    | {{VER}} | {{REL}}   |
| {{TECH_2}} | {{ID_2}}    | {{VER}} | {{REL}}   |

### Key Documentation Findings
```markdown
### {{TECH_1}}
- Expected Behavior: {{EXPECTED}}
- Relevant Patterns: {{PATTERNS}}
- Gotchas: {{GOTCHAS}}

### {{TECH_2}}
- Expected Behavior: {{EXPECTED}}
- Relevant Patterns: {{PATTERNS}}
- Gotchas: {{GOTCHAS}}
```

---

## Phase 2: Sequential Analysis

### Step 1: Understand Context
**What do we know?**
- {{KNOWN_FACT_1}}
- {{KNOWN_FACT_2}}
- {{KNOWN_FACT_3}}

**What are the constraints?**
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

**What is unclear?**
- {{UNCERTAINTY_1}}
- {{UNCERTAINTY_2}}

### Step 2: Identify Components
**Component A**: {{COMPONENT_A_DESC}}
- Role: {{ROLE}}
- Dependencies: {{DEPS}}
- Documentation: {{DOC_REF}}

**Component B**: {{COMPONENT_B_DESC}}
- Role: {{ROLE}}
- Dependencies: {{DEPS}}
- Documentation: {{DOC_REF}}

**Interactions**:
```
[Component A] ──{{INTERACTION}}──► [Component B]
```

### Step 3: Analyze Each Component

**Component A Analysis**:
- Current State: {{STATE}}
- Expected State (from docs): {{EXPECTED}}
- Gap: {{GAP}}
- Root Issue: {{ROOT_ISSUE}}

**Component B Analysis**:
- Current State: {{STATE}}
- Expected State (from docs): {{EXPECTED}}
- Gap: {{GAP}}
- Root Issue: {{ROOT_ISSUE}}

### Step 4: Synthesize Findings
**Key Insights**:
1. {{INSIGHT_1}}
2. {{INSIGHT_2}}
3. {{INSIGHT_3}}

**Connections Discovered**:
- {{CONNECTION_1}}
- {{CONNECTION_2}}

### Step 5: Formulate Solution

**Recommended Approach**:
{{SOLUTION_DESCRIPTION}}

**Implementation Steps**:
1. {{STEP_1}}
   - Action: {{ACTION}}
   - Expected Result: {{RESULT}}
   - Verification: {{VERIFY}}

2. {{STEP_2}}
   - Action: {{ACTION}}
   - Expected Result: {{RESULT}}
   - Verification: {{VERIFY}}

3. {{STEP_3}}
   - Action: {{ACTION}}
   - Expected Result: {{RESULT}}
   - Verification: {{VERIFY}}

**Trade-offs**:
| Benefit | Cost |
|---------|------|
| {{BENEFIT_1}} | {{COST_1}} |
| {{BENEFIT_2}} | {{COST_2}} |

---

## Phase 3: Conclusion

**Final Recommendation**: {{RECOMMENDATION}}

**Confidence Level**: {{HIGH/MEDIUM/LOW}}

**Reasoning Summary**:
{{SUMMARY}}

**Next Actions**:
- [ ] {{ACTION_1}}
- [ ] {{ACTION_2}}
- [ ] {{ACTION_3}}

**Documentation Updates Needed**:
- [ ] {{DOC_UPDATE_1}}
- [ ] {{DOC_UPDATE_2}}

---

## Memory Storage

```yaml
entity:
  name: "cot-{{ISSUE_KEY}}-{{TIMESTAMP}}"
  type: "ReasoningChain"
  observations:
    - "Problem: {{PROBLEM_SUMMARY}}"
    - "Solution: {{SOLUTION_SUMMARY}}"
    - "Key Insight: {{KEY_INSIGHT}}"
    - "Technologies: {{TECH_LIST}}"
```

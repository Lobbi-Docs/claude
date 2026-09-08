# Decision Matrix Template

Use this template for structured evaluation of multiple alternatives.

## Decision Context

**Decision**: {{DECISION_TITLE}}
**Issue**: {{ISSUE_KEY}}
**Date**: {{DATE}}
**Stakeholders**: {{STAKEHOLDERS}}

---

## Alternatives Identified

### Alternative 1: {{ALT_1_NAME}}
**Description**: {{ALT_1_DESC}}
**Context7 Documentation**: {{DOC_ID_1}}

### Alternative 2: {{ALT_2_NAME}}
**Description**: {{ALT_2_DESC}}
**Context7 Documentation**: {{DOC_ID_2}}

### Alternative 3: {{ALT_3_NAME}}
**Description**: {{ALT_3_DESC}}
**Context7 Documentation**: {{DOC_ID_3}}

---

## Evaluation Criteria

| Criterion | Weight | Description | Source |
|-----------|--------|-------------|--------|
| {{CRITERION_1}} | {{WEIGHT_1}}% | {{DESC_1}} | {{SRC_1}} |
| {{CRITERION_2}} | {{WEIGHT_2}}% | {{DESC_2}} | {{SRC_2}} |
| {{CRITERION_3}} | {{WEIGHT_3}}% | {{DESC_3}} | {{SRC_3}} |
| {{CRITERION_4}} | {{WEIGHT_4}}% | {{DESC_4}} | {{SRC_4}} |
| {{CRITERION_5}} | {{WEIGHT_5}}% | {{DESC_5}} | {{SRC_5}} |

**Total**: 100%

---

## Scoring Matrix

| Criterion (Weight) | Alt 1 | Alt 2 | Alt 3 | Notes |
|--------------------|-------|-------|-------|-------|
| {{C1}} ({{W1}}%) | {{S1_1}} | {{S2_1}} | {{S3_1}} | {{N1}} |
| {{C2}} ({{W2}}%) | {{S1_2}} | {{S2_2}} | {{S3_2}} | {{N2}} |
| {{C3}} ({{W3}}%) | {{S1_3}} | {{S2_3}} | {{S3_3}} | {{N3}} |
| {{C4}} ({{W4}}%) | {{S1_4}} | {{S2_4}} | {{S3_4}} | {{N4}} |
| {{C5}} ({{W5}}%) | {{S1_5}} | {{S2_5}} | {{S3_5}} | {{N5}} |

**Scoring Scale**: 1 (Poor) - 5 (Excellent)

---

## Weighted Scores

| Alternative | Raw Score | Weighted Score | Rank |
|-------------|-----------|----------------|------|
| {{ALT_1}} | {{RAW_1}} | **{{WEIGHTED_1}}** | {{RANK_1}} |
| {{ALT_2}} | {{RAW_2}} | **{{WEIGHTED_2}}** | {{RANK_2}} |
| {{ALT_3}} | {{RAW_3}} | **{{WEIGHTED_3}}** | {{RANK_3}} |

---

## Detailed Analysis

### {{ALT_1_NAME}}

**Strengths** (from documentation):
- {{STRENGTH_1}}
- {{STRENGTH_2}}

**Weaknesses** (from documentation):
- {{WEAKNESS_1}}
- {{WEAKNESS_2}}

**Risks**:
- {{RISK_1}}: Mitigation: {{MITIGATION_1}}

**Documentation Coverage**: {{COVERAGE_1}}

### {{ALT_2_NAME}}

**Strengths** (from documentation):
- {{STRENGTH_1}}
- {{STRENGTH_2}}

**Weaknesses** (from documentation):
- {{WEAKNESS_1}}
- {{WEAKNESS_2}}

**Risks**:
- {{RISK_1}}: Mitigation: {{MITIGATION_1}}

**Documentation Coverage**: {{COVERAGE_2}}

### {{ALT_3_NAME}}

**Strengths** (from documentation):
- {{STRENGTH_1}}
- {{STRENGTH_2}}

**Weaknesses** (from documentation):
- {{WEAKNESS_1}}
- {{WEAKNESS_2}}

**Risks**:
- {{RISK_1}}: Mitigation: {{MITIGATION_1}}

**Documentation Coverage**: {{COVERAGE_3}}

---

## Decision

**Selected Alternative**: {{SELECTED}}

**Rationale**:
1. {{REASON_1}}
2. {{REASON_2}}
3. {{REASON_3}}

**Trade-offs Accepted**:
- {{TRADEOFF_1}}
- {{TRADEOFF_2}}

**Rejected Alternatives**:
- {{REJECTED_1}}: {{WHY_REJECTED_1}}
- {{REJECTED_2}}: {{WHY_REJECTED_2}}

---

## Implementation Notes

**From Documentation**:
- Recommended Pattern: {{PATTERN}}
- Configuration: {{CONFIG}}
- Best Practices: {{BEST_PRACTICES}}

**Watch Out For**:
- {{GOTCHA_1}}
- {{GOTCHA_2}}

---

## Memory Storage

```yaml
entity:
  name: "decision-{{ISSUE_KEY}}-{{TOPIC}}"
  type: "ArchitectureDecision"
  observations:
    - "Decision: {{DECISION_TITLE}}"
    - "Selected: {{SELECTED}}"
    - "Rationale: {{RATIONALE_SUMMARY}}"
    - "Alternatives: {{ALT_LIST}}"
    - "Date: {{DATE}}"
relations:
  - from: "decision-{{ISSUE_KEY}}-{{TOPIC}}"
    type: "selected"
    to: "{{SELECTED}}"
  - from: "decision-{{ISSUE_KEY}}-{{TOPIC}}"
    type: "considered"
    to: "{{REJECTED_1}}"
```

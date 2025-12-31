# Duplicate Detector Agent

**Callsign:** Sentinel
**Model:** sonnet
**Role:** Duplicate detection and resolution

## Mission

Detect duplicate records using exact and fuzzy matching algorithms. Propose resolution strategies and enable automated or manual deduplication to ensure data integrity.

## Capabilities

### Matching Algorithms
- Exact match on key fields
- Fuzzy matching (Levenshtein distance, Jaro-Winkler)
- Soundex/Metaphone for phonetic matching
- N-gram similarity
- Configurable match thresholds

### Duplicate Resolution
- Identify master records
- Propose merge strategies
- Track duplicate relationships
- Support manual review workflow

## Input Protocol

```yaml
request:
  source_id: "uuid"
  config:
    match_fields:
      - field: "email"
        weight: 1.0
        algorithm: "exact"
      - field: "full_name"
        weight: 0.8
        algorithm: "fuzzy"
        threshold: 0.85
      - field: "phone"
        weight: 0.6
        algorithm: "normalized"

    threshold: 0.85  # Overall match threshold
    max_pairs: 10000  # Limit for large datasets
    include_potential: true  # Include 70-85% matches
```

## Output Protocol

```yaml
response:
  detection_id: "uuid"
  executed_at: "2024-01-15T10:30:00Z"
  duration_ms: 125000

  summary:
    total_records: 150000
    duplicate_groups: 987
    total_duplicates: 1974
    potential_duplicates: 234

  groups:
    - group_id: "dup-001"
      confidence: 0.98
      match_type: "exact"
      match_field: "email"
      records:
        - record_id: "CUS-002341"
          email: "john.smith@example.com"
          full_name: "John Smith"
          signup_date: "2021-03-15"
          is_suggested_master: true
          reason: "Earlier signup, more complete data"

        - record_id: "CUS-005423"
          email: "john.smith@example.com"
          full_name: "John A. Smith"
          signup_date: "2023-08-22"
          is_suggested_master: false

      suggested_action: "merge"
      merge_strategy:
        keep: "CUS-002341"
        merge_fields_from: ["CUS-005423"]
        fields_to_merge:
          - field: "phone"
            use_from: "CUS-005423"
            reason: "More recent, likely current"

    - group_id: "dup-002"
      confidence: 0.87
      match_type: "fuzzy"
      match_fields: ["full_name", "phone"]
      records:
        - record_id: "CUS-001002"
          email: "jdoe@company.com"
          full_name: "Jane Doe"
          phone: "555-123-4567"

        - record_id: "CUS-008934"
          email: "jane.doe@company.com"
          full_name: "Jane M. Doe"
          phone: "555-123-4567"

      suggested_action: "review"
      review_reason: "Different emails, may be different people"

  resolution_options:
    auto_merge_eligible: 744
    manual_review_required: 243
    skip_recommended: 0

  export:
    duplicate_pairs_csv: "/exports/duplicates-2024-01-15.csv"
```

## Matching Process

```mermaid
graph TD
    A[Load Records] --> B[Build Index]
    B --> C[Exact Match Pass]
    C --> D[Fuzzy Match Pass]
    D --> E[Score Combinations]
    E --> F[Group Duplicates]
    F --> G[Rank by Confidence]
    G --> H[Suggest Resolutions]
    H --> I[Output Report]
```

## Match Scoring

| Algorithm | Use Case | Speed |
|-----------|----------|-------|
| Exact | Email, ID, SSN | Fast |
| Levenshtein | Names with typos | Medium |
| Jaro-Winkler | Similar names | Medium |
| Soundex | Phonetic names | Fast |
| N-gram | Long text | Slow |

## Resolution Strategies

| Strategy | When to Use |
|----------|-------------|
| Keep First | By record order/ID |
| Keep Most Recent | By timestamp |
| Keep Most Complete | By data completeness |
| Merge | Combine best of both |
| Manual | Complex cases |

## Integration Points

- **Inputs from:** Source Analyzer Agent
- **Outputs to:** Data Validator Agent, Migration Executor Agent
- **Triggered by:** Validation phase, /find-duplicates command

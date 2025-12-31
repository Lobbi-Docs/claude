# Fixer Plugin - Architecture Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER PROVIDES ERROR                       │
│  "Fix this: TypeError: Cannot read property 'name' of       │
│   undefined at UserProfile.tsx:45"                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               PLUGIN ACTIVATION SYSTEM                       │
│  • Keyword Match: "error", "TypeError"                       │
│  • Stack Trace Detected: ✓                                   │
│  • Priority: 95                                              │
│  • Decision: ACTIVATE FIXER                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 WORKFLOW SELECTION                           │
│                                                              │
│  Simple error + stack trace → QUICK FIX WORKFLOW             │
│  "why does this keep happening" → DEEP ANALYSIS WORKFLOW     │
│  "scan for errors" → PREVENTION AUDIT WORKFLOW               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
  QUICK FIX WORKFLOW          DEEP ANALYSIS WORKFLOW
  (60-120 seconds)            (5-10 minutes)
```

---

## Quick Fix Workflow Detail

```
Phase 1: TRIAGE (15s, parallel)
┌────────────────┐    ┌────────────────┐
│ Error Triage   │    │ Stack Parser   │
│ Agent (Haiku)  │    │ Agent (Sonnet) │
└───────┬────────┘    └───────┬────────┘
        │                     │
        │  • Error type       │  • Root cause frame
        │  • Severity         │  • Execution flow
        │  • Language         │  • User vs lib code
        └──────────┬──────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ ParsedError Object   │
        │ • type: TypeError    │
        │ • severity: 4        │
        │ • language: TS       │
        │ • location: L45      │
        └──────────┬───────────┘
                   │
                   ▼

Phase 2: PATTERN MATCHING & RESEARCH (30s, parallel)
┌────────────────┐    ┌────────────────────┐
│ Pattern        │    │ Solution           │
│ Matcher        │    │ Researcher         │
│ (Sonnet)       │    │ (Sonnet)           │
└───────┬────────┘    └───────┬────────────┘
        │                     │
        │  • Known patterns   │  • StackOverflow (top 5)
        │  • Fingerprint      │  • GitHub issues
        │  • Cached solutions │  • Documentation
        └──────────┬──────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Solution Candidates  │
        │ • 10+ solutions      │
        │ • Ranked by relevance│
        │ • Confidence scores  │
        └──────────┬───────────┘
                   │
                   ▼

Phase 3: CONTEXT ANALYSIS (30s, parallel)
┌────────────────┐    ┌────────────────────┐
│ Context        │    │ TypeScript Expert  │
│ Analyzer       │    │ (language-specific)│
│ (Sonnet)       │    │ (Sonnet)           │
└───────┬────────┘    └───────┬────────────┘
        │                     │
        │  • Read file        │  • TS type analysis
        │  • Extract code     │  • Compiler insights
        │  • Trace variables  │  • tsconfig check
        │  • Find imports     │
        └──────────┬──────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Code Context         │
        │ • Snippet ±10 lines  │
        │ • Variables in scope │
        │ • Dependencies       │
        └──────────┬───────────┘
                   │
                   ▼

Phase 4: FIX GENERATION (45s)
┌────────────────────────────────┐
│ Fix Generator Agent            │
│ (Opus - Highest Intelligence)  │
│                                │
│ Inputs:                        │
│  • Parsed error                │
│  • Solution candidates         │
│  • Code context                │
│  • Pattern matches             │
│                                │
│ Generates:                     │
│  • Primary fix (95% conf)      │
│  • Alt fix 1 (88% conf)        │
│  • Alt fix 2 (82% conf)        │
│  • Unified diff patches        │
│  • Test cases                  │
└────────────────┬───────────────┘
                 │
                 ▼
      ┌──────────────────┐
      │ CodeFix Objects  │
      │ • Patch ready    │
      │ • Tests ready    │
      └──────────┬───────┘
                 │
                 ▼

Phase 5: EXPLANATION (30s, parallel with Phase 4)
┌────────────────────────────────┐
│ Root Cause Analyst Agent       │
│ (Opus - Deep Understanding)    │
│                                │
│ Explains:                      │
│  • WHAT happened (technical)   │
│  • WHY happened (causal)       │
│  • Common misconception        │
│  • Correct mental model        │
│  • Educational resources       │
└────────────────┬───────────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ RootCauseAnalysis    │
      │ • Full explanation   │
      │ • Learning materials │
      └──────────┬───────────┘
                 │
                 ▼

Phase 6: APPLICATION (30s)
┌────────────────────────────────┐
│ Fix Application                │
│                                │
│ If auto_apply_fixes = true     │
│ AND confidence >= threshold:   │
│   • Apply patch                │
│   • Run tests                  │
│   • Verify success             │
│ Else:                          │
│   • Present for approval       │
└────────────────┬───────────────┘
                 │
                 ▼
      ┌──────────────────────┐
      │ Final Result         │
      │ • Fix applied/shown  │
      │ • Tests passed       │
      │ • Explanation        │
      │ • Prevention advice  │
      └──────────────────────┘
```

---

## Deep Analysis Workflow Detail

```
For Recurring Errors: "Why does this keep happening?"

Phase 1: HISTORY ANALYSIS (20s)
┌─────────────────────────────────┐
│ Pattern Matcher                 │
│ • Search error database         │
│ • Find previous occurrences (4) │
│ • Identify recurrence pattern   │
│ • Detect error evolution        │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Historical Context   │
    │ • 4 previous errors  │
    │ • Every 4-7 days     │
    │ • Same pattern       │
    └──────────┬───────────┘
               │
               ▼

Phase 2: COMPREHENSIVE ANALYSIS (45s, parallel)
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Triage  │  │  Stack   │  │ Context  │
│          │  │  Parser  │  │ Analyzer │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │ Deep Understanding   │
        │ • Full stack         │
        │ • Extended context   │
        │ • Dependency graph   │
        └──────────┬───────────┘
                   │
                   ▼

Phase 3: MULTI-SOURCE RESEARCH (60s)
┌─────────────────────────────────┐
│ Solution Researcher             │
│ • StackOverflow: 10+ results    │
│ • GitHub: Multiple repos        │
│ • Documentation: Official       │
│ • Known bugs database           │
└──────────────┬──────────────────┘
               │
               ▼

Phase 4: LANGUAGE EXPERT (45s)
┌─────────────────────────────────┐
│ Python/TS/Rust/Go Expert        │
│ • Language-specific insights    │
│ • Type/memory analysis          │
│ • Idiom review                  │
└──────────────┬──────────────────┘
               │
               ▼

Phase 5: ROOT CAUSE DEEP DIVE (60s)
┌─────────────────────────────────┐
│ Root Cause Analyst (Opus)       │
│                                 │
│ Builds complete causal chain:   │
│  IMMEDIATE → DEEPER → SYSTEMIC  │
│                                 │
│ • Why previous fixes failed     │
│ • System-level issues           │
│ • Knowledge gaps                │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Deep Root Cause      │
    │ • 3-level analysis   │
    │ • Failed fix reasons │
    │ • Team gaps          │
    └──────────┬───────────┘
               │
               ▼

Phase 6: MULTI-LEVEL SOLUTIONS (60s)
┌─────────────────────────────────┐
│ Fix Generator (Opus)            │
│                                 │
│ Generates 3 solution levels:    │
│  • TACTICAL (now)               │
│  • STRATEGIC (this week)        │
│  • SYSTEMIC (this month)        │
└──────────────┬──────────────────┘
               │
               ▼

Phase 7: PREVENTION DESIGN (60s)
┌─────────────────────────────────┐
│ Prevention Architect (Opus)     │
│                                 │
│ Designs complete prevention:    │
│  • Linting rules                │
│  • Type improvements            │
│  • Test patterns                │
│  • CI/CD checks                 │
│  • Pre-commit hooks             │
│  • Documentation                │
└──────────────┬──────────────────┘
               │
               ▼

Phase 8: IMPLEMENTATION ROADMAP (30s)
┌─────────────────────────────────┐
│ Create phased plan:             │
│  • Quick wins (today)           │
│  • Short-term (this week)       │
│  • Medium-term (this month)     │
│  • Long-term (next quarter)     │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Complete Package     │
    │ • Immediate fix      │
    │ • Root cause         │
    │ • 3-level solutions  │
    │ • Prevention         │
    │ • Roadmap            │
    │ • Implementation     │
    └──────────────────────┘
```

---

## Agent Coordination Matrix

```
┌─────────────────┬──────┬───────┬─────────┬──────────┬─────────┐
│ Agent           │Quick │ Deep  │Prevention│ Always  │ Parallel│
│                 │ Fix  │Analysis│ Audit   │ Active  │ Capable │
├─────────────────┼──────┼───────┼──────────┼─────────┼─────────┤
│ Error Triage    │  ✓   │   ✓   │    ✓     │   ✓     │   ✓     │
│ Stack Parser    │  ✓   │   ✓   │    -     │   ✓     │   ✓     │
│ Pattern Matcher │  ✓   │   ✓   │    ✓     │   -     │   ✓     │
│ Solution Search │  ✓   │   ✓   │    -     │   -     │   ✓     │
│ Context Analyze │  ✓   │   ✓   │    ✓     │   -     │   ✓     │
│ Fix Generator   │  ✓   │   ✓   │    -     │   ✓*    │   -     │
│ Root Cause      │  ✓   │   ✓   │    -     │   -     │   ✓     │
│ Prevention Arch │  -   │   ✓   │    ✓     │   -     │   -     │
│ TS Expert       │  ✓†  │   ✓†  │    ✓†    │   -     │   ✓     │
│ Python Expert   │  ✓†  │   ✓†  │    ✓†    │   -     │   ✓     │
│ Rust Expert     │  ✓†  │   ✓†  │    ✓†    │   -     │   ✓     │
│ Go Expert       │  ✓†  │   ✓†  │    ✓†    │   -     │   ✓     │
└─────────────────┴──────┴───────┴──────────┴─────────┴─────────┘

✓  = Used in workflow
✓* = Always included in fix generation
✓† = Activated based on detected language
-  = Not used in workflow
```

---

## Data Flow Diagram

```
┌──────────────┐
│ USER INPUT   │
│ (Error Text) │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ PARSING & CLASSIFICATION                             │
│                                                      │
│  Raw Text → ParsedError Object                       │
│  • error.message                                     │
│  • error.type                                        │
│  • error.stackTrace                                  │
│  • error.location                                    │
│  • error.fingerprint                                 │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ PATTERN MATCHING                                     │
│                                                      │
│  Fingerprint → Known Patterns DB → PatternMatch[]   │
│  • 30,262 historical errors                          │
│  • Confidence scoring                                │
│  • Cached solutions                                  │
└──────┬───────────────────────────────────────────────┘
       │
       ├─────────────────────┬─────────────────┐
       ▼                     ▼                 ▼
┌─────────────┐   ┌──────────────┐   ┌───────────────┐
│ EXTERNAL    │   │ CODE         │   │ LANGUAGE      │
│ RESEARCH    │   │ ANALYSIS     │   │ EXPERTISE     │
│             │   │              │   │               │
│ • SO API    │   │ • File read  │   │ • TS/Py/Rs/Go │
│ • GitHub    │   │ • AST parse  │   │ • Type check  │
│ • Docs      │   │ • Scope      │   │ • Idioms      │
└─────┬───────┘   └──────┬───────┘   └───────┬───────┘
      │                  │                   │
      └──────────────────┼───────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ SYNTHESIS       │
                │ (Opus Model)    │
                │                 │
                │ All inputs →    │
                │   Fix solutions │
                └────────┬────────┘
                         │
                         ▼
           ┌─────────────┴──────────────┐
           │                            │
           ▼                            ▼
    ┌─────────────┐            ┌──────────────┐
    │ CODE FIX    │            │ EXPLANATION  │
    │             │            │              │
    │ • Patch     │            │ • What/Why   │
    │ • Tests     │            │ • Prevention │
    │ • Confidence│            │ • Learning   │
    └──────┬──────┘            └──────┬───────┘
           │                          │
           └─────────┬────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ FINAL       │
              │ RESULT      │
              │             │
              │ • Fix       │
              │ • Explain   │
              │ • Prevent   │
              │ • Educate   │
              └─────────────┘
```

---

## Component Dependencies

```
┌─────────────────────────────────────────────────────┐
│ EXTERNAL DEPENDENCIES                               │
└─────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────┐  ┌────────────────┐
│ MCP Servers  │  │ Skills   │  │ External APIs  │
│              │  │          │  │                │
│ • github     │  │ • debug  │  │ • StackOverflow│
│ • obsidian   │  │ • testing│  │ • GitHub Search│
└──────────────┘  └──────────┘  └────────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│ FIXER PLUGIN CORE                                   │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Agent Roster │  │ Workflows    │               │
│  │ (12 agents)  │  │ (3 flows)    │               │
│  └──────────────┘  └──────────────┘               │
│         │                  │                       │
│         └────────┬─────────┘                       │
│                  │                                 │
│                  ▼                                 │
│  ┌───────────────────────────────┐                │
│  │ Pattern Database              │                │
│  │ • 10 patterns                 │                │
│  │ • 30,262 historical matches   │                │
│  └───────────────────────────────┘                │
│                  │                                 │
│                  ▼                                 │
│  ┌───────────────────────────────┐                │
│  │ Type System                   │                │
│  │ • ParsedError                 │                │
│  │ • CodeFix                     │                │
│  │ • Solution                    │                │
│  │ • PreventionStrategy          │                │
│  └───────────────────────────────┘                │
└─────────────────────────────────────────────────────┘
```

---

## Execution Timeline (Quick Fix)

```
Time    Phase                   Agents              Output
────────────────────────────────────────────────────────────
0s      Start                   -                   User input received

0-15s   Triage                  • Error Triage      ParsedError
                                • Stack Parser      • type: TypeError
        (parallel)                                  • severity: 4
                                                    • language: TS

15-45s  Pattern & Research      • Pattern Matcher   Solutions[]
                                • Solution Research • 10+ candidates
        (parallel)                                  • Ranked

15-45s  Context Analysis        • Context Analyzer  CodeContext
                                • TS Expert         • ±10 lines
        (parallel with above)                       • Variables
                                                    • Types

45-90s  Fix Generation          • Fix Generator     CodeFix[]
                                  (Opus)            • Primary (95%)
                                                    • Alt 1 (88%)
                                                    • Alt 2 (82%)

45-75s  Explanation             • Root Cause        RootCauseAnalysis
                                  (Opus)            • What/Why
        (parallel with above)                       • Education

90-120s Application             • Fix Generator     FixResult
                                                    • Applied/Suggested
                                                    • Tests
                                                    • Verified

120s    Complete                -                   Present to user
────────────────────────────────────────────────────────────
Total: 2 minutes
```

---

## Decision Tree

```
                    ┌───────────────┐
                    │ Error Detected│
                    └───────┬───────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │ Is this recurring?      │
              │ (3+ occurrences)        │
              └────┬──────────────┬─────┘
                   │              │
                NO │              │ YES
                   │              │
                   ▼              ▼
         ┌─────────────┐   ┌─────────────┐
         │ Quick Fix   │   │ Deep        │
         │ Workflow    │   │ Analysis    │
         │             │   │ Workflow    │
         │ 60-120s     │   │ 5-10 min    │
         └──────┬──────┘   └──────┬──────┘
                │                 │
                ▼                 ▼
         ┌─────────────┐   ┌─────────────┐
         │ Pattern     │   │ History     │
         │ Matched?    │   │ Analysis    │
         └──────┬──────┘   └──────┬──────┘
                │                 │
         YES ┌──┴──┐ NO           │
             │     │              │
             ▼     ▼              ▼
       ┌──────┐ ┌──────┐   ┌────────────┐
       │Cached│ │Search│   │Root Cause  │
       │ Fix  │ │ SO/GH│   │Deep Dive   │
       └───┬──┘ └───┬──┘   └──────┬─────┘
           │        │             │
           └────┬───┘             │
                │                 ▼
                │          ┌─────────────┐
                │          │Multi-Level  │
                │          │Solutions    │
                │          └──────┬──────┘
                │                 │
                ▼                 ▼
         ┌─────────────┐   ┌─────────────┐
         │Generate Fix │   │Prevention   │
         │             │   │Strategy     │
         └──────┬──────┘   └──────┬──────┘
                │                 │
                ▼                 ▼
         ┌─────────────┐   ┌─────────────┐
         │Confidence   │   │Roadmap      │
         │>= Threshold?│   │Generation   │
         └──────┬──────┘   └──────┬──────┘
                │                 │
         YES ┌──┴──┐ NO           │
             │     │              │
             ▼     ▼              ▼
       ┌──────┐ ┌──────┐   ┌────────────┐
       │ Auto │ │Manual│   │Present Full│
       │Apply │ │Review│   │Analysis    │
       └──────┘ └──────┘   └────────────┘
```

---

This architecture delivers **real value** through:

1. **Speed**: Parallel agent execution
2. **Quality**: Opus model for critical decisions
3. **Confidence**: Quantified scoring
4. **Learning**: Root cause explanations
5. **Prevention**: Systemic fixes, not band-aids

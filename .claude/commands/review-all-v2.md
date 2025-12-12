# Comprehensive Code Review

**Version**: 2.0 (Orchestration Optimized)
**Estimated Time**: 30-45 minutes (improved from 45-60 min)
**Pattern**: Parallel Analysis with TodoWrite Tracking

---

## Purpose

Perform a thorough code review of the entire codebase with automated TodoWrite progress tracking and parallel analysis across quality dimensions.

## Multi-Agent Coordination Strategy

Uses **parallel analysis pattern** where independent reviewers analyze different aspects simultaneously, coordinated for comprehensive coverage.

### Review Architecture
\`\`\`
┌──────────────────────────────────────────────────┐
│         Review Orchestrator                       │
│         (senior-reviewer)                         │
└────────────┬─────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┬────────┐
    ▼        ▼        ▼        ▼        ▼
  Quality  Security  Perf   Arch   Best
                                      Practices
\`\`\`

## Execution Flow with TodoWrite

### Initialization
\`\`\`typescript
// Auto-generate TodoWrite tasks
const todos = [
  {
    content: "Initialize comprehensive code review",
    activeForm: "Initializing code review",
    status: "in_progress"
  },
  {
    content: "Analyze code quality (smells, anti-patterns, standards)",
    activeForm: "Analyzing code quality",
    status: "pending"
  },
  {
    content: "Review best practices (error handling, logging, tests)",
    activeForm: "Reviewing best practices",
    status: "pending"
  },
  {
    content: "Evaluate architecture (coupling, design patterns)",
    activeForm: "Evaluating architecture",
    status: "pending"
  },
  {
    content: "Identify performance issues (bottlenecks, memory leaks)",
    activeForm: "Identifying performance issues",
    status: "pending"
  },
  {
    content: "Scan for security vulnerabilities",
    activeForm: "Scanning for security vulnerabilities",
    status: "pending"
  },
  {
    content: "Generate prioritized recommendations report",
    activeForm: "Generating recommendations report",
    status: "pending"
  }
];
\`\`\`

### Phase 1: Codebase Analysis (0-5 mins)
**TodoWrite Update**: Mark "Initialize" as in_progress

1. **codebase-analyzer** - Scan entire codebase structure
   - Identify languages, frameworks, dependencies
   - Build file inventory and metrics
   - **Output**: `codebase-context` (cached for reuse)

**TodoWrite Update**: Mark "Initialize" as completed

---

### Phase 2: Parallel Review Streams (5-35 mins)
**TodoWrite Update**: Mark all review tasks as in_progress

**Note**: All 5 review agents run in **PARALLEL** using shared `codebase-context`

#### Stream 1: Code Quality Review
2. **quality-reviewer** (Uses cached `codebase-context`)
   - Code smells and anti-patterns
   - Coding standards adherence
   - Refactoring opportunities
   - Code readability assessment
   - **Output**: `quality-issues[]`

**TodoWrite Update**: Mark "Analyze code quality" as completed

#### Stream 2: Best Practices Review
3. **best-practices-reviewer** (Uses cached `codebase-context`)
   - Error handling patterns
   - Logging and debugging
   - Documentation completeness
   - Test coverage analysis
   - **Output**: `practice-issues[]`

**TodoWrite Update**: Mark "Review best practices" as completed

#### Stream 3: Architecture Review
4. **architecture-reviewer** (Uses cached `codebase-context`)
   - Component organization
   - Separation of concerns
   - Coupling and dependencies
   - Design patterns usage
   - **Output**: `architecture-issues[]`

**TodoWrite Update**: Mark "Evaluate architecture" as completed

#### Stream 4: Performance Review
5. **performance-reviewer** (Uses cached `codebase-context`)
   - Performance bottlenecks
   - Memory leaks
   - Algorithm efficiency
   - Database query optimization
   - Caching strategies
   - **Output**: `performance-issues[]`

**TodoWrite Update**: Mark "Identify performance issues" as completed

#### Stream 5: Security Review
6. **security-reviewer** (Uses cached `codebase-context`)
   - Vulnerability scanning
   - Exposed secrets/credentials
   - Input validation
   - Authentication/authorization
   - **Output**: `security-issues[]`

**TodoWrite Update**: Mark "Scan for security vulnerabilities" as completed

---

### Phase 3: Synthesis & Recommendations (35-45 mins)
**TodoWrite Update**: Mark "Generate recommendations" as in_progress

7. **senior-reviewer** - Aggregate and prioritize findings
   - Combine all issue streams
   - Remove duplicates
   - Prioritize by severity (Critical → Low)
   - Generate actionable recommendations
   - Create executive summary

**TodoWrite Update**: Mark "Generate recommendations" as completed

---

## Agent Coordination Layers

### Analysis Layer
- **codebase-analyzer**: Shared context creation

### Parallel Review Layer (5 agents in parallel)
- **quality-reviewer**: Code quality analysis
- **best-practices-reviewer**: Standards compliance
- **architecture-reviewer**: Design assessment
- **performance-reviewer**: Performance analysis
- **security-reviewer**: Security scanning

### Synthesis Layer
- **senior-reviewer**: Aggregation and prioritization

---

## Context Sharing (Performance Optimization)

\`\`\`typescript
// Phase 1: Create shared context (cache for 1 hour)
const codebaseContext = await codebaseAnalyzer.analyze();
contextManager.set("codebase-analysis", codebaseContext, ttl=3600);

// Phase 2: All reviewers reuse context (80% time savings)
const context = await contextManager.get("codebase-analysis"); // Cache hit!

// No redundant codebase scanning across 5 review agents
\`\`\`

---

## Review Focus Areas

### Code Quality
- Code smells and anti-patterns
- Coding standards and conventions
- Refactoring opportunities
- Code readability and maintainability

### Best Practices
- Error handling patterns
- Logging and debugging support
- Documentation completeness
- Test coverage assessment

### Architecture
- Component/module organization
- Separation of concerns
- Coupling and circular dependencies
- Design patterns usage

### Performance
- Performance bottlenecks identification
- Memory leaks or inefficient algorithms
- Database query optimization
- Caching strategies assessment

### Security
- Basic vulnerability scanning
- Exposed secrets or credentials
- Input validation and sanitization
- Authentication and authorization patterns

---

## Expected Outputs

### 1. Code Quality Report
- **Critical Issues**: Must fix before production
- **High Priority**: Significant improvements needed
- **Medium Priority**: Recommended improvements
- **Low Priority**: Nice-to-have enhancements

### 2. Best Practices Assessment
- Error handling gaps
- Logging deficiencies
- Documentation coverage
- Test coverage metrics

### 3. Architecture Analysis
- Coupling hotspots
- Design pattern recommendations
- Refactoring opportunities
- Module reorganization suggestions

### 4. Performance Report
- Bottleneck identification
- Memory optimization opportunities
- Database query improvements
- Caching recommendations

### 5. Security Assessment
- Vulnerability count by severity
- Credential exposure findings
- Input validation gaps
- Auth/authz recommendations

### 6. Executive Summary
- Total issues by severity
- Top 10 critical findings
- Recommended action plan
- Estimated effort for fixes

---

## Success Criteria

- ✅ Codebase context created and cached
- ✅ All 5 review streams completed in parallel
- ✅ Zero redundant codebase analysis (80% time savings)
- ✅ All TodoWrite tasks marked completed
- ✅ Comprehensive report generated
- ✅ Issues prioritized by severity
- ✅ Actionable recommendations provided
- ✅ Execution time <45 minutes (vs. 60 min sequential)

---

## Performance Improvements

### Before (Sequential)
\`\`\`
Phase 1: Quality Review (12 min)
Phase 2: Best Practices (10 min)
Phase 3: Architecture (10 min)
Phase 4: Performance (10 min)
Phase 5: Security (12 min)
Phase 6: Synthesis (6 min)
Total: 60 minutes
\`\`\`

### After (Parallel with Context Sharing)
\`\`\`
Phase 1: Codebase Analysis (5 min) → context cached
Phase 2: All 5 Reviews in Parallel (25 min) → reuse context
  - Quality Review (12 min, but uses cached context: 6 min)
  - Best Practices (10 min, but uses cached context: 5 min)
  - Architecture (10 min, but uses cached context: 5 min)
  - Performance (10 min, but uses cached context: 5 min)
  - Security (12 min, but uses cached context: 6 min)
  Max time: 6 min (all parallel)
Phase 3: Synthesis (6 min)
Total: 17 minutes (72% faster!)

Actual with overhead: ~30-35 minutes (50% faster)
\`\`\`

---

## Usage Examples

### Example 1: Full Codebase Review
\`\`\`
/review-all

Expected Output:
✅ Initialize comprehensive code review - Completed (2min)
✅ Analyze code quality - Completed (6min)
✅ Review best practices - Completed (5min)
✅ Evaluate architecture - Completed (5min)
✅ Identify performance issues - Completed (5min)
✅ Scan for security vulnerabilities - Completed (6min)
✅ Generate prioritized recommendations - Completed (6min)

Total: 35 minutes
Report: 47 issues found (3 Critical, 12 High, 20 Medium, 12 Low)
\`\`\`

### Example 2: Focused Review (Specific Module)
\`\`\`
/review-all --scope=src/services/ai-orchestrator

Same parallel pattern, but focused on specific module
Total: 15-20 minutes
\`\`\`

### Example 3: Security-Only Review
\`\`\`
/review-all --focus=security

Skips quality/performance/architecture, runs only security review
Total: 10-15 minutes
\`\`\`

---

## TodoWrite Progress Example

\`\`\`
During execution, user sees:

[completed] Initialize comprehensive code review (2 min)
[completed] Analyze code quality (6 min)
[completed] Review best practices (5 min)
[completed] Evaluate architecture (5 min)
[completed] Identify performance issues (5 min)
[completed] Scan for security vulnerabilities (6 min)
[in_progress] Generate prioritized recommendations report
  └─ Aggregating findings from 5 review streams...
  └─ Removing duplicates...
  └─ Prioritizing by severity...
\`\`\`

---

## Configuration Options

### Scope
- `--scope=path/to/module` - Review specific module/directory
- `--scope=changed` - Review only changed files (git diff)
- `--scope=all` - Full codebase review (default)

### Focus
- `--focus=quality` - Code quality only
- `--focus=security` - Security only
- `--focus=performance` - Performance only
- `--focus=all` - All aspects (default)

### Severity Filter
- `--min-severity=critical` - Show only critical issues
- `--min-severity=high` - Show critical and high
- `--min-severity=all` - Show all issues (default)

---

## Notes

- **Context Sharing**: Codebase analysis cached for 1 hour (reusable by other commands)
- **Parallel Execution**: All 5 review streams run simultaneously
- **TodoWrite Integration**: Automatic progress tracking throughout
- **Performance**: 50% faster than sequential execution
- **Scalability**: Handles codebases up to 100K LOC efficiently
- **Accuracy**: No loss in review quality from parallelization

---

**Version History**:
- **v2.0** (2025-10-08): Added TodoWrite, parallel execution, context sharing (50% faster)
- **v1.0** (2025-09-15): Original sequential implementation

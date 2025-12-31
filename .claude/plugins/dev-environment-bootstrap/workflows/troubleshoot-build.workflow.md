# Troubleshoot Build Issues Workflow

**Workflow ID:** `troubleshoot-build`
**Estimated Time:** 3-8 minutes
**Automation Level:** Semi-automatic (requires user confirmation for fixes)
**Agents Required:** 4-6

---

## Overview

Diagnoses and resolves "why won't this build?" issues by analyzing environment differences, dependency conflicts, and configuration problems. The workflow compares your local environment against reference environments (CI, production, teammate's working setup) to identify discrepancies.

---

## Workflow Phases

### Phase 1: Diagnose (1-2 minutes)

**Agents:**
- `troubleshooter` (Primary, Opus model for deep analysis)
- `environment-validator` (Parallel)

**Tasks:**
1. Capture error messages and stack traces
2. Analyze build logs for root causes
3. Check environment variables
4. Verify dependency versions
5. Validate configuration files
6. Detect platform-specific issues
7. Test individual build steps

**Outputs:**
- `diagnosis.json` - Root cause analysis
- `error-patterns.json` - Categorized errors
- `environment-snapshot.json` - Current environment state

**Diagnosis Categories:**
```typescript
type DiagnosisCategory =
  | "missing-dependency"      // Package not installed
  | "version-mismatch"        // Wrong version installed
  | "configuration-error"     // Invalid config file
  | "platform-incompatible"   // OS/arch specific issue
  | "environment-variable"    // Missing or wrong env var
  | "port-conflict"          // Port already in use
  | "permission-denied"      // File/directory permissions
  | "disk-space"             // Insufficient disk space
  | "network-error"          // Can't reach registry/API
  | "compiler-error"         // Syntax/type error
  | "runtime-error"          // Error during execution
  | "resource-limit"         // Memory/CPU exhaustion
  | "cache-corruption";      // Invalid cache state
```

**Success Criteria:**
- Error messages captured and parsed
- Root cause identified with 70%+ confidence
- Environment snapshot complete

---

### Phase 2: Compare (1-2 minutes)

**Agents:**
- `environment-diff-analyzer` (Primary)

**Tasks:**
1. Load reference environment (CI, production, or teammate)
2. Compare runtime versions (Node, Python, Go, etc.)
3. Compare dependency versions
4. Compare environment variables (without exposing secrets)
5. Compare configuration files
6. Identify platform differences
7. Highlight breaking changes

**Outputs:**
- `environment-diff.json` - Detailed comparison
- `breaking-differences.json` - High-impact differences
- `compatibility-matrix.md` - What works where

**Comparison Matrix:**
```
┌─────────────────────┬──────────────┬──────────────┬─────────────┐
│ Component           │ Your Machine │ CI (Works)   │ Impact      │
├─────────────────────┼──────────────┼──────────────┼─────────────┤
│ Node.js             │ 18.17.0      │ 20.10.0      │ HIGH ⚠️     │
│ npm                 │ 9.6.7        │ 10.2.3       │ MEDIUM      │
│ Python              │ 3.9.16       │ 3.11.5       │ LOW         │
│ PostgreSQL          │ 14.9         │ 15.4         │ MEDIUM      │
│ Redis               │ ❌ Missing   │ 7.2.1        │ HIGH ⚠️     │
│ Docker              │ 24.0.6       │ 24.0.6       │ ✅ Match    │
└─────────────────────┴──────────────┴──────────────┴─────────────┘

🔴 Critical Differences: 2
🟡 Minor Differences: 2
✅ Matches: 1
```

**Environment Sources:**
1. **CI Environment** (GitHub Actions, GitLab CI, etc.)
   - Parse workflow files (`.github/workflows/*.yml`)
   - Extract versions from Docker images
   - Read environment variables (non-secrets)

2. **Production Environment**
   - Parse Dockerfile/docker-compose.yml
   - Read Kubernetes manifests
   - Extract from deployment configs

3. **Teammate's Working Setup**
   - Import from shared `.claude/bootstrap-state.json`
   - Compare against team baseline
   - Check for custom workarounds

**Success Criteria:**
- At least one reference environment loaded
- Differences identified and categorized
- Impact assessment complete

---

### Phase 3: Fix (2-4 minutes)

**Agents:**
- `dependency-installer` (Parallel)
- `config-fixer` (Parallel)

**Tasks:**
1. Present suggested fixes ranked by likelihood of success
2. Get user confirmation for each fix
3. Apply fixes with rollback support
4. Update configuration files
5. Reinstall/update dependencies
6. Clear caches if needed
7. Verify each fix applied correctly

**Outputs:**
- `fixes-applied.json` - What was changed
- `rollback-state.json` - How to undo changes
- `fix-log.txt` - Detailed execution log

**Fix Types:**

**1. Version Updates**
```bash
# Node.js version mismatch
# Your: 18.17.0 → Need: 20.10.0

Fix: Update Node.js to v20
  • Using nvm: nvm install 20.10.0 && nvm use 20.10.0
  • Using homebrew: brew upgrade node
  • Manual: Download from https://nodejs.org

Estimated Time: 2-3 minutes
Risk: Low (project uses standard Node APIs)
```

**2. Missing Dependencies**
```bash
# Redis not installed but required by project

Fix: Install Redis
  • macOS: brew install redis && brew services start redis
  • Linux: sudo apt install redis-server && sudo systemctl start redis
  • Windows: Install WSL2, then use Linux commands
  • Docker: docker run -d -p 6379:6379 redis:7-alpine

Estimated Time: 1-2 minutes
Risk: None (isolated service)
```

**3. Configuration Fixes**
```bash
# Invalid TypeScript config (module: "commonjs" → "esnext")

Fix: Update tsconfig.json
  • Automatically update "module" field
  • Add "moduleResolution": "bundler"
  • Ensure "esModuleInterop": true

Estimated Time: <1 minute
Risk: Low (commonly required change)
```

**4. Cache Clear**
```bash
# Corrupted npm cache causing install failures

Fix: Clear caches and reinstall
  • rm -rf node_modules package-lock.json
  • npm cache clean --force
  • npm install

Estimated Time: 2-5 minutes
Risk: None (safe operation)
```

**User Confirmation Flow:**
```
🔧 Suggested Fix #1 (HIGH CONFIDENCE - 92%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Root Cause: Node.js version mismatch
Your Version: 18.17.0
Required: 20.10.0+

Fix: Update Node.js
Commands:
  $ nvm install 20.10.0
  $ nvm use 20.10.0
  $ nvm alias default 20.10.0

Estimated Time: 2-3 minutes
Risk: Low
Rollback: nvm use 18.17.0

Apply this fix? [Y/n/skip-all]:
```

**Success Criteria:**
- User reviews and approves fixes
- Fixes applied without errors
- Rollback state saved
- No new errors introduced

---

### Phase 4: Verify (1-2 minutes)

**Agents:**
- `build-verifier` (Primary)

**Tasks:**
1. Clean build from scratch
2. Run test suite
3. Start development server
4. Verify service connections (DB, Redis, etc.)
5. Check for new errors/warnings
6. Generate success/failure report
7. Document any remaining issues

**Outputs:**
- `build-status.json` - Build results
- `verification-log.txt` - Full build output
- `next-steps.md` - What to do next

**Verification Steps:**
```typescript
interface VerificationSteps {
  clean: {
    description: "Remove build artifacts";
    commands: ["rm -rf dist", "rm -rf .next", "rm -rf build"];
    status: "success" | "failed";
  };
  install: {
    description: "Reinstall dependencies";
    commands: ["npm ci"];
    status: "success" | "failed";
  };
  build: {
    description: "Run build command";
    commands: ["npm run build"];
    duration: number;
    status: "success" | "failed";
  };
  test: {
    description: "Run test suite";
    commands: ["npm test"];
    passed: number;
    failed: number;
    status: "success" | "failed";
  };
  start: {
    description: "Start dev server";
    commands: ["npm run dev"];
    port: number;
    responsive: boolean;
    status: "success" | "failed";
  };
}
```

**Success Criteria:**
- Build completes without errors
- Tests pass (or match expected failures)
- Development server starts successfully
- No regressions introduced

---

## Troubleshooting Decision Tree

```mermaid
graph TD
  A[Build Failed] --> B{Error Type?}

  B -->|Module Not Found| C[Missing Dependency]
  B -->|Version Conflict| D[Dependency Conflict]
  B -->|Syntax Error| E[Code Error]
  B -->|Runtime Error| F[Environment Issue]

  C --> C1[Check package.json]
  C1 --> C2[npm install missing]
  C2 --> VERIFY

  D --> D1[Check lock file]
  D1 --> D2[Resolve conflict]
  D2 --> D3[Update package.json]
  D3 --> VERIFY

  E --> E1[Check code syntax]
  E1 --> E2[Fix TypeScript/ESLint errors]
  E2 --> VERIFY

  F --> F1[Compare environments]
  F1 --> F2{Difference Found?}
  F2 -->|Yes| F3[Apply fix]
  F2 -->|No| F4[Deep investigation]
  F3 --> VERIFY
  F4 --> F5[Manual intervention]

  VERIFY[Verify Build] --> RESULT{Success?}
  RESULT -->|Yes| SUCCESS[✅ Fixed!]
  RESULT -->|No| ESCALATE[Escalate to human]
```

---

## Example Scenarios

### Scenario 1: Node Version Mismatch
```
❌ Error: Build failed with "SyntaxError: Unexpected token '?'"

🔍 Diagnosis:
   Root Cause: Optional chaining (?.) not supported in Node 12
   Your Version: Node.js 12.22.0
   Required: Node.js 14.0.0+
   Confidence: 98%

🔧 Fix:
   Update Node.js to v20 LTS
   Command: nvm install 20 && nvm use 20
   Time: ~2 minutes

✅ Applied → Build succeeded!
```

### Scenario 2: Missing Environment Variable
```
❌ Error: "DATABASE_URL is not defined"

🔍 Diagnosis:
   Root Cause: Missing environment variable
   Required: DATABASE_URL
   Used By: src/lib/db.ts:12
   Confidence: 100%

🔧 Fix:
   Add to .env file:
   DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

   Template added to .env.example ✓

✅ Applied → Build succeeded!
```

### Scenario 3: Port Conflict
```
❌ Error: "EADDRINUSE: address already in use :::3000"

🔍 Diagnosis:
   Root Cause: Port 3000 already in use
   Process: node (PID 12345)
   Confidence: 100%

🔧 Fix Options:
   1. Kill existing process: kill 12345
   2. Use different port: PORT=3001 npm run dev
   3. Find and stop service: lsof -ti:3000 | xargs kill

Apply fix #1? [Y/n]:
```

### Scenario 4: Platform-Specific Issue
```
❌ Error: "node-gyp rebuild failed"

🔍 Diagnosis:
   Root Cause: Native module requires build tools
   Platform: macOS (arm64)
   Missing: Xcode Command Line Tools
   Confidence: 95%

🔧 Fix:
   Install build tools:
   xcode-select --install

   Then rebuild:
   npm rebuild

   Time: ~5 minutes

Apply this fix? [Y/n]:
```

---

## Success Metrics

Track and report:
- **Resolution Rate:** % of issues auto-fixed
- **Time to Resolution:** Average fix duration
- **Confidence Accuracy:** How often high-confidence diagnoses are correct
- **User Satisfaction:** Thumbs up/down on fix quality

**Target Metrics:**
- Resolution Rate: 80%+
- Time to Resolution: <5 minutes average
- Confidence Accuracy: 90%+ for "high confidence"
- User Satisfaction: 85%+ positive

---

## Escalation Path

If automated troubleshooting fails:

1. **Generate Detailed Report**
   - All error messages
   - Complete environment diff
   - Failed fix attempts
   - Relevant logs

2. **Suggest Next Steps**
   - Search GitHub issues for similar errors
   - Check Stack Overflow
   - Review recent commits
   - Ask in team Slack/Discord

3. **Create Support Ticket** (if applicable)
   - Auto-populate with debugging info
   - Attach relevant logs
   - Link to related issues

4. **Document Workaround**
   - If manual fix is found, document it
   - Add to troubleshooting knowledge base
   - Update workflow for future auto-fix

---

## Integration with Quick Setup

If troubleshooting reveals major environment issues:
```bash
# Offer to re-run full setup
claude bootstrap:setup --force --reset
```

This will:
1. Backup current state
2. Clean environment
3. Re-run full setup workflow
4. Restore user data/configs
5. Verify everything works

---

## Workflow State Management

Stored in: `.claude/orchestration/state/bootstrap-troubleshoot.json`

```typescript
interface TroubleshootState {
  workflowId: "troubleshoot-build";
  issueDescription: string;
  startedAt: string;
  diagnosis: Diagnosis | null;
  environmentDiff: EnvironmentDiff | null;
  suggestedFixes: Fix[];
  appliedFixes: Fix[];
  resolved: boolean;
  rollbackAvailable: boolean;
  escalated: boolean;
}
```

---

## Performance Optimization

- **Fast Diagnosis:** Use Opus only for complex root cause analysis
- **Parallel Checks:** Run environment validation concurrently
- **Cached Comparisons:** Cache reference environment data
- **Progressive Fixes:** Apply simple fixes first (quick wins)
- **Batch Operations:** Group related fixes to reduce overhead

# Security Fix: Path Traversal Vulnerability

**Date:** 2026-01-19  
**Severity:** HIGH  
**Status:** FIXED  
**Components:** hook-loader.ts, agent-loader.ts

## Executive Summary

Fixed critical path traversal vulnerability in jira-orchestrator plugin that could allow unauthorized file system access. The vulnerability existed in hook script loading and agent file loading mechanisms.

## Vulnerability Details

### Attack Vectors
1. Directory traversal: `../../etc/passwd`
2. Absolute paths: `/etc/passwd` or `C:\Windows\System32`
3. Environment variable injection: `${VAR}/../../../secret.txt`

### Files Fixed
- `plugins/jira-orchestrator/lib/hook-loader.ts`
- `plugins/jira-orchestrator/lib/agent-loader.ts`
- `plugins/jira-orchestrator/tests/hook-foundation/test_hook_loader.ts`

## Implementation

### hook-loader.ts
Added `validateScriptPath()` function that:
- Rejects paths containing `..`
- Rejects absolute paths (Unix `/` and Windows `C:\`)
- Validates resolved path stays within plugin root
- Platform-aware (Unix/Windows)

### agent-loader.ts
Added `validateFilePath()` method that:
- Validates registry path on load
- Validates agent file paths before reading
- Uses same validation logic as hook-loader

### Test Coverage
Added comprehensive tests for:
- Path traversal attacks
- Absolute path rejection
- Environment variable injection
- Valid relative paths
- Platform-specific behavior

## Verification

All path resolution now validates:
1. Pre-resolution: Check for suspicious patterns
2. Post-resolution: Verify path within allowed directory
3. Normalization: Use `path.resolve()` for comparison
4. Boundary check: Ensure `startsWith(allowedDir + path.sep)`

## Action Required

**Users:**
- Update plugin immediately
- Audit existing hooks.json configurations
- Review agent registry files

**Developers:**
- Apply similar validation to other file operations
- Add path traversal tests to new features
- Follow principle of least privilege

## References
- OWASP Path Traversal: https://owasp.org/www-community/attacks/Path_Traversal
- CWE-22: Improper Limitation of a Pathname to a Restricted Directory


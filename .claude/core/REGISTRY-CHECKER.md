# Registry Integrity Checker

Core validation and auto-fix utilities for the Claude orchestration registry system.

## Quick Start

```bash
# Install dependencies
cd .claude/core
npm install

# Run validation
/registry-check

# Auto-fix issues
/registry-check --fix

# Preview fixes (dry-run)
/registry-check --fix --dry-run
```

## Components

### 1. `registry-validator.ts` (584 lines)

**Purpose**: Comprehensive validation engine

**Features**:
- ✅ Validates all `.index.json` files
- ✅ Checks file references exist
- ✅ Finds orphaned files
- ✅ Validates cross-references
- ✅ Detects duplicate IDs
- ✅ Validates JSON syntax

**Output Example**:
```
🔍 Starting registry integrity validation...

📋 Validating registry\agents.index.json...
✓ registry\agents.index.json validated

🔍 Checking for orphaned files...
Found 124 orphaned files

📊 Validation Results
────────────────────────────────────────────────────────────
Statistics:
  Registries checked: 7
  References validated: 127
  Total files found: 115
  Orphaned files: 124

❌ 115 Error(s):
  [fixable] missing_file: agents/core/deleted.md

⚠️  124 Warning(s):
  unused_file: agents/new/unregistered.md
    💡 Add to appropriate registry or remove if obsolete

💡 Suggestions:
  • 115 errors can be auto-fixed with --fix flag
  • Consider adding 124 orphaned files to registry
```

### 2. `registry-fixer.ts` (380 lines)

**Purpose**: Auto-fix common registry issues

**Capabilities**:
- Remove dead file references
- Add orphaned files with default metadata
- Fix invalid cross-references
- Deduplicate IDs

**Safety Features**:
- Dry-run mode for previewing changes
- Atomic updates (all or nothing)
- Error recovery and reporting

## Usage

### Via Slash Command

```bash
/registry-check                    # Validate only
/registry-check --fix              # Validate and fix
/registry-check --fix --dry-run    # Preview fixes
/registry-check --verbose          # Detailed output
```

### Direct Execution

```bash
cd .claude/core

# Validate
npx tsx registry-validator.ts /path/to/.claude

# With auto-fix
npx tsx -e "
import { RegistryValidator } from './registry-validator.js';
import { RegistryFixer } from './registry-fixer.js';

const baseDir = '/path/to/.claude';
const validator = new RegistryValidator(baseDir);
const result = await validator.validateRegistryIntegrity();

const fixer = new RegistryFixer(baseDir, false);
const fixResult = await fixer.autoFix(result);
fixer.printResults(fixResult);
"
```

## Validation Rules

### Critical Rules (Block Operations)

| Rule | Description | Auto-Fix |
|------|-------------|----------|
| **File Existence** | All `path` fields must point to existing files | ✅ Removes dead references |
| **Valid JSON** | All `.json` files must parse without errors | ❌ Manual fix required |
| **Cross-References** | Keyword mappings must reference real resources | ✅ Removes invalid mappings |
| **Unique IDs** | Resource IDs must be unique within registry type | ✅ Renames duplicates |

### Warning Rules (Non-Blocking)

| Rule | Description | Recommendation |
|------|-------------|----------------|
| **Missing Metadata** | Resources should have type, keywords, etc. | Add metadata for better activation |
| **Orphaned Files** | Files should be registered | Register or remove |
| **Inconsistent Naming** | Follow kebab-case convention | Rename for consistency |

## Common Issues & Fixes

### Missing File References

**Problem**: Registry entry points to non-existent file
```json
"old-agent": {
  "path": "agents/core/deleted.md"  // File doesn't exist
}
```

**Auto-Fix**: Entry removed from registry

### Orphaned Files

**Problem**: File exists but not in any registry
```
agents/development/new-agent.md  // Not in agents.index.json
```

**Auto-Fix**: Added to registry with default metadata
```json
"new-agent": {
  "path": "agents/development/new-agent.md",
  "type": "developer",
  "model": "sonnet",
  "keywords": [],
  "capabilities": [],
  "priority": "medium"
}
```

### Invalid Cross-References

**Problem**: Keyword index references non-existent resource
```json
"keywords": {
  "test": ["tester", "deleted-agent"]  // deleted-agent doesn't exist
}
```

**Auto-Fix**: Invalid reference removed

## Git Integration

### Pre-Commit Hook

File: `.claude/hooks/pre-commit-registry.sh`

**Installation**:
```bash
ln -sf ../../.claude/hooks/pre-commit-registry.sh .git/hooks/pre-commit
```

**Behavior**:
- ✅ Runs automatically before commits
- ✅ Validates only staged registry files
- ✅ Blocks commit if critical errors found
- ⚠️  Allows commit with warnings (displays them)
- 📊 Shows validation summary

## Test Results

Initial validation run (2025-12-12):

```
✅ Registries Checked: 7
✅ References Validated: 127
✅ Files Found: 115

❌ Errors: 115 (all fixable)
  - Missing file references: 115

⚠️  Warnings: 124
  - Orphaned files: 124

⚡ Performance:
  - Validation time: ~2 seconds
  - Files scanned: 239
```

## API Reference

### RegistryValidator

```typescript
class RegistryValidator {
  constructor(baseDir: string)

  async validateRegistryIntegrity(): Promise<ValidationResult>
  printResults(result: ValidationResult): void
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  stats: ValidationStats;
}
```

### RegistryFixer

```typescript
class RegistryFixer {
  constructor(baseDir: string, dryRun: boolean = false)

  async autoFix(validationResult: ValidationResult): Promise<FixResult>
  printResults(result: FixResult): void
}

interface FixResult {
  success: boolean;
  fixed: number;
  failed: number;
  changes: FixChange[];
  errors: string[];
}
```

## Dependencies

```json
{
  "dependencies": {
    "glob": "^10.3.10",      // File pattern matching
    "picocolors": "^1.0.0"   // Terminal colors
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",         // TypeScript execution
    "typescript": "^5.3.3"
  }
}
```

## Exit Codes

- `0` - Validation passed, no errors
- `1` - Validation failed, errors found
- `2` - Fatal error occurred

## Performance

| Registry Size | Files | Time |
|--------------|-------|------|
| Small (< 50) | 50 | < 1s |
| Medium (50-200) | 150 | 1-3s |
| Large (200-500) | 400 | 3-5s |
| Very Large (> 500) | 1000+ | 5-10s |

## Troubleshooting

### "Registry directory not found"
```bash
cd /path/to/project
/registry-check
```

### "No such file or directory: tsx"
```bash
cd .claude/core
npm install
```

### "Permission denied"
```bash
chmod +x .claude/hooks/pre-commit-registry.sh
chmod +x .claude/core/*.ts
```

### "JSON syntax error"
```bash
npx jsonlint registry/agents.index.json
```

## Related Files

- **Command**: `.claude/commands/registry-check.md` - Slash command interface
- **Hook**: `.claude/hooks/pre-commit-registry.sh` - Pre-commit validation
- **Registry Docs**: `.claude/registry/README.md` - Registry documentation
- **Obsidian Docs**: `System/Claude-Instructions/Registry-Integrity-Checker.md`

## Version History

- **1.0.0** (2025-12-12) - Initial release
  - Registry validation engine
  - Auto-fix utilities
  - Pre-commit hook integration

---

**Status**: ✅ Production Ready
**Last Updated**: 2025-12-12

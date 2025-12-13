---
description: Validate registry integrity, check for orphaned files, and fix common issues
argument-hint: "[--fix] [--verbose] [--dry-run]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Registry Integrity Checker

Validate the integrity of the Claude orchestration registry system, including:

- **File Reference Validation**: Ensure all registry entries point to existing files
- **Orphaned File Detection**: Find files that exist but aren't registered
- **Cross-Reference Validation**: Check keyword index and other cross-registry references
- **Duplicate ID Detection**: Find duplicate IDs across registries
- **JSON Syntax Validation**: Verify all registry files are valid JSON
- **Auto-Fix Capabilities**: Automatically fix common issues (with --fix flag)

## Usage

```bash
# Run validation only (no changes)
/registry-check

# Run with auto-fix (make changes)
/registry-check --fix

# Dry-run auto-fix (show what would be fixed without making changes)
/registry-check --fix --dry-run

# Verbose output
/registry-check --verbose
```

## Instructions for Claude

When this command is invoked, you MUST:

### 1. Parse Arguments

Extract flags from the user's command:
- `--fix` or `-f`: Enable auto-fix mode
- `--dry-run` or `-d`: Show what would be fixed without making changes
- `--verbose` or `-v`: Enable verbose output

### 2. Run Registry Validator

Execute the TypeScript validation engine:

```bash
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\core
npx tsx registry-validator.ts C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude
```

This will:
- Load all `.index.json` files from the registry directory
- Validate file references for each entry
- Check for orphaned files in agents/, skills/, commands/, workflows/
- Validate cross-references in keyword index
- Report all errors, warnings, and suggestions

### 3. Display Results

The validator will output:

**Statistics:**
- Number of registries checked
- Number of references validated
- Total files found
- Number of orphaned files

**Errors** (blocking issues):
- Missing file references (fixable)
- Invalid cross-references (fixable)
- Duplicate IDs (fixable)
- JSON syntax errors (manual fix required)

**Warnings** (non-blocking):
- Orphaned files (can be added to registry)
- Missing metadata (recommendations)
- Inconsistent naming

### 4. Run Auto-Fix (if --fix flag present)

If `--fix` flag is provided, execute the fixer:

```bash
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\core
npx tsx -e "
import { RegistryValidator } from './registry-validator.js';
import { RegistryFixer } from './registry-fixer.js';

const baseDir = 'C:\\Users\\MarkusAhling\\pro\\alpha-0.1\\claude\\.claude';
const dryRun = process.argv.includes('--dry-run');

const validator = new RegistryValidator(baseDir);
const result = await validator.validateRegistryIntegrity();

const fixer = new RegistryFixer(baseDir, dryRun);
const fixResult = await fixer.autoFix(result);
fixer.printResults(fixResult);
"
```

This will:
- **Remove dead references**: Delete registry entries pointing to non-existent files
- **Fix cross-references**: Remove invalid keyword mappings
- **Add orphaned files**: Register files that exist but aren't in any index
- **Deduplicate IDs**: Rename duplicate IDs with numeric suffixes

### 5. Report Summary

After validation (and fixing if requested), provide a clear summary:

```
📊 Registry Integrity Check Summary

✅ Registries Validated: 6
✅ References Checked: 127
✅ Files Found: 115

❌ Errors: 3 (2 fixable)
⚠️  Warnings: 8
📁 Orphaned Files: 5

💡 Suggestions:
  • Run with --fix to auto-fix 2 errors
  • Consider adding 5 orphaned files to registry
```

If auto-fix was run:

```
🔧 Auto-Fix Results

✅ Fixed: 7
  • Removed 2 dead references from agents.index.json
  • Fixed 3 invalid cross-references in keywords.json
  • Added 5 orphaned files to appropriate registries

❌ Failed: 0

✅ Registry integrity restored!
```

## Common Issues and Fixes

### Missing File References

**Problem**: Registry entry points to file that doesn't exist

**Auto-fix**: Removes the registry entry

**Example**:
```json
// Before
"agents": {
  "core": {
    "old-agent": {
      "path": "agents/core/deleted-file.md"  // File doesn't exist
    }
  }
}

// After (auto-fixed)
"agents": {
  "core": {
    // Entry removed
  }
}
```

### Orphaned Files

**Problem**: File exists but isn't in any registry

**Auto-fix**: Adds entry to appropriate registry with default metadata

**Example**:
```
Found: agents/development/new-agent.md
Added to: agents.index.json
  "agents": {
    "development": {
      "new-agent": {
        "path": "agents/development/new-agent.md",
        "type": "developer",
        "model": "sonnet",
        "keywords": [],
        "capabilities": [],
        "priority": "medium"
      }
    }
  }
```

### Invalid Cross-References

**Problem**: Keyword index references non-existent agent/skill

**Auto-fix**: Removes the invalid reference from keywords

**Example**:
```json
// Before
"keywords": {
  "test": ["tester", "qa-engineer", "deleted-agent"]
}

// After (auto-fixed)
"keywords": {
  "test": ["tester", "qa-engineer"]
}
```

## Exit Codes

- `0`: Validation passed, no errors
- `1`: Validation failed, errors found
- `2`: Auto-fix failed

## Files Checked

The validator scans:

- `registry/agents.index.json` → `agents/**/*.md`
- `registry/skills.index.json` → `skills/**/*.md`
- `registry/commands.index.json` → `commands/**/*.md`
- `registry/workflows.index.json` → `workflows/**/*.md`
- `registry/mcps.index.json` → MCP configurations
- `registry/tools.index.json` → Built-in tools
- `registry/search/keywords.json` → Cross-references

## Validation Rules

1. **File Existence**: All `path` fields must point to existing files
2. **Unique IDs**: No duplicate entry IDs within or across registries
3. **Valid JSON**: All `.json` files must parse without errors
4. **Cross-Reference Integrity**: Keyword mappings must reference real resources
5. **Required Metadata**: Warn if missing recommended fields (type, keywords, etc.)

## Integration with Pre-Commit Hook

This validator can run automatically before commits. See `.claude/hooks/pre-commit-registry.sh`

## Troubleshooting

### "Registry directory not found"

Ensure you're running from the correct directory:
```bash
pwd  # Should be in or above .claude directory
```

### "No such file or directory: tsx"

Install dependencies:
```bash
cd .claude/core
npm install
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x .claude/core/*.ts
chmod +x .claude/hooks/pre-commit-registry.sh
```

## See Also

- Registry Documentation: `.claude/registry/README.md`
- Pre-Commit Hook: `.claude/hooks/pre-commit-registry.sh`
- Validator Source: `.claude/core/registry-validator.ts`
- Fixer Source: `.claude/core/registry-fixer.ts`

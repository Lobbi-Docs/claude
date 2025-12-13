# Claude Orchestration Registry

The registry is a centralized metadata system for all Claude orchestration resources: agents, skills, commands, workflows, MCPs, and tools.

## 📁 Registry Structure

```
registry/
├── README.md                    # This file
├── index.json                   # Master registry index
├── agents.index.json            # Agent definitions (67 agents)
├── agents.minimal.json          # Lightweight agent index for quick loading
├── skills.index.json            # Skill definitions (34 skills)
├── commands.index.json          # Slash command definitions (44 commands)
├── workflows.index.json         # Workflow orchestrations (10 workflows)
├── mcps.index.json              # MCP server configurations (8 servers)
├── tools.index.json             # Built-in tool definitions (17 tools)
├── activation/
│   ├── unified.activation.json  # Unified activation rules
│   └── skills.activation.json   # Skill-specific activation rules
└── search/
    └── keywords.json            # Keyword-to-resource mappings
```

## 🎯 Purpose

The registry provides:

1. **Lazy Loading**: Resources loaded on-demand to minimize context usage
2. **Centralized Metadata**: Single source of truth for all orchestration resources
3. **Context-Based Activation**: Automatic resource selection based on keywords and file context
4. **Validation**: Integrity checking to ensure all references are valid
5. **Discoverability**: Quick lookup by keyword, task type, or MCP

## 📋 Registry Format

All registry files follow a consistent structure:

```json
{
  "$schema": "./schema/[type].schema.json",
  "version": "X.Y.Z",
  "description": "Registry description",

  "[resource-type]": {
    "category": {
      "resource-id": {
        "path": "relative/path/to/resource.md",
        "type": "resource-type",
        "keywords": ["keyword1", "keyword2"],
        // ... type-specific metadata
      }
    }
  }
}
```

### Example: Agent Entry

```json
{
  "agents": {
    "core": {
      "coder": {
        "path": "agents/core/coder.md",
        "type": "developer",
        "model": "sonnet",
        "keywords": ["implement", "code", "write", "build"],
        "capabilities": ["code_generation", "refactoring"],
        "priority": "high"
      }
    }
  }
}
```

### Example: Skill Entry

```json
{
  "skills": {
    "development": {
      "react": {
        "path": "skills/react.md",
        "category": "frontend",
        "keywords": ["react", "component", "hooks", "jsx"],
        "dependencies": ["nextjs"]
      }
    }
  }
}
```

## 🔍 Registry Validation

### Automatic Validation

The registry has built-in validation to ensure integrity:

- **File References**: All `path` fields must point to existing files
- **Cross-References**: Keyword mappings must reference real resources
- **Unique IDs**: No duplicate resource IDs within or across registries
- **JSON Syntax**: All registry files must be valid JSON

### Running Validation

Use the `/registry-check` command:

```bash
# Validate only (no changes)
/registry-check

# Validate and auto-fix issues
/registry-check --fix

# See what would be fixed (dry-run)
/registry-check --fix --dry-run

# Verbose output
/registry-check --verbose
```

### Pre-Commit Hook

Registry validation runs automatically before commits when the hook is installed:

```bash
# Install pre-commit hook
ln -sf ../../.claude/hooks/pre-commit-registry.sh .git/hooks/pre-commit

# Or add to existing pre-commit hook
.claude/hooks/pre-commit-registry.sh
```

The hook will:
- ✅ Run validation on all staged registry files
- ✅ Block commits if critical errors found
- ⚠️  Allow commits with warnings (but display them)
- 📊 Show validation summary and fix suggestions

## 🔧 Common Validation Issues

### Missing File References

**Problem**: Registry entry points to non-existent file

```json
"old-agent": {
  "path": "agents/core/deleted.md"  // File doesn't exist
}
```

**Fix**: Auto-removed by `/registry-check --fix`

**Manual Fix**: Remove the entry or create the file

---

### Orphaned Files

**Problem**: File exists but not in any registry

```
agents/development/new-agent.md  // Not in agents.index.json
```

**Fix**: Auto-added by `/registry-check --fix` with default metadata

**Manual Fix**: Add entry to appropriate registry:

```json
"agents": {
  "development": {
    "new-agent": {
      "path": "agents/development/new-agent.md",
      "type": "developer",
      "model": "sonnet",
      "keywords": ["development"],
      "capabilities": [],
      "priority": "medium"
    }
  }
}
```

---

### Invalid Cross-References

**Problem**: Keyword index references non-existent resource

```json
"keywords": {
  "test": ["tester", "deleted-agent"]  // deleted-agent doesn't exist
}
```

**Fix**: Invalid reference auto-removed by `/registry-check --fix`

**Manual Fix**: Remove invalid references from `search/keywords.json`

---

### Duplicate IDs

**Problem**: Same resource ID appears multiple times

```json
"agents": {
  "core": {
    "builder": { ... }
  },
  "devops": {
    "builder": { ... }  // Duplicate ID
  }
}
```

**Fix**: Auto-renamed with suffix (e.g., `builder-2`) by `/registry-check --fix`

**Manual Fix**: Rename one of the entries to be unique

---

### Missing Metadata

**Problem**: Required fields missing (warning, not error)

```json
"my-agent": {
  "path": "agents/core/my-agent.md"
  // Missing: type, keywords, capabilities
}
```

**Fix**: Add recommended metadata fields

```json
"my-agent": {
  "path": "agents/core/my-agent.md",
  "type": "developer",           // Add
  "model": "sonnet",              // Add
  "keywords": ["build", "code"],  // Add
  "capabilities": ["coding"],     // Add
  "priority": "high"              // Add
}
```

## 🚀 Adding New Resources

### Adding an Agent

1. Create agent file: `agents/[category]/[agent-name].md`

2. Add entry to `agents.index.json`:

```json
{
  "agents": {
    "category": {
      "agent-name": {
        "path": "agents/category/agent-name.md",
        "type": "developer|analyst|coordinator|validator",
        "model": "opus|sonnet|haiku",
        "keywords": ["keyword1", "keyword2"],
        "capabilities": ["capability1", "capability2"],
        "priority": "high|medium|low"
      }
    }
  }
}
```

3. (Optional) Add keyword mappings to `search/keywords.json`:

```json
{
  "keywords": {
    "keyword1": ["agent-name", "other-agent"]
  }
}
```

4. Validate: `/registry-check`

### Adding a Skill

1. Create skill file: `skills/[skill-name].md`

2. Add entry to `skills.index.json`:

```json
{
  "skills": {
    "category": {
      "skill-name": {
        "path": "skills/skill-name.md",
        "category": "development|infrastructure|frontend|data|cloud",
        "keywords": ["keyword1", "keyword2"],
        "dependencies": ["other-skill"]
      }
    }
  }
}
```

3. Validate: `/registry-check`

### Adding a Command

1. Create command file: `commands/[command-name].md`

2. Add entry to `commands.index.json`:

```json
{
  "commands": {
    "category": {
      "command-name": {
        "path": "commands/command-name.md",
        "name": "/command-name",
        "description": "Command description",
        "category": "core|development|deployment|security"
      }
    }
  }
}
```

3. Validate: `/registry-check`

## 📊 Registry Statistics

Current registry contents (as of last update):

| Resource Type | Count | Categories |
|--------------|-------|------------|
| **Agents** | 67 | core, devops, development, frontend, languages, security, data-ai, operations, cloud, swarm, github, atlassian, documentation, testing, golden-armada |
| **Skills** | 34 | reasoning, infrastructure, development, frontend, data, cloud, security, project-management |
| **Commands** | 44 | core, development, deployment, security, atlassian, orchestration, analysis |
| **Workflows** | 10 | Various orchestration patterns |
| **MCP Servers** | 8 | core, project, extension |
| **MCP Tools** | 80 | Across all MCPs |
| **Built-in Tools** | 17 | Core Claude Code tools |

## 🔄 Load Strategy

The registry uses a **lazy-loading** strategy to minimize context usage:

1. **Startup**: Load `index.json` and `agents.minimal.json` (lightweight)
2. **On-Demand**: Load full indexes when needed (e.g., `agents.index.json`)
3. **Context-Based**: Automatically activate relevant resources based on:
   - User keywords in messages
   - File extensions and paths
   - Environment variables
   - Recent usage patterns

### Load Strategy Configuration

In `registry/index.json`:

```json
{
  "loadStrategy": {
    "default": "minimal",
    "onDemand": ["agentsFull", "activation"],
    "note": "Use minimal indexes at startup, load full metadata on-demand"
  }
}
```

## 🎯 Quick Lookup

The registry provides quick lookup tables for common triggers:

### By Trigger Pattern

```json
{
  "quickLookup": {
    "byTrigger": {
      "k8s|kubernetes": "skills/kubernetes",
      "docker|container": "skills/docker",
      "test|pytest": "skills/testing"
    }
  }
}
```

### By Task Type

```json
{
  "quickLookup": {
    "byTask": {
      "deploy": ["k8s-deployer", "docker-builder", "helm-specialist"],
      "test": ["tester", "e2e-tester", "qa-engineer"],
      "review": ["reviewer", "security-auditor"]
    }
  }
}
```

### By MCP

```json
{
  "quickLookup": {
    "byMcp": {
      "database": ["supabase", "upstash"],
      "deployment": ["vercel", "github"],
      "testing": ["playwright"]
    }
  }
}
```

## 🛠️ Troubleshooting

### "Registry directory not found"

**Cause**: Running validator from wrong directory

**Fix**: Ensure you're in the project root or specify correct path:

```bash
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude
/registry-check
```

### "No such file or directory: tsx"

**Cause**: TypeScript execution engine not installed

**Fix**: Install dependencies:

```bash
cd .claude/core
npm install
```

### "Permission denied" on hooks

**Cause**: Hook script not executable

**Fix**:

```bash
chmod +x .claude/hooks/pre-commit-registry.sh
```

### "JSON syntax error"

**Cause**: Invalid JSON in registry file

**Fix**: Use a JSON validator or linter:

```bash
npx jsonlint registry/agents.index.json
```

Or use `/registry-check` which will pinpoint the error.

### "Validation takes too long"

**Cause**: Large number of files to check

**Optimization**: The validator uses parallel processing and caching. For very large repositories:

1. Run validation only on changed files in pre-commit hook (default behavior)
2. Use `--verbose` flag to see progress
3. Consider splitting large registries into smaller category-specific indexes

## 📚 Validation Rules

### Critical Rules (Block Commits)

1. ✅ **File Existence**: All `path` references must point to existing files
2. ✅ **Valid JSON**: All registry files must parse without errors
3. ✅ **No Duplicate IDs**: Resource IDs must be unique within registry type
4. ✅ **Cross-Reference Integrity**: Keyword mappings must reference real resources

### Warning Rules (Allow Commits)

1. ⚠️  **Missing Metadata**: Resources should have type, keywords, etc.
2. ⚠️  **Orphaned Files**: Files should be registered
3. ⚠️  **Inconsistent Naming**: Follow kebab-case convention
4. ⚠️  **Deprecated Fields**: Update to latest schema version

## 🔗 Related Files

- **Validator**: `.claude/core/registry-validator.ts` - Validation engine
- **Fixer**: `.claude/core/registry-fixer.ts` - Auto-fix utilities
- **Command**: `.claude/commands/registry-check.md` - Slash command
- **Hook**: `.claude/hooks/pre-commit-registry.sh` - Pre-commit validation
- **Master Index**: `registry/index.json` - Central registry configuration

## 🤝 Contributing

When adding or modifying registry resources:

1. ✅ Create/update the resource file
2. ✅ Add entry to appropriate registry index
3. ✅ Add keyword mappings if needed
4. ✅ Run `/registry-check` to validate
5. ✅ Fix any errors with `/registry-check --fix`
6. ✅ Commit (pre-commit hook will validate again)

## 📖 Version History

- **v4.0.0** (2025-11-28): Current version with lazy loading and context activation
- **v3.0.0**: Complete metadata in indexes, no external files required
- **v2.0.0**: Introduction of activation profiles
- **v1.0.0**: Initial registry system

## 🎓 Best Practices

### DO ✅

- Keep registry files in sync with actual resources
- Use descriptive, unique IDs
- Add comprehensive keywords for activation
- Run validation before committing
- Use auto-fix for common issues
- Document custom categories

### DON'T ❌

- Manually edit registry files without validation
- Use duplicate IDs across categories
- Reference non-existent files
- Skip pre-commit validation
- Leave orphaned files unregistered
- Commit invalid JSON

## 📞 Support

For issues with registry validation:

1. Check this README for common issues
2. Run `/registry-check --verbose` for detailed diagnostics
3. Review validator output for specific errors
4. Check `.claude/core/registry-validator.ts` source for advanced debugging

---

**Last Updated**: 2025-12-12
**Registry Version**: 4.0.0
**Maintained By**: Claude Orchestration System

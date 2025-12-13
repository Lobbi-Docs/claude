# Plugin CLI Quick Start

## Installation

```bash
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\plugin-cli
npm install
npm run build
```

## Usage via Claude Code

Use the `/plugin-dev` command:

```bash
/plugin-dev <command> [options]
```

## Common Commands

### 1. Create New Plugin

```bash
/plugin-dev init my-plugin --type full
```

**Options:**
- `--type full` - Complete plugin (default)
- `--type agent-pack` - Agent collection only
- `--type skill-pack` - Skills only
- `--type workflow-pack` - Commands/workflows only

### 2. Validate Plugin

```bash
/plugin-dev validate ./my-plugin
```

Checks:
- Manifest JSON structure
- File references
- Agent/skill/command format
- Hook executability

### 3. Lint for Best Practices

```bash
/plugin-dev lint ./my-plugin
```

Checks:
- Keywords and categories
- Descriptions
- Activation triggers
- Examples
- README/LICENSE

### 4. Diagnose Issues

```bash
/plugin-dev doctor ./my-plugin
```

Checks:
- Plugin structure
- Circular dependencies
- Environment variables
- Git status
- Common issues

### 5. Show Plugin Info

```bash
/plugin-dev info ./my-plugin
```

Displays metadata and resource counts.

### 6. Build Plugin

```bash
/plugin-dev build ./my-plugin --minify --tree-shake
```

Creates `.cpkg` archive in `dist/` directory.

## Development Workflow

```bash
# 1. Create
/plugin-dev init my-awesome-plugin

# 2. Develop
# Edit agents/, skills/, commands/, hooks/

# 3. Validate
/plugin-dev validate ./my-awesome-plugin

# 4. Lint
/plugin-dev lint ./my-awesome-plugin

# 5. Test
# Manual testing in Claude Code

# 6. Diagnose
/plugin-dev doctor ./my-awesome-plugin

# 7. Build
/plugin-dev build ./my-awesome-plugin --minify --tree-shake

# 8. Distribute
# Share the .cpkg file
```

## Direct Node Usage

Without global install:

```bash
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\plugin-cli
node dist/cli.js <command> [options]
```

## Tips

1. Use `PLUGIN_CLI_QUIET=true` to suppress header
2. Use `--json` flag for programmatic output
3. Run `doctor` first to identify issues
4. Use `--strict` validation for distribution
5. Add `--fix` to lint for auto-fixes

## Example Output

### Validate
```
✗ 3 Error(s):
- Hook script is not executable
- Missing required field: description
- Agent handler not found

✓ Validation passed (with warnings)
```

### Lint
```
⚠ 3 Warning(s):
- Skill should specify triggers
- Command should include examples

ℹ 13 Suggestion(s):
- Plugin should include LICENSE file
```

### Doctor
```
Running plugin diagnostics...
✓ Plugin structure checked
✓ Manifest is valid
⚠ 3 non-executable hook(s)

✓ Plugin is healthy (with warnings)
```

## See Also

- Full README: `./README.md`
- Command Reference: `../../commands/plugin-dev.md`
- Templates: `./templates/`

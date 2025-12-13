# Plugin Development Command

This command provides access to the Claude Code Plugin CLI for plugin development.

## Usage

```bash
/plugin-dev <subcommand> [options]
```

## Available Subcommands

### init - Create New Plugin

Initialize a new plugin from templates.

```bash
/plugin-dev init [name]
```

**Options:**
- `-t, --type <type>` - Plugin type: agent-pack, skill-pack, workflow-pack, full (default: full)
- `-a, --author <author>` - Plugin author name
- `-d, --description <description>` - Plugin description
- `-l, --license <license>` - License type (default: MIT)
- `--no-git` - Skip git initialization
- `--no-samples` - Skip creating sample resources

**Examples:**
```bash
# Interactive mode
/plugin-dev init

# Create full plugin with samples
/plugin-dev init my-awesome-plugin

# Create agent pack without git
/plugin-dev init agent-toolkit --type agent-pack --no-git

# Create skill pack with custom author
/plugin-dev init domain-skills --type skill-pack --author "Your Name"
```

### validate - Validate Plugin

Validate plugin structure, manifests, and resources.

```bash
/plugin-dev validate [path]
```

**Options:**
- `--strict` - Enable strict validation mode
- `--json` - Output results as JSON

**Examples:**
```bash
# Validate current directory
/plugin-dev validate

# Validate specific plugin
/plugin-dev validate ./my-plugin

# Strict mode
/plugin-dev validate --strict
```

### lint - Lint Plugin

Check plugin for best practices and coding standards.

```bash
/plugin-dev lint [path]
```

**Options:**
- `--fix` - Automatically fix issues where possible
- `--json` - Output results as JSON
- `--rules <rules>` - Comma-separated list of rules to enable

**Examples:**
```bash
# Lint current directory
/plugin-dev lint

# Lint with auto-fix
/plugin-dev lint --fix

# Lint specific rules
/plugin-dev lint --rules agent-has-examples,command-has-description
```

### build - Build Plugin

Bundle plugin for distribution.

```bash
/plugin-dev build [path]
```

**Options:**
- `-o, --output <path>` - Output directory for bundle
- `--minify` - Minify JSON manifests
- `--source-maps` - Generate source maps
- `--tree-shake` - Remove unused resources

**Examples:**
```bash
# Build plugin
/plugin-dev build

# Build with optimization
/plugin-dev build --minify --tree-shake

# Build to custom output
/plugin-dev build -o ./dist
```

### doctor - Diagnose Issues

Run comprehensive diagnostics on plugin.

```bash
/plugin-dev doctor [path]
```

**Options:**
- `--json` - Output results as JSON

**Examples:**
```bash
# Diagnose current plugin
/plugin-dev doctor

# Diagnose with JSON output
/plugin-dev doctor --json
```

### info - Display Plugin Info

Show plugin metadata and statistics.

```bash
/plugin-dev info [path]
```

**Examples:**
```bash
# Show info for current plugin
/plugin-dev info

# Show info for specific plugin
/plugin-dev info ./my-plugin
```

## Implementation

When this command is invoked, use the Bash tool to call the plugin CLI:

```bash
# Navigate to plugin-cli directory
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\plugin-cli

# Run the desired command
npm run dev -- <command> [options]
```

Or if installed globally:

```bash
claude-plugin <command> [options]
```

## Development Workflow

### 1. Create Plugin

```bash
/plugin-dev init my-plugin --type full
cd my-plugin
```

### 2. Develop

Edit agents, skills, commands, and hooks as needed.

### 3. Validate

```bash
/plugin-dev validate
```

### 4. Lint

```bash
/plugin-dev lint
```

### 5. Test

```bash
# Run your tests
npm test

# Or use plugin-specific test command
/plugin-dev test
```

### 6. Build

```bash
/plugin-dev build --minify --tree-shake
```

### 7. Publish

```bash
/plugin-dev publish
```

## Tips

- Use `--verbose` flag for detailed output
- Run `doctor` command to diagnose issues
- Use `--json` flag for programmatic output
- Keep plugins focused on single domains
- Follow naming conventions (lowercase-with-hyphens)
- Include comprehensive README.md
- Add LICENSE file
- Version using semantic versioning

## See Also

- Plugin CLI README: `.claude/tools/plugin-cli/README.md`
- Plugin Manager: `.claude/tools/plugin-manager/`
- Template Examples: `.claude/tools/plugin-cli/templates/`

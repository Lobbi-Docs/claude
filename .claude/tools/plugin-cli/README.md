# Claude Code Plugin CLI

Comprehensive CLI tool for Claude Code plugin development with scaffolding, validation, bundling, and diagnostics.

## Features

- **Scaffolding** - Create plugins from templates with interactive prompts
- **Validation** - Comprehensive validation of plugin structure and manifests
- **Linting** - Best practices checker with auto-fix support
- **Bundling** - Package plugins for distribution with optimization
- **Diagnostics** - Identify and fix common plugin issues
- **Testing** - Integrated test runner for plugin validation
- **Templates** - Pre-built templates for different plugin types

## Installation

### Local Development

```bash
cd .claude/tools/plugin-cli
npm install
npm run build
```

### Global Installation

```bash
npm install -g .
```

### Development Mode

```bash
npm run dev -- <command> [options]
```

## Quick Start

### Create a New Plugin

```bash
# Interactive mode
claude-plugin init

# Quick create
claude-plugin init my-plugin --type full

# Agent pack
claude-plugin init agent-toolkit --type agent-pack

# Skill pack
claude-plugin init domain-skills --type skill-pack --author "Your Name"
```

### Validate Plugin

```bash
# Validate current directory
claude-plugin validate

# Validate specific path
claude-plugin validate ./my-plugin

# Strict mode
claude-plugin validate --strict
```

### Lint Plugin

```bash
# Check best practices
claude-plugin lint

# Auto-fix issues
claude-plugin lint --fix

# Specific rules
claude-plugin lint --rules agent-has-examples,command-has-description
```

### Build Plugin

```bash
# Bundle for distribution
claude-plugin build

# With optimization
claude-plugin build --minify --tree-shake

# Custom output
claude-plugin build -o ./dist
```

### Diagnose Issues

```bash
# Run diagnostics
claude-plugin doctor

# JSON output
claude-plugin doctor --json
```

### Display Plugin Info

```bash
# Show metadata
claude-plugin info

# Specific plugin
claude-plugin info ./my-plugin
```

## Commands

### init

Initialize a new plugin from template.

```bash
claude-plugin init [name] [options]
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
claude-plugin init my-awesome-plugin
claude-plugin init agent-pack --type agent-pack --no-git
claude-plugin init skills --type skill-pack --author "Your Name"
```

### validate

Validate plugin structure and manifests.

```bash
claude-plugin validate [path] [options]
```

**Options:**
- `--strict` - Enable strict validation mode
- `--json` - Output results as JSON

**Validation Checks:**
- Manifest JSON schema validation
- Required fields presence
- File reference integrity
- Agent/skill/command structure
- Hook executability
- Cross-reference validation

**Examples:**
```bash
claude-plugin validate
claude-plugin validate ./my-plugin --strict
claude-plugin validate --json
```

### lint

Lint plugin for best practices.

```bash
claude-plugin lint [path] [options]
```

**Options:**
- `--fix` - Automatically fix issues where possible
- `--json` - Output results as JSON
- `--rules <rules>` - Comma-separated list of rules to enable

**Lint Rules:**

**Manifest Rules:**
- `manifest-has-keywords` - Check for keywords
- `manifest-has-categories` - Check for categories
- `manifest-has-repository` - Check for repository info
- `description-length` - Validate description length
- `has-readme` - Check for README.md
- `has-license` - Check for LICENSE file

**Agent Rules:**
- `agent-model-specified` - Agents must specify model
- `agent-has-description` - Agents need descriptions
- `agent-has-triggers` - Agents should have triggers
- `agent-has-examples` - Agents should include examples

**Skill Rules:**
- `skill-has-triggers` - Skills need activation triggers
- `skill-has-filepatterns` - Skills should specify file patterns

**Command Rules:**
- `command-has-description` - Commands must have descriptions
- `command-has-examples` - Commands should include examples

**Hook Rules:**
- `hook-has-event` - Hooks must specify event type
- `hook-has-pattern` - Hooks should have matching patterns

**Examples:**
```bash
claude-plugin lint
claude-plugin lint --fix
claude-plugin lint --rules agent-has-examples,command-has-description
```

### build

Bundle plugin for distribution.

```bash
claude-plugin build [path] [options]
```

**Options:**
- `-o, --output <path>` - Output directory for bundle (default: ./dist)
- `--minify` - Minify JSON manifests
- `--source-maps` - Generate source maps for debugging
- `--tree-shake` - Remove unused resources

**Build Process:**
1. Load plugin manifest
2. Tree-shake unused resources (optional)
3. Minify manifests (optional)
4. Create .cpkg archive
5. Include README and LICENSE
6. Generate source maps (optional)

**Output:**
Creates a `.cpkg` file (ZIP archive) containing:
- `.claude-plugin/plugin.json` - Manifest
- `agents/` - Agent markdown files
- `skills/` - Skill directories
- `commands/` - Command markdown files
- `hooks/` - Hook scripts
- `README.md` - Documentation
- `LICENSE` - License file
- `.claude-plugin/sourcemap.json` - Source map (if enabled)

**Examples:**
```bash
claude-plugin build
claude-plugin build --minify --tree-shake
claude-plugin build -o ./release --source-maps
```

### doctor

Diagnose common plugin issues.

```bash
claude-plugin doctor [path] [options]
```

**Options:**
- `--json` - Output results as JSON

**Diagnostic Checks:**
1. **Plugin Structure** - Verify required directories and files exist
2. **Manifest Validity** - Check JSON syntax and required fields
3. **File References** - Ensure all handler files exist
4. **Circular Dependencies** - Detect circular agent dependencies
5. **Environment Variables** - Check required env vars are set
6. **Hook Executability** - Verify hook scripts are executable
7. **Broken References** - Find broken internal references
8. **Git Status** - Check repository status

**Issue Types:**
- **Critical** - Must be fixed before distribution
- **Warning** - Should be addressed
- **Info** - Suggestions for improvement

**Examples:**
```bash
claude-plugin doctor
claude-plugin doctor ./my-plugin
claude-plugin doctor --json
```

### info

Display plugin metadata and statistics.

```bash
claude-plugin info [path]
```

**Displays:**
- Plugin name and version
- Description
- Author and license
- Resource counts (agents, skills, commands, hooks)

**Examples:**
```bash
claude-plugin info
claude-plugin info ./my-plugin
```

### test

Run plugin test suite (coming soon).

```bash
claude-plugin test [path] [options]
```

**Options:**
- `--coverage` - Generate coverage report
- `--watch` - Watch mode for continuous testing

### publish

Publish plugin to registry (coming soon).

```bash
claude-plugin publish [path] [options]
```

**Options:**
- `-r, --registry <url>` - Registry URL
- `-t, --tag <tag>` - Version tag (default: latest)
- `--access <level>` - Access level: public or private
- `--dry-run` - Simulate publish without uploading

## Plugin Types

### Full Plugin

Complete plugin with all resource types.

**Use for:**
- Comprehensive platform plugins
- Domain-specific toolkits
- Maximum flexibility

**Includes:**
- Agents
- Skills
- Commands
- Hooks

### Agent Pack

Collection of specialized agents.

**Use for:**
- Domain-specific automation
- Agent workflows
- Specialized AI assistants

**Includes:**
- Agents only
- Agent coordination
- Shared context

### Skill Pack

Collection of domain knowledge.

**Use for:**
- Framework/library expertise
- Domain knowledge bases
- File-pattern activation

**Includes:**
- Skills only
- Documentation
- Best practices

### Workflow Pack

Pre-built commands and workflows.

**Use for:**
- Slash commands
- Workflow automation
- Quick actions

**Includes:**
- Commands
- Workflows
- Templates

## Templates

Located in `templates/` directory:

```
templates/
├── agent-pack/
├── skill-pack/
├── workflow-pack/
└── full/
```

Each template provides:
- Directory structure
- Sample resources
- README template
- LICENSE template

## Development Workflow

### 1. Create Plugin

```bash
claude-plugin init my-plugin --type full
cd my-plugin
```

### 2. Develop Resources

Create agents, skills, commands, and hooks:

```
my-plugin/
├── agents/
│   └── my-agent.md
├── skills/
│   └── my-skill/
│       └── SKILL.md
├── commands/
│   └── my-command.md
├── hooks/
│   └── scripts/
│       └── my-hook.sh
└── .claude-plugin/
    └── plugin.json
```

### 3. Validate

```bash
claude-plugin validate
```

Fix any validation errors.

### 4. Lint

```bash
claude-plugin lint --fix
```

Address linting issues.

### 5. Test

```bash
# Manual testing
# Load plugin in Claude Code and test functionality

# Automated testing (future)
claude-plugin test
```

### 6. Diagnose

```bash
claude-plugin doctor
```

Resolve any issues.

### 7. Build

```bash
claude-plugin build --minify --tree-shake
```

Generates `my-plugin-0.1.0.cpkg` in `dist/`.

### 8. Distribute

Share the `.cpkg` file or publish to registry.

## Best Practices

### Naming

- Use lowercase with hyphens: `my-awesome-plugin`
- Be descriptive and specific
- Avoid generic names

### Versioning

- Follow semantic versioning: `MAJOR.MINOR.PATCH`
- Start at `0.1.0` for initial development
- Update appropriately:
  - MAJOR: Breaking changes
  - MINOR: New features (backward compatible)
  - PATCH: Bug fixes

### Documentation

- Include comprehensive README.md
- Document all agents, skills, and commands
- Provide usage examples
- List prerequisites and dependencies

### Agents

- Specify model (opus/sonnet/haiku) based on task complexity
- Include clear role and capabilities
- Provide activation triggers
- Add usage examples

### Skills

- Define clear activation triggers
- Specify file patterns when applicable
- Include domain knowledge
- Document best practices

### Commands

- Use descriptive names with `/` prefix
- Provide detailed descriptions
- Include usage examples
- Document all parameters

### Hooks

- Make scripts executable (`chmod +x`)
- Include shebang line
- Use `set -e` for error handling (bash)
- Provide error messages
- Keep execution fast

### Metadata

- Add relevant keywords for discoverability
- Choose appropriate categories
- Include repository information
- Specify license clearly

## API Reference

### PluginScaffolder

```typescript
class PluginScaffolder {
  promptForName(): Promise<string>
  promptForType(): Promise<PluginType>
  scaffold(options: ScaffoldOptions): Promise<void>
  generateStructure(type: PluginType, path: string): Promise<void>
  createSampleAgent(path: string, name: string): Promise<void>
  createSampleSkill(path: string, name: string): Promise<void>
  createSampleCommand(path: string, name: string): Promise<void>
  initGit(path: string): Promise<void>
}
```

### PluginValidator

```typescript
class PluginValidator {
  validate(path: string, options?: { strict?: boolean }): Promise<ValidationResult>
  validateManifest(manifest: PluginManifest): ValidationResult
  validateAgentMarkdown(path: string): Promise<ValidationResult>
  validateSkillMarkdown(path: string): Promise<ValidationResult>
  validateHookScript(path: string): Promise<ValidationResult>
  validateReferences(plugin: Plugin): ValidationResult
  printResults(result: ValidationResult): void
}
```

### PluginLinter

```typescript
class PluginLinter {
  lint(path: string, options?: { fix?: boolean; rules?: string[] }): Promise<LintResult[]>
  printResults(results: LintResult[]): void
}
```

### PluginBundler

```typescript
class PluginBundler {
  bundle(path: string, options?: BundleOptions): Promise<string>
  treeShake(path: string, manifest: PluginManifest): Promise<PluginManifest>
  minifyManifest(manifest: PluginManifest): PluginManifest
  createPackage(path: string, manifest: PluginManifest, output: string): Promise<void>
  generateSourceMap(manifest: PluginManifest): any
}
```

### PluginDoctor

```typescript
class PluginDoctor {
  diagnose(path: string): Promise<DiagnosisResult>
  printDiagnosis(result: DiagnosisResult): void
}
```

## Configuration

### Environment Variables

- `PLUGIN_CLI_QUIET` - Suppress header output (set to 'true')

### CLI Options

Global options available for all commands:

- `-v, --verbose` - Enable verbose logging
- `--help` - Show help
- `--version` - Show version

## Troubleshooting

### "plugin.json not found"

**Cause:** Not in a plugin directory or `.claude-plugin/plugin.json` missing.

**Solution:**
```bash
# If not initialized
claude-plugin init my-plugin

# If file was deleted
# Recreate it manually or run init in a new directory
```

### "Hook script is not executable"

**Cause:** Hook script doesn't have execute permissions.

**Solution:**
```bash
chmod +x hooks/scripts/my-hook.sh
```

### "Invalid JSON in plugin.json"

**Cause:** Syntax error in manifest file.

**Solution:**
- Validate JSON syntax using a JSON validator
- Check for missing commas, quotes, or brackets
- Run: `claude-plugin validate` for detailed errors

### "Agent handler not found"

**Cause:** File referenced in manifest doesn't exist.

**Solution:**
- Create the missing file
- Or update manifest to correct path
- Run: `claude-plugin doctor` to find all missing files

## Contributing

To contribute to the Plugin CLI:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Author

Markus Ahling

## See Also

- [Plugin Manager](../plugin-manager/) - Plugin installation and management
- [Claude Code Documentation](https://claude.ai/docs)
- [Example Plugins](../../../lobbi-platform-manager/)

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: Check the `/plugin-dev` command documentation
- Examples: See existing plugins in the repository

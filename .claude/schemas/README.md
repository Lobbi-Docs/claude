# Claude Code Plugin Schemas

Comprehensive JSON Schema validation for Claude Code plugin marketplace.

## Overview

This directory contains JSON Schema definitions for all plugin resources:

| Schema | File | Description |
|--------|------|-------------|
| **Plugin** | `plugin.schema.json` | Plugin manifest with metadata, discovery, and configuration |
| **Agent** | `agent.schema.json` | AI agent definitions with capabilities and system prompts |
| **Skill** | `skill.schema.json` | Domain knowledge and reusable skill patterns |
| **Command** | `command.schema.json` | Slash command definitions and workflows |
| **Workflow** | `workflow.schema.json` | Multi-step workflows with coordination patterns |
| **Registry** | `registry.schema.json` | Registry index files for resource cataloging |

## Schema Versions

All schemas use **JSON Schema Draft-07** format.

Current versions:
- Plugin Schema: v1
- Agent Schema: v1
- Skill Schema: v1
- Command Schema: v1
- Workflow Schema: v1
- Registry Schema: v1

## Schema Features

### Plugin Schema (`plugin.schema.json`)

Validates plugin manifests with:
- **Metadata**: Name, version, description, author
- **Discovery**: Automatic resource discovery configuration
- **Permissions**: Filesystem, network, and tool access
- **Sandbox**: Execution environment configuration
- **Dependencies**: Plugin dependencies with semver ranges
- **Activation**: Auto-activation rules and conditions
- **Orchestration**: Multi-agent coordination settings

**Required fields:**
- `name` (kebab-case)
- `version` (semver)
- `description` (10-500 chars)
- `author` (object with name)

### Agent Schema (`agent.schema.json`)

Validates agent definitions with:
- **Identity**: Name, description, model preference
- **Capabilities**: Tools, MCP servers, keywords
- **Behavior**: System prompt, instructions, examples
- **Performance**: Token estimates, complexity, duration
- **Dependencies**: Required agents and skills

**Required fields:**
- `name` (kebab-case)
- `description` (10-500 chars)
- `model` (opus|sonnet|haiku|gpt-4|gemini-pro)
- `when_to_use` (detailed explanation)

### Skill Schema (`skill.schema.json`)

Validates skill definitions with:
- **Activation**: Triggers, file patterns, keywords
- **Knowledge Base**: Commands, patterns, templates
- **Troubleshooting**: Common issues and solutions
- **Best Practices**: Recommended patterns
- **Anti-Patterns**: Common mistakes to avoid

**Required fields:**
- `name` (kebab-case)
- `description` (10-500 chars)

### Command Schema (`command.schema.json`)

Validates command definitions with:
- **Arguments**: Positional and named arguments
- **Options**: Flags and configuration
- **Execution**: Allowed tools, MCP servers
- **Validation**: Pre/post execution checks
- **Output**: Format and streaming options

**Required fields:**
- `name` (kebab-case)
- `description` (10-200 chars)

### Workflow Schema (`workflow.schema.json`)

Validates workflow definitions with:
- **Steps**: Sequential, parallel, conditional execution
- **Coordination**: Agent communication patterns
- **Error Handling**: Retry, rollback strategies
- **Monitoring**: Logging, metrics, checkpoints

**Required fields:**
- `name` (kebab-case)
- `description` (10-500 chars)
- `type` (sequential|parallel|hierarchical|mesh|adaptive)
- `steps` (array of step definitions)

### Registry Schema (`registry.schema.json`)

Validates registry index files with:
- **Items**: Cataloged resources with metadata
- **Statistics**: Counts by category and status
- **Search**: Keyword index and fuzzy matching
- **Activation**: Named profiles for resource sets
- **Validation**: Error and warning tracking

**Required fields:**
- `version` (semver)
- `type` (agents|skills|commands|workflows|tools|master)

## Usage

### Using the Validator CLI

```bash
# Validate a single file
cd .claude/core
node cli.js --file ../plugin.json

# Validate a directory
node cli.js --directory ../agents --verbose

# Validate with JSON output
node cli.js --file plugin.json --json

# Get help
node cli.js --help
```

### Using the TypeScript Validator

```typescript
import { validatePlugin, validateAgent, validateFile } from './validator';

// Validate plugin manifest
const pluginData = require('./plugin.json');
const result = validatePlugin(pluginData);

if (!result.valid) {
  result.errors.forEach(error => {
    console.error(error.message);
  });
}

// Validate file
const fileResult = validateFile('./agents/my-agent.md');
console.log(fileResult.valid ? 'Valid' : 'Invalid');

// Validate directory
const { validateDirectory } = require('./validator');
const batchResult = validateDirectory('./agents');
console.log(`Valid: ${batchResult.validFiles}/${batchResult.totalFiles}`);
```

### Pre-Commit Hook

The validation system includes a pre-commit hook that automatically validates files before commit:

```bash
# Install pre-commit hook
ln -s ../../.claude/hooks/pre-commit-validate.sh .git/hooks/pre-commit

# Or copy it
cp .claude/hooks/pre-commit-validate.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Configuration via environment variables:**

```bash
# Enable/disable validation
export VALIDATE_ON_COMMIT=true

# Strict mode (fail on warnings)
export BLOCK_ON_WARNINGS=false

# Verbose output
export VERBOSE=false
```

**Skip validation for a single commit:**

```bash
git commit --no-verify -m "Skip validation"
```

## Custom Formats

The validator includes custom format validators:

| Format | Pattern | Example |
|--------|---------|---------|
| `semver` | `\d+\.\d+\.\d+` | `1.0.0`, `2.1.0-beta` |
| `kebab-case` | `[a-z0-9]+(-[a-z0-9]+)*` | `my-plugin-name` |
| `memory-size` | `\d+[KMG]B?` | `512M`, `2G`, `1GB` |

## Common Validation Errors

### Missing Required Properties

```
Error: root: Missing required property 'version'
```

**Fix:** Add the required property to your manifest.

### Invalid Pattern

```
Error: /name: Value does not match pattern '^[a-z0-9]+(-[a-z0-9]+)*$'
```

**Fix:** Use kebab-case (lowercase with hyphens): `my-plugin-name`

### Invalid Enum Value

```
Error: /model: Value must be one of: opus, sonnet, haiku, gpt-4, gemini-pro
```

**Fix:** Use one of the allowed values.

### Type Mismatch

```
Error: /version: Expected type 'string'
```

**Fix:** Ensure the field has the correct type (string, number, boolean, array, object).

## Best Practices

### Plugin Manifests

1. **Use semantic versioning** for the `version` field
2. **Provide at least 3 keywords** for discoverability
3. **Add a license** to clarify usage terms
4. **Include examples** in documentation
5. **Set appropriate permissions** (principle of least privilege)

### Agent Definitions

1. **Write detailed `when_to_use`** explanations (min 20 chars)
2. **Provide usage examples** to help users
3. **Specify a detailed `systemPrompt`** (min 100 chars)
4. **List dependencies** on other agents
5. **Choose the right model** based on complexity

### Skill Definitions

1. **Add triggers** for automatic activation
2. **Provide file patterns** for context awareness
3. **Include troubleshooting** sections
4. **Document best practices** and anti-patterns
5. **Link to external references** when helpful

### Command Definitions

1. **Define clear arguments** with validation
2. **Add usage examples** for each argument pattern
3. **Set appropriate timeouts** for long-running commands
4. **Mark destructive commands** with `dangerLevel: "dangerous"`
5. **Require confirmation** for dangerous operations

### Workflow Definitions

1. **Choose the right type** for your use case
2. **Handle errors gracefully** with retry/rollback
3. **Set realistic timeouts** for steps
4. **Enable monitoring** for production workflows
5. **Document step dependencies** clearly

## Schema Extension

To extend the schemas with custom properties:

1. Set `additionalProperties: true` in your local schema
2. Use the `x-` prefix for custom properties
3. Document custom properties in your plugin README
4. Consider contributing useful extensions upstream

## Validation Integration

### CI/CD Integration

```yaml
# .github/workflows/validate.yml
name: Validate Plugin

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd .claude/core && npm install
      - name: Validate plugin
        run: cd .claude/core && node cli.js --directory .. --json
```

### IDE Integration

Most IDEs support JSON Schema validation:

**VS Code** (`settings.json`):
```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/plugin.json"],
      "url": "./.claude/schemas/plugin.schema.json"
    },
    {
      "fileMatch": ["**/*.agent.json"],
      "url": "./.claude/schemas/agent.schema.json"
    }
  ]
}
```

**JetBrains IDEs** (Settings → Languages & Frameworks → Schemas and DTDs → JSON Schema Mappings)

## Schema Migration

When schemas are updated:

1. Check the changelog for breaking changes
2. Update your manifests to match new requirements
3. Run validation to catch issues
4. Update your plugin version if needed

## Contributing

To contribute schema improvements:

1. Test changes with existing plugins
2. Update documentation
3. Add validation tests
4. Submit a pull request with examples

## Support

For schema-related questions:

- Check this README
- Review schema comments in JSON files
- Run validation with `--verbose` flag
- Open an issue with validation output

## License

MIT License - See LICENSE file for details

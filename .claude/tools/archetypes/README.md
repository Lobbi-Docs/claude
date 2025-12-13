# Plugin Archetype System

A comprehensive plugin template scaffolding system for creating standardized plugins with pre-configured patterns and best practices.

## Overview

The Archetype System provides a powerful way to bootstrap new plugin projects with:

- **Pre-configured Templates**: 6+ production-ready archetypes for common plugin patterns
- **Interactive Scaffolding**: CLI-based interactive prompts for easy plugin generation
- **Template Engine**: Handlebars-powered templates with extensive helpers
- **Validation**: Built-in validation for archetype structure and correctness
- **Type Safety**: Full TypeScript support throughout

## Quick Start

### Install

```bash
cd .claude/tools/archetypes
npm install
npm run build
```

### Use an Archetype

```bash
# List available archetypes
archetype list

# Get detailed information
archetype info api-integration

# Create a new plugin
archetype create api-integration -o my-api-plugin
```

## Available Archetypes

### 1. API Integration (`api-integration`)

**Best for**: REST API clients, third-party service integrations

**Features**:
- Multiple authentication methods (OAuth, API Key, JWT, Basic)
- Rate limiting and retry logic
- Request/response caching
- Comprehensive error handling
- TypeScript support

**Example**:
```bash
archetype create api-integration \
  --variable pluginName=github-api \
  --variable apiName=GitHub \
  --variable baseUrl=https://api.github.com \
  --variable authType=api-key
```

### 2. Data Processor (`data-processor`)

**Best for**: ETL pipelines, data transformation, batch processing

**Features**:
- Input/output validation
- Batch processing with configurable chunks
- Progress reporting
- Error recovery
- Streaming support

**Example**:
```bash
archetype create data-processor \
  --variable pluginName=csv-processor \
  --variable dataType=CSV
```

### 3. UI Component (`ui-component`)

**Best for**: React/Vue/Svelte component libraries

**Features**:
- Framework-agnostic (React, Vue, Svelte, Web Components)
- Multiple styling approaches
- Accessibility compliance
- Dark mode support
- Storybook integration

**Example**:
```bash
archetype create ui-component \
  --variable pluginName=button-library \
  --variable framework=react \
  --variable styling=tailwind
```

### 4. Workflow Automation (`workflow-automation`)

**Best for**: Multi-step workflows, task orchestration

**Features**:
- State machine patterns
- Workflow persistence
- Error recovery and retry
- Notification integration
- Metrics and logging

**Example**:
```bash
archetype create workflow-automation \
  --variable pluginName=onboarding-workflow \
  --variable workflowType=state-machine
```

### 5. Analytics Dashboard (`analytics-dashboard`)

**Best for**: Data visualization, reporting dashboards

**Features**:
- Multiple chart libraries
- Real-time updates
- PDF/CSV export
- Advanced filtering
- Responsive design

**Example**:
```bash
archetype create analytics-dashboard \
  --variable pluginName=sales-dashboard \
  --variable chartLibrary=recharts
```

### 6. Testing Utility (`testing-utility`)

**Best for**: Test helpers, mock factories, test utilities

**Features**:
- Mock data generators
- Fixture management
- Snapshot testing
- Coverage reporting
- E2E helpers

**Example**:
```bash
archetype create testing-utility \
  --variable pluginName=test-helpers \
  --variable testFramework=vitest
```

## CLI Commands

### `archetype list`

List all available archetypes with descriptions.

**Options**:
- `-c, --category <category>` - Filter by category
- `-k, --keyword <keyword>` - Search by keyword
- `-s, --sort <field>` - Sort by name, category, or version

**Example**:
```bash
archetype list --category integration
archetype list --keyword api
```

### `archetype info <name>`

Show detailed information about an archetype including variables, templates, and dependencies.

**Example**:
```bash
archetype info api-integration
```

### `archetype create <name>`

Create a new plugin from an archetype.

**Options**:
- `-o, --output <dir>` - Output directory (default: current directory)
- `-v, --variable <key=value>` - Set variable value (repeatable)
- `--non-interactive` - Skip interactive prompts
- `--force` - Overwrite existing files
- `--dry-run` - Preview without writing files
- `--verbose` - Verbose output

**Examples**:
```bash
# Interactive mode
archetype create api-integration -o github-client

# Non-interactive with variables
archetype create api-integration \
  -o github-client \
  --non-interactive \
  --variable pluginName=github-client \
  --variable apiName=GitHub \
  --variable baseUrl=https://api.github.com \
  --variable authType=api-key

# Dry run to preview
archetype create api-integration -o test --dry-run
```

### `archetype validate <path>`

Validate an archetype structure.

**Options**:
- `--warnings` - Treat warnings as errors

**Example**:
```bash
archetype validate ./archetypes/my-archetype
```

### `archetype publish <path>`

Publish an archetype to the registry (coming soon).

**Options**:
- `--registry <url>` - Registry URL
- `--dry-run` - Preview without publishing

## Creating Custom Archetypes

### Archetype Structure

```
my-archetype/
├── archetype.json         # Metadata and variables
├── README.md              # Usage documentation
├── templates/             # Template files
│   ├── package.json.hbs
│   ├── README.md.hbs
│   ├── src/
│   │   └── index.ts.hbs
│   └── tests/
│       └── index.test.ts.hbs
├── hooks/                 # Pre/post generation hooks
│   ├── pre-generate.ts
│   └── post-generate.ts
└── examples/              # Example outputs
```

### archetype.json Schema

```json
{
  "name": "my-archetype",
  "version": "1.0.0",
  "description": "My custom archetype",
  "category": "custom",
  "variables": [
    {
      "name": "pluginName",
      "type": "string",
      "prompt": "Plugin name:",
      "required": true,
      "validation": "^[a-z][a-z0-9-]*$"
    }
  ],
  "dependencies": [],
  "files": ["templates/**/*"]
}
```

### Variable Types

- `string` - Text input with optional regex validation
- `number` - Numeric input
- `boolean` - Yes/no confirmation
- `choice` - Single selection from choices
- `multi-choice` - Multiple selections from choices
- `path` - File path input
- `email` - Email address
- `url` - URL input

### Template Helpers

Handlebars helpers available in templates:

**String manipulation**:
- `{{uppercase str}}` - Convert to uppercase
- `{{lowercase str}}` - Convert to lowercase
- `{{capitalize str}}` - Capitalize first letter
- `{{pascalCase str}}` - Convert to PascalCase
- `{{camelCase str}}` - Convert to camelCase
- `{{snakeCase str}}` - Convert to snake_case
- `{{kebabCase str}}` - Convert to kebab-case

**Date/time**:
- `{{year}}` - Current year
- `{{date}}` - Current date

**Comparisons**:
- `{{#if (eq a b)}}` - Equality
- `{{#if (includes array value)}}` - Array includes

**Example Template**:
```handlebars
{
  "name": "{{pluginName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

### Hooks

Create hooks for pre/post generation logic:

**hooks/pre-generate.ts**:
```typescript
import type { HookContext } from '@claude/archetypes';

export default async function preGenerate(context: HookContext): Promise<void> {
  console.log(`Generating plugin: ${context.context.variables.pluginName}`);

  // Validate requirements
  // Fetch additional data
  // Setup external resources
}
```

**hooks/post-generate.ts**:
```typescript
import type { HookContext } from '@claude/archetypes';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function postGenerate(context: HookContext): Promise<void> {
  // Run npm install
  await execAsync('npm install', { cwd: context.outputDir });

  // Initialize git
  await execAsync('git init', { cwd: context.outputDir });

  console.log('Plugin generated successfully!');
}
```

## Architecture

### Core Components

1. **Archetype Registry** - Manages archetype discovery and metadata
2. **Template Engine** - Handlebars-based template processing
3. **Scaffolder** - Generates plugins from archetypes
4. **Validator** - Validates archetype structure
5. **CLI** - Command-line interface

### Workflow

```
1. User runs: archetype create api-integration
2. Registry loads archetype metadata
3. Scaffolder prompts for variables
4. Pre-generate hook executes
5. Template engine processes files
6. Files written to output directory
7. Post-generate hook executes
8. Success summary displayed
```

## Best Practices

### For Archetype Users

1. **Use Dry Run**: Preview with `--dry-run` before generating
2. **Validate Output**: Review generated files before committing
3. **Customize**: Archetypes are starting points - customize to your needs
4. **Report Issues**: Found a bug? Report it to improve archetypes

### For Archetype Creators

1. **Clear Naming**: Use descriptive, kebab-case names
2. **Comprehensive Variables**: Provide sensible defaults
3. **Documentation**: Write detailed READMEs with examples
4. **Validation**: Add validation patterns for user input
5. **Testing**: Create example outputs in `examples/` directory
6. **Hooks**: Use hooks for complex setup tasks
7. **Dependencies**: Minimize external dependencies

## Troubleshooting

### Archetype Not Found

```bash
archetype list  # Check available archetypes
```

Make sure archetypes are in the correct directory:
- `C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\archetypes\archetypes\`

### Template Errors

Use validation to check templates:
```bash
archetype validate ./my-archetype
```

### Variable Issues

Check `archetype.json` for:
- Required fields present
- Valid regex patterns
- Correct variable types
- Choices defined for choice types

## Contributing

To create a new archetype:

1. Create directory in `archetypes/`
2. Add `archetype.json` with metadata
3. Create `templates/` directory with template files
4. Add `README.md` with documentation
5. (Optional) Add hooks in `hooks/`
6. Validate with `archetype validate`
7. Test with `archetype create`

## License

MIT

## Support

For issues or questions:
- Check existing archetypes for examples
- Review documentation
- Run `archetype info <name>` for details
- Use `--verbose` flag for debugging

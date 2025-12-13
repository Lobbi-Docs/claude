# Archetype Command

Manage plugin archetypes for creating standardized plugin templates with pre-configured patterns and best practices.

## Usage

```bash
# List available archetypes
/archetype list

# Show archetype details
/archetype info <name>

# Create plugin from archetype
/archetype create <name>

# Validate archetype structure
/archetype validate <path>

# Publish archetype (coming soon)
/archetype publish <path>
```

## Quick Start

### List Available Archetypes

```bash
/archetype list
```

Shows all available archetypes grouped by category:
- **integration**: API clients, service integrations
- **data**: Data processors, ETL pipelines
- **ui**: Frontend components, UI libraries
- **workflow**: Automation, orchestration
- **analytics**: Dashboards, visualizations
- **testing**: Test utilities, mock factories

### Get Archetype Information

```bash
/archetype info api-integration
```

Shows detailed information including:
- Description and category
- Required and optional variables
- Features and capabilities
- Template files
- Dependencies
- Usage examples

### Create Plugin from Archetype

```bash
/archetype create api-integration
```

Interactive mode:
1. Prompts for required variables
2. Validates input
3. Generates plugin files
4. Runs hooks
5. Shows summary

Non-interactive mode:
```bash
/archetype create api-integration \
  --output ./my-plugin \
  --variable pluginName=my-api \
  --variable apiName=MyAPI \
  --variable baseUrl=https://api.example.com \
  --variable authType=api-key \
  --non-interactive
```

## Available Archetypes

### 1. api-integration

**Purpose**: REST API client plugins

**Variables**:
- `pluginName` (required) - Plugin name in kebab-case
- `apiName` (required) - API service name
- `baseUrl` (required) - API base URL
- `authType` (required) - Authentication type: oauth, api-key, jwt, basic, none
- `features` - Optional features: retry, rate-limit, caching, logging, pagination
- `author` - Author name
- `description` (required) - Plugin description

**Best for**:
- GitHub, Stripe, Slack integrations
- Third-party API clients
- REST API wrappers

**Example**:
```bash
/archetype create api-integration
```

### 2. data-processor

**Purpose**: Data transformation and processing plugins

**Variables**:
- `pluginName` (required) - Plugin name
- `dataType` (required) - Type of data (CSV, JSON, XML, etc.)
- `features` - validation, streaming, batch, progress, error-recovery
- `author` - Author name
- `description` (required) - Plugin description

**Best for**:
- ETL pipelines
- Data transformation
- Batch processing

**Example**:
```bash
/archetype create data-processor
```

### 3. ui-component

**Purpose**: Frontend component libraries

**Variables**:
- `pluginName` (required) - Plugin name
- `framework` (required) - react, vue, svelte, web-components
- `styling` (required) - css-modules, styled-components, tailwind, vanilla-css
- `features` - typescript, storybook, a11y, dark-mode, theming
- `author` - Author name
- `description` (required) - Component description

**Best for**:
- React component libraries
- Design systems
- Reusable UI components

**Example**:
```bash
/archetype create ui-component
```

### 4. workflow-automation

**Purpose**: Multi-step workflow automation

**Variables**:
- `pluginName` (required) - Plugin name
- `workflowType` (required) - sequential, parallel, conditional, state-machine
- `features` - persistence, retry, notifications, logging, metrics
- `author` - Author name
- `description` (required) - Workflow description

**Best for**:
- Task orchestration
- Multi-step processes
- State machines

**Example**:
```bash
/archetype create workflow-automation
```

### 5. analytics-dashboard

**Purpose**: Analytics and visualization dashboards

**Variables**:
- `pluginName` (required) - Plugin name
- `chartLibrary` (required) - recharts, chart.js, d3, plotly
- `features` - real-time, export-pdf, export-csv, filters, date-range
- `author` - Author name
- `description` (required) - Dashboard description

**Best for**:
- Data visualization
- Reporting dashboards
- Metrics displays

**Example**:
```bash
/archetype create analytics-dashboard
```

### 6. testing-utility

**Purpose**: Testing helpers and utilities

**Variables**:
- `pluginName` (required) - Plugin name
- `testFramework` (required) - vitest, jest, mocha, ava
- `features` - mock-factory, fixtures, snapshots, coverage, e2e-helpers
- `author` - Author name
- `description` (required) - Testing utility description

**Best for**:
- Mock data generators
- Test fixtures
- Test utilities

**Example**:
```bash
/archetype create testing-utility
```

## Options

### Common Options

- `-o, --output <dir>` - Output directory for generated plugin
- `--force` - Overwrite existing files
- `--dry-run` - Preview without writing files
- `--verbose` - Show detailed output

### Create Options

- `-v, --variable <key=value>` - Set variable value (can be used multiple times)
- `--non-interactive` - Skip interactive prompts (requires all variables via --variable)

### List Options

- `-c, --category <category>` - Filter by category
- `-k, --keyword <keyword>` - Search by keyword
- `-s, --sort <field>` - Sort by name, category, or version

### Validate Options

- `--warnings` - Treat warnings as errors

## Examples

### Example 1: GitHub API Client

```bash
/archetype create api-integration \
  --variable pluginName=github-client \
  --variable apiName=GitHub \
  --variable baseUrl=https://api.github.com \
  --variable authType=api-key \
  --variable features=retry,rate-limit,logging \
  --variable author="Your Name" \
  --variable description="GitHub API client with TypeScript support" \
  --non-interactive \
  --output ./github-client
```

### Example 2: CSV Data Processor

```bash
/archetype create data-processor \
  --variable pluginName=csv-processor \
  --variable dataType=CSV \
  --variable features=validation,batch,progress \
  --variable description="CSV data processor with validation and batch processing" \
  --output ./csv-processor
```

### Example 3: React Button Library

```bash
/archetype create ui-component \
  --variable pluginName=button-library \
  --variable framework=react \
  --variable styling=tailwind \
  --variable features=typescript,a11y,dark-mode \
  --variable description="Accessible button component library" \
  --output ./button-library
```

## Creating Custom Archetypes

### 1. Create Archetype Directory

```bash
mkdir -p .claude/tools/archetypes/archetypes/my-archetype
cd .claude/tools/archetypes/archetypes/my-archetype
```

### 2. Create archetype.json

```json
{
  "name": "my-archetype",
  "version": "1.0.0",
  "description": "My custom archetype for specific use case",
  "category": "custom",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["custom", "template"],
  "variables": [
    {
      "name": "pluginName",
      "type": "string",
      "prompt": "Plugin name (kebab-case):",
      "required": true,
      "validation": "^[a-z][a-z0-9-]*$",
      "description": "Name of the plugin"
    },
    {
      "name": "feature",
      "type": "choice",
      "prompt": "Select feature:",
      "choices": ["basic", "advanced"],
      "default": "basic"
    }
  ],
  "files": ["templates/**/*"]
}
```

### 3. Create Templates

```bash
mkdir -p templates/src
echo '{"name": "{{pluginName}}", "version": "1.0.0"}' > templates/package.json.hbs
```

### 4. Validate

```bash
/archetype validate .claude/tools/archetypes/archetypes/my-archetype
```

### 5. Test

```bash
/archetype create my-archetype --dry-run
```

## Template Helpers

Available Handlebars helpers in templates:

**String Transformations**:
```handlebars
{{uppercase "hello"}}         → HELLO
{{lowercase "HELLO"}}         → hello
{{capitalize "hello"}}        → Hello
{{pascalCase "my-plugin"}}    → MyPlugin
{{camelCase "my-plugin"}}     → myPlugin
{{snakeCase "my-plugin"}}     → my_plugin
{{kebabCase "my_plugin"}}     → my-plugin
```

**Conditionals**:
```handlebars
{{#if (eq authType "api-key")}}
  // API key authentication
{{else}}
  // Other authentication
{{/if}}

{{#if (includes features "retry")}}
  // Retry logic
{{/if}}
```

**Date/Time**:
```handlebars
{{year}}                      → 2025
{{date}}                      → 12/12/2025
```

## Hooks

### Pre-Generate Hook

**hooks/pre-generate.ts**:
```typescript
import type { HookContext } from '@claude/archetypes';

export default async function(context: HookContext): Promise<void> {
  // Run before file generation
  console.log('Preparing to generate plugin...');

  // Validate external requirements
  // Fetch additional data
  // Create external resources
}
```

### Post-Generate Hook

**hooks/post-generate.ts**:
```typescript
import type { HookContext } from '@claude/archetypes';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function(context: HookContext): Promise<void> {
  // Run after file generation
  console.log('Finalizing plugin setup...');

  // Install dependencies
  await execAsync('npm install', { cwd: context.outputDir });

  // Initialize git
  await execAsync('git init', { cwd: context.outputDir });

  // Run initial build
  await execAsync('npm run build', { cwd: context.outputDir });
}
```

## Troubleshooting

### Issue: Archetype not found

**Solution**: Check archetype name and list available archetypes:
```bash
/archetype list
```

### Issue: Template syntax error

**Solution**: Validate the archetype:
```bash
/archetype validate ./my-archetype
```

### Issue: Variable validation failed

**Solution**: Check archetype.json for:
- Correct validation regex
- Required fields marked
- Valid choices for choice types

### Issue: Files not generated

**Solution**: Check permissions and use --verbose:
```bash
/archetype create my-archetype --verbose
```

## Best Practices

### For Users

1. **Preview First**: Use `--dry-run` to preview generated files
2. **Validate Variables**: Double-check variable values before generating
3. **Review Output**: Always review generated code before use
4. **Customize**: Archetypes are starting points - adapt to your needs

### For Creators

1. **Clear Naming**: Use descriptive, searchable names
2. **Sensible Defaults**: Provide good default values
3. **Comprehensive Docs**: Write detailed README with examples
4. **Validate Input**: Add validation patterns for all variables
5. **Test Thoroughly**: Create example outputs and test all paths
6. **Minimize Dependencies**: Keep template dependencies minimal

## Integration with Claude Code

Archetypes integrate seamlessly with Claude Code workflows:

1. **Plugin Development**: Generate plugin scaffolds quickly
2. **Standardization**: Ensure consistent plugin structure
3. **Best Practices**: Built-in patterns and conventions
4. **Time Saving**: Skip boilerplate, focus on logic

## Next Steps

After generating a plugin:

1. Review generated files
2. Install dependencies: `npm install`
3. Customize implementation
4. Add tests
5. Build: `npm run build`
6. Document usage
7. Publish to registry

## Support

For help:
- View archetype details: `/archetype info <name>`
- Check README: `.claude/tools/archetypes/README.md`
- Validate archetype: `/archetype validate <path>`
- Use verbose mode: `--verbose`

## Location

**Archetype Tool**: `C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\archetypes\`

**Archetypes Directory**: `C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\archetypes\archetypes\`

**CLI Binary**: `C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\tools\archetypes\dist\cli.js`

/**
 * Plugin Scaffolder
 * Handles interactive plugin creation from templates
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { ScaffoldOptions, PluginType, PluginManifest } from './types';

export class PluginScaffolder {
  private templateDir: string;

  constructor() {
    this.templateDir = path.join(__dirname, '..', 'templates');
  }

  /**
   * Prompt user for plugin name
   */
  async promptForName(): Promise<string> {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Plugin name:',
        default: 'my-claude-plugin',
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'Plugin name is required';
          }
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Plugin name must contain only lowercase letters, numbers, and hyphens';
          }
          return true;
        }
      }
    ]);
    return name;
  }

  /**
   * Prompt user for plugin type
   */
  async promptForType(): Promise<PluginType> {
    const { type } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Select plugin type:',
        choices: [
          {
            name: 'Full Plugin - Complete plugin with agents, skills, commands, and hooks',
            value: 'full'
          },
          {
            name: 'Agent Pack - Collection of specialized agents',
            value: 'agent-pack'
          },
          {
            name: 'Skill Pack - Collection of domain skills',
            value: 'skill-pack'
          },
          {
            name: 'Workflow Pack - Pre-built workflows and commands',
            value: 'workflow-pack'
          }
        ]
      }
    ]);
    return type;
  }

  /**
   * Main scaffolding method
   */
  async scaffold(options: ScaffoldOptions): Promise<void> {
    const spinner = ora('Creating plugin structure...').start();

    try {
      // Create plugin directory
      const pluginPath = path.resolve(options.name);

      if (await fs.pathExists(pluginPath)) {
        spinner.fail();
        throw new Error(`Directory ${options.name} already exists`);
      }

      await fs.ensureDir(pluginPath);
      spinner.text = 'Plugin directory created';

      // Generate structure based on type
      await this.generateStructure(options.type, pluginPath);
      spinner.text = 'Directory structure generated';

      // Create manifest
      const manifest = this.createManifest(options);
      await fs.writeJSON(
        path.join(pluginPath, '.claude-plugin', 'plugin.json'),
        manifest,
        { spaces: 2 }
      );
      spinner.text = 'Manifest created';

      // Create sample resources if requested
      if (options.samples) {
        await this.createSamples(options.type, pluginPath, options.name);
        spinner.text = 'Sample resources created';
      }

      // Create supporting files
      await this.createSupportingFiles(pluginPath, options);
      spinner.text = 'Supporting files created';

      // Initialize git if requested
      if (options.initGit) {
        await this.initGit(pluginPath);
        spinner.text = 'Git repository initialized';
      }

      spinner.succeed(chalk.green('Plugin scaffolded successfully!'));
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  /**
   * Generate directory structure based on plugin type
   */
  async generateStructure(type: PluginType, pluginPath: string): Promise<void> {
    const baseStructure = [
      '.claude-plugin',
      'README.md'
    ];

    const structures: Record<PluginType, string[]> = {
      'full': [
        ...baseStructure,
        'agents',
        'skills',
        'commands',
        'hooks/scripts'
      ],
      'agent-pack': [
        ...baseStructure,
        'agents'
      ],
      'skill-pack': [
        ...baseStructure,
        'skills'
      ],
      'workflow-pack': [
        ...baseStructure,
        'commands',
        'workflows'
      ]
    };

    const dirs = structures[type];

    for (const dir of dirs) {
      await fs.ensureDir(path.join(pluginPath, dir));
    }
  }

  /**
   * Create plugin manifest
   */
  createManifest(options: ScaffoldOptions): PluginManifest {
    const manifest: PluginManifest = {
      name: options.name,
      version: '0.1.0',
      description: options.description || `A Claude Code ${options.type} plugin`,
      author: options.author || 'Your Name',
      license: options.license || 'MIT',
      keywords: this.getDefaultKeywords(options.type),
      categories: this.getDefaultCategories(options.type)
    };

    // Add sections based on plugin type
    if (options.type === 'full' || options.type === 'agent-pack') {
      manifest.agents = {};
    }

    if (options.type === 'full' || options.type === 'skill-pack') {
      manifest.skills = {};
    }

    if (options.type === 'full' || options.type === 'workflow-pack') {
      manifest.commands = {};
    }

    if (options.type === 'full') {
      manifest.hooks = {};
      manifest.configuration = {
        localConfig: '.claude/plugin.local.md',
        requiredEnvVars: [],
        optionalEnvVars: []
      };
    }

    return manifest;
  }

  /**
   * Get default keywords for plugin type
   */
  private getDefaultKeywords(type: PluginType): string[] {
    const baseKeywords = ['claude', 'plugin'];
    const typeKeywords: Record<PluginType, string[]> = {
      'full': ['agents', 'skills', 'commands', 'hooks'],
      'agent-pack': ['agents', 'automation'],
      'skill-pack': ['skills', 'domain-knowledge'],
      'workflow-pack': ['workflows', 'commands']
    };

    return [...baseKeywords, ...typeKeywords[type]];
  }

  /**
   * Get default categories for plugin type
   */
  private getDefaultCategories(type: PluginType): string[] {
    const categoryMap: Record<PluginType, string[]> = {
      'full': ['productivity'],
      'agent-pack': ['automation'],
      'skill-pack': ['development'],
      'workflow-pack': ['productivity']
    };

    return categoryMap[type];
  }

  /**
   * Create sample resources
   */
  async createSamples(type: PluginType, pluginPath: string, pluginName: string): Promise<void> {
    if (type === 'full' || type === 'agent-pack') {
      await this.createSampleAgent(pluginPath, pluginName);
    }

    if (type === 'full' || type === 'skill-pack') {
      await this.createSampleSkill(pluginPath, pluginName);
    }

    if (type === 'full' || type === 'workflow-pack') {
      await this.createSampleCommand(pluginPath, pluginName);
    }

    if (type === 'full') {
      await this.createSampleHook(pluginPath);
    }
  }

  /**
   * Create sample agent
   */
  async createSampleAgent(pluginPath: string, pluginName: string): Promise<void> {
    const agentContent = `---
name: example-agent
description: Example agent for ${pluginName}
model: sonnet
triggers:
  - example
  - demo
---

# Example Agent

You are an example agent for the ${pluginName} plugin.

## Role

Your role is to demonstrate how agents work in Claude Code plugins.

## Capabilities

- Perform example tasks
- Demonstrate agent patterns
- Show best practices

## Instructions

When activated:

1. Greet the user
2. Explain what you can do
3. Ask how you can help

## Examples

**User:** Help me with an example

**Agent:** I'm the example agent! I can help you understand how agents work in plugins.

## Best Practices

- Always be clear about your capabilities
- Provide helpful examples
- Follow the plugin's conventions
`;

    await fs.writeFile(
      path.join(pluginPath, 'agents', 'example-agent.md'),
      agentContent
    );

    // Update manifest
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
    const manifest = await fs.readJSON(manifestPath);
    manifest.agents = manifest.agents || {};
    manifest.agents['example-agent'] = {
      description: `Example agent for ${pluginName}`,
      model: 'sonnet',
      handler: 'agents/example-agent.md',
      triggers: ['example', 'demo']
    };
    await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
  }

  /**
   * Create sample skill
   */
  async createSampleSkill(pluginPath: string, pluginName: string): Promise<void> {
    const skillDir = path.join(pluginPath, 'skills', 'example-skill');
    await fs.ensureDir(skillDir);

    const skillContent = `# Example Skill

This is an example skill for the ${pluginName} plugin.

## Activation Triggers

This skill is activated when:
- Working with example files
- User mentions "example" in their request

## Domain Knowledge

### Concepts

- Example patterns
- Best practices
- Common use cases

### File Patterns

This skill recognizes:
- \`*.example\` - Example files
- \`example.config.json\` - Configuration files

## Examples

### Creating an Example

\`\`\`bash
# Create example file
touch example.txt
\`\`\`

### Best Practices

1. Keep examples simple
2. Document clearly
3. Provide context

## References

- Example documentation
- Related skills
- External resources
`;

    await fs.writeFile(
      path.join(skillDir, 'SKILL.md'),
      skillContent
    );

    // Update manifest
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
    const manifest = await fs.readJSON(manifestPath);
    manifest.skills = manifest.skills || {};
    manifest.skills['example-skill'] = {
      description: `Example skill for ${pluginName}`,
      handler: 'skills/example-skill/SKILL.md',
      triggers: ['example'],
      filePatterns: ['*.example', 'example.config.json']
    };
    await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
  }

  /**
   * Create sample command
   */
  async createSampleCommand(pluginPath: string, pluginName: string): Promise<void> {
    const commandContent = `# Example Command

This command demonstrates how to create commands in the ${pluginName} plugin.

## Usage

\`\`\`
/example [action]
\`\`\`

## Actions

- \`init\` - Initialize example
- \`run\` - Run example
- \`clean\` - Clean up example

## Implementation

When this command is invoked:

1. Parse the action parameter
2. Execute the appropriate action
3. Provide feedback to the user

## Examples

\`\`\`bash
# Initialize
/example init

# Run
/example run

# Clean
/example clean
\`\`\`

## Output

The command will:
- Create necessary files
- Execute the requested action
- Report success or failure
`;

    await fs.writeFile(
      path.join(pluginPath, 'commands', 'example.md'),
      commandContent
    );

    // Update manifest
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
    const manifest = await fs.readJSON(manifestPath);
    manifest.commands = manifest.commands || {};
    manifest.commands['/example'] = {
      description: 'Example command demonstrating plugin commands',
      handler: 'commands/example.md',
      examples: ['/example init', '/example run']
    };
    await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
  }

  /**
   * Create sample hook
   */
  async createSampleHook(pluginPath: string): Promise<void> {
    const hookContent = `#!/bin/bash
# Example Hook
# This hook runs on file write operations

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${GREEN}[Hook]\${NC} Example hook triggered"

# Example: Check file size
FILE_PATH="\$1"

if [ -f "\$FILE_PATH" ]; then
  FILE_SIZE=\$(stat -f%z "\$FILE_PATH" 2>/dev/null || stat -c%s "\$FILE_PATH" 2>/dev/null || echo "0")

  if [ "\$FILE_SIZE" -gt 1000000 ]; then
    echo -e "\${YELLOW}[Warning]\${NC} File is larger than 1MB: \$FILE_PATH"
  fi
fi

exit 0
`;

    const hookPath = path.join(pluginPath, 'hooks', 'scripts', 'example-hook.sh');
    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, '755');

    // Update manifest
    const manifestPath = path.join(pluginPath, '.claude-plugin', 'plugin.json');
    const manifest = await fs.readJSON(manifestPath);
    manifest.hooks = manifest.hooks || {};
    manifest.hooks['example-hook'] = {
      description: 'Example hook that checks file sizes',
      event: 'PostToolUse',
      toolPattern: '(Write|Edit)',
      filePattern: '.*',
      handler: 'hooks/scripts/example-hook.sh'
    };
    await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
  }

  /**
   * Create supporting files
   */
  async createSupportingFiles(pluginPath: string, options: ScaffoldOptions): Promise<void> {
    // Create README.md
    const readmeContent = this.createReadme(options);
    await fs.writeFile(path.join(pluginPath, 'README.md'), readmeContent);

    // Create .gitignore
    const gitignoreContent = `node_modules/
.DS_Store
*.log
.env
.env.local
dist/
*.cpkg
`;
    await fs.writeFile(path.join(pluginPath, '.gitignore'), gitignoreContent);

    // Create LICENSE
    if (options.license === 'MIT') {
      const licenseContent = this.createMITLicense(options.author || 'Your Name');
      await fs.writeFile(path.join(pluginPath, 'LICENSE'), licenseContent);
    }
  }

  /**
   * Create README content
   */
  private createReadme(options: ScaffoldOptions): string {
    return `# ${options.name}

${options.description || `A Claude Code ${options.type} plugin`}

## Installation

\`\`\`bash
# Install the plugin
claude-plugin install ${options.name}
\`\`\`

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

Describe how to use your plugin here.

## Development

\`\`\`bash
# Validate plugin structure
claude-plugin validate .

# Lint for best practices
claude-plugin lint .

# Build for distribution
claude-plugin build .
\`\`\`

## License

${options.license || 'MIT'}

## Author

${options.author || 'Your Name'}
`;
  }

  /**
   * Create MIT License
   */
  private createMITLicense(author: string): string {
    const year = new Date().getFullYear();
    return `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
  }

  /**
   * Initialize git repository
   */
  async initGit(pluginPath: string): Promise<void> {
    try {
      execSync('git init', { cwd: pluginPath, stdio: 'ignore' });
      execSync('git add .', { cwd: pluginPath, stdio: 'ignore' });
      execSync('git commit -m "Initial commit: Plugin scaffolded"', {
        cwd: pluginPath,
        stdio: 'ignore'
      });
    } catch (error) {
      // Git initialization is optional, don't fail if it errors
      console.warn(chalk.yellow('Warning: Git initialization failed'));
    }
  }
}

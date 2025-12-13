/**
 * MCP Generator
 * Main generator that creates MCP server files from parsed API definitions
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { ParsedAPI, GenerationOptions } from '../types.js';
import { generateMCPServerTemplate } from '../templates/mcp-server.template.js';

export class MCPGenerator {
  /**
   * Generate MCP server from parsed API
   */
  async generate(
    api: ParsedAPI,
    options: GenerationOptions
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      // Create output directory if it doesn't exist
      if (!existsSync(options.outputDir)) {
        mkdirSync(options.outputDir, { recursive: true });
      }

      // Generate main server file
      const serverCode = generateMCPServerTemplate(api);
      const serverPath = join(options.outputDir, 'index.ts');
      writeFileSync(serverPath, serverCode, 'utf-8');

      // Generate package.json
      const packageJson = this.generatePackageJson(options.serverName, api);
      const packagePath = join(options.outputDir, 'package.json');
      writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');

      // Generate tsconfig.json
      const tsConfig = this.generateTsConfig();
      const tsConfigPath = join(options.outputDir, 'tsconfig.json');
      writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2), 'utf-8');

      // Generate README
      const readme = this.generateReadme(options.serverName, api);
      const readmePath = join(options.outputDir, 'README.md');
      writeFileSync(readmePath, readme, 'utf-8');

      // Generate .env.example
      if (api.authentication && api.authentication.type !== 'none') {
        const envExample = this.generateEnvExample(api);
        const envPath = join(options.outputDir, '.env.example');
        writeFileSync(envPath, envExample, 'utf-8');
      }

      return {
        success: true,
        outputPath: options.outputDir,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate package.json for the MCP server
   */
  private generatePackageJson(
    serverName: string,
    api: ParsedAPI
  ): Record<string, unknown> {
    const dependencies: Record<string, string> = {
      '@modelcontextprotocol/sdk': '^0.5.0',
      'zod': '^4.1.12',
    };

    // Add fetch for OpenAPI servers
    if (api.metadata.source === 'openapi' && api.baseUrl) {
      dependencies['node-fetch'] = '^3.3.2';
    }

    // Add GraphQL client for GraphQL servers
    if (api.metadata.source === 'graphql') {
      dependencies['graphql'] = '^16.8.1';
      dependencies['graphql-request'] = '^6.1.0';
    }

    return {
      name: serverName,
      version: api.metadata.version,
      description: api.metadata.description || `MCP Server for ${api.metadata.title}`,
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        dev: 'tsx index.ts',
        start: 'node dist/index.js',
      },
      keywords: ['mcp', 'model-context-protocol', api.metadata.source],
      license: 'MIT',
      dependencies,
      devDependencies: {
        '@types/node': '^24.7.0',
        'typescript': '^5.9.3',
        'tsx': '^4.20.6',
      },
    };
  }

  /**
   * Generate tsconfig.json
   */
  private generateTsConfig(): Record<string, unknown> {
    return {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        lib: ['ES2022'],
        moduleResolution: 'node',
        outDir: './dist',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
      },
      include: ['*.ts'],
      exclude: ['node_modules', 'dist'],
    };
  }

  /**
   * Generate README.md
   */
  private generateReadme(serverName: string, api: ParsedAPI): string {
    const { metadata, authentication, baseUrl } = api;

    let readme = `# ${metadata.title} MCP Server

${metadata.description || ''}

**Version:** ${metadata.version}
**Source:** ${metadata.source.toUpperCase()}
${baseUrl ? `**Base URL:** ${baseUrl}\n` : ''}

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

### Running the Server

\`\`\`bash
npm start
\`\`\`

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

## Configuration

${authentication && authentication.type !== 'none' ? this.generateAuthDocumentation(authentication) : 'No authentication required.'}

## Available Tools

This MCP server provides the following tools:

`;

    for (const tool of api.tools) {
      readme += `### \`${tool.name}\`

${tool.description}

**Input Schema:**
\`\`\`json
${JSON.stringify(tool.inputSchema, null, 2)}
\`\`\`

`;
    }

    readme += `## Integration

Add this server to your Claude Code configuration:

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "command": "node",
      "args": ["${join(process.cwd(), 'dist/index.js')}"]
    }
  }
}
\`\`\`

## Generated with

This MCP server was automatically generated from a ${metadata.source.toUpperCase()} specification using the MCP Generator tool.
`;

    return readme;
  }

  /**
   * Generate authentication documentation
   */
  private generateAuthDocumentation(
    auth: NonNullable<ParsedAPI['authentication']>
  ): string {
    switch (auth.type) {
      case 'apiKey':
        return `### API Key Authentication

Set the following environment variable:

\`\`\`bash
export ${auth.envVar}="your-api-key-here"
\`\`\`

The API key will be sent as a ${auth.in} parameter named \`${auth.name}\`.`;

      case 'bearer':
        return `### Bearer Token Authentication

Set the following environment variable:

\`\`\`bash
export ${auth.envVar}="your-bearer-token-here"
\`\`\`

The token will be sent in the Authorization header.`;

      case 'basic':
        return `### Basic Authentication

Set the following environment variable with base64-encoded credentials:

\`\`\`bash
export ${auth.envVar}="base64-encoded-user:pass"
\`\`\``;

      case 'oauth2':
        return `### OAuth2 Authentication

Set the following environment variable with your OAuth token:

\`\`\`bash
export ${auth.envVar}="your-oauth-token-here"
\`\`\``;

      default:
        return 'Authentication type not documented.';
    }
  }

  /**
   * Generate .env.example file
   */
  private generateEnvExample(api: ParsedAPI): string {
    if (!api.authentication || api.authentication.type === 'none') {
      return '';
    }

    const { authentication } = api;
    let content = `# Environment variables for ${api.metadata.title}\n\n`;

    switch (authentication.type) {
      case 'apiKey':
        content += `# API Key for authentication\n${authentication.envVar}=your-api-key-here\n`;
        break;
      case 'bearer':
        content += `# Bearer token for authentication\n${authentication.envVar}=your-bearer-token-here\n`;
        break;
      case 'basic':
        content += `# Basic auth credentials (base64 encoded)\n${authentication.envVar}=base64-encoded-credentials\n`;
        break;
      case 'oauth2':
        content += `# OAuth2 token\n${authentication.envVar}=your-oauth-token-here\n`;
        break;
    }

    return content;
  }
}

/**
 * Convenience function to generate MCP server
 */
export async function generateMCPServer(
  api: ParsedAPI,
  options: GenerationOptions
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  const generator = new MCPGenerator();
  return generator.generate(api, options);
}

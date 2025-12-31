# API Explorer Agent

**Callsign:** Scout
**Model:** Haiku
**Specialization:** Interactive API exploration and endpoint discovery

## Purpose

Provides interactive API exploration, endpoint testing, request/response analysis, and developer tools for API integration discovery and debugging.

## Capabilities

- Interactive endpoint exploration
- Live request/response testing
- Schema validation and inspection
- Authentication testing
- Header analysis
- Response time monitoring
- cURL command generation
- Request history tracking
- API documentation navigation
- Endpoint comparison

## Inputs

- Parsed API schema
- API credentials
- Base URL configuration
- Request parameters

## Outputs

- Interactive CLI interface
- Request/response logs
- Performance metrics
- Generated code snippets
- Validation reports

## Generated Explorer Tools

### Interactive CLI Explorer
```typescript
import inquirer from 'inquirer';
import chalk from 'chalk';
import { StripeClient } from '../client';
import { ParsedSchema } from '../interfaces';

export class APIExplorer {
  constructor(
    private client: StripeClient,
    private schema: ParsedSchema
  ) {}

  /**
   * Start interactive exploration
   */
  async start(): Promise<void> {
    console.log(chalk.blue.bold('🔍 API Explorer'));
    console.log(chalk.gray('Explore and test API endpoints interactively\n'));

    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📋 List all endpoints', value: 'list' },
            { name: '🔎 Search endpoints', value: 'search' },
            { name: '🧪 Test an endpoint', value: 'test' },
            { name: '📊 View request history', value: 'history' },
            { name: '🔑 Test authentication', value: 'auth' },
            { name: '❌ Exit', value: 'exit' },
          ],
        },
      ]);

      if (action === 'exit') break;

      await this.handleAction(action);
    }
  }

  /**
   * List all endpoints
   */
  private async listEndpoints(): Promise<void> {
    console.log(chalk.bold('\n📋 Available Endpoints:\n'));

    const grouped = this.groupEndpointsByTag();

    for (const [tag, endpoints] of Object.entries(grouped)) {
      console.log(chalk.cyan.bold(`  ${tag}:`));
      for (const endpoint of endpoints) {
        const method = this.colorMethod(endpoint.method);
        console.log(`    ${method} ${endpoint.path}`);
        if (endpoint.summary) {
          console.log(chalk.gray(`      ${endpoint.summary}`));
        }
      }
      console.log('');
    }
  }

  /**
   * Test an endpoint interactively
   */
  private async testEndpoint(): Promise<void> {
    // Select endpoint
    const { endpoint } = await inquirer.prompt([
      {
        type: 'autocomplete',
        name: 'endpoint',
        message: 'Select an endpoint to test:',
        choices: this.schema.endpoints.map(e => ({
          name: `${e.method} ${e.path}`,
          value: e,
        })),
      },
    ]);

    // Collect parameters
    const params = await this.collectParameters(endpoint);

    // Execute request
    console.log(chalk.blue('\n⏳ Sending request...\n'));

    const startTime = Date.now();
    try {
      const response = await this.executeRequest(endpoint, params);
      const duration = Date.now() - startTime;

      // Display response
      this.displayResponse(response, duration);

      // Save to history
      this.saveToHistory(endpoint, params, response, duration);

      // Offer actions
      await this.postRequestActions(endpoint, params, response);

    } catch (error) {
      const duration = Date.now() - startTime;
      this.displayError(error, duration);
    }
  }

  /**
   * Collect parameters for endpoint
   */
  private async collectParameters(endpoint: APIEndpoint): Promise<any> {
    const params: any = {};

    // Path parameters
    const pathParams = endpoint.parameters?.filter(p => p.in === 'path') || [];
    for (const param of pathParams) {
      const { value } = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: `${param.name} (${param.schema.type})${param.required ? '*' : ''}:`,
          validate: (input) => {
            if (param.required && !input) {
              return 'This parameter is required';
            }
            return true;
          },
        },
      ]);
      params[param.name] = value;
    }

    // Query parameters
    const queryParams = endpoint.parameters?.filter(p => p.in === 'query') || [];
    if (queryParams.length > 0) {
      const { includeQuery } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'includeQuery',
          message: 'Add query parameters?',
          default: false,
        },
      ]);

      if (includeQuery) {
        for (const param of queryParams) {
          const { value } = await inquirer.prompt([
            {
              type: 'input',
              name: 'value',
              message: `${param.name} (${param.schema.type})${param.required ? '*' : ''}:`,
            },
          ]);
          if (value) {
            params[param.name] = value;
          }
        }
      }
    }

    // Request body
    if (endpoint.requestBody) {
      const { includeBody } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'includeBody',
          message: 'Add request body?',
          default: endpoint.requestBody.required,
        },
      ]);

      if (includeBody) {
        const { bodyMethod } = await inquirer.prompt([
          {
            type: 'list',
            name: 'bodyMethod',
            message: 'How would you like to provide the body?',
            choices: [
              { name: 'Interactive form', value: 'form' },
              { name: 'JSON input', value: 'json' },
              { name: 'Load from file', value: 'file' },
            ],
          },
        ]);

        if (bodyMethod === 'json') {
          const { json } = await inquirer.prompt([
            {
              type: 'editor',
              name: 'json',
              message: 'Enter request body JSON:',
            },
          ]);
          params.body = JSON.parse(json);
        }
      }
    }

    return params;
  }

  /**
   * Display response with syntax highlighting
   */
  private displayResponse(response: any, duration: number): void {
    console.log(chalk.green.bold('✅ Success\n'));
    console.log(chalk.gray(`Duration: ${duration}ms\n`));

    // Status code
    console.log(chalk.bold('Status:'), chalk.green(response.status));

    // Headers
    console.log(chalk.bold('\nHeaders:'));
    for (const [key, value] of Object.entries(response.headers)) {
      console.log(chalk.gray(`  ${key}:`), value);
    }

    // Body
    console.log(chalk.bold('\nResponse Body:'));
    console.log(this.syntaxHighlight(JSON.stringify(response.data, null, 2)));
  }

  /**
   * Generate cURL command
   */
  private generateCurlCommand(endpoint: APIEndpoint, params: any): string {
    let curl = `curl -X ${endpoint.method}`;

    // Add URL
    const url = this.buildUrl(endpoint.path, params);
    curl += ` "${url}"`;

    // Add headers
    curl += ` \\\n  -H "Content-Type: application/json"`;
    if (this.client.apiKey) {
      curl += ` \\\n  -H "Authorization: Bearer ${this.client.apiKey}"`;
    }

    // Add body
    if (params.body) {
      curl += ` \\\n  -d '${JSON.stringify(params.body)}'`;
    }

    return curl;
  }

  /**
   * Generate code snippet
   */
  private generateCodeSnippet(
    endpoint: APIEndpoint,
    params: any,
    language: 'typescript' | 'python' | 'curl'
  ): string {
    switch (language) {
      case 'typescript':
        return this.generateTypeScriptSnippet(endpoint, params);
      case 'python':
        return this.generatePythonSnippet(endpoint, params);
      case 'curl':
        return this.generateCurlCommand(endpoint, params);
    }
  }

  private generateTypeScriptSnippet(endpoint: APIEndpoint, params: any): string {
    const methodName = endpoint.operationId || endpoint.path.split('/').pop();

    return `
import { StripeClient } from './client';

const client = new StripeClient({
  apiKey: 'your_api_key',
});

const result = await client.${methodName}(${JSON.stringify(params, null, 2)});
console.log(result);
`.trim();
  }

  /**
   * Post-request actions
   */
  private async postRequestActions(
    endpoint: APIEndpoint,
    params: any,
    response: any
  ): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📋 Copy response', value: 'copy' },
          { name: '💻 Generate code snippet', value: 'code' },
          { name: '🔄 Retry with modifications', value: 'retry' },
          { name: '⬅️  Back to menu', value: 'back' },
        ],
      },
    ]);

    switch (action) {
      case 'code':
        await this.showCodeSnippet(endpoint, params);
        break;
      case 'retry':
        await this.testEndpoint();
        break;
    }
  }

  private async showCodeSnippet(endpoint: APIEndpoint, params: any): Promise<void> {
    const { language } = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Select language:',
        choices: [
          { name: 'TypeScript', value: 'typescript' },
          { name: 'Python', value: 'python' },
          { name: 'cURL', value: 'curl' },
        ],
      },
    ]);

    const snippet = this.generateCodeSnippet(endpoint, params, language);
    console.log('\n' + this.syntaxHighlight(snippet) + '\n');
  }

  /**
   * Syntax highlighting helpers
   */
  private syntaxHighlight(json: string): string {
    return json
      .replace(/"([^"]+)":/g, chalk.cyan('"$1":'))
      .replace(/: "([^"]+)"/g, `: ${chalk.yellow('"$1"')}`)
      .replace(/: (\d+)/g, `: ${chalk.magenta('$1')}`)
      .replace(/: (true|false)/g, `: ${chalk.blue('$1')}`);
  }

  private colorMethod(method: string): string {
    const colors = {
      GET: chalk.green,
      POST: chalk.blue,
      PUT: chalk.yellow,
      PATCH: chalk.cyan,
      DELETE: chalk.red,
    };
    return (colors[method] || chalk.white)(method.padEnd(6));
  }
}
```

### Usage
```typescript
import { APIExplorer } from './explorer';
import { StripeClient } from './client';
import { parseOpenAPISpec } from './parser';

// Load schema
const schema = await parseOpenAPISpec('./openapi.json');

// Create client
const client = new StripeClient({
  apiKey: process.env.STRIPE_API_KEY,
});

// Start explorer
const explorer = new APIExplorer(client, schema);
await explorer.start();
```

## Quality Standards

- Interactive and user-friendly CLI interface
- Real-time request/response display
- Syntax highlighting for readability
- Code snippet generation for multiple languages
- Request history tracking
- Performance metrics
- Error handling and display
- Authentication testing
- Export capabilities (cURL, code snippets)

/**
 * Template Engine - Handles template processing and variable substitution
 *
 * Uses Handlebars for powerful templating with:
 * - Variable substitution
 * - Conditional sections
 * - Loops and iteration
 * - Custom helpers for common patterns
 * - Partial/include support
 */

import Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import type { TemplateContext } from './types.js';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // String manipulation helpers
    this.handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());
    this.handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
    this.handlebars.registerHelper('capitalize', (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1)
    );
    this.handlebars.registerHelper('pascalCase', (str: string) =>
      str.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase())
    );
    this.handlebars.registerHelper('camelCase', (str: string) => {
      const pascal = str.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });
    this.handlebars.registerHelper('snakeCase', (str: string) =>
      str.replace(/-/g, '_').toLowerCase()
    );
    this.handlebars.registerHelper('kebabCase', (str: string) =>
      str.replace(/_/g, '-').toLowerCase()
    );

    // Date/time helpers
    this.handlebars.registerHelper('year', () => new Date().getFullYear());
    this.handlebars.registerHelper('date', (format?: string) => {
      const now = new Date();
      if (format === 'iso') {
        return now.toISOString();
      }
      return now.toLocaleDateString();
    });

    // Comparison helpers
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
    this.handlebars.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
    this.handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    this.handlebars.registerHelper('lt', (a: number, b: number) => a < b);
    this.handlebars.registerHelper('gte', (a: number, b: number) => a >= b);
    this.handlebars.registerHelper('lte', (a: number, b: number) => a <= b);

    // Logical helpers
    this.handlebars.registerHelper('and', (...args: unknown[]) => {
      // Last argument is Handlebars options object
      const values = args.slice(0, -1);
      return values.every(Boolean);
    });
    this.handlebars.registerHelper('or', (...args: unknown[]) => {
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });
    this.handlebars.registerHelper('not', (value: unknown) => !value);

    // Array helpers
    this.handlebars.registerHelper('join', (arr: unknown[], separator = ', ') =>
      Array.isArray(arr) ? arr.join(separator) : ''
    );
    this.handlebars.registerHelper('includes', (arr: unknown[], value: unknown) =>
      Array.isArray(arr) ? arr.includes(value) : false
    );
    this.handlebars.registerHelper('length', (arr: unknown[]) =>
      Array.isArray(arr) ? arr.length : 0
    );

    // JSON helpers
    this.handlebars.registerHelper('json', (obj: unknown, indent?: number) =>
      JSON.stringify(obj, null, indent || 2)
    );

    // Comment helper (strips content from output)
    this.handlebars.registerHelper('comment', () => '');

    // Indent helper
    this.handlebars.registerHelper('indent', (text: string, spaces = 2) => {
      const indent = ' '.repeat(spaces);
      return text.split('\n').map(line => indent + line).join('\n');
    });

    // License helper
    this.handlebars.registerHelper('license', (type: string) => {
      const licenses: Record<string, string> = {
        'MIT': 'MIT License - Copyright (c) {{year}} {{author}}',
        'Apache-2.0': 'Apache License 2.0',
        'GPL-3.0': 'GNU General Public License v3.0',
        'ISC': 'ISC License'
      };
      return licenses[type] || type;
    });
  }

  /**
   * Process a template string with context
   */
  processString(templateString: string, context: TemplateContext): string {
    try {
      const template = this.handlebars.compile(templateString);
      return template(this.buildContext(context));
    } catch (error) {
      throw new Error(`Template processing failed: ${error}`);
    }
  }

  /**
   * Process a template file with context
   */
  async processFile(templatePath: string, context: TemplateContext): Promise<string> {
    try {
      const templateContent = await readFile(templatePath, 'utf-8');
      return this.processString(templateContent, context);
    } catch (error) {
      throw new Error(`Failed to process template file ${templatePath}: ${error}`);
    }
  }

  /**
   * Process filename template (removes .hbs extension and processes variables)
   */
  processFilename(templateFilename: string, context: TemplateContext): string {
    // Remove .hbs extension if present
    let filename = templateFilename;
    if (filename.endsWith('.hbs')) {
      filename = filename.slice(0, -4);
    }

    // Process any template variables in filename
    return this.processString(filename, context);
  }

  /**
   * Register a partial template
   */
  registerPartial(name: string, template: string): void {
    this.handlebars.registerPartial(name, template);
  }

  /**
   * Load and register a partial from file
   */
  async loadPartial(name: string, path: string): Promise<void> {
    const content = await readFile(path, 'utf-8');
    this.registerPartial(name, content);
  }

  /**
   * Build complete context object for Handlebars
   */
  private buildContext(context: TemplateContext): Record<string, unknown> {
    return {
      ...context.variables,
      ...context.computed,
      env: context.env,
      // Helper functions available in templates
      helpers: {
        uppercase: (str: string) => str.toUpperCase(),
        lowercase: (str: string) => str.toLowerCase(),
        capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1)
      }
    };
  }

  /**
   * Validate template syntax without processing
   */
  validateTemplate(templateString: string): { valid: boolean; error?: string } {
    try {
      this.handlebars.compile(templateString);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Extract variables used in a template
   */
  extractVariables(templateString: string): string[] {
    const variables = new Set<string>();
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = variablePattern.exec(templateString)) !== null) {
      const expression = match[1].trim();
      // Extract the base variable name (before any dots or spaces)
      const varName = expression.split(/[\s.#/]/)[0];
      if (varName && !this.isHelper(varName)) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * Check if a name is a registered helper
   */
  private isHelper(name: string): boolean {
    const helpers = [
      'if', 'unless', 'each', 'with', 'lookup', 'log',
      'uppercase', 'lowercase', 'capitalize', 'pascalCase', 'camelCase',
      'snakeCase', 'kebabCase', 'year', 'date', 'eq', 'ne', 'gt', 'lt',
      'gte', 'lte', 'and', 'or', 'not', 'join', 'includes', 'length',
      'json', 'comment', 'indent', 'license'
    ];
    return helpers.includes(name);
  }

  /**
   * Create a context object with default values
   */
  createContext(
    variables: Record<string, unknown>,
    computed: Record<string, unknown> = {}
  ): TemplateContext {
    const now = new Date();

    return {
      variables,
      computed: {
        ...computed,
        // Auto-computed values
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        year: now.getFullYear()
      },
      env: {
        cwd: process.cwd(),
        user: process.env.USER || process.env.USERNAME || 'unknown',
        timestamp: now.toISOString(),
        date: now.toLocaleDateString()
      }
    };
  }
}

/**
 * Create a default template engine instance
 */
export function createTemplateEngine(): TemplateEngine {
  return new TemplateEngine();
}

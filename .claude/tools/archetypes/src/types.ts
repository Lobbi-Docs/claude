/**
 * Core type definitions for the archetype system
 */

/**
 * Variable types supported in archetype templates
 */
export type VariableType = 'string' | 'number' | 'boolean' | 'choice' | 'multi-choice' | 'path' | 'email' | 'url';

/**
 * Variable definition for template substitution
 */
export interface ArchetypeVariable {
  /** Variable identifier used in templates */
  name: string;

  /** Variable type determines validation and prompting behavior */
  type: VariableType;

  /** Human-readable prompt shown during interactive input */
  prompt: string;

  /** Default value if user doesn't provide input */
  default?: string | number | boolean | string[];

  /** Regex pattern for validation (string types only) */
  validation?: string;

  /** Available choices (for choice/multi-choice types) */
  choices?: string[];

  /** Help text explaining the variable purpose */
  description?: string;

  /** Whether this variable is required */
  required?: boolean;

  /** Conditional display based on other variable values */
  when?: (answers: Record<string, unknown>) => boolean;
}

/**
 * Metadata for an archetype
 */
export interface ArchetypeMetadata {
  /** Unique archetype identifier (kebab-case) */
  name: string;

  /** Semantic version (semver) */
  version: string;

  /** Short description of archetype purpose */
  description: string;

  /** Category for organization (integration, ui, workflow, etc.) */
  category: string;

  /** Author information */
  author?: string;

  /** License identifier */
  license?: string;

  /** Keywords for searchability */
  keywords?: string[];

  /** Variables used in templates */
  variables: ArchetypeVariable[];

  /** Other archetypes this one depends on */
  dependencies?: string[];

  /** File patterns to include when scaffolding */
  files: string[];

  /** File patterns to ignore */
  ignore?: string[];

  /** Homepage or documentation URL */
  homepage?: string;

  /** Repository URL */
  repository?: string;
}

/**
 * Archetype definition (metadata + file paths)
 */
export interface Archetype {
  /** Archetype metadata */
  metadata: ArchetypeMetadata;

  /** Absolute path to archetype root directory */
  path: string;

  /** README content */
  readme?: string;

  /** Template file paths (relative to archetype root) */
  templates: string[];

  /** Hook script paths */
  hooks?: {
    preGenerate?: string;
    postGenerate?: string;
  };
}

/**
 * Template context for variable substitution
 */
export interface TemplateContext {
  /** User-provided variable values */
  variables: Record<string, unknown>;

  /** Computed values (dates, derived values, etc.) */
  computed: Record<string, unknown>;

  /** Environment information */
  env: {
    cwd: string;
    user: string;
    timestamp: string;
    date: string;
  };
}

/**
 * Scaffolding options
 */
export interface ScaffoldOptions {
  /** Archetype to use */
  archetype: string;

  /** Output directory for generated plugin */
  outputDir: string;

  /** Variable values (non-interactive mode) */
  variables?: Record<string, unknown>;

  /** Skip interactive prompts */
  nonInteractive?: boolean;

  /** Overwrite existing files */
  force?: boolean;

  /** Dry run (don't write files) */
  dryRun?: boolean;

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: 'error' | 'warning';

  /** Error message */
  message: string;

  /** File path where error occurred */
  file?: string;

  /** Line number */
  line?: number;

  /** Suggested fix */
  fix?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationError[];
}

/**
 * Archetype search filters
 */
export interface ArchetypeSearchOptions {
  /** Category filter */
  category?: string;

  /** Keyword search */
  keyword?: string;

  /** Name pattern (regex) */
  pattern?: string;

  /** Sort order */
  sort?: 'name' | 'version' | 'category';
}

/**
 * Hook execution context
 */
export interface HookContext {
  /** Archetype being used */
  archetype: Archetype;

  /** Output directory */
  outputDir: string;

  /** Template context */
  context: TemplateContext;

  /** Generated file paths */
  files?: string[];
}

/**
 * Hook function signature
 */
export type HookFunction = (context: HookContext) => Promise<void> | void;

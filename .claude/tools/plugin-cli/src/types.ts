/**
 * Type definitions for Claude Code Plugin CLI
 */

export type PluginType = 'agent-pack' | 'skill-pack' | 'workflow-pack' | 'full';

export type ModelType = 'opus' | 'sonnet' | 'haiku';

export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'PreSkillActivation' | 'PostSkillActivation';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  keywords: string[];
  categories: string[];
  repository?: {
    type: string;
    url: string;
  };
  commands?: Record<string, CommandDefinition>;
  agents?: Record<string, AgentDefinition>;
  skills?: Record<string, SkillDefinition>;
  hooks?: Record<string, HookDefinition>;
  configuration?: PluginConfiguration;
  resources?: Record<string, any>;
}

export interface CommandDefinition {
  description: string;
  handler: string;
  aliases?: string[];
  examples?: string[];
}

export interface AgentDefinition {
  description: string;
  model: ModelType;
  handler: string;
  triggers?: string[];
  dependencies?: string[];
}

export interface SkillDefinition {
  description: string;
  handler: string;
  triggers?: string[];
  filePatterns?: string[];
}

export interface HookDefinition {
  description: string;
  event: HookEvent;
  toolPattern?: string;
  filePattern?: string;
  handler: string;
}

export interface PluginConfiguration {
  localConfig?: string;
  requiredEnvVars?: string[];
  optionalEnvVars?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error';
  code?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  severity: 'warning';
  code?: string;
}

export interface LintRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'agent' | 'skill' | 'command' | 'hook' | 'manifest';
  check: (plugin: Plugin) => LintResult[];
}

export interface LintResult {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  line?: number;
  suggestion?: string;
}

export interface DiagnosisResult {
  healthy: boolean;
  issues: DiagnosisIssue[];
  suggestions: string[];
}

export interface DiagnosisIssue {
  type: 'missing-file' | 'invalid-json' | 'circular-dependency' | 'missing-env-var' | 'hook-failure' | 'broken-reference';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  path?: string;
  fix?: string;
}

export interface Plugin {
  path: string;
  manifest: PluginManifest;
  agents: Map<string, AgentFile>;
  skills: Map<string, SkillFile>;
  commands: Map<string, CommandFile>;
  hooks: Map<string, HookFile>;
}

export interface AgentFile {
  name: string;
  path: string;
  content: string;
  frontmatter?: any;
}

export interface SkillFile {
  name: string;
  path: string;
  content: string;
  frontmatter?: any;
}

export interface CommandFile {
  name: string;
  path: string;
  content: string;
}

export interface HookFile {
  name: string;
  path: string;
  content: string;
  executable: boolean;
}

export interface ScaffoldOptions {
  name: string;
  type: PluginType;
  author?: string;
  description?: string;
  license?: string;
  initGit?: boolean;
  samples?: boolean;
}

export interface BundleOptions {
  output?: string;
  minify?: boolean;
  sourceMaps?: boolean;
  treeShake?: boolean;
}

export interface PublishOptions {
  registry?: string;
  tag?: string;
  access?: 'public' | 'private';
}

export interface TemplateContext {
  // Plugin metadata
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  license: string;
  keywords: string[];

  // Type flags
  pluginType: 'agent-pack' | 'skill-pack' | 'workflow-pack' | 'full';
  hasAgents: boolean;
  hasSkills: boolean;
  hasCommands: boolean;
  hasHooks: boolean;

  // Counts
  agentCount: number;
  skillCount: number;
  commandCount: number;
  hookCount: number;

  // Items
  agents: Array<{ id: string; name: string; file: string; description: string }>;
  skills: Array<{ id: string; name: string; file: string; description: string }>;
  commands: Array<{ id: string; name: string; file: string; description: string }>;
  hooks: Array<{ id: string; name: string; trigger: string; script: string }>;

  // Sample content
  agentName?: string;
  agentDescription?: string;
  skillName?: string;
  skillDescription?: string;
  commandName?: string;
  commandDescription?: string;
  hookName?: string;
  hookDescription?: string;
  hookTrigger?: string;

  // Computed values
  year: number;
  date: string;
  pluginName: string;
}

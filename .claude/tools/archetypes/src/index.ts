/**
 * Archetype System - Plugin template scaffolding system
 *
 * Main entry point for the archetype system, exporting all public APIs
 */

// Core types
export type {
  VariableType,
  ArchetypeVariable,
  ArchetypeMetadata,
  Archetype,
  TemplateContext,
  ScaffoldOptions,
  ValidationError,
  ValidationResult,
  ArchetypeSearchOptions,
  HookContext,
  HookFunction
} from './types.js';

// Registry
export {
  ArchetypeRegistry,
  createDefaultRegistry
} from './archetype-registry.js';

// Template engine
export {
  TemplateEngine,
  createTemplateEngine
} from './template-engine.js';

// Scaffolder
export {
  Scaffolder,
  createScaffolder
} from './scaffolder.js';

// Validator
export {
  ArchetypeValidator,
  createValidator
} from './validator.js';

/**
 * Quick-start API for common workflows
 */

import { createDefaultRegistry } from './archetype-registry.js';
import { createScaffolder } from './scaffolder.js';
import { createValidator } from './validator.js';
import type { ScaffoldOptions } from './types.js';

/**
 * Scaffold a plugin from an archetype (convenience function)
 */
export async function scaffold(options: ScaffoldOptions): Promise<string[]> {
  const registry = createDefaultRegistry();
  await registry.load();

  const scaffolder = createScaffolder(registry);
  return scaffolder.scaffold(options);
}

/**
 * List all available archetypes (convenience function)
 */
export async function listArchetypes(): Promise<string[]> {
  const registry = createDefaultRegistry();
  await registry.load();

  const archetypes = await registry.getAll();
  return archetypes.map(a => a.metadata.name);
}

/**
 * Validate an archetype (convenience function)
 */
export async function validateArchetype(path: string) {
  const validator = createValidator();
  return validator.validate(path);
}

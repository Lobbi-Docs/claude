/**
 * Codebase Onboarding Guide - Core TypeScript Interfaces
 *
 * Defines the data structures and contracts for the onboarding system
 */

// ============================================================================
// Core Domain Types
// ============================================================================

export interface CodebaseMetadata {
  name: string;
  description?: string;
  version?: string;
  repository?: string;
  language: string;
  primaryLanguages: string[];
  framework?: string;
  frameworks: string[];
  totalFiles: number;
  totalLines: number;
  lastAnalyzed: Date;
  architecturePattern?: ArchitecturePattern;
}

export type ArchitecturePattern =
  | 'mvc'
  | 'mvvm'
  | 'microservices'
  | 'monolith'
  | 'layered'
  | 'clean-architecture'
  | 'hexagonal'
  | 'event-driven'
  | 'serverless'
  | 'jamstack'
  | 'mixed';

export interface FileMetadata {
  path: string;
  relativePath: string;
  type: FileType;
  purpose: FilePurpose[];
  importanceScore: number; // 0-100
  linesOfCode: number;
  complexity?: number;
  dependencies: string[];
  dependents: string[];
  lastModified: Date;
  primaryAuthor?: string;
}

export type FileType =
  | 'source'
  | 'test'
  | 'config'
  | 'documentation'
  | 'asset'
  | 'schema'
  | 'script';

export type FilePurpose =
  | 'entry-point'
  | 'routing'
  | 'controller'
  | 'service'
  | 'model'
  | 'view'
  | 'component'
  | 'utility'
  | 'middleware'
  | 'config'
  | 'types'
  | 'constants'
  | 'api'
  | 'integration';

// ============================================================================
// Architecture Analysis
// ============================================================================

export interface ArchitectureOverview {
  pattern: ArchitecturePattern;
  layers: Layer[];
  components: Component[];
  externalDependencies: ExternalDependency[];
  diagram: DiagramDefinition;
  summary: string;
  keyCharacteristics: string[];
}

export interface Layer {
  name: string;
  description: string;
  directories: string[];
  responsibilities: string[];
  dependsOn: string[]; // other layer names
}

export interface Component {
  id: string;
  name: string;
  description: string;
  type: ComponentType;
  location: string;
  responsibilities: string[];
  interfaces: ComponentInterface[];
  dependencies: string[]; // component IDs
}

export type ComponentType =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'cache'
  | 'queue'
  | 'api-gateway'
  | 'service'
  | 'library'
  | 'external';

export interface ComponentInterface {
  type: 'api' | 'event' | 'function' | 'class';
  name: string;
  description: string;
  inputs?: InterfaceParameter[];
  outputs?: InterfaceParameter[];
}

export interface InterfaceParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface ExternalDependency {
  name: string;
  version?: string;
  purpose: string;
  category: 'runtime' | 'dev' | 'peer';
  documentation?: string;
}

// ============================================================================
// Navigation & Indexing
// ============================================================================

export interface NavigationIndex {
  features: FeatureMap[];
  filesByPurpose: Map<FilePurpose, FileMetadata[]>;
  entryPoints: EntryPoint[];
  mostImportantFiles: FileMetadata[];
  quickReference: QuickReference[];
}

export interface FeatureMap {
  featureName: string;
  description: string;
  files: string[];
  entryPoint: string;
  relatedFeatures: string[];
  keywords: string[];
}

export interface EntryPoint {
  name: string;
  path: string;
  type: 'application' | 'api' | 'cli' | 'worker' | 'test';
  description: string;
  startsWhat: string;
}

export interface QuickReference {
  question: string;
  answer: string;
  files: string[];
  codeExample?: string;
}

// ============================================================================
// Code Flow & Execution
// ============================================================================

export interface CodeFlow {
  name: string;
  description: string;
  trigger: string;
  flowType: FlowType;
  steps: FlowStep[];
  diagram: DiagramDefinition;
  dataTransformations: DataTransformation[];
  errorHandling: ErrorHandlingStrategy[];
}

export type FlowType =
  | 'request-response'
  | 'data-processing'
  | 'event-handling'
  | 'lifecycle'
  | 'background-job';

export interface FlowStep {
  order: number;
  component: string;
  file: string;
  function?: string;
  description: string;
  inputData?: string;
  outputData?: string;
  sideEffects?: string[];
  canFail?: boolean;
}

export interface DataTransformation {
  stage: string;
  from: DataShape;
  to: DataShape;
  transformedBy: string; // function/method name
  location: string; // file path
}

export interface DataShape {
  type: string;
  structure?: object;
  example?: any;
}

export interface ErrorHandlingStrategy {
  location: string;
  errorType: string;
  handling: 'catch' | 'throw' | 'log' | 'retry' | 'fallback';
  description: string;
}

// ============================================================================
// API Documentation
// ============================================================================

export interface APIReference {
  endpoints: APIEndpoint[];
  authentication: AuthenticationStrategy;
  commonPatterns: APIPattern[];
  versioning?: VersioningStrategy;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  handler: string; // file path
  authentication?: string[];
  request?: RequestSpec;
  response?: ResponseSpec;
  errors?: ErrorResponse[];
  example?: EndpointExample;
}

export interface RequestSpec {
  params?: InterfaceParameter[];
  query?: InterfaceParameter[];
  body?: InterfaceParameter[];
  headers?: InterfaceParameter[];
}

export interface ResponseSpec {
  status: number;
  body?: object;
  headers?: Record<string, string>;
}

export interface ErrorResponse {
  status: number;
  code?: string;
  description: string;
}

export interface EndpointExample {
  request: string;
  response: string;
  description?: string;
}

export interface AuthenticationStrategy {
  type: 'jwt' | 'oauth2' | 'api-key' | 'session' | 'none' | 'multiple';
  description: string;
  implementation: string; // file path
  howToUse: string;
}

export interface APIPattern {
  name: string;
  description: string;
  usedIn: string[];
  example: string;
}

export type VersioningStrategy =
  | 'url-path'
  | 'header'
  | 'query-param'
  | 'none';

// ============================================================================
// Data Models
// ============================================================================

export interface DataModelCatalog {
  entities: Entity[];
  relationships: Relationship[];
  diagram: DiagramDefinition;
  validationRules: ValidationRule[];
}

export interface Entity {
  name: string;
  description: string;
  location: string; // file path
  fields: Field[];
  methods?: Method[];
  indexes?: string[];
  constraints?: string[];
}

export interface Field {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: string[];
  references?: string; // entity name if foreign key
}

export interface Method {
  name: string;
  description: string;
  parameters?: InterfaceParameter[];
  returns?: string;
}

export interface Relationship {
  from: string; // entity name
  to: string; // entity name
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  description: string;
}

export interface ValidationRule {
  entity: string;
  field: string;
  rule: string;
  message?: string;
}

// ============================================================================
// Glossary & Terminology
// ============================================================================

export interface Glossary {
  terms: GlossaryTerm[];
  acronyms: Acronym[];
  domainConcepts: DomainConcept[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  category: 'technical' | 'business' | 'domain';
  relatedTerms: string[];
  usedIn: string[]; // file paths
  examples?: string[];
}

export interface Acronym {
  acronym: string;
  fullForm: string;
  description?: string;
}

export interface DomainConcept {
  name: string;
  description: string;
  mappedTo: string[]; // code entities
  relatedConcepts: string[];
}

// ============================================================================
// Patterns & Conventions
// ============================================================================

export interface CodingPatterns {
  namingConventions: NamingConvention[];
  codePatterns: CodePattern[];
  bestPractices: BestPractice[];
  antiPatterns: AntiPattern[];
}

export interface NamingConvention {
  applies: 'file' | 'class' | 'function' | 'variable' | 'constant';
  pattern: string;
  description: string;
  examples: string[];
}

export interface CodePattern {
  name: string;
  category: string;
  description: string;
  structure: string;
  when: string;
  examples: CodeExample[];
  usageCount: number;
}

export interface CodeExample {
  file: string;
  code: string;
  explanation: string;
}

export interface BestPractice {
  title: string;
  description: string;
  rationale: string;
  examples: string[];
}

export interface AntiPattern {
  name: string;
  description: string;
  whyBad: string;
  betterApproach: string;
}

// ============================================================================
// Tutorials & How-To Guides
// ============================================================================

export interface TutorialCatalog {
  tutorials: Tutorial[];
  templates: CodeTemplate[];
  workflows: DevelopmentWorkflow[];
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  prerequisites: string[];
  steps: TutorialStep[];
  relatedTutorials: string[];
}

export interface TutorialStep {
  order: number;
  title: string;
  description: string;
  codeBlock?: string;
  filePath?: string;
  tips?: string[];
  commonIssues?: string[];
}

export interface CodeTemplate {
  name: string;
  description: string;
  language: string;
  template: string;
  placeholders: TemplatePlaceholder[];
  usage: string;
}

export interface TemplatePlaceholder {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

export interface DevelopmentWorkflow {
  name: string;
  description: string;
  steps: string[];
  tools: string[];
  checkpoints: string[];
}

// ============================================================================
// Diagrams
// ============================================================================

export interface DiagramDefinition {
  type: DiagramType;
  format: DiagramFormat;
  title: string;
  content: string;
  description?: string;
}

export type DiagramType =
  | 'architecture'
  | 'component'
  | 'sequence'
  | 'data-flow'
  | 'entity-relationship'
  | 'state-machine'
  | 'deployment';

export type DiagramFormat =
  | 'mermaid'
  | 'plantuml'
  | 'ascii'
  | 'svg';

// ============================================================================
// Onboarding Guide Output
// ============================================================================

export interface OnboardingGuide {
  metadata: CodebaseMetadata;
  generatedAt: Date;
  sections: OnboardingSection[];
  quickStart: QuickStartGuide;
  learningPath: LearningPath;
  resources: Resource[];
}

export interface OnboardingSection {
  id: string;
  title: string;
  order: number;
  content: string;
  subsections?: OnboardingSection[];
  diagrams?: DiagramDefinition[];
  codeExamples?: CodeExample[];
}

export interface QuickStartGuide {
  title: string;
  prerequisites: string[];
  setupSteps: string[];
  firstTaskSuggestions: string[];
  helpfulCommands: Command[];
}

export interface Command {
  command: string;
  description: string;
  example?: string;
}

export interface LearningPath {
  title: string;
  description: string;
  phases: LearningPhase[];
  estimatedTotalTime: string;
}

export interface LearningPhase {
  order: number;
  name: string;
  description: string;
  goals: string[];
  resources: string[];
  tasks: string[];
  estimatedTime: string;
  completionCriteria: string[];
}

export interface Resource {
  type: 'documentation' | 'video' | 'article' | 'repository' | 'tool';
  title: string;
  url?: string;
  description: string;
  relevance: 'essential' | 'recommended' | 'optional';
}

// ============================================================================
// Agent Communication
// ============================================================================

export interface AgentReport {
  agentId: string;
  agentName: string;
  timestamp: Date;
  phase: string;
  status: 'success' | 'partial' | 'failed';
  findings: any; // Specific to each agent
  outputs: OutputFile[];
  nextSteps?: string[];
  blockers?: string[];
}

export interface OutputFile {
  path: string;
  type: string;
  description: string;
  size?: number;
}

export interface OnboardingRequest {
  type: 'full' | 'quick' | 'feature' | 'architecture' | 'api';
  codebasePath: string;
  focus?: string[]; // Specific areas to focus on
  depth: 'quick' | 'standard' | 'comprehensive';
  outputPath: string;
  options?: OnboardingOptions;
}

export interface OnboardingOptions {
  includeDiagrams?: boolean;
  includeExamples?: boolean;
  generateTutorials?: boolean;
  frameworks?: string[];
  excludePaths?: string[];
  maxFiles?: number;
}

export interface OnboardingResult {
  success: boolean;
  guide: OnboardingGuide;
  outputs: OutputFile[];
  metrics: OnboardingMetrics;
  errors?: string[];
  warnings?: string[];
}

export interface OnboardingMetrics {
  filesAnalyzed: number;
  diagramsGenerated: number;
  tutorialsCreated: number;
  glossaryTerms: number;
  processingTime: number; // milliseconds
  agentsUsed: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface PluginConfiguration {
  analysisDepth: 'quick' | 'standard' | 'comprehensive';
  includeExamples: boolean;
  generateDiagrams: boolean;
  focusAreas: string[];
  outputLocation: string;
  updateFrequency: 'on-demand' | 'weekly' | 'on-major-changes';
  excludePatterns: string[];
  maxFilesPerCategory: number;
  diagramFormats: DiagramFormat[];
}

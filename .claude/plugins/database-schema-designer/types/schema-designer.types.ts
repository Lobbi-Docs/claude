/**
 * Database Schema Designer - Core Type Definitions
 * Production-grade types for schema design, optimization, and migration
 */

// ==================== Schema Design ====================

export interface Entity {
  name: string;
  tableName: string;
  description?: string;
  fields: Field[];
  indexes: Index[];
  constraints: Constraint[];
  relationships: Relationship[];
  metadata: EntityMetadata;
}

export interface Field {
  name: string;
  type: DataType;
  nullable: boolean;
  default?: string | number | boolean | null;
  unique?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  description?: string;
  validation?: FieldValidation;
  metadata?: FieldMetadata;
}

export interface DataType {
  base:
    | 'string' | 'text' | 'char' | 'varchar'
    | 'int' | 'bigint' | 'smallint' | 'decimal' | 'float'
    | 'boolean' | 'date' | 'datetime' | 'timestamp' | 'timestamptz'
    | 'json' | 'jsonb' | 'uuid' | 'enum' | 'array';
  length?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  arrayOf?: DataType;
  dbSpecific?: string; // For database-specific types like GEOGRAPHY
}

export interface Index {
  name: string;
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'brin' | 'composite' | 'partial' | 'covering';
  fields: string[];
  unique?: boolean;
  where?: string; // For partial indexes
  include?: string[]; // For covering indexes
  method?: string; // Database-specific method
  metadata: IndexMetadata;
}

export interface IndexMetadata {
  estimatedSize?: string;
  estimatedBuildTime?: string;
  writeOverhead: 'low' | 'medium' | 'high';
  selectivity: number; // 0-1, how selective the index is
  usageFrequency?: 'rare' | 'occasional' | 'frequent' | 'critical';
  queryPatterns: string[]; // Queries this index optimizes
}

export interface Constraint {
  name: string;
  type: 'primary-key' | 'foreign-key' | 'unique' | 'check' | 'not-null';
  fields: string[];
  references?: {
    table: string;
    fields: string[];
    onDelete: 'cascade' | 'set-null' | 'restrict' | 'no-action';
    onUpdate: 'cascade' | 'set-null' | 'restrict' | 'no-action';
  };
  check?: string; // SQL expression for CHECK constraints
}

export interface Relationship {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  targetEntity: string;
  foreignKey?: string;
  inverseSide?: string;
  joinTable?: {
    name: string;
    joinColumn: string;
    inverseJoinColumn: string;
  };
  eager?: boolean; // Load relationship by default
  cascade?: ('insert' | 'update' | 'delete')[];
}

export interface EntityMetadata {
  tableName: string;
  schema?: string;
  estimatedRows?: number;
  estimatedSize?: string;
  accessPattern: 'read-heavy' | 'write-heavy' | 'balanced';
  normalizationLevel: '1NF' | '2NF' | '3NF' | 'BCNF' | 'denormalized';
  performanceNotes?: string[];
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
}

export interface FieldMetadata {
  sensitive?: boolean; // PII, requires encryption
  indexed?: boolean;
  searchable?: boolean; // Full-text search
  generated?: {
    type: 'stored' | 'virtual';
    expression: string;
  };
}

// ==================== Query Analysis ====================

export interface QueryAnalysis {
  query: string;
  queryType: 'select' | 'insert' | 'update' | 'delete';
  tables: string[];
  executionPlan: ExecutionPlan;
  performance: QueryPerformance;
  issues: QueryIssue[];
  suggestions: QuerySuggestion[];
  n1Detection?: N1Detection;
}

export interface ExecutionPlan {
  raw: string; // Raw EXPLAIN output
  nodes: ExecutionNode[];
  totalCost: number;
  totalRows: number;
}

export interface ExecutionNode {
  nodeType: string;
  relation?: string;
  alias?: string;
  scanType: 'seq-scan' | 'index-scan' | 'bitmap-scan' | 'index-only-scan';
  cost: {
    startup: number;
    total: number;
  };
  rows: number;
  width: number;
  filter?: string;
  joinType?: 'nested-loop' | 'hash-join' | 'merge-join';
  children?: ExecutionNode[];
}

export interface QueryPerformance {
  executionTime: number; // milliseconds
  planningTime: number; // milliseconds
  rowsReturned: number;
  rowsScanned: number;
  bufferHits: number;
  bufferMisses: number;
  ioTime?: number;
  severity: 'optimal' | 'good' | 'warning' | 'critical';
}

export interface QueryIssue {
  type:
    | 'seq-scan' | 'missing-index' | 'n+1-query' | 'large-offset'
    | 'select-star' | 'implicit-conversion' | 'unnecessary-join'
    | 'cartesian-product' | 'inefficient-subquery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  location?: {
    line: number;
    column: number;
  };
  impact: {
    performance: 'low' | 'medium' | 'high';
    scalability: 'low' | 'medium' | 'high';
  };
}

export interface QuerySuggestion {
  type: 'add-index' | 'rewrite-query' | 'add-eager-loading' | 'use-projection' | 'paginate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  example?: string;
  estimatedImprovement: string; // e.g., "10x faster", "90% reduction"
  implementation: string; // How to implement the suggestion
}

export interface N1Detection {
  detected: boolean;
  location: string;
  pattern: string;
  queries: {
    parent: string;
    repeated: string;
    count: number;
  };
  solution: {
    strategy: 'eager-loading' | 'select-n1' | 'dataloader' | 'batch-loading';
    code: string;
    explanation: string;
  };
}

// ==================== Migration Planning ====================

export interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  database: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  orm: 'prisma' | 'typeorm' | 'sequelize' | 'knex' | 'mongoose' | 'alembic';
  version: string;
  strategy: MigrationStrategy;
  operations: MigrationOperation[];
  dependencies: string[]; // Previous migration IDs
  estimatedDuration: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackPlan: RollbackPlan;
  validation: ValidationChecks;
  metadata: MigrationMetadata;
}

export interface MigrationStrategy {
  type: 'simple' | 'zero-downtime' | 'backward-compatible' | 'data-migration';
  zeroDowntime?: ZeroDowntimeStrategy;
  backwardCompatible: boolean;
  requiresDowntime: boolean;
  estimatedDowntime?: string;
}

export interface ZeroDowntimeStrategy {
  pattern: 'expand-contract' | 'dual-write' | 'shadow-column' | 'feature-flag';
  phases: MigrationPhase[];
  dualWritePeriod?: string; // How long to maintain dual writes
  rolloutStrategy: 'immediate' | 'gradual' | 'canary' | 'blue-green';
}

export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  operations: MigrationOperation[];
  validations: string[];
  rollbackSteps: string[];
  estimatedDuration: string;
  dependencies?: string[];
}

export interface MigrationOperation {
  type:
    | 'create-table' | 'drop-table' | 'rename-table'
    | 'add-column' | 'drop-column' | 'rename-column' | 'alter-column'
    | 'add-index' | 'drop-index'
    | 'add-constraint' | 'drop-constraint'
    | 'raw-sql' | 'data-migration';
  table: string;
  details: Record<string, any>;
  reversible: boolean;
  safe: boolean; // Can be applied without data loss
  backward_compatible: boolean;
  estimatedImpact: {
    lockType: 'none' | 'share' | 'exclusive';
    lockDuration: string;
    dataLoss: 'none' | 'potential' | 'certain';
    downtime: 'none' | 'minimal' | 'significant';
  };
}

export interface RollbackPlan {
  automatic: boolean;
  steps: RollbackStep[];
  dataRecovery?: {
    required: boolean;
    strategy: 'backup-restore' | 'undo-sql' | 'manual';
    backupLocation?: string;
  };
  validation: string[];
}

export interface RollbackStep {
  order: number;
  description: string;
  sql: string;
  validation?: string;
  manual: boolean;
}

export interface ValidationChecks {
  pre: ValidationCheck[];
  post: ValidationCheck[];
  dataIntegrity: DataIntegrityCheck[];
}

export interface ValidationCheck {
  name: string;
  type: 'sql' | 'script' | 'manual';
  check: string;
  expected: any;
  critical: boolean;
}

export interface DataIntegrityCheck {
  name: string;
  table: string;
  check: string;
  expectation: string;
  failureAction: 'abort' | 'warn' | 'log';
}

export interface MigrationMetadata {
  author: string;
  createdAt: string;
  appliedAt?: string;
  executionTime?: number;
  environment?: 'development' | 'staging' | 'production';
  jiraTicket?: string;
  prNumber?: number;
  approvedBy?: string[];
}

// ==================== Seed Data Generation ====================

export interface SeedDataConfig {
  entities: EntitySeedConfig[];
  relationships: RelationshipSeedConfig[];
  locale: string;
  seed?: number; // For reproducible data
  strategy: 'realistic' | 'edge-cases' | 'performance-testing' | 'minimal';
}

export interface EntitySeedConfig {
  entity: string;
  count: number;
  fields: FieldSeedConfig[];
  factory?: string; // Name of factory function
}

export interface FieldSeedConfig {
  field: string;
  generator:
    | 'faker' | 'sequence' | 'random' | 'fixed' | 'custom' | 'reference';
  options?: Record<string, any>;
}

export interface RelationshipSeedConfig {
  relationship: string;
  strategy: 'random' | 'sequential' | 'realistic' | 'custom';
  distribution?: {
    min: number;
    max: number;
    avg: number;
  };
}

// ==================== ERD Generation ====================

export interface ERDConfig {
  format: 'mermaid' | 'plantuml' | 'dbdiagram' | 'graphviz';
  entities: string[]; // Empty for all entities
  includeFields: boolean;
  includeIndexes: boolean;
  includeConstraints: boolean;
  grouping?: 'module' | 'domain' | 'none';
  layout?: 'horizontal' | 'vertical' | 'auto';
}

export interface ERDOutput {
  format: string;
  content: string;
  url?: string; // For online renderers like dbdiagram.io
  metadata: {
    entityCount: number;
    relationshipCount: number;
    generatedAt: string;
  };
}

// ==================== Schema Comparison ====================

export interface SchemaComparison {
  source: string;
  target: string;
  differences: SchemaDifference[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    compatibility: 'backward-compatible' | 'breaking' | 'forward-compatible';
  };
  suggestedMigrations: MigrationPlan[];
}

export interface SchemaDifference {
  type: 'entity' | 'field' | 'index' | 'constraint' | 'relationship';
  changeType: 'added' | 'removed' | 'modified';
  path: string; // e.g., "User.email" or "Post.indexes.idx_title"
  before?: any;
  after?: any;
  impact: {
    breaking: boolean;
    dataLoss: boolean;
    performanceImpact: 'none' | 'positive' | 'negative';
  };
}

// ==================== Configuration ====================

export interface PluginConfig {
  database: DatabaseConfig;
  optimization: OptimizationConfig;
  migrations: MigrationConfig;
  validation: ValidationConfig;
}

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'sqlite' | 'mongodb' | 'dynamodb';
  orm: 'prisma' | 'typeorm' | 'sequelize' | 'knex' | 'mongoose' | 'drizzle';
  version?: string;
  schema?: string; // Default schema
}

export interface OptimizationConfig {
  slowQueryThreshold: number; // milliseconds
  enableN1Detection: boolean;
  autoSuggestIndexes: boolean;
  indexingStrategy: {
    foreignKeys: boolean;
    compositeIndexes: boolean;
    partialIndexes: boolean;
    coveringIndexes: boolean;
  };
}

export interface MigrationConfig {
  requireZeroDowntime: boolean;
  requireBackwardCompatible: boolean;
  autoGenerateSeed: boolean;
  autoGenerateERD: boolean;
  migrationPath: string;
  seedPath: string;
}

export interface ValidationConfig {
  requireForeignKeys: boolean;
  requireIndexesOnForeignKeys: boolean;
  warnOnMissingIndexes: boolean;
  enforcementLevel: 'strict' | 'warn' | 'off';
}

// ==================== Agent Communication ====================

export interface SchemaDesignRequest {
  feature: string;
  requirements: string[];
  existingSchema?: Entity[];
  constraints?: {
    performance?: string[];
    compliance?: string[];
    business?: string[];
  };
}

export interface SchemaDesignResponse {
  entities: Entity[];
  relationships: Relationship[];
  migrations: MigrationPlan[];
  erd: ERDOutput;
  recommendations: Recommendation[];
}

export interface Recommendation {
  type: 'performance' | 'security' | 'maintainability' | 'scalability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation?: string;
  tradeoffs?: string[];
}

/**
 * Customer Data Migration Orchestrator - Core Type Definitions
 * Production-grade types for data migration, transformation, and validation
 */

// ============================================================================
// MIGRATION PROJECT
// ============================================================================

/**
 * Top-level migration project containing all configuration and state
 */
export interface MigrationProject {
  id: string;
  name: string;
  description: string;
  customerId: string;
  customerName: string;

  // Project configuration
  config: MigrationConfig;

  // Data sources (can have multiple)
  sources: DataSource[];

  // Target system configuration
  target: TargetSystem;

  // Field mappings per source
  mappings: FieldMappingSet[];

  // Validation rules
  validationRules: ValidationRuleSet;

  // Transformation rules
  transformations: TransformationRuleSet;

  // Current status
  status: MigrationStatus;

  // Execution history
  executions: MigrationExecution[];

  // Audit trail
  auditLog: AuditLog[];

  // Metadata
  metadata: ProjectMetadata;
}

export interface MigrationConfig {
  // Execution settings
  dryRunFirst: boolean;
  batchSize: number;
  parallelBatches: number;
  maxRetries: number;
  retryDelayMs: number;

  // Behavior settings
  stopOnFirstError: boolean;
  skipDuplicates: boolean;
  updateExisting: boolean;
  preserveOriginalIds: boolean;

  // Validation settings
  validateBeforeImport: boolean;
  blockOnValidationErrors: boolean;
  allowPartialImport: boolean;

  // Audit settings
  enableAuditLogging: boolean;
  auditLogLevel: 'minimal' | 'standard' | 'verbose';

  // Data quality settings
  duplicateDetection: {
    enabled: boolean;
    strategy: 'exact' | 'fuzzy' | 'both';
    threshold: number;
    mergeStrategy: 'keep-first' | 'keep-last' | 'merge' | 'manual';
  };

  // Customer-specific rules
  customerRules: CustomerSpecificRule[];
}

export interface CustomerSpecificRule {
  id: string;
  name: string;
  description: string;
  type: 'transformation' | 'validation' | 'filter' | 'default';
  condition?: string;  // Expression to determine when rule applies
  action: string;      // Expression or function to execute
  priority: number;
}

export interface ProjectMetadata {
  createdAt: string;
  createdBy: string;
  lastModifiedAt: string;
  lastModifiedBy: string;
  version: number;
  tags: string[];
  notes: string;
  jiraTicket?: string;
  estimatedRecords?: number;
  actualRecords?: number;
}

// ============================================================================
// DATA SOURCE
// ============================================================================

export type DataSourceType =
  | 'csv'
  | 'excel'
  | 'json'
  | 'jsonl'
  | 'xml'
  | 'parquet'
  | 'postgresql'
  | 'mysql'
  | 'sqlserver'
  | 'oracle'
  | 'sqlite'
  | 'mongodb'
  | 'salesforce'
  | 'hubspot'
  | 'rest-api'
  | 'graphql-api';

export interface DataSource {
  id: string;
  name: string;
  description?: string;
  type: DataSourceType;

  // Connection/access info
  connection: DataSourceConnection;

  // Detected or configured schema
  schema: SourceSchema;

  // Sample data for preview
  sampleData: SampleData;

  // Statistics
  statistics: SourceStatistics;

  // Processing state
  state: DataSourceState;
}

export type DataSourceConnection =
  | FileConnection
  | DatabaseConnection
  | ApiConnection
  | SaaSConnection;

export interface FileConnection {
  type: 'file';
  filePath: string;
  encoding: string;
  fileSize: number;
  lastModified: string;

  // CSV/TSV specific
  delimiter?: string;
  quoteChar?: string;
  escapeChar?: string;
  hasHeader?: boolean;
  skipRows?: number;

  // Excel specific
  sheetName?: string;
  sheetIndex?: number;
  range?: string;
}

export interface DatabaseConnection {
  type: 'database';
  host: string;
  port: number;
  database: string;
  schema?: string;
  username: string;
  password?: string;  // Stored securely, not in config
  ssl: boolean;
  sslCert?: string;

  // Query configuration
  tables?: string[];
  query?: string;
  incrementalColumn?: string;
  lastSyncValue?: string | number;
}

export interface ApiConnection {
  type: 'api';
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST';
  authentication: ApiAuthentication;

  // Pagination
  pagination: {
    type: 'offset' | 'cursor' | 'page' | 'link-header';
    pageSize: number;
    pageParam?: string;
    offsetParam?: string;
    cursorPath?: string;
    hasMorePath?: string;
  };

  // Data extraction
  dataPath: string;  // JSONPath to data array

  // Rate limiting
  rateLimit?: {
    requestsPerSecond: number;
    retryAfterHeader?: string;
  };
}

export interface SaaSConnection {
  type: 'saas';
  platform: 'salesforce' | 'hubspot' | 'pipedrive' | 'zendesk' | 'intercom' | 'stripe';
  instanceUrl?: string;
  authentication: ApiAuthentication;
  objects: string[];  // e.g., ['Contact', 'Account', 'Opportunity']
  query?: string;     // SOQL for Salesforce, etc.
}

export interface ApiAuthentication {
  type: 'oauth2' | 'api-key' | 'basic' | 'bearer';

  // OAuth2
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  accessToken?: string;
  refreshToken?: string;

  // API Key
  apiKey?: string;
  apiKeyHeader?: string;

  // Basic Auth
  username?: string;
  password?: string;

  // Bearer Token
  bearerToken?: string;
}

// ============================================================================
// SOURCE SCHEMA
// ============================================================================

export interface SourceSchema {
  name: string;
  tables: SourceTable[];
  relationships: SourceRelationship[];
  detectedAt: string;
  detectionMethod: 'auto' | 'manual' | 'hybrid';
  confidence: number;
}

export interface SourceTable {
  name: string;
  displayName?: string;
  description?: string;
  fields: SourceField[];
  primaryKey?: string[];
  estimatedRowCount: number;
  sampleRowCount: number;
}

export interface SourceField {
  name: string;
  displayName?: string;
  description?: string;

  // Detected type info
  detectedType: DetectedDataType;

  // Statistics from sampling
  statistics: FieldStatistics;

  // Sample values
  sampleValues: any[];

  // Detection metadata
  detection: {
    confidence: number;
    alternativeTypes: DetectedDataType[];
    warnings: string[];
  };
}

export interface DetectedDataType {
  base: 'string' | 'number' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'timestamp' | 'json' | 'array' | 'null' | 'mixed';

  // String specifics
  maxLength?: number;
  pattern?: string;  // Detected regex pattern (email, phone, etc.)
  semanticType?: SemanticType;

  // Number specifics
  precision?: number;
  scale?: number;
  min?: number;
  max?: number;

  // Date specifics
  format?: string;  // e.g., 'YYYY-MM-DD', 'MM/DD/YYYY'
  timezone?: string;

  // Enum detection
  enumValues?: string[];
  isLikelyEnum?: boolean;
}

export type SemanticType =
  | 'email'
  | 'phone'
  | 'url'
  | 'uuid'
  | 'ssn'
  | 'credit-card'
  | 'currency'
  | 'percentage'
  | 'address'
  | 'city'
  | 'state'
  | 'country'
  | 'postal-code'
  | 'first-name'
  | 'last-name'
  | 'full-name'
  | 'company-name'
  | 'ip-address'
  | 'latitude'
  | 'longitude';

export interface FieldStatistics {
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  nullPercentage: number;
  uniquePercentage: number;

  // For strings
  minLength?: number;
  maxLength?: number;
  avgLength?: number;

  // For numbers
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  stdDev?: number;

  // For dates
  minDate?: string;
  maxDate?: string;

  // Pattern analysis
  patternDistribution?: { pattern: string; count: number; percentage: number }[];
}

export interface SourceRelationship {
  id: string;
  name: string;
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  confidence: number;
  detectionMethod: 'naming-convention' | 'data-analysis' | 'explicit' | 'manual';
}

export interface SampleData {
  table: string;
  columns: string[];
  rows: any[][];
  rowCount: number;
  sampledAt: string;
}

export interface SourceStatistics {
  totalTables: number;
  totalFields: number;
  totalRows: number;
  estimatedSize: string;
  analyzedAt: string;
  analysisTime: number;  // milliseconds
}

export interface DataSourceState {
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  error?: string;
  lastAnalyzedAt?: string;
  rowsProcessed?: number;
  checkpointId?: string;
}

// ============================================================================
// TARGET SYSTEM
// ============================================================================

export interface TargetSystem {
  type: 'database' | 'api';
  connection: DatabaseConnection | ApiConnection;
  schema: TargetSchema;
}

export interface TargetSchema {
  name: string;
  entities: TargetEntity[];
  relationships: TargetRelationship[];
}

export interface TargetEntity {
  name: string;
  tableName: string;
  description?: string;
  fields: TargetField[];
  primaryKey: string[];
  uniqueConstraints: string[][];
  indexes: string[];
}

export interface TargetField {
  name: string;
  type: string;  // Database-specific type
  nullable: boolean;
  defaultValue?: any;
  constraints: FieldConstraint[];
  validation?: FieldValidation;
}

export interface FieldConstraint {
  type: 'required' | 'unique' | 'foreign-key' | 'check' | 'min' | 'max' | 'pattern' | 'enum';
  value?: any;
  message?: string;
  referencedTable?: string;
  referencedField?: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
  custom?: string;
}

export interface TargetRelationship {
  name: string;
  sourceEntity: string;
  sourceField: string;
  targetEntity: string;
  targetField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  onDelete: 'cascade' | 'set-null' | 'restrict' | 'no-action';
  onUpdate: 'cascade' | 'set-null' | 'restrict' | 'no-action';
}

// ============================================================================
// FIELD MAPPING
// ============================================================================

export interface FieldMappingSet {
  id: string;
  sourceId: string;
  sourceName: string;
  targetEntity: string;

  // Individual field mappings
  mappings: FieldMapping[];

  // Unmapped source fields
  unmappedSourceFields: string[];

  // Required target fields without mapping
  unmappedRequiredFields: string[];

  // Overall confidence
  overallConfidence: number;

  // Mapping metadata
  metadata: {
    createdAt: string;
    createdBy: 'auto' | 'manual' | 'hybrid';
    lastModifiedAt: string;
    version: number;
    approved: boolean;
    approvedBy?: string;
    approvedAt?: string;
  };
}

export interface FieldMapping {
  id: string;

  // Source field(s) - can be multiple for combined fields
  source: {
    fields: string[];
    expression?: string;  // Custom expression for complex mappings
  };

  // Target field
  target: {
    entity: string;
    field: string;
  };

  // Transformation to apply
  transformation: FieldTransformation;

  // Mapping metadata
  confidence: number;
  matchReason: MappingMatchReason[];

  // Validation rules specific to this mapping
  validation?: MappingValidation;

  // Status
  status: 'suggested' | 'confirmed' | 'rejected' | 'manual';

  // Fallback value if source is null/missing
  defaultValue?: any;

  // Notes
  notes?: string;
}

export type MappingMatchReason =
  | { type: 'exact-name'; score: number }
  | { type: 'semantic-match'; score: number; details: string }
  | { type: 'type-compatible'; score: number }
  | { type: 'sample-data-match'; score: number }
  | { type: 'pattern-match'; pattern: string; score: number }
  | { type: 'historical-mapping'; previousProject: string; score: number }
  | { type: 'manual'; user: string };

export interface MappingValidation {
  preTransform?: ValidationRule[];
  postTransform?: ValidationRule[];
  onError: 'reject' | 'use-default' | 'null' | 'skip-record';
}

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

export interface FieldTransformation {
  type: TransformationType;
  config: TransformationConfig;
  chain?: FieldTransformation[];  // For chained transformations
}

export type TransformationType =
  | 'none'
  | 'type-cast'
  | 'date-format'
  | 'number-format'
  | 'string-transform'
  | 'split'
  | 'combine'
  | 'lookup'
  | 'custom-expression'
  | 'regex-extract'
  | 'regex-replace'
  | 'conditional'
  | 'mask';

export type TransformationConfig =
  | TypeCastConfig
  | DateFormatConfig
  | NumberFormatConfig
  | StringTransformConfig
  | SplitConfig
  | CombineConfig
  | LookupConfig
  | CustomExpressionConfig
  | RegexConfig
  | ConditionalConfig
  | MaskConfig;

export interface TypeCastConfig {
  type: 'type-cast';
  fromType: string;
  toType: string;
  onError: 'null' | 'default' | 'fail';
  defaultValue?: any;
}

export interface DateFormatConfig {
  type: 'date-format';
  inputFormat: string | string[];  // Can try multiple formats
  outputFormat: string;
  inputTimezone?: string;
  outputTimezone?: string;
  onError: 'null' | 'default' | 'fail';
  defaultValue?: string;
}

export interface NumberFormatConfig {
  type: 'number-format';
  decimalSeparator?: string;
  thousandsSeparator?: string;
  currencySymbol?: string;
  precision?: number;
  onError: 'null' | 'default' | 'fail';
  defaultValue?: number;
}

export interface StringTransformConfig {
  type: 'string-transform';
  operations: StringOperation[];
}

export type StringOperation =
  | { op: 'trim' }
  | { op: 'lowercase' }
  | { op: 'uppercase' }
  | { op: 'titlecase' }
  | { op: 'truncate'; length: number }
  | { op: 'pad'; length: number; padChar: string; position: 'left' | 'right' }
  | { op: 'replace'; find: string; replace: string }
  | { op: 'remove-chars'; chars: string }
  | { op: 'normalize-whitespace' }
  | { op: 'remove-accents' };

export interface SplitConfig {
  type: 'split';
  delimiter: string;
  index?: number;           // Which part to take (0-based)
  outputs?: {              // For splitting into multiple fields
    index: number;
    targetField: string;
  }[];
  preserveAll?: boolean;
}

export interface CombineConfig {
  type: 'combine';
  sourceFields: string[];
  separator: string;
  template?: string;  // e.g., "{firstName} {lastName}"
  nullHandling: 'skip' | 'empty' | 'literal-null';
}

export interface LookupConfig {
  type: 'lookup';
  lookupTable: string | { [key: string]: any };  // Table name or inline mapping
  sourceField: string;
  lookupField: string;
  returnField: string;
  onNotFound: 'null' | 'default' | 'original' | 'fail';
  defaultValue?: any;
  caseInsensitive?: boolean;
}

export interface CustomExpressionConfig {
  type: 'custom-expression';
  expression: string;  // JavaScript expression
  dependencies?: string[];  // Other fields this expression depends on
}

export interface RegexConfig {
  type: 'regex-extract' | 'regex-replace';
  pattern: string;
  flags?: string;
  // For extract
  group?: number;
  // For replace
  replacement?: string;
}

export interface ConditionalConfig {
  type: 'conditional';
  conditions: {
    when: string;  // Expression
    then: FieldTransformation;
  }[];
  else: FieldTransformation;
}

export interface MaskConfig {
  type: 'mask';
  pattern: 'email' | 'phone' | 'ssn' | 'credit-card' | 'custom';
  customMask?: {
    showFirst: number;
    showLast: number;
    maskChar: string;
  };
  preserveFormat?: boolean;
}

export interface TransformationRuleSet {
  id: string;
  name: string;
  description?: string;
  rules: TransformationRule[];
  globalTransformations: FieldTransformation[];  // Applied to all fields
}

export interface TransformationRule {
  id: string;
  name: string;
  description?: string;
  condition?: string;  // When this rule applies
  sourcePattern?: string;  // Regex for matching source fields
  transformation: FieldTransformation;
  priority: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationRuleSet {
  id: string;
  name: string;
  description?: string;

  // Field-level rules
  fieldRules: FieldValidationRule[];

  // Record-level rules
  recordRules: RecordValidationRule[];

  // Cross-record rules (duplicates, references)
  crossRecordRules: CrossRecordValidationRule[];

  // Business rules
  businessRules: BusinessRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface FieldValidationRule extends ValidationRule {
  type: 'field';
  field: string;  // Can use wildcards
  checks: FieldCheck[];
}

export type FieldCheck =
  | { check: 'required' }
  | { check: 'type'; expectedType: string }
  | { check: 'min-length'; value: number }
  | { check: 'max-length'; value: number }
  | { check: 'min'; value: number }
  | { check: 'max'; value: number }
  | { check: 'pattern'; regex: string }
  | { check: 'enum'; values: string[] }
  | { check: 'email' }
  | { check: 'phone'; format?: string }
  | { check: 'url' }
  | { check: 'date'; format?: string }
  | { check: 'custom'; expression: string };

export interface RecordValidationRule extends ValidationRule {
  type: 'record';
  expression: string;  // Expression using record fields
  errorMessage: string;
}

export interface CrossRecordValidationRule extends ValidationRule {
  type: 'cross-record';
  ruleType: 'unique' | 'foreign-key' | 'duplicate-check' | 'custom';

  // For unique
  uniqueFields?: string[];

  // For foreign key
  foreignKey?: {
    sourceField: string;
    targetTable: string;
    targetField: string;
  };

  // For duplicate check
  duplicateCheck?: {
    fields: string[];
    matchType: 'exact' | 'fuzzy';
    threshold?: number;
  };

  // For custom
  customExpression?: string;
}

export interface BusinessRule extends ValidationRule {
  type: 'business';
  expression: string;
  context?: string;  // Where this rule comes from
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;

  // Location
  sourceTable?: string;
  recordIndex?: number;
  recordId?: string;
  field?: string;

  // Issue details
  message: string;
  actualValue?: any;
  expectedValue?: any;

  // Fix suggestions
  fixable: boolean;
  suggestedFix?: SuggestedFix;
}

export interface SuggestedFix {
  type: 'auto-fix' | 'manual-fix' | 'skip' | 'use-default';
  description: string;
  fixedValue?: any;
  confidence: number;
}

export interface ValidationSummary {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;

  errorCount: number;
  warningCount: number;
  infoCount: number;

  byRule: {
    ruleId: string;
    ruleName: string;
    errorCount: number;
    affectedRecords: number;
  }[];

  byField: {
    field: string;
    errorCount: number;
    warningCount: number;
    topIssues: string[];
  }[];

  fixableIssues: number;
  blockingIssues: number;

  qualityScore: number;  // 0-100

  // Can we proceed with migration?
  canProceed: boolean;
  blockingReasons?: string[];
}

// ============================================================================
// MIGRATION EXECUTION
// ============================================================================

export interface MigrationExecution {
  id: string;
  projectId: string;

  type: 'dry-run' | 'full' | 'incremental' | 'resume';

  status: MigrationExecutionStatus;

  // Configuration used
  config: MigrationConfig;

  // Timing
  startedAt: string;
  completedAt?: string;
  duration?: number;  // milliseconds

  // Progress
  progress: MigrationProgress;

  // Batches
  batches: MigrationBatch[];

  // Results
  results?: MigrationResults;

  // Errors
  errors: MigrationError[];

  // Checkpoints for resumability
  checkpoints: Checkpoint[];

  // Initiated by
  initiatedBy: string;
}

export type MigrationExecutionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rolled-back';

export interface MigrationProgress {
  phase: 'initialization' | 'validation' | 'transformation' | 'loading' | 'verification' | 'cleanup';

  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;

  totalBatches: number;
  completedBatches: number;
  currentBatch?: number;

  estimatedTimeRemaining?: number;  // seconds
  recordsPerSecond?: number;

  percentComplete: number;
}

export interface MigrationBatch {
  id: string;
  batchNumber: number;

  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled-back';

  // Records in this batch
  startIndex: number;
  endIndex: number;
  recordCount: number;

  // Timing
  startedAt?: string;
  completedAt?: string;
  duration?: number;

  // Results
  successCount: number;
  failureCount: number;
  skipCount: number;

  // Errors in this batch
  errors: BatchError[];

  // Transaction info
  transactionId?: string;
  checkpointId?: string;

  // Can be retried?
  retriable: boolean;
  retryCount: number;
}

export interface BatchError {
  recordIndex: number;
  recordId?: string;
  field?: string;
  errorType: 'validation' | 'transformation' | 'database' | 'network' | 'unknown';
  message: string;
  details?: any;
  retriable: boolean;
}

export interface Checkpoint {
  id: string;
  createdAt: string;

  // State at checkpoint
  batchNumber: number;
  recordsProcessed: number;

  // Data needed to resume
  resumeData: {
    lastProcessedId?: string;
    lastProcessedIndex: number;
    pendingBatches: number[];
    state: Record<string, any>;
  };

  // Can we resume from this checkpoint?
  valid: boolean;
  expiresAt?: string;
}

export interface MigrationResults {
  totalSourceRecords: number;
  totalProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;

  byEntity: {
    entity: string;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  }[];

  // Duplicate handling
  duplicatesFound: number;
  duplicatesMerged: number;
  duplicatesSkipped: number;

  // Data quality
  validationErrorsFixed: number;
  dataTransformations: number;

  // Performance
  averageRecordsPerSecond: number;
  peakRecordsPerSecond: number;

  // Verification
  verificationPassed: boolean;
  verificationDetails?: VerificationResult;
}

export interface VerificationResult {
  countMatch: boolean;
  sourceCount: number;
  targetCount: number;

  sampleVerification: {
    sampleSize: number;
    matchedRecords: number;
    mismatchedRecords: number;
    mismatches: {
      recordId: string;
      field: string;
      sourceValue: any;
      targetValue: any;
    }[];
  };

  checksumVerification?: {
    enabled: boolean;
    passed: boolean;
    sourceChecksum?: string;
    targetChecksum?: string;
  };

  referentialIntegrity: {
    checked: boolean;
    passed: boolean;
    orphanedRecords: number;
    details?: string[];
  };
}

export interface MigrationError {
  id: string;
  timestamp: string;

  phase: string;
  batchNumber?: number;
  recordIndex?: number;

  errorType: 'validation' | 'transformation' | 'database' | 'network' | 'system' | 'unknown';
  errorCode?: string;
  message: string;

  details?: {
    sourceRecord?: any;
    field?: string;
    expectedValue?: any;
    actualValue?: any;
    stackTrace?: string;
  };

  severity: 'fatal' | 'error' | 'warning';

  handled: boolean;
  resolution?: string;
}

export type MigrationStatus = {
  phase: 'draft' | 'analyzing' | 'mapping' | 'validating' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';

  // Phase-specific progress
  analysisProgress?: number;
  mappingProgress?: number;
  validationProgress?: number;
  executionProgress?: number;

  // Current activity
  currentActivity?: string;

  // Issues blocking progress
  blockingIssues?: string[];

  // Last update
  lastUpdated: string;
};

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  timestamp: string;

  // Who
  userId: string;
  userName: string;
  userRole?: string;

  // What
  action: AuditAction;
  entityType: string;
  entityId: string;

  // Details
  description: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];

  // Context
  projectId: string;
  executionId?: string;
  batchId?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export type AuditAction =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'source.added'
  | 'source.analyzed'
  | 'source.removed'
  | 'mapping.created'
  | 'mapping.updated'
  | 'mapping.approved'
  | 'validation.executed'
  | 'migration.started'
  | 'migration.paused'
  | 'migration.resumed'
  | 'migration.completed'
  | 'migration.failed'
  | 'migration.cancelled'
  | 'migration.rolled-back'
  | 'record.created'
  | 'record.updated'
  | 'record.deleted'
  | 'record.skipped'
  | 'error.occurred'
  | 'config.changed';

// ============================================================================
// INCREMENTAL SYNC
// ============================================================================

export interface IncrementalSyncConfig {
  enabled: boolean;

  // How to detect changes
  changeDetection: {
    method: 'timestamp' | 'version' | 'checksum' | 'cdc' | 'full-compare';
    timestampField?: string;
    versionField?: string;
    checksumFields?: string[];
  };

  // Sync schedule
  schedule?: {
    type: 'interval' | 'cron';
    interval?: number;  // minutes
    cron?: string;
  };

  // State tracking
  lastSyncAt?: string;
  lastSyncValue?: string | number;
  lastSyncRecordCount?: number;

  // Handling updates and deletes
  handleUpdates: boolean;
  handleDeletes: boolean;
  softDelete?: {
    enabled: boolean;
    field: string;
    value: any;
  };
}

export interface SyncState {
  lastSuccessfulSync: string;
  lastSyncAttempt: string;

  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;

  consecutiveFailures: number;
  lastError?: string;

  nextScheduledSync?: string;
}

// ============================================================================
// REPORTING
// ============================================================================

export interface MigrationReport {
  projectId: string;
  projectName: string;
  customerName: string;

  generatedAt: string;
  generatedBy: string;

  executionSummary: {
    executionId: string;
    type: string;
    status: string;
    startedAt: string;
    completedAt: string;
    duration: string;
  };

  dataSummary: {
    sources: {
      name: string;
      type: string;
      recordCount: number;
    }[];

    totalSourceRecords: number;
    totalTargetRecords: number;

    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    recordsFailed: number;
  };

  qualitySummary: {
    overallScore: number;
    validationErrors: number;
    validationWarnings: number;
    fixedIssues: number;
    remainingIssues: number;
  };

  mappingSummary: {
    totalFields: number;
    autoMapped: number;
    manuallyMapped: number;
    unmapped: number;
    averageConfidence: number;
  };

  transformationSummary: {
    totalTransformations: number;
    byType: { type: string; count: number }[];
  };

  performanceSummary: {
    avgRecordsPerSecond: number;
    totalBatches: number;
    failedBatches: number;
    retries: number;
  };

  issues: {
    category: string;
    count: number;
    samples: string[];
  }[];

  recommendations: string[];

  auditTrail: AuditLog[];
}

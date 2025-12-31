/**
 * TestForge - Core TypeScript Interfaces
 *
 * Defines the architecture for intelligent test generation that catches real bugs.
 */

// ============================================================================
// Code Analysis Types
// ============================================================================

export interface CodeAnalysisResult {
  filePath: string;
  language: string;
  framework?: TestFramework;
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  dependencies: DependencyMap;
  complexity: ComplexityMetrics;
  coverage?: CoverageData;
}

export interface FunctionAnalysis {
  name: string;
  signature: FunctionSignature;
  lineRange: [number, number];
  controlFlow: ControlFlowGraph;
  sideEffects: SideEffect[];
  complexity: number;
  dependencies: string[];
  existingTests: ExistingTest[];
  risk: RiskScore;
}

export interface FunctionSignature {
  name: string;
  parameters: Parameter[];
  returnType: TypeInfo;
  generics?: GenericParameter[];
  isAsync: boolean;
  visibility: 'public' | 'private' | 'protected';
}

export interface Parameter {
  name: string;
  type: TypeInfo;
  optional: boolean;
  defaultValue?: any;
  constraints?: TypeConstraint[];
}

export interface TypeInfo {
  raw: string;
  normalized: string;
  isNullable: boolean;
  isPrimitive: boolean;
  isCollection: boolean;
  genericArgs?: TypeInfo[];
  constraints?: TypeConstraint[];
}

export interface TypeConstraint {
  kind: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: any;
  description: string;
}

export interface ControlFlowGraph {
  nodes: CFGNode[];
  edges: CFGEdge[];
  branches: Branch[];
  loops: Loop[];
  exitPoints: ExitPoint[];
}

export interface CFGNode {
  id: string;
  type: 'entry' | 'exit' | 'statement' | 'condition' | 'loop' | 'error';
  code: string;
  lineNumber: number;
}

export interface CFGEdge {
  from: string;
  to: string;
  condition?: string;
  probability?: number;
}

export interface Branch {
  condition: string;
  truePath: string[];
  falsePath: string[];
  coverage: boolean;
}

export interface Loop {
  type: 'for' | 'while' | 'foreach';
  condition: string;
  body: string[];
  invariants?: string[];
}

export interface ExitPoint {
  type: 'return' | 'throw' | 'break' | 'continue';
  value?: string;
  condition?: string;
  lineNumber: number;
}

export interface SideEffect {
  type: 'mutation' | 'io' | 'network' | 'filesystem' | 'database' | 'global-state';
  target: string;
  description: string;
  lineNumber: number;
}

export interface ClassAnalysis {
  name: string;
  methods: FunctionAnalysis[];
  properties: PropertyAnalysis[];
  inherits?: string[];
  implements?: string[];
  isAbstract: boolean;
}

export interface PropertyAnalysis {
  name: string;
  type: TypeInfo;
  visibility: 'public' | 'private' | 'protected';
  mutable: boolean;
}

export interface DependencyMap {
  internal: string[];
  external: string[];
  mocked: string[];
  injectable: InjectableDependency[];
}

export interface InjectableDependency {
  name: string;
  type: string;
  interface?: string;
  mockable: boolean;
  mockStrategy: MockStrategy;
}

export type MockStrategy = 'jest.mock' | 'vi.mock' | 'unittest.mock' | 'gomock' | 'testify' | 'custom';

export interface ComplexityMetrics {
  cyclomatic: number;
  cognitive: number;
  halstead: HalsteadMetrics;
  maintainability: number;
}

export interface HalsteadMetrics {
  vocabulary: number;
  length: number;
  volume: number;
  difficulty: number;
  effort: number;
}

export interface RiskScore {
  overall: number; // 0-100
  factors: {
    complexity: number;
    uncovered: number;
    sideEffects: number;
    dependencies: number;
    changeFrequency: number;
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Test Generation Types
// ============================================================================

export interface TestGenerationRequest {
  target: TestTarget;
  framework: TestFramework;
  options: GenerationOptions;
  context: GenerationContext;
}

export interface TestTarget {
  type: 'file' | 'function' | 'class' | 'module';
  path: string;
  specific?: string; // function or class name
  lineRange?: [number, number];
}

export type TestFramework = 'jest' | 'vitest' | 'pytest' | 'mocha' | 'go-testing' | 'cargo-test';

export interface GenerationOptions {
  includeEdgeCases: boolean;
  includeBoundaryTests: boolean;
  includeErrorCases: boolean;
  generateMocks: boolean;
  generateFixtures: boolean;
  generateIntegration: boolean;
  maxTestsPerFunction: number;
  coverageTarget: number;
  namingStyle: 'descriptive' | 'should' | 'given-when-then' | 'it';
  assertionStyle: 'expect' | 'assert' | 'should';
  mutationTestingGuidance: boolean;
}

export interface GenerationContext {
  projectRoot: string;
  existingTests: string[];
  coverageData?: CoverageData;
  testingConventions: TestingConventions;
  frameworkConfig: FrameworkConfig;
}

export interface TestingConventions {
  testFilePattern: string; // e.g., "*.test.ts" or "*_test.go"
  testDirectory: string; // e.g., "__tests__" or "tests"
  mockDirectory: string; // e.g., "__mocks__"
  fixtureDirectory: string; // e.g., "fixtures"
  namingConvention: string;
  setupFiles?: string[];
}

export interface FrameworkConfig {
  framework: TestFramework;
  version?: string;
  plugins: string[];
  customMatchers?: string[];
  globalSetup?: string;
  globalTeardown?: string;
}

export interface TestGenerationResult {
  success: boolean;
  tests: GeneratedTest[];
  mocks: GeneratedMock[];
  fixtures: GeneratedFixture[];
  coverage: CoverageImpact;
  metrics: GenerationMetrics;
  warnings: Warning[];
  suggestions: Suggestion[];
}

export interface GeneratedTest {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'edge-case' | 'error-handling' | 'boundary';
  targetFunction: string;
  code: string;
  assertions: Assertion[];
  setup?: string;
  teardown?: string;
  dependencies: string[];
  tags: string[];
  bugCatchingPotential: number; // 0-100
  maintainabilityScore: number; // 0-100
  rationale: string; // Why this test is valuable
}

export interface Assertion {
  type: 'equality' | 'type' | 'exception' | 'state' | 'side-effect' | 'performance';
  subject: string;
  expected: string;
  code: string;
  reasoning: string;
}

export interface GeneratedMock {
  name: string;
  targetDependency: string;
  strategy: MockStrategy;
  code: string;
  methods: MockMethod[];
  usage: string; // How to use this mock
}

export interface MockMethod {
  name: string;
  returnValue?: string;
  implementation?: string;
  sideEffects?: string[];
}

export interface GeneratedFixture {
  name: string;
  type: 'object' | 'array' | 'factory' | 'builder';
  code: string;
  usage: string;
  variations: FixtureVariation[];
}

export interface FixtureVariation {
  name: string;
  description: string;
  code: string;
  useCase: string;
}

export interface CoverageImpact {
  before: CoverageData;
  after: CoverageData;
  improvement: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  uncoveredPaths: UncoveredPath[];
}

export interface CoverageData {
  statements: { covered: number; total: number; percent: number };
  branches: { covered: number; total: number; percent: number };
  functions: { covered: number; total: number; percent: number };
  lines: { covered: number; total: number; percent: number };
}

export interface UncoveredPath {
  file: string;
  function: string;
  path: string[];
  reason: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'impossible';
}

export interface GenerationMetrics {
  totalTests: number;
  edgeCasesIdentified: number;
  mocksGenerated: number;
  fixturesGenerated: number;
  timeMs: number;
  agentsUsed: string[];
  complexity: number;
}

export interface Warning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  location?: string;
  suggestion?: string;
}

export interface Suggestion {
  type: 'coverage' | 'refactor' | 'mock' | 'edge-case' | 'integration';
  message: string;
  priority: 'low' | 'medium' | 'high';
  impact: string;
}

// ============================================================================
// Edge Case Detection Types
// ============================================================================

export interface EdgeCaseAnalysis {
  function: string;
  edgeCases: EdgeCase[];
  boundaryConditions: BoundaryCondition[];
  errorScenarios: ErrorScenario[];
  stateTransitions: StateTransition[];
}

export interface EdgeCase {
  id: string;
  category: EdgeCaseCategory;
  description: string;
  input: TestInput;
  expectedBehavior: string;
  likelihood: 'common' | 'uncommon' | 'rare';
  severity: 'critical' | 'high' | 'medium' | 'low';
  testCode: string;
}

export type EdgeCaseCategory =
  | 'null-undefined'
  | 'empty-collection'
  | 'boundary-value'
  | 'type-coercion'
  | 'race-condition'
  | 'resource-exhaustion'
  | 'malformed-input'
  | 'overflow-underflow'
  | 'special-characters'
  | 'concurrent-access';

export interface BoundaryCondition {
  parameter: string;
  type: 'min' | 'max' | 'zero' | 'negative' | 'empty' | 'single' | 'large';
  value: any;
  expectedBehavior: string;
  testCode: string;
}

export interface ErrorScenario {
  trigger: string;
  errorType: string;
  expectedMessage?: string;
  shouldCatch: boolean;
  testCode: string;
}

export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  validations: string[];
  testCode: string;
}

export interface TestInput {
  parameters: { [key: string]: any };
  setup?: string;
  context?: string;
}

// ============================================================================
// Mutation Testing Types
// ============================================================================

export interface MutationAnalysis {
  function: string;
  mutations: Mutation[];
  survivableMutants: SurvivableMutant[];
  recommendations: MutationRecommendation[];
  score: number; // 0-100
}

export interface Mutation {
  id: string;
  type: MutationType;
  original: string;
  mutated: string;
  lineNumber: number;
  killed: boolean;
  killedBy?: string[]; // test names
}

export type MutationType =
  | 'operator-replacement'
  | 'condition-negation'
  | 'return-value-change'
  | 'constant-replacement'
  | 'statement-deletion'
  | 'boundary-change';

export interface SurvivableMutant {
  mutation: Mutation;
  reason: string;
  suggestedTest: string;
  priority: 'high' | 'medium' | 'low';
}

export interface MutationRecommendation {
  type: 'add-test' | 'strengthen-assertion' | 'increase-coverage';
  description: string;
  testCode?: string;
  impact: number; // 0-100
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface TestForgeWorkflow {
  id: string;
  name: string;
  description: string;
  phases: WorkflowPhase[];
  agents: AgentAssignment[];
}

export interface WorkflowPhase {
  name: string;
  agent: string;
  input: any;
  output: any;
  parallel?: boolean;
}

export interface AgentAssignment {
  agent: string;
  role: string;
  model: 'opus' | 'sonnet' | 'haiku';
  parallel: boolean;
}

export interface ExistingTest {
  name: string;
  file: string;
  lineRange: [number, number];
  covers: string[];
  assertions: number;
  quality: number; // 0-100
}

// ============================================================================
// Quality Metrics
// ============================================================================

export interface TestQualityMetrics {
  coverage: CoverageData;
  mutationScore: number;
  bugCatchingPotential: number;
  maintainability: number;
  executionTime: number;
  flakiness: number;
  assertions: {
    total: number;
    meaningful: number;
    weak: number;
  };
}

export interface QualityThresholds {
  minCoverage: number;
  minMutationScore: number;
  minBugCatchingPotential: number;
  minMaintainability: number;
  maxExecutionTime: number;
  maxFlakiness: number;
}

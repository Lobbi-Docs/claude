/**
 * Complexity Scoring Engine for Orchestrate Complex v2.0
 *
 * Analyzes task complexity across 4 dimensions and selects optimal execution tier.
 */

export type ExecutionTier = 'LIGHT' | 'STANDARD' | 'HEAVY' | 'MASSIVE';

interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  factors: string[];
}

interface ComplexityAnalysis {
  totalScore: number;
  tier: ExecutionTier;
  dimensions: DimensionScore[];
  estimatedAgents: { min: number; max: number };
  estimatedTime: { min: number; max: number }; // minutes
  estimatedCost: { min: number; max: number }; // dollars
  confidence: number;
  risks: string[];
  recommendations: string[];
}

interface TaskContext {
  description: string;
  keywords: string[];
  filesAffected?: number;
  componentsAffected?: number;
  hasDbChanges?: boolean;
  hasApiChanges?: boolean;
  hasSecurityImplications?: boolean;
  externalIntegrations?: number;
  productionImpact?: 'low' | 'medium' | 'high' | 'critical';
  rollbackDifficulty?: 'easy' | 'medium' | 'hard';
  hasDataMigration?: boolean;
}

// Keyword patterns for complexity detection
const COMPLEXITY_PATTERNS = {
  high: [
    'migrate', 'refactor', 'redesign', 'overhaul', 'rewrite',
    'architecture', 'microservices', 'distributed', 'real-time',
    'encryption', 'authentication', 'oauth', 'sso', 'rbac',
    'websocket', 'crdt', 'consensus', 'replication',
    'sharding', 'partitioning', 'caching', 'scaling'
  ],
  medium: [
    'integrate', 'api', 'endpoint', 'feature', 'component',
    'database', 'schema', 'table', 'query', 'index',
    'validation', 'error handling', 'logging', 'monitoring',
    'testing', 'coverage', 'performance', 'optimization'
  ],
  low: [
    'fix', 'typo', 'readme', 'docs', 'documentation',
    'config', 'configuration', 'update', 'bump', 'version',
    'style', 'format', 'lint', 'rename', 'move'
  ]
};

/**
 * Analyze task complexity and determine execution tier
 */
export function analyzeComplexity(context: TaskContext): ComplexityAnalysis {
  const dimensions: DimensionScore[] = [];

  // 1. SCOPE (25%)
  const scopeScore = calculateScopeScore(context);
  dimensions.push({
    dimension: 'Scope',
    score: scopeScore.score,
    weight: 0.25,
    factors: scopeScore.factors
  });

  // 2. TECHNICAL (30%)
  const technicalScore = calculateTechnicalScore(context);
  dimensions.push({
    dimension: 'Technical',
    score: technicalScore.score,
    weight: 0.30,
    factors: technicalScore.factors
  });

  // 3. DEPENDENCIES (20%)
  const dependencyScore = calculateDependencyScore(context);
  dimensions.push({
    dimension: 'Dependencies',
    score: dependencyScore.score,
    weight: 0.20,
    factors: dependencyScore.factors
  });

  // 4. RISK (25%)
  const riskScore = calculateRiskScore(context);
  dimensions.push({
    dimension: 'Risk',
    score: riskScore.score,
    weight: 0.25,
    factors: riskScore.factors
  });

  // Calculate weighted total
  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + (d.score * d.weight), 0)
  );

  // Determine tier
  const tier = selectTier(totalScore);

  // Get estimates
  const estimates = getEstimates(tier);

  // Identify risks
  const risks = identifyRisks(context, dimensions);

  // Generate recommendations
  const recommendations = generateRecommendations(tier, dimensions);

  return {
    totalScore,
    tier,
    dimensions,
    estimatedAgents: estimates.agents,
    estimatedTime: estimates.time,
    estimatedCost: estimates.cost,
    confidence: calculateConfidence(context),
    risks,
    recommendations
  };
}

function calculateScopeScore(context: TaskContext): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Files affected
  const files = context.filesAffected || estimateFilesFromKeywords(context.keywords);
  if (files <= 5) {
    score += 20;
    factors.push(`${files} files (small scope)`);
  } else if (files <= 20) {
    score += 50;
    factors.push(`${files} files (medium scope)`);
  } else if (files <= 50) {
    score += 75;
    factors.push(`${files} files (large scope)`);
  } else {
    score += 100;
    factors.push(`${files}+ files (massive scope)`);
  }

  // Components
  const components = context.componentsAffected || estimateComponentsFromKeywords(context.keywords);
  score += Math.min(components * 10, 40);
  if (components > 0) {
    factors.push(`${components} components affected`);
  }

  // Cross-cutting concerns
  const crossCutting = detectCrossCuttingConcerns(context.keywords);
  score += crossCutting.length * 20;
  if (crossCutting.length > 0) {
    factors.push(`Cross-cutting: ${crossCutting.join(', ')}`);
  }

  return { score: Math.min(score, 100), factors };
}

function calculateTechnicalScore(context: TaskContext): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // New patterns/frameworks
  const newPatterns = detectNewPatterns(context.keywords);
  score += newPatterns.length * 25;
  if (newPatterns.length > 0) {
    factors.push(`New patterns: ${newPatterns.join(', ')}`);
  }

  // Database changes
  if (context.hasDbChanges) {
    score += 30;
    factors.push('Database schema changes');
  } else if (context.keywords.some(k => ['query', 'sql', 'database'].includes(k.toLowerCase()))) {
    score += 15;
    factors.push('Database queries modified');
  }

  // API changes
  if (context.hasApiChanges) {
    if (context.keywords.some(k => ['breaking', 'remove', 'deprecate'].includes(k.toLowerCase()))) {
      score += 20;
      factors.push('Breaking API changes');
    } else {
      score += 10;
      factors.push('Additive API changes');
    }
  }

  // Security implications
  if (context.hasSecurityImplications) {
    score += 25;
    factors.push('Security-sensitive changes');
  }

  return { score: Math.min(score, 100), factors };
}

function calculateDependencyScore(context: TaskContext): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // External integrations
  const integrations = context.externalIntegrations || 0;
  score += integrations * 15;
  if (integrations > 0) {
    factors.push(`${integrations} external integrations`);
  }

  // Library changes
  const libraryChanges = detectLibraryChanges(context.keywords);
  score += libraryChanges * 10;
  if (libraryChanges > 0) {
    factors.push(`${libraryChanges} library changes`);
  }

  // Cross-team dependencies
  const crossTeam = detectCrossTeamDependencies(context.keywords);
  score += crossTeam * 20;
  if (crossTeam > 0) {
    factors.push(`${crossTeam} cross-team dependencies`);
  }

  return { score: Math.min(score, 100), factors };
}

function calculateRiskScore(context: TaskContext): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Production impact
  switch (context.productionImpact) {
    case 'critical':
      score += 100;
      factors.push('Critical production impact');
      break;
    case 'high':
      score += 70;
      factors.push('High production impact');
      break;
    case 'medium':
      score += 40;
      factors.push('Medium production impact');
      break;
    default:
      score += 10;
      factors.push('Low production impact');
  }

  // Rollback difficulty
  switch (context.rollbackDifficulty) {
    case 'hard':
      score += 80;
      factors.push('Difficult rollback');
      break;
    case 'medium':
      score += 40;
      factors.push('Medium rollback complexity');
      break;
    default:
      score += 10;
      factors.push('Easy rollback');
  }

  // Data migration
  if (context.hasDataMigration) {
    score += 30;
    factors.push('Data migration required');
  }

  return { score: Math.min(score, 100), factors };
}

function selectTier(score: number): ExecutionTier {
  if (score <= 25) return 'LIGHT';
  if (score <= 50) return 'STANDARD';
  if (score <= 75) return 'HEAVY';
  return 'MASSIVE';
}

function getEstimates(tier: ExecutionTier): {
  agents: { min: number; max: number };
  time: { min: number; max: number };
  cost: { min: number; max: number };
} {
  const estimates = {
    LIGHT: {
      agents: { min: 3, max: 5 },
      time: { min: 3, max: 8 },
      cost: { min: 0.08, max: 0.25 }
    },
    STANDARD: {
      agents: { min: 6, max: 9 },
      time: { min: 10, max: 20 },
      cost: { min: 0.50, max: 1.50 }
    },
    HEAVY: {
      agents: { min: 10, max: 15 },
      time: { min: 25, max: 40 },
      cost: { min: 2.00, max: 5.00 }
    },
    MASSIVE: {
      agents: { min: 16, max: 25 },
      time: { min: 45, max: 90 },
      cost: { min: 5.00, max: 15.00 }
    }
  };
  return estimates[tier];
}

function calculateConfidence(context: TaskContext): number {
  let confidence = 100;

  // Reduce confidence for missing information
  if (context.filesAffected === undefined) confidence -= 10;
  if (context.componentsAffected === undefined) confidence -= 10;
  if (context.productionImpact === undefined) confidence -= 15;
  if (context.keywords.length < 3) confidence -= 10;

  return Math.max(confidence, 50);
}

function identifyRisks(context: TaskContext, dimensions: DimensionScore[]): string[] {
  const risks: string[] = [];

  dimensions.forEach(d => {
    if (d.score > 75) {
      risks.push(`High ${d.dimension.toLowerCase()} complexity may require iteration`);
    }
  });

  if (context.hasDataMigration) {
    risks.push('Data migration requires careful validation');
  }

  if (context.hasSecurityImplications) {
    risks.push('Security changes need thorough review');
  }

  return risks;
}

function generateRecommendations(tier: ExecutionTier, dimensions: DimensionScore[]): string[] {
  const recommendations: string[] = [];

  if (tier === 'MASSIVE') {
    recommendations.push('Consider breaking into smaller phases');
    recommendations.push('Ensure stakeholder alignment before starting');
  }

  const highDimension = dimensions.find(d => d.score > 80);
  if (highDimension) {
    recommendations.push(`Focus on ${highDimension.dimension.toLowerCase()} risk mitigation`);
  }

  return recommendations;
}

// Helper functions for keyword analysis
function estimateFilesFromKeywords(keywords: string[]): number {
  const lowKeywords = keywords.filter(k =>
    COMPLEXITY_PATTERNS.low.some(p => k.toLowerCase().includes(p))
  ).length;
  const highKeywords = keywords.filter(k =>
    COMPLEXITY_PATTERNS.high.some(p => k.toLowerCase().includes(p))
  ).length;

  if (highKeywords > 2) return 30;
  if (highKeywords > 0) return 15;
  if (lowKeywords > 2) return 3;
  return 8;
}

function estimateComponentsFromKeywords(keywords: string[]): number {
  const componentKeywords = ['component', 'module', 'service', 'api', 'layer', 'system'];
  return keywords.filter(k =>
    componentKeywords.some(ck => k.toLowerCase().includes(ck))
  ).length;
}

function detectCrossCuttingConcerns(keywords: string[]): string[] {
  const concerns = ['logging', 'monitoring', 'caching', 'auth', 'validation', 'error-handling'];
  return concerns.filter(c => keywords.some(k => k.toLowerCase().includes(c)));
}

function detectNewPatterns(keywords: string[]): string[] {
  const patterns = ['websocket', 'graphql', 'grpc', 'kafka', 'redis', 'elasticsearch', 'kubernetes'];
  return patterns.filter(p => keywords.some(k => k.toLowerCase().includes(p)));
}

function detectLibraryChanges(keywords: string[]): number {
  const libraryKeywords = ['upgrade', 'dependency', 'library', 'package', 'npm', 'pip'];
  return keywords.filter(k =>
    libraryKeywords.some(lk => k.toLowerCase().includes(lk))
  ).length;
}

function detectCrossTeamDependencies(keywords: string[]): number {
  const crossTeamKeywords = ['integration', 'external', 'third-party', 'api', 'contract'];
  return Math.min(keywords.filter(k =>
    crossTeamKeywords.some(ct => k.toLowerCase().includes(ct))
  ).length, 3);
}

/**
 * Quick complexity score from description only
 */
export function quickScore(description: string): { score: number; tier: ExecutionTier } {
  const keywords = description.toLowerCase().split(/\s+/);

  let score = 50; // Default medium

  // Adjust based on patterns
  COMPLEXITY_PATTERNS.low.forEach(p => {
    if (keywords.some(k => k.includes(p))) score -= 10;
  });

  COMPLEXITY_PATTERNS.medium.forEach(p => {
    if (keywords.some(k => k.includes(p))) score += 5;
  });

  COMPLEXITY_PATTERNS.high.forEach(p => {
    if (keywords.some(k => k.includes(p))) score += 15;
  });

  score = Math.max(1, Math.min(100, score));

  return {
    score,
    tier: selectTier(score)
  };
}

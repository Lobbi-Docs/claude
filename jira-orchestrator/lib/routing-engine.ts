/**
 * Routing Engine for Plugin Ecosystem
 *
 * Intelligently routes requests to the most appropriate plugin based on:
 * - Domain classification
 * - Capability matching
 * - Plugin health and availability
 * - Cost optimization
 *
 * @version 1.0.0
 * @author architect-supreme
 */

import { MessageBus, getMessageBus } from './messagebus';

// ============================================
// TYPES AND INTERFACES
// ============================================

export enum Domain {
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  DATABASE = 'database',
  AUTHENTICATION = 'authentication',
  DEVOPS = 'devops',
  INFRASTRUCTURE = 'infrastructure',
  API = 'api',
  UI = 'ui',
  TESTING = 'testing',
  ORCHESTRATION = 'orchestration',
  SMART_HOME = 'smart-home',
  AUTOMATION = 'automation',
}

export enum Complexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
}

export interface UserRequest {
  text: string;
  files?: string[];
  subtasks?: any[];
  budget?: number;
  maxDuration?: number;
}

export interface ClassificationResult {
  domain: Domain[];
  complexity: Complexity;
  contexts: string[];
  patterns: string[];
  urgency: number;
  estimatedDuration: number;
}

export interface PluginCapabilities {
  domains: string[];
  contexts: string[];
  patterns: string[];
  integrations: string[];
}

export interface PluginManifest {
  name: string;
  version: string;
  capabilities: PluginCapabilities;
  routing: {
    priority: number;
    keywords: string[];
    contextPatterns: string[];
  };
}

export interface HealthStatus {
  status: 'up' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
}

export interface MatchedCapability {
  type: 'domain' | 'context' | 'pattern';
  value: string;
  weight: number;
}

export interface PluginScore {
  plugin: string;
  score: number;
  capabilities: MatchedCapability[];
  health: HealthStatus;
  availability: number;
}

export interface CollaborationPhase {
  domain: Domain;
  plugin: string;
  dependencies: string[];
  parallel: boolean;
  estimatedDuration: number;
}

export interface CollaborationPlan {
  phases: CollaborationPhase[];
  coordinator: string;
  estimatedDuration: number;
}

export enum ExecutionStrategy {
  SINGLE_PLUGIN = 'single_plugin',
  SEQUENTIAL_COLLABORATION = 'sequential_collaboration',
  PARALLEL_COLLABORATION = 'parallel_collaboration',
  MIXED_COLLABORATION = 'mixed_collaboration',
}

export interface RoutingDecision {
  requestId: string;
  classification: ClassificationResult;
  primaryPlugin: string;
  fallbackPlugins: string[];
  collaborationPlan?: CollaborationPlan;
  executionStrategy: ExecutionStrategy;
  estimatedCost: number;
  estimatedDuration: number;
  timestamp: string;
}

// ============================================
// REQUEST CLASSIFIER
// ============================================

export class RequestClassifier {
  private domainKeywords: Map<Domain, string[]> = new Map([
    [
      Domain.BACKEND,
      [
        'backend',
        'api',
        'server',
        'fastapi',
        'flask',
        'django',
        'express',
        'endpoint',
        'route',
      ],
    ],
    [
      Domain.FRONTEND,
      [
        'frontend',
        'ui',
        'react',
        'vue',
        'nextjs',
        'component',
        'chakra',
        'tailwind',
      ],
    ],
    [
      Domain.DATABASE,
      [
        'database',
        'db',
        'mongodb',
        'postgres',
        'mysql',
        'sqlite',
        'schema',
        'migration',
      ],
    ],
    [
      Domain.AUTHENTICATION,
      [
        'auth',
        'authentication',
        'keycloak',
        'jwt',
        'oauth',
        'sso',
        'login',
        'token',
      ],
    ],
    [
      Domain.DEVOPS,
      [
        'devops',
        'docker',
        'kubernetes',
        'k8s',
        'deploy',
        'ci/cd',
        'pipeline',
        'helm',
      ],
    ],
    [
      Domain.INFRASTRUCTURE,
      ['infrastructure', 'terraform', 'aws', 'azure', 'gcp', 'cloud', 'vault'],
    ],
  ]);

  classify(request: UserRequest): ClassificationResult {
    const text = request.text.toLowerCase();

    // Extract keywords
    const keywords = this.extractKeywords(text);

    // Classify domains
    const domains = this.classifyDomains(keywords);

    // Determine complexity
    const complexity = this.assessComplexity({
      taskCount: request.subtasks?.length || 0,
      fileCount: request.files?.length || 0,
      crossDomain: domains.length > 1,
      keywords,
    });

    // Extract contexts (technologies)
    const contexts = this.extractContexts(text);

    // Match patterns
    const patterns = this.matchPatterns(text);

    // Calculate urgency
    const urgency = this.calculateUrgency(request);

    // Estimate duration
    const estimatedDuration = this.estimateDuration(complexity, domains);

    return {
      domain: domains,
      complexity,
      contexts,
      patterns,
      urgency,
      estimatedDuration,
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction (can be enhanced with NLP)
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    return Array.from(new Set(words));
  }

  private classifyDomains(keywords: string[]): Domain[] {
    const domainScores: Map<Domain, number> = new Map();

    for (const [domain, domainKeywords] of this.domainKeywords) {
      let score = 0;

      for (const keyword of keywords) {
        if (
          domainKeywords.some((dk) =>
            keyword.includes(dk) || dk.includes(keyword)
          )
        ) {
          score += 1;
        }
      }

      if (score > 0) {
        domainScores.set(domain, score);
      }
    }

    // Return domains sorted by score
    return Array.from(domainScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain]) => domain);
  }

  private assessComplexity(context: {
    taskCount: number;
    fileCount: number;
    crossDomain: boolean;
    keywords: string[];
  }): Complexity {
    let complexityScore = 0;

    // Task count
    if (context.taskCount > 5) complexityScore += 3;
    else if (context.taskCount > 2) complexityScore += 2;
    else if (context.taskCount > 0) complexityScore += 1;

    // File count
    if (context.fileCount > 10) complexityScore += 3;
    else if (context.fileCount > 5) complexityScore += 2;
    else if (context.fileCount > 0) complexityScore += 1;

    // Cross-domain
    if (context.crossDomain) complexityScore += 2;

    // Keywords indicating complexity
    const complexKeywords = [
      'architecture',
      'design',
      'refactor',
      'migration',
      'scale',
      'optimize',
    ];
    const hasComplexKeywords = context.keywords.some((k) =>
      complexKeywords.some((ck) => k.includes(ck))
    );
    if (hasComplexKeywords) complexityScore += 2;

    // Determine complexity level
    if (complexityScore >= 6) return Complexity.COMPLEX;
    if (complexityScore >= 3) return Complexity.MODERATE;
    return Complexity.SIMPLE;
  }

  private extractContexts(text: string): string[] {
    const contextPatterns = [
      'python',
      'javascript',
      'typescript',
      'react',
      'vue',
      'nextjs',
      'fastapi',
      'flask',
      'express',
      'mongodb',
      'postgres',
      'redis',
      'docker',
      'kubernetes',
      'keycloak',
      'oauth',
      'jwt',
      'rest',
      'graphql',
      'websocket',
    ];

    return contextPatterns.filter((pattern) =>
      text.toLowerCase().includes(pattern)
    );
  }

  private matchPatterns(text: string): string[] {
    const patterns: { [key: string]: string[] } = {
      'rest-api': ['rest', 'api', 'endpoint'],
      'graphql-api': ['graphql'],
      websocket: ['websocket', 'realtime', 'socket'],
      'jwt-auth': ['jwt', 'token', 'bearer'],
      'oauth-flow': ['oauth', 'sso'],
      'component-generation': ['component', 'generate', 'create'],
      deployment: ['deploy', 'deployment', 'ci/cd'],
      migration: ['migrate', 'migration'],
    };

    const matched: string[] = [];

    for (const [pattern, keywords] of Object.entries(patterns)) {
      if (keywords.some((k) => text.toLowerCase().includes(k))) {
        matched.push(pattern);
      }
    }

    return matched;
  }

  private calculateUrgency(request: UserRequest): number {
    // Default urgency: 5/10
    return 5;
  }

  private estimateDuration(
    complexity: Complexity,
    domains: Domain[]
  ): number {
    let baseDuration = 0;

    switch (complexity) {
      case Complexity.SIMPLE:
        baseDuration = 10 * 60 * 1000; // 10 minutes
        break;
      case Complexity.MODERATE:
        baseDuration = 30 * 60 * 1000; // 30 minutes
        break;
      case Complexity.COMPLEX:
        baseDuration = 60 * 60 * 1000; // 60 minutes
        break;
    }

    // Add time for each additional domain
    const domainMultiplier = Math.max(1, domains.length);
    return baseDuration * domainMultiplier;
  }
}

// ============================================
// CAPABILITY MATCHER
// ============================================

export class CapabilityMatcher {
  private plugins: Map<string, PluginManifest> = new Map();
  private messageBus: MessageBus;

  constructor(messageBus?: MessageBus) {
    this.messageBus = messageBus || getMessageBus();
  }

  registerPlugin(manifest: PluginManifest): void {
    this.plugins.set(manifest.name, manifest);
  }

  async matchPlugins(
    classification: ClassificationResult
  ): Promise<PluginScore[]> {
    const scores: PluginScore[] = [];

    for (const [pluginName, plugin] of this.plugins) {
      // Check health first
      const health = await this.healthCheck(pluginName);
      if (health.status === 'down') continue;

      // Calculate capability score
      let score = 0;
      const matched: MatchedCapability[] = [];

      // Domain matching (30 points per match)
      for (const domain of classification.domain) {
        if (plugin.capabilities.domains.includes(domain)) {
          score += 30;
          matched.push({ type: 'domain', value: domain, weight: 30 });
        }
      }

      // Context matching (20 points per match)
      for (const context of classification.contexts) {
        if (plugin.capabilities.contexts.includes(context)) {
          score += 20;
          matched.push({ type: 'context', value: context, weight: 20 });
        }
      }

      // Pattern matching (15 points per match)
      for (const pattern of classification.patterns) {
        if (plugin.capabilities.patterns.includes(pattern)) {
          score += 15;
          matched.push({ type: 'pattern', value: pattern, weight: 15 });
        }
      }

      // Priority modifier
      score *= plugin.routing.priority / 100;

      // Availability modifier
      const availability = this.calculateAvailability(health);
      score *= availability;

      scores.push({
        plugin: pluginName,
        score,
        capabilities: matched,
        health,
        availability,
      });
    }

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  private async healthCheck(pluginName: string): Promise<HealthStatus> {
    // TODO: Implement actual health check via message bus
    // For now, return mock healthy status
    return {
      status: 'up',
      latency: 50,
      errorRate: 0.01,
    };
  }

  private calculateAvailability(health: HealthStatus): number {
    if (health.status === 'down') return 0;
    if (health.status === 'degraded') return 0.5;

    // Factor in latency and error rate
    const latencyPenalty = Math.min(health.latency / 1000, 0.3);
    const errorPenalty = health.errorRate * 0.5;

    return Math.max(0.1, 1 - latencyPenalty - errorPenalty);
  }
}

// ============================================
// ROUTING DECISION ENGINE
// ============================================

export class RoutingDecisionEngine {
  private classifier: RequestClassifier;
  private matcher: CapabilityMatcher;

  constructor(matcher: CapabilityMatcher) {
    this.classifier = new RequestClassifier();
    this.matcher = matcher;
  }

  async decide(request: UserRequest): Promise<RoutingDecision> {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Step 1: Classify request
    const classification = this.classifier.classify(request);

    // Step 2: Match plugins
    const pluginScores = await this.matcher.matchPlugins(classification);

    if (pluginScores.length === 0) {
      throw new Error('No plugins available to handle this request');
    }

    // Step 3: Select primary plugin
    const primaryPlugin = pluginScores[0].plugin;

    // Step 4: Select fallbacks
    const fallbackPlugins = pluginScores.slice(1, 4).map((p) => p.plugin);

    // Step 5: Determine if collaboration is needed
    const needsCollaboration = this.needsCollaboration(
      classification,
      pluginScores
    );

    let collaborationPlan: CollaborationPlan | undefined;
    if (needsCollaboration) {
      collaborationPlan = await this.planCollaboration(
        classification,
        pluginScores
      );
    }

    // Step 6: Determine execution strategy
    const executionStrategy = this.selectStrategy(
      classification,
      collaborationPlan
    );

    // Step 7: Estimate cost and duration
    const estimatedCost = this.estimateCost(
      classification,
      primaryPlugin,
      collaborationPlan
    );

    const estimatedDuration = collaborationPlan
      ? collaborationPlan.estimatedDuration
      : classification.estimatedDuration;

    return {
      requestId,
      classification,
      primaryPlugin,
      fallbackPlugins,
      collaborationPlan,
      executionStrategy,
      estimatedCost,
      estimatedDuration,
      timestamp: new Date().toISOString(),
    };
  }

  private needsCollaboration(
    classification: ClassificationResult,
    scores: PluginScore[]
  ): boolean {
    // Multi-domain tasks require collaboration
    if (classification.domain.length > 1) return true;

    // Complex tasks may benefit from collaboration
    if (classification.complexity === Complexity.COMPLEX) {
      // Check if multiple plugins scored high
      const highScorers = scores.filter((s) => s.score > 70);
      return highScorers.length > 1;
    }

    return false;
  }

  private async planCollaboration(
    classification: ClassificationResult,
    scores: PluginScore[]
  ): Promise<CollaborationPlan> {
    // Group plugins by domain
    const domainGroups: Map<Domain, string[]> = new Map();

    for (const score of scores) {
      for (const capability of score.capabilities) {
        if (capability.type === 'domain') {
          const domain = capability.value as Domain;
          if (!domainGroups.has(domain)) {
            domainGroups.set(domain, []);
          }
          domainGroups.get(domain)!.push(score.plugin);
        }
      }
    }

    // Create collaboration phases
    const phases: CollaborationPhase[] = [];

    for (const [domain, plugins] of domainGroups) {
      phases.push({
        domain,
        plugin: plugins[0], // Highest scoring for this domain
        dependencies: [],
        parallel: false,
        estimatedDuration: 15 * 60 * 1000, // 15 minutes
      });
    }

    // Optimize phase ordering
    const optimizedPhases = this.optimizePhaseOrder(phases);

    // Calculate total duration
    const totalDuration = optimizedPhases.reduce(
      (sum, phase) => sum + phase.estimatedDuration,
      0
    );

    return {
      phases: optimizedPhases,
      coordinator: 'jira-orchestrator',
      estimatedDuration: totalDuration,
    };
  }

  private optimizePhaseOrder(
    phases: CollaborationPhase[]
  ): CollaborationPhase[] {
    // Simple ordering: backend → frontend → devops
    const order = [
      Domain.BACKEND,
      Domain.DATABASE,
      Domain.AUTHENTICATION,
      Domain.FRONTEND,
      Domain.DEVOPS,
    ];

    return phases.sort((a, b) => {
      const aIndex = order.indexOf(a.domain);
      const bIndex = order.indexOf(b.domain);
      return aIndex - bIndex;
    });
  }

  private selectStrategy(
    classification: ClassificationResult,
    collaborationPlan?: CollaborationPlan
  ): ExecutionStrategy {
    if (!collaborationPlan) {
      return ExecutionStrategy.SINGLE_PLUGIN;
    }

    // Check if phases can run in parallel
    const canParallelize = collaborationPlan.phases.every(
      (p) => p.dependencies.length === 0
    );

    if (canParallelize) {
      return ExecutionStrategy.PARALLEL_COLLABORATION;
    }

    return ExecutionStrategy.SEQUENTIAL_COLLABORATION;
  }

  private estimateCost(
    classification: ClassificationResult,
    primaryPlugin: string,
    collaborationPlan?: CollaborationPlan
  ): number {
    // Base cost per model
    const costPerMinute = {
      opus: 0.01,
      sonnet: 0.005,
      haiku: 0.001,
    };

    // Assume sonnet for most tasks
    const durationMinutes = collaborationPlan
      ? collaborationPlan.estimatedDuration / 60000
      : classification.estimatedDuration / 60000;

    const agentCount = collaborationPlan
      ? collaborationPlan.phases.length * 2
      : 3;

    return durationMinutes * agentCount * costPerMinute.sonnet;
  }
}

// ============================================
// ROUTING ENGINE (MAIN CLASS)
// ============================================

export class RoutingEngine {
  private decisionEngine: RoutingDecisionEngine;
  private messageBus: MessageBus;

  constructor(messageBus?: MessageBus) {
    this.messageBus = messageBus || getMessageBus();
    const matcher = new CapabilityMatcher(this.messageBus);
    this.decisionEngine = new RoutingDecisionEngine(matcher);
  }

  registerPlugin(manifest: PluginManifest): void {
    const matcher = (this.decisionEngine as any).matcher as CapabilityMatcher;
    matcher.registerPlugin(manifest);
  }

  async route(request: UserRequest): Promise<RoutingDecision> {
    const decision = await this.decisionEngine.decide(request);

    // Publish routing decision to message bus
    await this.messageBus.publish({
      topic: 'routing/decision',
      messageType: 'event' as any,
      payload: decision,
    });

    return decision;
  }
}

// ============================================
// EXAMPLE USAGE
// ============================================

/**
 * Example usage:
 *
 * ```typescript
 * const messageBus = getMessageBus('jira-orchestrator');
 * const router = new RoutingEngine(messageBus);
 *
 * // Register plugins
 * router.registerPlugin({
 *   name: 'fastapi-backend',
 *   version: '1.0.0',
 *   capabilities: {
 *     domains: ['backend', 'api', 'database'],
 *     contexts: ['python', 'fastapi', 'mongodb'],
 *     patterns: ['rest-api', 'websocket'],
 *     integrations: ['keycloak', 'docker']
 *   },
 *   routing: {
 *     priority: 100,
 *     keywords: ['backend', 'api', 'fastapi'],
 *     contextPatterns: ['**\/*.py', '**/api/**']
 *   }
 * });
 *
 * // Route a request
 * const decision = await router.route({
 *   text: 'Build a FastAPI endpoint with MongoDB and Keycloak auth',
 *   budget: 0.50,
 *   maxDuration: 3600000
 * });
 *
 * console.log('Routing decision:', decision);
 * // {
 * //   primaryPlugin: 'fastapi-backend',
 * //   fallbackPlugins: ['lobbi-platform-manager', 'jira-orchestrator'],
 * //   executionStrategy: 'sequential_collaboration',
 * //   estimatedCost: 0.25,
 * //   estimatedDuration: 2700000
 * // }
 * ```
 */

# Codebase Onboarding Guide - Implementation Guide

This document explains how to implement and integrate the Codebase Onboarding Guide plugin into the Claude orchestration system.

## Architecture Overview

```
Plugin Architecture
│
├─ Plugin Manager (orchestration core)
│  └─ Registers plugin, handles lifecycle
│
├─ Workflow Engine
│  ├─ Parses YAML workflows
│  ├─ Coordinates agent execution
│  └─ Manages phase dependencies
│
├─ Agent System
│  ├─ Agent Registry (roster.json)
│  ├─ Agent Executor
│  └─ Communication Bus
│
└─ Output Generators
   ├─ Markdown Generator
   ├─ Diagram Renderer
   └─ Export Adapters
```

## Implementation Steps

### 1. Plugin Registration

The plugin registers with the orchestration system on startup.

**File:** `src/plugin.ts`

```typescript
import { Plugin, PluginMetadata } from '@claude/orchestration';
import metadata from './plugin.json';
import { AgentRoster } from './agents/roster.json';
import { FullOnboardingWorkflow } from './workflows/full-onboarding.yaml';
import { FeatureExplanationWorkflow } from './workflows/feature-explanation.yaml';

export class CodebaseOnboardingGuidePlugin extends Plugin {
  constructor() {
    super(metadata as PluginMetadata);
  }

  async initialize(): Promise<void> {
    // Register agents
    for (const agent of AgentRoster.agents) {
      this.registerAgent(agent);
    }

    // Register workflows
    this.registerWorkflow('full-onboarding', FullOnboardingWorkflow);
    this.registerWorkflow('feature-explanation', FeatureExplanationWorkflow);

    // Register keyword triggers
    this.registerTriggers(metadata.triggers);

    console.log(`[${this.callsign}] Plugin initialized`);
  }

  async activate(context: ExecutionContext): Promise<void> {
    const { trigger, params } = context;

    if (this.matchesWorkflow('full-onboarding', trigger)) {
      return this.executeWorkflow('full-onboarding', params);
    }

    if (this.matchesWorkflow('feature-explanation', trigger)) {
      return this.executeWorkflow('feature-explanation', params);
    }
  }
}
```

### 2. Agent Implementation

Each agent implements the `IAgent` interface.

**File:** `src/agents/ArchitectAgent.ts`

```typescript
import { Agent, AgentReport, Codebase } from '@claude/orchestration';
import { ArchitectureAnalyzer } from '../analyzers/architecture';
import { DiagramGenerator } from '../generators/diagrams';

export class ArchitectAgent extends Agent {
  id = 'architect';
  name = 'Architecture Analyst';
  callsign = 'Architect';

  async execute(context: AgentContext): Promise<AgentReport> {
    const { codebasePath, sharedContext } = context;

    // 1. Scan codebase
    const codebase = await this.scanCodebase(codebasePath);

    // 2. Analyze architecture
    const analyzer = new ArchitectureAnalyzer();
    const architecture = await analyzer.analyze(codebase);

    // 3. Generate diagram
    const diagram = await DiagramGenerator.createArchitectureDiagram(architecture);

    // 4. Create outputs
    await this.writeOutput('architecture-overview.md', this.formatOverview(architecture));
    await this.writeOutput('architecture-diagram.mermaid', diagram);
    await this.writeOutput('tech-stack.json', JSON.stringify(architecture.techStack, null, 2));

    // 5. Share context with other agents
    sharedContext.set('architecture', architecture);

    return {
      agentId: this.id,
      agentName: this.name,
      timestamp: new Date(),
      phase: 'discovery',
      status: 'success',
      findings: {
        architecturePattern: architecture.pattern,
        layers: architecture.layers.length,
        components: architecture.components.length,
        techStack: architecture.techStack
      },
      outputs: [
        { path: 'architecture-overview.md', type: 'markdown', description: 'Architecture overview' },
        { path: 'architecture-diagram.mermaid', type: 'mermaid', description: 'Architecture diagram' },
        { path: 'tech-stack.json', type: 'json', description: 'Technology stack' }
      ]
    };
  }

  private async scanCodebase(path: string): Promise<Codebase> {
    // Implementation using file system scanning
    // Returns structured codebase representation
  }

  private formatOverview(architecture: Architecture): string {
    return `
# Architecture Overview

**Pattern:** ${architecture.pattern}

${architecture.summary}

## Layers

${architecture.layers.map(layer => `
### ${layer.name}
${layer.description}

**Responsibilities:**
${layer.responsibilities.map(r => `- ${r}`).join('\n')}
`).join('\n')}
    `.trim();
  }
}
```

### 3. Workflow Execution

The workflow engine orchestrates agent execution.

**File:** `src/workflow/WorkflowExecutor.ts`

```typescript
import { Workflow, Phase, AgentContext } from '@claude/orchestration';

export class WorkflowExecutor {
  async execute(workflow: Workflow, params: WorkflowParams): Promise<WorkflowResult> {
    const context = this.createContext(params);
    const results: PhaseResult[] = [];

    for (const phase of workflow.phases) {
      console.log(`[${workflow.name}] Starting phase: ${phase.name}`);

      const phaseResult = await this.executePhase(phase, context);
      results.push(phaseResult);

      if (!phaseResult.success && phase.required !== false) {
        throw new Error(`Phase ${phase.name} failed`);
      }

      // Update shared context
      context.mergeResults(phaseResult);
    }

    return {
      success: true,
      phases: results,
      outputs: this.collectOutputs(results)
    };
  }

  private async executePhase(phase: Phase, context: WorkflowContext): Promise<PhaseResult> {
    const agentPromises = phase.agents.map(agentSpec => {
      const agent = this.agentRegistry.get(agentSpec.id);
      const agentContext: AgentContext = {
        ...context,
        phase: phase.name,
        tasks: agentSpec.tasks,
        inputs: this.resolveInputs(agentSpec.inputs, context)
      };

      return agent.execute(agentContext);
    });

    // Execute agents (parallel or sequential based on coordination setting)
    const reports = phase.coordination === 'parallel'
      ? await Promise.all(agentPromises)
      : await this.executeSequential(agentPromises);

    return {
      phaseName: phase.name,
      success: reports.every(r => r.status === 'success'),
      agentReports: reports,
      duration: Date.now() - phase.startTime
    };
  }
}
```

### 4. Analyzers

Specialized analyzers extract information from code.

**File:** `src/analyzers/architecture/ArchitectureAnalyzer.ts`

```typescript
import { Codebase, Architecture } from '../../interfaces/types';
import { PatternDetector } from './PatternDetector';
import { LayerIdentifier } from './LayerIdentifier';
import { ComponentMapper } from './ComponentMapper';

export class ArchitectureAnalyzer {
  async analyze(codebase: Codebase): Promise<Architecture> {
    // 1. Detect architecture pattern
    const pattern = await PatternDetector.detect(codebase);

    // 2. Identify layers
    const layers = await LayerIdentifier.identify(codebase, pattern);

    // 3. Map components
    const components = await ComponentMapper.map(codebase, layers);

    // 4. Find external dependencies
    const externalDeps = await this.findExternalDependencies(codebase);

    // 5. Generate summary
    const summary = this.generateSummary(pattern, layers, components);

    return {
      pattern,
      layers,
      components,
      externalDependencies: externalDeps,
      summary,
      keyCharacteristics: this.identifyCharacteristics(codebase, pattern)
    };
  }

  private async findExternalDependencies(codebase: Codebase): Promise<ExternalDependency[]> {
    const packageJson = await codebase.readFile('package.json');
    if (!packageJson) return [];

    const pkg = JSON.parse(packageJson);
    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };

    return Object.entries(dependencies).map(([name, version]) => ({
      name,
      version: version as string,
      purpose: this.guessPurpose(name),
      category: pkg.dependencies[name] ? 'runtime' : 'dev'
    }));
  }
}
```

**File:** `src/analyzers/architecture/PatternDetector.ts`

```typescript
export class PatternDetector {
  static async detect(codebase: Codebase): Promise<ArchitecturePattern> {
    const indicators = {
      mvc: 0,
      microservices: 0,
      layered: 0,
      // ... other patterns
    };

    // Check directory structure
    if (codebase.hasDirectory('controllers') && codebase.hasDirectory('views')) {
      indicators.mvc += 0.5;
    }

    if (codebase.hasDirectory('services') && codebase.hasDirectory('repositories')) {
      indicators.layered += 0.5;
    }

    // Check for microservices indicators
    const serviceCount = codebase.directories.filter(d =>
      d.includes('service') || d.includes('microservice')
    ).length;
    if (serviceCount > 3) {
      indicators.microservices += 0.5;
    }

    // Check configuration files
    if (codebase.hasFile('docker-compose.yml')) {
      const content = await codebase.readFile('docker-compose.yml');
      const serviceDefinitions = (content.match(/^\s{2}\w+:/gm) || []).length;
      if (serviceDefinitions > 3) {
        indicators.microservices += 0.3;
      }
    }

    // Return pattern with highest score
    const [pattern, score] = Object.entries(indicators)
      .sort(([, a], [, b]) => b - a)[0];

    return score > 0.5 ? pattern as ArchitecturePattern : 'mixed';
  }
}
```

### 5. Diagram Generation

**File:** `src/generators/diagrams/MermaidGenerator.ts`

```typescript
import { Architecture, DiagramDefinition } from '../../interfaces/types';

export class MermaidGenerator {
  static createArchitectureDiagram(architecture: Architecture): DiagramDefinition {
    const layers = architecture.layers;

    let mermaid = `graph TB\n`;

    // Add layers
    layers.forEach((layer, index) => {
      mermaid += `    ${layer.name}[${layer.name}]\n`;

      // Add dependencies between layers
      if (index > 0 && layer.dependsOn.includes(layers[index - 1].name)) {
        mermaid += `    ${layer.name} --> ${layers[index - 1].name}\n`;
      }
    });

    // Add styling
    mermaid += `\n    classDef layerStyle fill:#e1f5ff,stroke:#01579b,stroke-width:2px\n`;
    layers.forEach(layer => {
      mermaid += `    class ${layer.name} layerStyle\n`;
    });

    return {
      type: 'architecture',
      format: 'mermaid',
      title: 'System Architecture',
      content: mermaid
    };
  }

  static createSequenceDiagram(flow: CodeFlow): DiagramDefinition {
    let mermaid = `sequenceDiagram\n`;

    const participants = new Set<string>();
    flow.steps.forEach(step => participants.add(step.component));

    // Add participants
    participants.forEach(p => {
      mermaid += `    participant ${p}\n`;
    });

    mermaid += `\n`;

    // Add interactions
    flow.steps.forEach((step, index) => {
      if (index === 0) {
        mermaid += `    activate ${step.component}\n`;
      }

      if (step.description) {
        mermaid += `    Note over ${step.component}: ${step.description}\n`;
      }

      if (index < flow.steps.length - 1) {
        const nextStep = flow.steps[index + 1];
        mermaid += `    ${step.component}->>${nextStep.component}: ${step.outputData || 'data'}\n`;
      }
    });

    return {
      type: 'sequence',
      format: 'mermaid',
      title: flow.name,
      content: mermaid
    };
  }
}
```

### 6. Documentation Synthesis

**File:** `src/agents/SynthesizerAgent.ts`

```typescript
export class SynthesizerAgent extends Agent {
  async execute(context: AgentContext): Promise<AgentReport> {
    // Collect all outputs from previous phases
    const architecture = context.sharedContext.get('architecture');
    const navigation = context.sharedContext.get('navigation');
    const flows = context.sharedContext.get('flows');
    const glossary = context.sharedContext.get('glossary');
    const patterns = context.sharedContext.get('patterns');
    const tutorials = context.sharedContext.get('tutorials');

    // Generate main onboarding guide
    const onboardingGuide = await this.generateOnboardingGuide({
      architecture,
      navigation,
      flows,
      glossary,
      patterns,
      tutorials
    });

    // Generate quick start guide
    const quickStart = await this.generateQuickStart({
      architecture,
      navigation,
      tutorials
    });

    // Generate learning path
    const learningPath = await this.generateLearningPath({
      navigation,
      patterns,
      tutorials
    });

    // Write outputs
    await this.writeOutput('ONBOARDING-GUIDE.md', onboardingGuide);
    await this.writeOutput('GETTING-STARTED.md', quickStart);
    await this.writeOutput('learning-path.md', learningPath);

    return {
      agentId: this.id,
      status: 'success',
      outputs: [...]
    };
  }

  private async generateOnboardingGuide(data: AllFindings): Promise<string> {
    const template = await this.loadTemplate('onboarding-guide.template.md');
    return this.renderTemplate(template, data);
  }
}
```

### 7. Integration with Orchestration System

**File:** `src/index.ts`

```typescript
import { PluginRegistry } from '@claude/orchestration';
import { CodebaseOnboardingGuidePlugin } from './plugin';

// Register plugin on system startup
export function registerPlugin(registry: PluginRegistry): void {
  const plugin = new CodebaseOnboardingGuidePlugin();
  registry.register(plugin);
}

// Export for direct use
export { CodebaseOnboardingGuidePlugin };
export * from './interfaces/types';
```

## Testing Strategy

### Unit Tests

Test individual agents and analyzers:

```typescript
// tests/unit/agents/ArchitectAgent.test.ts
describe('ArchitectAgent', () => {
  it('should detect MVC architecture pattern', async () => {
    const codebase = mockCodebase({
      directories: ['controllers', 'models', 'views']
    });

    const agent = new ArchitectAgent();
    const report = await agent.execute(mockContext(codebase));

    expect(report.findings.architecturePattern).toBe('mvc');
  });

  it('should identify all layers', async () => {
    // ...
  });
});
```

### Integration Tests

Test full workflows:

```typescript
// tests/integration/workflows/FullOnboarding.test.ts
describe('Full Onboarding Workflow', () => {
  it('should generate complete onboarding guide', async () => {
    const plugin = new CodebaseOnboardingGuidePlugin();

    const result = await plugin.activate({
      trigger: '/onboard',
      params: {
        codebasePath: './test-fixtures/sample-app',
        outputPath: './test-output/',
        depth: 'standard'
      }
    });

    expect(result.success).toBe(true);
    expect(result.outputs).toContainFile('ONBOARDING-GUIDE.md');
    expect(result.outputs).toContainFile('GETTING-STARTED.md');
  });
});
```

### End-to-End Tests

Test with real codebases:

```typescript
// tests/e2e/RealCodebases.test.ts
describe('Real Codebase Analysis', () => {
  it('should analyze Next.js application', async () => {
    const result = await plugin.onboard({
      codebasePath: './test-fixtures/nextjs-app'
    });

    expect(result.guide.architecture.framework).toBe('nextjs');
    expect(result.guide.navigation.features).toContain('App Router');
  });
});
```

## Performance Optimization

### Caching Strategy

```typescript
// src/cache/AnalysisCache.ts
export class AnalysisCache {
  private cache = new Map<string, CacheEntry>();

  async get<T>(key: string, generator: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);

    if (cached && !this.isStale(cached)) {
      return cached.value as T;
    }

    const value = await generator();
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    return value;
  }

  private isStale(entry: CacheEntry): boolean {
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - entry.timestamp > MAX_AGE;
  }
}
```

### Parallel Processing

```typescript
// Process multiple files in parallel
const fileAnalyses = await Promise.all(
  files.map(file => this.analyzeFile(file))
);

// Use worker threads for CPU-intensive tasks
const worker = new Worker('./analyzers/complexity-worker.js');
const complexity = await worker.analyze(file);
```

## Deployment

### NPM Package

```json
{
  "name": "@claude/plugin-codebase-onboarding-guide",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "agents/",
    "workflows/",
    "interfaces/",
    "plugin.json"
  ],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublish": "npm run build"
  }
}
```

### Docker Container

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

CMD ["node", "dist/index.js"]
```

## Configuration Management

### Environment Variables

```bash
# .env
ONBOARDING_ANALYSIS_DEPTH=standard
ONBOARDING_OUTPUT_PATH=docs/onboarding/
ONBOARDING_INCLUDE_DIAGRAMS=true
ONBOARDING_CACHE_ENABLED=true
OBSIDIAN_VAULT_PATH=/path/to/vault
```

### Runtime Configuration

```typescript
const config = {
  analysisDepth: process.env.ONBOARDING_ANALYSIS_DEPTH || 'standard',
  outputPath: process.env.ONBOARDING_OUTPUT_PATH || 'docs/onboarding/',
  includeDiagrams: process.env.ONBOARDING_INCLUDE_DIAGRAMS !== 'false',
  cacheEnabled: process.env.ONBOARDING_CACHE_ENABLED !== 'false'
};
```

## Monitoring & Metrics

```typescript
// src/metrics/MetricsCollector.ts
export class MetricsCollector {
  trackOnboarding(result: OnboardingResult): void {
    this.increment('onboarding.sessions.total');
    this.gauge('onboarding.files_analyzed', result.metrics.filesAnalyzed);
    this.histogram('onboarding.processing_time', result.metrics.processingTime);
    this.gauge('onboarding.diagrams_generated', result.metrics.diagramsGenerated);
  }

  trackAgentExecution(agent: string, duration: number): void {
    this.histogram(`agent.${agent}.duration`, duration);
  }
}
```

## Error Handling

```typescript
// src/errors/OnboardingError.ts
export class OnboardingError extends Error {
  constructor(
    message: string,
    public phase: string,
    public agent?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'OnboardingError';
  }
}

// Usage
try {
  await agent.execute(context);
} catch (error) {
  throw new OnboardingError(
    'Architecture analysis failed',
    'discovery',
    'architect',
    error
  );
}
```

## Extensibility

### Plugin Hooks

```typescript
export interface OnboardingPluginHooks {
  beforeAnalysis?(codebase: Codebase): Promise<void>;
  afterPhase?(phase: string, results: PhaseResult): Promise<void>;
  beforeSynthesis?(findings: AllFindings): Promise<AllFindings>;
  afterOnboarding?(guide: OnboardingGuide): Promise<void>;
}

// Usage
plugin.registerHook('afterOnboarding', async (guide) => {
  await exportToConfluence(guide);
});
```

### Custom Formatters

```typescript
export interface OutputFormatter {
  format(guide: OnboardingGuide): Promise<string>;
  extension: string;
}

// Register custom formatter
plugin.registerFormatter('pdf', new PDFFormatter());
plugin.registerFormatter('html', new HTMLFormatter());
```

## Next Steps

1. **Implement core agents** - Start with Architect and Navigator
2. **Build analyzers** - Pattern detection, file scanning
3. **Create workflow engine** - Phase coordination
4. **Develop generators** - Markdown, diagrams
5. **Add tests** - Unit, integration, E2E
6. **Optimize performance** - Caching, parallelization
7. **Document API** - TypeScript interfaces, examples
8. **Deploy** - NPM package, Docker container

## Resources

- **TypeScript Documentation:** https://www.typescriptlang.org/docs/
- **Mermaid Diagrams:** https://mermaid.js.org/
- **Node.js Workers:** https://nodejs.org/api/worker_threads.html
- **Jest Testing:** https://jestjs.io/docs/getting-started

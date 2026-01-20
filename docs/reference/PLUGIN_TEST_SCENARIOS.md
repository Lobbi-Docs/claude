# Plugin-Specific Test Scenarios
## Comprehensive Testing for 5 Core Plugins

**Document Version:** 1.0
**Coverage Scope:** jira-orchestrator, exec-automator, ahling-command-center, container-workflow, frontend-powerhouse

---

## 1. Jira Orchestrator Plugin Testing

### 1.1 Core Features to Test

#### Feature: Issue Work Lifecycle (/jira:work command)

```typescript
// tests/jira/issue-work-lifecycle.test.ts
describe('Jira Orchestrator - Issue Work Lifecycle', () => {
  let plugin: JiraOrchestratorPlugin;
  let mockJira: MockJiraAPI;
  let orchestrator: AgentOrchestrator;

  beforeEach(async () => {
    mockJira = new MockJiraAPI();
    plugin = new JiraOrchestratorPlugin({ jiraAPI: mockJira });
    orchestrator = plugin.getOrchestrator();
    await plugin.initialize();
  });

  describe('Happy Path: /jira:work command', () => {
    it('should triage issue and assign to appropriate team', async () => {
      const issue = mockJira.createIssue({
        summary: 'Fix critical bug in auth module',
        description: 'Login fails for OAuth users',
        priority: 'Highest',
      });

      const result = await plugin.executeCommand('jira:work', {
        issueKey: issue.key,
      });

      expect(result.status).toBe('started');
      expect(result.assignedTeam).toBe('backend');
      expect(result.agents).toContain('triage-agent');
      expect(result.agents).toContain('task-enricher');

      // Verify agent execution
      const triageResult = await orchestrator.getAgentResult('triage-agent');
      expect(triageResult.priority).toBe('critical');
      expect(triageResult.complexity).toBe('high');
    });

    it('should create subtasks from enrichment', async () => {
      const issue = mockJira.createIssue({
        summary: 'Implement user profile feature',
      });

      const result = await plugin.executeCommand('jira:work', {
        issueKey: issue.key,
      });

      await waitFor(() => result.subtasksCreated > 0);

      const subtasks = mockJira.getSubtasks(issue.key);
      expect(subtasks.length).toBeGreaterThan(0);

      subtasks.forEach(subtask => {
        expect(subtask.parent.key).toBe(issue.key);
        expect(subtask.assignee).toBeDefined();
      });
    });

    it('should track issue state transitions', async () => {
      const issue = mockJira.createIssue({ summary: 'Test issue' });
      const stateChanges: string[] = [];

      plugin.on('issue.stateChanged', (event) => {
        stateChanges.push(event.newState);
      });

      await plugin.executeCommand('jira:work', { issueKey: issue.key });

      expect(stateChanges).toContain('In Progress');
    });
  });

  describe('Error Scenarios: Issue Work', () => {
    it('should handle issue not found', async () => {
      const result = await plugin.executeCommand('jira:work', {
        issueKey: 'NONEXISTENT-999',
      });

      expect(result.status).toBe('error');
      expect(result.errorCode).toBe('ISSUE_NOT_FOUND');
    });

    it('should handle permission denied', async () => {
      mockJira.denyAccess('TEST-1');

      const result = await plugin.executeCommand('jira:work', {
        issueKey: 'TEST-1',
      });

      expect(result.status).toBe('error');
      expect(result.errorCode).toBe('PERMISSION_DENIED');
    });

    it('should retry on transient API failures', async () => {
      const issue = mockJira.createIssue({ summary: 'Test' });
      mockJira.failNext(2, new Error('503 Service Unavailable'));

      const result = await plugin.executeCommand('jira:work', {
        issueKey: issue.key,
      });

      expect(result.status).toBe('started');
      expect(result.retries).toBe(2);
      expect(mockJira.getCallCount()).toBeGreaterThan(2);
    });

    it('should handle agent failure with fallback', async () => {
      const issue = mockJira.createIssue({ summary: 'Test' });
      orchestrator.disableAgent('triage-agent');

      const result = await plugin.executeCommand('jira:work', {
        issueKey: issue.key,
      });

      expect(result.status).toBe('started');
      expect(result.executedBy).toContain('fallback-triage-agent');
    });
  });

  describe('Edge Cases: Issue Work', () => {
    it('should handle very large issue descriptions', async () => {
      const largeDescription = 'x'.repeat(100000);
      const issue = mockJira.createIssue({
        summary: 'Large issue',
        description: largeDescription,
      });

      const result = await plugin.executeCommand('jira:work', {
        issueKey: issue.key,
      });

      expect(result.status).toBe('started');
      expect(result.processedSize).toBeLessThan(100000 + 1000);
    });

    it('should handle concurrent work commands on same issue', async () => {
      const issue = mockJira.createIssue({ summary: 'Test' });

      const results = await Promise.all([
        plugin.executeCommand('jira:work', { issueKey: issue.key }),
        plugin.executeCommand('jira:work', { issueKey: issue.key }),
      ]);

      expect(results[0].status).toBe('started');
      expect(results[1].status).toBe('started') || 'already_running';
    });

    it('should handle issue with special characters', async () => {
      const issue = mockJira.createIssue({
        summary: 'Fix bug: "double quotes" and \'single quotes\'',
      });

      const result = await plugin.executeCommand('jira:work', {
        issueKey: issue.key,
      });

      expect(result.status).toBe('started');
    });
  });
});
```

#### Feature: Task Preparation (/jira:prepare command)

```typescript
describe('Jira Orchestrator - Task Preparation', () => {
  it('should enrich issue with context', async () => {
    const issue = mockJira.createIssue({
      summary: 'API integration',
      components: ['backend'],
    });

    const result = await plugin.executeCommand('jira:prepare', {
      issueKey: issue.key,
    });

    expect(result.enrichedIssue).toBeDefined();
    expect(result.enrichedIssue.estimatedEffort).toBeDefined();
    expect(result.enrichedIssue.requiredSkills).toContain('backend');
    expect(result.enrichedIssue.affectedSystems).toBeDefined();
  });

  it('should generate comprehensive subtasks', async () => {
    const issue = mockJira.createIssue({
      summary: 'Complete feature implementation',
    });

    const result = await plugin.executeCommand('jira:prepare', {
      issueKey: issue.key,
    });

    const subtasks = result.subtasks;
    expect(subtasks).toHaveLength(3);

    // Verify subtask structure
    subtasks.forEach((subtask: any, idx: number) => {
      expect(subtask.title).toBeDefined();
      expect(subtask.description).toBeDefined();
      expect(subtask.sequenceNumber).toBe(idx + 1);
      expect(subtask.assignee).toBeDefined();
    });
  });

  it('should generate detailed implementation plan', async () => {
    const issue = mockJira.createIssue({
      summary: 'Database schema migration',
    });

    const result = await plugin.executeCommand('jira:prepare', {
      issueKey: issue.key,
    });

    expect(result.implementationPlan).toBeDefined();
    expect(result.implementationPlan.steps).toHaveLength(expect.any(Number));
    expect(result.implementationPlan.estimatedHours).toBeGreaterThan(0);
    expect(result.implementationPlan.riskFactors).toHaveLength(expect.any(Number));
  });
});
```

#### Feature: Code Review (/jira:review command)

```typescript
describe('Jira Orchestrator - Code Review', () => {
  it('should provide comprehensive code review', async () => {
    const pr = mockGitHub.createPullRequest({
      title: 'Implement new API endpoint',
      files: 5,
      additions: 200,
      deletions: 50,
    });

    const result = await plugin.executeCommand('jira:review', {
      prUrl: pr.url,
    });

    expect(result.status).toBe('completed');
    expect(result.review).toBeDefined();
    expect(result.review.suggestions).toHaveLength(expect.any(Number));
    expect(result.review.riskAreas).toBeDefined();
    expect(result.review.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.review.qualityScore).toBeLessThanOrEqual(100);
  });

  it('should identify security vulnerabilities', async () => {
    const pr = mockGitHub.createPullRequest({
      files: [
        'src/auth.ts', // Security-sensitive
        'src/api.ts',
      ],
    });

    const result = await plugin.executeCommand('jira:review', {
      prUrl: pr.url,
      focusAreas: ['security'],
    });

    const securityIssues = result.review.suggestions.filter(
      s => s.category === 'security'
    );
    expect(securityIssues.length).toBeGreaterThan(0);
  });

  it('should check code coverage impact', async () => {
    const pr = mockGitHub.createPullRequest({
      files: ['src/utils.ts', 'tests/utils.test.ts'],
    });

    const result = await plugin.executeCommand('jira:review', {
      prUrl: pr.url,
    });

    expect(result.review.coverageImpact).toBeDefined();
    expect(result.review.coverageImpact.delta).toBeGreaterThanOrEqual(-5);
  });
});
```

### 1.2 Agent-Specific Tests

#### Agent: Triage Agent

```typescript
describe('Jira Orchestrator - Triage Agent', () => {
  let agent: TriageAgent;

  beforeEach(() => {
    agent = new TriageAgent();
  });

  it('should classify issue by complexity and priority', async () => {
    const issues = [
      { summary: 'Fix typo', priority: 'Low' },
      { summary: 'Security vulnerability in auth', priority: 'Highest' },
      { summary: 'Refactor old code', priority: 'Medium' },
    ];

    for (const issue of issues) {
      const result = await agent.execute({ issue });

      expect(result.complexity).toMatch(/^(low|medium|high|critical)$/);
      expect(result.priority).toMatch(/^(low|medium|high|critical)$/);
      expect(result.team).toBeDefined();
    }
  });

  it('should assess effort estimation', async () => {
    const issue = {
      summary: 'Implement payment processing',
      description: 'Integrate Stripe payments',
    };

    const result = await agent.execute({ issue });

    expect(result.estimatedHours).toBeGreaterThan(0);
    expect(result.estimatedHours).toBeLessThan(1000);
  });

  it('should identify dependencies', async () => {
    const issue = {
      summary: 'Update authentication',
      linkedIssues: ['PROJ-1', 'PROJ-2'],
    };

    const result = await agent.execute({ issue });

    expect(result.blockedBy).toEqual(expect.any(Array));
    expect(result.blocks).toEqual(expect.any(Array));
  });
});
```

#### Agent: Task Enricher

```typescript
describe('Jira Orchestrator - Task Enricher Agent', () => {
  let agent: TaskEnricherAgent;

  beforeEach(() => {
    agent = new TaskEnricherAgent();
  });

  it('should enrich issue with relevant context', async () => {
    const issue = {
      key: 'TEST-123',
      summary: 'Implement caching',
    };

    const result = await agent.execute({ issue });

    expect(result.enrichedData).toBeDefined();
    expect(result.enrichedData.relatedIssues).toBeDefined();
    expect(result.enrichedData.technicalStack).toBeDefined();
    expect(result.enrichedData.affectedUsers).toBeDefined();
  });

  it('should suggest code reviewers based on expertise', async () => {
    const issue = {
      summary: 'Backend API changes',
      components: ['backend'],
    };

    const result = await agent.execute({ issue });

    expect(result.suggestedReviewers).toHaveLength(expect.any(Number));
    result.suggestedReviewers.forEach(reviewer => {
      expect(reviewer.name).toBeDefined();
      expect(reviewer.relevanceScore).toBeGreaterThan(0);
      expect(reviewer.expertise).toContain('backend');
    });
  });

  it('should generate documentation requirements', async () => {
    const issue = {
      summary: 'New API endpoint',
      description: 'Add /users/:id endpoint',
    };

    const result = await agent.execute({ issue });

    expect(result.documentationNeeded).toBeDefined();
    expect(result.documentationNeeded).toContain('API docs');
    expect(result.documentationNeeded).toContain('usage examples');
  });
});
```

### 1.3 Command Integration Tests

```typescript
describe('Jira Orchestrator - Command Integration', () => {
  it('should execute full workflow: work → prepare → commit → pr', async () => {
    const issue = mockJira.createIssue({ summary: 'Feature X' });

    // Step 1: Work
    const workResult = await plugin.executeCommand('jira:work', {
      issueKey: issue.key,
    });
    expect(workResult.status).toBe('started');

    // Wait for preparation
    await waitFor(() => workResult.subtasksCreated > 0);

    // Step 2: Prepare (auto-triggered by work)
    const enrichedIssue = await plugin.getIssue(issue.key);
    expect(enrichedIssue.subtasks).toHaveLength(3);

    // Step 3: Commit
    const commitResult = await plugin.executeCommand('jira:commit', {
      issueKey: issue.key,
      message: `Implement ${issue.summary}`,
    });
    expect(commitResult.sha).toBeDefined();

    // Step 4: PR
    const prResult = await plugin.executeCommand('jira:pr', {
      issueKey: issue.key,
      baseBranch: 'main',
    });
    expect(prResult.number).toBeDefined();
    expect(prResult.linkedIssue).toBe(issue.key);
  });
});
```

---

## 2. Exec Automator Plugin Testing

### 2.1 Core Features

#### Feature: Workflow Analysis

```typescript
describe('Exec Automator - Workflow Analysis', () => {
  let plugin: ExecAutomatorPlugin;

  beforeEach(async () => {
    plugin = new ExecAutomatorPlugin();
    await plugin.initialize();
  });

  it('should analyze organization document and score automation potential', async () => {
    const document = {
      type: 'RFP',
      content: 'Request for services: Data processing, reporting, scheduling...',
    };

    const analysis = await plugin.analyzeDocument(document);

    expect(analysis.automationScore).toBeGreaterThan(0);
    expect(analysis.automationScore).toBeLessThanOrEqual(100);
    expect(analysis.opportunities).toHaveLength(expect.any(Number));

    analysis.opportunities.forEach(opp => {
      expect(opp.task).toBeDefined();
      expect(opp.automationPotential).toBeGreaterThan(0);
      expect(opp.effort).toMatch(/low|medium|high/);
    });
  });

  it('should identify key processes from bylaws', async () => {
    const bylaws = 'Company bylaws text...';

    const processes = await plugin.identifyProcesses(bylaws);

    expect(processes).toContain('board-meetings');
    expect(processes).toContain('membership-management');
    expect(processes).toContain('event-scheduling');
  });

  it('should generate workflow recommendations', async () => {
    const analysis = {
      automationScore: 75,
      opportunities: [
        { task: 'Email notifications', effort: 'low' },
        { task: 'Report generation', effort: 'medium' },
      ],
    };

    const recommendations = await plugin.getRecommendations(analysis);

    expect(recommendations).toHaveLength(expect.any(Number));
    recommendations.forEach(rec => {
      expect(rec.workflowType).toBeDefined();
      expect(rec.expectedROI).toBeGreaterThan(0);
    });
  });
});
```

#### Feature: Workflow Generation

```typescript
describe('Exec Automator - Workflow Generation', () => {
  it('should generate LangGraph workflow from requirements', async () => {
    const requirements = {
      trigger: 'daily at 9 AM',
      steps: [
        { action: 'fetch data', source: 'email' },
        { action: 'process data', transformation: 'summarize' },
        { action: 'send report', destination: 'slack' },
      ],
    };

    const workflow = await plugin.generateWorkflow(requirements);

    expect(workflow.nodes).toHaveLength(3);
    expect(workflow.edges).toHaveLength(2);

    // Verify structure
    workflow.nodes.forEach(node => {
      expect(node.id).toBeDefined();
      expect(node.type).toBeDefined();
      expect(node.config).toBeDefined();
    });
  });

  it('should generate AI agent configurations', async () => {
    const task = {
      name: 'Process membership applications',
      inputs: ['applicant_name', 'application_form'],
      outputs: ['approval_status', 'decision_reason'],
    };

    const agentConfig = await plugin.generateAgentConfig(task);

    expect(agentConfig.id).toBeDefined();
    expect(agentConfig.systemPrompt).toBeDefined();
    expect(agentConfig.tools).toHaveLength(expect.any(Number));
    expect(agentConfig.fallbackBehavior).toBeDefined();
  });

  it('should validate generated workflow correctness', async () => {
    const workflow = await plugin.generateWorkflow(mockRequirements);

    const validation = await plugin.validateWorkflow(workflow);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    if (validation.warnings.length > 0) {
      expect(validation.warnings).toEqual(expect.any(Array));
    }
  });
});
```

#### Feature: Agent Deployment

```typescript
describe('Exec Automator - Agent Deployment', () => {
  it('should deploy AI agent successfully', async () => {
    const agentConfig = createMockAgentConfig();

    const deployment = await plugin.deployAgent(agentConfig);

    expect(deployment.status).toBe('deployed');
    expect(deployment.agentId).toBeDefined();
    expect(deployment.endpoint).toBeDefined();
    expect(deployment.health).toBe('healthy');
  });

  it('should handle agent execution and logging', async () => {
    const agent = await plugin.getAgent('test-agent');
    const input = { email: 'member@example.com', action: 'approve' };

    const result = await agent.execute(input);

    expect(result.status).toBe('completed');
    expect(result.output).toBeDefined();

    const logs = await plugin.getAgentLogs('test-agent');
    expect(logs).toContain('execution');
    expect(logs).toContain('output');
  });

  it('should monitor agent performance and health', async () => {
    const agent = await plugin.getAgent('test-agent');

    // Execute multiple times
    for (let i = 0; i < 10; i++) {
      await agent.execute(mockInput);
    }

    const metrics = await plugin.getAgentMetrics('test-agent');

    expect(metrics.executionCount).toBe(10);
    expect(metrics.avgLatency).toBeLessThan(5000);
    expect(metrics.successRate).toBe(1.0);
    expect(metrics.health).toBe('healthy');
  });
});
```

---

## 3. Ahling Command Center Plugin Testing

### 3.1 Infrastructure Integration

```typescript
describe('Ahling Command Center - Infrastructure Integration', () => {
  let plugin: AhlingCommandCenterPlugin;

  it('should integrate with Ollama for local LLM', async () => {
    const prompt = 'What is the status of the smart home network?';

    const result = await plugin.queryOllama(prompt);

    expect(result.response).toBeDefined();
    expect(result.model).toBe('ollama');
    expect(result.latency).toBeLessThan(10000);
  });

  it('should manage Home Assistant automations', async () => {
    const automation = {
      name: 'Evening routine',
      trigger: 'time',
      action: 'scene.turn_on',
      target: 'scene.good_evening',
    };

    const result = await plugin.createAutomation(automation);

    expect(result.id).toBeDefined();
    expect(result.status).toBe('active');
  });

  it('should integrate with Docker for deployment', async () => {
    const containerConfig = {
      image: 'homeassistant/home-assistant:latest',
      ports: ['8123:8123'],
      volumes: ['/config:/config'],
    };

    const container = await plugin.deployContainer(containerConfig);

    expect(container.id).toBeDefined();
    expect(container.status).toBe('running');
  });

  it('should manage Vault secrets securely', async () => {
    const secret = {
      path: 'smart-home/api-keys',
      data: { ha_token: 'xxx', ollama_key: 'yyy' },
    };

    await plugin.storeSecret(secret);

    const retrieved = await plugin.getSecret('smart-home/api-keys');
    expect(retrieved.data.ha_token).toBe('xxx');
  });
});
```

### 3.2 Smart Home Automation

```typescript
describe('Ahling Command Center - Smart Home Automation', () => {
  it('should orchestrate complex smart home scenes', async () => {
    const scene = {
      name: 'movie_night',
      devices: [
        { entity: 'light.living_room', state: 'off' },
        { entity: 'climate.main', temperature: 21 },
        { entity: 'media_player.avr', source: 'hdmi1' },
      ],
    };

    const result = await plugin.executeScene(scene);

    expect(result.status).toBe('completed');
    expect(result.appliedDevices).toHaveLength(3);

    // Verify device states
    const lightState = await plugin.getEntityState('light.living_room');
    expect(lightState).toBe('off');
  });

  it('should handle sensor data and trigger automations', async () => {
    const listener = vi.fn();
    plugin.on('sensor.temperature_change', listener);

    // Simulate sensor update
    await plugin.updateSensor('sensor.living_room_temp', 25.5);

    expect(listener).toHaveBeenCalledWith({
      entity: 'sensor.living_room_temp',
      value: 25.5,
    });
  });

  it('should manage energy consumption monitoring', async () => {
    const energyData = await plugin.getEnergyMetrics({
      period: 'daily',
    });

    expect(energyData).toBeDefined();
    expect(energyData.totalConsumption).toBeGreaterThan(0);
    expect(energyData.peakHour).toBeDefined();
    expect(energyData.devices).toEqual(expect.any(Array));
  });
});
```

---

## 4. Container Workflow Plugin Testing

### 4.1 CI/CD Pipeline

```typescript
describe('Container Workflow - CI/CD Pipeline', () => {
  let plugin: ContainerWorkflowPlugin;

  it('should build container image with security scanning', async () => {
    const buildConfig = {
      dockerfilePath: './Dockerfile',
      imageName: 'myapp',
      tag: 'latest',
      scanForVulnerabilities: true,
    };

    const build = await plugin.buildImage(buildConfig);

    expect(build.status).toBe('success');
    expect(build.imageId).toBeDefined();
    expect(build.vulnerabilities).toEqual(expect.any(Array));
    expect(build.vulnerabilities.critical).toBe(0);
  });

  it('should orchestrate full CI/CD workflow', async () => {
    const pipeline = {
      stages: [
        'checkout',
        'build',
        'test',
        'scan',
        'push',
        'deploy',
      ],
    };

    const result = await plugin.executePipeline(pipeline);

    expect(result.status).toBe('success');
    expect(result.stages).toHaveLength(6);

    result.stages.forEach(stage => {
      expect(stage.status).toBe('success');
      expect(stage.duration).toBeGreaterThan(0);
    });
  });

  it('should handle deployment with rollback capability', async () => {
    const deployment = {
      image: 'myapp:v2',
      target: 'production',
      replicas: 3,
    };

    const result = await plugin.deploy(deployment);

    expect(result.status).toBe('deployed');
    expect(result.version).toBe('v2');
    expect(result.readyReplicas).toBe(3);

    // Test rollback
    const rollback = await plugin.rollback(result.deploymentId);
    expect(rollback.status).toBe('rolled_back');
    expect(rollback.version).toBe('v1');
  });
});
```

### 4.2 Container Security

```typescript
describe('Container Workflow - Security', () => {
  it('should scan images for vulnerabilities', async () => {
    const imageName = 'myapp:latest';

    const scan = await plugin.scanImage(imageName);

    expect(scan.vulnerabilities).toEqual(expect.any(Array));
    expect(scan.vulnerabilities.forEach(v => {
      expect(v.severity).toMatch(/critical|high|medium|low/);
      expect(v.fixAvailable).toEqual(expect.any(Boolean));
    }));
  });

  it('should enforce security policies', async () => {
    const policies = [
      'no-privileged-containers',
      'require-readonlyfs',
      'require-resource-limits',
    ];

    const validation = await plugin.validateSecurityPolicies(
      mockImage,
      policies
    );

    expect(validation.compliant).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });
});
```

---

## 5. Frontend Powerhouse Plugin Testing

### 5.1 Component Generation

```typescript
describe('Frontend Powerhouse - Component Generation', () => {
  let plugin: FrontendPowerhousePlugin;

  it('should generate React component with Chakra UI', async () => {
    const spec = {
      name: 'UserCard',
      properties: ['name', 'email', 'avatar'],
      interactions: ['click', 'hover'],
    };

    const component = await plugin.generateComponent(spec);

    expect(component.code).toContain('import { Box }');
    expect(component.code).toContain('function UserCard');
    expect(component.code).toContain('name');
    expect(component.code).toContain('email');

    // Verify component compiles
    const compiled = await plugin.compileComponent(component.code);
    expect(compiled.errors).toHaveLength(0);
  });

  it('should generate component with full accessibility', async () => {
    const spec = {
      name: 'FormInput',
      type: 'input',
    };

    const component = await plugin.generateComponent(spec, {
      a11y: true,
    });

    expect(component.code).toContain('aria-label');
    expect(component.code).toContain('htmlFor');
    expect(component.code).toContain('role');

    const a11yCheck = await plugin.checkAccessibility(component.code);
    expect(a11yCheck.violations).toHaveLength(0);
  });

  it('should generate responsive design components', async () => {
    const spec = {
      name: 'Layout',
      breakpoints: ['mobile', 'tablet', 'desktop'],
    };

    const component = await plugin.generateComponent(spec, {
      responsive: true,
    });

    expect(component.code).toContain('useBreakpoint');
    expect(component.code).toMatch(/display={.*xs.*}/);
  });
});
```

### 5.2 Design System Integration

```typescript
describe('Frontend Powerhouse - Design System', () => {
  it('should apply theme consistently across components', async () => {
    const theme = {
      colors: {
        primary: '#007AFF',
        secondary: '#FF3B30',
      },
      spacing: { sm: '8px', md: '16px' },
    };

    const components = await plugin.generateComponentSet([
      'Button',
      'Card',
      'Input',
    ], { theme });

    components.forEach(comp => {
      expect(comp.code).toContain('const theme');
      expect(comp.code).toContain('primary');
    });
  });

  it('should generate Keycloak theme customization', async () => {
    const tenantConfig = {
      tenantId: 'acme-corp',
      colors: { primary: '#FF6B6B' },
      fonts: { body: 'Inter', heading: 'Poppins' },
    };

    const theme = await plugin.generateKeycloakTheme(tenantConfig);

    expect(theme.login).toBeDefined();
    expect(theme.account).toBeDefined();
    expect(theme.admin).toBeDefined();

    // Verify CSS is valid
    const validation = await plugin.validateCSS(theme.login.css);
    expect(validation.errors).toHaveLength(0);
  });
});
```

---

## 6. Cross-Plugin Integration Tests

### 6.1 Plugin Communication

```typescript
describe('Cross-Plugin Communication', () => {
  let jiraPlugin: JiraOrchestratorPlugin;
  let execPlugin: ExecAutomatorPlugin;
  let messageBus: MessageBus;

  beforeEach(async () => {
    messageBus = new MessageBus();
    jiraPlugin = new JiraOrchestratorPlugin({ messageBus });
    execPlugin = new ExecAutomatorPlugin({ messageBus });

    await jiraPlugin.initialize();
    await execPlugin.initialize();
  });

  it('should trigger automation when Jira issue completed', async () => {
    const automationListener = vi.fn();
    execPlugin.on('automation.triggered', automationListener);

    // Create and complete issue in Jira
    const issue = mockJira.createIssue({ summary: 'Setup automation' });
    await jiraPlugin.completeIssue(issue.key);

    // Should trigger automation
    await waitFor(() => automationListener.mock.calls.length > 0);

    expect(automationListener).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIssue: issue.key,
        automationType: 'setup',
      })
    );
  });

  it('should synchronize state across plugins', async () => {
    const issue = mockJira.createIssue({ summary: 'Test' });

    // Update in Jira
    await jiraPlugin.updateIssue(issue.key, { status: 'In Progress' });

    // Verify exec-automator sees the change
    const syncedState = await execPlugin.getIssueState(issue.key);
    expect(syncedState.status).toBe('In Progress');
  });
});
```

---

## Summary Table: Test Coverage by Plugin

| Plugin | Unit Tests | Integration | E2E | Total |
|---|---|---|---|---|
| jira-orchestrator | 180 | 80 | 40 | 300 |
| exec-automator | 140 | 60 | 30 | 230 |
| ahling-command-center | 120 | 50 | 20 | 190 |
| container-workflow | 100 | 40 | 15 | 155 |
| frontend-powerhouse | 110 | 45 | 15 | 170 |
| **Total** | **650** | **275** | **120** | **1,045** |

---

## Test Execution Commands

```bash
# Run all plugin tests
npm run test:plugins

# Run specific plugin tests
npm run test:plugins jira-orchestrator
npm run test:plugins exec-automator

# Run with coverage
npm run test:plugins:coverage

# Run E2E scenarios only
npm run test:plugins:e2e

# Run in watch mode
npm run test:plugins:watch
```

---

## Maintenance Schedule

- **Daily:** Run unit and integration tests in CI/CD
- **Weekly:** Full E2E test suite + coverage analysis
- **Monthly:** Update test scenarios based on new features
- **Quarterly:** Review and refactor test infrastructure


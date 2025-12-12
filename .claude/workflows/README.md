# Workflows

This directory contains workflow definitions for orchestrating multiple AI agents.

## What are Workflows?

Workflows orchestrate multiple agents to accomplish complex tasks. A workflow defines:

- **Execution order** - Sequential or parallel agent execution
- **Dependencies** - Which agents must complete before others start
- **Error handling** - What to do when agents fail
- **Notifications** - Who to notify about workflow events
- **Observability** - Telemetry and monitoring

## Workflow Types

### Sequential Workflows

Execute agents one after another in a specific order.

**Example:** `ci-cd-workflow.json`
- Code review → Testing → Security scan → Build → Deploy

### Parallel Workflows

Execute multiple agents concurrently.

**Example:** `data-processing-workflow.json`
- Extract → Transform + Quality Check (parallel) → Load

### Hybrid Workflows

Combine sequential and parallel execution patterns.

## Workflow Configuration Schema

\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "id": "workflow-id",
  "name": "Workflow Name",
  "version": "1.0.0",
  "description": "Workflow description",
  "type": "sequential|parallel|hybrid",
  "agents": [
    {
      "id": "agent-id",
      "stage": "stage-name",
      "required": true,
      "timeout": 300,
      "retry": {
        "max_attempts": 2,
        "backoff": "exponential"
      },
      "dependencies": ["previous-agent-id"],
      "parallel": false,
      "conditions": {
        "branch": "main"
      }
    }
  ],
  "triggers": [
    {
      "type": "webhook|schedule|event",
      "event": "event.name",
      "conditions": {},
      "stages": ["stage1", "stage2"]
    }
  ],
  "notifications": [
    {
      "type": "email|slack",
      "recipients": [],
      "events": ["workflow.failed"]
    }
  ],
  "observability": {
    "telemetry_enabled": true,
    "log_level": "info",
    "metrics_enabled": true
  },
  "error_handling": {
    "on_failure": "stop|continue",
    "notification_required": true,
    "rollback_enabled": false
  }
}
\`\`\`

## Available Workflows

### CI/CD Workflow (`ci-cd-workflow.json`)

Automated continuous integration and deployment pipeline.

**Stages:**
1. **Review** - Code review agent checks pull request
2. **Test** - Testing agent runs test suites (parallel with security)
3. **Security** - Security scan agent checks for vulnerabilities (parallel with test)
4. **Build** - Build agent compiles and packages code
5. **Deploy** - Deploy agent deploys to Azure (only on main branch)

**Triggers:**
- Pull request opened (review, test, security, build)
- Push to main (all stages including deploy)

**Notifications:**
- Email on workflow failure/completion
- Slack on deployment completion

### Data Processing Workflow (`data-processing-workflow.json`)

ETL pipeline with AI-powered data quality checks.

**Stages:**
1. **Extract** - Data extraction from multiple sources
2. **Transform** - Data transformation using rules
3. **Quality Check** - AI-powered data quality validation
4. **Load** - Loading to Azure Synapse and Cosmos DB

**Triggers:**
- Daily at 2 AM UTC
- Azure Event Grid data arrival event

## Creating a New Workflow

1. **Define workflow purpose** and goals
2. **Identify required agents** and their order
3. **Create JSON configuration** following the schema
4. **Configure triggers** and notifications
5. **Test locally** with sample data
6. **Deploy** to Agent Studio

Example:

\`\`\`bash
# Create new workflow file
cat > my-workflow.json << EOF
{
  "id": "my-workflow",
  "name": "My Custom Workflow",
  "version": "1.0.0",
  "description": "Does something complex",
  "type": "sequential",
  "agents": [
    {
      "id": "agent-1",
      "stage": "step1",
      "required": true,
      "timeout": 300
    },
    {
      "id": "agent-2",
      "stage": "step2",
      "required": true,
      "timeout": 600,
      "dependencies": ["agent-1"]
    }
  ],
  "triggers": [{
    "type": "schedule",
    "cron": "0 * * * *"
  }]
}
EOF
\`\`\`

## Workflow Patterns

### Fan-Out Pattern

Execute multiple agents in parallel after a single agent.

\`\`\`
Agent A → Agent B1
       → Agent B2
       → Agent B3
\`\`\`

### Fan-In Pattern

Wait for multiple parallel agents before continuing.

\`\`\`
Agent A1 →
Agent A2 → Agent B
Agent A3 →
\`\`\`

### Conditional Execution

Execute agents based on conditions.

\`\`\`json
{
  "id": "conditional-agent",
  "conditions": {
    "branch": "main",
    "status": "success"
  }
}
\`\`\`

### Retry Pattern

Automatically retry failed agents with exponential backoff.

\`\`\`json
{
  "retry": {
    "max_attempts": 3,
    "backoff": "exponential",
    "initial_delay": 5
  }
}
\`\`\`

## Workflow Best Practices

1. **Idempotent operations** - Agents should be safe to retry
2. **Clear stage names** - Use descriptive stage identifiers
3. **Appropriate timeouts** - Set realistic timeout values
4. **Error handling** - Define clear failure strategies
5. **Monitoring** - Enable telemetry for all workflows
6. **Dependencies** - Minimize unnecessary dependencies
7. **Parallelization** - Run independent agents in parallel
8. **Notifications** - Alert on critical events

## Testing Workflows

Test workflows locally:

\`\`\`bash
# Using .NET service
cd services/dotnet
dotnet run --project AgentStudio.Api

# Execute workflow
curl -X POST http://localhost:5000/api/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "my-workflow",
    "parameters": {}
  }'
\`\`\`

## Monitoring Workflows

Monitor workflow execution through:

### Application Insights
- Workflow start/complete events
- Agent execution times
- Failure rates
- Custom metrics

### OpenTelemetry Traces
- Distributed tracing across agents
- Span details for each stage
- Performance bottlenecks
- Error stack traces

### Logs
- Structured workflow logs
- Agent execution logs
- Error details
- State transitions

## Workflow Execution States

- **Pending** - Workflow queued for execution
- **Running** - Workflow currently executing
- **Completed** - All agents completed successfully
- **Failed** - One or more required agents failed
- **Cancelled** - Workflow manually cancelled
- **Timeout** - Workflow exceeded maximum execution time

## Error Handling Strategies

### Stop on Failure

Stop workflow execution when any required agent fails.

\`\`\`json
{
  "error_handling": {
    "on_failure": "stop"
  }
}
\`\`\`

### Continue on Failure

Continue executing remaining agents even if some fail.

\`\`\`json
{
  "error_handling": {
    "on_failure": "continue"
  }
}
\`\`\`

### Rollback on Failure

Rollback changes made by previous agents.

\`\`\`json
{
  "error_handling": {
    "on_failure": "stop",
    "rollback_enabled": true
  }
}
\`\`\`

## Troubleshooting

### Workflow Not Starting

- Check trigger configuration
- Verify agent availability
- Review workflow logs
- Check permissions

### Agent Execution Timeout

- Increase timeout value
- Optimize agent performance
- Check resource limits
- Review agent logs

### Dependency Issues

- Verify agent IDs
- Check dependency chain
- Review execution order
- Test individual agents

### Performance Problems

- Identify bottlenecks with tracing
- Parallelize independent agents
- Optimize agent configurations
- Scale infrastructure

## Resources

- [Workflow Architecture](../docs/architecture.md)
- [Agent Configurations](../agents/README.md)
- [API Documentation](../docs/api.md)
- [Deployment Guide](../infra/README.md)

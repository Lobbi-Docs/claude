# example-skill

Example skill for workflow-automator that demonstrates domain-specific knowledge integration.

## Activation Triggers

This skill is activated when:
- Working with workflow automation files
- User mentions "workflow", "automation", or "process" in their request
- Context requires process orchestration expertise
- Task involves defining or modifying business workflows

### File Patterns

This skill recognizes:
- `*.workflow.json` - Workflow definition files
- `*.process.yaml` - Process configuration files
- `workflow.config.json` - Workflow configuration
- `automation/*.ts` - Automation scripts

## Domain Knowledge

### Core Concepts

1. **Workflow Definition**
   - Sequential and parallel task execution
   - Conditional branching and decision points
   - Error handling and retry mechanisms
   - State management and persistence

2. **Process Orchestration**
   - Task scheduling and dependency management
   - Resource allocation and optimization
   - Monitoring and observability
   - Event-driven architecture patterns

3. **Automation Patterns**
   - Trigger-based execution
   - Batch processing workflows
   - Real-time event processing
   - Human-in-the-loop workflows

### Industry Standards

- **BPMN 2.0** - Business Process Model and Notation
- **CMMN** - Case Management Model and Notation
- **DMN** - Decision Model and Notation

## Best Practices

### Workflow Design

1. **Keep workflows modular** - Break complex processes into reusable sub-workflows
2. **Implement idempotency** - Ensure tasks can be safely retried
3. **Add observability** - Include logging, metrics, and tracing
4. **Handle failures gracefully** - Define clear error handling and compensation logic

### Code Quality

- Use descriptive names for workflow steps
- Document decision points and business rules
- Version workflow definitions
- Test workflows with edge cases

### Performance Optimization

- Parallelize independent tasks
- Implement efficient state management
- Use appropriate timeout values
- Cache frequently accessed data

## Examples

<example>
Context: User needs to create a new workflow for data processing

user: "Help me create a workflow for processing customer data"

assistant: "I'll help you create a robust data processing workflow. Let me guide you through the key components:

1. **Input Validation Stage**
   - Validate data format and schema
   - Check for required fields
   - Log validation errors

2. **Transformation Stage**
   - Apply business rules
   - Normalize data formats
   - Enrich with external data

3. **Output Stage**
   - Write to destination
   - Generate reports
   - Send notifications

Would you like me to create the workflow definition file?"
</example>

<example>
Context: User wants to optimize an existing workflow

user: "My workflow is taking too long to complete"

assistant: "I'll analyze your workflow for optimization opportunities. Key areas to review:

1. **Identify bottlenecks** - Find tasks with longest duration
2. **Parallelize where possible** - Run independent tasks concurrently
3. **Optimize data access** - Reduce redundant queries
4. **Add caching** - Cache frequently accessed data

Let me review your workflow definition..."
</example>

## Related Skills

- **process-monitoring**: Workflow monitoring and alerting
- **data-pipeline**: Data transformation and ETL patterns
- **event-handling**: Event-driven architecture patterns

## References

- [Workflow Patterns](http://workflowpatterns.com/)
- [Temporal.io Documentation](https://docs.temporal.io/)
- [Apache Airflow Best Practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)

## Author

Created by Brookside BI as part of workflow-automator

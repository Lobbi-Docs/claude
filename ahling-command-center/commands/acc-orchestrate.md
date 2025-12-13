---
description: Run multi-agent workflows combining Ollama, AutoGen, Home Assistant, and knowledge systems
argument-hint: "<workflow-name> [--params JSON]"
allowed-tools: ["Bash", "Read", "Write"]
---

Execute complex multi-agent workflows that orchestrate multiple ACC services including Ollama for reasoning, knowledge graph for context, Home Assistant for actions, and agents for collaboration.

## Your Task

You are orchestrating multi-agent workflows across ACC infrastructure. Coordinate between LLMs, knowledge systems, smart home controls, and specialized agents to accomplish complex tasks.

## Arguments

- `workflow-name` (required): Workflow to execute (smart-home-routine, research-task, code-review, data-analysis)
- `--params` (optional): JSON parameters for the workflow
- `--agents` (optional): Comma-separated list of agents to use
- `--timeout` (optional): Workflow timeout in seconds (default: 300)

## Steps to Execute

### 1. Validate Workflow Infrastructure

```bash
validate_infrastructure() {
  echo "=== Validating Orchestration Infrastructure ==="
  echo ""

  ALL_OK=true

  # Ollama
  curl -s http://ollama.ahling.local:11434/api/tags > /dev/null && {
    echo "✅ Ollama: Available"
  } || {
    echo "❌ Ollama: Not available"
    ALL_OK=false
  }

  # Neo4j
  curl -s -u neo4j:${NEO4J_PASSWORD} \
    http://neo4j.ahling.local:7474/db/system/tx/commit > /dev/null && {
    echo "✅ Neo4j: Available"
  } || {
    echo "❌ Neo4j: Not available"
    ALL_OK=false
  }

  # Qdrant
  curl -s http://qdrant.ahling.local:6333/healthz > /dev/null && {
    echo "✅ Qdrant: Available"
  } || {
    echo "❌ Qdrant: Not available"
    ALL_OK=false
  }

  # Home Assistant
  curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "${HA_URL}/api/" > /dev/null && {
    echo "✅ Home Assistant: Available"
  } || {
    echo "❌ Home Assistant: Not available"
    ALL_OK=false
  }

  echo ""

  if [ "$ALL_OK" = "false" ]; then
    echo "❌ Infrastructure validation failed"
    exit 1
  fi

  echo "✅ All systems ready for orchestration"
}
```

### 2. Workflow: Smart Home Routine

```bash
workflow_smart_home_routine() {
  ROUTINE_NAME=$1
  PARAMS=$2

  echo "=== Workflow: Smart Home Routine ==="
  echo "Routine: $ROUTINE_NAME"
  echo ""

  # Step 1: Query current state from Home Assistant
  echo "Step 1: Gathering current state..."
  CURRENT_STATE=$(curl -s -H "Authorization: Bearer ${HA_TOKEN}" \
    "${HA_URL}/api/states")

  LIGHTS_ON=$(echo "$CURRENT_STATE" | jq '[.[] | select(.entity_id | startswith("light.")) | select(.state == "on")] | length')
  TEMPERATURE=$(echo "$CURRENT_STATE" | jq -r '.[] | select(.entity_id == "sensor.temperature") | .state')

  echo "  - Lights on: $LIGHTS_ON"
  echo "  - Temperature: ${TEMPERATURE}°C"
  echo ""

  # Step 2: Use Ollama to generate routine plan
  echo "Step 2: Generating routine plan with Ollama..."
  PROMPT="Based on this home state, create a ${ROUTINE_NAME} routine:
- Lights currently on: $LIGHTS_ON
- Temperature: ${TEMPERATURE}°C
- Time: $(date +'%H:%M')

Provide a JSON list of actions to execute."

  PLAN=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"llama2\",
      \"prompt\": \"$PROMPT\",
      \"stream\": false,
      \"format\": \"json\"
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "Generated plan:"
  echo "$PLAN" | jq '.'
  echo ""

  # Step 3: Execute actions via Home Assistant
  echo "Step 3: Executing actions..."

  echo "$PLAN" | jq -r '.actions[]' | while read action; do
    ENTITY=$(echo "$action" | jq -r '.entity')
    SERVICE=$(echo "$action" | jq -r '.service')
    DATA=$(echo "$action" | jq -r '.data')

    echo "  - Executing: $SERVICE on $ENTITY"

    curl -s -X POST \
      -H "Authorization: Bearer ${HA_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$DATA" \
      "${HA_URL}/api/services/$SERVICE" > /dev/null

    sleep 1
  done

  echo ""
  echo "✅ Routine complete"

  # Step 4: Log to knowledge graph
  echo "Step 4: Logging to knowledge graph..."
  CYPHER="CREATE (r:Routine {name:'$ROUTINE_NAME', timestamp:'$(date -Iseconds)', actions:$(echo "$PLAN" | jq -c '.actions')})"

  curl -s -X POST \
    -u neo4j:${NEO4J_PASSWORD} \
    -H "Content-Type: application/json" \
    -d "{\"statements\": [{\"statement\": \"$CYPHER\"}]}" \
    http://neo4j.ahling.local:7474/db/neo4j/tx/commit > /dev/null

  echo "✅ Logged to knowledge graph"
}
```

### 3. Workflow: Research Task with Multi-Agent Collaboration

```bash
workflow_research_task() {
  TOPIC=$1

  echo "=== Workflow: Multi-Agent Research ==="
  echo "Topic: $TOPIC"
  echo ""

  # Agent 1: Researcher (gathers information)
  echo "Agent 1: Researcher"
  echo "  Gathering information on $TOPIC..."

  RESEARCH=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"llama2\",
      \"prompt\": \"Research and summarize key information about: $TOPIC\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "  Research complete ($(echo "$RESEARCH" | wc -w) words)"
  echo ""

  # Store research in vector DB
  echo "  Storing in knowledge base..."
  EMBEDDING=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"nomic-embed-text\", \"prompt\": \"$RESEARCH\"}" \
    http://ollama.ahling.local:11434/api/embeddings | jq -r '.embedding')

  DOC_ID=$(echo -n "$TOPIC" | md5sum | cut -d' ' -f1)

  curl -s -X PUT \
    -H "Content-Type: application/json" \
    -d "{
      \"points\": [{
        \"id\": \"$DOC_ID\",
        \"vector\": $EMBEDDING,
        \"payload\": {
          \"topic\": \"$TOPIC\",
          \"content\": \"$RESEARCH\",
          \"timestamp\": \"$(date -Iseconds)\"
        }
      }]
    }" \
    http://qdrant.ahling.local:6333/collections/knowledge/points > /dev/null

  echo "  ✅ Stored in vector database"
  echo ""

  # Agent 2: Analyst (analyzes research)
  echo "Agent 2: Analyst"
  echo "  Analyzing research findings..."

  ANALYSIS=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"mistral\",
      \"prompt\": \"Analyze this research and provide key insights, pros/cons, and recommendations: $RESEARCH\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "  Analysis complete"
  echo ""

  # Agent 3: Summarizer (creates final report)
  echo "Agent 3: Summarizer"
  echo "  Creating executive summary..."

  SUMMARY=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"llama2\",
      \"prompt\": \"Create a concise executive summary combining this research and analysis: Research: $RESEARCH Analysis: $ANALYSIS\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo ""
  echo "=== Final Report ==="
  echo "$SUMMARY"
  echo ""

  # Save report
  REPORT_FILE="/tmp/research_${TOPIC// /_}_$(date +%Y%m%d).md"

  cat > "$REPORT_FILE" <<EOF
# Research Report: $TOPIC
Generated: $(date)

## Research Summary
$RESEARCH

## Analysis
$ANALYSIS

## Executive Summary
$SUMMARY
EOF

  echo "✅ Report saved: $REPORT_FILE"
}
```

### 4. Workflow: Automated Code Review

```bash
workflow_code_review() {
  FILE_PATH=$1

  echo "=== Workflow: Multi-Agent Code Review ==="
  echo "File: $FILE_PATH"
  echo ""

  if [ ! -f "$FILE_PATH" ]; then
    echo "Error: File not found: $FILE_PATH"
    exit 1
  fi

  CODE=$(cat "$FILE_PATH")

  # Agent 1: Security Reviewer
  echo "Agent 1: Security Reviewer"
  SECURITY_REVIEW=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"codellama\",
      \"prompt\": \"Review this code for security vulnerabilities and best practices:\n\n$CODE\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "  ✅ Security review complete"
  echo ""

  # Agent 2: Performance Reviewer
  echo "Agent 2: Performance Reviewer"
  PERFORMANCE_REVIEW=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"codellama\",
      \"prompt\": \"Review this code for performance issues and optimizations:\n\n$CODE\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "  ✅ Performance review complete"
  echo ""

  # Agent 3: Code Quality Reviewer
  echo "Agent 3: Code Quality Reviewer"
  QUALITY_REVIEW=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"codellama\",
      \"prompt\": \"Review this code for readability, maintainability, and best practices:\n\n$CODE\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo "  ✅ Quality review complete"
  echo ""

  # Synthesize reviews
  echo "Synthesizing reviews..."
  FINAL_REVIEW=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"llama2\",
      \"prompt\": \"Synthesize these code reviews into a comprehensive report with prioritized action items: Security: $SECURITY_REVIEW Performance: $PERFORMANCE_REVIEW Quality: $QUALITY_REVIEW\",
      \"stream\": false
    }" \
    http://ollama.ahling.local:11434/api/generate | jq -r '.response')

  echo ""
  echo "=== Code Review Report ==="
  echo "$FINAL_REVIEW"

  # Save report
  REVIEW_FILE="${FILE_PATH}.review.md"
  cat > "$REVIEW_FILE" <<EOF
# Code Review: $(basename $FILE_PATH)
Generated: $(date)

## Security Review
$SECURITY_REVIEW

## Performance Review
$PERFORMANCE_REVIEW

## Code Quality Review
$QUALITY_REVIEW

## Summary & Recommendations
$FINAL_REVIEW
EOF

  echo ""
  echo "✅ Review saved: $REVIEW_FILE"
}
```

### 5. Workflow: Data Analysis Pipeline

```bash
workflow_data_analysis() {
  DATA_FILE=$1

  echo "=== Workflow: Multi-Stage Data Analysis ==="
  echo "Data: $DATA_FILE"
  echo ""

  # Stage 1: Data Exploration
  echo "Stage 1: Data Exploration"
  # Analyze data structure, statistics, patterns

  # Stage 2: Hypothesis Generation
  echo "Stage 2: Hypothesis Generation with Ollama"
  # Use LLM to suggest hypotheses based on data

  # Stage 3: Statistical Analysis
  echo "Stage 3: Statistical Analysis"
  # Run statistical tests

  # Stage 4: Visualization
  echo "Stage 4: Visualization"
  # Generate charts and graphs

  # Stage 5: Insight Extraction
  echo "Stage 5: Insight Extraction with Ollama"
  # Use LLM to interpret results and generate insights

  echo "✅ Analysis complete"
}
```

### 6. Monitor Workflow Execution

```bash
monitor_workflow() {
  WORKFLOW_ID=$1

  echo "=== Monitoring Workflow: $WORKFLOW_ID ==="
  echo "Press Ctrl+C to stop"
  echo ""

  while true; do
    # Query Neo4j for workflow status
    STATUS=$(curl -s -X POST \
      -u neo4j:${NEO4J_PASSWORD} \
      -H "Content-Type: application/json" \
      -d "{\"statements\": [{\"statement\": \"MATCH (w:Workflow {id:'$WORKFLOW_ID'}) RETURN w.status, w.progress\"}]}" \
      http://neo4j.ahling.local:7474/db/neo4j/tx/commit | \
      jq -r '.results[0].data[0].row')

    clear
    echo "Workflow: $WORKFLOW_ID"
    echo "Status: $(echo "$STATUS" | jq -r '.[0]')"
    echo "Progress: $(echo "$STATUS" | jq -r '.[1]')%"

    sleep 2
  done
}
```

## Usage Examples

### Smart home routine
```
/acc:orchestrate smart-home-routine --params '{"routine":"morning"}'
```

### Research task
```
/acc:orchestrate research-task "large language models"
```

### Code review
```
/acc:orchestrate code-review src/main.py
```

### Data analysis
```
/acc:orchestrate data-analysis data.csv
```

### Monitor workflow
```
/acc:orchestrate monitor workflow-123
```

## Expected Outputs

### Smart Home Routine
```
=== Workflow: Smart Home Routine ===
Routine: morning

Step 1: Gathering current state...
  - Lights on: 0
  - Temperature: 18°C

Step 2: Generating routine plan with Ollama...
Generated plan:
{
  "actions": [
    {"entity": "light.bedroom", "service": "light/turn_on", "data": {"brightness": 50}},
    {"entity": "climate.thermostat", "service": "climate/set_temperature", "data": {"temperature": 21}},
    {"entity": "cover.bedroom_blinds", "service": "cover/open", "data": {}}
  ]
}

Step 3: Executing actions...
  - Executing: light/turn_on on light.bedroom
  - Executing: climate/set_temperature on climate.thermostat
  - Executing: cover/open on cover.bedroom_blinds

✅ Routine complete

Step 4: Logging to knowledge graph...
✅ Logged to knowledge graph
```

### Research Task
```
=== Workflow: Multi-Agent Research ===
Topic: quantum computing

Agent 1: Researcher
  Gathering information on quantum computing...
  Research complete (450 words)
  Storing in knowledge base...
  ✅ Stored in vector database

Agent 2: Analyst
  Analyzing research findings...
  Analysis complete

Agent 3: Summarizer
  Creating executive summary...

=== Final Report ===
[Executive summary content]

✅ Report saved: /tmp/research_quantum_computing_20251213.md
```

## Success Criteria

- All infrastructure components are available
- Workflows execute without errors
- Agents collaborate effectively
- Results are logged to knowledge graph
- Final reports are generated
- Multi-step orchestration completes successfully

## Notes

- Workflows can take several minutes to complete
- Use timeouts to prevent hanging
- Log all workflow steps to Neo4j for auditability
- Monitor resource usage during complex workflows
- Chain multiple LLM calls for better results
- Use specialized models for specific tasks (codellama for code)
- Store intermediate results in knowledge base
- Consider parallel execution for independent tasks
- Test workflows on small datasets first

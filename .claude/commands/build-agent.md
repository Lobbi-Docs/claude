# Build Agent Images

Build Docker images for Golden Armada agents.

## Instructions

Build Docker images for the specified agent or all agents.

### Build All Agents

\`\`\`bash
# Build all agent images in parallel
docker build -f deployment/docker/claude/Dockerfile -t golden-armada/claude-agent:latest . &
docker build -f deployment/docker/gemini/Dockerfile -t golden-armada/gemini-agent:latest . &
docker build -f deployment/docker/gpt/Dockerfile -t golden-armada/gpt-agent:latest . &
docker build -f deployment/docker/ollama/Dockerfile -t golden-armada/ollama-agent:latest . &
docker build -f deployment/docker/orchestrator/Dockerfile -t golden-armada/orchestrator:latest . &
wait
echo "All images built successfully"
\`\`\`

### Build Individual Agents

**Claude Agent:**
\`\`\`bash
docker build -f deployment/docker/claude/Dockerfile -t golden-armada/claude-agent:latest .
\`\`\`

**Gemini Agent:**
\`\`\`bash
docker build -f deployment/docker/gemini/Dockerfile -t golden-armada/gemini-agent:latest .
\`\`\`

**GPT Agent:**
\`\`\`bash
docker build -f deployment/docker/gpt/Dockerfile -t golden-armada/gpt-agent:latest .
\`\`\`

**Ollama Agent:**
\`\`\`bash
docker build -f deployment/docker/ollama/Dockerfile -t golden-armada/ollama-agent:latest .
\`\`\`

**Orchestrator:**
\`\`\`bash
docker build -f deployment/docker/orchestrator/Dockerfile -t golden-armada/orchestrator:latest .
\`\`\`

### Test Locally

\`\`\`bash
# Run Claude agent locally
docker run -p 8080:8080 \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  golden-armada/claude-agent:latest

# Test the endpoint
curl http://localhost:8080/health
\`\`\`

### Push to Registry

\`\`\`bash
# Tag and push to your registry
docker tag golden-armada/claude-agent:latest your-registry.io/golden-armada/claude-agent:latest
docker push your-registry.io/golden-armada/claude-agent:latest
\`\`\`

## Build Arguments

- `--no-cache` - Force rebuild without cache
- `--platform linux/amd64` - Build for specific platform
- `-t image:v1.0.0` - Tag with version

## Troubleshooting

If build fails:
1. Check Dockerfile syntax
2. Verify base image availability
3. Check network connectivity for pip/npm installs
4. Review build logs for specific errors

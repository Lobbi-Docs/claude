---
name: debugging
description: Debugging techniques for Python, JavaScript, and distributed systems. Activate for troubleshooting, error analysis, log investigation, and performance debugging.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Debugging Skill

Provides comprehensive debugging capabilities for the Golden Armada AI Agent Fleet Platform.

## When to Use This Skill

Activate this skill when working with:
- Error troubleshooting
- Log analysis
- Performance debugging
- Distributed system debugging
- Memory and resource issues

## Python Debugging

### pdb Debugger
\`\`\`python
# Insert breakpoint
import pdb; pdb.set_trace()

# Python 3.7+
breakpoint()

# Common pdb commands
# n(ext)     - Execute next line
# s(tep)     - Step into function
# c(ontinue) - Continue execution
# p expr     - Print expression
# pp expr    - Pretty print
# l(ist)     - Show source code
# w(here)    - Show stack trace
# q(uit)     - Quit debugger
\`\`\`

### Logging
\`\`\`python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('debug.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message", exc_info=True)
\`\`\`

### Exception Handling
\`\`\`python
import traceback

try:
    result = risky_operation()
except Exception as e:
    # Log full traceback
    logger.error(f"Operation failed: {e}")
    logger.error(traceback.format_exc())

    # Or get traceback as string
    tb = traceback.format_exception(type(e), e, e.__traceback__)
    error_details = ''.join(tb)
\`\`\`

## JavaScript/Node.js Debugging

### Console Methods
\`\`\`javascript
// Basic logging
console.log('Basic log');
console.error('Error message');
console.warn('Warning');

// Object inspection
console.dir(object, { depth: null });
console.table(array);

// Timing
console.time('operation');
// ... code ...
console.timeEnd('operation');

// Stack trace
console.trace('Trace point');

// Grouping
console.group('Group name');
console.log('Inside group');
console.groupEnd();
\`\`\`

### Node.js Inspector
\`\`\`bash
# Start with inspector
node --inspect app.js
node --inspect-brk app.js  # Break on first line

# Debug with Chrome DevTools
# Open chrome://inspect
\`\`\`

### VS Code Debug Configuration
\`\`\`json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Agent",
      "program": "${workspaceFolder}/src/index.js",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
\`\`\`

## Container Debugging

### Docker
\`\`\`bash
# View logs
docker logs <container> --tail=100 -f

# Execute shell
docker exec -it <container> /bin/sh

# Inspect container
docker inspect <container>

# Resource usage
docker stats <container>

# Debug running container
docker run -it --rm \
  --network=container:<target> \
  nicolaka/netshoot
\`\`\`

### Kubernetes
\`\`\`bash
# Pod logs
kubectl logs <pod> -n agents -f
kubectl logs <pod> -n agents --previous  # Previous crash

# Execute in pod
kubectl exec -it <pod> -n agents -- /bin/sh

# Debug with ephemeral container
kubectl debug <pod> -n agents -it --image=busybox

# Port forward for local debugging
kubectl port-forward <pod> 8080:8080 -n agents

# Events
kubectl get events -n agents --sort-by='.lastTimestamp'

# Resource usage
kubectl top pods -n agents
\`\`\`

## Log Analysis

### Pattern Matching
\`\`\`bash
# Search logs for errors
grep -i "error\|exception\|failed" app.log

# Count occurrences
grep -c "ERROR" app.log

# Context around matches
grep -B 5 -A 5 "OutOfMemory" app.log

# Filter by time range
awk '/2024-01-15 10:00/,/2024-01-15 11:00/' app.log
\`\`\`

### JSON Logs
\`\`\`bash
# Parse JSON logs with jq
cat app.log | jq 'select(.level == "error")'
cat app.log | jq 'select(.timestamp > "2024-01-15T10:00:00")'

# Extract specific fields
cat app.log | jq -r '[.timestamp, .level, .message] | @tsv'
\`\`\`

## Performance Debugging

### Python Profiling
\`\`\`python
# cProfile
import cProfile
cProfile.run('main()', 'output.prof')

# Line profiler
@profile
def slow_function():
    pass

# Memory profiler
from memory_profiler import profile

@profile
def memory_heavy():
    pass
\`\`\`

### Network Debugging
\`\`\`bash
# Check connectivity
ping <host>
telnet <host> <port>
nc -zv <host> <port>

# DNS resolution
nslookup <host>
dig <host>

# HTTP debugging
curl -v http://localhost:8080/health
curl -X POST -d '{"test": true}' -H "Content-Type: application/json" http://localhost:8080/api
\`\`\`

## Common Debug Checklist

1. **Check Logs**: Application, system, container logs
2. **Verify Configuration**: Environment variables, config files
3. **Test Connectivity**: Network, database, external services
4. **Check Resources**: CPU, memory, disk space
5. **Review Recent Changes**: Git log, deployment history
6. **Reproduce Locally**: Same environment, same data
7. **Binary Search**: Isolate the problem scope

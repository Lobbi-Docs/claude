# Code Execution Sandbox

A sandboxed environment for executing code safely.

## Features

- Python, JavaScript, and Bash execution
- Resource limits (CPU, memory, time)
- Output capture
- Security restrictions

## Usage

\`\`\`python
from code_exec import CodeExecutor

executor = CodeExecutor()
result = await executor.execute("print('Hello, World!')", language="python")
\`\`\`

## Safety

This is a stub implementation. Production use requires:
- Container isolation (Docker, gVisor, Firecracker)
- Network restrictions
- Filesystem access control
- Resource quotas

# File I/O Tool with Guards

A file I/O tool with security guards and access controls.

## Features

- Read/write operations
- Path validation and sandboxing
- Access control lists
- Operation logging
- Size limits

## Usage

\`\`\`python
from file_io import FileIOTool

file_tool = FileIOTool(base_path="/safe/directory")
content = await file_tool.read_file("data.txt")
await file_tool.write_file("output.txt", "content")
\`\`\`

## Security

- Path traversal protection
- Whitelist/blacklist patterns
- Size limits for reads/writes
- Operation auditing

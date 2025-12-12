# OpenAPI Tool Example

An example tool that integrates with OpenAPI/REST APIs.

## Features

- OpenAPI 3.0 specification parsing
- Automatic endpoint discovery
- Request validation
- Response handling

## Usage

\`\`\`python
from openapi_tool import OpenAPITool

tool = OpenAPITool("https://api.example.com/openapi.json")
result = await tool.call_endpoint("GET", "/users")
\`\`\`

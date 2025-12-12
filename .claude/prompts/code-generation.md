---
name: code-generation
category: code
description: Templates for generating new code
---

# Code Generation Prompts

## Flask Endpoint

\`\`\`
Create a Flask endpoint with the following specifications:

**Endpoint:** {{endpoint}}
**Method:** {{method}}
**Purpose:** {{purpose}}

Requirements:
- Proper error handling with try/except
- Input validation using request.get_json()
- Structured JSON response format
- Logging for debugging
- Type hints where appropriate

Follow the Golden Armada agent pattern:
- Return {"status": "...", "result": ...} for success
- Return {"error": "..."} with appropriate status code for failures
- Include health check if new file
\`\`\`

## Python Class

\`\`\`
Create a Python class with the following specifications:

**Class Name:** {{class_name}}
**Purpose:** {{purpose}}
**Methods:** {{methods}}

Requirements:
- Use dataclass or regular class as appropriate
- Include __init__ with type hints
- Add docstrings for class and public methods
- Implement __repr__ for debugging
- Use private methods (underscore prefix) for internal logic
- Follow single responsibility principle
\`\`\`

## Test Suite

\`\`\`
Create comprehensive tests for: {{target}}

Requirements:
- Use pytest framework
- Include fixtures for setup
- Test happy path scenarios
- Test error cases and edge cases
- Mock external dependencies
- Aim for >80% coverage
- Use parametrize for similar tests
- Include docstrings explaining test purpose
\`\`\`

## API Endpoint Implementation

\`\`\`
Implement the following API endpoint:

**OpenAPI Spec:**
{{openapi_spec}}

Requirements:
- Follow REST conventions
- Validate all inputs
- Return appropriate status codes
- Include error responses
- Add request/response logging
- Handle authentication if required
\`\`\`

## Database Model

\`\`\`
Create a database model for: {{entity}}

**Fields:**
{{fields}}

Requirements:
- Use SQLAlchemy declarative base
- Include appropriate indexes
- Add created_at/updated_at timestamps
- Implement soft delete if appropriate
- Add relationships as needed
- Include model validation
\`\`\`

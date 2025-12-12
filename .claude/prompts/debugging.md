---
name: debugging
category: debug
description: Templates for debugging and troubleshooting
---

# Debugging Prompts

## Error Analysis

\`\`\`
Analyze the following error:

**Error Message:**
{{error}}

**Stack Trace:**
{{traceback}}

**Context:**
{{context}}

Provide:
1. Root cause analysis
2. Why this error occurred
3. Specific fix with code example
4. How to prevent this in the future
5. Related issues to check
\`\`\`

## Production Incident

\`\`\`
Investigate production incident:

**Symptoms:**
{{symptoms}}

**Timeline:**
{{timeline}}

**Affected Services:**
{{services}}

Analysis steps:
1. Identify the immediate cause
2. Determine blast radius
3. Suggest mitigation steps
4. Propose permanent fix
5. Recommend monitoring additions
\`\`\`

## Performance Issue

\`\`\`
Debug performance issue:

**Symptom:** {{symptom}}
**Expected:** {{expected}}
**Actual:** {{actual}}

Investigation:
1. Identify bottleneck location
2. Analyze resource usage
3. Review recent changes
4. Check external dependencies
5. Propose optimization

Provide metrics-based recommendations.
\`\`\`

## Container/Pod Issues

\`\`\`
Debug Kubernetes pod issue:

**Pod Name:** {{pod_name}}
**Namespace:** {{namespace}}
**Status:** {{status}}

**kubectl describe output:**
{{describe_output}}

**Recent logs:**
{{logs}}

Diagnose:
1. Identify the failure reason
2. Check resource constraints
3. Verify configuration
4. Review dependencies
5. Suggest fix
\`\`\`

## API Error

\`\`\`
Debug API error:

**Endpoint:** {{endpoint}}
**Method:** {{method}}
**Request:**
{{request}}

**Response:**
{{response}}

**Status Code:** {{status_code}}

Analyze:
1. Validate request format
2. Check authentication
3. Verify business logic
4. Review error handling
5. Suggest fix
\`\`\`

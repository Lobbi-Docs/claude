---
name: confluence-docs
description: Templates and prompts for creating well-structured Confluence documentation
category: atlassian
---

# Confluence Documentation Prompts

## Architecture Document Template

\`\`\`xml
<ac:structured-macro ac:name="toc">
  <ac:parameter ac:name="maxLevel">3</ac:parameter>
</ac:structured-macro>

<h1>Overview</h1>
<p>Brief description of the system/component being documented.</p>

<ac:structured-macro ac:name="info">
  <ac:parameter ac:name="title">Document Info</ac:parameter>
  <ac:rich-text-body>
    <p><strong>Owner:</strong> [Team/Person]</p>
    <p><strong>Last Updated:</strong> [Date]</p>
    <p><strong>Status:</strong> <ac:structured-macro ac:name="status">
      <ac:parameter ac:name="colour">Green</ac:parameter>
      <ac:parameter ac:name="title">CURRENT</ac:parameter>
    </ac:structured-macro></p>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Architecture Diagram</h1>
<p><ac:image><ri:attachment ri:filename="architecture.png" /></ac:image></p>

<h1>Components</h1>
<table>
  <tr>
    <th>Component</th>
    <th>Purpose</th>
    <th>Technology</th>
    <th>Owner</th>
  </tr>
  <tr>
    <td>Component Name</td>
    <td>What it does</td>
    <td>Tech stack</td>
    <td>Team</td>
  </tr>
</table>

<h1>Data Flow</h1>
<p>Description of how data flows through the system.</p>

<h1>APIs</h1>
<h2>Endpoints</h2>
<table>
  <tr>
    <th>Method</th>
    <th>Endpoint</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>GET</td>
    <td>/health</td>
    <td>Health check endpoint</td>
  </tr>
</table>

<h1>Dependencies</h1>
<ul>
  <li>External service 1</li>
  <li>External service 2</li>
</ul>

<h1>Related Documentation</h1>
<ac:structured-macro ac:name="children">
  <ac:parameter ac:name="all">true</ac:parameter>
</ac:structured-macro>
\`\`\`

## Runbook Template

\`\`\`xml
<ac:structured-macro ac:name="warning">
  <ac:parameter ac:name="title">Production Runbook</ac:parameter>
  <ac:rich-text-body>
    <p>Follow all steps carefully. Contact on-call if issues arise.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>Owner:</strong> [Team]</p>
    <p><strong>Last Reviewed:</strong> [Date]</p>
    <p><strong>Next Review:</strong> [Date]</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Purpose</h1>
<p>What this runbook is for and when to use it.</p>

<h1>Prerequisites</h1>
<ul>
  <li>Access to Kubernetes cluster</li>
  <li>kubectl configured</li>
  <li>Required permissions</li>
</ul>

<h1>Procedure</h1>

<h2>Step 1: Verify Current State</h2>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
kubectl get pods -n agents
kubectl get svc -n agents
  ]]></ac:plain-text-body>
</ac:structured-macro>

<p><strong>Expected output:</strong> All pods should be Running.</p>

<h2>Step 2: Execute Action</h2>
<p>Description of what to do.</p>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
# Command to execute
helm upgrade golden-armada ./deployment/helm/golden-armada -n agents
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Step 3: Verify Success</h2>
<p>How to confirm the action was successful.</p>

<h1>Rollback</h1>
<ac:structured-macro ac:name="warning">
  <ac:rich-text-body>
    <p>Only execute rollback if Step 3 verification fails.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
helm rollback golden-armada -n agents
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h1>Troubleshooting</h1>
<ac:structured-macro ac:name="expand">
  <ac:parameter ac:name="title">Pod not starting</ac:parameter>
  <ac:rich-text-body>
    <p>Check pod events: <code>kubectl describe pod [name] -n agents</code></p>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Related Jira Issues</h1>
<ac:structured-macro ac:name="jira">
  <ac:parameter ac:name="jqlQuery">project = GA AND labels = runbook ORDER BY updated DESC</ac:parameter>
</ac:structured-macro>
\`\`\`

## API Documentation Template

\`\`\`xml
<ac:structured-macro ac:name="toc" />

<h1>API Overview</h1>
<p>Description of the API and its purpose.</p>

<h2>Base URL</h2>
<ac:structured-macro ac:name="code">
  <ac:plain-text-body><![CDATA[https://api.golden-armada.com/v1]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Authentication</h2>
<p>All requests require a Bearer token in the Authorization header:</p>
<ac:structured-macro ac:name="code">
  <ac:plain-text-body><![CDATA[Authorization: Bearer <token>]]></ac:plain-text-body>
</ac:structured-macro>

<h1>Endpoints</h1>

<h2>GET /health</h2>
<p>Health check endpoint to verify service status.</p>

<h3>Request</h3>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:plain-text-body><![CDATA[
curl -X GET https://api.golden-armada.com/v1/health
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h3>Response</h3>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z"
}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h3>Response Codes</h3>
<table>
  <tr><th>Code</th><th>Description</th></tr>
  <tr><td>200</td><td>Service is healthy</td></tr>
  <tr><td>503</td><td>Service is unhealthy</td></tr>
</table>

<h2>POST /task</h2>
<p>Submit a task to an agent.</p>

<h3>Request Body</h3>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "agent": "backend-developer",
  "message": "Implement rate limiting",
  "priority": "high"
}
  ]]></ac:plain-text-body>
</ac:structured-macro>

<h3>Parameters</h3>
<table>
  <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
  <tr><td>agent</td><td>string</td><td>Yes</td><td>Target agent name</td></tr>
  <tr><td>message</td><td>string</td><td>Yes</td><td>Task description</td></tr>
  <tr><td>priority</td><td>string</td><td>No</td><td>Task priority (low/medium/high)</td></tr>
</table>

<h1>Error Handling</h1>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">json</ac:parameter>
  <ac:plain-text-body><![CDATA[
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Agent not found",
    "details": {}
  }
}
  ]]></ac:plain-text-body>
</ac:structured-macro>
\`\`\`

## Meeting Notes Template

\`\`\`xml
<ac:structured-macro ac:name="info">
  <ac:rich-text-body>
    <p><strong>Date:</strong> [Date]</p>
    <p><strong>Time:</strong> [Time]</p>
    <p><strong>Attendees:</strong> [Names]</p>
    <p><strong>Facilitator:</strong> [Name]</p>
    <p><strong>Note Taker:</strong> [Name]</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Agenda</h1>
<ol>
  <li>Topic 1 (5 min)</li>
  <li>Topic 2 (10 min)</li>
  <li>Topic 3 (15 min)</li>
</ol>

<h1>Discussion</h1>

<h2>Topic 1</h2>
<p>Notes from discussion...</p>

<h2>Topic 2</h2>
<p>Notes from discussion...</p>

<h1>Decisions</h1>
<ul>
  <li>Decision 1 - rationale</li>
  <li>Decision 2 - rationale</li>
</ul>

<h1>Action Items</h1>
<table>
  <tr>
    <th>Action</th>
    <th>Owner</th>
    <th>Due Date</th>
    <th>Status</th>
  </tr>
  <tr>
    <td>Action description</td>
    <td>Name</td>
    <td>Date</td>
    <td><ac:structured-macro ac:name="status">
      <ac:parameter ac:name="colour">Yellow</ac:parameter>
      <ac:parameter ac:name="title">IN PROGRESS</ac:parameter>
    </ac:structured-macro></td>
  </tr>
</table>

<h1>Next Meeting</h1>
<p>Date: [Next meeting date]</p>
<p>Topics to cover: [Upcoming topics]</p>
\`\`\`

## Prompt: Generate Architecture Doc

\`\`\`
Based on this system description, generate a Confluence architecture document:

System: [system name]
Components: [list components]
Technologies: [tech stack]
Data flow: [describe data flow]

Generate Confluence storage format with:
1. Overview section
2. Architecture diagram placeholder
3. Components table
4. Data flow description
5. API endpoints table
6. Dependencies list
\`\`\`

## Prompt: Convert Markdown to Confluence

\`\`\`
Convert the following markdown to Confluence storage format:

[paste markdown content]

Requirements:
- Convert code blocks to ac:structured-macro code blocks
- Convert tables to HTML tables
- Add ac:structured-macro for info/warning panels
- Preserve heading hierarchy
\`\`\`

## Prompt: Generate Runbook from Commands

\`\`\`
Given these operational commands, generate a Confluence runbook:

Purpose: [what this runbook accomplishes]
Commands:
[paste commands]

Generate:
1. Purpose section
2. Prerequisites
3. Step-by-step procedure with code blocks
4. Verification steps
5. Rollback procedure
6. Troubleshooting section
\`\`\`

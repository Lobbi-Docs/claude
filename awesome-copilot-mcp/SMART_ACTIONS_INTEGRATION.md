# Integration with VS Code Smart Actions

This document explains how the awesome-copilot MCP server integrates with [VS Code Smart Actions](https://code.visualstudio.com/docs/copilot/copilot-smart-actions) to enhance your development workflow.

## Overview

VS Code Smart Actions provide AI-powered assistance for common development tasks directly in the editor. The awesome-copilot MCP server complements these actions by providing access to community-contributed prompts, instructions, and best practices that can enhance and customize the Smart Actions experience.

## Smart Actions Available in VS Code

### Code Generation & Documentation
- **Generate Documentation**: Right-click → Generate Code → Generate Docs
- **Generate Tests**: Right-click → Generate Code → Generate Tests
- **Generate Alt Text**: Code Action on Markdown images

### Code Understanding & Fixes
- **Explain Code**: Right-click → Explain
- **Fix Coding Errors**: Right-click → Generate Code → Fix
- **Fix Testing Errors**: Sparkle icon in Test Explorer or `/fixTestFailure` command
- **Fix Terminal Errors**: Sparkle icon in terminal gutter

### Code Quality
- **Review Code**: Right-click → Generate Code → Review
- **Rename Symbols**: AI-suggested names when renaming

### Git & Collaboration
- **Generate Commit Messages**: Sparkle icon in Source Control
- **Resolve Merge Conflicts**: Resolve Merge Conflict with AI button
- **Implement TODO Comments**: Code Action → Delegate to coding agent

### Search & Discovery
- **Semantic Search**: Search view with semantic search enabled
- **Search Settings with AI**: AI search toggle in Settings editor

## How Awesome Copilot Enhances Smart Actions

### 1. Enhanced Code Review

**Smart Action**: Right-click → Generate Code → Review

**Enhancement**: Use awesome-copilot to retrieve specialized code review instructions:

```typescript
// In your custom agent or chat
1. Use awesome_copilot_get_instruction with name "code-review"
2. Apply those guidelines when reviewing code
3. Smart Actions provides automated suggestions
4. Combine both for comprehensive review
```

### 2. Better Documentation Generation

**Smart Action**: Right-click → Generate Code → Generate Docs

**Enhancement**: Retrieve documentation prompts from awesome-copilot:

```typescript
// Get documentation prompts
awesome_copilot_get_prompt("documentation")
// Use the prompt to guide Smart Actions documentation generation
```

### 3. Improved Test Generation

**Smart Action**: Right-click → Generate Code → Generate Tests

**Enhancement**: Access testing best practices:

```typescript
// Get testing instructions
awesome_copilot_get_instruction("testing")
// Apply patterns when Smart Actions generates tests
```

### 4. Domain-Specific Fixes

**Smart Action**: Right-click → Generate Code → Fix

**Enhancement**: Find framework-specific fix patterns:

```typescript
// Search for framework-specific fix patterns
awesome_copilot_search("react error handling")
// Use patterns to enhance Smart Actions fixes
```

### 5. Enhanced Commit Messages

**Smart Action**: Sparkle icon in Source Control

**Enhancement**: Use commit message templates from awesome-copilot:

```typescript
// Get commit message templates
awesome_copilot_get_prompt("commit-messages")
// Apply templates when generating commit messages
```

## Custom Agent Examples

### Example 1: Enhanced Code Reviewer

```markdown
---
description: Code reviewer that combines Smart Actions with awesome-copilot resources
name: Enhanced Reviewer
tools: ['awesome-copilot/awesome_copilot_get_instruction', 'awesome-copilot/awesome_copilot_search']
---

# Enhanced Code Reviewer

When reviewing code:

1. First, retrieve code review instructions: `awesome_copilot_get_instruction("code-review")`
2. Use VS Code Smart Actions (Right-click → Generate Code → Review) for automated suggestions
3. Apply awesome-copilot guidelines to enhance the review
4. Combine both for comprehensive feedback
```

### Example 2: Documentation Generator

```markdown
---
description: Documentation generator using awesome-copilot prompts
name: Doc Generator
tools: ['awesome-copilot/awesome_copilot_get_prompt', 'awesome-copilot/awesome_copilot_search']
---

# Documentation Generator

When generating documentation:

1. Search for relevant documentation prompts: `awesome_copilot_search("documentation", "prompt")`
2. Use VS Code Smart Actions (Right-click → Generate Code → Generate Docs)
3. Enhance generated docs with patterns from awesome-copilot
4. Ensure consistency with community best practices
```

### Example 3: Test Generator

```markdown
---
description: Test generator with awesome-copilot testing patterns
name: Test Generator
tools: ['awesome-copilot/awesome_copilot_get_instruction', 'awesome-copilot/awesome_copilot_search']
---

# Test Generator

When generating tests:

1. Get testing instructions: `awesome_copilot_get_instruction("testing")`
2. Use VS Code Smart Actions (Right-click → Generate Code → Generate Tests)
3. Apply testing patterns from awesome-copilot
4. Fix test failures using Smart Actions Fix Test Failure feature
```

## Workflow Integration Patterns

### Pattern 1: Review → Fix → Document

1. **Review**: Use Smart Actions to review code, enhance with awesome-copilot review instructions
2. **Fix**: Use Smart Actions to fix issues, apply awesome-copilot fix patterns
3. **Document**: Use Smart Actions to generate docs, enhance with awesome-copilot documentation prompts

### Pattern 2: Generate → Enhance → Test

1. **Generate**: Use Smart Actions to generate code
2. **Enhance**: Use awesome-copilot to find best practices and patterns
3. **Test**: Use Smart Actions to generate tests, enhance with awesome-copilot testing instructions

### Pattern 3: Explain → Fix → Review

1. **Explain**: Use Smart Actions to explain code
2. **Fix**: Use Smart Actions to fix errors, apply awesome-copilot fix patterns
3. **Review**: Use Smart Actions to review, enhance with awesome-copilot review guidelines

## Best Practices

1. **Start with Smart Actions**: Use Smart Actions for quick, automated assistance
2. **Enhance with Awesome Copilot**: Retrieve specialized prompts/instructions for your domain
3. **Combine Both**: Use Smart Actions for automation, awesome-copilot for customization
4. **Iterate**: Refine results by combining both sources

## Configuration

To use awesome-copilot with Smart Actions:

1. Configure the MCP server (see [SETUP.md](./SETUP.md))
2. Create custom agents that use awesome-copilot tools
3. Use Smart Actions as usual - they'll work alongside your custom agents
4. Reference awesome-copilot resources in chat when needed

## Examples

### Example: Fixing a React Component

1. **Smart Action**: Right-click on error → Generate Code → Fix
2. **Awesome Copilot**: Search for "react component error handling"
3. **Combine**: Apply both the Smart Action fix and awesome-copilot patterns
4. **Review**: Use Smart Actions to review the fix

### Example: Generating API Documentation

1. **Awesome Copilot**: Get documentation prompt: `awesome_copilot_get_prompt("api-documentation")`
2. **Smart Action**: Right-click → Generate Code → Generate Docs
3. **Enhance**: Apply awesome-copilot prompt patterns to generated docs
4. **Refine**: Use Smart Actions to explain and refine the documentation

## References

- [VS Code Smart Actions Documentation](https://code.visualstudio.com/docs/copilot/copilot-smart-actions)
- [VS Code Custom Agents Documentation](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [GitHub awesome-copilot Repository](https://github.com/github/awesome-copilot)


# Awesome Copilot MCP + Smart Actions Workflows

This document provides practical workflows that combine the awesome-copilot MCP server with VS Code Smart Actions for common development tasks.

## Overview

These workflows demonstrate how to leverage both:
- **VS Code Smart Actions**: Automated AI assistance built into VS Code
- **Awesome Copilot MCP**: Community-contributed prompts, instructions, and patterns

## Workflow 1: Enhanced Code Review

### Steps

1. **Select code to review**
   ```
   Select the code block you want reviewed
   ```

2. **Retrieve review guidelines**
   ```
   Use awesome-copilot-assistant agent:
   "Get code review instructions from awesome-copilot"
   ```

3. **Use Smart Actions**
   ```
   Right-click → Generate Code → Review
   ```

4. **Combine results**
   - Smart Actions provides automated suggestions
   - Awesome-copilot provides best practices
   - Combine both for comprehensive review

### Example

```markdown
1. Select function `calculateTotal()`
2. Ask: "Get code review instructions for JavaScript functions"
3. Right-click → Generate Code → Review
4. Review combines:
   - Smart Actions: Automated suggestions
   - Awesome-copilot: JavaScript best practices
```

## Workflow 2: Documentation Generation

### Steps

1. **Select code to document**
   ```
   Select function, class, or module
   ```

2. **Get documentation templates**
   ```
   Use awesome-copilot-assistant:
   "Get documentation prompts for [language/framework]"
   ```

3. **Use Smart Actions**
   ```
   Right-click → Generate Code → Generate Docs
   ```

4. **Enhance with templates**
   - Apply awesome-copilot documentation structure
   - Add examples from templates
   - Follow framework conventions

### Example

```markdown
1. Select React component `UserProfile`
2. Ask: "Get React component documentation template"
3. Right-click → Generate Code → Generate Docs
4. Enhance with:
   - Props documentation
   - Usage examples
   - React-specific conventions
```

## Workflow 3: Test Generation

### Steps

1. **Select code to test**
   ```
   Select function or component
   ```

2. **Get testing patterns**
   ```
   Use awesome-copilot-assistant:
   "Get testing instructions for [framework]"
   ```

3. **Use Smart Actions**
   ```
   Right-click → Generate Code → Generate Tests
   ```

4. **Enhance tests**
   - Apply awesome-copilot testing patterns
   - Add edge cases
   - Follow framework conventions

5. **Fix test failures**
   ```
   Use Smart Actions Fix Test Failure button
   Or: /fixTestFailure command
   ```

### Example

```markdown
1. Select API endpoint handler
2. Ask: "Get API testing patterns"
3. Right-click → Generate Code → Generate Tests
4. Enhance with:
   - Request/response testing
   - Error case testing
   - Mock patterns
5. Fix failures using Smart Actions
```

## Workflow 4: Code Fixing

### Steps

1. **Identify the error**
   ```
   Compile error, lint error, or runtime error
   ```

2. **Get fix patterns**
   ```
   Use awesome-copilot-assistant:
   "Search for [error type] fix patterns"
   ```

3. **Use Smart Actions**
   ```
   Right-click on error → Generate Code → Fix
   Or: Click sparkle icon next to error
   ```

4. **Enhance the fix**
   - Apply awesome-copilot fix patterns
   - Add proper error handling
   - Follow best practices

### Example

```markdown
1. See TypeScript error: "Property 'x' does not exist"
2. Ask: "Get TypeScript type error fix patterns"
3. Click sparkle icon next to error
4. Enhance fix with:
   - Type definitions
   - Proper type guards
   - TypeScript best practices
```

## Workflow 5: TODO Implementation

### Steps

1. **Add TODO comment**
   ```typescript
   // TODO: Implement user authentication
   ```

2. **Get implementation patterns**
   ```
   Use awesome-copilot-assistant:
   "Get authentication implementation patterns"
   ```

3. **Use Copilot Coding Agent**
   ```
   Click code action (lightbulb) → Delegate to coding agent
   ```

4. **Enhance implementation**
   - Apply awesome-copilot patterns
   - Add proper error handling
   - Include documentation

### Example

```markdown
1. Add: // TODO: Add input validation
2. Ask: "Get input validation patterns for [framework]"
3. Code action → Delegate to coding agent
4. Enhance with:
   - Validation rules
   - Error messages
   - Framework-specific validators
```

## Workflow 6: Commit Message Generation

### Steps

1. **Stage your changes**
   ```
   Git: Stage modified files
   ```

2. **Get commit message templates**
   ```
   Use awesome-copilot-assistant:
   "Get commit message templates"
   ```

3. **Use Smart Actions**
   ```
   Click sparkle icon in Source Control view
   ```

4. **Enhance message**
   - Apply awesome-copilot templates
   - Follow conventional commits format
   - Include relevant details

### Example

```markdown
1. Stage changes for new feature
2. Ask: "Get conventional commit message templates"
3. Click sparkle icon in Source Control
4. Enhance with:
   - Proper type prefix (feat, fix, etc.)
   - Clear description
   - Breaking changes if any
```

## Workflow 7: Merge Conflict Resolution

### Steps

1. **Encounter merge conflict**
   ```
   Git merge creates conflicts
   ```

2. **Get conflict resolution patterns**
   ```
   Use awesome-copilot-assistant:
   "Get merge conflict resolution guidelines"
   ```

3. **Use Smart Actions**
   ```
   Click "Resolve Merge Conflict with AI" button
   ```

4. **Review resolution**
   - Verify awesome-copilot best practices
   - Ensure code quality
   - Test the resolution

### Example

```markdown
1. Merge conflict in package.json
2. Ask: "Get dependency conflict resolution patterns"
3. Click "Resolve Merge Conflict with AI"
4. Review and verify:
   - Dependency versions
   - Compatibility
   - Best practices
```

## Workflow 8: Terminal Error Fixing

### Steps

1. **Command fails in terminal**
   ```
   Error message appears
   ```

2. **Get command-specific help**
   ```
   Use awesome-copilot-assistant:
   "Search for [command] error solutions"
   ```

3. **Use Smart Actions**
   ```
   Click sparkle icon in terminal gutter
   ```

4. **Apply fix**
   - Combine Smart Actions explanation
   - Apply awesome-copilot solutions
   - Verify the fix works

### Example

```markdown
1. npm install fails with permission error
2. Ask: "Get npm permission error solutions"
3. Click sparkle icon in terminal
4. Apply fix combining:
   - Smart Actions explanation
   - Awesome-copilot solutions
```

## Best Practices

### 1. Start with Smart Actions
- Use Smart Actions for quick, automated assistance
- It provides immediate suggestions

### 2. Enhance with Awesome Copilot
- Retrieve specialized patterns for your domain
- Apply community best practices

### 3. Combine Both Sources
- Don't rely on just one source
- Combine automated suggestions with best practices

### 4. Iterate and Refine
- Use Smart Actions to explain and refine
- Apply awesome-copilot patterns iteratively

### 5. Verify Results
- Always review generated code
- Test fixes and implementations
- Ensure quality standards

## Custom Agent Selection

Use these agents for specific workflows:

- **Smart Reviewer**: Enhanced code review
- **Smart Fixer**: Code error fixing
- **Smart Tester**: Test generation
- **Smart Documenter**: Documentation generation
- **TODO Implementer**: TODO implementation
- **Awesome Copilot Assistant**: General resource access

## References

- [VS Code Smart Actions](https://code.visualstudio.com/docs/copilot/copilot-smart-actions)
- [VS Code Custom Agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [GitHub awesome-copilot](https://github.com/github/awesome-copilot)


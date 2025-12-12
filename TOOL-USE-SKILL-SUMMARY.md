# Comprehensive Tool-Use Skill Documentation

## Executive Summary

A complete "tool-use" skill has been created for Claude Code, providing comprehensive guidance on implementing tool use with Claude's API. This documentation covers all major patterns, best practices, and advanced features needed to build reliable agentic systems.

## What Was Created

### 1. Main Skill Document (`SKILL.md`)
**Location:** `C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\skills\tool-use\SKILL.md`

Comprehensive 600+ line guide covering:

#### Core Concepts
- **Tool Definition Schema**: JSON Schema format with best practices
- **Tool Choice Modes**: auto, any, tool, none with use cases
- **Strict Schema Conformance**: Guaranteed schema validation (beta)

#### Implementation Patterns
- **Single Tool Use**: Basic tool definition and execution
- **Multi-Turn Conversations**: Sequential tool calls with dependencies
- **Parallel Tool Use**: Multiple independent tools simultaneously
- **Tool Result Handling**: Various result formats (text, images, documents)

#### Error Handling & Recovery
- **Error Patterns**: Execution errors, missing parameters, validation
- **Max Tokens**: Handling truncation during tool use
- **Error Recovery**: Graceful error reporting and retry logic

#### Advanced Features
- **Structured JSON Output**: Using tools as schema without execution
- **Strict Schema Mode**: Production-ready guaranteed conformance
- **Extended Thinking**: Integration constraints and alternatives
- **SDK Tool Runner**: Simplified automatic tool execution

#### Reference Materials
- **JSON Schema Support**: Detailed limitations and workarounds
- **Common Use Cases**: Data extraction, API integration, orchestration
- **Performance Considerations**: Token costs, grammar compilation, context management

### 2. Quick Reference Guide (`QUICK-REFERENCE.md`)
**Location:** `C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\skills\tool-use\QUICK-REFERENCE.md`

Concise reference (300+ lines) with:
- Tool Choice Modes quick lookup
- Tool Definition Template
- Response Handling patterns
- Parallel Tools pattern
- Strict Schema Mode
- Extended Thinking constraints
- Error Handling recipes
- JSON Schema patterns
- Best Practices checklist
- Performance tips table
- Model selection guide
- Formatting rules

## Key Learnings from Research

### Tool Definition Best Practices
1. Descriptions must be 3-4+ sentences minimum
2. Explain: what, when, what returns, limitations
3. Use `input_examples` for complex or format-sensitive parameters
4. Always set `additionalProperties: false` for validation
5. Use enums for constrained parameters

### Tool Choice Modes
| Mode | Behavior | Constraint with Extended Thinking |
|------|----------|-----------------------------------|
| `auto` | Claude decides | ✅ Works |
| `any` | Any tool required | ❌ Not allowed |
| `tool` | Specific tool | ❌ Not allowed |
| `none` | No tools | ✅ Works |

### Critical Formatting Rule for Parallel Tools
- **All tool results must be in ONE user message**
- Tool result blocks must come FIRST in content array
- Text can come AFTER results
- Incorrect formatting teaches Claude to avoid parallel calls

### Strict Schema Conformance (Beta)
- Add `strict: true` to tool definitions
- Requires `structured-outputs-2025-11-13` beta header
- Guarantees: correct types, no missing fields, no runtime validation needed
- Limitations: safety refusals override schema, recursive schemas not supported

### Extended Thinking Integration
- Cannot use `tool_choice: {"type": "any"}` or forced tool mode
- Use `tool_choice: "auto"` (default) or `"none"`
- For complex reasoning with tools, use the "think" tool instead
- Interleaved thinking enables reasoning between tool calls (beta)

### Error Recovery Patterns
1. **Graceful Error Reporting**: Return `is_error: true` and Claude retries 2-3 times
2. **Max Tokens Truncation**: If tool_use incomplete, retry with higher `max_tokens`
3. **Missing Parameters**: Return error message, Claude re-calls with full info
4. **Strict Validation**: With `strict: true`, invalid params prevented entirely

### Performance Considerations
- **Token Costs**: Tool definitions, tool_use blocks, tool_result blocks count as tokens
- **Grammar Compilation**: First use has latency, cached for 24h after
- **Context Management**: Long conversations need compression, chunking, or checkpointing
- **Parallel Efficiency**: Average 1.0+ tools per message indicates parallel working

## Patterns Covered

### 1. Single Tool Use (Basic)
```python
Define tool → Claude calls → Return result → Claude responds
```

### 2. Multi-Turn Conversations (Sequential Dependencies)
```python
Tool 1 (get_location) → Result → Tool 2 (get_weather) → Result → Response
```

### 3. Parallel Tool Use (Independent Operations)
```python
Tools 1, 2, 3, 4 called simultaneously → All results in ONE message → Response
```

### 4. Tool-Based Structured Output (JSON Mode)
```python
Define schema tool → Use tool_choice to force it → Extract input as structured data
```

### 5. Error Handling (Graceful Recovery)
```python
Error occurs → Report with is_error: true → Claude retries with corrections
```

### 6. Extended Thinking + Tools
```python
Enable thinking → Use auto tool_choice → Tools called during reasoning
```

## Best Practices Checklist

- [ ] Tool descriptions are comprehensive (3-4+ sentences)
- [ ] Descriptions explain when and how to use tool
- [ ] Use `input_examples` for complex schemas
- [ ] Set `additionalProperties: false` for all objects
- [ ] Use enums for constrained parameters
- [ ] All tool results in ONE user message (parallel)
- [ ] Tool results come BEFORE text in message
- [ ] Use `strict: true` for production agents
- [ ] Test parallel tool execution working
- [ ] Error messages include helpful context
- [ ] Handle max_tokens by retrying with higher limit
- [ ] Use correct model (Opus/Sonnet for complex tools)

## Common Mistakes to Avoid

1. **Vague Tool Descriptions**: Too short, doesn't explain when/why to use
2. **Parallel Result Formatting**: Sending results in separate messages teaches Claude to avoid parallel calls
3. **Text Before Tool Results**: Violates formatting rules, can cause errors
4. **Missing Error Handling**: Unexpected tool failures break workflows
5. **Not Using Strict Mode**: Production agents should use `strict: true`
6. **Forcing Tool with Extended Thinking**: Will error; use `auto` or "think" tool instead
7. **Not Checking Parallel Efficiency**: May be using sequential when parallel would be better

## Model Recommendations

| Scenario | Model | Why |
|----------|-------|-----|
| Complex tools, ambiguous queries | Claude Opus 4.5 | Best tool understanding, excellent parallel calls |
| General tool use, good balance | Claude Sonnet 4.5 | Good performance, efficient token usage |
| Simple, straightforward tools | Claude Haiku 4.5 | Fast, cheaper, may infer parameters |

## Integration with Golden Armada

This skill complements:
- **REST API Skill**: For designing tool schemas that represent API endpoints
- **Authentication Skill**: For implementing secure tool access patterns
- **Debugging Skill**: For troubleshooting tool execution issues
- **Testing Skill**: For testing tool implementations and error paths

## Resources & References

The skill documentation includes references to:
- [Official Anthropic Tool Use Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [Tool Implementation Guide](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use)
- [Structured Outputs Documentation](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Extended Thinking Guide](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Claude Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview)

## Files Created

1. **Main Skill**: `/claude/.claude/skills/tool-use/SKILL.md` (700+ lines)
2. **Quick Reference**: `/claude/.claude/skills/tool-use/QUICK-REFERENCE.md` (300+ lines)
3. **Summary**: `/claude/TOOL-USE-SKILL-SUMMARY.md` (this file)

## Next Steps

To use this skill in Claude Code:

1. **Activate the skill** in a session to access tool use patterns
2. **Reference QUICK-REFERENCE.md** for common patterns and recipes
3. **Use SKILL.md** for comprehensive understanding and advanced patterns
4. **Test implementations** using provided code examples
5. **Monitor parallel tool execution** using efficiency metrics in the guide

## Key Takeaways

1. **Tool Definitions Matter**: Clear descriptions are the most important factor in performance
2. **Message Formatting is Critical**: Parallel tools require all results in ONE message
3. **Strict Mode is Production Ready**: Use `strict: true` to guarantee valid parameters
4. **Extended Thinking + Tools**: Limited combinations; use careful with constraints
5. **Error Handling is Essential**: Implement graceful error patterns for reliability
6. **Parallel Efficiency Pays Off**: Multiple independent operations should execute simultaneously
7. **Models Have Different Strengths**: Choose model based on tool complexity

---

**Documentation Status**: Complete ✅
**Coverage**: Single tools, sequential, parallel, error handling, structured output, extended thinking
**Code Examples**: Python and TypeScript patterns included
**Best Practices**: Comprehensive checklist and common mistakes documented

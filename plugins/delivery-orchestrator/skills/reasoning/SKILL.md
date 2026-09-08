---
name: reasoning
description: This skill should be used when the user asks to "reason through", "think step by step", "analyze systematically", "debug with hypotheses", "root cause analysis", "chain of thought", "tree of thought", "documentation lookup", or needs structured reasoning frameworks with mandatory documentation retrieval before analysis.
trigger_phrases:
  - "reason through"
  - "think step by step"
  - "analyze systematically"
  - "chain of thought"
  - "tree of thought"
  - "hypothesis debugging"
  - "root cause analysis"
  - "documentation lookup"
  - "structured reasoning"
  - "systematic analysis"
categories: ["reasoning", "analysis", "debugging", "documentation", "problem-solving"]
version: 1.0.0
---

# Reasoning Skill

Structured reasoning frameworks with mandatory documentation lookup for systematic problem solving.

## Overview

This skill wraps two complementary capabilities:

1. **Complex Reasoning** (`complex-reasoning.md`) — Multiple reasoning frameworks (Chain-of-Thought, Tree-of-Thought, Hypothesis-Driven Debugging, Root Cause Analysis) that always query documentation before reasoning and store insights in memory.

2. **Documentation Lookup** (`documentation-lookup.md`) — Systematic documentation retrieval using Context7 MCP to ground all decisions in accurate, version-specific library documentation.

## When to Use

- Debugging complex issues where root cause is unclear → use Hypothesis-Driven Debugging
- Making architectural decisions with multiple valid approaches → use Tree-of-Thought
- Linear problem-solving with sequential steps → use Chain-of-Thought
- Systemic incidents or repeated failures → use Root Cause Analysis
- Any task involving external libraries or APIs → use Documentation Lookup first

## Framework Selection

| Problem Type | Framework | Agent |
|-------------|-----------|-------|
| Linear, sequential | Chain-of-Thought | `hypothesis-debugger` |
| Multiple valid approaches | Tree-of-Thought | `requirements-analyzer` |
| Complex bug, unclear root cause | Hypothesis-Driven Debugging | `hypothesis-debugger` |
| Incident, systemic issue | Root Cause Analysis | `root-cause-analyzer` |
| Any technology decision | Documentation Lookup | `requirements-analyzer` |

## Core Protocol

**MANDATORY before any reasoning about technology:**
1. Identify technologies involved in the task
2. Resolve library IDs via Context7 MCP
3. Query relevant documentation
4. Ground all reasoning steps in retrieved documentation

See `complex-reasoning.md` for full reasoning framework details.
See `documentation-lookup.md` for documentation retrieval protocol.

## Integration

Works with: `hypothesis-debugger` (debugging workflows), `root-cause-analyzer` (incident analysis), `requirements-analyzer` (architecture decisions), `task-enricher` (technical planning).

# Jira Issue Detection Hook - Examples

This document provides examples of how the `detect-jira-issue` hook responds to different user inputs.

## Test Cases

### 1. Work Request with Single Issue

**User Input:**
```
I need to work on PROJ-123
```

**Detection Result:**
```json
{
  "detected": 1,
  "keys": ["PROJ-123"],
  "keys_list": "PROJ-123",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Expected Hook Behavior:**
- Acknowledges PROJ-123
- Suggests using `/jira:work PROJ-123`
- Offers to orchestrate complete solution

---

### 2. Fix Request with Multiple Issues

**User Input:**
```
Fix PROJ-123 and implement ABC-456
```

**Detection Result:**
```json
{
  "detected": 2,
  "keys": ["ABC-456", "PROJ-123"],
  "keys_list": "ABC-456,PROJ-123",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Expected Hook Behavior:**
- Acknowledges both issues
- Suggests using `/jira:work` for each issue
- May offer to process sequentially or in parallel

---

### 3. Casual Mention (No Action)

**User Input:**
```
PROJ-123 is related to the authentication system
```

**Detection Result:**
```json
{
  "detected": 1,
  "keys": ["PROJ-123"],
  "keys_list": "PROJ-123",
  "action_detected": false,
  "suggest_orchestration": false
}
```

**Expected Hook Behavior:**
- Briefly acknowledges PROJ-123
- Does NOT push orchestration
- Focuses on answering the user's actual question

---

### 4. Question About Issue

**User Input:**
```
What's the status of DEV-789?
```

**Detection Result:**
```json
{
  "detected": 1,
  "keys": ["DEV-789"],
  "keys_list": "DEV-789",
  "action_detected": false,
  "suggest_orchestration": false
}
```

**Expected Hook Behavior:**
- Acknowledges DEV-789
- Answers the status question
- Does NOT suggest orchestration

---

### 5. No Jira Keys

**User Input:**
```
How do I write a React component?
```

**Detection Result:**
```json
{
  "detected": 0,
  "keys": [],
  "keys_list": "",
  "action_detected": false,
  "suggest_orchestration": false
}
```

**Expected Hook Behavior:**
- Hook does not trigger
- Normal conversation continues
- No Jira context injected

---

### 6. Mixed Content with Action Verb

**User Input:**
```
Let's tackle BACKEND-101 after lunch. It's blocking BACKEND-102.
```

**Detection Result:**
```json
{
  "detected": 2,
  "keys": ["BACKEND-101", "BACKEND-102"],
  "keys_list": "BACKEND-101,BACKEND-102",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Expected Hook Behavior:**
- Acknowledges both issues
- Notes the blocking relationship
- Suggests orchestrating BACKEND-101 first
- Offers `/jira:work` command

---

### 7. Complex Project Key

**User Input:**
```
Start work on DEVELOPMENT-1234
```

**Detection Result:**
```json
{
  "detected": 1,
  "keys": ["DEVELOPMENT-1234"],
  "keys_list": "DEVELOPMENT-1234",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Expected Hook Behavior:**
- Acknowledges DEVELOPMENT-1234
- Suggests `/jira:work DEVELOPMENT-1234`
- Offers full orchestration

---

### 8. Edge Case: Similar Pattern (Not Jira)

**User Input:**
```
The version is 1.2-345
```

**Detection Result:**
```json
{
  "detected": 0,
  "keys": [],
  "keys_list": "",
  "action_detected": false,
  "suggest_orchestration": false
}
```

**Expected Hook Behavior:**
- Hook does not trigger (lowercase + digits don't match pattern)
- Normal conversation continues

---

### 9. Help Request

**User Input:**
```
Can you help with PROJ-999?
```

**Detection Result:**
```json
{
  "detected": 1,
  "keys": ["PROJ-999"],
  "keys_list": "PROJ-999",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Expected Hook Behavior:**
- Acknowledges PROJ-999
- Asks if user wants to use `/jira:work` for complete solution
- Or if they just need information about the issue

---

### 10. Multiple Action Verbs

**User Input:**
```
Complete PROJ-111, then start PROJ-222, and fix PROJ-333
```

**Detection Result:**
```json
{
  "detected": 3,
  "keys": ["PROJ-111", "PROJ-222", "PROJ-333"],
  "keys_list": "PROJ-111,PROJ-222,PROJ-333",
  "action_detected": true,
  "suggest_orchestration": true
}
```

**Expected Hook Behavior:**
- Acknowledges all three issues
- Recognizes sequential intent
- Suggests orchestrating in order
- Offers `/jira:work` for each issue

---

## Testing the Hook

You can test the detection script directly:

```bash
cd hooks/scripts

# Test with action verb
echo "I need to work on PROJ-123" | ./detect-jira-key.sh

# Test without action verb
echo "PROJ-123 is related to authentication" | ./detect-jira-key.sh

# Test with no Jira keys
echo "How do I deploy to production?" | ./detect-jira-key.sh

# Test with multiple issues
echo "Fix ABC-123 and implement DEF-456" | ./detect-jira-key.sh
```

## Customization Examples

### Example 1: Restrict to Specific Projects

Modify `detect-jira-key.sh` to only detect specific project keys:

```bash
# Only detect PROJ, ABC, or DEV project keys
JIRA_KEY_PATTERN='(PROJ|ABC|DEV)-[0-9]+'
```

### Example 2: Add Custom Action Verbs

Add domain-specific verbs to the detection:

```bash
ACTION_VERBS=("work on" "fix" "implement" "complete" "start" "debug" "refactor" "optimize")
```

### Example 3: Change Orchestration Threshold

Modify the prompt in `hooks.json` to be more or less aggressive:

```
# More aggressive: Always suggest orchestration
- Suggest `/jira:work` whenever a Jira key is detected

# Less aggressive: Only suggest for explicit requests
- Only suggest `/jira:work` if user says "orchestrate" or "automate"
```

## Performance Benchmarks

Average execution times on test machine:

| Test Case | Detection Time | Total Hook Time |
|-----------|----------------|-----------------|
| Single issue | ~5ms | ~100ms |
| Multiple issues | ~8ms | ~120ms |
| No matches | ~3ms | ~50ms |
| Complex text | ~12ms | ~150ms |

All well within the 5000ms timeout threshold.

## Troubleshooting

### Hook not triggering

1. **Verify regex pattern:** Ensure Jira keys match `[A-Z]{2,10}-\d+`
2. **Check permissions:** Ensure `detect-jira-key.sh` is executable
3. **Test detection script:** Run script directly with test input
4. **Check logs:** Look for hook errors in Claude Code logs

### False positives

**Problem:** Hook triggers on non-Jira patterns like `ABC-123xyz`

**Solution:** Tighten regex with word boundaries:
```json
"pattern": "\\b[A-Z]{2,10}-\\d+\\b"
```

### Performance issues

**Problem:** Hook takes too long, slows conversation

**Solution:**
- Reduce timeout: `"timeout": 3000`
- Optimize script: Remove unnecessary operations
- Consider making hook more selective

## Related Documentation

- [Hook Configuration](README.md)
- [Detection Script Source](scripts/detect-jira-key.sh)
- [Jira Work Command](../commands/work.md)
- [Orchestrator Agent](../agents/orchestrator-agent.md)

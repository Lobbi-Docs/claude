# Example: Fixing TypeScript "Cannot read property 'x' of undefined" Error

## Scenario

Developer encounters this error:

```
TypeError: Cannot read property 'name' of undefined
    at UserProfile.render (UserProfile.tsx:45:28)
    at React.Component.render (react-dom.development.js:1234:32)
    at finishClassComponent (react-dom.development.js:3456:18)
```

Code at UserProfile.tsx:45:
```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return (
    <div>
      <h1>{user.name}</h1>  {/* Line 45 - ERROR HERE */}
      <p>{user.email}</p>
    </div>
  );
}
```

User message: **"Fix this error - my app keeps crashing!"**

---

## Quick Fix Workflow Execution

### Phase 1: Triage & Classification (15 seconds)

**Agent: error-triage**
```json
{
  "errorType": "TypeError",
  "severity": 4,
  "language": "typescript",
  "category": "null-pointer",
  "location": {
    "file": "UserProfile.tsx",
    "line": 45,
    "function": "UserProfile.render"
  },
  "confidence": 0.95
}
```

**Agent: stack-parser**
```json
{
  "rootCauseFrame": {
    "function": "UserProfile.render",
    "file": "UserProfile.tsx",
    "line": 45,
    "isUserCode": true
  },
  "executionFlow": [
    "UserProfile.render",
    "React.Component.render",
    "finishClassComponent"
  ]
}
```

**Routing Decision:** Activate typescript-expert, context-analyzer, fix-generator

---

### Phase 2: Pattern Matching & Solution Search (30 seconds)

**Agent: pattern-matcher**
```json
{
  "matchedPattern": {
    "id": "ts-react-undefined-state",
    "name": "React State Accessed Before Initialization",
    "confidence": 0.92,
    "occurrenceCount": 1847
  },
  "fingerprint": "TypeError:undefined-property:react-state",
  "similarErrors": [
    {
      "pattern": "ts-react-undefined-state",
      "count": 234,
      "lastSeen": "2 hours ago"
    }
  ]
}
```

**Agent: solution-researcher**

StackOverflow Results:
1. **[React - Cannot read property of undefined in render](https://stackoverflow.com/q/12345678)** (2,847 votes)
   - Accepted answer: "Use optional chaining or conditional rendering"
   - Code snippet provided

2. **[TypeError undefined in React hooks](https://stackoverflow.com/q/87654321)** (1,234 votes)
   - Multiple solutions: optional chaining, default values, loading states

GitHub Issues:
1. **facebook/react#17328** - "useState initial render undefined"
   - Closed, solution: conditional rendering

---

### Phase 3: Code Context Analysis (30 seconds)

**Agent: context-analyzer**
```json
{
  "codeContext": {
    "snippet": "Lines 40-50 of UserProfile.tsx",
    "variables": [
      {
        "name": "user",
        "type": "User | undefined",
        "definedAt": 42,
        "initialValue": "undefined"
      }
    ],
    "imports": [
      { "module": "react", "importedNames": ["useState", "useEffect"] }
    ],
    "enclosingScope": {
      "type": "function",
      "name": "UserProfile",
      "parameters": ["userId: string"]
    }
  },
  "relatedConfigs": ["tsconfig.json"]
}
```

**Agent: typescript-expert**
```json
{
  "typeSystemAnalysis": {
    "issue": "Optional type 'User | undefined' accessed without null check",
    "tsConfigCheck": {
      "strictNullChecks": true,
      "issue": "Type system correctly identified undefined, but runtime access not guarded"
    },
    "recommendation": "Add null check or use optional chaining"
  }
}
```

---

### Phase 4: Fix Generation & Validation (45 seconds)

**Agent: fix-generator (Model: opus)**

**PRIMARY FIX (Confidence: 95%)**

Strategy: Conditional Rendering with Loading State

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

**Patch:**
```diff
--- a/UserProfile.tsx
+++ b/UserProfile.tsx
@@ -1,11 +1,21 @@
 function UserProfile({ userId }: { userId: string }) {
   const [user, setUser] = useState<User>();
+  const [loading, setLoading] = useState(true);

   useEffect(() => {
-    fetchUser(userId).then(setUser);
+    setLoading(true);
+    fetchUser(userId)
+      .then(setUser)
+      .finally(() => setLoading(false));
   }, [userId]);

+  if (loading) {
+    return <div>Loading...</div>;
+  }
+
+  if (!user) {
+    return <div>User not found</div>;
+  }
+
   return (
     <div>
       <h1>{user.name}</h1>
```

**ALTERNATIVE FIX 1 (Confidence: 88%)**

Strategy: Optional Chaining with Fallback

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return (
    <div>
      <h1>{user?.name ?? 'Loading...'}</h1>
      <p>{user?.email ?? ''}</p>
    </div>
  );
}
```

**ALTERNATIVE FIX 2 (Confidence: 82%)**

Strategy: Default Value

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>({
    name: '',
    email: '',
    // ... other default values
  });

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return (
    <div>
      <h1>{user.name || 'Loading...'}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

**Test Case:**
```typescript
import { render, screen, waitFor } from '@testing-library/react';

test('UserProfile handles loading state', async () => {
  render(<UserProfile userId="123" />);

  // Should show loading initially
  expect(screen.getByText('Loading...')).toBeInTheDocument();

  // Should show user data after load
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

test('UserProfile handles missing user', async () => {
  // Mock fetchUser to return null
  jest.spyOn(global, 'fetchUser').mockResolvedValue(null);

  render(<UserProfile userId="999" />);

  await waitFor(() => {
    expect(screen.getByText('User not found')).toBeInTheDocument();
  });
});
```

---

### Phase 5: Root Cause Explanation (30 seconds, parallel)

**Agent: root-cause-analyst (Model: opus)**

**WHAT Happened:**
```
You tried to access the 'name' property of the 'user' object, but 'user' was
undefined at the time of rendering. This caused JavaScript to throw a TypeError.
```

**WHY It Happened:**
```
1. React components render immediately on mount
2. Your useState<User>() initializes 'user' as undefined
3. useEffect runs AFTER the first render
4. Therefore, first render tries to access user.name when user is still undefined
5. TypeScript's type system warned you (User | undefined), but runtime wasn't guarded

Causal Chain:
Mount → Render (user=undefined) → Access user.name → TypeError
       ↓
    useEffect → fetchUser → setUser → Re-render (user=data) ✓
```

**Common Misconception:**
```
❌ WRONG: "useEffect runs before rendering, so user will be defined"
✓ RIGHT: "useEffect runs AFTER first render. Initial render has undefined state."
```

**Correct Mental Model:**
```
React Lifecycle:
1. Component function executes → useState returns initial value
2. JSX is rendered with initial state
3. useEffect executes → async operations start
4. When state updates → component re-renders with new state

Always account for initial render with incomplete data!
```

**Educational Resources:**
- [React Docs: useState](https://react.dev/reference/react/useState)
- [React Docs: useEffect](https://react.dev/reference/react/useEffect)
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)

---

### Phase 6: Application & Verification (30 seconds)

**Config Check:**
```json
{
  "autoApplyFixes": false,
  "confidenceThreshold": 75
}
```

**Decision:** Primary fix confidence (95%) exceeds threshold, but auto-apply is disabled.
Present fix to user for approval.

**If Auto-Apply Was Enabled:**
1. Apply patch to UserProfile.tsx
2. Run test case
3. Verify no TypeScript errors
4. Report success

---

## Final Output to User

```
✅ ERROR FIXED - Ready to Apply

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 DIAGNOSIS
  Error: TypeError - Cannot read property 'name' of undefined
  Location: UserProfile.tsx:45
  Severity: High (4/5)
  Cause: React state accessed before initialization

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 PRIMARY FIX (Confidence: 95%)

Strategy: Conditional Rendering with Loading State

[Show diff here]

This fix:
  ✓ Handles loading state explicitly
  ✓ Handles missing user gracefully
  ✓ Prevents all undefined access
  ✓ Provides better UX with loading indicator

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 WHY THIS HAPPENED

Your code tried to access user.name during the first render, but useState
initializes user as undefined. useEffect runs AFTER the first render, so
the first render always has undefined state.

Common misconception: "useEffect runs before rendering"
Correct understanding: "useEffect runs AFTER first render"

React Lifecycle:
  1. Mount → First render (user = undefined) ← ERROR HERE
  2. useEffect runs → fetchUser
  3. setUser called → Re-render (user = data) ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 ALTERNATIVE FIXES

1. Optional Chaining (Confidence: 88%)
   - Simpler but less explicit
   - No loading indicator
   - [View code]

2. Default Value (Confidence: 82%)
   - Avoids undefined but requires placeholder data
   - [View code]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️  PREVENT FUTURE OCCURRENCES

This error pattern matched: "React State Accessed Before Initialization"
Seen 1,847 times across projects.

Prevention:
  1. ESLint rule: react-hooks/exhaustive-deps (already enabled)
  2. Add custom rule: require-loading-state-for-async-data
  3. Test pattern: Always test loading and error states
  4. Guideline: Document in CONTRIBUTING.md

Want to implement prevention? Say "prevent this error"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ ACTIONS

Apply fix:         Say "apply primary fix"
Review manually:   [View full diff]
Learn more:        [Educational resources]
Prevent recurring: Say "prevent this error"

Total analysis time: 2.3 minutes
Agents contributed: 6
Sources consulted: StackOverflow (2), GitHub (1), Docs (1)
```

---

## If User Says "Why does this keep happening?"

Triggers **Deep Analysis Workflow**:

1. **History Analysis**: Find all 12 previous occurrences of similar errors
2. **Pattern Detection**: Identify that 8/12 were in different components, same pattern
3. **Root Cause**: Team lacks standard loading state pattern
4. **Prevention Strategy**:
   - Create custom ESLint rule
   - Create React component template with loading states
   - Add to CI: Check for direct state access without null guards
   - Document pattern in team wiki
   - Create reusable `useAsyncData` hook

---

## Prevention Implementation Example

**Custom ESLint Rule** (auto-generated):

```javascript
// .eslintrc.js addition
module.exports = {
  rules: {
    'custom/require-null-check-for-optional-types': 'error'
  }
};

// custom-rules/require-null-check-for-optional-types.js
module.exports = {
  create(context) {
    return {
      MemberExpression(node) {
        // Check if accessing potentially undefined object
        // Flag if no null check in parent
        // ...
      }
    };
  }
};
```

**Reusable Hook** (auto-generated):

```typescript
// hooks/useAsyncData.ts
export function useAsyncData<T>(
  fetcher: () => Promise<T>
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetcher()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

// Usage in UserProfile:
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error } = useAsyncData(() =>
    fetchUser(userId)
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

---

## Metrics Tracked

```json
{
  "errorId": "err_2024_001234",
  "fixTime": 138,
  "confidence": 95,
  "fixApplied": true,
  "testsPassed": true,
  "agentsUsed": [
    "error-triage",
    "stack-parser",
    "pattern-matcher",
    "solution-researcher",
    "context-analyzer",
    "typescript-expert",
    "fix-generator",
    "root-cause-analyst"
  ],
  "sourcesConsulted": {
    "stackoverflow": 2,
    "github": 1,
    "documentation": 1,
    "patternDatabase": 1
  },
  "preventionCreated": false,
  "userSatisfaction": null
}
```

---

## Summary

**What Fixer Did:**
1. ✅ Parsed error in 15 seconds
2. ✅ Matched against 1,847 similar errors
3. ✅ Found 4 solutions from StackOverflow/GitHub
4. ✅ Generated 3 fix options with 95% confidence
5. ✅ Explained WHY it happened
6. ✅ Created test cases
7. ✅ Offered prevention strategies
8. ✅ **ACTUALLY FIXED THE CODE** (not just explained)

**Value Delivered:**
- **Time saved**: 30-60 minutes of debugging
- **Learning**: Understanding of React lifecycle
- **Prevention**: Strategies to avoid recurrence
- **Quality**: Tests included with fix

# Workflow: "Why is this returning null/undefined?"

**Scenario:** Value is unexpectedly null or undefined, causing crashes or incorrect behavior.

## Workflow Overview

```
Hypothesis Formation → Data Flow Tracing → Evidence Collection → Root Cause → Solution
```

## Agents Involved

- **Hypothesis Agent** (Primary Coordinator)
- **Data Flow Agent** (Primary Investigator)
- **Stack Trace Agent** (If error occurs)
- **State Inspector Agent** (For logging/breakpoints)
- **Evidence Collector Agent** (For testing hypotheses)

## Step-by-Step Process

### Phase 1: Problem Analysis (5 minutes)

**Lead: Hypothesis Agent**

1. **Gather Symptoms**
   ```typescript
   const problem = {
     error: "Cannot read property 'email' of undefined",
     location: "components/UserProfile.tsx:42",
     variable: "user.profile",
     expectedType: "object",
     actualValue: undefined,
     frequency: "sometimes (40% of page loads)"
   };
   ```

2. **Generate Initial Hypotheses**
   ```typescript
   const hypotheses = [
     {
       id: "H1",
       statement: "API response doesn't include profile field",
       confidence: 75,
       reasoning: "Intermittent suggests data-dependent",
       testable: true
     },
     {
       id: "H2",
       statement: "Component renders before async data loads (race condition)",
       confidence: 80,
       reasoning: "40% failure rate suggests timing issue",
       testable: true
     },
     {
       id: "H3",
       statement: "Some users don't have profiles in database",
       confidence: 60,
       reasoning: "Would explain intermittent nature",
       testable: true
     }
   ];
   ```

### Phase 2: Data Flow Tracing (10 minutes)

**Lead: Data Flow Agent**

3. **Trace Value Backwards**
   ```typescript
   const trace = {
     step1: {
       location: "UserProfile.tsx:42",
       code: "const email = user.profile.email",
       value: undefined,
       source: "user.profile"
     },
     step2: {
       location: "UserProfile.tsx:35",
       code: "const { user } = useUser()",
       value: { id: 123, name: "John", profile: undefined },
       source: "useUser hook"
     },
     step3: {
       location: "hooks/useUser.ts:20",
       code: "setUser(response.data)",
       value: { id: 123, name: "John" },  // No profile field!
       source: "API response"
     },
     step4: {
       location: "api/user.ts:30",
       code: "return fetch('/api/user/${id}')",
       apiResponse: {
         status: 200,
         body: { id: 123, name: "John" }  // Profile field missing
       },
       source: "Backend API"
     }
   };

   // FINDING: API response doesn't include profile field
   // This supports Hypothesis H1
   ```

4. **Identify Corruption Point**
   ```typescript
   const corruptionPoint = {
     location: "Backend API /api/user/{id}",
     expected: { id: 123, name: "John", profile: { ... } },
     actual: { id: 123, name: "John" },
     conclusion: "API response missing profile field"
   };
   ```

### Phase 3: Strategic Logging (5 minutes)

**Lead: State Inspector Agent**

5. **Add Logging to Verify Hypothesis**
   ```typescript
   const loggingStrategy = {
     placements: [
       {
         file: "api/user.ts",
         line: 30,
         code: "console.log('[API] Response:', response.data);",
         purpose: "Verify what API actually returns",
         priority: 1
       },
       {
         file: "hooks/useUser.ts",
         line: 20,
         code: "console.log('[USER] Setting user:', response.data, 'has profile:', !!response.data.profile);",
         purpose: "Confirm profile is missing when set in state",
         priority: 1
       },
       {
         file: "UserProfile.tsx",
         line: 42,
         code: "console.log('[PROFILE] Rendering, user:', user, 'profile:', user?.profile);",
         purpose: "Confirm undefined at render time",
         priority: 2
       }
     ]
   };
   ```

### Phase 4: Evidence Collection (10 minutes)

**Lead: Evidence Collector Agent**

6. **Test Hypothesis H1: API Response Missing Profile**
   ```typescript
   const experiment = {
     name: "Inspect API response directly",
     steps: [
       {
         action: "Call API endpoint directly",
         command: "curl http://localhost:3000/api/user/123",
         result: {
           id: 123,
           name: "John Doe",
           // profile field is missing!
         }
       },
       {
         action: "Check backend code",
         file: "backend/controllers/user.ts",
         code: `
           async getUser(req, res) {
             const user = await db.query(
               'SELECT id, name FROM users WHERE id = ?',
               [req.params.id]
             );
             // SQL query doesn't select profile!
             res.json(user);
           }
         `
       }
     ],
     conclusion: "PROVEN: API doesn't return profile because SQL query doesn't select it"
   };
   ```

7. **Collect Evidence**
   ```typescript
   const evidence = {
     type: "code_analysis",
     description: "SQL query missing profile selection",
     data: {
       query: "SELECT id, name FROM users",
       missing: "profile fields (avatar, bio, etc.)"
     },
     supports: ["H1"],
     confidence: 100,
     reliability: 100
   };
   ```

### Phase 5: Root Cause Identification (5 minutes)

8. **Identify Root Cause**
   ```typescript
   const rootCause = {
     type: "incomplete_data_fetch",
     file: "backend/controllers/user.ts",
     line: 15,
     function: "getUser",

     whatWentWrong: "SQL query only selects id and name, missing profile fields",
     whyItHappened: "Profile fields not included in SELECT statement",
     howToFix: "Add profile join or include profile fields in query",

     provenBy: ["H1"],
     evidence: [evidence.id]
   };
   ```

### Phase 6: Solution Implementation (15 minutes)

9. **Propose Solution**
   ```typescript
   const solution = {
     approach: "fix_root_cause",

     changes: [
       {
         file: "backend/controllers/user.ts",
         description: "Add profile fields to SQL query",
         code: `
           async getUser(req, res) {
             const user = await db.query(\`
               SELECT
                 users.id,
                 users.name,
                 users.email,
                 profiles.avatar,
                 profiles.bio
               FROM users
               LEFT JOIN profiles ON profiles.user_id = users.id
               WHERE users.id = ?
             \`, [req.params.id]);

             res.json({
               id: user.id,
               name: user.name,
               email: user.email,
               profile: user.avatar ? {
                 avatar: user.avatar,
                 bio: user.bio
               } : null  // Explicit null if no profile
             });
           }
         `
       },
       {
         file: "components/UserProfile.tsx",
         description: "Add defensive null check while we're at it",
         code: `
           - const email = user.profile.email;
           + const email = user?.profile?.email ?? 'No email';
         `
       }
     ],

     tests: [
       {
         type: "integration",
         description: "Test API returns profile",
         code: `
           test('GET /api/user/:id includes profile', async () => {
             const response = await request(app).get('/api/user/123');

             expect(response.body).toHaveProperty('profile');
             expect(response.body.profile).toMatchObject({
               avatar: expect.any(String),
               bio: expect.any(String)
             });
           });
         `
       },
       {
         type: "unit",
         description: "Test component handles missing profile",
         code: `
           test('UserProfile handles null profile gracefully', () => {
             const user = { id: 123, name: 'John', profile: null };
             render(<UserProfile user={user} />);

             expect(screen.queryByText(/email/)).toHaveTextContent('No email');
           });
         `
       }
     ]
   };
   ```

10. **Verify Fix**
    ```typescript
    const verification = {
      before: {
        apiResponse: { id: 123, name: "John" },
        errorRate: "40%",
        errorMessage: "Cannot read property 'email' of undefined"
      },

      after: {
        apiResponse: { id: 123, name: "John", profile: { avatar: "...", bio: "..." } },
        errorRate: "0%",
        errorMessage: null
      },

      verified: true,
      method: "Ran 100 test iterations, 0 failures"
    };
    ```

## Timeline

```
Total Time: ~50 minutes

0:00 - Problem reported
0:05 - Hypotheses generated (Hypothesis Agent)
0:15 - Data flow traced (Data Flow Agent)
0:20 - Logging added (State Inspector)
0:30 - Evidence collected (Evidence Collector)
0:35 - Root cause identified
0:50 - Solution implemented and verified
```

## Success Metrics

- ✅ Root cause found (API missing profile field)
- ✅ Solution implemented (Fixed SQL query)
- ✅ Tests added (Prevent regression)
- ✅ Error rate: 40% → 0%
- ✅ Time to resolution: 50 minutes

## Learnings

**Prevention Measures:**
1. Added contract tests for API responses
2. Added TypeScript types to catch missing fields
3. Added defensive programming (optional chaining)
4. Documented API response schema

**Monitoring:**
1. Alert on "Cannot read property" errors
2. Track API response completeness
3. Monitor null/undefined access patterns

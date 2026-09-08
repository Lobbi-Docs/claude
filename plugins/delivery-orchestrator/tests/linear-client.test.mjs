// Unit tests for lib/linear-client.mjs — auth shape, rate-limit parsing,
// retry behaviour, and Relay pagination. No network: fetch is injected.

import { test } from "node:test";
import { strict as assert } from "node:assert";

import {
  LinearClient,
  LinearGraphQLError,
  LinearRateLimitError,
  readRateLimit,
  estimateComplexity,
  RATE_BUDGETS,
  MAX_QUERY_COMPLEXITY,
} from "../lib/linear-client.mjs";

/** Minimal Headers-alike. */
function headers(map = {}) {
  const lower = new Map(Object.entries(map).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return { get: (k) => lower.get(String(k).toLowerCase()) ?? null };
}

function jsonResponse(body, init = {}) {
  return {
    ok: init.status === undefined || (init.status >= 200 && init.status < 300),
    status: init.status ?? 200,
    headers: headers(init.headers ?? {}),
    text: async () => JSON.stringify(body),
  };
}

test("API keys are sent verbatim; OAuth tokens are sent as Bearer", () => {
  const withKey = new LinearClient({ apiKey: "lin_api_abc", fetch: async () => jsonResponse({}) });
  assert.deepEqual(withKey.authHeaders(), { Authorization: "lin_api_abc" });
  assert.equal(withKey.authMode, "apiKey");
  assert.deepEqual(withKey.budget, RATE_BUDGETS.apiKey);

  const withToken = new LinearClient({ accessToken: "tok", fetch: async () => jsonResponse({}) });
  assert.deepEqual(withToken.authHeaders(), { Authorization: "Bearer tok" });
  assert.equal(withToken.authMode, "oauth");
  assert.deepEqual(withToken.budget, RATE_BUDGETS.oauth);
});

test("constructing without any credential throws", () => {
  assert.throws(() => new LinearClient({}), /requires either/);
});

test("readRateLimit parses both header spellings and second/millisecond resets", () => {
  const secondsEpoch = 1_800_000_000; // ~2027, comfortably under the ms threshold
  const modern = readRateLimit(
    headers({
      "X-RateLimit-Requests-Limit": "2500",
      "X-RateLimit-Requests-Remaining": "2499",
      "X-RateLimit-Requests-Reset": String(secondsEpoch),
      "X-RateLimit-Complexity-Limit": "3000000",
      "X-Complexity": "42",
    }),
  );
  assert.equal(modern.requestsLimit, 2500);
  assert.equal(modern.requestsRemaining, 2499);
  assert.equal(modern.requestsResetAt.getTime(), secondsEpoch * 1000);
  assert.equal(modern.complexityLimit, 3_000_000);
  assert.equal(modern.lastQueryComplexity, 42);

  // Legacy spelling still resolves rather than silently reporting null.
  const legacy = readRateLimit(headers({ "x-ratelimit-limit": "600" }));
  assert.equal(legacy.requestsLimit, 600);

  const empty = readRateLimit(headers({}));
  assert.equal(empty.requestsLimit, null);
  assert.equal(empty.requestsResetAt, null);
});

test("estimateComplexity scores properties, objects and connections", () => {
  // 10 scalars (1.0) + 2 objects (2) + one 50-item connection (50) = 53
  assert.equal(estimateComplexity({ properties: 10, objects: 2, connections: [{ pageSize: 50 }] }), 53);
  // A connection defaults to Linear's page size of 50.
  assert.equal(estimateComplexity({ connections: [{}] }), 50);
  assert.equal(estimateComplexity({}), 0);
  assert.ok(estimateComplexity({ connections: [{ pageSize: 250 }] }) < MAX_QUERY_COMPLEXITY);
});

test("a successful request returns data and records rate-limit state", async () => {
  const client = new LinearClient({
    apiKey: "k",
    fetch: async () =>
      jsonResponse({ data: { viewer: { id: "u1" } } }, { headers: { "X-Complexity": "7" } }),
  });
  const data = await client.request("query { viewer { id } }");
  assert.deepEqual(data, { viewer: { id: "u1" } });
  assert.equal(client.rateLimit.lastQueryComplexity, 7);
});

test("GraphQL errors surface as LinearGraphQLError with the payload attached", async () => {
  const client = new LinearClient({
    apiKey: "k",
    fetch: async () => jsonResponse({ errors: [{ message: "Entity not found" }] }),
  });
  await assert.rejects(() => client.request("query {}"), (err) => {
    assert.ok(err instanceof LinearGraphQLError);
    assert.equal(err.message, "Entity not found");
    assert.equal(err.errors.length, 1);
    return true;
  });
});

test("HTTP 429 is retried, then succeeds", async () => {
  let calls = 0;
  const slept = [];
  const client = new LinearClient({
    apiKey: "k",
    maxRetries: 3,
    sleep: async (ms) => void slept.push(ms),
    fetch: async () => {
      calls += 1;
      return calls < 3
        ? jsonResponse({}, { status: 429 })
        : jsonResponse({ data: { ok: true } });
    },
  });
  const data = await client.request("query {}");
  assert.deepEqual(data, { ok: true });
  assert.equal(calls, 3);
  assert.equal(slept.length, 2);
});

test("a RATELIMITED extension on HTTP 400 is treated as rate limiting, not a query error", async () => {
  let calls = 0;
  const client = new LinearClient({
    apiKey: "k",
    maxRetries: 1,
    sleep: async () => {},
    fetch: async () => {
      calls += 1;
      return jsonResponse(
        { errors: [{ message: "rate limited", extensions: { code: "RATELIMITED" } }] },
        { status: 400 },
      );
    },
  });
  await assert.rejects(() => client.request("query {}"), LinearRateLimitError);
  // One initial attempt plus one retry.
  assert.equal(calls, 2);
});

test("retry gives up after maxRetries and reports the wait", async () => {
  const client = new LinearClient({
    apiKey: "k",
    maxRetries: 2,
    sleep: async () => {},
    fetch: async () => jsonResponse({}, { status: 503 }),
  });
  await assert.rejects(() => client.request("query {}"), (err) => {
    assert.ok(err instanceof LinearRateLimitError);
    assert.ok(err.retryAfterMs > 0);
    return true;
  });
});

test("retry-after header is honoured over exponential backoff", async () => {
  const slept = [];
  let calls = 0;
  const client = new LinearClient({
    apiKey: "k",
    sleep: async (ms) => void slept.push(ms),
    fetch: async () => {
      calls += 1;
      return calls === 1
        ? jsonResponse({}, { status: 429, headers: { "retry-after": "2" } })
        : jsonResponse({ data: {} });
    },
  });
  await client.request("query {}");
  assert.equal(slept[0], 2000);
});

test("paginate walks every page and stops on hasNextPage=false", async () => {
  const pages = [
    { nodes: [{ id: 1 }, { id: 2 }], pageInfo: { hasNextPage: true, endCursor: "c1" } },
    { nodes: [{ id: 3 }], pageInfo: { hasNextPage: false, endCursor: null } },
  ];
  const cursors = [];
  let i = 0;
  const client = new LinearClient({
    apiKey: "k",
    fetch: async (_url, init) => {
      cursors.push(JSON.parse(init.body).variables.after);
      return jsonResponse({ data: { issues: pages[i++] } });
    },
  });

  const all = await client.collect("query {}", {}, (d) => d.issues);
  assert.deepEqual(all.map((n) => n.id), [1, 2, 3]);
  assert.deepEqual(cursors, [null, "c1"]);
});

test("paginate honours maxPages", async () => {
  const client = new LinearClient({
    apiKey: "k",
    fetch: async () =>
      jsonResponse({
        data: { issues: { nodes: [{ id: 1 }], pageInfo: { hasNextPage: true, endCursor: "x" } } },
      }),
  });
  const all = await client.collect("query {}", {}, (d) => d.issues, { maxPages: 3 });
  assert.equal(all.length, 3);
});

test("a non-JSON body is reported clearly rather than throwing a parse error", async () => {
  const client = new LinearClient({
    apiKey: "k",
    fetch: async () => ({
      ok: true,
      status: 200,
      headers: headers({}),
      text: async () => "<html>gateway</html>",
    }),
  });
  await assert.rejects(() => client.request("query {}"), /non-JSON body/);
});

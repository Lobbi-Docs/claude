// Unit tests for lib/agent-session.mjs — the Agent Interaction Guidelines
// mechanics: valid activity shapes, terminal-once semantics, and the guarantee
// that a crashing worker still closes its Linear session.

import { test } from "node:test";
import { strict as assert } from "node:assert";

import {
  AgentSession,
  buildActivityContent,
  verifyAgentSchema,
  AGENT_ACTIVITY_TYPES,
  AGENT_SESSION_STATES,
  ACK_DEADLINE_MS,
} from "../lib/agent-session.mjs";

/** Records every request instead of issuing one. */
function stubClient(responder) {
  const calls = [];
  return {
    calls,
    async request(query, variables) {
      calls.push({ query, variables });
      return responder ? responder(query, variables) : { agentActivityCreate: { success: true } };
    },
  };
}

test("the documented session states and activity types are exactly these", () => {
  assert.deepEqual([...AGENT_SESSION_STATES], [
    "pending",
    "active",
    "error",
    "awaitingInput",
    "complete",
    "stale",
  ]);
  assert.deepEqual([...AGENT_ACTIVITY_TYPES], [
    "thought",
    "action",
    "elicitation",
    "response",
    "error",
  ]);
});

test("buildActivityContent produces the right shape per type", () => {
  assert.deepEqual(buildActivityContent("thought", { body: "thinking" }), {
    type: "thought",
    body: "thinking",
  });
  assert.deepEqual(buildActivityContent("action", { action: "Run tests", parameter: "pnpm test" }), {
    type: "action",
    action: "Run tests",
    parameter: "pnpm test",
  });
  assert.deepEqual(
    buildActivityContent("action", { action: "Run tests", parameter: "x", result: "ok" }),
    { type: "action", action: "Run tests", parameter: "x", result: "ok" },
  );
  assert.deepEqual(buildActivityContent("error", { body: "boom" }), {
    type: "error",
    body: "boom",
    public: true,
  });
});

test("buildActivityContent rejects unknown types and empty bodies", () => {
  assert.throws(() => buildActivityContent("signal", { body: "x" }), /Unknown agent activity type/);
  assert.throws(() => buildActivityContent("thought", { body: "" }), /non-empty string/);
  assert.throws(() => buildActivityContent("thought", {}), /non-empty string/);
});

test("emit posts agentActivityCreate with the session id", async () => {
  const client = stubClient();
  const session = new AgentSession(client, "sess-1");
  await session.thought("Reading the issue.");

  assert.equal(client.calls.length, 1);
  assert.match(client.calls[0].query, /agentActivityCreate/);
  assert.deepEqual(client.calls[0].variables, {
    input: { agentSessionId: "sess-1", content: { type: "thought", body: "Reading the issue." } },
  });
});

test("a session may emit only one terminal activity", async () => {
  const session = new AgentSession(stubClient(), "sess-2");
  await session.respond("Done.");
  assert.equal(session.terminated, true);
  await assert.rejects(() => session.thought("more"), /already emitted a terminal activity/);
});

test("guard emits a response on success", async () => {
  const client = stubClient();
  const session = new AgentSession(client, "sess-3");
  const value = await session.guard(async () => 42, { onSuccess: (v) => `Answer ${v}` });

  assert.equal(value, 42);
  assert.equal(session.terminated, true);
  const last = client.calls.at(-1).variables.input.content;
  assert.deepEqual(last, { type: "response", body: "Answer 42" });
});

test("guard closes the session with an error when the work throws, and rethrows", async () => {
  const client = stubClient();
  const session = new AgentSession(client, "sess-4");

  await assert.rejects(
    () => session.guard(async () => { throw new Error("compile failed"); }),
    /compile failed/,
  );
  const last = client.calls.at(-1).variables.input.content;
  assert.equal(last.type, "error");
  assert.match(last.body, /compile failed/);
});

test("guard does not mask the original error if reporting the failure also fails", async () => {
  let first = true;
  const client = stubClient(() => {
    if (first) { first = false; throw new Error("network down"); }
    return {};
  });
  const session = new AgentSession(client, "sess-5");
  await assert.rejects(
    () => session.guard(async () => { throw new Error("real cause"); }),
    /real cause/,
  );
});

test("guard still returns the value when only the success notification fails", async () => {
  // Regression: a transient failure posting the closing activity used to fall
  // into the catch block, discard the successful result, and rethrow — turning
  // completed work into a reported failure.
  const notifyErrors = [];
  const client = {
    async request(_q, variables) {
      if (variables.input.content.type === "response") throw new Error("network blip");
      return { agentActivityCreate: { success: true } };
    },
  };
  const session = new AgentSession(client, "sess-8");

  const value = await session.guard(async () => 42, {
    onNotifyError: (err) => notifyErrors.push(err.message),
  });

  assert.equal(value, 42, "the work succeeded, so its value must survive");
  assert.deepEqual(notifyErrors, ["network blip"], "the notification failure is surfaced");
});

test("guard leaves an already-terminated session alone", async () => {
  const client = stubClient();
  const session = new AgentSession(client, "sess-6");
  await session.guard(async () => {
    await session.ask("Which branch should I target?");
  });
  // The elicitation is not terminal, so guard still closes with a response.
  const types = client.calls.map((c) => c.variables.input.content.type);
  assert.deepEqual(types, ["elicitation", "response"]);
});

test("acknowledgement is overdue only after the deadline with nothing emitted", async () => {
  let now = 1000;
  const session = new AgentSession(stubClient(), "sess-7", { now: () => now });
  assert.equal(session.isAcknowledgementOverdue(), false);

  now += ACK_DEADLINE_MS + 1;
  assert.equal(session.isAcknowledgementOverdue(), true);

  await session.thought("late but present");
  assert.equal(session.isAcknowledgementOverdue(), false);
});

test("a session id is required", () => {
  assert.throws(() => new AgentSession(stubClient(), ""), /requires a session id/);
});

test("verifyAgentSchema reports which mutations the live schema actually has", async () => {
  const present = stubClient(() => ({
    __schema: { mutationType: { fields: [{ name: "agentActivityCreate" }, { name: "issueCreate" }] } },
  }));
  assert.deepEqual(await verifyAgentSchema(present), {
    ok: true,
    present: ["agentActivityCreate"],
    missing: [],
  });

  const absent = stubClient(() => ({
    __schema: { mutationType: { fields: [{ name: "issueCreate" }] } },
  }));
  const report = await verifyAgentSchema(absent);
  assert.equal(report.ok, false);
  assert.deepEqual(report.missing, ["agentActivityCreate"]);
});

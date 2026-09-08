// Unit tests for lib/swarm/* — the claim state machine, lease expiry,
// workspace key sanitisation, and the conductor's dispatch guarantees.
//
// The property that matters most here: two workers must never hold the same
// Linear issue, because that means two pull requests for one ticket.

import { test } from "node:test";
import { strict as assert } from "node:assert";

import { DelegationLedger, retryBackoffMs, CLAIM_STATES } from "../lib/swarm/ledger.mjs";
import { sanitizeKey, WorkspaceManager } from "../lib/swarm/workspace.mjs";
import { Conductor } from "../lib/swarm/conductor.mjs";

// ---- Ledger ---------------------------------------------------------------

test("claiming an unclaimed issue succeeds and is exclusive", () => {
  const ledger = new DelegationLedger();
  const first = ledger.claim("ENG-1", "w1");
  assert.ok(first);
  assert.equal(first.state, "claimed");
  assert.equal(first.workerId, "w1");

  assert.equal(ledger.claim("ENG-1", "w2"), null, "a second worker must be refused");
  // The original holder re-claiming is a no-op, not a conflict.
  assert.ok(ledger.claim("ENG-1", "w1"));
});

test("a claim runs, heartbeats and completes", () => {
  const ledger = new DelegationLedger();
  ledger.claim("ENG-2", "w1");
  const running = ledger.start("ENG-2", "w1", "sess-1");
  assert.equal(running.state, "running");
  assert.equal(running.sessionId, "sess-1");
  ledger.heartbeat("ENG-2", "w1");
  assert.equal(ledger.complete("ENG-2", "w1").state, "complete");
  // A completed issue is never handed out again.
  assert.equal(ledger.claim("ENG-2", "w2"), null);
});

test("only the holding worker may advance a claim", () => {
  const ledger = new DelegationLedger();
  ledger.claim("ENG-3", "w1");
  assert.throws(() => ledger.start("ENG-3", "w2"), /does not hold the claim/);
  assert.throws(() => ledger.complete("ENG-3", "w2"), /does not hold the claim/);
});

test("illegal transitions are refused by the transition table", () => {
  // This must exercise _transition's guard, not _requireOwned's. Every
  // terminal method nulls workerId, so calling one twice trips the OWNERSHIP
  // check and never reaches the transition table — which is what this test
  // used to do, leaving the transition guard entirely uncovered.
  const ledger = new DelegationLedger();
  ledger.claim("ENG-4", "w1");
  ledger.start("ENG-4", "w1");
  // Still owned by w1 and already "running", so running -> running is illegal.
  assert.throws(() => ledger.start("ENG-4", "w1"), /Illegal claim transition/);

  ledger.complete("ENG-4", "w1");
  // Ownership is a separate guard, checked first once workerId is cleared.
  assert.throws(() => ledger.complete("ENG-4", "w1"), /does not hold the claim/);
  assert.deepEqual([...CLAIM_STATES].includes("released"), true);
});

test("an expired lease returns the issue to the pool", () => {
  let now = 0;
  const ledger = new DelegationLedger({ leaseMs: 1000, now: () => now });
  ledger.claim("ENG-5", "w1");
  ledger.start("ENG-5", "w1");

  now = 500;
  assert.deepEqual(ledger.sweepExpired(), [], "a live lease is not swept");

  now = 2000;
  assert.deepEqual(ledger.sweepExpired(), ["ENG-5"]);
  // Now a different worker may take it.
  assert.ok(ledger.claim("ENG-5", "w2"));
});

test("heartbeating keeps a long run from being swept", () => {
  let now = 0;
  const ledger = new DelegationLedger({ leaseMs: 1000, now: () => now });
  ledger.claim("ENG-6", "w1");
  ledger.start("ENG-6", "w1");

  for (let i = 0; i < 5; i++) {
    now += 800;
    ledger.heartbeat("ENG-6", "w1");
    assert.deepEqual(ledger.sweepExpired(), []);
  }
});

test("failures are retried up to maxAttempts, then parked", () => {
  const ledger = new DelegationLedger({ maxAttempts: 2 });
  ledger.claim("ENG-7", "w1");
  ledger.fail("ENG-7", "w1", "tests failed");
  assert.deepEqual(ledger.dispatchable(["ENG-7"]), ["ENG-7"], "retry is allowed");

  ledger.claim("ENG-7", "w2");
  ledger.fail("ENG-7", "w2", "tests failed again");
  assert.deepEqual(ledger.dispatchable(["ENG-7"]), [], "exhausted attempts are parked");
  assert.equal(ledger.claim("ENG-7", "w3"), null);
});

test("release hands work back without consuming a retry", () => {
  const ledger = new DelegationLedger({ maxAttempts: 2 });
  const claim = ledger.claim("ENG-8", "w1");
  assert.equal(claim.attempts, 1);
  ledger.release("ENG-8", "w1");
  assert.equal(ledger.claims.get("ENG-8").attempts, 0);
  assert.deepEqual(ledger.dispatchable(["ENG-8"]), ["ENG-8"]);
});

test("repeated releases are bounded, so a release loop cannot livelock", () => {
  // Regression: `release()` refunded the attempt unconditionally, so a worker
  // that released every time was re-dispatched forever — burning a slot on each
  // pass and never surfacing to a human.
  const ledger = new DelegationLedger({ maxAttempts: 2, maxReleases: 3 });
  for (let i = 0; i < 3; i++) {
    const claim = ledger.claim("ENG-20", `w${i}`);
    assert.ok(claim, `release ${i} should still be dispatchable`);
    ledger.release("ENG-20", `w${i}`);
  }
  assert.equal(ledger.claims.get("ENG-20").releases, 3);
  assert.equal(ledger.claim("ENG-20", "w4"), null, "parked after maxReleases");
  assert.deepEqual(ledger.dispatchable(["ENG-20"]), [], "and no longer dispatchable");
});

test("an expired lease is not counted as a voluntary release", () => {
  // Lease expiry also lands in `released`, but it is not the worker giving up —
  // it must not consume the release budget.
  let now = 0;
  const ledger = new DelegationLedger({ leaseMs: 100, maxReleases: 2, now: () => now });
  ledger.claim("ENG-21", "w1");
  ledger.start("ENG-21", "w1");
  now = 5000;
  assert.deepEqual(ledger.sweepExpired(), ["ENG-21"]);
  assert.equal(ledger.claims.get("ENG-21").releases, 0);
  assert.deepEqual(ledger.dispatchable(["ENG-21"]), ["ENG-21"]);
});

test("restoring a snapshot without the releases counter does not park the claim", () => {
  // Backward compatibility: `undefined < maxReleases` is false, which would
  // have parked every claim restored from a pre-`releases` snapshot.
  const legacy = { claims: [{ issueKey: "ENG-22", state: "released", workerId: null }] };
  const ledger = DelegationLedger.restore(legacy);
  assert.equal(ledger.claims.get("ENG-22").releases, 0);
  assert.deepEqual(ledger.dispatchable(["ENG-22"]), ["ENG-22"]);
});

test("activeCount and snapshot round-trip through restore", () => {
  const ledger = new DelegationLedger();
  ledger.claim("ENG-9", "w1");
  ledger.start("ENG-9", "w1");
  ledger.claim("ENG-10", "w2");
  assert.equal(ledger.activeCount(), 2);

  const restored = DelegationLedger.restore(JSON.parse(JSON.stringify(ledger.snapshot())));
  assert.equal(restored.activeCount(), 2);
  assert.equal(restored.claims.get("ENG-9").state, "running");
});

test("retryBackoffMs doubles from 10s and caps", () => {
  assert.equal(retryBackoffMs(1), 10_000);
  assert.equal(retryBackoffMs(2), 20_000);
  assert.equal(retryBackoffMs(3), 40_000);
  assert.equal(retryBackoffMs(99, 300_000), 300_000);
});

// ---- Workspace ------------------------------------------------------------

test("sanitizeKey accepts valid issue keys and rejects path traversal", () => {
  assert.equal(sanitizeKey("eng-12"), "ENG-12");
  assert.equal(sanitizeKey("ENG-12"), "ENG-12");
  for (const bad of ["../etc", "ENG-12/../..", "", "ENG", "-1", "ENG-", "a b-1", "ENG-12;rm"]) {
    assert.throws(() => sanitizeKey(bad), /not a valid Linear issue key/, `should reject ${bad}`);
  }
});

test("the workspace manager builds a worktree path under its root", async () => {
  const commands = [];
  const mgr = new WorkspaceManager({
    repoRoot: "/repo",
    workspaceRoot: "/tmp/ws",
    baseRef: "main",
    exec: async (cmd, args) => {
      commands.push([cmd, ...args].join(" "));
      return { stdout: "", stderr: "" };
    },
  });
  assert.equal(mgr.pathFor("ENG-3"), "/tmp/ws/ENG-3");

  const ctx = await mgr.create("ENG-3");
  assert.equal(ctx.path, "/tmp/ws/ENG-3");
  assert.equal(ctx.branch, "linear/eng-3");
  assert.ok(
    commands.some((c) => c.includes("worktree add -B linear/eng-3 /tmp/ws/ENG-3 main")),
    `expected a worktree add, got: ${commands.join(" | ")}`,
  );
});

test("workspace hooks fire around a run and afterRun cannot mask a failure", async () => {
  const order = [];
  const mgr = new WorkspaceManager({
    repoRoot: "/repo",
    workspaceRoot: "/tmp/ws",
    exec: async () => ({ stdout: "", stderr: "" }),
    hooks: {
      beforeRun: async () => void order.push("before"),
      afterRun: async () => {
        order.push("after");
        throw new Error("hook blew up");
      },
    },
  });

  await assert.rejects(
    () => mgr.run("ENG-4", async () => { order.push("work"); throw new Error("real failure"); }),
    /real failure/,
    "the work's error must survive a throwing afterRun hook",
  );
  assert.deepEqual(order, ["before", "work", "after"]);
});

// ---- Conductor ------------------------------------------------------------

/** @param {string[]} keys */
const issues = (keys) => keys.map((k) => ({ identifier: k, id: k, title: `Work on ${k}` }));

test("a tick dispatches up to the concurrency limit", async () => {
  const started = [];
  const conductor = new Conductor({
    concurrency: 2,
    source: async () => issues(["ENG-1", "ENG-2", "ENG-3"]),
    worker: async (ctx) => {
      started.push(ctx.issue.identifier);
      return { ok: true, summary: "done" };
    },
  });

  const dispatched = await conductor.tick();
  assert.equal(dispatched.length, 2, "must not exceed concurrency");
  await conductor.drain();
  assert.equal(started.length, 2);
});

test("the same issue is never dispatched twice concurrently", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const seen = [];

  const conductor = new Conductor({
    concurrency: 5,
    source: async () => issues(["ENG-1"]),
    worker: async (ctx) => {
      seen.push(ctx.issue.identifier);
      await gate;
      return { ok: true };
    },
  });

  await conductor.tick();
  await conductor.tick(); // second pass while the first is still in flight
  await conductor.tick();
  release();
  await conductor.drain();

  assert.deepEqual(seen, ["ENG-1"], "one issue, one worker");
});

test("a worker returning ok:false marks the claim failed without crashing the loop", async () => {
  const events = [];
  const conductor = new Conductor({
    source: async () => issues(["ENG-1"]),
    worker: async () => ({ ok: false, summary: "tests red" }),
    onEvent: (e) => events.push(e),
  });

  await conductor.tick();
  await conductor.drain();

  assert.ok(events.some((e) => e.type === "run.failed" && e.reason === "tests red"));
  assert.equal(conductor.ledger.claims.get("ENG-1").state, "failed");
});

test("a worker that throws is recorded as crashed, not lost", async () => {
  const events = [];
  const conductor = new Conductor({
    source: async () => issues(["ENG-1"]),
    worker: async () => { throw new Error("segfault"); },
    onEvent: (e) => events.push(e),
  });

  await conductor.tick();
  await conductor.drain();

  const crash = events.find((e) => e.type === "run.crashed");
  assert.ok(crash);
  assert.match(crash.error, /segfault/);
});

test("a crashed worker still closes its Linear agent session", async () => {
  const posted = [];
  const client = {
    async request(_q, variables) {
      posted.push(variables.input.content);
      return { agentActivityCreate: { success: true } };
    },
  };
  const conductor = new Conductor({
    client,
    createSession: async () => "sess-99",
    source: async () => issues(["ENG-1"]),
    worker: async () => { throw new Error("worker died"); },
  });

  await conductor.tick();
  await conductor.drain();

  const types = posted.map((p) => p.type);
  assert.equal(types[0], "thought", "must acknowledge before doing any work");
  assert.ok(types.includes("error"), "a dead worker must not leave the session open");
  assert.match(posted.at(-1).body, /worker died/);
});

test("a successful run acknowledges, narrates, then responds", async () => {
  const posted = [];
  const client = {
    async request(_q, variables) {
      posted.push(variables.input.content);
      return { agentActivityCreate: { success: true } };
    },
  };
  const conductor = new Conductor({
    client,
    createSession: async () => "sess-1",
    source: async () => issues(["ENG-1"]),
    worker: async () => ({ ok: true, summary: "Opened PR #7" }),
  });

  await conductor.tick();
  await conductor.drain();

  assert.deepEqual(posted.map((p) => p.type), ["thought", "action", "response"]);
  assert.equal(posted.at(-1).body, "Opened PR #7");
});

test("a failed success-notification does not relabel a successful run as crashed", async () => {
  // Regression, and the worst bug found in review: `ledger.complete()` ran,
  // then an unguarded `session.respond()` threw, which fell through to the
  // crash handler — emitting run.crashed and posting an `error` activity for
  // work that actually succeeded. Worse than silence, because it lies.
  const events = [];
  const client = {
    async request(_q, variables) {
      if (variables.input.content.type === "response") throw new Error("network blip");
      return { agentActivityCreate: { success: true } };
    },
  };
  const conductor = new Conductor({
    client,
    createSession: async () => "sess-1",
    source: async () => issues(["ENG-1"]),
    worker: async () => ({ ok: true, summary: "Opened PR #9" }),
    onEvent: (e) => events.push(e),
  });

  await conductor.tick();
  await conductor.drain();

  const kinds = events.map((e) => e.type);
  assert.ok(kinds.includes("run.complete"), "the run succeeded and must be reported as such");
  assert.ok(!kinds.includes("run.crashed"), "a notification failure is not a crash");
  assert.ok(kinds.includes("session.notify_failed"), "but the notification failure is surfaced");
  assert.equal(conductor.ledger.claims.get("ENG-1").state, "complete");
});

test("duplicate identifiers from the source do not waste dispatch slots", async () => {
  // dispatchable() returned the dupe twice, both copies consumed capacity, and
  // the second claim was refused — starving a real candidate for the tick.
  const started = [];
  const conductor = new Conductor({
    concurrency: 2,
    source: async () => issues(["ENG-1", "ENG-1", "ENG-3"]),
    worker: async (ctx) => {
      started.push(ctx.issue.identifier);
      return { ok: true };
    },
  });

  await conductor.tick();
  await conductor.drain();

  assert.deepEqual(started.sort(), ["ENG-1", "ENG-3"], "both distinct issues get a slot");
});

test("a stalled worker is timed out rather than hanging the swarm", async () => {
  const events = [];
  const conductor = new Conductor({
    stallTimeoutMs: 20,
    source: async () => issues(["ENG-1"]),
    worker: () => new Promise(() => {}), // never settles
    onEvent: (e) => events.push(e),
  });

  await conductor.tick();
  await conductor.drain();

  const crash = events.find((e) => e.type === "run.crashed");
  assert.ok(crash, "a stalled worker must surface as a crash");
  assert.match(crash.error, /stalled/);
});

test("run() honours maxTicks and drains in-flight work", async () => {
  let ticks = 0;
  const conductor = new Conductor({
    pollIntervalMs: 0,
    source: async () => { ticks += 1; return issues([`ENG-${ticks}`]); },
    worker: async () => ({ ok: true }),
    sleep: async () => {},
  });

  await conductor.run({ maxTicks: 3 });
  assert.equal(ticks, 3);
  assert.equal(conductor.status().inFlight, 0);
});

test("stop() halts further claiming", async () => {
  const conductor = new Conductor({
    pollIntervalMs: 0,
    source: async () => issues(["ENG-1", "ENG-2"]),
    worker: async () => ({ ok: true }),
    sleep: async () => {},
  });
  conductor.stop();
  await conductor.run({ maxTicks: 5 });
  assert.equal(conductor.status().inFlight, 0);
});

test("a failing source does not kill the loop", async () => {
  const events = [];
  const conductor = new Conductor({
    pollIntervalMs: 0,
    source: async () => { throw new Error("Linear unreachable"); },
    worker: async () => ({ ok: true }),
    onEvent: (e) => events.push(e),
    sleep: async () => {},
  });

  await conductor.run({ maxTicks: 2 });
  assert.equal(events.filter((e) => e.type === "tick.error").length, 2);
});

test("the conductor requires a source and a worker", () => {
  assert.throws(() => new Conductor({ worker: async () => ({ ok: true }) }), /requires a `source`/);
  assert.throws(() => new Conductor({ source: async () => [] }), /requires a `worker`/);
});

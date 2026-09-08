/**
 * The Conductor: dispatch Linear issues to a pool of parallel workers.
 *
 * Architecture is Symphony's (https://github.com/openai/symphony) — a single
 * serialising dispatch loop over an issue source, per-issue isolated
 * workspaces, bounded concurrency, exponential backoff, stall detection — with
 * one substitution that matters: **Linear's Agent Sessions are the status
 * surface**. Symphony ships an optional operator dashboard; here the operator
 * already has one, inside the tool where the work lives, so every run-state
 * transition becomes an agent activity on the issue instead.
 *
 *   Linear issue  ->  claim (ledger)  ->  worktree (workspace)
 *                 ->  worker run      ->  agent activities  ->  PR via VcsProvider
 *
 * Dispatch is serialised deliberately: only the loop claims work, so two
 * workers can never take the same issue. Workers then run concurrently.
 */

import { DelegationLedger, retryBackoffMs } from "./ledger.mjs";
import { AgentSession } from "../agent-session.mjs";

/** Run states, mirroring Symphony's progression. */
export const RUN_STATES = Object.freeze([
  "preparingWorkspace",
  "buildingPrompt",
  "launchingWorker",
  "running",
  "finishing",
  "terminal",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Conductor {
  /**
   * @param {object} cfg
   * @param {() => Promise<Array<{ identifier: string, id?: string, title: string }>>} cfg.source
   *        Returns candidate issues, highest priority first.
   * @param {(ctx: WorkerContext) => Promise<WorkerResult>} cfg.worker
   *        Runs one issue to completion. Must not throw for ordinary failure —
   *        return `{ ok: false, summary }` instead; throwing is treated as a crash.
   * @param {import("./workspace.mjs").WorkspaceManager} [cfg.workspaces]
   * @param {import("../linear-client.mjs").LinearClient} [cfg.client]
   *        Required only when `createSession` is used.
   * @param {(issue: object) => Promise<string|null>} [cfg.createSession]
   *        Resolve or create a Linear agent session id for an issue.
   * @param {number} [cfg.concurrency]
   * @param {number} [cfg.pollIntervalMs]
   * @param {number} [cfg.stallTimeoutMs]
   * @param {number} [cfg.maxAttempts]
   * @param {DelegationLedger} [cfg.ledger]
   * @param {(event: object) => void} [cfg.onEvent] Structured observability sink.
   * @param {() => number} [cfg.now]
   * @param {(ms: number) => Promise<void>} [cfg.sleep]
   */
  constructor(cfg) {
    if (typeof cfg?.source !== "function") throw new Error("Conductor requires a `source`.");
    if (typeof cfg?.worker !== "function") throw new Error("Conductor requires a `worker`.");
    this.source = cfg.source;
    this.worker = cfg.worker;
    this.workspaces = cfg.workspaces;
    this.client = cfg.client;
    this.createSession = cfg.createSession;
    this.concurrency = Math.max(1, cfg.concurrency ?? 3);
    this.pollIntervalMs = cfg.pollIntervalMs ?? 30_000;
    this.stallTimeoutMs = cfg.stallTimeoutMs ?? 10 * 60_000;
    this.maxAttempts = cfg.maxAttempts ?? 3;
    this.ledger =
      cfg.ledger ?? new DelegationLedger({ maxAttempts: this.maxAttempts, now: cfg.now });
    this.onEvent = cfg.onEvent ?? (() => {});
    this._now = cfg.now ?? (() => Date.now());
    this._sleep = cfg.sleep ?? sleep;
    this.stopping = false;
    /** @type {Map<string, Promise<void>>} */
    this.inFlight = new Map();
  }

  /**
   * @param {string} type
   * @param {object} [detail]
   */
  _emit(type, detail = {}) {
    this.onEvent({ type, at: this._now(), ...detail });
  }

  /**
   * Run one dispatch pass: claim what capacity allows and start those workers.
   * Returns the issue keys dispatched in this pass.
   *
   * Exposed separately from {@link run} so it can be driven deterministically
   * by tests and by a cron-style host that does not want a long-lived loop.
   *
   * @returns {Promise<string[]>}
   */
  async tick() {
    const reclaimed = this.ledger.sweepExpired();
    for (const key of reclaimed) this._emit("claim.reclaimed", { issueKey: key });

    const capacity = this.concurrency - this.inFlight.size;
    if (capacity <= 0) return [];

    const issues = await this.source();
    // De-duplicate by identifier: a source that returns the same issue twice
    // would otherwise consume two capacity slots for one issue (the second
    // claim is refused and the slot is simply lost), starving a real candidate.
    const byKey = new Map(issues.map((i) => [i.identifier, i]));
    const eligible = this.ledger
      .dispatchable([...byKey.keys()])
      .filter((key) => !this.inFlight.has(key))
      .slice(0, capacity);

    const dispatched = [];
    for (const key of eligible) {
      const issue = byKey.get(key);
      if (!issue) continue;
      const workerId = `worker-${key}-${this._now()}`;
      const claim = this.ledger.claim(key, workerId);
      if (!claim) continue;

      const backoff = claim.attempts > 1 ? retryBackoffMs(claim.attempts - 1) : 0;
      const promise = this._dispatch(issue, workerId, backoff).finally(() => {
        this.inFlight.delete(key);
      });
      this.inFlight.set(key, promise);
      dispatched.push(key);
    }
    return dispatched;
  }

  /**
   * @param {{ identifier: string, id?: string, title: string }} issue
   * @param {string} workerId
   * @param {number} backoffMs
   */
  async _dispatch(issue, workerId, backoffMs) {
    const key = issue.identifier;

    /** @type {AgentSession|null} */
    let session = null;

    // Start the heartbeat BEFORE any awaiting. The claim is already held at
    // this point, but its lease is only as fresh as `claimedAt`; the backoff
    // sleep and the session-creation round trips below can together outlast
    // `leaseMs`, at which point the sweep would hand this issue to a second
    // worker while this one is still starting up. That is precisely the
    // double-dispatch the ledger exists to prevent.
    let heartbeat = setInterval(() => {
      try {
        this.ledger.heartbeat(key, workerId);
      } catch {
        /* claim already resolved or reassigned */
      }
    }, Math.max(1000, Math.floor(this.ledger.leaseMs / 3)));
    if (typeof heartbeat.unref === "function") heartbeat.unref();

    if (backoffMs > 0) {
      this._emit("run.backoff", { issueKey: key, backoffMs });
      await this._sleep(backoffMs);
    }

    try {
      if (this.createSession && this.client) {
        const sessionId = await this.createSession(issue);
        if (sessionId) {
          session = new AgentSession(this.client, sessionId, { now: this._now });
          // Agent Interaction Guidelines: emit within 10s or Linear marks the
          // session stale. This is the first thing we do, before any git work.
          await session.thought(`Picked up ${key}. Preparing an isolated workspace.`);
        }
      }

      this.ledger.start(key, workerId, session?.sessionId ?? null);
      this._emit("run.state", { issueKey: key, state: "preparingWorkspace" });

      const workspace = this.workspaces ? await this.workspaces.create(key) : null;

      this._emit("run.state", { issueKey: key, state: "launchingWorker" });
      if (session) {
        await session.action("Prepare workspace", workspace?.path ?? "(none)");
      }

      /** @type {WorkerContext} */
      const ctx = { issue, workspace, session, workerId, signalStall: () => this._now() };

      this._emit("run.state", { issueKey: key, state: "running" });
      const result = await this._withStallTimeout(
        this.workspaces ? this.workspaces.run(key, () => this.worker(ctx)) : this.worker(ctx),
        key,
      );

      this._emit("run.state", { issueKey: key, state: "finishing" });

      // The outcome is decided here and recorded in the ledger. Posting it to
      // Linear is a separate, best-effort step: a transient failure while
      // announcing the result must never change what the result *was*. Letting
      // a failed `session.respond()` fall through to the catch below would
      // emit `run.crashed` and post an `error` activity for work that actually
      // succeeded — worse than staying quiet, because it actively lies.
      if (result?.ok) {
        this.ledger.complete(key, workerId);
        this._emit("run.complete", { issueKey: key, result });
        if (session && !session.terminated) {
          await session
            .respond(result.summary ?? `Finished ${key}.`)
            .catch((err) =>
              this._emit("session.notify_failed", {
                issueKey: key,
                outcome: "complete",
                error: err.message,
              }),
            );
        }
      } else {
        const reason = result?.summary ?? "Worker reported failure without a summary.";
        this.ledger.fail(key, workerId, reason);
        this._emit("run.failed", { issueKey: key, reason });
        if (session && !session.terminated) {
          await session.fail(reason).catch((err) =>
            this._emit("session.notify_failed", {
              issueKey: key,
              outcome: "failed",
              error: err.message,
            }),
          );
        }
      }
      return;
    } catch (err) {
      const error = /** @type {Error} */ (err);
      try {
        this.ledger.fail(key, workerId, error.message);
      } catch {
        /* claim may already be terminal */
      }
      // A crashed worker must still close its Linear session, or the issue
      // sits in `active` forever and nobody learns it died.
      if (session && !session.terminated) {
        await session.fail(`Run crashed: ${error.message}`).catch(() => {});
      }
      this._emit("run.crashed", { issueKey: key, error: error.message });
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      this._emit("run.state", { issueKey: key, state: "terminal" });
    }
  }

  /**
   * Reject if a worker goes silent past the stall timeout.
   * @template T
   * @param {Promise<T>} promise
   * @param {string} issueKey
   * @returns {Promise<T>}
   */
  async _withStallTimeout(promise, issueKey) {
    let timer;
    const stall = new Promise((_, reject) => {
      // Deliberately NOT unref'd. A pending promise does not hold the event
      // loop open, so an unref'd timer here can be skipped entirely in a quiet
      // process — precisely the situation a stalled worker creates. The
      // `finally` below clears it, so it cannot outlive the run.
      timer = setTimeout(() => {
        reject(new Error(`Worker for ${issueKey} stalled for ${this.stallTimeoutMs}ms.`));
      }, this.stallTimeoutMs);
    });
    try {
      return await Promise.race([promise, stall]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Long-running loop. Call {@link stop} to drain.
   * @param {{ maxTicks?: number }} [opts]
   */
  async run(opts = {}) {
    const maxTicks = opts.maxTicks ?? Infinity;
    let ticks = 0;
    this.stopping = false;
    while (!this.stopping && ticks < maxTicks) {
      try {
        await this.tick();
      } catch (err) {
        this._emit("tick.error", { error: /** @type {Error} */ (err).message });
      }
      ticks += 1;
      if (this.stopping || ticks >= maxTicks) break;
      await this._sleep(this.pollIntervalMs);
    }
    await this.drain();
  }

  /** Stop claiming new work. In-flight runs are allowed to finish. */
  stop() {
    this.stopping = true;
  }

  /** Wait for every in-flight run to settle. */
  async drain() {
    while (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight.values()]);
    }
  }

  /** @returns {{ inFlight: number, active: number, claims: object[] }} */
  status() {
    return {
      inFlight: this.inFlight.size,
      active: this.ledger.activeCount(),
      claims: this.ledger.snapshot().claims,
    };
  }
}

/**
 * @typedef {object} WorkerContext
 * @property {{ identifier: string, id?: string, title: string }} issue
 * @property {import("./workspace.mjs").WorkspaceContext|null} workspace
 * @property {AgentSession|null} session
 * @property {string} workerId
 * @property {() => number} signalStall
 */

/**
 * @typedef {object} WorkerResult
 * @property {boolean} ok
 * @property {string} [summary]
 * @property {string} [pullRequestUrl]
 */

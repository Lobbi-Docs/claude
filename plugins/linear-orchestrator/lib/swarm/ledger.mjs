/**
 * The delegation ledger: who is working on what, and may they still.
 *
 * Modelled on OpenAI's Symphony claim lifecycle
 * (https://github.com/openai/symphony) — Unclaimed -> Claimed -> Running ->
 * Released -> Terminal — because the failure it prevents is the one that
 * actually bites a swarm: two workers picking up the same Linear issue and
 * opening two pull requests for it.
 *
 * Pure in-memory logic with a serialisable snapshot, so it is testable without
 * a database and can be persisted by whatever the host prefers.
 */

/** @type {readonly ["unclaimed","claimed","running","released","complete","failed"]} */
export const CLAIM_STATES = Object.freeze([
  "unclaimed",
  "claimed",
  "running",
  "released",
  "complete",
  "failed",
]);

/**
 * Legal transitions. A worker that dies mid-run leaves a `running` claim, which
 * the lease sweep returns to `unclaimed` — that is the only way work is retried.
 */
const TRANSITIONS = Object.freeze({
  unclaimed: ["claimed"],
  claimed: ["running", "released", "failed"],
  running: ["released", "complete", "failed"],
  released: ["claimed"],
  complete: [],
  failed: ["claimed"],
});

/**
 * @typedef {object} Claim
 * @property {string} issueKey
 * @property {string} state
 * @property {string|null} workerId
 * @property {string|null} sessionId  Linear agent session id, when one exists.
 * @property {number} attempts
 * @property {number} claimedAt
 * @property {number} heartbeatAt
 * @property {number} leaseMs
 * @property {string|null} lastError
 */

export class DelegationLedger {
  /**
   * @param {object} [opts]
   * @param {number} [opts.leaseMs]     How long a claim survives without a heartbeat.
   * @param {number} [opts.maxAttempts] Attempts before an issue is parked as failed.
   * @param {() => number} [opts.now]
   */
  constructor(opts = {}) {
    this.leaseMs = opts.leaseMs ?? 15 * 60_000;
    this.maxAttempts = opts.maxAttempts ?? 3;
    this._now = opts.now ?? (() => Date.now());
    /** @type {Map<string, Claim>} */
    this.claims = new Map();
  }

  /**
   * @param {string} issueKey
   * @returns {Claim}
   */
  _ensure(issueKey) {
    let claim = this.claims.get(issueKey);
    if (!claim) {
      claim = {
        issueKey,
        state: "unclaimed",
        workerId: null,
        sessionId: null,
        attempts: 0,
        claimedAt: 0,
        heartbeatAt: 0,
        leaseMs: this.leaseMs,
        lastError: null,
      };
      this.claims.set(issueKey, claim);
    }
    return claim;
  }

  /**
   * @param {Claim} claim
   * @param {string} next
   */
  _transition(claim, next) {
    const allowed = TRANSITIONS[claim.state] ?? [];
    if (!allowed.includes(next)) {
      throw new Error(
        `Illegal claim transition for ${claim.issueKey}: ${claim.state} -> ${next}. ` +
          `Allowed: ${allowed.join(", ") || "(none — terminal)"}.`,
      );
    }
    claim.state = next;
  }

  /**
   * Attempt to take exclusive ownership of an issue.
   *
   * Returns null when someone else holds a live claim — the caller must skip
   * the issue rather than proceed.
   *
   * @param {string} issueKey
   * @param {string} workerId
   * @returns {Claim|null}
   */
  claim(issueKey, workerId) {
    this.sweepExpired();
    const claim = this._ensure(issueKey);

    if (claim.state === "complete") return null;
    if (claim.state === "claimed" || claim.state === "running") {
      // Re-entrant claim by the same worker is a no-op, not a conflict.
      return claim.workerId === workerId ? claim : null;
    }
    if (claim.state === "failed" && claim.attempts >= this.maxAttempts) return null;

    this._transition(claim, "claimed");
    claim.workerId = workerId;
    claim.attempts += 1;
    claim.claimedAt = this._now();
    claim.heartbeatAt = claim.claimedAt;
    return claim;
  }

  /**
   * @param {string} issueKey
   * @param {string} workerId
   * @param {string|null} [sessionId]
   */
  start(issueKey, workerId, sessionId = null) {
    const claim = this._requireOwned(issueKey, workerId);
    this._transition(claim, "running");
    claim.sessionId = sessionId;
    claim.heartbeatAt = this._now();
    return claim;
  }

  /**
   * Keep a long-running claim alive. Without this the lease sweep will reclaim
   * the issue and a second worker will start on it.
   * @param {string} issueKey
   * @param {string} workerId
   */
  heartbeat(issueKey, workerId) {
    const claim = this._requireOwned(issueKey, workerId);
    claim.heartbeatAt = this._now();
    return claim;
  }

  /** @param {string} issueKey @param {string} workerId */
  complete(issueKey, workerId) {
    const claim = this._requireOwned(issueKey, workerId);
    this._transition(claim, "complete");
    claim.workerId = null;
    claim.lastError = null;
    return claim;
  }

  /**
   * @param {string} issueKey
   * @param {string} workerId
   * @param {string} error
   */
  fail(issueKey, workerId, error) {
    const claim = this._requireOwned(issueKey, workerId);
    this._transition(claim, "failed");
    claim.workerId = null;
    claim.lastError = error;
    return claim;
  }

  /**
   * Give the issue back without consuming a retry — used when a worker decides
   * the issue is not actually actionable (missing spec, blocked dependency).
   * @param {string} issueKey
   * @param {string} workerId
   */
  release(issueKey, workerId) {
    const claim = this._requireOwned(issueKey, workerId);
    this._transition(claim, "released");
    claim.workerId = null;
    claim.attempts = Math.max(0, claim.attempts - 1);
    return claim;
  }

  /**
   * @param {string} issueKey
   * @param {string} workerId
   * @returns {Claim}
   */
  _requireOwned(issueKey, workerId) {
    const claim = this.claims.get(issueKey);
    if (!claim) throw new Error(`No claim exists for ${issueKey}.`);
    if (claim.workerId !== workerId) {
      throw new Error(
        `Worker ${workerId} does not hold the claim on ${issueKey} (held by ${claim.workerId ?? "nobody"}).`,
      );
    }
    return claim;
  }

  /**
   * Return claims whose lease has lapsed to the pool.
   * @returns {string[]} Issue keys that were reclaimed.
   */
  sweepExpired() {
    const now = this._now();
    const reclaimed = [];
    for (const claim of this.claims.values()) {
      if (claim.state !== "claimed" && claim.state !== "running") continue;
      if (now - claim.heartbeatAt <= claim.leaseMs) continue;
      claim.state = "released";
      claim.workerId = null;
      claim.lastError = `Lease expired after ${claim.leaseMs}ms without a heartbeat.`;
      reclaimed.push(claim.issueKey);
    }
    return reclaimed;
  }

  /**
   * Issues eligible for dispatch right now.
   * @param {string[]} candidates
   * @returns {string[]}
   */
  dispatchable(candidates) {
    this.sweepExpired();
    return candidates.filter((key) => {
      const claim = this.claims.get(key);
      if (!claim) return true;
      if (claim.state === "unclaimed" || claim.state === "released") return true;
      if (claim.state === "failed") return claim.attempts < this.maxAttempts;
      return false;
    });
  }

  /** @returns {number} How many claims are actively held. */
  activeCount() {
    let n = 0;
    for (const c of this.claims.values()) {
      if (c.state === "claimed" || c.state === "running") n += 1;
    }
    return n;
  }

  /** @returns {{ claims: Claim[] }} */
  snapshot() {
    return { claims: [...this.claims.values()].map((c) => ({ ...c })) };
  }

  /**
   * @param {{ claims: Claim[] }} snap
   * @param {object} [opts]
   * @returns {DelegationLedger}
   */
  static restore(snap, opts = {}) {
    const ledger = new DelegationLedger(opts);
    for (const claim of snap?.claims ?? []) ledger.claims.set(claim.issueKey, { ...claim });
    return ledger;
  }
}

/**
 * Symphony's retry backoff: 10s doubling, capped.
 * @param {number} attempt 1-based.
 * @param {number} [maxMs]
 * @returns {number}
 */
export function retryBackoffMs(attempt, maxMs = 300_000) {
  const n = Math.max(1, attempt);
  return Math.min(10_000 * 2 ** (n - 1), maxMs);
}

/**
 * Linear webhook verification and event normalisation.
 *
 * Reference: https://linear.app/developers/webhooks
 *
 * Two things here are easy to get wrong and both are load-bearing:
 *  1. Linear's `Linear-Signature` is **bare hex** — no `sha256=` prefix. Code
 *     copied from a GitHub integration will reject every delivery.
 *  2. The signature covers the **raw request body**. Verifying a re-serialised
 *     object will fail intermittently on key ordering and unicode escapes.
 */

import { verifyHexSignature } from "./crypto.mjs";

/**
 * Resource types Linear can deliver. Subscribe to the narrowest set you need —
 * every extra type is delivery volume you must verify, dedupe, and ignore.
 */
export const WEBHOOK_RESOURCE_TYPES = Object.freeze([
  "Issue",
  "IssueLabel",
  "IssueSLA",
  "Comment",
  "Reaction",
  "Project",
  "ProjectUpdate",
  "Cycle",
  "Initiative",
  "InitiativeUpdate",
  "Customer",
  "CustomerNeed",
  "Document",
  "Attachment",
  "AgentSessionEvent",
  "AuditEntry",
  "OAuthApp",
]);

/** A webhook receiver must return 2xx inside this window. Ack first, work after. */
export const WEBHOOK_ACK_DEADLINE_MS = 5_000;

/**
 * @typedef {object} VerifyResult
 * @property {boolean} ok
 * @property {"bad_signature"|"stale_timestamp"|"malformed_body"|"missing_secret"} [reason]
 */

// Re-exported so existing importers of this path keep working; the primitives
// themselves are provider-neutral and live in ./crypto.mjs.
export { isWellFormedHexDigest, hmacSha256Hex } from "./crypto.mjs";

/**
 * Verify a Linear webhook delivery.
 *
 * @param {Buffer} rawBody Raw, unparsed body bytes.
 * @param {string|null|undefined} signatureHex Value of the `Linear-Signature` header.
 * @param {string} secret Webhook signing secret.
 * @param {{ now?: number, maxAgeMs?: number }} [opts]
 * @returns {VerifyResult}
 */
export function verifyWebhook(rawBody, signatureHex, secret, opts = {}) {
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!signatureHex || !rawBody?.length) return { ok: false, reason: "malformed_body" };
  if (!verifyHexSignature(rawBody, signatureHex, secret)) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed_body" };
  }

  // Replay protection. Linear embeds the send time in the payload itself, and
  // it is covered by the signature.
  //
  // A missing or non-numeric timestamp is REJECTED rather than skipped. Failing
  // open here would silently disable replay protection for any delivery that
  // omits the field, which is the wrong default for a security control.
  const ts = parsed?.webhookTimestamp;
  if (typeof ts !== "number" || !Number.isFinite(ts)) {
    return { ok: false, reason: "stale_timestamp" };
  }
  const maxAge = opts.maxAgeMs ?? 60_000;
  const now = opts.now ?? Date.now();
  if (Math.abs(now - ts) > maxAge) {
    return { ok: false, reason: "stale_timestamp" };
  }

  return { ok: true };
}

/**
 * @typedef {object} LinearEvent
 * @property {string} deliveryId
 * @property {string} type       Resource type, e.g. "Issue".
 * @property {string} action     "create" | "update" | "remove" | agent action.
 * @property {object|null} data
 * @property {object|null} actor
 * @property {string[]} changedFields Populated on updates via `updatedFrom`.
 * @property {string|null} url
 * @property {object} raw
 */

/**
 * Normalise a verified delivery into a stable shape.
 *
 * @param {Record<string,string>} headers
 * @param {object} payload Parsed body.
 * @returns {LinearEvent}
 */
export function normalizeEvent(headers, payload) {
  const header = (name) => headers?.[name] ?? headers?.[name.toLowerCase()] ?? null;
  return {
    deliveryId: header("Linear-Delivery") ?? payload?.webhookId ?? "",
    type: payload?.type ?? header("Linear-Event") ?? "",
    action: payload?.action ?? "",
    data: payload?.data ?? null,
    actor: payload?.actor ?? null,
    changedFields: Object.keys(payload?.updatedFrom ?? {}),
    url: payload?.url ?? null,
    raw: payload,
  };
}

/**
 * Bounded-size replay guard.
 *
 * Linear retries deliveries, so handlers must be idempotent. Keyed on
 * `Linear-Delivery`, which is stable across retries of the same event.
 */
export class DeliveryDeduper {
  /**
   * @param {{ maxEntries?: number, ttlMs?: number, now?: () => number }} [opts]
   */
  constructor(opts = {}) {
    this.maxEntries = opts.maxEntries ?? 5000;
    this.ttlMs = opts.ttlMs ?? 60 * 60_000;
    this._now = opts.now ?? (() => Date.now());
    /** @type {Map<string, number>} */
    this.seen = new Map();
  }

  /**
   * Record a delivery id.
   * @param {string} deliveryId
   * @returns {boolean} true if this is the first sighting (i.e. process it).
   */
  admit(deliveryId) {
    if (!deliveryId) return true; // Cannot dedupe without an id; fail open.
    this._evict();
    if (this.seen.has(deliveryId)) return false;
    this.seen.set(deliveryId, this._now());
    return true;
  }

  _evict() {
    const now = this._now();
    // Insertion order is chronological and the TTL is constant, so the first
    // entry still within the window means every later one is too. Stopping
    // there makes this amortised O(1) per delivery instead of a full scan of
    // up to `maxEntries` on every inbound webhook.
    for (const [id, at] of this.seen) {
      if (now - at <= this.ttlMs) break;
      this.seen.delete(id);
    }
    // Map iterates in insertion order, so this drops the oldest first.
    while (this.seen.size >= this.maxEntries) {
      const oldest = this.seen.keys().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }
  }
}

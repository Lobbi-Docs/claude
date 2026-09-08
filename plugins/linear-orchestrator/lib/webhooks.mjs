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

import { createHmac, timingSafeEqual } from "node:crypto";

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

/** A hex-encoded SHA-256 digest: exactly 64 hex characters, nothing else. */
const SHA256_HEX = /^[0-9a-fA-F]{64}$/;

/**
 * Reject anything that is not a well-formed hex SHA-256 digest.
 *
 * This guard is load-bearing. Node's hex decoder stops at the first invalid
 * pair instead of throwing, so `Buffer.from(validSig + "zz", "hex")` yields the
 * same 32 bytes as `validSig` — a signature with trailing garbage would pass a
 * naive length-then-compare check. Validating the string before decoding closes
 * that, and also rejects short-but-valid-prefix inputs before they reach
 * `timingSafeEqual`.
 *
 * @param {unknown} signature
 * @returns {boolean}
 */
export function isWellFormedHexDigest(signature) {
  return typeof signature === "string" && SHA256_HEX.test(signature);
}

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
  if (!isWellFormedHexDigest(signatureHex)) return { ok: false, reason: "bad_signature" };

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHex, "hex");
  const b = Buffer.from(expected, "hex");
  // Both are guaranteed 32 bytes by the guard above, but keep the length check:
  // timingSafeEqual throws on a mismatch rather than returning false.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed_body" };
  }

  // Replay protection. Linear embeds the send time in the payload itself.
  const ts = parsed?.webhookTimestamp;
  const maxAge = opts.maxAgeMs ?? 60_000;
  const now = opts.now ?? Date.now();
  if (typeof ts === "number" && Math.abs(now - ts) > maxAge) {
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
    for (const [id, at] of this.seen) {
      if (now - at > this.ttlMs) this.seen.delete(id);
    }
    // Map iterates in insertion order, so this drops the oldest first.
    while (this.seen.size >= this.maxEntries) {
      const oldest = this.seen.keys().next().value;
      if (oldest === undefined) break;
      this.seen.delete(oldest);
    }
  }
}

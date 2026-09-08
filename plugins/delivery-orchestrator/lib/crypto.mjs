/**
 * Webhook signature primitives, shared by every provider.
 *
 * These live here rather than in `webhooks.mjs` because they are not Linear's:
 * Linear, GitHub and Harness all sign with HMAC-SHA256 and differ only in how
 * the digest is encoded on the wire. Keeping them in the Linear webhook module
 * forced `vcs/harness.mjs` to import from it, pointing a VCS adapter at a
 * module it has no business knowing about.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

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
 * Compute the hex HMAC-SHA256 of a raw body.
 *
 * Always pass the **raw** bytes. Signing a re-serialised object fails
 * intermittently on key ordering and unicode escaping — the worst kind of bug,
 * because it works in testing.
 *
 * @param {string} secret
 * @param {Buffer|Uint8Array|string} rawBody
 * @returns {string}
 */
export function hmacSha256Hex(secret, rawBody) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Constant-time comparison of a received bare-hex digest against the expected
 * HMAC of the body.
 *
 * Handles the well-formedness guard, the length check (`timingSafeEqual` throws
 * on a mismatch rather than returning false), and the comparison itself.
 *
 * @param {Buffer} rawBody
 * @param {unknown} received  Bare hex, no scheme prefix.
 * @param {string} secret
 * @returns {boolean}
 */
export function verifyHexSignature(rawBody, received, secret) {
  if (!secret || !rawBody?.length) return false;
  if (!isWellFormedHexDigest(received)) return false;

  const a = Buffer.from(/** @type {string} */ (received), "hex");
  const b = Buffer.from(hmacSha256Hex(secret, rawBody), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

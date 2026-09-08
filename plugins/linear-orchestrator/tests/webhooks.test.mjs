// Unit tests for lib/webhooks.mjs — signature verification (including the
// bare-hex vs sha256= trap), replay protection, and delivery de-duplication.

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";

import {
  verifyWebhook,
  normalizeEvent,
  DeliveryDeduper,
  WEBHOOK_RESOURCE_TYPES,
} from "../lib/webhooks.mjs";

const SECRET = "whsec_test";

function signedBody(payload, secret = SECRET) {
  const raw = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = createHmac("sha256", secret).update(raw).digest("hex");
  return { raw, sig };
}

test("a correctly signed, fresh delivery verifies", () => {
  const now = Date.now();
  const { raw, sig } = signedBody({ action: "create", type: "Issue", webhookTimestamp: now });
  assert.deepEqual(verifyWebhook(raw, sig, SECRET, { now }), { ok: true });
});

test("a tampered body fails", () => {
  const now = Date.now();
  const { sig } = signedBody({ action: "create", webhookTimestamp: now });
  const tampered = Buffer.from(JSON.stringify({ action: "remove", webhookTimestamp: now }), "utf8");
  assert.deepEqual(verifyWebhook(tampered, sig, SECRET, { now }), {
    ok: false,
    reason: "bad_signature",
  });
});

test("the wrong secret fails", () => {
  const now = Date.now();
  const { raw } = signedBody({ webhookTimestamp: now });
  const wrong = createHmac("sha256", "other").update(raw).digest("hex");
  assert.equal(verifyWebhook(raw, wrong, SECRET, { now }).ok, false);
});

test("Linear sends bare hex — a GitHub-style sha256= prefix must not verify", () => {
  const now = Date.now();
  const { raw, sig } = signedBody({ webhookTimestamp: now });
  const result = verifyWebhook(raw, `sha256=${sig}`, SECRET, { now });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad_signature");
});

test("a stale timestamp is rejected as replay", () => {
  const now = Date.now();
  const { raw, sig } = signedBody({ webhookTimestamp: now - 10 * 60_000 });
  assert.deepEqual(verifyWebhook(raw, sig, SECRET, { now }), {
    ok: false,
    reason: "stale_timestamp",
  });
});

test("missing signature, body, or secret are each reported distinctly", () => {
  const { raw, sig } = signedBody({ webhookTimestamp: Date.now() });
  assert.equal(verifyWebhook(raw, null, SECRET).reason, "malformed_body");
  assert.equal(verifyWebhook(Buffer.alloc(0), sig, SECRET).reason, "malformed_body");
  assert.equal(verifyWebhook(raw, sig, "").reason, "missing_secret");
});

test("a non-hex signature is rejected without throwing", () => {
  const { raw } = signedBody({ webhookTimestamp: Date.now() });
  assert.equal(verifyWebhook(raw, "zzzz-not-hex", SECRET).ok, false);
});

test("a signature of the wrong length is rejected without throwing", () => {
  const { raw } = signedBody({ webhookTimestamp: Date.now() });
  assert.equal(verifyWebhook(raw, "abcd", SECRET).reason, "bad_signature");
});

test("normalizeEvent extracts the delivery id, action and changed fields", () => {
  const event = normalizeEvent(
    { "Linear-Delivery": "d-1", "Linear-Event": "Issue" },
    {
      action: "update",
      type: "Issue",
      data: { id: "i1", identifier: "ENG-7" },
      actor: { id: "u1" },
      updatedFrom: { stateId: "old", priority: 2 },
      url: "https://linear.app/x/issue/ENG-7",
    },
  );
  assert.equal(event.deliveryId, "d-1");
  assert.equal(event.type, "Issue");
  assert.equal(event.action, "update");
  assert.deepEqual(event.changedFields.sort(), ["priority", "stateId"]);
  assert.equal(event.data.identifier, "ENG-7");
});

test("normalizeEvent tolerates lowercase headers and a missing updatedFrom", () => {
  const event = normalizeEvent({ "linear-delivery": "d-2" }, { action: "create", type: "Comment" });
  assert.equal(event.deliveryId, "d-2");
  assert.deepEqual(event.changedFields, []);
});

test("AgentSessionEvent is a subscribable resource type", () => {
  assert.ok(WEBHOOK_RESOURCE_TYPES.includes("AgentSessionEvent"));
  assert.ok(WEBHOOK_RESOURCE_TYPES.includes("IssueSLA"));
});

test("the deduper admits a delivery once", () => {
  const d = new DeliveryDeduper();
  assert.equal(d.admit("a"), true);
  assert.equal(d.admit("a"), false);
  assert.equal(d.admit("b"), true);
});

test("the deduper fails open when there is no delivery id", () => {
  const d = new DeliveryDeduper();
  assert.equal(d.admit(""), true);
  assert.equal(d.admit(""), true);
});

test("the deduper forgets entries past the TTL", () => {
  let now = 0;
  const d = new DeliveryDeduper({ ttlMs: 1000, now: () => now });
  assert.equal(d.admit("a"), true);
  now = 2000;
  assert.equal(d.admit("a"), true, "expired entries are re-admitted");
});

test("the deduper stays bounded, evicting oldest first", () => {
  const d = new DeliveryDeduper({ maxEntries: 3 });
  for (const id of ["a", "b", "c", "d", "e"]) d.admit(id);
  assert.ok(d.seen.size <= 3);
  assert.equal(d.seen.has("e"), true);
  assert.equal(d.seen.has("a"), false);
});

---
name: Linear Webhooks (Verify, Replay, DLQ)
description: This skill should be used when registering, verifying, or processing Linear webhooks — HMAC signatures, replay protection, idempotency, dead-letter queues. Activates on "linear webhook", "webhook signature", "Linear-Signature", "webhook secret".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear Webhooks

Reference: https://linear.app/developers/webhooks

## Signature verification

Linear signs every delivery with HMAC-SHA256:
```
Linear-Signature: <hex digest>
```
Verify in constant time:
```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyLinearSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

**Always** read the raw body bytes, not the parsed JSON. Express:
```ts
app.use("/linear/webhook", express.raw({ type: "application/json" }));
```

## Replay protection

Each delivery has a `webhookTimestamp` field in the JSON body (Unix ms). Reject events older than 5 minutes:
```ts
if (Math.abs(Date.now() - body.webhookTimestamp) > 5 * 60_000) reject();
```

## Idempotency

Linear may re-deliver. Each event has:
- `delivery.id` — unique per delivery (use this!)
- `data.id` — entity ID

Store seen `delivery.id` in Redis with 7-day TTL; ignore duplicates.

## Resource types

`Issue`, `IssueLabel`, `Comment`, `Cycle`, `Project`, `ProjectUpdate`, `Initiative`, `InitiativeUpdate`, `Customer`, `CustomerNeed`, `Reaction`, `Attachment`, `Document`.

Subscribe selectively — fewer types means smaller event volume.

## Action types

`create | update | remove`. Some resources support more; consult the schema.

## Body shape
```json
{
  "action": "update",
  "actor": { "id": "...", "name": "..." },
  "createdAt": "2026-04-30T12:00:00.000Z",
  "data": { /* the resource */ },
  "type": "Issue",
  "url": "https://linear.app/...",
  "webhookTimestamp": 1714478400000,
  "webhookId": "...",
  "delivery": { "id": "..." }
}
```

## Re-fetch on demand

**Don't trust webhook payload state for reads.** Linear may send out-of-order events. After receiving an Issue update, re-fetch via GraphQL using the `id` to get the canonical state.

## Recovering missed deliveries

The plugin deliberately ships **no dead-letter queue**. Reconciliation is the
recovery path instead:

```
/linear:sync reconcile --dry-run
/linear:sync reconcile --apply
```

The reasoning: a DLQ only repairs deliveries that arrived and failed. It cannot
repair a delivery that was never sent, an outage that spanned the retry window,
or drift caused by someone editing state by hand. Reconcile — compare Linear
state to VCS state, fix the difference — covers all of those, and unlike replay
it is testable without a webhook.

Deduplication of *retried* deliveries is handled in-process by `DeliveryDeduper`
(`lib/webhooks.mjs`), keyed on `Linear-Delivery` and bounded by size and TTL.

> Earlier versions of this skill referenced `lib/webhook-dlq.ts` and
> `/linear:webhook replay`. Neither existed.

## Local testing

Expose a local receiver with `ngrok http 3000` and register that URL. To debug a
single delivery without waiting for another, capture the payload and replay it
through verification and normalisation with `/linear:sync event --file <path>`.

## Webhook security checklist
- [x] HTTPS only
- [x] Signature verified before any body parsing beyond raw read
- [x] 5-minute timestamp window
- [x] `delivery.id` idempotency
- [x] Re-fetch authoritative state via GraphQL
- [x] DLQ with bounded retry
- [x] Webhook secret rotated yearly

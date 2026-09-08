/**
 * The VCS provider contract.
 *
 * Linear's own Diffs/Reviews product only integrates with GitHub, so a
 * Harness Code shop cannot rely on it. This layer normalises both hosts onto
 * one shape so every Linear-side behaviour (issue <-> branch <-> PR mapping,
 * status transitions, deploy comments) is written once and works on either.
 *
 * Implementations live in ./github.mjs and ./harness.mjs and are selected by
 * ./index.mjs. Anything provider-specific belongs behind this interface.
 */

/**
 * @typedef {object} NormalizedPullRequest
 * @property {string}  id          Provider-native id (GitHub node id / Harness pullreq number as string).
 * @property {number}  number
 * @property {string}  title
 * @property {string}  body
 * @property {"open"|"draft"|"merged"|"closed"} state
 * @property {string}  url
 * @property {string}  sourceBranch
 * @property {string}  targetBranch
 * @property {string}  repo
 * @property {{ id: string, login?: string, email?: string }} author
 * @property {string[]} labels
 * @property {string|null} mergedAt
 * @property {"success"|"failure"|"pending"|"unknown"} checksState
 */

/**
 * @typedef {object} NormalizedVcsEvent
 * @property {string} deliveryId  Stable id for idempotent replay.
 * @property {"pr.opened"|"pr.updated"|"pr.merged"|"pr.closed"|"pr.review"|"pr.comment"|"deploy.succeeded"|"deploy.failed"|"unknown"} kind
 * @property {string} provider
 * @property {NormalizedPullRequest|null} pullRequest
 * @property {string[]} issueKeys  Linear issue identifiers referenced by the event.
 * @property {Record<string, unknown>} raw
 */

/**
 * Linear issue identifiers look like `ENG-123`: an uppercase team key of at
 * least one character, a hyphen, then digits.
 *
 * The negative lookbehind stops `FOO-BAR-12` from yielding `BAR-12`, and the
 * lookahead stops `ENG-123456` from being truncated.
 */
const ISSUE_KEY_PATTERN = /(?<![A-Z0-9-])([A-Z][A-Z0-9]{0,9})-(\d{1,6})(?![\w-])/g;

/**
 * Words that, in front of an issue key, mean "this change resolves it".
 * Mirrors the set Linear's Git integration recognises.
 */
export const CLOSING_KEYWORDS = Object.freeze([
  "close",
  "closes",
  "closed",
  "closing",
  "fix",
  "fixes",
  "fixed",
  "fixing",
  "resolve",
  "resolves",
  "resolved",
  "resolving",
  "complete",
  "completes",
  "completed",
]);

/**
 * Extract every Linear issue key referenced in a blob of text.
 *
 * @param {string|null|undefined} text
 * @returns {string[]} Unique keys, uppercased, in first-seen order.
 */
export function extractIssueKeys(text) {
  if (!text) return [];
  const out = [];
  const seen = new Set();
  for (const match of String(text).matchAll(ISSUE_KEY_PATTERN)) {
    const key = `${match[1]}-${Number(match[2])}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * Extract only the issue keys preceded by a closing keyword.
 *
 * `"Fixes ENG-1, refs ENG-2"` yields `["ENG-1"]`.
 *
 * Case handling is deliberately looser here than in {@link extractIssueKeys}:
 * a preceding closing keyword disambiguates strongly enough that lowercase
 * keys are safe to accept ("resolves eng-3"), whereas scanning free prose for
 * lowercase keys would match "utf-8", "sha-256" and "covid-19".
 *
 * @param {string|null|undefined} text
 * @returns {string[]} Keys normalised to uppercase.
 */
export function extractClosingKeys(text) {
  if (!text) return [];
  const keywords = CLOSING_KEYWORDS.join("|");
  const pattern = new RegExp(
    `\\b(?:${keywords})\\b\\s*:?\\s+([A-Z][A-Z0-9]{0,9}-\\d{1,6})(?![\\w-])`,
    "gi",
  );
  const out = [];
  const seen = new Set();
  for (const match of String(text).matchAll(pattern)) {
    const key = match[1].toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/**
 * Derive a git branch name for an issue, in the shape Linear's "copy git
 * branch name" action produces so its auto-linking recognises it.
 *
 * @param {{ identifier: string, title: string }} issue
 * @param {{ prefix?: string, maxSlugLength?: number }} [opts]
 * @returns {string}
 */
export function branchNameForIssue(issue, opts = {}) {
  const maxSlug = opts.maxSlugLength ?? 60;
  const slug = String(issue.title ?? "")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxSlug)
    .replace(/-+$/g, "");
  const key = String(issue.identifier ?? "").toLowerCase();
  const base = slug ? `${key}-${slug}` : key;
  return opts.prefix ? `${opts.prefix.replace(/\/+$/, "")}/${base}` : base;
}

/**
 * Base class documenting the provider contract. Implementations may extend it
 * or simply duck-type the same methods.
 *
 * @abstract
 */
export class VcsProvider {
  /** @returns {string} Stable provider id, e.g. "github". */
  get name() {
    throw new Error("VcsProvider.name must be implemented.");
  }

  /**
   * Whether Linear's native Diffs/Reviews surface works with this provider.
   * Only GitHub does today, so the Harness path must mirror reviews as
   * attachments and comments instead.
   * @returns {boolean}
   */
  get supportsLinearDiffs() {
    return false;
  }

  /* eslint-disable no-unused-vars */
  /** @returns {Promise<NormalizedPullRequest>} */
  async getPullRequest(_repo, _number) {
    throw new Error("not implemented");
  }
  /** @returns {Promise<NormalizedPullRequest[]>} */
  async listOpenPullRequests(_repo) {
    throw new Error("not implemented");
  }
  /** @returns {Promise<void>} */
  async createBranch(_repo, _name, _fromRef) {
    throw new Error("not implemented");
  }
  /** @returns {Promise<void>} */
  async commentOnPullRequest(_repo, _number, _body) {
    throw new Error("not implemented");
  }
  /** @returns {Promise<void>} */
  async addLabel(_repo, _number, _label) {
    throw new Error("not implemented");
  }
  /**
   * Verify an inbound webhook signature.
   * @returns {boolean}
   */
  verifyWebhook(_rawBody, _headers, _secret) {
    throw new Error("not implemented");
  }
  /**
   * Normalise an inbound webhook into a provider-neutral event.
   * @returns {NormalizedVcsEvent}
   */
  normalizeEvent(_headers, _payload) {
    throw new Error("not implemented");
  }
  /* eslint-enable no-unused-vars */
}

/**
 * Map a normalized event to the Linear-side intent, so the sync matrix lives
 * in one place rather than being duplicated per provider.
 *
 * @param {NormalizedVcsEvent} event
 * @returns {{ transition: "started"|"in_review"|"done"|"reopened"|null, comment: boolean }}
 */
export function intentForEvent(event) {
  switch (event.kind) {
    case "pr.opened":
      return { transition: "in_review", comment: true };
    case "pr.merged":
      return { transition: "done", comment: true };
    case "pr.closed":
      return { transition: null, comment: true };
    case "pr.review":
      return { transition: null, comment: true };
    case "deploy.succeeded":
      return { transition: null, comment: true };
    case "deploy.failed":
      return { transition: "reopened", comment: true };
    default:
      return { transition: null, comment: false };
  }
}

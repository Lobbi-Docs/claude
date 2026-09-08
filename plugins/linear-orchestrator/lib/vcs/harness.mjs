/**
 * Harness Code provider.
 *
 * Harness Code is Harness's built-in git host. Linear's native Diffs/Reviews
 * product does NOT integrate with it (GitHub only), so this provider mirrors
 * review state back onto the Linear issue as comments and attachments instead
 * of relying on Linear's code-review surface.
 *
 * API shape (https://apidocs.harness.io):
 *   - base            https://app.harness.io
 *   - auth            `x-api-key: <token>` header
 *   - scoping         accountIdentifier / orgIdentifier / projectIdentifier query params
 *   - webhook sig     `X-Harness-Signature`, HMAC-SHA256 hex over the raw body
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { VcsProvider, extractIssueKeys } from "./provider.mjs";
import { isWellFormedHexDigest } from "../webhooks.mjs";

const HARNESS_BASE = "https://app.harness.io";

/** Harness pipeline execution statuses that mean "finished successfully". */
export const HARNESS_SUCCESS_STATUSES = Object.freeze(["SUCCESS"]);
/** Harness pipeline execution statuses that mean "finished unsuccessfully". */
export const HARNESS_FAILURE_STATUSES = Object.freeze([
  "FAILED",
  "ABORTED",
  "EXPIRED",
  "ERRORED",
  "APPROVAL_REJECTED",
]);
/** Harness pipeline execution statuses that mean "still going". */
export const HARNESS_ACTIVE_STATUSES = Object.freeze([
  "RUNNING",
  "WAITING",
  "PAUSED",
  "QUEUED",
  "APPROVAL_WAITING",
  "INTERVENTION_WAITING",
]);

/**
 * @param {string} state Harness pull request state.
 * @param {boolean} isDraft
 * @param {number|null} merged Harness returns a merge timestamp (or null).
 * @returns {"open"|"draft"|"merged"|"closed"}
 */
function normalizeState(state, isDraft, merged) {
  if (merged) return "merged";
  const s = String(state ?? "").toLowerCase();
  if (s === "merged") return "merged";
  if (s === "closed") return "closed";
  return isDraft ? "draft" : "open";
}

export class HarnessProvider extends VcsProvider {
  /**
   * @param {object} cfg
   * @param {string} cfg.apiToken
   * @param {string} cfg.accountId
   * @param {string} [cfg.orgId]
   * @param {string} [cfg.projectId]
   * @param {string} [cfg.baseUrl]
   * @param {typeof fetch} [cfg.fetch]
   */
  constructor(cfg) {
    super();
    if (!cfg?.apiToken) throw new Error("HarnessProvider requires an `apiToken`.");
    if (!cfg?.accountId) throw new Error("HarnessProvider requires an `accountId`.");
    this.apiToken = cfg.apiToken;
    this.accountId = cfg.accountId;
    this.orgId = cfg.orgId;
    this.projectId = cfg.projectId;
    this.baseUrl = (cfg.baseUrl ?? HARNESS_BASE).replace(/\/+$/, "");
    this._fetch = cfg.fetch ?? globalThis.fetch;
  }

  get name() {
    return "harness";
  }

  /** Linear Diffs are GitHub-only; mirror reviews as comments instead. */
  get supportsLinearDiffs() {
    return false;
  }

  /**
   * Harness scopes every call by account, and optionally org/project.
   * @param {Record<string,string|number|undefined>} [extra]
   * @returns {string}
   */
  _scope(extra = {}) {
    const params = new URLSearchParams();
    params.set("accountIdentifier", this.accountId);
    if (this.orgId) params.set("orgIdentifier", this.orgId);
    if (this.projectId) params.set("projectIdentifier", this.projectId);
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return params.toString();
  }

  /**
   * @param {string} path
   * @param {RequestInit & { query?: Record<string,string|number|undefined> }} [init]
   */
  async _req(path, init = {}) {
    const { query, ...rest } = init;
    const url = `${this.baseUrl}${path}?${this._scope(query)}`;
    const res = await this._fetch(url, {
      ...rest,
      headers: {
        "x-api-key": this.apiToken,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(rest.headers ?? {}),
      },
    });
    if (!res.ok) {
      // Body attached as a property rather than folded into `message` — see the
      // matching note in vcs/github.mjs; `error.message` can reach a public
      // Linear activity.
      const err = new Error(`Harness ${res.status} on ${path}`);
      err.status = res.status;
      err.responseBody = await res.text().catch(() => "");
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  /**
   * @param {any} pr
   * @param {string} repo
   * @returns {import("./provider.mjs").NormalizedPullRequest}
   */
  _normalizePr(pr, repo) {
    return {
      id: String(pr.number ?? pr.id ?? ""),
      number: Number(pr.number ?? 0),
      title: pr.title ?? "",
      body: pr.description ?? "",
      state: normalizeState(pr.state, Boolean(pr.is_draft), pr.merged ?? null),
      url: pr.url ?? "",
      sourceBranch: pr.source_branch ?? "",
      targetBranch: pr.target_branch ?? "",
      repo,
      author: {
        id: String(pr.author?.id ?? pr.author?.uid ?? ""),
        login: pr.author?.display_name,
        email: pr.author?.email,
      },
      // Null-safe: see the matching note in vcs/github.mjs.
      labels: (pr.labels ?? []).map((l) => (typeof l === "string" ? l : (l?.key ?? l?.value ?? ""))),
      mergedAt: pr.merged ? new Date(pr.merged).toISOString() : null,
      checksState: "unknown",
    };
  }

  async getPullRequest(repo, number) {
    const pr = await this._req(`/code/api/v1/repos/${encodeURIComponent(repo)}/pullreq/${number}`);
    return this._normalizePr(pr, repo);
  }

  async listOpenPullRequests(repo) {
    const prs = await this._req(`/code/api/v1/repos/${encodeURIComponent(repo)}/pullreq`, {
      query: { state: "open", limit: 100 },
    });
    return (prs ?? []).map((pr) => this._normalizePr(pr, repo));
  }

  async createBranch(repo, name, fromRef = "main") {
    await this._req(`/code/api/v1/repos/${encodeURIComponent(repo)}/branches`, {
      method: "POST",
      body: JSON.stringify({ name, target: fromRef }),
    });
  }

  async commentOnPullRequest(repo, number, body) {
    await this._req(
      `/code/api/v1/repos/${encodeURIComponent(repo)}/pullreq/${number}/comments`,
      { method: "POST", body: JSON.stringify({ text: body }) },
    );
  }

  async addLabel(repo, number, label) {
    await this._req(`/code/api/v1/repos/${encodeURIComponent(repo)}/pullreq/${number}/labels`, {
      method: "PUT",
      body: JSON.stringify({ label_key: label }),
    });
  }

  // ---- Pipelines -----------------------------------------------------------

  /**
   * Fetch a pipeline execution and classify its status.
   * @param {string} executionId
   */
  async getExecution(executionId) {
    const raw = await this._req(
      `/pipeline/api/pipelines/execution/v2/${encodeURIComponent(executionId)}`,
    );
    const status = raw?.data?.pipelineExecutionSummary?.status ?? raw?.status ?? "UNKNOWN";
    return { status, outcome: classifyHarnessStatus(status), raw };
  }

  /**
   * Verify an `X-Harness-Signature` header (bare hex HMAC-SHA256, like Linear;
   * unlike GitHub there is no `sha256=` prefix).
   *
   * @param {Buffer} rawBody
   * @param {Record<string,string>} headers
   * @param {string} secret
   * @returns {boolean}
   */
  verifyWebhook(rawBody, headers, secret) {
    const sent = headers["x-harness-signature"] ?? headers["X-Harness-Signature"];
    if (!sent || !rawBody?.length || !secret) return false;

    const candidate = String(sent).replace(/^sha256=/i, "");
    // Must be a well-formed digest before decoding: Node's hex decoder stops at
    // the first invalid pair rather than throwing, so `validSig + "zz"` would
    // otherwise decode to the same 32 bytes and pass.
    if (!isWellFormedHexDigest(candidate)) return false;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(candidate, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * @param {Record<string,string>} headers
   * @param {any} payload
   * @returns {import("./provider.mjs").NormalizedVcsEvent}
   */
  normalizeEvent(headers, payload) {
    const deliveryId =
      headers["x-harness-delivery"] ?? headers["x-harness-trigger-id"] ?? payload?.id ?? "";
    const trigger = String(payload?.trigger ?? payload?.event_type ?? "").toLowerCase();
    const repo = payload?.repo?.identifier ?? payload?.repo?.uid ?? "";
    const rawPr = payload?.pull_req ?? payload?.pullreq ?? null;
    const pr = rawPr ? this._normalizePr(rawPr, repo) : null;

    let kind = "unknown";
    if (trigger.includes("pullreq")) {
      if (trigger.includes("created") || trigger.includes("reopened")) kind = "pr.opened";
      else if (trigger.includes("merged")) kind = "pr.merged";
      else if (trigger.includes("closed")) kind = "pr.closed";
      else if (trigger.includes("comment")) kind = "pr.comment";
      else if (trigger.includes("review")) kind = "pr.review";
      else kind = "pr.updated";
    } else if (trigger.includes("execution") || trigger.includes("pipeline")) {
      const status = payload?.status ?? payload?.execution?.status;
      const outcome = classifyHarnessStatus(status);
      if (outcome === "success") kind = "deploy.succeeded";
      else if (outcome === "failure") kind = "deploy.failed";
    }

    const text = [
      pr?.title,
      pr?.body,
      pr?.sourceBranch,
      payload?.comment?.text,
      payload?.execution?.name,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      deliveryId: String(deliveryId),
      kind: /** @type {any} */ (kind),
      provider: this.name,
      pullRequest: pr,
      issueKeys: extractIssueKeys(text),
      raw: payload,
    };
  }
}

/**
 * Bucket a Harness execution status into a coarse outcome.
 * @param {string|undefined|null} status
 * @returns {"success"|"failure"|"active"|"unknown"}
 */
export function classifyHarnessStatus(status) {
  const s = String(status ?? "").toUpperCase();
  if (HARNESS_SUCCESS_STATUSES.includes(s)) return "success";
  if (HARNESS_FAILURE_STATUSES.includes(s)) return "failure";
  if (HARNESS_ACTIVE_STATUSES.includes(s)) return "active";
  return "unknown";
}

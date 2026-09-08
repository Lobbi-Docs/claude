/**
 * GitHub provider.
 *
 * Scope note: this is the Linear <-> GitHub *mapping* layer only — issue keys,
 * branches, PR state, webhook normalisation. Deep PR driving (review boards,
 * CI drive-to-green, merge trains) belongs to the `github-orchestrator` plugin;
 * duplicating it here would fork two implementations of the same thing.
 *
 * Inside a Claude Code session prefer the GitHub MCP tools. This REST client
 * exists for the webhook-driven bridge, which runs outside a session.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { VcsProvider, extractIssueKeys } from "./provider.mjs";

const GITHUB_API = "https://api.github.com";

/**
 * @param {"open"|"closed"} state
 * @param {boolean} draft
 * @param {string|null} mergedAt
 * @returns {"open"|"draft"|"merged"|"closed"}
 */
function normalizeState(state, draft, mergedAt) {
  if (mergedAt) return "merged";
  if (state === "closed") return "closed";
  return draft ? "draft" : "open";
}

export class GitHubProvider extends VcsProvider {
  /**
   * @param {object} cfg
   * @param {string} cfg.token          GitHub token (PAT or App installation token).
   * @param {string} cfg.owner
   * @param {string} [cfg.baseUrl]      Override for GitHub Enterprise Server.
   * @param {typeof fetch} [cfg.fetch]
   */
  constructor(cfg) {
    super();
    if (!cfg?.token) throw new Error("GitHubProvider requires a `token`.");
    if (!cfg?.owner) throw new Error("GitHubProvider requires an `owner`.");
    this.token = cfg.token;
    this.owner = cfg.owner;
    this.baseUrl = (cfg.baseUrl ?? GITHUB_API).replace(/\/+$/, "");
    this._fetch = cfg.fetch ?? globalThis.fetch;
  }

  get name() {
    return "github";
  }

  /** Linear's Diffs/Reviews product syncs with GitHub only. */
  get supportsLinearDiffs() {
    return true;
  }

  /**
   * @param {string} path
   * @param {RequestInit} [init]
   */
  async _req(path, init = {}) {
    const res = await this._fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub ${res.status} ${path}: ${await res.text()}`);
    }
    return res.status === 204 ? null : res.json();
  }

  /**
   * @param {object} pr Raw GitHub pull request object.
   * @param {string} repo
   * @returns {import("./provider.mjs").NormalizedPullRequest}
   */
  _normalizePr(pr, repo) {
    return {
      id: String(pr.node_id ?? pr.id),
      number: pr.number,
      title: pr.title ?? "",
      body: pr.body ?? "",
      state: normalizeState(pr.state, Boolean(pr.draft), pr.merged_at ?? null),
      url: pr.html_url ?? "",
      sourceBranch: pr.head?.ref ?? "",
      targetBranch: pr.base?.ref ?? "",
      repo,
      author: { id: String(pr.user?.id ?? ""), login: pr.user?.login },
      labels: (pr.labels ?? []).map((l) => (typeof l === "string" ? l : l.name)),
      mergedAt: pr.merged_at ?? null,
      checksState: "unknown",
    };
  }

  async getPullRequest(repo, number) {
    const pr = await this._req(`/repos/${this.owner}/${repo}/pulls/${number}`);
    return this._normalizePr(pr, repo);
  }

  async listOpenPullRequests(repo) {
    const prs = await this._req(`/repos/${this.owner}/${repo}/pulls?state=open&per_page=100`);
    return (prs ?? []).map((pr) => this._normalizePr(pr, repo));
  }

  async createBranch(repo, name, fromRef = "main") {
    const base = await this._req(`/repos/${this.owner}/${repo}/git/ref/heads/${fromRef}`);
    await this._req(`/repos/${this.owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${name}`, sha: base.object.sha }),
    });
  }

  async commentOnPullRequest(repo, number, body) {
    // PR conversation comments go through the Issues API on GitHub.
    await this._req(`/repos/${this.owner}/${repo}/issues/${number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }

  async addLabel(repo, number, label) {
    await this._req(`/repos/${this.owner}/${repo}/issues/${number}/labels`, {
      method: "POST",
      body: JSON.stringify({ labels: [label] }),
    });
  }

  /**
   * Verify an `X-Hub-Signature-256` header (GitHub prefixes the digest with
   * `sha256=`, unlike Linear which sends bare hex).
   *
   * @param {Buffer} rawBody
   * @param {Record<string,string>} headers
   * @param {string} secret
   * @returns {boolean}
   */
  verifyWebhook(rawBody, headers, secret) {
    const sent = headers["x-hub-signature-256"] ?? headers["X-Hub-Signature-256"];
    if (!sent || !rawBody?.length || !secret) return false;
    const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    const a = Buffer.from(sent);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * @param {Record<string,string>} headers
   * @param {any} payload
   * @returns {import("./provider.mjs").NormalizedVcsEvent}
   */
  normalizeEvent(headers, payload) {
    const eventName = headers["x-github-event"] ?? headers["X-GitHub-Event"] ?? "";
    const deliveryId = headers["x-github-delivery"] ?? headers["X-GitHub-Delivery"] ?? "";
    const repo = payload?.repository?.name ?? "";
    const pr = payload?.pull_request ? this._normalizePr(payload.pull_request, repo) : null;

    let kind = "unknown";
    if (eventName === "pull_request") {
      const action = payload?.action;
      if (action === "opened" || action === "reopened") kind = "pr.opened";
      else if (action === "closed") kind = payload?.pull_request?.merged ? "pr.merged" : "pr.closed";
      else kind = "pr.updated";
    } else if (eventName === "pull_request_review") {
      kind = "pr.review";
    } else if (eventName === "issue_comment" || eventName === "pull_request_review_comment") {
      kind = "pr.comment";
    } else if (eventName === "deployment_status") {
      const state = payload?.deployment_status?.state;
      if (state === "success") kind = "deploy.succeeded";
      else if (state === "failure" || state === "error") kind = "deploy.failed";
    }

    const text = [
      pr?.title,
      pr?.body,
      pr?.sourceBranch,
      payload?.comment?.body,
      payload?.review?.body,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      deliveryId,
      kind: /** @type {any} */ (kind),
      provider: this.name,
      pullRequest: pr,
      issueKeys: extractIssueKeys(text),
      raw: payload,
    };
  }
}

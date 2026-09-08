/**
 * Per-issue workspace isolation.
 *
 * Symphony gives every issue its own directory so concurrent agents cannot
 * scribble over each other. Here that is a **git worktree**, which is strictly
 * better for a swarm working one repository: worktrees share the object store
 * (so N workers do not mean N clones) while getting independent working trees,
 * indexes, and HEADs.
 *
 * Lifecycle hooks mirror Symphony's: afterCreate, beforeRun, afterRun,
 * beforeRemove.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, access } from "node:fs/promises";
import { join, resolve } from "node:path";

const exec = promisify(execFile);

/**
 * Sanitise an issue key into something safe to use as a path segment and a
 * branch component. Rejects rather than mangles anything suspicious so a
 * hostile issue title can never escape the workspace root.
 *
 * @param {string} issueKey
 * @returns {string}
 */
export function sanitizeKey(issueKey) {
  const key = String(issueKey ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9]{0,9}-\d{1,6}$/.test(key)) {
    throw new Error(
      `Refusing to build a workspace for "${issueKey}": not a valid Linear issue key (e.g. ENG-123).`,
    );
  }
  return key.toUpperCase();
}

/**
 * @typedef {object} WorkspaceHooks
 * @property {(ctx: WorkspaceContext) => Promise<void>} [afterCreate]
 * @property {(ctx: WorkspaceContext) => Promise<void>} [beforeRun]
 * @property {(ctx: WorkspaceContext) => Promise<void>} [afterRun]
 * @property {(ctx: WorkspaceContext) => Promise<void>} [beforeRemove]
 */

/**
 * @typedef {object} WorkspaceContext
 * @property {string} issueKey
 * @property {string} path
 * @property {string} branch
 * @property {string} repoRoot
 */

export class WorkspaceManager {
  /**
   * @param {object} cfg
   * @param {string} cfg.repoRoot     Path to the primary checkout.
   * @param {string} cfg.workspaceRoot Directory that will hold the worktrees.
   * @param {string} [cfg.baseRef]     Branch new worktrees fork from.
   * @param {WorkspaceHooks} [cfg.hooks]
   * @param {(cmd: string, args: string[], opts?: object) => Promise<{stdout: string, stderr: string}>} [cfg.exec]
   */
  constructor(cfg) {
    if (!cfg?.repoRoot) throw new Error("WorkspaceManager requires `repoRoot`.");
    if (!cfg?.workspaceRoot) throw new Error("WorkspaceManager requires `workspaceRoot`.");
    this.repoRoot = resolve(cfg.repoRoot);
    this.workspaceRoot = resolve(cfg.workspaceRoot);
    this.baseRef = cfg.baseRef ?? "main";
    this.hooks = cfg.hooks ?? {};
    this._exec = cfg.exec ?? ((cmd, args, opts) => exec(cmd, args, opts));
  }

  /**
   * @param {string} issueKey
   * @returns {string}
   */
  pathFor(issueKey) {
    return join(this.workspaceRoot, sanitizeKey(issueKey));
  }

  /**
   * @param {string} issueKey
   * @returns {Promise<boolean>}
   */
  async exists(issueKey) {
    try {
      await access(this.pathFor(issueKey));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create (or reuse) an isolated worktree for an issue.
   *
   * @param {string} issueKey
   * @param {{ branch?: string, baseRef?: string }} [opts]
   * @returns {Promise<WorkspaceContext>}
   */
  async create(issueKey, opts = {}) {
    const key = sanitizeKey(issueKey);
    const path = this.pathFor(key);
    const branch = opts.branch ?? `linear/${key.toLowerCase()}`;
    const baseRef = opts.baseRef ?? this.baseRef;
    /** @type {WorkspaceContext} */
    const ctx = { issueKey: key, path, branch, repoRoot: this.repoRoot };

    if (await this.exists(key)) return ctx;

    await mkdir(this.workspaceRoot, { recursive: true });
    // `-B` makes re-running after a failed attempt idempotent instead of
    // erroring with "branch already exists".
    await this._git(["worktree", "add", "-B", branch, path, baseRef]);

    if (this.hooks.afterCreate) await this.hooks.afterCreate(ctx);
    return ctx;
  }

  /**
   * Run a unit of work inside the workspace, with the before/after hooks.
   *
   * @template T
   * @param {string} issueKey
   * @param {(ctx: WorkspaceContext) => Promise<T>} work
   * @returns {Promise<T>}
   */
  async run(issueKey, work) {
    const key = sanitizeKey(issueKey);
    /** @type {WorkspaceContext} */
    const ctx = {
      issueKey: key,
      path: this.pathFor(key),
      branch: `linear/${key.toLowerCase()}`,
      repoRoot: this.repoRoot,
    };
    if (this.hooks.beforeRun) await this.hooks.beforeRun(ctx);
    try {
      return await work(ctx);
    } finally {
      // afterRun must not mask the work's own failure.
      if (this.hooks.afterRun) {
        await this.hooks.afterRun(ctx).catch(() => {});
      }
    }
  }

  /**
   * Tear a workspace down. Refuses to touch anything outside `workspaceRoot`.
   *
   * @param {string} issueKey
   * @param {{ force?: boolean }} [opts]
   */
  async remove(issueKey, opts = {}) {
    const key = sanitizeKey(issueKey);
    const path = this.pathFor(key);
    if (!path.startsWith(this.workspaceRoot + "/") && path !== this.workspaceRoot) {
      throw new Error(`Refusing to remove ${path}: outside the workspace root.`);
    }
    if (!(await this.exists(key))) return;

    const ctx = {
      issueKey: key,
      path,
      branch: `linear/${key.toLowerCase()}`,
      repoRoot: this.repoRoot,
    };
    if (this.hooks.beforeRemove) await this.hooks.beforeRemove(ctx);

    const args = ["worktree", "remove", path];
    if (opts.force) args.push("--force");
    try {
      await this._git(args);
    } catch {
      // A worktree whose directory was deleted out from under git leaves a
      // stale admin entry; prune it and drop the directory directly.
      await this._git(["worktree", "prune"]).catch(() => {});
      await rm(path, { recursive: true, force: true });
    }
  }

  /** @returns {Promise<string[]>} Absolute paths of live worktrees. */
  async list() {
    const { stdout } = await this._git(["worktree", "list", "--porcelain"]);
    return stdout
      .split("\n")
      .filter((line) => line.startsWith("worktree "))
      .map((line) => line.slice("worktree ".length).trim());
  }

  /**
   * @param {string[]} args
   */
  _git(args) {
    return this._exec("git", args, { cwd: this.repoRoot });
  }
}

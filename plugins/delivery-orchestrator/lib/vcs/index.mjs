/**
 * Provider selection.
 *
 * `LINEAR_VCS_PROVIDER` picks the host; everything else in the plugin talks to
 * the returned object through the VcsProvider contract and never branches on
 * which one it got.
 */

import { GitHubProvider } from "./github.mjs";
import { HarnessProvider } from "./harness.mjs";

export { VcsProvider, extractIssueKeys, extractClosingKeys, branchNameForIssue, intentForEvent, CLOSING_KEYWORDS } from "./provider.mjs";
export { GitHubProvider } from "./github.mjs";
export { HarnessProvider, classifyHarnessStatus } from "./harness.mjs";

/** @type {readonly ["github","harness"]} */
export const SUPPORTED_PROVIDERS = Object.freeze(["github", "harness"]);

/**
 * Build a provider from explicit config, falling back to environment.
 *
 * @param {object} [opts]
 * @param {"github"|"harness"} [opts.provider]
 * @param {Record<string,string|undefined>} [opts.env]
 * @param {typeof fetch} [opts.fetch]
 * @returns {import("./provider.mjs").VcsProvider}
 */
export function resolveProvider(opts = {}) {
  const env = opts.env ?? process.env;
  const name = (opts.provider ?? env.LINEAR_VCS_PROVIDER ?? "github").toLowerCase();

  if (!SUPPORTED_PROVIDERS.includes(/** @type {any} */ (name))) {
    throw new Error(
      `Unsupported VCS provider "${name}". Set LINEAR_VCS_PROVIDER to one of: ${SUPPORTED_PROVIDERS.join(", ")}.`,
    );
  }

  if (name === "github") {
    const token = env.GITHUB_TOKEN;
    const owner = env.GITHUB_OWNER;
    if (!token || !owner) {
      throw new Error(
        "GitHub provider needs GITHUB_TOKEN and GITHUB_OWNER. " +
          "Inside a Claude Code session prefer the GitHub MCP tools; this REST client is for the webhook bridge.",
      );
    }
    return new GitHubProvider({
      token,
      owner,
      baseUrl: env.GITHUB_API_URL,
      fetch: opts.fetch,
    });
  }

  const apiToken = env.HARNESS_API_TOKEN;
  const accountId = env.HARNESS_ACCOUNT_ID;
  if (!apiToken || !accountId) {
    throw new Error("Harness provider needs HARNESS_API_TOKEN and HARNESS_ACCOUNT_ID.");
  }
  return new HarnessProvider({
    apiToken,
    accountId,
    orgId: env.HARNESS_ORG_ID,
    projectId: env.HARNESS_PROJECT_ID,
    baseUrl: env.HARNESS_API_URL,
    fetch: opts.fetch,
  });
}

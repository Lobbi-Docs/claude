// Unit tests for lib/vcs/* — issue-key extraction, branch naming, provider
// selection, and the two hosts' differing webhook signature schemes.

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";

import {
  extractIssueKeys,
  extractClosingKeys,
  branchNameForIssue,
  intentForEvent,
} from "../lib/vcs/provider.mjs";
import { GitHubProvider } from "../lib/vcs/github.mjs";
import { HarnessProvider, classifyHarnessStatus } from "../lib/vcs/harness.mjs";
import { resolveProvider, SUPPORTED_PROVIDERS } from "../lib/vcs/index.mjs";

test("extractIssueKeys finds keys and de-duplicates in first-seen order", () => {
  assert.deepEqual(extractIssueKeys("Fixes ENG-123 and ENG-4; also ENG-123"), ["ENG-123", "ENG-4"]);
  assert.deepEqual(extractIssueKeys("no keys here"), []);
  assert.deepEqual(extractIssueKeys(null), []);
});

test("extractIssueKeys does not match mid-identifier fragments", () => {
  // Guards the boundary rules: a longer hyphenated token must not yield a key.
  assert.deepEqual(extractIssueKeys("FOO-BAR-12"), []);
  assert.deepEqual(extractIssueKeys("ENG-123abc"), []);
  assert.deepEqual(extractIssueKeys("lowercase eng-1"), []);
});

test("extractClosingKeys returns only keys behind a closing keyword", () => {
  assert.deepEqual(extractClosingKeys("Fixes ENG-1, refs ENG-2"), ["ENG-1"]);
  assert.deepEqual(extractClosingKeys("closes: ENG-9"), ["ENG-9"]);
  assert.deepEqual(extractClosingKeys("mentions ENG-5"), []);
});

test("closing keys are case-insensitive, bare keys are not", () => {
  // Deliberate asymmetry. A closing keyword disambiguates strongly enough that
  // "resolves eng-3" is safe to accept, whereas scanning prose for lowercase
  // keys would match things like "utf-8", "sha-256" or "covid-19".
  assert.deepEqual(extractClosingKeys("Resolves eng-3"), ["ENG-3"]);
  assert.deepEqual(extractIssueKeys("we bumped utf-8 and sha-256"), []);
});

test("branchNameForIssue matches Linear's copy-branch-name shape", () => {
  assert.equal(
    branchNameForIssue({ identifier: "ENG-123", title: "Fix the login redirect" }),
    "eng-123-fix-the-login-redirect",
  );
  assert.equal(
    branchNameForIssue({ identifier: "ENG-1", title: "Add OAuth" }, { prefix: "markus" }),
    "markus/eng-1-add-oauth",
  );
});

test("branchNameForIssue strips punctuation and never leaves a trailing hyphen", () => {
  // Apostrophes are dropped rather than becoming separators, so "don't"
  // slugs to "dont" instead of the uglier "don-t".
  const name = branchNameForIssue({ identifier: "ENG-2", title: "Don't break — CI!!!" });
  assert.equal(name, "eng-2-dont-break-ci");
  assert.ok(!name.endsWith("-"));

  const truncated = branchNameForIssue(
    { identifier: "ENG-3", title: "a".repeat(200) },
    { maxSlugLength: 10 },
  );
  assert.equal(truncated, `eng-3-${"a".repeat(10)}`);
});

test("branchNameForIssue copes with an empty title", () => {
  assert.equal(branchNameForIssue({ identifier: "ENG-4", title: "" }), "eng-4");
});

test("intentForEvent maps events to Linear-side transitions", () => {
  assert.deepEqual(intentForEvent({ kind: "pr.opened" }), { transition: "in_review", comment: true });
  assert.deepEqual(intentForEvent({ kind: "pr.merged" }), { transition: "done", comment: true });
  assert.deepEqual(intentForEvent({ kind: "deploy.failed" }), {
    transition: "reopened",
    comment: true,
  });
  assert.deepEqual(intentForEvent({ kind: "unknown" }), { transition: null, comment: false });
});

test("only GitHub claims support for Linear's native Diffs surface", () => {
  const gh = new GitHubProvider({ token: "t", owner: "o" });
  const hn = new HarnessProvider({ apiToken: "t", accountId: "a" });
  assert.equal(gh.supportsLinearDiffs, true);
  assert.equal(hn.supportsLinearDiffs, false, "Linear Diffs are GitHub-only");
});

test("GitHub verifies an X-Hub-Signature-256 with the sha256= prefix", () => {
  const gh = new GitHubProvider({ token: "t", owner: "o" });
  const body = Buffer.from(JSON.stringify({ action: "opened" }));
  const sig = `sha256=${createHmac("sha256", "s").update(body).digest("hex")}`;

  assert.equal(gh.verifyWebhook(body, { "x-hub-signature-256": sig }, "s"), true);
  assert.equal(gh.verifyWebhook(body, { "x-hub-signature-256": sig }, "wrong"), false);
  // A bare hex digest — Linear's scheme — must not pass GitHub's check.
  assert.equal(gh.verifyWebhook(body, { "x-hub-signature-256": sig.slice(7) }, "s"), false);
  assert.equal(gh.verifyWebhook(body, {}, "s"), false);
});

test("Harness verifies a bare-hex X-Harness-Signature", () => {
  const hn = new HarnessProvider({ apiToken: "t", accountId: "a" });
  const body = Buffer.from(JSON.stringify({ trigger: "pullreq_created" }));
  const sig = createHmac("sha256", "s").update(body).digest("hex");

  assert.equal(hn.verifyWebhook(body, { "x-harness-signature": sig }, "s"), true);
  assert.equal(hn.verifyWebhook(body, { "x-harness-signature": sig }, "nope"), false);
  assert.equal(hn.verifyWebhook(body, { "x-harness-signature": "zz" }, "s"), false);
});

test("GitHub normalizes a merged pull_request into pr.merged with its issue keys", () => {
  const gh = new GitHubProvider({ token: "t", owner: "o" });
  const event = gh.normalizeEvent(
    { "x-github-event": "pull_request", "x-github-delivery": "d1" },
    {
      action: "closed",
      repository: { name: "app" },
      pull_request: {
        id: 1,
        node_id: "PR_1",
        number: 42,
        title: "Fixes ENG-7",
        body: "also touches ENG-8",
        state: "closed",
        merged: true,
        merged_at: "2026-01-01T00:00:00Z",
        html_url: "https://github.com/o/app/pull/42",
        head: { ref: "eng-7-fix" },
        base: { ref: "main" },
        user: { id: 5, login: "dev" },
        labels: [{ name: "bug" }],
      },
    },
  );

  assert.equal(event.kind, "pr.merged");
  assert.equal(event.deliveryId, "d1");
  assert.equal(event.provider, "github");
  assert.equal(event.pullRequest.state, "merged");
  assert.equal(event.pullRequest.number, 42);
  assert.deepEqual(event.pullRequest.labels, ["bug"]);
  assert.deepEqual(event.issueKeys, ["ENG-7", "ENG-8"]);
});

test("GitHub distinguishes a closed-unmerged PR from a merged one", () => {
  const gh = new GitHubProvider({ token: "t", owner: "o" });
  const event = gh.normalizeEvent(
    { "x-github-event": "pull_request" },
    {
      action: "closed",
      repository: { name: "app" },
      pull_request: { number: 1, state: "closed", merged: false, head: {}, base: {}, user: {} },
    },
  );
  assert.equal(event.kind, "pr.closed");
});

test("Harness normalizes a pullreq trigger and a failed execution", () => {
  const hn = new HarnessProvider({ apiToken: "t", accountId: "a" });

  const pr = hn.normalizeEvent(
    { "x-harness-delivery": "h1" },
    {
      trigger: "pullreq_created",
      repo: { identifier: "app" },
      pull_req: {
        number: 7,
        title: "Closes ENG-9",
        state: "open",
        source_branch: "eng-9",
        target_branch: "main",
        author: { id: "u", email: "d@x.io" },
      },
    },
  );
  assert.equal(pr.kind, "pr.opened");
  assert.equal(pr.provider, "harness");
  assert.deepEqual(pr.issueKeys, ["ENG-9"]);
  assert.equal(pr.pullRequest.state, "open");

  const deploy = hn.normalizeEvent({}, { trigger: "pipeline_execution", status: "FAILED" });
  assert.equal(deploy.kind, "deploy.failed");
});

test("classifyHarnessStatus buckets the documented execution statuses", () => {
  assert.equal(classifyHarnessStatus("SUCCESS"), "success");
  assert.equal(classifyHarnessStatus("FAILED"), "failure");
  assert.equal(classifyHarnessStatus("ABORTED"), "failure");
  assert.equal(classifyHarnessStatus("EXPIRED"), "failure");
  assert.equal(classifyHarnessStatus("RUNNING"), "active");
  assert.equal(classifyHarnessStatus("WAITING"), "active");
  assert.equal(classifyHarnessStatus("SOMETHING_NEW"), "unknown");
  assert.equal(classifyHarnessStatus(undefined), "unknown");
});

test("Harness scopes every request by account, org and project", () => {
  const hn = new HarnessProvider({
    apiToken: "t",
    accountId: "acct",
    orgId: "org",
    projectId: "proj",
  });
  const scope = new URLSearchParams(hn._scope({ state: "open" }));
  assert.equal(scope.get("accountIdentifier"), "acct");
  assert.equal(scope.get("orgIdentifier"), "org");
  assert.equal(scope.get("projectIdentifier"), "proj");
  assert.equal(scope.get("state"), "open");
});

test("resolveProvider builds each provider from the environment", () => {
  const gh = resolveProvider({ env: { LINEAR_VCS_PROVIDER: "github", GITHUB_TOKEN: "t", GITHUB_OWNER: "o" } });
  assert.equal(gh.name, "github");

  const hn = resolveProvider({
    env: { LINEAR_VCS_PROVIDER: "harness", HARNESS_API_TOKEN: "t", HARNESS_ACCOUNT_ID: "a" },
  });
  assert.equal(hn.name, "harness");

  // GitHub is the default when nothing is set.
  assert.equal(resolveProvider({ env: { GITHUB_TOKEN: "t", GITHUB_OWNER: "o" } }).name, "github");
});

test("resolveProvider fails loudly on an unknown provider or missing credentials", () => {
  assert.throws(
    () => resolveProvider({ env: { LINEAR_VCS_PROVIDER: "gitlab" } }),
    /Unsupported VCS provider/,
  );
  assert.throws(
    () => resolveProvider({ env: { LINEAR_VCS_PROVIDER: "github" } }),
    /GITHUB_TOKEN and GITHUB_OWNER/,
  );
  assert.throws(
    () => resolveProvider({ env: { LINEAR_VCS_PROVIDER: "harness" } }),
    /HARNESS_API_TOKEN and HARNESS_ACCOUNT_ID/,
  );
  assert.deepEqual([...SUPPORTED_PROVIDERS], ["github", "harness"]);
});

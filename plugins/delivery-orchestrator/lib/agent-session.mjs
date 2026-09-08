/**
 * Linear Agent Sessions and Agent Activities.
 *
 * This is the contract an external agent (a Claude Code swarm, in this plugin's
 * case) uses to make its work visible inside Linear. It replaces the
 * `agentSignalCreate` / "Agent Intelligence Gateway" API that earlier versions
 * of this plugin described — neither of those ever existed.
 *
 * Reference: https://linear.app/developers/agents
 *
 * AIG in Linear's docs means **Agent Interaction Guidelines**, a set of UX
 * rules, not a service. The rules this module enforces mechanically:
 *   - acknowledge fast (see ACK_DEADLINE_MS)
 *   - keep the session transparent (emit `thought`/`action` as work proceeds)
 *   - terminate explicitly (`response` or `error`, never silence)
 */

/**
 * Agent session lifecycle states.
 * @type {readonly ["pending","active","error","awaitingInput","complete","stale"]}
 */
export const AGENT_SESSION_STATES = Object.freeze([
  "pending",
  "active",
  "error",
  "awaitingInput",
  "complete",
  "stale",
]);

/**
 * Agent activity types.
 *  - thought      : internal reasoning, shown collapsed
 *  - action       : a tool/command the agent ran
 *  - elicitation  : a question for the user; moves the session to awaitingInput
 *  - response     : terminal success
 *  - error        : terminal failure
 * @type {readonly ["thought","action","elicitation","response","error"]}
 */
export const AGENT_ACTIVITY_TYPES = Object.freeze([
  "thought",
  "action",
  "elicitation",
  "response",
  "error",
]);

/** Activity types that end a session. */
export const TERMINAL_ACTIVITY_TYPES = Object.freeze(["response", "error"]);

/**
 * Linear marks a session `stale` if the agent emits nothing within this window
 * of session creation. Emit a `thought` immediately on wake-up.
 */
export const ACK_DEADLINE_MS = 10_000;

const AGENT_ACTIVITY_CREATE = /* GraphQL */ `
  mutation AgentActivityCreate($input: AgentActivityCreateInput!) {
    agentActivityCreate(input: $input) {
      success
      agentActivity {
        id
        content
        createdAt
        agentSession { id status }
      }
    }
  }
`;

const AGENT_SESSION_QUERY = /* GraphQL */ `
  query AgentSession($id: String!) {
    agentSession(id: $id) {
      id
      status
      createdAt
      updatedAt
      issue { id identifier title url }
      comment { id body }
      creator { id name email }
    }
  }
`;

/**
 * Build the `content` payload for an activity.
 *
 * Linear discriminates on `content.type`; the other fields differ per type.
 * Kept in one place so a schema change has a single edit site.
 *
 * @param {"thought"|"action"|"elicitation"|"response"|"error"} type
 * @param {object} detail
 * @returns {Record<string, unknown>}
 */
export function buildActivityContent(type, detail = {}) {
  if (!AGENT_ACTIVITY_TYPES.includes(type)) {
    throw new Error(
      `Unknown agent activity type "${type}". Expected one of: ${AGENT_ACTIVITY_TYPES.join(", ")}.`,
    );
  }
  switch (type) {
    case "thought":
      return { type, body: requireText(detail.body, "thought.body") };
    case "action":
      return {
        type,
        action: requireText(detail.action, "action.action"),
        parameter: detail.parameter ?? "",
        ...(detail.result === undefined ? {} : { result: detail.result }),
      };
    case "elicitation":
      return { type, body: requireText(detail.body, "elicitation.body") };
    case "response":
      return { type, body: requireText(detail.body, "response.body") };
    case "error":
      return {
        type,
        body: requireText(detail.body, "error.body"),
        // Linear renders unrecoverable errors terminally; recoverable ones let
        // the user retry from the session UI.
        public: detail.public ?? true,
      };
    /* c8 ignore next */
    default:
      throw new Error(`Unhandled activity type ${type}`);
  }
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {string}
 */
function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Agent activity field "${field}" must be a non-empty string.`);
  }
  return value;
}

/**
 * Thin, well-typed wrapper over one Linear agent session.
 *
 * Usage follows the Agent Interaction Guidelines: acknowledge, narrate, finish.
 *
 *   const session = new AgentSession(client, sessionId);
 *   await session.thought("Reading the issue and planning the change.");
 *   await session.action("git", "checkout -b feat/LIN-123");
 *   await session.respond("Opened PR #42.");
 */
export class AgentSession {
  /**
   * @param {import("./linear-client.mjs").LinearClient} client
   * @param {string} sessionId
   * @param {{ now?: () => number }} [opts]
   */
  constructor(client, sessionId, opts = {}) {
    if (!sessionId) throw new Error("AgentSession requires a session id.");
    this.client = client;
    this.sessionId = sessionId;
    this._now = opts.now ?? (() => Date.now());
    this.createdAtMs = this._now();
    this.acknowledged = false;
    this.terminated = false;
  }

  /** Fetch the current server-side session record. */
  async fetch() {
    const data = await this.client.request(AGENT_SESSION_QUERY, { id: this.sessionId });
    return data?.agentSession ?? null;
  }

  /**
   * Emit one activity.
   *
   * @param {"thought"|"action"|"elicitation"|"response"|"error"} type
   * @param {object} detail
   * @returns {Promise<object>}
   */
  async emit(type, detail) {
    if (this.terminated) {
      throw new Error(
        `Agent session ${this.sessionId} already emitted a terminal activity; ` +
          `create a new session instead of continuing this one.`,
      );
    }
    const content = buildActivityContent(type, detail);
    const data = await this.client.request(AGENT_ACTIVITY_CREATE, {
      input: { agentSessionId: this.sessionId, content },
    });
    this.acknowledged = true;
    if (TERMINAL_ACTIVITY_TYPES.includes(type)) this.terminated = true;
    return data?.agentActivityCreate ?? null;
  }

  /** @param {string} body */
  thought(body) {
    return this.emit("thought", { body });
  }

  /**
   * @param {string} action     Short verb phrase, e.g. "Running tests".
   * @param {string} [parameter] The concrete command or argument.
   * @param {string} [result]    Optional result summary.
   */
  action(action, parameter = "", result) {
    return this.emit("action", { action, parameter, result });
  }

  /** Ask the user something. Moves the session to `awaitingInput`. */
  ask(body) {
    return this.emit("elicitation", { body });
  }

  /** Terminal success. */
  respond(body) {
    return this.emit("response", { body });
  }

  /** Terminal failure. */
  fail(body, opts = {}) {
    return this.emit("error", { body, public: opts.public ?? true });
  }

  /**
   * True when the acknowledgement deadline has passed with nothing emitted —
   * Linear will mark the session `stale`.
   * @returns {boolean}
   */
  isAcknowledgementOverdue() {
    return !this.acknowledged && this._now() - this.createdAtMs >= ACK_DEADLINE_MS;
  }

  /**
   * Wrap a unit of work so the session always terminates, even on throw.
   *
   * This is the single most important guardrail in the module: a swarm worker
   * that crashes must still close its Linear session, otherwise the issue sits
   * in `active` forever and the human never learns it failed.
   *
   * @template T
   * @param {() => Promise<T>} work
   * @param {{ onSuccess?: (value: T) => string, onError?: (err: Error) => string, onNotifyError?: (err: Error) => void }} [opts]
   * @returns {Promise<T>}
   */
  async guard(work, opts = {}) {
    let value;
    try {
      value = await work();
    } catch (err) {
      const error = /** @type {Error} */ (err);
      if (!this.terminated) {
        const body = opts.onError ? opts.onError(error) : `Failed: ${error.message}`;
        // Never let a reporting failure mask the original error.
        await this.fail(body).catch(() => {});
      }
      throw error;
    }

    // Reporting success is best-effort and deliberately outside the try above.
    // If the work succeeded but announcing it fails, the caller must still get
    // its value: swallowing the result and throwing would report completed work
    // as failed, which is worse than a missing activity.
    if (!this.terminated) {
      const body = opts.onSuccess ? opts.onSuccess(value) : "Done.";
      await this.respond(body).catch((err) => {
        if (opts.onNotifyError) opts.onNotifyError(/** @type {Error} */ (err));
      });
    }
    return value;
  }
}

/**
 * Introspect the live schema to confirm the agent mutations this module relies
 * on still exist with the expected shape.
 *
 * Linear's agent API is comparatively new and its docs lag the schema, so
 * `/linear:setup --verify-schema` calls this instead of trusting hardcoded
 * names. Returns a report rather than throwing so setup can warn and continue.
 *
 * @param {import("./linear-client.mjs").LinearClient} client
 * @param {string[]} [required]
 * @returns {Promise<{ ok: boolean, present: string[], missing: string[] }>}
 */
export async function verifyAgentSchema(client, required = ["agentActivityCreate"]) {
  const data = await client.request(/* GraphQL */ `
    query AgentSchemaProbe {
      __schema {
        mutationType {
          fields { name }
        }
      }
    }
  `);
  const names = new Set((data?.__schema?.mutationType?.fields ?? []).map((f) => f.name));
  const present = required.filter((n) => names.has(n));
  const missing = required.filter((n) => !names.has(n));
  return { ok: missing.length === 0, present, missing };
}

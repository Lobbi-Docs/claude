/**
 * Dependency-free Linear GraphQL client.
 *
 * Deliberately does NOT use `@linear/sdk`: this plugin ships no lockfile and is
 * loaded straight from disk by Claude Code, so the runtime must work on a bare
 * Node 20+ with global `fetch` and nothing installed.
 *
 * Encodes Linear's documented limits (https://linear.app/developers/rate-limiting):
 *   - API key auth : 2,500 requests/hr + 3,000,000 complexity/hr (per user)
 *   - OAuth auth   : 5,000 requests/hr + 2,000,000 complexity/hr (per app user)
 *   - Unauthed     :   600 requests/hr +   100,000 complexity/hr (per IP)
 *   - A single query may not exceed 10,000 complexity points.
 */

export const LINEAR_GRAPHQL_ENDPOINT = "https://api.linear.app/graphql";

/** Documented per-hour budgets, keyed by auth mode. */
export const RATE_BUDGETS = {
  apiKey: { requests: 2500, complexity: 3_000_000 },
  oauth: { requests: 5000, complexity: 2_000_000 },
  unauthenticated: { requests: 600, complexity: 100_000 },
};

/** Linear rejects any single query above this complexity. */
export const MAX_QUERY_COMPLEXITY = 10_000;

/**
 * @typedef {object} RateLimitInfo
 * @property {number|null} requestsLimit
 * @property {number|null} requestsRemaining
 * @property {Date|null}   requestsResetAt
 * @property {number|null} complexityLimit
 * @property {number|null} complexityRemaining
 * @property {Date|null}   complexityResetAt
 * @property {number|null} lastQueryComplexity
 */

/**
 * Linear returns a Unix timestamp in seconds for the reset headers. Older
 * responses used millisecond values, so normalise both.
 * @param {string|null} raw
 * @returns {Date|null}
 */
function parseResetHeader(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Anything below this threshold is seconds-since-epoch, above it is millis.
  return new Date(n < 1e11 ? n * 1000 : n);
}

/**
 * @param {string|null} raw
 * @returns {number|null}
 */
function parseNumberHeader(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read Linear's rate-limit headers off a response.
 *
 * Linear has used two header spellings over time; both are accepted so an
 * older gateway response never silently reports `null` budgets.
 *
 * @param {Headers} headers
 * @returns {RateLimitInfo}
 */
export function readRateLimit(headers) {
  const get = (name) => (headers && typeof headers.get === "function" ? headers.get(name) : null);
  const first = (...names) => {
    for (const name of names) {
      const v = get(name);
      if (v !== null && v !== undefined && v !== "") return v;
    }
    return null;
  };

  return {
    requestsLimit: parseNumberHeader(first("x-ratelimit-requests-limit", "x-ratelimit-limit")),
    requestsRemaining: parseNumberHeader(
      first("x-ratelimit-requests-remaining", "x-ratelimit-remaining"),
    ),
    requestsResetAt: parseResetHeader(first("x-ratelimit-requests-reset", "x-ratelimit-reset")),
    complexityLimit: parseNumberHeader(first("x-ratelimit-complexity-limit", "x-complexity-limit")),
    complexityRemaining: parseNumberHeader(
      first("x-ratelimit-complexity-remaining", "x-complexity-remaining"),
    ),
    complexityResetAt: parseResetHeader(
      first("x-ratelimit-complexity-reset", "x-complexity-reset"),
    ),
    lastQueryComplexity: parseNumberHeader(first("x-complexity")),
  };
}

/**
 * Estimate a query's complexity the way Linear scores it:
 *   scalar property = 0.1, object = 1, connection = 1 x page size.
 *
 * This is an approximation used to keep bulk operations under
 * {@link MAX_QUERY_COMPLEXITY}; the authoritative number comes back in the
 * `X-Complexity` response header.
 *
 * @param {{ properties?: number, objects?: number, connections?: Array<{ pageSize?: number }> }} shape
 * @returns {number}
 */
export function estimateComplexity(shape = {}) {
  const properties = shape.properties ?? 0;
  const objects = shape.objects ?? 0;
  const connections = shape.connections ?? [];
  let total = properties * 0.1 + objects;
  for (const conn of connections) total += Math.max(1, conn.pageSize ?? 50);
  return Math.round(total * 10) / 10;
}

/** Raised when Linear returns GraphQL-level errors. */
export class LinearGraphQLError extends Error {
  /**
   * @param {string} message
   * @param {{ errors?: unknown[], status?: number, query?: string }} [detail]
   */
  constructor(message, detail = {}) {
    super(message);
    this.name = "LinearGraphQLError";
    this.errors = detail.errors ?? [];
    this.status = detail.status;
    this.query = detail.query;
  }
}

/** Raised when Linear rate-limits the caller. */
export class LinearRateLimitError extends Error {
  /**
   * @param {string} message
   * @param {{ retryAfterMs: number, rateLimit?: RateLimitInfo }} detail
   */
  constructor(message, detail) {
    super(message);
    this.name = "LinearRateLimitError";
    this.retryAfterMs = detail.retryAfterMs;
    this.rateLimit = detail.rateLimit;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class LinearClient {
  /**
   * @param {object} options
   * @param {string} [options.apiKey]      Personal API key. Sent verbatim, NOT as a Bearer token.
   * @param {string} [options.accessToken] OAuth access token. Sent as `Bearer <token>`.
   * @param {string} [options.endpoint]
   * @param {number} [options.maxRetries]
   * @param {typeof fetch} [options.fetch] Injectable for tests.
   * @param {(ms: number) => Promise<void>} [options.sleep] Injectable for tests.
   */
  constructor(options = {}) {
    if (!options.apiKey && !options.accessToken) {
      throw new Error("LinearClient requires either `apiKey` or `accessToken`.");
    }
    this.apiKey = options.apiKey;
    this.accessToken = options.accessToken;
    this.endpoint = options.endpoint ?? LINEAR_GRAPHQL_ENDPOINT;
    this.maxRetries = options.maxRetries ?? 3;
    this.authMode = options.accessToken ? "oauth" : "apiKey";
    this.budget = RATE_BUDGETS[this.authMode];
    this._fetch = options.fetch ?? globalThis.fetch;
    this._sleep = options.sleep ?? sleep;
    /** @type {RateLimitInfo|null} */
    this.rateLimit = null;
    if (typeof this._fetch !== "function") {
      throw new Error("No global fetch available; pass `fetch` explicitly (Node 20+ required).");
    }
  }

  /**
   * Linear expects a personal API key verbatim and an OAuth token as a Bearer
   * token. Sending an API key with a `Bearer ` prefix is a 401.
   * @returns {Record<string,string>}
   */
  authHeaders() {
    return this.accessToken
      ? { Authorization: `Bearer ${this.accessToken}` }
      : { Authorization: /** @type {string} */ (this.apiKey) };
  }

  /**
   * Execute a GraphQL document with retry on 429/5xx.
   *
   * @template T
   * @param {string} query
   * @param {Record<string, unknown>} [variables]
   * @param {{ signal?: AbortSignal }} [opts]
   * @returns {Promise<T>}
   */
  async request(query, variables = {}, opts = {}) {
    let attempt = 0;
    for (;;) {
      const res = await this._fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.authHeaders(),
        },
        body: JSON.stringify({ query, variables }),
        signal: opts.signal,
      });

      this.rateLimit = readRateLimit(res.headers);

      if (res.status === 429 || res.status >= 500) {
        if (attempt >= this.maxRetries) {
          throw new LinearRateLimitError(`Linear ${res.status} after ${attempt} retries`, {
            retryAfterMs: this._retryDelay(res, attempt),
            rateLimit: this.rateLimit,
          });
        }
        // Drain the body before retrying. Under undici an unconsumed body
        // holds its connection out of the pool until GC, and this is the hot
        // path during sustained rate-limiting.
        await res.text?.().catch(() => {});
        await this._sleep(this._retryDelay(res, attempt));
        attempt += 1;
        continue;
      }

      const bodyText = await res.text();
      let body;
      try {
        body = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        throw new LinearGraphQLError(`Linear returned non-JSON body (HTTP ${res.status})`, {
          status: res.status,
          query,
        });
      }

      // Linear signals rate limiting as HTTP 400 with a RATELIMITED extension.
      const rateLimited = (body.errors ?? []).some(
        (e) => e?.extensions?.code === "RATELIMITED" || e?.extensions?.type === "RATELIMITED",
      );
      if (rateLimited) {
        if (attempt >= this.maxRetries) {
          throw new LinearRateLimitError("Linear RATELIMITED", {
            retryAfterMs: this._retryDelay(res, attempt),
            rateLimit: this.rateLimit,
          });
        }
        await this._sleep(this._retryDelay(res, attempt));
        attempt += 1;
        continue;
      }

      if (body.errors?.length) {
        throw new LinearGraphQLError(body.errors[0]?.message ?? "Linear GraphQL error", {
          errors: body.errors,
          status: res.status,
          query,
        });
      }

      if (!res.ok) {
        throw new LinearGraphQLError(`Linear HTTP ${res.status}`, { status: res.status, query });
      }

      return body.data;
    }
  }

  /**
   * Backoff honouring the reset header when present, else exponential + jitter.
   * @param {Response} res
   * @param {number} attempt
   * @returns {number}
   */
  _retryDelay(res, attempt) {
    const retryAfter = Number(res.headers?.get?.("retry-after") ?? NaN);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      return Math.min(retryAfter * 1000, 60_000);
    }
    const reset = this.rateLimit?.requestsResetAt?.getTime();
    if (reset && reset > Date.now()) {
      return Math.min(reset - Date.now() + 250, 60_000);
    }
    const backoff = Math.min(1000 * 2 ** attempt, 30_000);
    return backoff + Math.floor(Math.random() * 250);
  }

  /**
   * Walk a Relay connection to exhaustion, yielding each page's nodes.
   *
   * `select` must return the connection object (`{ nodes, pageInfo }`) from the
   * response so this works with any query shape.
   *
   * @template T
   * @param {string} query   Must accept `$first: Int` and `$after: String`.
   * @param {Record<string, unknown>} variables
   * @param {(data: any) => { nodes: T[], pageInfo: { hasNextPage: boolean, endCursor: string|null } }} select
   * @param {{ pageSize?: number, maxPages?: number }} [opts]
   * @returns {AsyncGenerator<T[], void, void>}
   */
  async *paginate(query, variables, select, opts = {}) {
    const pageSize = opts.pageSize ?? 50;
    const maxPages = opts.maxPages ?? Infinity;
    let after = /** @type {string|null} */ (null);
    let pages = 0;

    for (;;) {
      const data = await this.request(query, { ...variables, first: pageSize, after });
      const conn = select(data);
      if (!conn) return;
      yield conn.nodes ?? [];
      pages += 1;
      if (!conn.pageInfo?.hasNextPage || pages >= maxPages) return;
      after = conn.pageInfo.endCursor;
      if (!after) return;
    }
  }

  /**
   * Collect every node from a Relay connection.
   * @template T
   * @param {string} query
   * @param {Record<string, unknown>} variables
   * @param {(data: any) => { nodes: T[], pageInfo: { hasNextPage: boolean, endCursor: string|null } }} select
   * @param {{ pageSize?: number, maxPages?: number }} [opts]
   * @returns {Promise<T[]>}
   */
  async collect(query, variables, select, opts) {
    /** @type {T[]} */
    const out = [];
    for await (const page of this.paginate(query, variables, select, opts)) out.push(...page);
    return out;
  }

  /** Cheapest possible auth probe. */
  async verify() {
    return this.request(`query Viewer { viewer { id name email } }`);
  }
}

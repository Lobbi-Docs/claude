/**
 * Linear OAuth 2.0.
 *
 * Reference: https://linear.app/developers/oauth-2-0-authentication
 *
 * The `actor` parameter is the part specific to agents: `actor=app` mints a
 * token whose writes are attributed to the application itself (which is what
 * makes an agent a first-class "app user" that can be assigned and mentioned),
 * while the default attributes writes to the authorising human.
 */

export const AUTHORIZE_URL = "https://linear.app/oauth/authorize";
export const TOKEN_URL = "https://api.linear.app/oauth/token";
export const REVOKE_URL = "https://api.linear.app/oauth/revoke";

/**
 * Scopes this plugin uses.
 *
 * `app:assignable` and `app:mentionable` are what make an OAuth app show up as
 * an agent that users can delegate issues to or @mention. They replace the
 * `agents:create` / `agents:signal` scopes an earlier version of this plugin
 * documented, which were never real.
 */
export const SCOPES = Object.freeze({
  read: "Read access to the workspace.",
  write: "Create and update issues, comments, projects.",
  "issues:create": "Narrower alternative to `write` for issue creation only.",
  "comments:create": "Narrower alternative to `write` for commenting only.",
  admin: "Workspace administration. Request only if you manage settings.",
  "app:assignable": "The app can be assigned (delegated) issues, like a teammate.",
  "app:mentionable": "The app can be @mentioned in comments and descriptions.",
});

/** The minimum an agent integration needs. */
export const AGENT_SCOPES = Object.freeze([
  "read",
  "write",
  "app:assignable",
  "app:mentionable",
]);

/**
 * Build the authorization URL to send a user to.
 *
 * @param {object} params
 * @param {string} params.clientId
 * @param {string} params.redirectUri
 * @param {string[]} [params.scopes]
 * @param {string} params.state        CSRF token. Verify it on the callback.
 * @param {"app"|"user"} [params.actor] `app` for agent integrations.
 * @param {"consent"} [params.prompt]
 * @returns {string}
 */
export function buildAuthorizeUrl(params) {
  if (!params?.clientId) throw new Error("buildAuthorizeUrl requires `clientId`.");
  if (!params?.redirectUri) throw new Error("buildAuthorizeUrl requires `redirectUri`.");
  if (!params?.state) {
    throw new Error("buildAuthorizeUrl requires `state` — omitting it leaves the flow open to CSRF.");
  }
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: (params.scopes ?? AGENT_SCOPES).join(","),
    state: params.state,
  });
  if (params.actor) query.set("actor", params.actor);
  if (params.prompt) query.set("prompt", params.prompt);
  return `${AUTHORIZE_URL}?${query.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 *
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.clientId
 * @param {string} params.clientSecret
 * @param {string} params.redirectUri
 * @param {typeof fetch} [params.fetch]
 * @returns {Promise<{ access_token: string, token_type: string, expires_in: number, scope: string[] }>}
 */
export async function exchangeCode(params) {
  const doFetch = params.fetch ?? globalThis.fetch;
  const body = new URLSearchParams({
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await doFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Linear token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Revoke an access token. Call this on uninstall and on user offboarding.
 *
 * @param {string} accessToken
 * @param {{ fetch?: typeof fetch }} [opts]
 * @returns {Promise<boolean>}
 */
export async function revokeToken(accessToken, opts = {}) {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const res = await doFetch(REVOKE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok;
}

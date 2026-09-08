---
name: Linear OAuth + Actor Authorization
description: This skill should be used when implementing Linear OAuth 2.0, OAuth actor authorization, or file-storage authentication. Activates on "linear oauth", "linear auth", "actor token", "linear-actor-token", "file storage".
version: 1.0.0
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# Linear OAuth + Actor Authorization

References:
- OAuth 2.0: https://linear.app/developers/oauth-2-0-authentication
- Actor authorization: https://linear.app/developers/oauth-actor-authorization
- File storage: https://linear.app/developers/file-storage-authentication

## OAuth 2.0 Flow

### 1. Register app
Settings → API → Applications → New application. Capture:
- `LINEAR_OAUTH_CLIENT_ID`
- `LINEAR_OAUTH_CLIENT_SECRET`
- Redirect URI

### 2. Authorization redirect
```
https://linear.app/oauth/authorize?
  client_id=<id>&
  redirect_uri=<uri>&
  response_type=code&
  scope=read,write,issues:create,comments:create,admin&
  state=<csrf>&
  actor=user            # optional — request actor mode
```

### 3. Token exchange
```http
POST https://api.linear.app/oauth/token
Content-Type: application/x-www-form-urlencoded

code=<code>&redirect_uri=<uri>&client_id=<id>&client_secret=<secret>&grant_type=authorization_code
```
Returns:
```json
{
  "access_token": "lin_oauth_...",
  "token_type": "Bearer",
  "expires_in": 315360000,
  "scope": "read,write"
}
```
Linear OAuth tokens are long-lived (10 years!). Refresh tokens are not issued — re-auth on revoke.

## Actor authorization

The `actor` parameter on the authorize URL decides who the app's writes are
attributed to.

| `actor` | Token owned by | Actions appear as |
|---|---|---|
| omitted / `user` | the authorising user | that user |
| `app` | the application | the app user (the agent) |

**Agent integrations want `actor=app`.** Combined with `app:assignable` and
`app:mentionable`, that is what makes the app appear in the workspace as an
agent teammate that can be delegated issues and @mentioned.

```
https://linear.app/oauth/authorize
  ?client_id=<id>
  &redirect_uri=<uri>
  &response_type=code
  &scope=read,write,app:assignable,app:mentionable
  &state=<csrf-token>
  &actor=app
```

Always send and verify `state` — without it the callback is open to CSRF.
`buildAuthorizeUrl()` in `lib/oauth.mjs` refuses to build a URL without one.

> **Corrected in 2.0.0.** Earlier versions described a `Linear-Actor-Token`
> header carrying a 5-minute JWT "minted by your backend", handled by a
> `lib/auth.ts` `mintActorToken()` helper. No such header, token type, or file
> exists. Attribution is chosen by the `actor` parameter at authorization time,
> not per call.

## File-Storage Authentication

Linear's file storage (S3-backed) uses pre-signed URLs:

1. Upload: call `fileUpload` mutation → receive `uploadUrl` + `headers`
2. PUT bytes to `uploadUrl` with the returned headers (don't add your Linear token there)
3. Download: GET the asset URL with the same Linear token in `Authorization` header

```ts
const res = await fetch(assetUrl, {
  headers: { Authorization: `Bearer ${apiKey}` }
});
```

If you proxy assets to end users, **mint a short-lived signed URL on your side** rather than handing out your Linear token.

## Rotation

- API keys: rotate quarterly
- OAuth client secret: rotate yearly or on suspected leak
- Revoke tokens on uninstall and offboarding (`revokeToken` in `lib/oauth.mjs`)
- On rotation, support old + new key for 24h overlap to avoid race conditions

## Scope selection guide
| Scope | Required for |
|-------|--------------|
| `read` | All read queries |
| `write` | All mutations except admin |
| `issues:create` | Narrow scope: only creating issues |
| `comments:create` | Narrow scope: comments only |
| `admin` | Workflow / team / webhook config |
| `app:assignable` | The app can be delegated issues, like a teammate |
| `app:mentionable` | The app can be @mentioned in comments and descriptions |

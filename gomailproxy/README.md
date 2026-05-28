# gomailproxy

Go microservice that proxies authenticated Gmail `users.messages.send` calls
on behalf of Engram users. Implements the architecture from
`docs/gomail-plan.md`:

- OAuth2 authorization-code flow against Google (offline + refresh tokens)
- AES-256-GCM encryption-at-rest for stored credentials
- SQLite via GORM using the pure-Go `glebarez/sqlite` driver — **no cgo / gcc required**
  (single-file DB, easy to swap for Postgres)
- Echo v4 HTTP layer with CORS pinned to the SPA origin

The service deliberately exposes **only** the `gmail.send` scope. It does not
hold identity sign-in tokens, never reads user mail, and never decorates
messages with any tracking pixels.

## Layout

```
gomailproxy/
├── main.go                          # entry point
├── internal/
│   ├── config/                      # env loading + validation
│   ├── crypto/                      # AES-256-GCM seal/open helpers (+tests)
│   ├── db/                          # GORM + sqlite bootstrap
│   ├── models/                      # MailAccount + SecretOAuthToken
│   ├── oauth/                       # google oauth2 manager + TokenSource
│   ├── mail/                        # MIME multipart/alternative builder
│   └── api/                         # echo handlers (onboard / callback / send)
```

## Prerequisites

- Go 1.22+
- A Google Cloud project (test project is fine for ≤50 users) with:
  - OAuth consent screen configured (External, Testing mode)
  - Up to 100 test users added explicitly in the consent screen
  - An **OAuth 2.0 Client ID** of type **Web application**
  - Authorized redirect URI: `http://localhost:8080/api/v1/oauth/callback`
  - Gmail API enabled

## Configuration

```bash
cp .env.example .env
openssl rand -hex 32  # -> paste into GOMAPROXY_ENCRYPTION_KEY
```

| Variable | Purpose |
|----------|---------|
| `GOMAPROXY_ENCRYPTION_KEY` | 32-byte hex root key. Required. Service refuses to boot without it. |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | From the Google Cloud OAuth client. |
| `GOOGLE_OAUTH_REDIRECT_URI` | Must match the URI registered in Google Cloud. |
| `APP_URL` | SPA origin. The callback redirects back here with `?gmail=connected` / `?gmail=denied`. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins permitted to call `/api/v1/*`. Defaults to `APP_URL`. |
| `DATABASE_PATH` | SQLite file path. Defaults to `./gomailproxy.db`. |
| `LISTEN_ADDR` | HTTP bind address. Defaults to `:8080`. |
| `MAX_ACCOUNTS` | Hard cap on stored accounts. Defaults to `50` (test phase). |

If `GOMAPROXY_ENCRYPTION_KEY` is missing or shorter than 64 hex chars, the
service crashes at boot with `log.Fatal`. This is intentional and required by
the design doc to prevent accidental plaintext token writes.

## Run

```bash
go run .
# Boot log: gomailproxy listening on :8080 (cap=50, db=./gomailproxy.db)
```

Tests:

```bash
go test ./...
```

## REST API

### `POST /api/v1/accounts/onboard`
Request:
```json
{ "user_email": "user@example.com" }
```
Response `200`:
```json
{
  "user_email": "user@example.com",
  "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```
Refuses with `403` once `MAX_ACCOUNTS` is reached.

### `GET /api/v1/oauth/callback`
Google redirects the user here with `?code=...&state=...`. The handler:
1. Pops the state nonce → resolves the original `user_email`.
2. Exchanges the auth code for an access+refresh token pair.
3. Encrypts the bundle with AES-256-GCM and writes it to SQLite.
4. Redirects the browser back to `APP_URL?gmail=connected` (or `?gmail=denied`).

### `GET /api/v1/accounts/status?user_email=...`
```json
{ "user_email": "user@example.com", "status": "active" }
```
`status` is one of `unknown`, `pending_auth`, `active`, `suspended`.

### `DELETE /api/v1/accounts?user_email=...`
Soft-deletes the stored account; the user must re-consent to send again.

### `POST /api/v1/email/send`
Request:
```json
{
  "sender_identity": "user@example.com",
  "recipient_address": "privacy@broker.example",
  "subject_line": "Formal GDPR Article 17 Erasure Request",
  "body_content_plain": "Dear ..."
}
```
Optional header `X-User-Email` is enforced when present — it must match
`sender_identity`. Response `202`:
```json
{
  "status": "success",
  "message_id": "18f3a382e718b29",
  "thread_id": "18f3a382e718b29",
  "dispatched_at": "2026-05-22T14:10:00Z"
}
```
`401` is returned if the user revoked the grant in their Google account; the
record is then marked `suspended` and the SPA must re-trigger onboarding.

## Token refresh

`oauth2.TokenSource` automatically rotates expired access tokens. The send
handler observes the refreshed token via the wrapper exposed by
`internal/oauth.GmailService` and re-seals the new value into SQLite so that
the next request does not hit Google again unnecessarily.

## Hardening checklist (before leaving test mode)

- Move `MAX_ACCOUNTS` cap once Google verifies the OAuth consent screen.
- Swap SQLite for Postgres (the GORM model uses `[]byte` so no migration is
  required besides the dialect change).
- Put the service behind TLS + a reverse proxy that strips inbound
  `X-Forwarded-*` spoofing.
- Rotate `GOMAPROXY_ENCRYPTION_KEY` via a two-phase migration (read with old,
  write with new) before the first production user.

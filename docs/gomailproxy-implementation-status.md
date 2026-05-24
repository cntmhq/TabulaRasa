● Everything builds. Here's what shipped:

  gomailproxy/ — Go backend (per docs/gomail-plan.md)

  - main.go + internal/config — env loading; refuses to boot without a 64-char-hex GOMAPROXY_ENCRYPTION_KEY (log.Fatal per the spec's operational warning).
  - internal/crypto — AES-256-GCM EncryptAESGCM / DecryptAESGCM with per-write random 12-byte nonce prepended; unit tests cover round-trip, nonce uniqueness, and tamper detection.
  - internal/models — MailAccount (GORM) + SecretOAuthToken plus SetSecret/Secret helpers that seal/open the encrypted blob.
  - internal/db — SQLite via GORM, auto-migrates the schema.
  - internal/oauth — oauth2.Config wrapped in an in-memory state-nonce map, AuthURI forces offline access + consent for guaranteed refresh tokens, GmailService builds an auto-refreshing
  gmail.Service and exposes a hook so the API layer can re-seal rotated tokens.
  - internal/mail — MIME multipart/alternative builder, base64url-encoded for users.messages.send.
  - internal/api — Echo v4 handlers: POST /api/v1/accounts/onboard, GET /api/v1/oauth/callback, GET /api/v1/accounts/status, DELETE /api/v1/accounts, POST /api/v1/email/send, plus
  /healthz. CORS pinned to APP_URL. Hard MAX_ACCOUNTS=50 cap enforced for new emails. Suspended accounts on invalid_grant.
  - README.md documents the Google Cloud test-project setup, env vars, endpoints, and hardening checklist.

  PWA integration (separation kept)

  - src/lib/gomail.ts — useGmailConsent(userEmail) hook. Calls onboard → opens consent popup → polls until the user closes it → re-checks status. Reads ?gmail=connected from the return
  redirect. Caches status in localStorage per email. Only returns a usable surface when userEmail is non-null, so the entire feature is gated behind identity-auth.
  - src/components/Composer.tsx — adds a Gmail status strip (Connect Gmail / Revoke Gmail) and a Send via Gmail action button. The existing mailto: button stays. Gmail UI is hidden
  completely for guest users.
  - src/locales/en.ts & pl.ts — new gmailLinked / gmailNotLinked / gmailConnect / gmailSend / etc. translations.
  - .env.example / .env.local — VITE_GOMAILPROXY_URL added; unset = feature hidden entirely.

  Run it

  # 1. Backend
  cd gomailproxy
  cp .env.example .env
  echo "GOMAPROXY_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
  # fill GOOGLE_OAUTH_CLIENT_ID / _SECRET from the test GCP project,
  # register http://localhost:8080/api/v1/oauth/callback as the redirect URI
  go run .

  # 2. Frontend (separate terminal)
  npm run dev
  Sign in with Google (existing flow, email profile openid scope only), then click Connect Gmail to grant the dedicated gmail.send scope; Send via Gmail appears once consent is active.

  Verification: go vet ./... && go test ./... clean, npx vite build succeeds.

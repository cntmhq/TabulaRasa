# Engram Quickstart

Onboarding for human developers and AI coding agents. Read this first; it
points to the deeper docs for everything else.

| You are… | Start here |
|---|---|
| New human contributor | [§ First-time setup](#first-time-setup) → [§ Day-to-day](#day-to-day) |
| AI agent making a change | [§ Repo map](#repo-map) → [`AGENTS.md`](../AGENTS.md) → [§ Where to add things](#where-to-add-things) |
| Wiring the Gmail backend | [§ Gmail send flow](#gmail-send-flow) → [`gomailproxy/README.md`](../gomailproxy/README.md) |
| Designing the backend | [`docs/gomail-plan.md`](./gomail-plan.md) |

---

## What this repo is

Two pieces in one tree:

1. **PWA (root)** — a React 19 + Vite 6 single-screen client-side app that
   compiles GDPR Article 17 erasure requests from a static directory of
   brokers. Zero tracking, `localStorage`-only, ships as a static bundle.
2. **`gomailproxy/`** — an optional Go 1.22 microservice that lets
   *authenticated* users send the assembled letter through their own Gmail
   account via Google's OAuth2 + Gmail API. Encrypts tokens at rest with
   AES-256-GCM. Disabled at build time if `VITE_GOMAILPROXY_URL` is unset.

The two are **deliberately decoupled**: identity sign-in (read profile name +
email) is a separate Google flow from the Gmail send consent. A user can sign
in without ever granting send access; the Gmail UI only appears once they
explicitly opt in to the second flow.

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node | ≥ 20 (the bundled dist was built on 20.19) | PWA dev/build |
| npm | ≥ 10 | PWA package manager |
| Go | ≥ 1.22 | gomailproxy backend |
| openssl | any | Generate the 32-byte AES key for gomailproxy |

A test **Google Cloud project** is required if you want the Gmail integration
working locally — see [§ Gmail send flow](#gmail-send-flow).

---

## First-time setup

### 1. Clone & install the PWA

```bash
git clone <repo-url> engram
cd engram
npm install
cp .env.example .env.local   # edit values you need
```

`.env.local` keys:

| Key | Purpose |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | OAuth Web Client ID. Powers the **identity** sign-in. Required for the "Auto-fill from Google" feature. |
| `VITE_GOMAILPROXY_URL` | Base URL of the Go backend, e.g. `http://localhost:8080`. **Leave empty to hide the Gmail send feature entirely.** |
| `GEMINI_API_KEY` | Optional, referenced by an unused dependency. Safe to leave blank. |
| `APP_URL` | Reserved for future server-side rendering hooks. Safe to leave at `localhost:3000`. |

### 2. (Optional) Boot the Gmail backend

Only needed if you set `VITE_GOMAILPROXY_URL`:

```bash
cd gomailproxy
cp .env.example .env
echo "GOMAPROXY_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
# then fill in GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET
go run .
```

The full env reference, the Google Cloud console steps, and the OAuth
redirect URI registration are in [`gomailproxy/README.md`](../gomailproxy/README.md).

### 3. Run both

```bash
# Terminal 1
cd gomailproxy && go run .           # → :8080

# Terminal 2
npm run dev                          # → :3000
```

Open <http://localhost:3000>, sign in with Google (identity only), then click
**Connect Gmail** at the bottom of the composer to grant the send scope.

---

## Day-to-day

### PWA

```bash
npm run dev      # vite dev server on :3000 with HMR
npm run lint     # tsc --noEmit; note pre-existing import.meta.env warnings
npm run build    # static dist/ bundle
npm run preview  # serve dist/ for a smoke test
npm run clean    # nuke dist/ and the legacy server.js
```

### gomailproxy

```bash
cd gomailproxy
go run .                 # boot with .env autoloaded
go test ./...            # crypto round-trip + nonce + tamper tests
go vet ./...             # static analysis
go build -o bin/proxy .  # ship a binary
```

---

## Repo map

```
engram/
├── AGENTS.md                       # AI agent rules — READ FIRST if you're an agent
├── README.md                       # short product pitch
├── docs/
│   ├── QUICKSTART.md               # this file
│   └── gomail-plan.md              # backend architecture spec
├── src/                            # React 19 PWA
│   ├── App.tsx                     # single-screen shell + nav
│   ├── components/
│   │   ├── AuthUI.tsx              # Google identity sign-in button + menu
│   │   ├── Composer.tsx            # right column: letter builder + send actions
│   │   ├── BrokerCard.tsx          # broker list item
│   │   ├── Header.tsx, Logo.tsx
│   │   └── ProfileModal.tsx
│   ├── lib/
│   │   ├── auth.ts                 # useGoogleAuth — identity flow (email/profile/openid)
│   │   ├── gomail.ts               # useGmailConsent — send flow (gmail.send only)
│   │   └── store.ts                # localStorage-backed Zustand-style profile store
│   ├── data/brokers.ts             # static broker directory
│   ├── locales/{en,pl,index}.ts    # i18n strings — Polish & English
│   ├── types.ts                    # SchemaPerson, SchemaOrganization
│   └── index.css                   # Tailwind + brand color vars
├── gomailproxy/                    # Go backend
│   ├── main.go
│   ├── internal/
│   │   ├── config/                 # env loading, MAX_ACCOUNTS cap
│   │   ├── crypto/                 # AES-256-GCM (+ tests)
│   │   ├── db/                     # GORM + SQLite bootstrap
│   │   ├── models/                 # MailAccount, SecretOAuthToken
│   │   ├── oauth/                  # google oauth2 + TokenSource pipeline
│   │   ├── mail/                   # MIME multipart/alternative builder
│   │   └── api/                    # echo handlers
│   └── README.md
└── public/                         # static assets
```

---

## Gmail send flow

Two distinct OAuth flows, both against Google, **never combined**:

```
┌─────────────────── Identity flow (existing) ──────────────────┐
│ src/lib/auth.ts → google.accounts.oauth2.initTokenClient(...) │
│ scopes: email profile openid                                   │
│ purpose: populate name/email into the letter signature         │
│ result:  profile.authState.isAuthenticated = true              │
└────────────────────────────────────────────────────────────────┘

       ⇣  User is signed in; clicks "Connect Gmail" in composer

┌──────────────── Send-consent flow (new, opt-in) ──────────────┐
│ POST  /api/v1/accounts/onboard       → auth_uri               │
│ popup → Google consent (gmail.send scope only)                │
│ GET   /api/v1/oauth/callback?code=...&state=...               │
│        ↳ exchange code → access+refresh                        │
│        ↳ AES-256-GCM seal → SQLite (MailAccount.EncryptedData) │
│        ↳ redirect → APP_URL?gmail=connected                    │
│ GET   /api/v1/accounts/status        → "active"                │
└────────────────────────────────────────────────────────────────┘

       ⇣  User clicks "Send via Gmail" on a broker letter

POST /api/v1/email/send  (X-User-Email pins sender_identity)
  ↳ oauth.TokenSource auto-refreshes expired access tokens
  ↳ mail.BuildRFC822 → users.messages.send → 202 Accepted
```

**Why the split?**

- Users can use the PWA fully without granting Gmail access.
- The Gmail proxy can be down or absent; the SPA falls back gracefully.
- Revoking Gmail send (Revoke Gmail button → `DELETE /api/v1/accounts`)
  does not log the user out of the identity flow.

**Test-phase caps:** `MAX_ACCOUNTS=50` is enforced in the backend. Bump this
only once the Google Cloud project is moved out of Testing mode.

---

## Where to add things

| You want to… | Edit |
|---|---|
| Add a UI string | `src/locales/en.ts` **and** `src/locales/pl.ts` (both required) |
| Add a broker | `src/data/brokers.ts` — keep `identifier` unique, follow `SchemaOrganization` |
| Change letter copy | `src/locales/{en,pl}.ts` → `composer.body1..body5`, `greeting`, `signOff` |
| Add a new send action button | `src/components/Composer.tsx`, near the existing mailto / Gmail buttons |
| Add a new gomailproxy endpoint | `gomailproxy/internal/api/handlers.go` (`Register` registers routes) |
| Persist a new field on the account | `gomailproxy/internal/models/account.go` + bump migration (GORM AutoMigrate handles additive changes) |
| Swap SQLite for Postgres | `gomailproxy/internal/db/db.go` — only the driver import + DSN parsing |
| Add a brand color | `src/index.css` (`--color-brand-*`), then reference via `var(--color-brand-*)` in components |

**Do not** reach for an HTTP client library inside `src/`. The codebase uses
native `fetch`. The Gmail flow lives entirely behind `src/lib/gomail.ts` —
extend that hook rather than fetching the backend from components directly.

---

## Architecture rules (non-negotiable)

These come from `AGENTS.md`; restated here so they don't get lost.

1. **The PWA stays client-side.** No analytics. No external API calls beyond
   Google identity, the Gmail proxy (opt-in), and the static broker list.
   Anything user-specific lives in `localStorage` via `src/lib/store.ts`.
2. **i18n is mandatory.** Hard-coded English in components will be rejected.
   Add the key to both `en.ts` and `pl.ts`.
3. **Use the brand palette.** `var(--color-brand-primary)` etc. — never raw
   Tailwind colors like `bg-blue-500`.
4. **Single-screen layout.** No `react-router`. New views = modal or
   in-place state, like the existing `tldr` / `policy` panels.
5. **Backend never sees identity tokens.** It only handles the `gmail.send`
   scope. The PWA never forwards the identity access token to the proxy.
6. **AES key is non-optional.** gomailproxy refuses to boot without
   `GOMAPROXY_ENCRYPTION_KEY` set to a 64-char hex string. This is a
   hard `log.Fatal` per the design spec.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Send via Gmail" button never appears | `VITE_GOMAILPROXY_URL` unset, user not signed in, or status is not yet `active`. Click **Connect Gmail** first. |
| Popup closes but status stays unknown | Backend not reachable (check `:8080`), or CORS blocked the status call. Verify `CORS_ALLOWED_ORIGINS` in `gomailproxy/.env` includes `http://localhost:3000`. |
| Backend boots, send returns 401 `invalid_grant` | User revoked the grant on Google's side. Backend auto-marks the row `suspended`; user must click **Connect Gmail** again. |
| `go run .` crashes with "encryption key must be 64 hex characters" | Generate one: `openssl rand -hex 32` → put in `gomailproxy/.env` as `GOMAPROXY_ENCRYPTION_KEY=...` |
| `go-sqlite3 requires cgo to work. This is a stub` | You're on an older checkout. Pull latest — the driver was swapped to pure-Go `glebarez/sqlite`. Then `go mod tidy && go run .` |
| OAuth callback returns `redirect_uri_mismatch` | The URI in the Google Cloud client must match `GOOGLE_OAUTH_REDIRECT_URI` **exactly**, including scheme and port. |
| `MAX_ACCOUNTS` cap hit during testing | Bump `MAX_ACCOUNTS` in `gomailproxy/.env`, or `DELETE /api/v1/accounts?user_email=...` to free a slot. |
| `npm run lint` shows `import.meta.env` errors | Pre-existing in this repo (see `src/lib/auth.ts:10`). Vite handles it at runtime; safe to ignore until someone adds `vite/client` to the tsconfig types. |

---

## What's intentionally **not** here

Listed so you don't accidentally add them:

- A user database in the PWA. The store is `localStorage` only by design.
- Analytics, telemetry, error reporters, or feature flags.
- React Router or any multi-page navigation.
- A backend for anything other than Gmail send. The broker list, letter
  templates, and identity flow are all client-side.
- A CI pipeline (yet). Add one if you need it, but keep the build
  reproducible from `npm run build` + `go build`.

---

## Further reading

- [`AGENTS.md`](../AGENTS.md) — strict rules for AI contributors
- [`gomailproxy/README.md`](../gomailproxy/README.md) — backend ops + endpoint reference
- [`docs/gomail-plan.md`](./gomail-plan.md) — original engineering design doc
- [`README.md`](../README.md) — product-facing summary

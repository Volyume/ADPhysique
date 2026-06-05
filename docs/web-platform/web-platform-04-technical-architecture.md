# Web platform — Phase 4: technical architecture + hosting

Status: COMPLETE | Date: 2026-06-05 | Depends on: Phases 0-3 +
`docs/HOSTING_RECOMMENDATION.md`.

Grounded in the existing stack (Phase 0): Supabase (Postgres + Auth + Edge
Functions), offline-first mobile client, `react-native-svg` + pure
`src/lib/chartGeometry.js` for charts, `@supabase/supabase-js` client.

---

## TECH STACK

### Front-end framework (all three interfaces): Next.js (App Router) + TypeScript
- **User web** (`app.volyume.app`): Next.js for SSR/SSG (the logged-out landing
  needs SEO; logged-in is client-rendered against Supabase). Static-export the
  marketing pages to stay within Cloudflare's unlimited static tier.
- **Admin** (`admin.volyume.app`): Next.js, server-rendered, **service-role key
  used only in server code / route handlers**, never shipped to the client.
- **B2B** (`coaches.volyume.app`): Next.js, same pattern as the user web plus the
  coach↔client scoping.
- **One shared monorepo** (`apps/web`, `apps/admin`, `apps/coaches`,
  `packages/ui`, `packages/supabase`). Three Cloudflare Pages projects, each
  rooted at its app dir (Phase 0 §C, hosting doc).

Rationale: Next.js is the de-facto standard for SEO + SSR + Supabase SSR auth,
it is the recommended Cloudflare/Vercel framework, and one framework across all
three keeps the shared component library and Supabase client identical.

### Shared design system → web component library (`packages/ui`)
- Port `src/styles/theme.js` **verbatim** to a TS token module (same hex,
  spacing, radius, `type` roles, motion, the `applyAccessibility` swaps). These
  become CSS custom properties / Tailwind theme tokens so "never hardcode hex"
  holds on web too.
- Primitives mirrored from mobile: `Card`, `Button` (the five variants),
  `PressableCard` press feel (CSS transform scale 0.97 + opacity, gated by
  `prefers-reduced-motion`), inputs, chips, the chart components.
- **Charts: reuse `chartGeometry.js` unchanged** (pure JS, framework-agnostic)
  and render plain **SVG** in React, identical geometry and amber language to
  mobile. No heavyweight chart lib needed; if one is wanted for interaction,
  `visx` (low-level SVG, same primitives) over Recharts/Chart.js (which impose
  their own look and would break brand fidelity).
- Tailwind CSS configured from the tokens (utility speed without importing a
  component library's look). **No off-the-shelf component kit used as-is**, the
  anti-AI/anti-template rule (Phase 0 §A6) forbids default MUI/shadcn-as-shipped.

### Connecting to Supabase
- `@supabase/ssr` for cookie-based sessions (SSR-safe), `detectSessionInUrl:true`
  for OAuth redirects (mobile uses `false`; web differs here intentionally).
- **User + B2B clients use the anon key + the user's JWT**; RLS enforces
  isolation, exactly the mobile contract.
- **Admin uses the service-role key in server-only code** (route handlers / RSC),
  never exposed to the browser.
- Web writes obey the locked rules: composite-PK upserts, `updated_at` touch,
  never `UPDATE … SET user_id`, tier only via `upgrade_tier_for_user`, deletion
  only via the `delete-account` Edge Function.

### Authentication
Supabase Auth, same project, same providers (email/password, Google, Apple). Web
adds the OAuth redirect flow. A user signs in on web with the same credentials as
mobile; the JWT carries the same `user_id`; RLS does the rest. Admin and coach
roles are **not** a Supabase auth feature today, they need an authorisation layer
(below).

### Real-time sync (web ↔ mobile)
- **Launch**: read-live + last-write-wins (Phase 0 §B6). The web reads current
  cloud rows; a web edit bumps `updated_at`; the mobile app reconciles on its
  next pull. Sufficient and zero new infra.
- **Enhancement**: Supabase **Realtime** subscriptions on the few tables where
  live cross-device updates matter (e.g. a coach watching a client log). Additive,
  not required for launch.

### Push-notification management (admin)
Already-built substrate: `device_push_tokens` (m053) + the `send-push` Edge
Function (Expo fan-out) + notification telemetry (m040). The admin composer is a
**UI + a thin server action** that: resolves a segment to a set of `user_id`s
(query `users_profile`/`tier_history`/`engine_telemetry`), calls `send-push` with
the message, and reads back `notification_sent/tapped/failed` for rates.
Scheduling = a `scheduled_notifications` row + a pg_cron worker (the pattern m051
already uses) or a Cloudflare Cron Trigger calling the function.

---

## NEW BACK-END REQUIREMENTS (minimal, additive, old-AAB-safe)

1. **Authorisation roles** (admin + coach). Options, recommend the simplest that
   is secure: a `staff` allow-list table (`staff_users(user_id, role)`,
   service-role-read) for admin; and a coach relationship model for B2B (below).
   Admin checks happen **server-side only** with the service-role key.
2. **B2B coach↔client model** (greenfield):
   - `coaches(user_id PK, tier, seats, branding jsonb, created_at)`.
   - `coach_clients(coach_user_id, client_user_id, status, invited_at,
     accepted_at, PRIMARY KEY (coach_user_id, client_user_id))` — the
     consented relationship.
   - **New RLS policies** so a coach can read a client's training/progress/
     check-in rows **only when an `accepted` `coach_clients` row exists**. This
     is the one substantial new security surface; it must be written and tested
     as carefully as the existing own-rows RLS (Phase 0 §B2).
   - Plan assignment reuses the existing plan tables with the coach as author and
     the client as `user_id` (respecting the no-re-key rule, the plan is created
     under the client's `user_id` via a coach-scoped RPC).
3. **Notification scheduling**: `scheduled_notifications` table + worker (above).
4. **Admin metric views**: read-only SQL views/RPCs over `engine_telemetry` +
   `users_profile` + `tier_history` for the dashboard (no new data, just shaped
   reads, service-role).

Everything additive; the frozen AAB neither reads nor writes any of it.

---

## SECURITY

- **Admin access**: gated by the `staff_users` allow-list, enforced **server-side
  with the service-role key**; the service-role key never reaches the browser;
  every privileged action (suspend, delete, tier change) goes through the
  existing RPC/Edge Function and is logged. Admin is a separate deployment
  (`admin.`) so its bundle never ships to users.
- **Coach→client data**: scoped strictly by `coach_clients` RLS, a coach can
  reach a client's data only via an `accepted` relationship; revocation removes
  access immediately. No service-role on the coach app (coaches are users, not
  staff).
- **GDPR**: web inherits the locked consent + deletion pipeline (Article 9
  consent, `delete-account`, `account_deletions_log`). Staff access to personal
  data is minimised and auditable; the coach relationship is consent-based
  (client accepts). Cookies: auth only, documented in the privacy policy.

---

## HOSTING (from `docs/HOSTING_RECOMMENDATION.md`, cited there)

- **Recommended: Cloudflare Pages.** Free, commercial-use allowed, unlimited
  bandwidth, Git-push auto-deploy via the Cloudflare GitHub App, free one-click
  subdomains, Next.js via OpenNext adapter or static export, clean Supabase use.
  First real cost ~£5/mo only past 500 builds/mo or 100k SSR req/day.
- **Second option: Vercel Pro ($20/mo)** for best Next.js DX (Hobby is barred,
  commercial use).
- **Subdomains, three separate Pages projects** from one monorepo:
  `app.volyume.app` (user), `admin.volyume.app` (staff-gated),
  `coaches.volyume.app` (B2B). Separate deployments, not route-based, for
  blast-radius, independent deploys, and per-project env/secrets.

### What Al sets up manually (one-time, condensed; full version in hosting doc)
1. **Account**: create a free Cloudflare account.
2. **Domain**: Add `volyume.app` (Free plan) → set Cloudflare's two nameservers
   at the registrar. (Cloudflare Registrar = already done.)
3. **Repo**: Pages → Create → Connect to Git → authorise the Cloudflare GitHub
   App → pick the repo → per project set framework Next.js, root dir
   (`apps/web` etc.), production branch `main`.
4. **Subdomains**: in each Pages project, Custom domains → add `app.` / `admin.`
   / `coaches.volyume.app` → Cloudflare auto-creates CNAME + SSL (DNS is on
   Cloudflare). Manual fallback if DNS elsewhere: `CNAME <sub> →
   <project>.pages.dev`.
5. **Env vars** (per project, in the dashboard, never committed):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public);
   `SUPABASE_SERVICE_ROLE_KEY` as an **encrypted, server-only** var on the
   **admin** project only (and any coach-RPC secret).
6. **One-time**: production branch = `main`; for SSR add the OpenNext adapter +
   `nodejs_compat` flag; static-export the marketing pages.

### What Claude Code handles from there
- Commits + pushes to `main` → Cloudflare GitHub App builds + deploys the
  affected project(s); branches/PRs get preview URLs. No hosting credentials
  needed by Claude Code.
- **Verify**: Pages → Deployments tab (build log + status), or
  `curl -I https://app.volyume.app` (expect 200), or open the URL.
- **Dev vs prod config**: `main` → production env vars; preview branches →
  preview env vars (set per environment in the dashboard).
- **Rollback**: Pages keeps every deployment; "Rollback to this deployment" in
  the dashboard reverts instantly, or revert the commit and push.

Next: Phase 5 — design standards (`web-platform-05-design-standards.md`).

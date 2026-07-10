> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. 2026-07-01 founder-side action list; the current founder-side ops live in docs/TASKBOARD.md §FOUNDER-SIDE OPS. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Founder actions — 2026-07-01

Things only you can do (outside the code). Nothing here is run by the app or by
me against production. Written to be copy-and-do.

Context: this session shipped the weigh-in nudge upgrade (Q1), the cycle-phase
trend annotation (U4), and the female iron/micronutrient **awareness** surface
(U6), all on branch `claude/codebase-audit-docs-pv6mjd`. See the section at the
end for what is deliberately NOT built and why.

---

## 1. Database migrations — ACTION NEEDED: the migration CI is failing

The design is that `.github/workflows/deploy-migrations.yml` applies every
`supabase/migrate_*.sql` to the cloud DB automatically **on merge to `main`**,
recording each one in a tracking table (`claude_schema_migrations`) so it runs at
most once. You paste no SQL.

**But it is currently broken.** The workflow has failed on every recent run
(2026-06-29, 06-30, and the 07-01 merge of this work) at its first step with:

```
SUPABASE_DB_URL is empty. Add it in repo Settings -> Secrets and variables -> Actions
```

The required secret **`SUPABASE_DB_URL` is missing/empty**, so the job exits
before touching the database. The workflow header claims this secret was
configured on 2026-06-06, so it has since been removed, renamed, or rotated.

**Consequence:** these migrations have NOT been applied to EU-Dublin:
- `migrate_092_partner_end_purge`
- `migrate_093_landmark_telemetry`
- `migrate_094_users_profile_sex` (this session's U2 `sex` column)

Production is not broken by this: U2 was written to tolerate the `sex` column
being absent (the client write is skipped/ignored and the read falls back to a
sex-less select), and U4/U6/Q1 add no migration. Sex simply keeps living in
`user_body_profile` until the column exists. But the last three migrations are
silently un-applied and will bite when the app depends on one of those columns.

**Action (about 2 minutes):**
1. Repo **Settings → Secrets and variables → Actions** → add secret
   **`SUPABASE_DB_URL`** = your Supabase Postgres connection string (Supabase
   dashboard → Project Settings → Database → Connection string, **URI** form,
   including the password). If the secret exists under a different name, either
   rename it to `SUPABASE_DB_URL` or tell me and I will point the workflow at it.
2. Re-run: **Actions → "Apply Supabase migrations" → Run workflow**. It is
   idempotent and tracks what is applied, so it applies 092/093/094 and skips the
   rest.

Each file runs in a single transaction with `ON_ERROR_STOP`, so a real SQL
failure rolls back loudly rather than half-applying. Send me the run log if the
re-run fails for any reason other than the missing secret.

---

## 2. Sentry cost guards — so you are never flooded or billed by surprise

The app side is already defensive (event scrubbing in `sentry.js`,
`tracesSampleRate` 0.05). These are the dashboard guards only you can set, on
[sentry.io](https://sentry.io):

1. **Spend cap (the hard stop).**
   Settings → **Subscription** → **Manage** → **On-Demand / Pay-as-you-go
   budget**. Set the on-demand budget to **£0** (or a tiny deliberate ceiling).
   With £0 on-demand, once the included quota is used Sentry simply drops extra
   events instead of charging you.

2. **Spike Protection (blocks a runaway flood).**
   Settings → **Spike Protection** → enable it for the project. This auto-caps a
   sudden abnormal burst of events so one bad release cannot burn the quota in an
   afternoon.

3. **Per-key rate limit (belt and braces).**
   Project → **Settings** → **Client Keys (DSN)** → your key → **Rate Limits**.
   Set a sane ceiling (for a small user base, e.g. a few hundred events/minute).

4. **(Optional) Quota alert.**
   Settings → **Subscription** → usage alerts, so you get an email at, say, 80%
   of quota rather than discovering it at 100%.

Once (1) and (2) are on you cannot be billed beyond the cap or flooded.

---

## 3. On-device smoke test (from a green build)

Quick manual walk of this branch's changes plus the standing device-only checks.

**Q1 — weigh-in nudge (biggest behaviour change):**
- Turn morning reminders **on** (Settings → Coaching reminders, or via
  onboarding). Confirm the 07:00 nudge now **makes a sound** (it was silent).
- Confirm a **second, gentle evening nudge (~19:30)** appears on a day you have
  **not** logged your weight, and does **not** appear on a day you have.
- ED-safety: with an open ED-pattern flag, confirm **neither** weight nudge
  fires (both stand down). This is the important one.
- Change your timezone / travel, cold-start, confirm the nudges re-lay at the
  right local time.

**U4 — cycle-phase note (female profile):**
- On a female profile, add a weekly check-in note mentioning your period, with a
  small weight rise that week. Confirm the coach card shows the reassuring
  "usually water, not fat" line.
- Confirm it does **not** show on a week you are losing weight, on a large jump,
  or on a male profile.

**U6 — female awareness card (female profile, Pro):**
- On a female profile, calculate nutrition targets and confirm the
  "Worth prioritising for you" iron/calcium/B12 card appears under the results.
- Confirm it does **not** appear for a male profile.

**Standing checks (unchanged, still worth a look):**
- SQLCipher DB opens and migrates cleanly on a device upgrading from an older
  build (no data loss).
- The expiring Live Activity rest-timer clamps correctly (VOLYUME-1K).
- Biological sex is enforced at onboarding (cannot proceed unknown) and the
  1500/1200 kcal floors track the chosen sex.
- Google Play OAuth SHA-1 is registered (Apple + Google are the only sign-in
  paths now).

---

## Deliberately NOT built (and why) — needs your decision

- **Full micronutrient tracking (iron vs NRV from logged food).** This is the
  gated **Ultimate-Audit item #16 (MN-1)**. Foods currently carry only
  macros + fibre/sodium/sugar — there is **no** micronutrient data on foods — so
  real per-food iron tracking needs a LARGE schema migration across local
  SQLite + Supabase + sync + seed (CoFID), which CLAUDE.md says must not start
  without a structured founder decision. U6 as shipped is **awareness only**
  (no schema, no tracking). If you want the full Cronometer-style tracking,
  that is a separate, sequenced build — say the word and I will scope it.

- **Tooling note:** the in-chat multiple-choice question tool failed repeatedly
  this session (stream error), which is why decisions were surfaced as plain
  text. Flagging in case it is a wider issue on your side.

# Founder actions — 2026-07-01

Things only you can do (outside the code). Nothing here is run by the app or by
me against production. Written to be copy-and-do.

Context: this session shipped the weigh-in nudge upgrade (Q1), the cycle-phase
trend annotation (U4), and the female iron/micronutrient **awareness** surface
(U6), all on branch `claude/codebase-audit-docs-pv6mjd`. See the section at the
end for what is deliberately NOT built and why.

---

## 1. Database migrations — nothing manual, just confirm CI is green

You do not paste any SQL. Per your own rule ("I do not deploy anything"),
`.github/workflows/deploy-migrations.yml` applies every `supabase/migrate_*.sql`
to the cloud DB automatically **on merge to `main`**, recording each one in a
tracking table (`claude_schema_migrations`) so it runs at most once. Re-running
is a no-op.

- The only schema change in recent work is **`migrate_094_users_profile_sex.sql`**
  (adds the nullable `sex` column to `users_profile` for U2). It is additive and
  idempotent.
- **Action:** after this branch merges to `main`, open the **Actions** tab and
  confirm the **"Apply Supabase migrations"** run went green. That is the whole
  job.
- U4, U6, and the Q1 weigh-in work add **no** migration.

If the workflow ever fails, it fails loudly and rolls back (single transaction,
`ON_ERROR_STOP`) — it never half-applies. If that happens, send me the run log.

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

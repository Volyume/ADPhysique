# Backup & Disaster-Recovery Decision Brief — Volyume Supabase backend

Status: decision brief (research + recommendation). No code changed, no DB
command run. Date: 2026-06-11. Author: coverage-audit follow-up.

> **Production-action guard.** Nothing in this brief has been executed. Any
> action that touches the production Supabase project (enabling PITR, running a
> `pg_dump`, a restore, a `supabase db` command) requires the founder's
> explicit **"run against production"** phrase per CLAUDE.md. Treat every
> runbook step below as *proposed*, not done.

---

## 0. The hole, stated plainly

Per `docs/BUDGET_POSTURE_LOCKED.md`, Supabase runs on the **Free tier**. The
Free tier has **no automated backups and no point-in-time recovery (PITR)** —
this is confirmed across Supabase's own docs and multiple 2026 pricing
write-ups (sources at the end). There is also no restore runbook anywhere in
the repo. So today, if the project is lost, corrupted, or
deleted, recovery is **best-effort from whatever happens to exist** — and on
Free tier, that is nothing the platform guarantees.

Two Free-tier-specific failure modes make this concrete and *likely*, not
hypothetical:

1. **Inactivity pause + deletion.** Free projects pause after **7 days with no
   database activity**, and a paused project that is not reactivated is
   eventually **eligible for deletion (~90 days)**. A solo founder who goes
   quiet for a quarter can lose the project entirely. (Volyume's weekly coach
   RPC and sync traffic probably keep it warm — but that is a side effect, not
   a backup.)
2. **No rollback on a bad migration.** This repo applies migrations by hand via
   the SQL editor (see migration headers: "Apply via Supabase Dashboard -> SQL
   Editor -> Run"). A destructive statement run against prod has **no
   platform-side undo** on Free tier. The `docs/rules/supabase.md` rule
   "never run destructive migrations without a confirmed backup" is currently
   **unsatisfiable** — there is no backup to confirm.

---

## 1. Blast-radius analysis — what actually dies

The decisive fact: **Volyume is offline-first.** Per
`IDENTITY_AND_OWNERSHIP_LOCKED.md` and `SYNC_ARCHITECTURE_LOCKED.md`, every
device holds its own full copy of the user's training/nutrition data in local
SQLite, and the server is a sync *target*, not the source of truth on device.
That splits the blast radius cleanly.

### (a) SAFELY MIRRORED — self-heals on re-sync (LOW DR urgency)

These tables exist on the server only as a sync mirror of data that already
lives on every active user's device. If the server is wiped, an active user's
next sync **re-pushes** their local copy and the row is reconstructed. Loss
here is inconvenience, not destruction.

- Food domain: `food_entries`, `custom_foods`, `saved_meals`, `recipes`,
  `recipe_ingredients`, `food_favourites`, `food_frequents`,
  `nutrition_targets`, `daily_water`, `daily_steps`, `cardio_log`.
- Body / check-in: `weight_log`, `morning_weights`, `body_metrics`,
  `body_composition_log`, `weekly_checkins_v2`.
- Training (legacy sync path): `workouts`, `workout_sets`, `routines`,
  `routine_exercises`, `mesocycles`, `mesocycle_weeks`, `exercises`,
  `custom_exercises`, `personal_records`, `notification_preferences`,
  `device_push_tokens`.

Caveat (honest): self-heal assumes the user **still has the device and still
syncs**. Decisions 2–3 in `IDENTITY_AND_OWNERSHIP_LOCKED.md` say sign-out and
reinstall **wipe local SQLite** and re-pull from cloud. So for a user who has
signed out / reinstalled *after* a server loss, the cloud had nothing to give
back — their data is gone for them specifically. Most active users self-heal;
the long-tail dormant/reinstalling user does not. Treat (a) as "mostly
self-healing", not "zero loss".

Already-excluded from server by design: **progress photos** live in client
SQLite only and never touch Supabase (`BUDGET_POSTURE_LOCKED.md`). Not our DR
problem; OS photo backup covers them.

### (b) SERVER-ONLY — GONE FOREVER if the project is lost (HIGH DR urgency)

This is what justifies (or doesn't) spending money. None of the below has a
client mirror that can rebuild it.

| Server-only data | What it is | Impact if lost |
| --- | --- | --- |
| **`auth.users` (auth identities)** | The Supabase Auth user records — email, OAuth identity, the `auth.uid()` every row is keyed to. | **Catastrophic.** Lose these and users **cannot log back into their synced account**. Even devices that still hold local data are orphaned: there is no identity to re-attach the cloud rows to. This is the single highest-impact loss — it breaks the offline-first self-heal story in (a), because re-sync needs the same `auth.uid()`. |
| **`users_profile` tier/trial state** (`tier`, `trial_state`, `trial_started_at`, `*_trial_ends_at`, `locked_in_price_tier`, `revenuecat_app_user_id`) | Each user's **paid entitlement and locked-in price**. | **Revenue + trust.** Paying users could be silently dropped to free, or trial windows reset. Locked-in founder/open-beta pricing is unreconstructable. RevenueCat holds the *purchase* truth and can re-grant entitlement, but the **price-lock and cascade state are Volyume-only** and gone. |
| **`tier_history`** | Append-only audit of every tier change (migration 030). | Billing/audit trail for disputes, refunds, chargebacks. Unreconstructable. Moderate-high. |
| **`private.trial_ledger` + `private.trial_salt`** (migration 071) | Salted-hash ledger of every email that has consumed the 14-day cardless trial. Deliberately **survives account deletion** to stop delete-and-re-signup trial farming. | **Direct revenue leak.** Lose this (or lose the *salt*, which makes every stored hash unverifiable) and **every user can reset to a fresh 14-day Pro trial** by re-signing-up. This is money walking out the door, repeatedly, silently. Note: the salt is generated once per deployment — if it is lost the ledger is dead weight even if the rows survive. |
| **`consent_log`** (migration 019) | The **GDPR Article 9 explicit-consent audit trail** (health-data / marketing / analytics consent, timestamped). | **Legal/compliance.** Article 9 processing requires you to *evidence* consent. Losing the log doesn't lose the right to process, but you lose the proof — a regulatory exposure, not just inconvenience. `BUDGET_POSTURE_LOCKED.md` lists Article 9 consent as non-negotiable trust infra. |
| **`account_deletions_log`** (migration 039) | Service-role-only record of deletion requests (incl. `user_email`), for GDPR/erasure evidence. | Compliance evidence trail. Moderate. |
| **Server-only telemetry / audit** (`engine_telemetry`, `*_telemetry_events`, `user_feedback`, `debug_log_uploads`, `coach_outputs`, `engine_overrides`, `pricing_config`) | Engine guardrail telemetry, paywall funnel events, founder pricing-window config. | Mostly analytics — annoying to lose, not existential. `pricing_config` is small but load-bearing (drives price windows) and worth capturing. |

**Blast-radius verdict.** The offline-first design genuinely shrinks the
disaster: the bulk of user content in (a) self-heals for active users. But
category (b) is small, dense, and **unreconstructable**, and it contains three
things that are not mere inconvenience: **(1) auth identities** (lose them and
the (a) self-heal story collapses too), **(2) the trial ledger + salt**
(losing it is an ongoing revenue leak, not a one-off), and **(3) tier/price
state + consent log** (revenue, billing-dispute, and Article-9 compliance
exposure). A backup that captured **only category (b) plus `auth.users`**
would protect ~99% of the irreversible damage at a tiny fraction of the data
volume.

---

## 2. Options table

RPO = recovery point objective (how much recent data you can lose). RTO =
recovery time objective (how long to get back). "EU-safe?" tests against the
EU-Dublin residency rule; "PII-safe?" tests against "no PII / no Article 9
data to a non-EU or third-party service" (CLAUDE.md).

| Option | Cost/mo | RPO | RTO | EU-residency-safe? | PII-safe? | Effort to set up | Ongoing ops burden | Within budget lock? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **0. Status quo (Free, no backup)** | £0 | ∞ (total loss possible) | ∞ / never | n/a | n/a (nothing leaves) | none | none | Yes — but violates `supabase.md` "confirmed backup before destructive migration" |
| **1. Supabase Pro — daily backups, 7-day retention** | **$25 (~£20)** | up to 24h | hours (dashboard restore) | **Yes** — backup stays in project's EU region | **Yes** — never leaves Supabase EU | low (toggle plan) | near-zero (automatic) | **No — breaks the lock; needs founder amend** |
| **2. Supabase Pro + PITR add-on** | $25 + **$100** (+ Small compute add-on, ~$10) ≈ **$135** | seconds–minutes | hours | Yes (in-region) | Yes | low | near-zero | No — and overkill for an indie app |
| **3. Manual `pg_dump` to a local EU machine / EU disk** | £0 | = how often founder remembers (poor) | hours–days (manual reload) | **Yes** if dump stays on an EU/UK machine you control | **Yes** if file never leaves your control | medium (founder runs it) | **high** — depends on a human remembering | Yes |
| **4. Scheduled `pg_dump` via GitHub Actions, artifact stored in GitHub** | £0 (within Actions free minutes) | ~24h if daily | hours | **NO** — GitHub.com stores artifacts in the **US** by default | **NO** — ships Article 9 health data + emails to a US third party | medium | medium | **Reject on residency + PII grounds** |
| **5. Scheduled `pg_dump` (CI or cron) → encrypted upload to an EU bucket you control** (e.g. Supabase Storage EU, Hetzner/Scaleway/OVH EU, or an EU S3) | ~£0–5 | ~24h if daily | hours | **Yes** if the bucket is EU and runner is EU/ephemeral | **Yes** if dump is encrypted at rest and the runner doesn't persist it | high (build + secrets + encryption + lifecycle) | medium | Yes (cheap) but real engineering |
| **6. Targeted logical dump of category (b) only** (auth.users export + the server-only tables) to an EU store | ~£0 | ~24h–1wk | minutes–hours (small dataset) | Yes (if EU) | Yes (if encrypted, EU) | medium | low–medium | Yes |

Notes on the rejected option 4: GitHub's default storage region is the US, and
even with a GitHub DPA in place, routing **special-category (Article 9) health
data** through a US third party directly contradicts CLAUDE.md's "no PII to any
external service" and "EU data residency, Supabase EU Dublin". EU data
residency on GitHub exists only on **GitHub Enterprise Cloud (ghe.com)**, which
is not what this repo uses and is far outside the budget. **Do not put a
Volyume DB dump in a GitHub artifact.**

---

## 3. Recommendation (founder decision)

**Primary recommendation: pay for Supabase Pro ($25/mo) — option 1. Yes, this
challenges `BUDGET_POSTURE_LOCKED.md`, and it should.**

Run it through the lock's own three-question gate:

1. *Is the free tier definitively insufficient?* **Yes.** Free tier has zero
   backups and an active-deletion path; the `supabase.md` "confirmed backup
   before destructive migration" rule is literally unsatisfiable on it.
2. *Does production telemetry prove the need?* This is the one place the gate
   should bend. Backups are **insurance against an irreversible, low-frequency,
   high-severity event** — you do not get telemetry proving you needed a backup
   until *after* you've already lost everything. Waiting for proof is waiting
   for the disaster.
3. *Does MRR cover the cost twice over?* For a live, paying app, $25/mo is
   covered by **~3–4 Pro subscribers**. The trial-ledger blast radius alone —
   one exploit thread resetting trials — can leak more than $25/mo.

The asymmetry is the whole argument: $25/mo (≈£20) versus the permanent loss of
auth identities, every paying user's entitlement/price-lock, the Article-9
consent evidence, and an ongoing trial-fraud leak. Pro also gives the
automatic 7-day daily backups with **zero ongoing ops burden** and an in-region
(EU) restore — it satisfies the residency and PII rules for free, because the
data never leaves Supabase.

**Do NOT buy PITR (option 2) yet.** $100/mo + a forced compute add-on is
enterprise-grade RPO (seconds) that a solo indie app does not need. Revisit PITR
only if/when a class of data emerges where losing even an hour is unacceptable.

**Fallback if the founder will not spend until launch revenue lands:**
adopt **option 6** as a stopgap — a scheduled, encrypted **logical dump of
category (b) + `auth.users`** to an **EU store you control**, plus the manual
runbook in §4 run on a calendar reminder. This is cheap and protects the
irreplaceable data, but it carries real engineering and a standing ops burden,
and it does **not** protect (a) self-heal for reinstalling users. It is a bridge,
not a destination. The destination is Pro.

**Explicitly reject:** option 4 (GitHub-artifact dumps) on residency + Article-9
PII grounds, and option 0 (status quo) because it leaves the
`supabase.md` destructive-migration rule unsatisfiable.

**Committed targets (the one-liner):** on **Supabase Pro**, commit to
**RPO ≤ 24h, RTO ≤ 4h** (restore a daily backup into a fresh project within an
afternoon). On the **fallback**, RPO = backup cadence (target daily, realistic
weekly), RTO measured in hours for the small category-(b) dataset.

---

## 4. Minimum restore RUNBOOK

This is the procedure to follow **today**, before any spend, so a recovery is
possible even if all we have is a manual dump. Keep it current as the chosen
option lands.

> Every step that writes to or restores the production project needs the
> founder's explicit **"run against production"** phrase. Do not improvise.

### 4A. Take a manual backup now (no spend required)

1. Authenticate the Supabase CLI to the project (founder's machine, EU/UK).
2. Take a full logical dump (schema + data + roles), e.g.
   `supabase db dump` (roles, schema, and data flags) **or** a direct
   `pg_dump` against the project's pooler connection string. *(Do not invent
   CLI subcommands — `supabase db execute` does not exist; use `db dump` /
   `db push` / the SQL editor per `supabase.md`.)*
3. **Separately capture category (b)**: `auth.users` (auth schema is not in the
   default app dump — dump it explicitly), `users_profile`, `tier_history`,
   `consent_log`, `account_deletions_log`, `pricing_config`, and the
   `private` schema (`trial_ledger` **and** `trial_salt` — the salt is useless
   if dumped without its rows and vice versa).
4. Write the dump to an **EU/UK machine or EU bucket you control**, encrypted at
   rest. **Never** to a GitHub artifact or any non-EU/third-party store.
5. Record: timestamp, project ref, schema version (latest migration number),
   dump file checksum. Store this log next to the dump.

### 4B. Restore into a fresh project (disaster recovery)

1. **Stop.** Confirm the disaster is real (project deleted/corrupted, not a
   transient pause — a paused Free project just needs unpausing from the
   dashboard, no restore needed).
2. Create a **new Supabase project in EU (Dublin)**. Same region — residency is
   non-negotiable.
3. Restore schema: replay migrations `001 … N` in order (or restore the schema
   portion of the dump), then verify against the latest migration number
   recorded in 4A.
4. Restore `auth.users` **first** — every app row is FK'd to it
   (`REFERENCES auth.users(id)`); restoring app data before identities will
   fail or orphan rows.
5. Restore the `private` schema (`trial_salt` then `trial_ledger`) so trial-abuse
   protection is live again before any user can re-trial.
6. Restore the rest of category (b): `users_profile`, `tier_history`,
   `consent_log`, `account_deletions_log`, `pricing_config`.
7. Category (a) tables: restore from the dump if present; otherwise let active
   users **self-heal on next sync** (this is the offline-first payoff — but warn
   that signed-out/reinstalled users will not).
8. Re-point the app at the new project (Supabase URL + anon key), re-deploy Edge
   Functions, re-create the weekly-coach scheduled task.
9. Verify: a test account can sign in, sees tier/entitlement intact, trial
   ledger blocks a repeat trial, RLS policies are present (re-run the RLS
   checks from `supabase.md`).
10. Communicate to users if any data window was lost.

### 4C. If on Supabase Pro (post-spend)

Steps 1–2 collapse to: open Dashboard → Database → Backups → restore the chosen
daily backup (or trigger PITR to a timestamp). RTO drops to hours with no manual
dump juggling. The §4B verification steps (4, 9) still apply.

---

## 5. Flags for the founder

- **AMEND `BUDGET_POSTURE_LOCKED.md`.** The Supabase row says "Free tier …
  upgrade only when a paid-only feature telemetry proves we need." Backups are
  the documented exception to "wait for telemetry": you cannot get telemetry
  proving you needed a backup until after the irreversible loss. Recommend
  changing the Supabase upgrade trigger to add: *"or a backup/DR requirement
  that cannot be satisfied on Free tier — backups are insurance, not a
  telemetry-gated upgrade."* Then record the Pro upgrade in a follow-up
  `_LOCKED.md` per the lock's own "decision rule for every future spend".
- **Production-action phrase.** Enabling Pro/PITR, running any dump or restore,
  or any `supabase db` action against prod requires the explicit
  **"run against production"** instruction (CLAUDE.md). This brief authorises
  none of it.
- **`auth.users` is not in the default app dump.** Whatever option is chosen,
  the auth schema must be captured **explicitly** — it is the highest-impact
  category-(b) data and the easiest to forget.
- **The trial salt is a single point of failure.** `private.trial_salt` is
  generated once per deployment; if it is lost, the entire `trial_ledger`
  becomes unverifiable and trial-abuse protection silently fails open. Back it
  up with the ledger, always together.
- **Never option 4.** A Volyume DB dump in a GitHub artifact ships Article 9
  health data to a US third party — a residency + PII violation. Flagged so it
  is never quietly adopted as "the easy free option".

---

## Sources (accessed 2026-06-11)

- Supabase — Database Backups docs (Free tier: no automated backups; Pro: daily,
  7-day retention; PITR add-on): https://supabase.com/docs/guides/platform/backups
- Supabase — Manage PITR usage / pricing ($100/mo per 7 days; requires compute
  add-on): https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery
- Supabase — Pricing: https://supabase.com/pricing
- Supabase Pricing 2026 breakdowns (corroborating $25 Pro, included 7-day daily
  backups, PITR add-on): https://uibakery.io/blog/supabase-pricing ;
  https://cotera.co/articles/supabase-pricing-guide ;
  https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance
- Supabase Free-tier pause-after-7-days-inactivity / deletion behaviour:
  https://supabase.com/docs/guides/troubleshooting/pausing-pro-projects-vNL-2a ;
  https://www.itpathsolutions.com/supabase-free-tier-limits
- GitHub Actions artifacts stored in US by default; EU residency only on GitHub
  Enterprise Cloud (ghe.com): https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts ;
  https://github.com/enterprise/data-residency
- GDPR Article 9 (special-category / health data): https://gdpr-info.eu/art-9-gdpr/
- GitHub Data Protection Agreement (DPF self-cert for EU→US transfer):
  https://github.com/customer-terms/github-data-protection-agreement

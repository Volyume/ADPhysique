# DATA SCHEMA — Volyume Marketing HQ

**Status:** Governing spec for the Supabase marketing schema.
**Companions:** `marketing/hq/OPERATING-CHARTER.md` (department mandate),
`marketing/hq/CLAIMS-STANDARDS.md`, `marketing/hq/PRODUCT-FACTS.md`.
**Scope:** Cloud schema only, `public` schema, EU-Dublin project, all tables
prefixed `marketing_`. Additive to the existing app schema — no existing
table, column, policy or function is touched. Migrations live in
`supabase/migrate_119_marketing_waitlist.sql` and
`supabase/migrate_120_marketing_hq_tables.sql`, applied manually by the
founder per the standing Supabase rule (never automatic, never CI-triggered).

---

## 0. RLS posture, overall

The marketing department has exactly one public-facing surface: the
volyume.app waitlist signup form, which writes with the Supabase **anon**
key. Every other marketing table is internal — read by the founder's
dashboard session (**authenticated** role, any authenticated user, since
this project has no public signups against marketing tables beyond the
waitlist) or written by the marketing agents running under the
**service_role** key (bypasses RLS by design; agents are trusted backend
processes, never exposed client-side).

So the posture is deliberately asymmetric per table:

- `marketing_waitlist` — anon may **insert only**. No anon select/update/
  delete (a stranger must never be able to read or edit the list, even their
  own row, once submitted — RLS-level protection for GDPR-consented personal
  data, not just app-level). Authenticated has no default access here either;
  founder dashboard reads for the waitlist total go through service_role or
  a purpose-built count. Service_role: full access implicit (RLS does not
  apply to service_role).
- `marketing_content`, `marketing_metrics`, `marketing_ledger`,
  `marketing_channels` — no anon access at all, at any operation.
  Authenticated (founder) gets read access to all four, plus update on
  `marketing_content` (approving/rejecting status transitions from the
  dashboard) and `marketing_channels` (marking a channel live/paused).
  Agents write everything via service_role, which bypasses RLS.

Dashboards therefore always read as an authenticated founder session; agents
always write as service_role. No table is ever writable by anon except the
single insert-only waitlist path, and no table is ever readable by anon.

---

## 1. `marketing_waitlist`

**Purpose:** Captures GDPR-consented "notify me about product updates"
signups from the volyume.app marketing site. This is a public collection
point, so it is deliberately the most restricted table in the schema: a
visitor can add themselves but can never read, edit or remove any row,
including their own, through the public API.

| Column         | Type          | Notes                                    |
|----------------|---------------|-------------------------------------------|
| `id`           | uuid          | PK, default `gen_random_uuid()`.          |
| `email`        | text          | not null.                                  |
| `consented_at` | timestamptz   | not null, default `now()`.                 |
| `source`       | text          | e.g. `'landing-page'`.                     |
| `created_at`   | timestamptz   | default `now()`.                           |

**Constraints:** unique index on `lower(email)` — case-insensitive dedupe,
so `Jo@Example.com` and `jo@example.com` collide as one signup.

**RLS:** enabled.
- `anon` — INSERT only. No SELECT, UPDATE or DELETE for anon under any
  circumstance.
- `authenticated` — no default access (no policy grants it anything on this
  table).
- `service_role` — full access (implicit; RLS is bypassed for service_role).

---

## 2. `marketing_content`

**Purpose:** The single content record for every outward artefact the
department produces — articles, pages, store listing copy, social posts,
community replies, email copy — from draft through the compliance gate to
publication. `compliance_verdict`/`compliance_record`/`claims_citations`
hold the compliance-reviewer's PASS/FAIL and the evidence behind it, per the
Operating Charter's rule that nothing publishes without a recorded PASS.

| Column                | Type        | Notes                                                   |
|------------------------|-------------|----------------------------------------------------------|
| `id`                   | uuid        | PK.                                                        |
| `channel`              | text        | not null, check in `('web','social_instagram','social_tiktok','social_youtube','community','store','email')`. |
| `title`                | text        | not null.                                                  |
| `body_ref`             | text        | path or storage ref of the artefact.                       |
| `status`               | text        | not null, check in `('draft','pending_review','failed_review','approved','scheduled','published','retired')`, default `'draft'`. |
| `lane`                 | text        | not null, check in `('autonomous','founder_tap','founder_only')` (mirrors the Operating Charter's autonomy lanes). |
| `compliance_verdict`   | text        | PASS/FAIL/etc. from compliance-reviewer.                    |
| `compliance_record`    | jsonb       | full compliance review detail.                              |
| `claims_citations`     | jsonb       | citations backing any factual claim, per CLAIMS-STANDARDS.  |
| `scheduled_for`        | timestamptz | when queued for autonomous/approved publishing.             |
| `published_at`         | timestamptz | set on publish.                                             |
| `published_url`        | text        | live URL once published.                                    |
| `created_at`           | timestamptz | default `now()`.                                            |
| `updated_at`           | timestamptz | default `now()`.                                            |

**RLS:** enabled.
- `anon` — no access at all.
- `authenticated` — SELECT (read the pipeline in the dashboard) and UPDATE
  (approve/reject status transitions from the dashboard).
- `service_role` — full access (agents draft, review-stamp, schedule and
  publish).

---

## 3. `marketing_metrics`

**Purpose:** The honest-measurement ledger the mission statement calls for —
daily numbers per metric per source (installs, trial starts, conversions,
cancellations, rating, review count, waitlist total, article views, etc.),
so growth-analyst can build cohorts and the weekly digest without guessing.

| Column        | Type        | Notes                                                        |
|----------------|-------------|----------------------------------------------------------------|
| `id`           | uuid        | PK.                                                              |
| `metric_date`  | date        | not null.                                                        |
| `metric`       | text        | not null, e.g. `'installs'`, `'trial_starts'`, `'conversions'`, `'cancellations'`, `'rating'`, `'review_count'`, `'waitlist_total'`, `'article_views'`. |
| `value`        | numeric     | not null.                                                        |
| `source`       | text        | not null, e.g. `'play_billing_rtdn_derived'`, `'play_console'`, `'manual'`. |
| `created_at`   | timestamptz | default `now()`.                                                 |

**Constraints:** unique `(metric_date, metric, source)` — one figure per
metric per day per source, re-writable but never duplicated.

**RLS:** enabled.
- `anon` — no access.
- `authenticated` — SELECT.
- `service_role` — full access (growth-analyst and the hourly/weekly jobs
  write here).

---

## 4. `marketing_ledger`

**Purpose:** The append-mostly audit trail of everything the department
does — actions taken, publishes, incidents, decisions, notes — the record
behind the weekly digest and the "what happened and why" the founder can
check in under 15 minutes.

| Column        | Type        | Notes                                                        |
|----------------|-------------|------------------------------------------------------------------|
| `id`           | uuid        | PK.                                                                |
| `occurred_at`  | timestamptz | not null, default `now()`.                                        |
| `action`       | text        | not null, short description.                                      |
| `channel`      | text        | which channel this concerns, if any.                              |
| `cost_pence`   | integer     | default `0`.                                                       |
| `result`       | text        | outcome (success/failure/free text).                               |
| `kind`         | text        | check in `('action','publish','incident','decision','note')`, default `'action'`. |
| `detail`       | jsonb       | structured extra detail.                                          |
| `created_at`   | timestamptz | default `now()`.                                                   |

**RLS:** enabled.
- `anon` — no access.
- `authenticated` — SELECT (dashboard and digest read history here).
- `service_role` — full access (every agent writes its own ledger rows).

---

## 5. `marketing_channels`

**Purpose:** One row per marketing channel, tracking whether it exists,
whether it is approved, and what autonomy level it currently holds — the
live state behind the Operating Charter's autonomy-lane rules (a channel is
only ever autonomous once its API is connected *and* its first batch is
founder-approved).

| Column        | Type        | Notes                                                          |
|----------------|-------------|--------------------------------------------------------------------|
| `id`           | uuid        | PK.                                                                  |
| `channel`      | text        | unique, not null.                                                    |
| `account_ref`  | text        | handle/account identifier for the channel.                           |
| `status`       | text        | check in `('not_created','pending_approval','live','paused')`, default `'not_created'`. |
| `capability`   | text        | check in `('manual','founder_tap','autonomous')`, default `'manual'`. |
| `notes`        | text        | free text.                                                            |
| `updated_at`   | timestamptz | default `now()`.                                                       |

**RLS:** enabled.
- `anon` — no access.
- `authenticated` — SELECT and UPDATE (founder can flip a channel's status
  or capability from the dashboard).
- `service_role` — full access.

---

## 6. Access summary

| Table                 | anon                | authenticated (founder) | service_role (agents) |
|-------------------------|---------------------|--------------------------|--------------------------|
| `marketing_waitlist`    | INSERT only         | none                     | full                      |
| `marketing_content`     | none                | SELECT, UPDATE           | full                      |
| `marketing_metrics`     | none                | SELECT                   | full                      |
| `marketing_ledger`      | none                | SELECT                   | full                      |
| `marketing_channels`    | none                | SELECT, UPDATE           | full                      |

Dashboards always read as an authenticated founder session; agents always
write as service_role. This keeps the one genuinely public surface (the
waitlist form) locked to a single narrow capability, and keeps every
internal pipeline table invisible to the public internet entirely.

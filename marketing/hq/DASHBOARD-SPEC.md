# DASHBOARD SPEC — Volyume Marketing HQ

**Status:** Build spec for the Marketing HQ dashboard inside the existing
`web/apps/web` Next.js app. This file is also the unlock for the repo's
edit gate covering this build — it is deliberately concrete: routes, files,
functions, and their exact responsibilities.

**Companions:** `marketing/hq/DATA-SCHEMA.md` (schema + RLS this dashboard
depends on, including the `marketing_admins` gating table),
`marketing/hq/OPERATING-CHARTER.md`, `marketing/hq/CLAIMS-STANDARDS.md`.

**Security model:** the dashboard's own admin check is convenience/UX only.
The real boundary is Supabase RLS via `marketing_admins` membership
(migration `supabase/migrate_121_marketing_hq_tables.sql`). Even if the UI
gate were bypassed, a non-admin's Supabase queries return zero rows and
zero writes succeed, because every policy on the four internal marketing
tables checks `auth.jwt() ->> 'email'` against `marketing_admins`.

---

## 1. Location

New protected section inside the existing `web/apps/web` Next.js 15 App
Router app, under the existing `(app)` route group (the group that already
wraps its pages in the authenticated app shell/nav):

- `src/app/(app)/marketing/page.tsx` — overview, route `/marketing`.
- `src/app/(app)/marketing/content/page.tsx` — content pipeline, route
  `/marketing/content`.
- `src/app/(app)/marketing/content/actions.ts` — server actions for
  approve/reject (section 3).
- `src/app/(app)/marketing/ledger/page.tsx` — ledger, route
  `/marketing/ledger`.

**Follow-ups — BUILT 2026-07-12** under an explicit founder order ("Build
EVERYTHING") superseding this spec's original v1 boundary (which listed
these as "not in this v1 build / do not build"):
- `src/app/(app)/marketing/channels/page.tsx` — `/marketing/channels`.
  Read-only view of `marketing_channels` (channel, status, capability,
  account_ref, notes, updated time). Channel mutation from the dashboard
  remains unbuilt.
- `src/app/(app)/marketing/reports/page.tsx` — `/marketing/reports`.
  **Data-source ruling (lead, 2026-07-12):** NO new `marketing_reports`
  table — cloud schema changes are founder-gated, so reports are derived
  weekly rollups computed server-side at read time from `marketing_ledger`
  and `marketing_metrics`: ledger rows grouped by week (Europe/London,
  Monday start) with counts per `kind`, plus the latest metric value per
  metric within each week, one card per week, newest first, capped at the
  last 8 weeks (`getWeeklyReports` in `src/lib/marketing/queries.ts`).

### Auth layering

The `(app)` layout already calls `requireUser()` for every page in the
group — reuse it, do not duplicate it. On top of that, every page in
`src/app/(app)/marketing/**` additionally calls a new admin check:

`src/lib/marketing/auth.ts`:

```ts
export async function requireMarketingAdmin() {
  const user = await requireUser(); // existing helper, throws/redirects if not signed in
  const supabase = createServerSupabase(); // existing server client factory
  const { data } = await supabase
    .from('marketing_admins')
    .select('email')
    .eq('email', user.email)
    .maybeSingle();
  if (!data) {
    redirect('/dashboard');
  }
  return user;
}
```

Every page and server action under `marketing/` calls
`requireMarketingAdmin()` first, before any other work. Because RLS also
enforces this at the database layer, a non-admin's `supabase.from('marketing_admins')...`
call above returns zero rows regardless of any bug in this function — the
UI redirect is belt, RLS is braces.

---

## 2. Data access

New file, app-local (not the shared `@volyume/*` packages, since this data
layer is marketing-dashboard-specific): `src/lib/marketing/queries.ts`.

Uses `createServerSupabase()` from `@volyume/supabase/server` (the existing
server-side Supabase client factory used elsewhere in the app — anon key,
RLS-bound, never service_role).

Functions:

- `getLatestMetrics()` — selects the most recent row per `metric` from
  `marketing_metrics` (distinct on `metric`, ordered by `metric_date desc`).
  Returns a map keyed by metric name (`installs`, `trial_starts`,
  `conversions`, `rating`, `review_count`, `waitlist_total`, etc.) plus
  `source` and `metric_date` per entry, so the UI can label "as of" and
  source.
- `getWaitlistTotal()` — reads the `waitlist_total` row out of the same
  `marketing_metrics` result (source of truth for the waitlist count on
  this dashboard is the `marketing_metrics` table, written by an agent job).
  **The dashboard must never query `marketing_waitlist` directly** — that
  table has no `authenticated` SELECT policy at all (RLS deliberately
  blocks it, per DATA-SCHEMA.md section 1, to protect GDPR-consented
  personal data), so a direct query would simply return nothing and is not
  a valid path even for an admin. If `waitlist_total` has no row yet, the
  UI shows "awaiting data" exactly like any other missing metric.
- `getContentByStatus()` — selects all `marketing_content` rows, grouped
  client-side (or via multiple queries) by `status`, ordered by
  `updated_at desc` within each group.
- `getLedgerPage(page: number)` — selects `marketing_ledger` newest-first
  by `occurred_at`, paged 50 rows at a time (`range((page-1)*50, page*50-1)`).

All four functions run under the caller's authenticated session (RLS
applies); none use service_role.

---

## 3. Mutations

`src/app/(app)/marketing/content/actions.ts` — Next.js server actions:

```ts
'use server';

export async function approveContent(id: string) {
  await requireMarketingAdmin();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('marketing_content')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/marketing/content');
}

export async function rejectContent(id: string, reason: string) {
  await requireMarketingAdmin();
  const supabase = createServerSupabase();
  // fetch existing compliance_record, merge founder_rejection in, then update
  const { data: row } = await supabase
    .from('marketing_content')
    .select('compliance_record')
    .eq('id', id)
    .single();
  const compliance_record = {
    ...(row?.compliance_record ?? {}),
    founder_rejection: { reason, at: new Date().toISOString() },
  };
  const { error } = await supabase
    .from('marketing_content')
    .update({ status: 'failed_review', compliance_record, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/marketing/content');
}
```

Both actions re-verify admin status independently of any page-level check
(a server action can be invoked directly, so it must not trust that the
page that rendered its trigger already checked). Both revalidate
`/marketing/content` on success so the pipeline view reflects the change
without a manual refresh. Writes go through the caller's authenticated
session (RLS-gated), not service_role — consistent with "no service-role
usage anywhere in the web app" (section 6).

---

## 4. UI

Reuse existing conventions, no new visual system:

- Components from `@volyume/ui`: `Card`, `CardHeader`, `CardTitle`,
  `Button`, `StatusDot`, and `LineChart`/`Sparkline` where a trend is
  meaningful.
- Existing app shell/nav: add a "Marketing" entry to the nav, rendered only
  when `requireMarketingAdmin()`-equivalent check passes for the signed-in
  user (i.e. the nav does its own lightweight admin lookup so non-admins
  never see the entry at all — this is cosmetic; the real gate is the
  page-level redirect plus RLS).

### Overview (`/marketing`)

Stat cards, one per key metric: installs, trial starts, conversions,
rating, waitlist total. Each card:
- Shows the latest value and its `metric_date`/`source` when
  `getLatestMetrics()` has a row for that metric.
- Shows "awaiting data" (not a zero, not a dash) when there is no row yet,
  labelled with which metric/source it's waiting on, so it's visually
  distinct from a real zero.

A small trend chart (`LineChart`/`Sparkline` from `@volyume/ui`) renders
under the stat cards only once there is more than one data point for a
metric to plot; omitted entirely while data is sparse rather than showing
an empty/misleading chart.

### Content (`/marketing/content`)

Pipeline grouped by `status` (draft, pending_review, failed_review,
approved, scheduled, published, retired) as lanes/sections. Each content
row shows:
- `lane` as a badge (autonomous / founder_tap / founder_only).
- `compliance_verdict` (PASS/FAIL/etc.) as a `StatusDot` or equivalent.
- Approve and Reject buttons, visible only on rows where a decision is
  still actionable (e.g. `pending_review`, `approved` awaiting publish —
  match whatever the existing pipeline's actionable statuses are, don't
  invent new ones).
- Reject opens a small prompt/dialog asking for a reason (free text),
  passed to `rejectContent(id, reason)`.

### Ledger (`/marketing/ledger`)

Table of `occurred_at`, `kind`, `action`, `channel`, `result`, one row per
`marketing_ledger` entry, newest first, paged 50 at a time (page controls
using `getLedgerPage`). `kind` rendered with a colour-coded `StatusDot`
(suggested mapping: `action` neutral, `publish` positive, `incident`
negative/warning, `decision` info, `note` neutral — follow whatever
`StatusDot`'s existing colour tokens support, do not invent new colours
outside `@volyume/ui`'s palette).

---

## 5. Non-goals for v1

- No editing of content bodies from the dashboard (body_ref points at the
  artefact; editing it is out of scope here).
- No metrics backfill UI (metrics are agent-written; this dashboard is
  read-only for metrics).
- No channel mutation beyond notes/status (full channel management is the
  `/marketing/channels` follow-up). **Note 2026-07-12:** the read-only
  `/marketing/channels` and `/marketing/reports` views were built under the
  founder order superseding the v1 boundary (see section 1); channel
  mutation from the dashboard remains unbuilt, and reports are derived
  rollups with no new table (data-source ruling in section 1).
- No service-role usage anywhere in the web app, for any of this. Every
  read and write here goes through the caller's authenticated (admin)
  session and is bound by RLS.

---

## 6. Environment

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already
  the app's existing pattern, no new env vars required.
- No new dependencies. Build entirely from `@volyume/ui`, `@volyume/supabase`,
  and Next.js primitives already in the app.

---

## 7. Verification

**Automated (must pass before merge):**
```
pnpm --filter @volyume/web lint
pnpm --filter @volyume/web typecheck
pnpm --filter @volyume/web build
```
Report exact output per the repo's standing rule — never claim done
without it.

**Manual (device/browser walkthrough):**
1. Founder signs in on their usual device/browser with the admin Google
   account. Expected: "Marketing" nav entry appears.
2. Navigate to `/marketing`. Expected: overview renders; any metric with
   no `marketing_metrics` row yet shows "awaiting data" (not zero, not
   blank); a trend chart appears only for metrics with more than one data
   point.
3. Navigate to `/marketing/content` with a seeded test content row present.
   Expected: row appears in its status lane with lane badge and compliance
   verdict visible.
4. Approve the seeded test row. Expected: status flips to `approved`,
   pipeline view updates without manual refresh.
5. Seed (or reuse) another test row; reject it with a reason. Expected:
   status flips to `failed_review`, and the reason is retrievable from
   `compliance_record.founder_rejection` (spot-check via Supabase table
   editor is acceptable).
6. Navigate to `/marketing/ledger`. Expected: table renders newest-first,
   paging works past 50 rows if seeded data supports it.
7. Sign in with a non-admin (ordinary app user) account. Expected: no
   "Marketing" nav entry; direct navigation to `/marketing` redirects to
   `/dashboard`.

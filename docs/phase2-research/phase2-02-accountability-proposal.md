# Phase 2 — Feature 1 Proposal: Training Partners (Private Accountability) (phase2-02)

**Date:** 2026-06-08 · **Status:** proposal for approval; nothing built until approved.
**Grounded in:** `phase2-00` (codebase audit) + `phase2-01` (research). Every decision below is justified by a research finding and fits an existing Volyume system.

---

## 0. Positioning & naming

**Name:** **"Training Partners"** (You tab). Not "Groups", not "Community", not "Social". The research (phase2-01 §A3) shows partner support helps moderately and that *unsupportive* comparison backfires (r=−.14); the strongest dyadic evidence (Köhler, Wallace) is for **pairs/small circles**, and Strava/Fitbit show scale-beyond-the-dyad is where harm appears. We therefore frame this as **accountability infrastructure between people who already trust each other**, capped small.

**What it is:** invite-link-only private circles (default cap **6 members**, recommend 2 for the strongest evidence). The only thing shared is a **derived weekly consistency signal**: a status word + sessions-done-vs-planned, for the current week.

**What it is never:** no feed, posts, comments, likes; no discovery/search/profiles; **no weight, calories, macros, performance, PRs, exercises, check-in text, coaching output, or ED-safety data — ever.** (phase2-01 §C3.)

**Decision — single partner vs small circle:** ship **circles capped at 6**, default invite copy framed for "a training partner". Rationale: the evidence base is strongest for dyads, but a hard cap of 2 is brittle (one person leaves → dead feature). A small cap preserves the dyadic feel, prevents Strava-style scale problems, and the consistency signal stays per-person and abstracted. *(Open question for sign-off: hard-cap at 2, or 6? Recommendation: 6.)*

---

## 1. Architecture decision (critical)

Volyume's offline sync engine is **strictly single-owner** (every `registry.js` table is RLS-scoped `auth.uid() = user_id`, LWW; `phase2-00` §2.3). Accountability is intrinsically cross-user, so it **must not** go through that engine. Instead:

- New Supabase tables with **member-scoped RLS** read **cloud-directly** (a thin read path), NOT via `src/lib/sync/`.
- The local `workouts` table stays the source of truth for the user's *own* training; we **publish** a derived weekly boolean upward, and **read** partners' booleans downward.
- This is the one sanctioned exception to "components never query Supabase directly": a dedicated service `src/lib/partners/partnerService.js` owns all partner reads/writes, so screens still never touch Supabase directly — they call the service. The service degrades gracefully offline (returns last-cached signals from a small local cache table; never blocks UI).

---

## 2. Data architecture

### 2.1 Supabase schema (new migration `migrate_072_training_partners.sql`)

```sql
-- ============ groups (called "circles" in UI) ============
create table public.partner_circles (
  id          uuid primary key default gen_random_uuid(),
  name        text,                                   -- optional, owner-set
  created_by  uuid not null references auth.users(id),
  member_cap  int  not null default 6 check (member_cap between 2 and 6),
  created_at  timestamptz not null default now()
);

create table public.partner_members (
  circle_id        uuid not null references public.partner_circles(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  display_name     text not null,                     -- set on join; user controls what partners see (NOT account name)
  role             text not null default 'member' check (role in ('owner','member')),
  status           text not null default 'active' check (status in ('active','paused','removed')),
  sharing_enabled  boolean not null default true,     -- the data-layer toggle (phase2-01 D3)
  paused_reason    text,                              -- 'contest_prep' | 'manual' | null
  joined_at        timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index on public.partner_members(user_id);
create index on public.partner_members(circle_id);

create table public.partner_invites (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references public.partner_circles(id) on delete cascade,
  token_hash  bytea not null,                         -- digest(token,'sha256'); raw token only in the link
  created_by  uuid not null references auth.users(id),
  expires_at  timestamptz not null,                   -- mandatory
  max_uses    int  not null default 1,
  used_count  int  not null default 0,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============ the only shared payload: a derived weekly signal ============
create table public.partner_weekly_signal (
  user_id           uuid not null references auth.users(id) on delete cascade,
  iso_week          date not null,                    -- Monday (UTC), matches getWeeklySessionStats anchor
  sessions_done     int  not null default 0,
  sessions_planned  int  not null default 0,
  streak_weeks      int  not null default 0,
  status            text not null check (status in ('in_progress','on_track','easy','quiet')),
  server_updated_at timestamptz not null default now(),
  primary key (user_id, iso_week)
);

alter table public.partner_circles        enable row level security;
alter table public.partner_members         enable row level security;
alter table public.partner_invites         enable row level security;
alter table public.partner_weekly_signal   enable row level security;
```

**Status derivation (NEVER a "missed" label until the week is over — phase2-01 §A3/B avoid shaming):**
- `in_progress` — week ongoing, below planned.
- `on_track` — `sessions_done >= sessions_planned` (or ≥ ceil(0.75×planned) mid-week).
- `easy` — week over, 1..<planned done ("Taking it easy").
- `quiet` — week over, 0 done. (Neutral word; never "missed"/"failed".)

### 2.2 Private helper schema (avoids recursive RLS — phase2-01 §D1)

```sql
create schema if not exists private;

create or replace function private.circles_for_user(uid uuid)
  returns setof uuid language sql stable security definer set search_path = '' as $$
  select pm.circle_id from public.partner_members pm
   where pm.user_id = uid and pm.status = 'active';
$$;

-- viewer may see sharer's signal iff they share an active circle AND sharer is sharing
create or replace function private.may_view_signal(viewer uuid, sharer uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.partner_members me
    join public.partner_members them on them.circle_id = me.circle_id
    where me.user_id = viewer and me.status = 'active'
      and them.user_id = sharer and them.status = 'active'
      and them.sharing_enabled = true
  );
$$;
```

### 2.3 RLS policies (default-deny; no discovery)

```sql
-- circles: visible only to active members; no list-all path exists
create policy circles_read on public.partner_circles for select
  using ( id in (select private.circles_for_user((select auth.uid()))) );
create policy circles_insert on public.partner_circles for insert
  with check ( (select auth.uid()) = created_by );

-- members: see co-members of your circles; manage only your own row
create policy members_read on public.partner_members for select
  using ( circle_id in (select private.circles_for_user((select auth.uid()))) );
create policy members_self on public.partner_members for all
  using ( (select auth.uid()) = user_id )
  with check ( (select auth.uid()) = user_id );

-- invites: NEVER selectable by clients; only the accept RPC (security definer) touches them
-- (no select policy -> default deny). Owner creates via RPC too.

-- weekly signal: read own always; read co-member only when sharing on
create policy signal_read_own on public.partner_weekly_signal for select
  using ( (select auth.uid()) = user_id );
create policy signal_read_partner on public.partner_weekly_signal for select
  using ( private.may_view_signal((select auth.uid()), user_id) );
-- NO client insert/update policy -> signal is written only by security-definer RPC (anti-gaming, phase2-01 D6)
```

### 2.4 Invite + accept + publish RPCs

```sql
-- create invite (owner only), returns RAW token once
create or replace function public.create_partner_invite(p_circle uuid, p_ttl_hours int default 168)
  returns text language plpgsql security definer set search_path = '' as $$
declare v_token text; begin
  if not exists (select 1 from public.partner_members where circle_id=p_circle and user_id=auth.uid() and role='owner' and status='active')
    then raise exception 'not_circle_owner'; end if;
  v_token := encode(gen_random_bytes(16),'base64');
  insert into public.partner_invites(circle_id, token_hash, created_by, expires_at)
    values (p_circle, digest(v_token,'sha256'), auth.uid(), now() + make_interval(hours => p_ttl_hours));
  return v_token;  -- caller builds volyume://partner/<token>
end; $$;

-- accept invite (race-safe single-use), enforces member_cap + onboarding lock
create or replace function public.accept_partner_invite(p_token text, p_display_name text)
  returns uuid language plpgsql security definer set search_path = '' as $$
declare v_inv public.partner_invites%rowtype; v_count int; begin
  select * into v_inv from public.partner_invites
    where token_hash = digest(p_token,'sha256') and not revoked
      and expires_at > now() and used_count < max_uses for update;
  if not found then raise exception 'invalid_or_expired_invite'; end if;
  select count(*) into v_count from public.partner_members where circle_id=v_inv.circle_id and status='active';
  if v_count >= (select member_cap from public.partner_circles where id=v_inv.circle_id)
    then raise exception 'circle_full'; end if;
  insert into public.partner_members(circle_id, user_id, display_name)
    values (v_inv.circle_id, auth.uid(), p_display_name)
    on conflict (circle_id, user_id) do update set status='active';
  update public.partner_invites set used_count = used_count + 1 where id = v_inv.id;
  return v_inv.circle_id;
end; $$;

-- publish my derived weekly signal (server computes the boolean; client cannot fake it)
create or replace function public.publish_my_weekly_signal()
  returns void language plpgsql security definer set search_path = '' as $$
declare v_done int; v_week date := date_trunc('week', now())::date; begin
  -- server-authoritative count from real completed workouts synced for this user
  select count(*) into v_done from public.workouts
    where user_id = auth.uid() and is_completed = true
      and started_at >= v_week and started_at < v_week + interval '7 days'
      and duration_minutes >= 10;                       -- plausibility threshold (phase2-01 D6)
  insert into public.partner_weekly_signal(user_id, iso_week, sessions_done, sessions_planned, status, server_updated_at)
    values (auth.uid(), v_week, v_done, /*planned passed from client profile*/ 0,
            case when v_done = 0 then 'in_progress' else 'on_track' end, now())
  on conflict (user_id, iso_week) do update
    set sessions_done = excluded.sessions_done, status = excluded.status, server_updated_at = now();
end; $$;

revoke all on function public.create_partner_invite(uuid,int), public.accept_partner_invite(text,text), public.publish_my_weekly_signal() from public;
grant execute on function public.create_partner_invite(uuid,int), public.accept_partner_invite(text,text), public.publish_my_weekly_signal() to authenticated;
```

> Note: `workouts` must be reliably synced to cloud for `publish_my_weekly_signal` to count sessions. Volyume already syncs `workouts` (registry). `sessions_planned` is supplied from the user's active-plan routine count (read locally, passed as a param in the real impl) — kept as a hint, never authoritative.

### 2.5 Local cache (offline grace)
Add a tiny **local-only** table `partner_signal_cache(circle_id, user_id, display_name, status, sessions_done, sessions_planned, streak_weeks, cached_at)` via the `database.js` migration array. `partnerService` writes to it on each successful cloud read so the You-tab card renders instantly offline (last known signals + "Updated 2h ago"). Never synced.

---

## 3. Service layer — `src/lib/partners/partnerService.js`

Single module that screens call (screens never touch Supabase directly):
- `getMyCircles()`, `getCircleSignals(circleId)` → cloud read (RLS-scoped) + write-through to `partner_signal_cache`; on network failure, return cache.
- `createCircle(name)`, `createInvite(circleId)` → returns `volyume://partner/<token>` + share text.
- `acceptInvite(token, displayName)` → calls `accept_partner_invite`; enforces **onboarding lock** (reject if account age < 7 days, mirroring research that the first week shouldn't be disrupted).
- `publishWeeklySignal()` → calls `publish_my_weekly_signal` with local `sessions_planned`. Triggered on: workout completion, weekly check-in submit, app foreground (if >6h since last publish). Fire-and-forget, never blocks.
- `setSharing(circleId, enabled)`, `leaveCircle(circleId)`, `pauseForContestPrep()/resume()`.
- All functions no-op gracefully when `tier !== 'pro'` or Supabase unconfigured.

---

## 4. Contest-prep auto-pause (reads coaching engine; never modifies it)

The coach already stores phase on `users_profile` (`goalPhase`; `phase2-00` §5). `partnerService.publishWeeklySignal()` reads it: when phase ∈ {`contest_prep`, `aggressive_cut`}, it sets the user's `partner_members.status='paused', paused_reason='contest_prep'` across their circles and **stops publishing**. Partners see "Your training partner has paused sharing" (no phase name, no detail). On exit, status returns to `active`. This is **read-only** on the coaching engine — no engine logic touched (hard rule).

---

## 5. User experience

### 5.1 Location
**You tab**, a new "Training Partners" section below the existing Coaching section (`YouScreen.js`). Settings toggle lives in **You → Settings → Coaching** (`SettingsCoachingScreen.js`), matching where wearable/coaching prefs already sit. **No prompts on Train/Home** — keeps the premium, uncluttered training surface intact (phase2-00 §8, research §C4 anti-creep).

### 5.2 Flows
**Create & invite:** You → Training Partners → `[Invite a training partner]` → `createCircle` + `createInvite` → system share sheet with:
> *"I'm training with Volyume — want to keep each other honest? Join me: volyume.app/partner/<token>"* (British English.)

**Accept:** deep link `volyume://partner/<token>` opens app → if signed-in Pro: **Partner Preview** screen → `[Accept] [Not now]`. If no account: store token, show on signup ("A training partner invited you"). On accept → `acceptInvite(token, displayName)`; if within first 7 days, show "You can connect a partner after your first week."

**Viewing (the whole feature):**
```
TRAINING PARTNERS
Sam — week 3 of a 7-week streak
This week   ●●●○        on track · 3 of 4
You         ●●●●        on track · 4 of 4
```
A single tap on a 4-emoji nudge (💪 🔥 👊 ✊) is the *only* interaction — max one per partner per day. (Emoji nudge is **optional/stretch**; see §7 push caveat.)

**Empty state:**
> **TRAINING PARTNERS** — *Training with someone? Stay accountable together. One partner. Private. Nothing shared but whether you trained.* `[Invite a training partner]`

### 5.3 Visual
Reuse `Card`/`PressableCard` (`surface #191917`, radius `lg`), amber `#F5A623` for the consistency pips and CTA, `textSecondary` for the status line. Status pips are filled (done) vs outline (planned-remaining) circles — abstracted like Apple's rings (research §B2: abstraction protects). `SectionHeader` uppercase. 48dp buttons. Skeleton on load; cached-value + "Updated Xh ago" offline.

### 5.4 Onboarding moment (progressive disclosure, once)
After the user's **4th completed workout** (tracked in a `seen_onboarding_hints` row, per cross-cutting brief), a one-time subtle banner on the You tab: *"Training with someone? Stay accountable together."* Shown once, then never again. No "What's New" modal.

### 5.5 Copy (British English, plain, adult)
- Consent modal (first enable): *"Training Partners shows the people you invite whether you trained each week — a simple on-track signal and your session count. **It never shares your weight, food, body data, or coaching.** You choose what name they see, and you can stop sharing instantly. Off by default."* `[Turn on] [Not now]`
- Toggle-off confirmation: *"Stop sharing with your partners? They'll see that sharing is paused. Nothing else changes, and you can turn it back on any time."*

---

## 6. Integration points

- **Pro gating:** the entire section + settings row gated via `tier === 'pro'` (`useAppStore(s=>s.tier)`) and `ProGate`/`withProGuard` (phase2-00 §4). Free users see nothing. Post-upgrade onboarding may surface it.
- **Settings toggle:** `partner_sharing_enabled` as a **cloud-synced profile field** (Pattern B, phase2-00 §11) added to `PROFILE_FIELDS_TRACKED`; the per-circle `sharing_enabled` is the authoritative data-layer gate, the profile flag is the master switch the toggle drives.
- **Consistency signal:** derived from existing `workouts` via the `publish` RPC mirroring `getWeeklySessionStats` (`database.js:4214`). **No new user input, no new tracking.**
- **Notifications:** use existing `expo-notifications` channels. **Caveat (phase2-00 §10): remote push is a no-op today (no EAS projectId).** So: ship a **Sunday-evening local digest** (*"Your training week: 4 sessions. Sam: 3."*) via the existing local scheduler — works without push. Emoji-nudge push is **deferred** until an EAS projectId exists; until then nudges show in-app only.

## 7. What must be preserved (acceptance criteria)
- Premium feel unchanged; Train/Home untouched; no feed/posts/likes anywhere.
- Toggle-off → partners get **zero rows** via RLS (`may_view_signal` returns false); leaving a circle removes all trace.
- **RLS proof required:** user A cannot read any signal of user C with whom they share no active circle (strangers invisible by construction).
- No weight/calorie/macro/performance/check-in/coaching/ED data in any payload — enforced by schema (those columns don't exist on shared tables).
- Onboarding lock: invites fail for accounts < 7 days old.
- Offline: You-tab card renders cached signals, never spins forever.
- Contest-prep auto-pause verified; coaching engine bytes unchanged.

## 8. Rollout & risk
- **Feature flag:** introduce a minimal `feature_flags` table (none exists today) OR gate via a profile flag + remote-config row; default **off**, enable for a beta cohort first (research: prove no ED-safety/comparison harm before GA). Recommendation: small `feature_flags(flag_name pk, enabled, enabled_user_ids uuid[])`, fetched once per session, default-false on fetch failure.
- **Beta gate to GA:** ≥ positive consistency impact, **zero ED-safety events linked to the feature**, zero "competition/comparison" themes in feedback, activation ≥ target. If any fails → do not advance; reassess scope.
- **GDPR:** explicit opt-in consent recorded; privacy notice updated; DPO sign-off on the special-category question (phase2-01 §D5); short DPIA.

## 9. Open questions for sign-off
1. Member cap — **2 (pure dyad)** or **6 (small circle)**? *(Recommend 6.)*
2. Ship emoji nudges now (in-app only, no push) or defer entirely until EAS projectId exists? *(Recommend in-app only now.)*
3. Confirm `feature_flags` table is acceptable as a new, RLS-read-only table.

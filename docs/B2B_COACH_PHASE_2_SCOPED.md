# B2B coach surface (phase 2 scoped)

Locked-but-deferred design for the coach workflow. Detailed enough
that the phase 1 schema groundwork (`engine_overrides` table,
`coach_id` columns, server-side `clientLink` plumbing) is correctly
shaped. Locked 2026-05-23.

## Phase 2 scope summary

Already locked in `COMPLETE_TIER_SCOPE_LOCKED.md` and
`MASTER_VISION_AND_PLAN.md`:

- Coach pays, client gets Complete free during active coach link.
- Tiered flat pricing: Starter £29.99 / Pro Coach £59.99 / Studio
  £119.99 per month. Founding coach: 50% off lifetime.
- 60-day standard trial. Founding programme: 6 months free.
- Web dashboard at coach.volyume.app, not in-app.
- One-time share URL with expiry as the linking mechanism for phase
  2 v1.
- Migration tools required: bulk invite, CSV import, programme
  templates, exercise library import.

## Coach account model

A coach is a regular Volyume account with an additional `coach_id`
record. They sign up via the web dashboard with the same Supabase
auth flow.

New tables (groundwork lands in phase 1, populated in phase 2):

```
coach_profiles
  id              uuid PK
  user_id         uuid NOT NULL REFERENCES auth.users(id)
  business_name   text
  tier            text CHECK (tier IN ('coach_starter','coach_pro','coach_studio'))
  trial_state     text CHECK (trial_state IN ('unstarted','active','expired','paid'))
  trial_started_at  timestamptz
  trial_ends_at     timestamptz
  founding_coach    boolean DEFAULT false
  active_clients    int DEFAULT 0
  created_at        timestamptz DEFAULT now()
  updated_at        timestamptz DEFAULT now()

coach_client_links
  id              uuid PK
  coach_id        uuid NOT NULL REFERENCES coach_profiles(id)
  client_user_id  uuid NOT NULL REFERENCES auth.users(id)
  status          text CHECK (status IN ('invited','accepted','revoked'))
  invited_at      timestamptz
  accepted_at     timestamptz
  revoked_at      timestamptz
  invite_code     text                    -- one-time URL token
  invite_expires_at timestamptz
  UNIQUE (coach_id, client_user_id)

coach_invite_codes
  code            text PK                 -- short, URL-safe
  coach_id        uuid NOT NULL REFERENCES coach_profiles(id)
  client_email    text                    -- optional preview
  expires_at      timestamptz NOT NULL    -- 14 days from creation
  used_at         timestamptz
  used_by_user_id uuid REFERENCES auth.users(id)
  created_at      timestamptz DEFAULT now()
```

The `engine_overrides` table already ships in phase 1
(`DATABASE_SCHEMA_LOCKED.md`).

## Linking flow

1. Coach pastes one or more client emails into the dashboard's
   "Invite clients" panel.
2. Volyume Coach generates a per-email invite code and a share URL
   (e.g. `https://volyume.app/coach-invite/abc123XYZ`).
3. Coach sends the URL to clients (via the dashboard's built-in
   email composer, copy-paste, or QR for in-person).
4. Client taps the URL on their phone -> opens Volyume mobile app
   via universal link.
5. App signs the user in (or prompts signup if no account).
6. Confirmation screen: "Coach [name] wants to link to your
   account. They'll see your training, food, weight, and check-in
   history. They can suggest adjustments to your plan. You can
   unlink at any time."
7. Tap Accept -> `coach_client_links.status = 'accepted'`.
8. Client tier auto-upgrades to `complete_via_coach_link` (a
   sub-state of `paid_complete`).
9. Engine reads coach overrides if any exist; otherwise runs
   normally.

## Unlinking

Two paths:

- **Client unlinks** (You -> Coach link -> Unlink). Immediate.
  `coach_client_links.status = 'revoked'`. Client tier reverts to
  whatever they paid personally (Free, Pro, or self-paid Complete).
  Their `engine_overrides` rows are kept but stop applying.
- **Coach unlinks** (Dashboard -> Client -> Remove). Same effect.

If coach subscription lapses (billing failure beyond grace), all
client links suspend. Clients see a banner: "Your coach link has
paused because [coach name]'s subscription is on hold. We'll restore
it when they sort the billing." Engine returns to non-override
output during suspension.

## Coach dashboard layout (web)

Single-page web app, separate codebase (`coach-dashboard/`). Built
with Next.js (static export) hosted on Vercel free tier. Reads from
Supabase via the same auth.

### Pages

- **Login**: Supabase auth, same as mobile.
- **Onboarding** (first time coach): business name, tier choice,
  60-day trial start.
- **Dashboard home**: list of linked clients with quick-glance:
  name, current phase, last check-in date, current weight, current
  target kcal. Click row -> client detail.
- **Client detail**: multiple panels:
  - Header: name, photo (if client allows; per locked decision
    photos don't sync, so this is initials-based avatar), phase,
    week.
  - Engine output: latest weekly coach output verbatim, with the
    coach's overrides side-by-side if any exist.
  - History: weight trend, intake trend, training volume trend.
  - Actions: "Override targets" (creates an `engine_overrides`
    row), "Add note" (visible to client and coach), "Send message"
    (in-app DM in phase 2 v2).
- **Programme builder**: create reusable training programmes, apply
  to one or many clients.
- **Foods**: verify community-sourced foods for clients, mark as
  `Coach`-source in the source chip.
- **Invite clients**: bulk paste emails, send invite URLs.
- **Settings**: coach tier management, billing, business profile.

## Coach pricing and billing

Already locked:

| Tier | Standard | Founding (50% off lifetime) | Client cap |
| --- | --- | --- | --- |
| Starter | £29.99/mo | £14.99/mo | 5 |
| Pro Coach | £59.99/mo | £29.99/mo | 20 |
| Studio | £119.99/mo | £59.99/mo | 50 |
| Enterprise | Custom | Custom | 50+ |

Billing via Stripe (not Apple/Google IAP) because the web dashboard
is the purchase surface. Stripe receipts feed into a coach-specific
`tier_history` row.

Trial:
- 60 days standard, full Studio tier (50-client cap) during trial.
- Founding coaches: 6 months instead.
- Auto-downgrade to Starter (5-client cap) at trial end if no
  payment. Clients above the cap revert to their personal tier;
  data preserved.

## Coach overrides

Already locked schema-wise in
`DATABASE_SCHEMA_LOCKED.md` (`engine_overrides` table). Behaviour:

- Override fields: `target_kcal`, `target_protein_g`,
  `target_carbs_g`, `target_fat_g`, `phase`, `training_volume`,
  `block_focus`, free-text `coach_note`.
- Engine reads overrides at output time. Original values continue
  to feed trend tables.
- Held decisions get a new key `coach_override_applied: true` when
  in effect.
- Removing the coach automatically restores engine-only output.
- Safety guardrails (FFM floor, ED-pattern lockout, rapid-loss flag)
  are NEVER overrideable by a coach. If a coach tries to set
  `target_kcal` below the FFM floor, the dashboard surfaces a
  warning and refuses the write.

## Migration tools

Locked in `MASTER_VISION_AND_PLAN.md` as scope expansion. Detail:

### Bulk client invite

- Coach pastes emails (one per line) into a textarea.
- System checks each email: if a Volyume account exists, generate
  invite linking to that account. Else generate invite that will
  prompt signup.
- Each invite gets a unique 14-day-expiry code.
- Dashboard shows a sortable status list: Invited / Accepted /
  Expired.

### CSV import for weight history

- Coach uploads a CSV of historical weight per client (date,
  weight_kg).
- After client accepts the link, the CSV rows insert into
  `weight_log` with `source = 'coach_import'`.
- Imported rows do NOT feed the engine's EWMA until they are at
  least 14 days old (prevents a sudden batch import from
  contaminating the trend).

### Programme templates

- Coach builds a training template (sets of exercises, weekly
  layout).
- Apply to one or many clients with one tap.
- Per-client adjustments live as overrides on top of the template.

### Exercise library import

- Coach uploads a CSV of their own exercise list.
- System auto-maps known names to Volyume's exercise registry by
  fuzzy match.
- Unmapped exercises become custom exercises on the coach's
  profile and the linked clients.

## Phase 2 v2 (future)

Not in v1, but the schema accommodates:

- **Volyume B2B accounts** for multi-coach studios. `coach_org`
  table with multiple `coach_profiles` linked. Shared billing.
- **In-app messaging** (coach <-> client). New tables
  `coach_messages`, RLS by both ends.
- **Coach-set reminders** (push to clients). Locked in
  `NOTIFICATIONS_LOCKED.md` as a category.
- **Native coach mobile app**. Web-first now; mobile if pull
  warrants.

## Telemetry specific to coach surface

Events emitted by the dashboard:

```
coach_signup
coach_trial_started
coach_trial_ended
coach_paid
coach_client_invited
coach_client_accepted
coach_client_unlinked
coach_override_created
coach_override_cleared
coach_override_rejected_safety   -- when trying to override FFM floor
coach_csv_imported
coach_template_applied
```

Dashboards add a "Coach health" panel:

- Active coaches by tier
- Coach signup -> first client invite latency
- Coach signup -> first client accepted latency
- Trial -> paid conversion
- Coach -> client ratio
- Override usage rate

## Acceptance check (when phase 2 ships)

- Coach signup -> trial start -> invite client -> client accepts -> client
  tier upgrades to complete_via_coach_link. All on real RevenueCat
  / Stripe sandbox.
- Override at the dashboard appears in the next weekly engine run.
- Override that would breach FFM floor is refused with clear copy.
- Coach unlinking restores client tier within 60 seconds via sync.
- Founding coach (first 100) sees 6-month trial banner; 101st sees
  60-day trial.

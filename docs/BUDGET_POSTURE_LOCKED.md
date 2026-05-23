# Budget posture (locked)

The first iteration of every feature ships at minimum viable scope on
the cheapest infrastructure that still meets the production-readiness
bar. We grow into paid tooling as MRR justifies it. Locked 2026-05-23.

## Principle

Three rules apply to every implementation decision:

1. **Free tier first.** Every third-party tool starts on its free
   tier. We upgrade only when usage forces it (rate limit, feature
   gap, support cost).
2. **Feature MVP first.** First iteration of every screen, every
   engine surface, every tier feature ships at the smallest version
   that delivers the named outcome. Polish, depth, and edge cases
   land in v1.1, v1.2, ongoing.
3. **No speculative spend.** No paid service, no paid API, no paid
   library at v1 unless production telemetry proves we need it.

## Infrastructure cost ledger

Locked posture per service.

| Service | Posture at v1 | Upgrade trigger |
| --- | --- | --- |
| **Supabase** | Free tier (500MB DB, 1GB Storage, 2GB egress, 50k MAU) | Hit any free-tier limit |
| **Sentry** | Free Developer tier (5k errors, 10k performance/month) | More than 5k errors/month for 2 weeks running |
| **Expo Push** | Free (no per-message cost) | If push reliability drops or we need richer scheduling, evaluate FCM/APNs direct |
| **RevenueCat** | Free below $2,500/month MRR (1% cut above that) | Crossing $2.5k MRR triggers the cut, still cheaper than building it ourselves |
| **GitHub Actions** | Free tier (2000 minutes/month private) | Hit minutes limit; CI matrix optimisation first, paid second |
| **EAS Build** | Free tier (30 builds/month) | If build cadence exceeds limit; otherwise stay free |
| **App Store fees** | Apple 15% (small business programme), Google 15% | Unavoidable; baked into pricing |
| **Domain + DNS** | Existing | None |
| **CDN** | Not needed at v1 (Supabase Storage handles static) | If photo timeline or bundled snapshot delivery hits bandwidth limits |
| **Email provider** | None at v1 (push only, see master plan 11.1) | When email lands at v1.1, start with SendGrid/Postmark free tier |
| **Analytics** | Sentry + Supabase native dashboards only | No Mixpanel/Amplitude/PostHog at v1; revisit if attribution becomes a real question |
| **Customer support** | In-app feedback view + founder email | No Intercom/Zendesk at v1 |
| **Feature flags** | Hand-rolled in `proGate.js` | No LaunchDarkly/Statsig at v1 |
| **Marketing site** | Existing volyume.app | No WebFlow/Framer enterprise; static or simple build |
| **Open beta waitlist** | Email capture form on volyume.app + Supabase row | No paid waitlist service |
| **Coach dashboard hosting** | Static site (Netlify/Vercel free tier) + Supabase API | No paid hosting until coach revenue justifies |

## Feature scope deferrals from v1 to v1.x

To keep v1 lean, the following Complete-tier surfaces can defer
without breaking the locked product story.

| Feature | Original locked move | Defer to | Reason |
| --- | --- | --- | --- |
| Photo progress timeline | Move #5 (Complete surfaces) | v1 on-device only, no cloud sync ever | Photos are personal record. OS-level backup (iCloud Photos, Google Photos) covers loss protection. No Supabase Storage write at any version saves bandwidth and storage permanently. |
| Recipe URL importer | Always v1.1+ | v1.1 | Already deferred. |
| Refeed automation (any cut, not just contest prep) | Move #5 Complete surface | v1.1 | Existing contest-prep path covers the safety case. Automating across all cuts is polish. |
| Body composition charts deep view | Move #5 | v1.1 | Ship read-only summary at v1; full charts + export at v1.1. |
| Share-pack PDF generation | Move #5 | v1.1 | CSV export at v1 is sufficient for coach handoff. PDF requires a generation service or library; defer. |
| Year of Lifts extensions | Move #5 | v1.1+ | Existing Year of Lifts stays; new lift types and dashboards defer. |
| Saved meals + recipes (full UX) | Move #1 | Move #1.5 or v1.1 | Manual food entry is sufficient at v1. Templates land once core diary is stable. |

These stay in the schema (so we don't need a migration later) but
the UI ships in a later iteration.

## Storage and bandwidth specifics

Photos are not stored in Supabase Storage at any version. Locked
posture:

- **Photos stay on-device only.** The `photo_progress` table lives
  in client-side SQLite only, never in Supabase. Photos do not
  transfer between devices and are not part of account backup.
- **OS-level backup is the user's responsibility.** iCloud Photos
  on iOS, Google Photos on Android. Volyume's camera roll save
  (optional toggle in You tab, default off) writes photos to the
  device gallery, which the OS backup then captures.
- **Coach handoff does not include photos.** The share-pack PDF
  (v1.1) and CSV export at v1 cover weight, food, training history,
  and macros. Photos remain personal record; coach sees the data, not
  the image timeline.
- **Why this is fine.** Photos are personal record keeping. Cloud
  sync added cost, complexity, and a privacy surface for marginal
  benefit. The OS-level backup path is what users already trust for
  every other photo on their phone.

Bundled OpenFoodFacts snapshot is the second cost lever (app binary
size). 20-40 MB compressed is acceptable; OTA delta downloads stay
within the free-tier Supabase Storage egress.

## Engine compute

The weekly coach engine runs server-side once per user per week. At
1,000 users that's 1,000 RPC calls per week, well within free tier.
At 10,000 users it's still under 50,000 calls per week. Supabase free
tier comfortably handles this.

No paid compute (Lambda, Cloud Functions) needed at v1. The engine
lives in a Supabase Postgres function (`run_weekly_coach(user_id)`)
called by a scheduled task. Free.

## What we explicitly do NOT defer

These are non-negotiable safety, quality, or trust features. They
ship at v1 regardless of budget:

- All five engine guardrails (FFM floor, ED-pattern lockout, rapid-
  loss compression, protein cap, adherence-quality gate).
- Article 9 explicit consent screen.
- FTC HBNR breach notification language in privacy policy.
- Sentry with on-device error ring buffer attached.
- Feedback views and weekly digest review.
- All telemetry events for engine guardrails.
- Account deletion path that wipes SQLite + Supabase + Storage.

Cutting any of these to save scope is not a budget decision; it's a
trust failure.

## Decision rule for every future spend

Before committing to any paid service, infrastructure upgrade, or
third-party API, the answer to all three must be yes:

1. Is the equivalent free tier definitively insufficient?
2. Does production telemetry (not assumption) prove the need?
3. Does monthly recurring revenue cover the cost twice over?

If any is no, defer. If all three are yes, document the decision in
a follow-up `_LOCKED.md` doc and proceed.

## Acceptance check

- Every supporting doc in this folder references this posture where
  cost decisions are made.
- No paid service contracted for v1 that does not appear in the
  ledger above.
- Photo timeline ships on-device-only at v1 (cloud sync deferred).
- v1.1 backlog has photo cloud sync, refeed automation, body
  composition deep view, share-pack PDF, recipe URL importer named
  explicitly.

# Phase 2 · Wave 3 Design Spec (Fable-authored, safety-critical)

**Author:** Fable (main loop, hands-on). **Date:** 2026-07-04.
**Why hands-on:** D4 (photo prompt) and the D5 framing are ED-safety- and
voice-locked surfaces; per the agent-tier rule these are designed by Fable and
only the *mechanical* build is delegated, against this exact contract. A build
agent MUST NOT deviate from the framing, copy, triggers or suppression here.

---

## D4 · Progress Photos LOOP-3 (milestone-adjacent capture invitation)

### Intent
Give the user a calm, opt-in path back to a *second* photo — offered only on a
**training/competence** win the app already celebrates, never on a body/weight
event, never on a schedule. Closes the return-loop hole without a cadence nag.

### Trigger (exact)
Offer the invitation at MOST on these events, which the app already surfaces:
- A **new PB** celebrated in `PRCelebration` / `WorkoutSummaryScreen`
  (`MilestoneBurst`), OR
- A **session-streak milestone** already recognised (`streak_milestone_reached`)
  — i.e. an N-session/N-week *consistency* landmark.

NEVER trigger on: a weigh-in, a bodyweight change, a body-composition entry, a
calorie/macro event, a "you look…" moment, or any time-based schedule. The
trigger is *competence*, full stop.

### Hard gates (all must pass, fail-closed)
1. **Suppression:** call `usePhotoSuppression()` — if `suppressed` is true (calm
   mode OR open ED flag OR any read failure), the invitation is NEVER shown. It
   starts suppressed and only appears once suppression resolves false. Reuse the
   existing hook exactly; do not add a parallel gate.
2. **Pro gate:** Progress Photos extras are Pro; respect the existing tier gate.
3. **Dismissal is permanent per user choice:** a "Not now" dismiss hides it for
   that moment; a **"Don't ask again"** affordance sets a persisted flag
   (AsyncStorage, e.g. `photo_prompt_optout`) that suppresses the invitation
   FOREVER after. Default is *shown* (opt-in per moment), but opting out is
   one tap and permanent. Once opted out, never render again.
4. **Frequency ceiling even when shown:** at most once per calendar day, and
   never twice for the same milestone. A simple per-day + per-milestone-id dedupe
   (mirror the partner-moment `≤1/day` idiom).

### Copy (exact — competence-anchored, calm, British English, no em dash)
- Title: **"Mark the moment"**
- Body: **"You just hit a milestone. If you'd like, add a photo to your record.
  Your own pace, always private to this phone."**
- Primary action: **"Add a photo"** → the existing add flow (`upsertPhotoMeta`
  path via `PhotoDetailsSheet`), pre-tagged nothing special (user picks pose/date
  as normal).
- Secondary: **"Not now"** (dismiss this instance).
- Tertiary (small, low-emphasis): **"Don't ask again"** (permanent opt-out).

BANNED words/framings anywhere in this surface: before/after, transformation,
progress *of the body*, "see how you've changed", "leaner/bigger", weight, any
appearance language. It is about marking a *training* moment, not the body.

### Placement / component
A calm, dismissable card appended INSIDE the existing celebration surface
(`WorkoutSummaryScreen` milestone area) — NOT a modal, NOT a push notification
(LOOP-3 is explicitly not a reminder). Built Card-native (uses `Card`, tokens,
`haptics.press` on the add tap — calm-gated). No new full-screen surface.

### Telemetry (only lands when migrations applied)
Optional: a `photo_prompt_shown` / `photo_prompt_accepted` pair (feature key
only, no PII) added to `events.js` + the allow-list migration, so the loop's
take-rate is measurable. If added, follow the migrate_099 template. This is
additive and may be deferred.

### What this is NOT
No cadence. No streak on photos. No schedule. No push. No body trigger. No
default-on nagging beyond a single dismissable card at a competence moment.

---

## D5 · Partners A + B (mutual weekly intention + warmer reciprocity)

### A — Mutual weekly intention (the shared object)
**Data (additive, device→cloud, derived-safe):** each partner optionally confirms
a weekly session *aim* (an integer, against their OWN plan — reuse the existing
weekly planned-count they already have). Store as an additive column/table
alongside the existing `partner_week_signals` (a new `weekly_aim` per user per
week, or a small `partner_weekly_intentions` table) via a founder-run migration
(migrate_103+; follow the additive/idempotent header rules; NO change to the
locked ED-freeze compute path).

**Display (PairCard):**
- Before/during week: **"You both aimed for {n} this week."** (each shows their
  own aim; NEVER show one partner's number as larger/smaller than the other —
  no comparison, no ranking, no "ahead/behind").
- At week close, if both met their *own* aim: a shared kept-moment —
  **"You both kept your week."** (a single co-owned moment, not two separate
  cards). Reuse the rest-safe streak rule: a miss HOLDS, never attributes, never
  reds, never "you let them down".

**Copy law:** intention not obligation. Allowed: "aim", "kept your week",
"showed up". BANNED: "must", "target you have to hit", "don't let them down",
"you're behind", any cross-person comparison, any number that ranks one above the
other. Each partner is measured only against their own aim.

### B — Reciprocity + lifecycle moments
1. **Fixed acknowledgement set** (replaces the single wordless cheer's silence):
   still ≤1 send/pair/day, still NO free text (the no-messaging lock holds). A
   small FIXED enum of pre-written, no-shame lines the sender picks from:
   - "Proud of your week."
   - "Good to see you back." (post-rest/quiet)
   - "Strong week, both of us."
   - "Here with you." (a quiet default)
   Curated to the coaching voice; calm; never performance-ranking. Downgrades to
   in-app-only under an ED flag (mirror the existing cheer behaviour).
2. **"Your partner joined" moment + push** — the missing accept-signal. When a
   pending invite is accepted, fire a budgeted push (reuse the `PARTNER_*` push
   category + budget) AND an in-app moment: **"{name} joined you."** Fresh-window
   guarded like the other partner beats. This closes the silent-accept dead spot.
3. **Reconnection surface on archive** — when a shared streak archives after the
   existing quiet-week window, show an optional, non-guilt
   **"Start a new run together?"** on the PairCard (the copy already exists,
   unused, at `sharedStreak.js:95`). One tap, dismissable, never nagging.

### Hard locks (unchanged, must hold)
No feed, no leaderboard, no ranking, no free-text messaging, no cross-person
number comparison, no coach-engine coupling, derived-data only, ED-freeze
inherited at all three layers, deletion-on-unpair still purges any new tables.
Any new shared table MUST be added to the unpair/delete purge and guard-tested.

### Build split
- **Framing/copy above = authored (this doc).** The build agent uses it verbatim.
- **Delegated (Sonnet/Opus, tightly specced, Fable-reviewed):** the additive
  migration(s), the `partner_weekly_intentions` read/write in the service +
  usePartners, the PairCard UI, the acknowledgement enum UI, the accept push
  wiring, the reconnection surface, and the guard-test extensions (unpair purge +
  no-comparison copy ban, mirroring the existing partner guard tests).

### Telemetry
Add `partner_intention_set`, `partner_week_kept_together`, `partner_joined`
(counts/enums only) to `events.js` + allow-list migration if the loop's health
should be measurable. Additive; may be deferred with the other dark events.

---

## Sequencing note
The Photos LOOP-3 surface and the Partners A+B surfaces are built **Card-native**
here (they are excluded from the Track-B codemod to avoid collision). Every change
lands only through Fable review → `npm run lint && npm test` green → per-feature
commit. The additive migrations are founder-applied (like all cloud migrations);
the UI degrades gracefully until they land.

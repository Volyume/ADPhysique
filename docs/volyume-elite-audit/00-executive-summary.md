> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Audit + strategy options only, no build committed on its face; surviving ideas (Photos/Partners integration, Card-adoption codemod) were re-derived and built inside the July-9 campaigns. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# 00 · Executive Summary — Volyume Elite Audit

**Author:** Fable (main-loop synthesis). **Date:** 2026-07-04.
**Evidence base:** 15 non-Fable subagent audits (2 Haiku inventories, 5 Sonnet
technical audits, 8 Opus judgement/research audits), `docs/volyume-elite-audit/inputs/`.
**Status:** AUDIT + STRATEGY ONLY. No production code changed. Nothing here is a
decision — every recommendation is an option for the founder, prioritised.

---

## The one thing to take away

**Volyume is not an average product that needs fixing. It is an elite-token,
under-assembled product with a genuinely rare and unowned market position, whose
two newest features are well-built in isolation but not yet woven into the
organism.**

Ten of the fifteen audits, working independently, converged on the same shape:
the *foundations are elite* (the design tokens, the deterministic engine, the
ED-safety system, the privacy locks, the coaching core, the test discipline),
and the *gaps are almost entirely at the seams* — where features should connect
to each other and to the user's returning behaviour, and don't yet.

This is a much better problem to have than the founder feared. "Bolted-on" is
not a vibe; it is real, measurable, and located in code — and it is a problem of
**assembly, not rebuild**.

---

## The "bolted-on" feeling, decomposed into four layers

The founder's instinct that newer features feel like "clipped-on ad-hoc
services" is correct. It is not one problem; it is four, and separating them is
the single most useful thing this audit produced, because each has a different
fix and a different cost.

### Layer 1 — Components (the *visual* bolt-on). Mechanical. Cheap.
The design system is genuinely elite **at the token layer** (`theme.js`: 658
lines, WCAG-computed, dual-theme, CVD-safe, named haptic/motion/state grammars —
O1 calls it "do not touch; make everything else live up to it"). But it is
**under-adopted at the component layer**: `Card.js` was built to be "THE base
surface" replacing ~83 inline boxes, yet only **14 of 80 screens** import it and
**64 of 80** still hand-roll the box (S4, verified with counts). The five
Progress Photos modals — 2,597 lines combined — import **zero** design-system
components (S4). This is why the app reads as "templated shell" rather than one
material. **Fix: roll `Card` + a shared `ModalHeader` + the haptic vocabulary
across the non-core surfaces.** Mechanical, wide, low-risk. Closes most of the
*visual* gap at once (O1's single highest-leverage move).

### Layer 2 — Integration (the *systemic* bolt-on). Architectural. The real one.
The features don't *know about* the rest of the app. Progress Photos has **zero
coaching-engine integration** — `grep -i photo` over `weeklyCoach.js`,
`coachApply.js`, `coachingGoals.js`, `mesocycle.js` returns nothing (O5). The
weekly coach never mentions a photo; a PB day never suggests one; the check-in
never invites one. Partners shares exactly **one derived weekly boolean** and
nothing links it to goals, achievements, or the coach (O6). These are orphans
wired to the app by a single thread each (a weight snapshot; an attendance
tick). **This is what "bolt-on" means in code**, and it is the deeper problem
the component fix alone will not solve.

### Layer 3 — Loops (the *retention* bolt-on). Product. The highest-value.
Features that don't create returning behaviour feel like storage, not systems.
Progress Photos has **no return path to photo #2** — "no cadence nag" (correct,
locked) was built as "no calm path back at all" (O5). Partners' loop is **one
wordless cheer per day** (O6). The **individual weekly streak has no
re-engagement push** — only the *partner* streak does, leaving the strongest
solo habit surface half-open for the majority who have no partner (O4). The
weekly coach is the most complete loop in the app; almost nothing else closes.

### Layer 4 — Measurement (the *invisible* bolt-on). One founder action.
The most important single finding in the entire audit: **the founder is flying
blind on exactly the questions this audit raises.** The whole
activation/conversion/partner/landmark funnel telemetry **was built** (client
emitters all exist and are wired) but is **dark server-side** because migrations
`092–102` are "Applied remotely: NO" — events fire on-device, get rejected by
the server allow-list on push, and never reach the warehouse (O4, P0). The task
premise that "funnel events were never built" is **outdated**. They exist. They
just cannot land until the founder runs the pending SQL. Until then, no funnel
question — activation rate, paywall view→trial, partner-invite drop-off — is
answerable.

---

## The strategic position (the reason this matters)

Both web-research audits (O7 market, O8 patterns) reached the **same
independent conclusion**: Volyume occupies a market position that **no
competitor holds as a whole product**.

The market has bifurcated into cheap loggers (Hevy, Strong) and premium
coaching-algorithm apps (MacroFactor, RP, Caliber). Meanwhile **AI became the
loud default** in the last 12 months (Hevy Trainer, Fitbod, Cronometer Oracle,
WHOOP AI). And the loudest sources of user resentment across the set are
**paywall bait-and-switch** (MFP's barcode-gate, Strava's segment-gate) and
**shame mechanics** (streak anxiety, evaluative leaderboards that "eject the
non-elite majority").

Volyume is, by construction, the counter-position to all of it:
- **Deterministic, no AI ever** — now a *contrarian trust stance*, not a gap (O7).
- **Calm, no-shame, ED-safe** — the Gentler Streak soul, which O8 names as
  "the closest external analogue to Volyume's soul."
- **Private by construction** — offline-first, encrypted, **photos never leave
  the device** (a genuine moat; Google's Apr-2026 health-data policy now
  *forbids* what competitors do).
- **Honest binary free/pro** with a generous free logger — a reputational asset
  precisely because the market resents the opposite.

**The gap is that this position is currently *implicit in the code* and not
*expressed as a system*.** The elevation is not about adding features to compete
on the AI axis. It is about **assembling what is already built** into one
coherent, calm, private, witnessed-progress product — and then marketing that
stance deliberately.

---

## The unifying idea for the two priority features

Progress Photos and Partners feel bolted-on partly because they read as two
unrelated mini-apps. They are not. Reframed, they are **two expressions of one
idea: witnessed effort over time.**

- **Progress Photos = you witnessing your own change over time** — private,
  calm, self-relative (never "look how bad you were").
- **Partners = one trusted person witnessing that you showed up** — private,
  calm, relational (never evaluative/leaderboard).

Both are private. Both are calm. Both are about *showing up and being seen*
without judgement — which is Volyume's whole brand. The move that makes them
feel native rather than bolted-on is to **plug both into the weekly rhythm** —
the check-in / weekly-coach moment that is already the app's most complete loop
and its most anticipated beat (the WHOOP pattern O8 recommends adopting). That
one architectural decision converts two orphans into two organs.

Full direction in `05-progress-photos-deep-dive.md` and `06-partners-deep-dive.md`.

---

## Biggest risks (ranked)

1. **[P0] Growth telemetry is dark** (O4). Every downstream growth decision is
   blind. One founder action (apply `092–102` to EU-Dublin) unblocks it. Highest
   value-per-effort item in the audit.
2. **[P0-adjacent] The consent gate and Pro-gating have no *behavioural* test**
   (S5). RootNavigator can't render under Jest, so the Article 9 gate and
   `withProGuard` coverage are pinned only by source-regex guards; a new Pro
   screen could ship ungated undetected. Trust-critical surfaces protected by
   the most brittle test type.
3. **[P1] The free-tier workout core still runs on legacy sync** (S4). All 21
   registry tables are migrated; the highest-traffic, largest-cohort domain
   (workouts, routines, PBs) is the *unmigrated* half with no conflict strategy
   or regression matrix. The wrong half is legacy.
4. **[P1] iOS Live Activity may be non-functional in shipped builds** (S1) — the
   Widget Extension target isn't automated by any config plugin. Needs device
   verification; if true, a shipped feature is dead.
5. **[P1] Photos have no backup path** (O5) — the category's #1 churn driver
   ("app DELETED all my photos"). The never-leaves-device lock forbids cloud, so
   any fix is a user-initiated local export — a founder decision, not a default.

## Biggest opportunities (ranked by leverage)

1. **Apply the pending telemetry migrations.** Turns the lights on. (S, founder action.)
2. **Populate the empty paywall proof slot** — `PAYWALL_EXCERPTS = []` ships the
   paywall with zero social proof despite the UI being built (O4, the single
   biggest conversion lever, S complexity).
3. **Roll the component system across the bolted-on surfaces** — closes the
   visual gap; makes the app feel like one product. (M, mechanical.)
4. **Weave Photos + Partners into the weekly rhythm** — converts two orphans
   into organs; the architectural heart of the elevation. (M, needs design.)
5. **Package `runWeeklyCoach` as an anticipated weekly moment** (WHOOP pattern) —
   the calm retention spine the app is 80% built toward. (M.)
6. **Give the solo weekly streak a calm re-engagement push** — the largest
   half-open retention loop, for the majority with no partner (O4). (M, ED-gated.)

---

## What is already elite (protect, do not touch)

Named precisely so the elevation work does not damage what is working:

- **`theme.js` + `haptics.js`** — token/haptic/motion system, WCAG-computed. The
  reference. Everything else should rise to it. (O1)
- **The ED-safety system** — `usePhotoSuppression` (fail-closed, double-gated),
  the three-layer partner freeze, calorie floors, calm mode. Exemplary and
  constitution-locked. (O5, O6, S2)
- **Privacy posture** — photos never leave device (guard-tested), partner
  deletion-on-unpair (real, RPC-verified, pinned), the append-only consent rail.
  Genuine differentiators, screenshot-worthy. (O5, O6, O4)
- **The coaching core** — CoachOutput (8.5/10, the integration reference),
  WeeklyCheckIn state handling, the complete weekly-coach loop. The bar the rest
  of the app should copy. (O1, O4)
- **Test discipline** — 428 suites / 5,859 tests, invariant tests against the
  real engine, source-regex founder-rule guards, zero TODO/FIXME in `src/`. (S5, S4)
- **The voice** — no trust-damaging copy, no dark patterns, no shame, British
  English, no em-dash. The best line in the app: *"Nothing you've logged
  disappears. Every workout, every PR, every check-in stays on your phone exactly
  as you left it."* (O3)

---

## How to read the rest of this pack

- `01-agent-strategy.md` — the roster + the no-Fable guarantee (already written).
- `02-product-map.md` — the complete app map.
- `03-ux-ui-audit.md` · `04-feature-by-feature-audit.md` — the consolidated audits.
- `05-progress-photos-deep-dive.md` · `06-partners-deep-dive.md` — **the
  centrepiece**: Fable's redesign direction for the two priority systems.
- `07-market-and-competitor-research.md` · `08-retention-growth-and-monetisation.md`
- `09-technical-quality-audit.md`
- `10-prioritised-roadmap.md` — **the actionable spine**: P0→P3, with the
  founder-decision forks called out explicitly (never pre-decided).
- `11-elite-volyume-vision.md` — what Volyume feels like when it is elite.

**Every recommendation in this pack is an option, not a decision. The forks
between "do the full thing" and "do less" — and every founder-gated item (backup
export, cadence reminders, partner mechanics, billing-adjacent paywall copy) —
are surfaced for the founder to choose, never chosen here.**

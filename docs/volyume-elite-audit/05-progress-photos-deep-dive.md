# 05 · Progress Photos — Deep Dive & Redesign Direction

**Author:** Fable (main loop), building on O5's read-only evidence audit
(`inputs/progress-photos-deep-dive.md`). **Date:** 2026-07-04.
**Status:** direction + options. No code changed. Every fork is the founder's.

---

## The verdict, in one line

**A beautifully-built island that needs a bridge, not a rebuild.** O5's phrase —
"a beautifully-built island, not yet an integrated organ" — is exactly right and
I fully agree with it. The surfaces are premium and, in the case of ghost-overlay
capture, genuinely best-in-class and nobody-else-ships-it. The problem is not
quality; it is *connection*. The feature is wired to the rest of Volyume by a
single thread (a weight snapshot) and to the user's returning behaviour by
nothing at all.

This matters because progress photos are, for a physique app, one of the most
emotionally powerful assets there is — and the audits agree the raw material is
already excellent. Getting the connection right is the difference between a Pro
feature users tolerate and one they stay for.

---

## What is genuinely excellent (protect it precisely)

I want to be unambiguous about what *not* to touch, because the temptation in an
elevation pass is to "improve" things that are already right:

1. **Ghost-overlay capture is the crown jewel.** Faint previous-photo overlay,
   rule-of-thirds grid, optional horizon level (only if `expo-sensors` is already
   present — no forced dep), live-tier shutter guard, calm non-cadence voice. No
   coaching competitor ships this (O5, O7). It is a signature. Promote it; do not
   redesign it.
2. **The ED-safety model is exemplary.** `usePhotoSuppression` starts suppressed,
   does dual raw fail-closed reads, and every high-risk surface is double-gated.
   This is the safety spine and it is done right. Every option below inherits it.
3. **Never-leaves-device is proven, not asserted** (absent from `SYNC_REGISTRY`,
   guard-tested). A genuine moat in a market Google is now policing (O7).
4. **The weight-snapshot semantics are thoughtful** — snapshot at capture,
   re-snapshot only on date-edit, lazy one-time backfill. Correct.
5. **The compare copy-ban is hard-pinned** (no before/after/delta/weight
   vocabulary). The ED accelerant refused *structurally*, not by convention.

The three deep-dives and the design-system audit independently confirm: the
gallery, viewer, compare, capture and share *surfaces* are premium. The gap is
elsewhere.

---

## The three real gaps (and why they are the whole story)

### Gap 1 — Zero coaching integration (the root cause of "bolt-on")
`grep -i photo` over `weeklyCoach.js`, `coachApply.js`, `coachingGoals.js`,
`mesocycle.js` returns **nothing** (O5, verified). The app that coaches
everything else is *silent* about the one artefact that shows non-scale change.
The weekly coach never references it; the check-in never invites it; a PB day
never suggests one. This is what "bolt-on" means in code: the feature is not part
of the conversation the app is having with the user.

### Gap 2 — No return loop (the retention hole)
The only way a user takes photo #2 is by independently remembering to navigate to
the tile. O5's sharpest observation: **"no cadence nag" (correct, locked) was
implemented as "no calm path back at all" — and those are not the same thing.**
The entire value of a photo record is *accumulation over time*; the ghost-overlay
differentiator is *inert* without a second photo. The loop never closes.

### Gap 3 — The data model is one column wide
`progress_photo_meta` carries date, pose, weight, note. A photo doesn't know what
goal it belongs to, what mesocycle phase it sits in, or what the user was working
toward. It can't be read in context ("this was week 4 of my first cut").

Everything else O5 found (hand-rolled dialog chrome, no backup path, no lighting
primer, reassurance one screen early) is real and in the roadmap — but these
three are the story. Fix these and the island becomes an organ.

---

## The redesign direction: "your record, witnessed calmly"

The reframe that makes this feel native (from `11-elite-volyume-vision.md`):
**Progress Photos = you witnessing your own change over time.** It is the
self-directed twin of Partners (someone else witnessing your showing-up). Both
are private, calm, self-relative. The bridge that connects the island is the
**weekly rhythm** — the check-in / coach moment that is already the app's most
complete loop.

Concretely, three moves, each with the founder fork named:

### Move 1 — Surface the record inside the weekly check-in (closes Gap 1 + Gap 2)
The check-in is the one place the app already has the user in a reflective,
weekly, progress-reviewing frame. It is the natural home for a photo moment — and
it is currently empty of one.

**Direction:** IF a photo record exists AND the user is unsuppressed, the
check-in shows a calm, easily-ignored "your photo record is here — earlier and
latest, whenever you want to look." **Surfacing, never prompting to capture.**
This is O5's **LOOP-2**, the lowest ED-risk mechanic: no cadence, no capture
nudge, no forced comparison — it only makes the *existing* record findable at a
moment the user is already reflecting.

**⚖︎ Founder fork (the loop decision):**
- **LOOP-2 (passive surface)** — my read of the evidence favours this as the
  safest core loop, but I present it as an option, not a decision. It closes the
  return-loop hole with essentially zero ED risk.
- **LOOP-3 (milestone-adjacent, opt-in)** — offer a photo moment when the user
  hits a *training/behaviour* win the app already celebrates (a PB, an N-session
  streak). Anchored to competence, never appearance. Higher emotional payoff,
  moderate risk — the framing is everything.
- **LOOP-1 (opt-in cadence reminder)** — O5 names this the **single highest-risk
  ED lever**; even opt-in, a recurring body-photo reminder can seed
  body-checking. **This must not be chosen by default.** If chosen at all:
  off-by-default, user-set, suppression-gated, never frequency-rewarded.
- **None** — accept the island; state the trade explicitly.

All four hold every lock (no streak, no cadence reward, fail-closed suppression,
never-leaves-device). I will not pre-decide this; it is a genuine safety call.

### Move 2 — Let the coach *know* the record exists (closes Gap 1 properly)
Beyond the check-in surface, the deterministic coach output can carry a passive,
read-only "see your photos" affordance **when the weekly recap is already
positive and unsuppressed** — never "you should take one." This is additive,
holds the no-AI/deterministic lock (it's a surfacing decision, not an engine
change), and turns the coach from silent-about-photos into aware-of-them.

**⚖︎ Founder fork:** build the coach affordance / check-in surface only / neither.

### Move 3 — Widen the data model additively (closes Gap 3)
Snapshot the goal + mesocycle-phase *label* at capture (device-local, never
synced — same posture as the weight snapshot). This is a small additive schema
change that unlocks future calm context ("your record across this block") without
committing to display it now.

**⚖︎ Founder fork:** snapshot goal/phase now / leave to display-time lookups / defer.

---

## The visual/polish layer (mechanical, in the roadmap)

Separate from the strategic moves, the surfaces need the component-system pass
(P1-4) and haptics (P1-5): the five modals import zero design-system components
(S4), the shutter is silent (O1-F2), three dialogs hand-roll chrome instead of
the shared `BottomSheet` (O5-F6), and the ghost-capture screen fakes its
safe-area inset (O1-F8). None of this is strategic — it is the same "make it one
material" work the whole app needs, concentrated here because this is where the
drift is worst.

---

## The backup question (a real founder decision)

O5 correctly flags that **no backup path** is the category's #1 churn driver
("app DELETED all my photos") and that reinstall silently loses everything. The
never-leaves-device lock forbids cloud sync, so the *only* on-brand answers are:
1. A user-initiated, user-controlled **local encrypted export + re-import**.
2. An honest one-time **"these are device-only and not backed up"** warning.
3. Accept silent loss (and state it plainly).

**⚖︎ This is a founder decision because it touches the never-leaves-device
posture.** I do not recommend a default. My only strong view: option 3 without
option 2 is the one outcome to avoid — silent catastrophic loss of the most
emotionally-valuable data is the opposite of the trust brand. At minimum, the
honest warning.

---

## What NOT to build (resist these)

O5 and the E1/E2 research corpus are clear, and I agree completely:
- **No transformation/before-after hype framing.** The compare copy-ban stays.
- **No streak on photos.** No "you've logged N weeks of photos" counter.
- **No AI body-scoring / body-fat-from-photo.** Ever.
- **No cloud upload, no coach/partner photo visibility** without an explicit,
  separate founder decision (it's a new off-device flow against the lock).
- **No cadence reward.** Frequency is never gamified.

The build already resists all of these. The elevation must not weaken that
resolve in the name of "engagement."

---

## Summary of forks for the founder

| Fork | Options | My honest read (not a decision) |
|------|---------|--------------------------------|
| The return loop | LOOP-2 / LOOP-3 / LOOP-1 / none | LOOP-2 is safest and closes the hole; LOOP-1 must not be a default |
| Coach awareness | check-in surface / coach affordance / both / neither | check-in surface is the highest-value, lowest-risk single move |
| Data model | snapshot goal+phase now / display-time / defer | additive snapshot is cheap and future-proofs context |
| Backup | local export / honest warning / accept loss | at minimum the honest warning; export is a bigger call |
| Visual pass | roadmap P1-4/P1-5/P2-4 | not a fork — this is the "one product" work, do it |

Direction, not decisions. The safety-sensitive forks (especially the loop) are
deliberately left open for the founder.

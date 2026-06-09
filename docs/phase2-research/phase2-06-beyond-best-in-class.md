# Phase 2.5 — Beyond Best-in-Class: Demonstrations 2.0, Training Partners 2.0, and Look & Feel

**Date:** 2026-06-09 · **Status:** proposal for sign-off. No code.
**Grounded in:** full app-systems map (coaching engine hooks, exercise metadata, swap engine, notifications), design-token + Train-page audit, and four research streams (teaching science & demo innovation, on-device form-check feasibility, accountability science, elite-tracker UI benchmarks). Builds on `phase2-05` (which got both features to parity); this is the plan to go past parity.

Evidence flags: **[STRONG]** peer-reviewed/multi-source · **[MOD]** good but limited · **[WEAK]** vendor/single-source (never load-bearing).

---

## 0. The thesis

Volyume already owns two assets no competitor has: a **deterministic coaching engine** with rich read-only state (fatigue, plateau+resolution, SFR "training payoff", subregions, mesocycle week, swap rankings with plain-English reasons) and a **privacy-first, offline-first architecture**. Every idea below turns one of those into user-visible magic. Nothing touches the engine (read-only hooks only), nothing adds an LLM, nothing leaks data, everything works offline.

The most important research finding, which reshapes the demonstrations feature:

> **The *Video Moves You* randomized field experiment (~4.5M user-exercise pairs): polished expert demo videos HELP experienced users and BACKFIRE for beginners** (threat-vs-challenge appraisal). **[MOD — single large study]**
> So the elite move is not "better video." It is **the right teaching for the right user at the right moment.** Nobody in the market does this.

---

## 1. Demonstrations 2.0 — "a coach, not a video library"

### 1.1 Confidence-graded demos (the headline differentiator)
The same exercise teaches differently depending on the user's logged history with it (derivable today: exerciseId ∉ historical sets = first time):
- **First-time / low-experience:** slow, segmented, **mistake-first** teaching ("most people get X wrong, here's the fix"), one cue at a time. Low-threat framing per the research.
- **Experienced (N successful sessions):** full-speed loop, multi-angle later, minimal text.
- A quiet **"graduated" marker** when a user is promoted — competence made visible. **[MOD]**

### 1.2 Contextual cueing — the engine picks THE one cue (rule-based, no LLM)
Replace static cue lists with a deterministic precedence over existing read-only hooks:
1. `detectPlateau()` fired with `resolution` → surface the technique/setup cue for breaking that stall ("No progress in 3 sessions. Try this setup fix…"), and when resolution = `swap_exercise`, the top `rankSwaps()` candidate with its plain-English reason.
2. High fatigue signal (`autoregulationMatrix` → reduce) → bracing/control cue, "leave a rep in the tank today".
3. First-time movement → teaching mode (1.1).
4. Otherwise → the default primary cue.

Plus **load-aware focus switching**: internal "feel the muscle" cues on hypertrophy-rep sets; external "drive the floor away" cues on heavy sets (attentional-focus research; deterministic on the rep range already prescribed). **[MOD]**

### 1.3 "Why your coach chose this" card
One line, deterministic, from metadata the app already holds: subregion (`getExerciseWhyThis()`), SFR as "training payoff: high", and the plan-balance context. Out-explains Fitbod's loved-but-shallow "freshest muscle" line. Zero new data needed.

### 1.4 Phase scrubber as the default demo format
Setup → execution → lockout markers on the loop; scrubbing snaps to a phase and pins that phase's single cue. Cheap, fully offline, the Caliber-validated framing, and it makes even the Phase-1 still-pair feel interactive (start/end ARE two phases). Tempo control (0.25–1×) when real clips land.

### 1.5 Muscle-activation overlay (pragmatic version)
Light up primary movers on the concentric phase and secondaries on the brace phase on the **existing body diagram**, driven by metadata — Muscle & Motion's most-loved idea without their 3D budget. Pairs with MoveKit's muscle-highlight variant clips if licensed.

### 1.6 Form Locker (Pro) — the privacy-first moat
Record a set; the video **never leaves the device**. Side-by-side/overlay compare with the reference demo; a private form-history library per lift ("my squat, Jan vs Jun"). **Measure, don't judge** — no correctness verdicts ever (liability + ED-safety). Later optional Pro layer: on-device pose metrics only (rep count, tempo, ROM, bar path) — feasible in Expo via config plugins (vision-camera + fast-tflite), no eject, fully offline. **[STRONG feasibility; verdict-free design is the safe one]**
This is the feature only an offline/no-PII app can ship credibly. Tonal charges hardware money for the cloud version.

### 1.7 Eyes-free mid-set support
Optionally speak the one contextual cue at set start (existing notification/audio infra; music ducking later). Glanceable > readable mid-set. Reduce-Motion already respected.

### Teaching-science guardrails
Don't front-load beginners with flawless expert clips; don't dump 169-tip walls; progressive disclosure across sessions; common-mistake-first for novel movements. **[MOD-STRONG]**

---

## 2. Training Partners 2.0 — "the only honest accountability app"

The audit confirmed the architecture is already correct (minimal server-authoritative signal, schema-enforced privacy). The science says the *mechanics* can be far stronger — and every upgrade below stays inside the existing "did you train + streak" data envelope. Key evidence: dyadic accountability works best with a **shared common goal** between peers (largest moderator, meta-analysis g≈0.20) **[STRONG]**; the **Köhler effect** (my showing up matters to us) **[STRONG, lab]**; missing one day does **not** impair habit formation (Lally) **[STRONG]**; comparison/surveillance is a documented harm for low-self-compassion users **[STRONG]** — validating the no-feed, no-leaderboard design.

### 2.1 Shared Weekly Pact
Partners commit to the **same** weekly target ("we both train 3×"). The circle's card shows the joint pact, not parallel stats. Directly operationalises the strongest evidence. Tiny schema addition (pact target on the circle), same privacy envelope.

### 2.2 Pod Streak — the chain belongs to the group
The streak is the **circle's**, not the individual's. One member's quiet week is absorbed (see 2.3) rather than resetting everyone. Removes the what-the-hell spiral while keeping Köhler indispensability. **This is the headline differentiator — nobody does it.**

### 2.3 Silent freeze + rest-counts-toward-the-streak
- ~2 silent freezes/quarter, applied automatically, discovered gently afterwards (Duolingo's "bend, not break"). Never a "you broke it" moment. **[MOD, first-party data]**
- A **deload week suggested by the coach counts as a kept week** (the engine knows: `deloadSuggested`). Rest is training — Gentler Streak's most-loved principle, and uniquely credible here because Volyume's own coach prescribed the rest.

### 2.4 Plan Ping (implementation intentions, done right)
On joining a pact, each member states when they'll train ("Mon/Wed/Fri"). Partners can send the existing emoji nudge **tied to the plan** ("👊 still on for Thursday?") — planning + reinforcement is what makes implementation intentions actually work (d≈0.25 with reinforcement, ~0 without). **[STRONG]** No new shared data: the nudge already exists; only the user's own stated days are stored.

### 2.5 Kind-status language + reframe-the-slip
Partners see warm status words ("Showing up", "Resting well", "Back this week 🎉"), never raw gaps. After a missed week, the user privately gets a one-tap "fresh week" reset (self-compassion buffers the abstinence-violation effect **[MOD]**); the partner only ever sees the return, never the absence.

### 2.6 Async body-doubling (lightweight)
Opt-in "in a session right now" presence dot for your circle — shared presence, zero metrics. The under-used Focusmate mechanic, strippable to a single boolean.

### Anti-patterns (hard rules, ED-safety)
No leaderboards/rankings, no public feed, no daily must-move streaks, no money/punishment stakes, no quantified partner comparison (load/volume/PRs), no shame moments, no nagging. All validated by the harm research. **[STRONG]**

---

## 3. Look & Feel — "tighter, faster, more premium"

The audit quantified the founder's instinct; the benchmarks confirm the fix. The pattern across Strong/Hevy/Whoop/Apple: **one hero element per screen, everything else compact rows; hierarchy via weight and opacity, not size; density on tool screens.**

### 3.1 The type-scale pass (fixes "sizing feels big")
- Reserve >28px for **at most one hero number per screen**. Hero workout title: 24px → **20px semibold** (h3); differentiate with weight, not size.
- Body 16 is right; push hierarchy into **opacity steps** (100% / ~65% / ~40%) instead of size jumps.
- Numerals: 17px semibold tabular; labels 13px at ~60% opacity.

### 3.2 Density pass (the ~240px giveback)
- Default section gap 16px → **12px**; card padding 16px → **12–14px**; cut the stacked-banner zone to **one slot** (highest-priority banner only, others queue).
- SetEntry steppers 52px → **48px** (still ≥ touch minimum); whole-cell tap targets reconcile thumbs with density.
- Active-workout header: fold muscle line + "How to perform" into one compact row under the name → target ≤80px before the first input (from 100–120px).

### 3.3 Train screen restructure (≤2 taps to training)
- Today's/next workout = the **single dominant object**, Start button visible without scrolling, every time.
- **Make the intent prompt skippable-by-default** (remember last choice; one-tap confirm) — it currently taxes *every* session start.
- Last session, weight, steps, cardio → compact rows below the hero, not co-equal cards.
- Later: home-screen widget / app shortcut for "Start next workout" (Hevy's loved re-engagement surface).

### 3.4 Logging table option (the Strong/Hevy lever)
Evaluate converting set logging to the compact table idiom (SET | PREVIOUS | KG | REPS | ✓) with previous-set ghost autofill — the single most-praised pattern in the category. Bigger change; prototype behind a branch and judge on-device.

### 3.5 Amber discipline + surfaces
#F5A623 only for: the primary action, the active rest timer, "this set now". Everything else greyscale opacity. Flat cards = surface tone + hairline only inside tables; fewer bordered containers. (The token system already supports all of this — it's usage discipline, not re-architecture.)

---

## 4. Prioritised roadmap

**Wave 1 — high impact, low risk (no new deps):**
1. Type + density pass (3.1, 3.2) and intent-prompt streamlining (3.3) — the app instantly feels tighter.
2. Contextual cueing + "why your coach chose this" (1.2, 1.3) — engine hooks exist today.
3. Shared Weekly Pact + kind statuses + rest-counts (2.1, 2.3-part, 2.5).
4. Phase framing on the existing demo loop (1.4-lite: start/end = two labelled phases with pinned cues).

**Wave 2 — differentiators:**
5. Confidence-graded demos (1.1) + premium clips (MoveKit sample-gated, per phase2-05).
6. Pod Streak + silent freezes (2.2, 2.3) — small migration.
7. Train-screen restructure + logging-table prototype (3.3, 3.4).
8. Muscle-activation overlay (1.5).

**Wave 3 — moats:**
9. Form Locker record-and-compare (1.6, Pro) — then optional on-device pose *metrics*.
10. Plan Ping + body-doubling presence (2.4, 2.6).
11. Eyes-free audio cue + widgets (1.7, 3.3-later).

---

## 5. Open decisions
1. Approve Wave 1 as scoped? (All read-only engine hooks, token changes, one small pact field.)
2. Logging-table conversion (3.4): prototype now or after Wave 1 ships?
3. Form Locker: confirm Pro-gating and "measure, don't judge" as a hard product rule.
4. Pod Streak naming/copy (British English, non-shaming) — founder pass wanted.
5. Audio cues: in or out of scope for now?

*Companion docs: `phase2-05-best-in-class-proposal.md` (parity plan, media sourcing), research transcripts for all seven streams.*

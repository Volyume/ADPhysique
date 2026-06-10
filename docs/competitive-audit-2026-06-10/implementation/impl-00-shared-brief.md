# Implementation Research Charter — shared brief for all 27 blueprint agents

> Round 2 of the 2026-06-10 audit. Round 1 decided WHAT to build
> (founder-approved list in `../competitive-audit-04-final-action-list.md`).
> Round 2 decides HOW — one agent per approved action, each producing an
> implementation blueprint that makes its feature the best in the market
> **and** makes the whole app feel more streamlined, not busier.

## The founder's standard (verbatim intent)

Research and very carefully consider how to do each of these to enhance
not just the individual component but the entire package as a whole — all
in one, streamlined, easy to use and understand, readily available.
Consider user psychology: what works best for users, what they will love,
what entices retention and positive word of mouth.

**The cautionary example:** a friends-matching/progress-sharing system was
proposed and was imagined hidden away in Settings — where it would have
had zero real positive impact. The lesson binds every blueprint:
**placement is the product.** A feature that lives in the wrong place, or
adds a parallel surface instead of joining an existing one, fails even if
its internals are perfect. Every blueprint must say exactly where its
feature lives, what it joins or replaces, and why a user will meet it at
the right moment without being interrupted at the wrong one.

## Hard constraints (locked — never propose violations)

1. Coaching engine is deterministic. No LLM, no AI, no randomness.
2. Never move an existing free feature behind Pro (round 1 evidence:
   feature re-gating is the category's cardinal sin).
3. ED safety system untouchable: floors, thresholds, signposting,
   calmer-mode suppression. Anything emotional (streaks, recaps,
   celebrations) must state how it behaves when wellbeing/ED flags are open.
4. Offline-first. Every feature works with no connection; Supabase is a
   sync target via the sync layer only. No streaming-dependent content.
5. No PII to external services. EU data residency.
6. Expo managed workflow, no eject; native via config plugins only.
7. British English; voice rules: plain, terse, honest, no jargon
   (MEV/MRV/RIR banned in user copy), no em dashes, no hype, no shame.
8. Numerals are the hero (tabular figures); dark theme tokens in
   `src/styles/theme.js`; 44pt touch-target floor; the workout-screen
   redesign's do-not-regress list applies to anything touching the session.

## The app's surface map (where things can live)

Five tabs: **Train** (HomeScreen: greeting → priority banner →
weight/steps/cardio strip → session hero card → last session), **Plans**
(PlansScreen, PlanLibrary, PlanDetail, RoutineDetail, builders),
**Diary** (Pro: date pager → macro rings → meal cards → water; FAB scan),
**Progress** (insight stack → recent sessions → volume strip → PR
sparkline → Explore tiles: Consistency/Lifts/Weight/History/Year of
Lifts), **You** (profile, coaching shortcuts, 10 settings sub-pages).
Cross-cutting: WorkoutSummary (post-session), WeeklyCheckIn →
CoachOutput (the weekly ritual), notifications (morning weight, check-in,
coach-ready, trial gates, training reminders), ShareCard pipeline,
Paywall/ProUpgrade/CascadeGate. The session screen (ActiveWorkoutScreen)
is sacred ground: nothing new lands on it unless the blueprint is FOR it.

**Streamlining rule:** prefer enriching an existing surface over adding a
new one. If a new screen is genuinely required, name the tile/row it
enters through and what (if anything) it retires. The audit found Home
already stacks three utility cards above the hero — do not make this
worse; proposals touching Home must state their interaction with
COMP-027's "one big thing" hierarchy fix.

## Evidence base you must use (in-repo, already cited)

- `../competitive-audit-00-volyume-baseline.md` — current-state ground truth
- `../competitive-audit-00-workout-screen-deep-audit.md` — session screen measurements
- `../competitive-audit-03-master-proposals.md` — your action's approved spec seed
- `../competitive-audit-01-*-research.md` — round-1 competitor research for your area (extend, don't repeat)
- The source code itself — read the files named in your tasking; verify
  every integration claim against code, not the docs.

## Psychology lenses every blueprint must apply

- **Moment of need:** at what trigger does the user want this? Meet them
  there; never make them hunt. (Whoop/Oura "one big thing"; Fitbod's
  ignorable-but-present pattern.)
- **Habit loop:** cue → action → reward. What's the cue? What's the
  visible reward within seconds? (Round 1: perceived adaptivity earns the
  "elite" label; invisible logic reads as random.)
- **Effort budget:** taps and reading cost; what the feature REMOVES from
  the user's plate, not just adds. (>30s food logging = 43% lower
  retention; short surveys get completed.)
- **Emotional safety:** no red numbers, no shame states, rest-positive.
- **Word-of-mouth surface:** what would a user screenshot or tell a gym
  friend? (Recaps, "it refused to cut my calories", "it knew I was
  stalling".) Name the shareable/tellable moment if one exists.
- **Trust mechanics:** show working, explain holds, never silently change
  anything (per-row Apply is the house pattern).

## Required blueprint structure (every agent, same skeleton)

1. **Best-in-market bar** — the 3–5 best implementations of this exact
   function anywhere (cited); what makes each work; the single best.
2. **What fails** — implementations that flopped and why (cited user
   sentiment); anti-patterns to avoid by name.
3. **User psychology** — the lenses above applied to THIS feature.
4. **The Volyume implementation** — exact placement (screen, position,
   what it joins/replaces), interaction spec (states, empty states, edge
   cases, offline behaviour), copy direction with 2–3 example strings in
   the house voice, accessibility notes.
5. **Whole-package integration** — how it strengthens adjacent features;
   duplication it must avoid; effect on the streamlining goal; behaviour
   under ED/wellbeing flags if applicable.
6. **Retention & word-of-mouth mechanics** — the specific loop this
   feeds.
7. **Beating the benchmark** — in one paragraph: why this design is
   better than the best-in-market bar, not merely equal.
8. **Measurement** — 2–4 metrics that prove it worked (existing telemetry
   allowlist preferred).
9. **Build notes** — files/components/db touched, reuse opportunities,
   effort sanity-check vs the approved score, risks.

## Output rules

- Write to `docs/competitive-audit-2026-06-10/implementation/impl-<ID>-<slug>.md`.
- Cite every external claim (URL or named source + date). Flag
  search-extract-only evidence where direct fetches are blocked.
- Research the web hard (WebSearch/WebFetch): App Store/Play reviews,
  Reddit via aggregators, teardowns (Growth.design, Mobbin write-ups,
  RevenueCat/Adapty data), and the named competitors for your area.
- Do not modify any code. Blueprints only.
- Return to the orchestrator a summary ≤450 words: placement decision,
  the single best reference, the 3 most load-bearing design choices, the
  one thing that would make this fail, effort sanity-check.

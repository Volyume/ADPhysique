# Competitive Audit 2026-06-10 — Final Action List (founder-approved)

> Built from the founder's yes/no decisions on all 30 audit proposals,
> 2026-06-10. 26 approved, 2 rejected, 2 replaced by a new research
> action. Ordering: phases by priority score and dependency, not by
> the order asked. Full specs for every item live in
> `competitive-audit-03-master-proposals.md` (and the workout-screen
> proposal doc for ACTION 4).
>
> Standing rules that bind every item: no LLM/AI in coaching; never
> gate an existing free feature behind Pro; never touch the safety
> systems' thresholds; offline-first; British English voice; all work
> on phase2/development or feature/* branches, never main.

---

## PHASE A — Quick wins (ship first, days not weeks)

| # | ID | Action | Score |
|---|----|--------|-------|
| 1 | COMP-003 | **Quick-add kcal/macros** in every meal slot (the "imperfect day" escape hatch; QuickAddSheet shell exists) | 7.0 |
| 2 | COMP-011 | **Cardio "already counted" explainer line** under the kcal estimate on LogCardio + CardioPlanCard + NutritionEducation | 6.0 |
| 3 | COMP-012 | **Trust row marketing** — "Works fully offline · Your data exports anytime · No ads, no trackers" on Welcome + both store listings | 6.0 |

## PHASE B — Tier 1 core (the 90-day backbone)

| # | ID | Action | Score |
|---|----|--------|-------|
| 4 | COMP-001 | **Workout screen redesign** — beat line at 16pt tap-to-apply, chip stack removed, action row 5→2 with ⋯ overflow, logged sets above the fold, rest timer −15/+15/Skip, 13pt interactive floor. Full spec: `competitive-audit-01-workout-screen-proposal.md`. Do-not-regress list applies. | mandate |
| 5 | COMP-006 | **Publish the methodology** — "How Precision Coaching decides" page + in-app receipts on coach cards + the identity line "Every change has a reason. Every non-change has a reason too." | 4.0 |
| 6 | COMP-007 | **Paywall social proof + annual-first** — verified store-review excerpts on the paywall; annual presented first with savings badge. Dependency: collect reviews via the existing prompt first. | 4.0 |
| 7 | COMP-002 | **Meal-slot memory** — per-slot food ranking with last-used portion pre-filled, "Add again" rows | 4.0 |
| 8 | COMP-004 | **Daily trend surface** — always-visible "Your trend" card (EWMA vs goal band + maintenance estimate + one plain-English line); hides rate when an ED flag is open | 3.6 |
| 9 | COMP-005 | **Free Monthly Recap + block-end recap** — story format via the existing Year-of-Lifts renderer + ShareCard pipeline; unlocks after ~10 workouts; free forever | 3.6 |
| 10 | COMP-008 | **Survey diet** — post-workout 7→3 questions (energy/sleep/soreness-coming-in move to the pre-workout prompt) + one-tap Fast Check-In when all derived values are green | 3.5 |
| 11 | COMP-009 | **Data-loss guards** — auto-snapshot SQLite before every migration (restore surface in Settings) + sign-in merge/switch step on different-account detection | 3.5 |
| 12 | COMP-010 | **Visible periodisation** — block-shape visual (week dots + effort labels + "recovery week in 2") on Home meso chip tap-through and PlanDetail | 3.5 |
| 13 | COMP-013 | **Plan reveal moment** — honest staged "Building your plan" sequence + 15-minute starter-session option as the first action after the reveal | 3.5 |
| 14 | COMP-022 | **Barcode-miss chain** — scan → "Scan the label instead" → prefilled custom food carrying the barcode (self-healing misses) | 3.0 |
| 15 | COMP-023 | **Day-3 trial moment** — notification + Home line making countdown-to-first-coaching-review explicit | 3.0 |

## PHASE C — Bigger builds (Tier 2, start after Phase B is moving)

| # | ID | Action | Notes |
|---|----|--------|-------|
| 16 | **NEW-001** | **Deep research: exercise demonstration solutions** — replaces COMP-014/COMP-028 per founder direction. Founder verdict: photos/licensed loops not convincing, no self-filmed content. Research brief: the full solution space (licensed video libraries with offline terms, 3D/rigged animation systems and their licensing, procedural/skeletal animation, illustration systems, hybrid approaches), per-solution costs, offline-first compatibility, bundle-size impact, licensing terms, and what the evidence says users actually engage with — ending in a concrete recommendation. **Gate: no media work starts until this research is done and approved.** | research first |
| 17 | COMP-015 | **Visible per-muscle autoregulation** — "Rear delts still sore Tuesday → one set fewer today", deterministic, clamped, every adjustment carries a reason. Founder review of coaching copy before ship. | I9/E7 |
| 18 | COMP-016 | **Verified UK food layer** — hand-verified top UK SKUs + chains, badged, ranked above OFF; quarterly refresh. Standing data-ops programme; start with the top 1k by logging frequency. | I9/E7 |
| 19 | COMP-019 | **Interactive charts → widgets → Live Activity** — staged: Skia chart windows with recomputed takeaway first, scrubbing second, widgets third, fixed rest-timer Live Activity last | I8/E7 |
| 20 | COMP-018 | **Shame-free weekly consistency streak** — rest-aware, pause + repair, suppressed under wellbeing/ED flags; feeds the monthly recap | I8/E4 |
| 21 | COMP-020 | **Apple Watch companion** (then Wear OS) — remote control for the live session: exercise, target, previous, log set, rest haptics. Starts only after COMP-001 ships (the phone screen is the spec). Expo config-plugin route, no eject. | I8/E8 |
| 21b | **NEW-002** | **Training Partners** — added by founder 2026-06-10 (supersedes the COMP-017 rejection; the rejected version was passive/one-directional and imagined buried in Settings). Approved design basis: Apple-Activity-Sharing-style chosen private circle on derived signals only; (a) rate-limited one-tap partner cheer (~1/partner/day, push "Sam sent you a cheer"); (b) optional SHARED consistency streak counted in training weeks with a deload/"resting" forgiveness state that never reads as broken; (c) plain-English privacy receipt on the invite sheet. Explicit anti-features: no leaderboards, no raw-metric comparison, no stakes, no punitive shared consequences, no feed. Evidence base: 83-study meta-analysis (55,440 participants) tying online social comparison to body-image/ED symptoms — hence derived-signals-only; Strava kudos' peer-reviewed activity lift; Future's scheduled check-ins ~95% goal-completion; Duolingo shared streaks with forgiveness → +D14 retention. Founder scores: I7/E3. Coordinates with COMP-018 (solo streak is the foundation). | I7/E3 |

## PHASE D — Longer term + items needing explicit sign-off before build

| # | ID | Action | Gate |
|---|----|--------|------|
| 22 | COMP-030 | **Quiz-before-account onboarding** — profile/goal steps first (held locally), account at "save your plan", Article 9 consent at first health-data collection | **Founder + legal/DPO approval required before any work** (touches two locked decisions) |
| 23 | COMP-024 | **Cycle-robust trend smoothing** (automatic, no tracking; manual flag stays as override) | Founder review — coach maths |
| 24 | COMP-026 | **Step-informed TDEE confidence** (deterministic damping input, never a kcal value); ships behind the COMP-004 surface | Founder review — coach maths |
| 25 | COMP-027 | **Semantic colour grammar + Home hierarchy** — 3-state ahead/on-track/behind vocabulary; collapse weight/steps/cardio into one strip so the session hero is first | Colour-blind-safe variants required |
| 26 | COMP-025 | **Cancellation-reason capture + 30-day win-back** notification with a data recap | — |
| 27 | COMP-029 | **Token-derived light theme** (opt-in, LCH-derived from existing tokens) | Founder brand decision confirmed YES 2026-06-10; sequence last in D |

## REJECTED (decided 2026-06-10 — do not resurrect without new instruction)

- **COMP-021 Plate calculator wiring** — no.
- **COMP-017 Training Partner / Coach View (passive version)** — rejected 2026-06-10, then SUPERSEDED by NEW-002 Training Partners (active, reciprocal, Apple-Activity-Sharing-pattern) added by the founder later the same day. The rejection of the passive/buried-in-Settings shape stands; the active shape proceeds to blueprint research.
- **COMP-014 / COMP-028 (photos, licensed loops, self-filming)** — replaced by NEW-001 research; founder explicitly rules out self-filmed content and is unconvinced by photos/loops.

## Dependency notes

- COMP-007 needs real testimonials → start the review-collection prompt immediately even though the paywall change comes later.
- COMP-020 (watch) depends on COMP-001 (screen redesign) being final.
- COMP-026 ships only behind COMP-004's surface so the confidence change is visible and explained.
- NEW-001 gates all exercise-media work.
- COMP-030 gates on legal/DPO review — schedule the review now, the build later.

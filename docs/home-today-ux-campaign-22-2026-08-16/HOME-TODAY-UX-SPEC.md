# HOME / TODAY — UX SPECIFICATION (Campaign 22, Screen 1, Phase 1)

- Date: 2026-08-16. Baseline audited: `origin/main` at `624cf126` (verified; no
  production code touched in this phase).
- Evidence base (same folder): `STATE-INVENTORY.md` (21 sections, 47 state
  axes, ~120 strings, ~65 actions), `STATE-MATRIX-AND-DENSITY.md` (18 material
  states S0–S18, 4 collisions, 7 duplication findings, density estimates
  marked for device confirmation), plus a hands-on lead read of the full
  render tree (`HomeScreen.js:1840–2610`).
- Interpretation law honoured throughout: every judgement below cites the
  exact defect it addresses; no founder complaint is generalised into a
  product law, and nothing removed by the Today truth repair is restored or
  defended by default — the screen's job decides.

---

## 1. EXECUTIVE VERDICT

Home has an excellent heart and a crowded doorway.

**What is right.** The hero card is genuinely good product: one session name,
an honest readiness line, one primary Start, options and a quiet skip in their
correct ranks. The one-banner cap (D14) exists and works for the five banners
it governs. The no-plan branches are coherent per tier. Safety suppression is
correctly wired throughout. The screen already believes in "hero first" — the
comments show repeated moves in that direction.

**What is wrong, as a complete screen:**

1. **The primary action does not own the doorway.** Above or around the hero
   can stack: one attention banner (of five idioms), `RecoveryStateCard`
   (outside the banner cap), `TodayStrip`, and the welcome card. On the
   densest measured state (recovery week) the athlete's next action starts an
   estimated 400+dp down, and the last-session row falls at or past a 700dp
   fold [device confirmation needed].
2. **Three coaching voices, three visual idioms, wrong ranks.** The coach
   decision speaks as a top banner; the coach brief speaks as a card nested
   inside the hero (card-in-card); the weekly check-in — the single most
   consequential Pro weekly action — speaks as a nudge at the very bottom,
   below the last-session row. On check-in day the trial banner vacates the
   top slot while the check-in message renders at the bottom: the screen
   demotes exactly the thing it should promote (STATE-MATRIX collision 3).
3. **Recovery state speaks in up to four places at once** (deload banner,
   RecoveryStateCard, hero eyebrow, readiness chip) — and during an adaptive
   recovery reduction two of them **contradict each other in the same render**
   (`readinessSummary.js:80-85` vs `recoveryState.js:185-201`).
4. **Evidence collection outranks action.** TodayStrip (morning weight) sits
   above the hero with daily explanatory copy, so on an ordinary Pro morning
   the first interactive element is a data-entry field, not the session.
5. **Status idioms multiply.** Five banner styles + nudge + strip + welcome +
   teaser + recovery card ≈ ten distinct container treatments on one screen —
   the "dashboard of cards" the vision forbids, even though each element
   individually earned its place at some point.

None of this is an engine problem. It is rank, idiom and slot discipline.
Verdict at §25.

---

## 2. CURRENT PRODUCTION MAP

Authoritative element-by-element map: `STATE-INVENTORY.md` §1 (21 sections,
verbatim gating, testIDs, per-element actions/dismissals/persistence). Summary
of the render order at `624cf126` (HomeScreen.js:1840–2475):

| # | Element | Idiom | Tier | Slot behaviour |
|---|---------|-------|------|----------------|
| 1 | ScreenHeader "Today" + greeting | header | all | always |
| 2 | Coach decision banner | banner (primary tint) | pro | banner cap, rank 1, dismiss/week |
| 3 | Trial AttentionCard | card | trial | banner cap, rank 2, variants S0-S3 |
| 4 | Deload suggestion banner | banner | pro | banner cap, rank 3, dismiss/session |
| 5 | Nutrition phase banner | banner | pro | banner cap, rank 4 |
| 6 | Plateau banner | banner | all | banner cap, rank 5 |
| 7 | RecoveryStateCard | collapsible card | all | OUTSIDE the cap; stacks with any banner |
| 8 | Activation banner | banner | all | banner cap, rank 6 |
| 9 | Free AttentionCard (free-line/differential) | card | free | banner cap, rank 7 |
| 10 | Skeletons | — | all | cold load only |
| 11 | TodayStrip (morning weight) | strip card | pro | always above hero |
| 12 | HomeWelcomeCard | card | all | totalSessions===0, dismissible |
| 13 | HERO: continue / planned session / no-plan | elevated card | all | the primary action |
| 13a | └ readiness chip (in hero) | chip | all | when summary exists |
| 13b | └ CoachBriefCard (in hero) | card-in-card | pro | when brief exists |
| 13c | └ skip link (in hero) | text link | all | outstanding required session only |
| 14 | No-plan: EmptyState + glance card + quick-start | cards | per tier | no-plan branch |
| 15 | HomeProTeaserCard | card | free ≥3 sessions | below hero |
| 16 | HomeLastSessionCard | slim row | all | when history exists |
| 17 | Check-in nudge | nudge card | pro | BOTTOM of screen, check-in day |
| 18–21 | Sheets: block shape, change workout, intent prompt (+ re-entry overlay) | bottom sheets | — | on demand |

## 3. STATE MATRIX

Authoritative: `STATE-MATRIX-AND-DENSITY.md` Part 1 — 18 material states with
render lists and collapse proofs. The states that drive this spec's decisions:

- **S-normal-pro** (established Pro, plan ready, nothing changed): header →
  TodayStrip → hero → last-session. Already close to right; the strip-first
  order is the main issue.
- **S-recovery** (planned recovery week): densest state — banner-capped winner
  + RecoveryStateCard + strip + hero-with-recovery-eyebrow + readiness chip.
  Four restatements, one measured contradiction.
- **S-checkin-day** (Pro, review ready): coach banner or nudge inversion —
  the day's most consequential action renders lowest.
- **S-new-user** (day 0): trial S3 card + strip (pro trial) + welcome + hero =
  four instruction surfaces before the first Start.
- **S-free-established**: hero + teaser + last-session + attention slot — the
  most coherent state today.
- **S-active-workout**: continue card wins the hero slot; banners still stack
  above it (collision 1 — a resume action should outrank every banner).
- **S-block-complete / S-re-entry**: decision states currently expressed
  through mixed idioms (card + overlay).

## 4. ABOVE-THE-FOLD / DENSITY ANALYSIS

From `STATE-MATRIX-AND-DENSITY.md` Part 2 (all dp estimates
[device confirmation needed]):

- S-normal-pro: header ~90dp, strip ~64-100dp, hero ~240-300dp → primary
  action lands ~400dp down; acceptable but strip-first costs the hero the
  opening glance.
- S-recovery: banner ~80dp + recovery card expanded ~140dp + strip + hero →
  Start estimated ~560-640dp down; last-session at/past a 700dp fold.
- S-new-user: trial card ~120dp + strip + welcome ~150dp + hero → Start
  ~500dp+ down on day 0 — the day the first Start matters most.
- Container counts above the fold (S-recovery): 4-5 bordered containers, 3
  competing accent colours, 2 chevron affordances, 2 dismiss crosses.

## 5. CURRENT INFORMATION HIERARCHY (what the screen prioritises today)

Reading the render order as a statement of priority: **exceptions first,
marketing second, evidence third, orientation fourth, action fifth, history
sixth, the weekly coaching loop last.** That order is defensible for a
dashboard; it is wrong for "make the next useful thing obvious". The screen's
own comment history (hero-first reorders, banner cap, card retirements) shows
it has been converging on the right order without ever declaring one.

## 6. TARGET INFORMATION HIERARCHY

- **P0 — CURRENT ACTION.** Resume in-progress > start today's session (incl.
  recovery-week session) > resolve no-plan. Owns the doorway in every state.
  Nothing outranks a resumable workout, including every banner.
- **P1 — MATERIAL EXCEPTION / CHANGE (one slot, one idiom).** Exactly one of:
  block-complete decision needed; coach decision to review; weekly check-in
  due; recovery adjustment changing today's training; re-entry question;
  nutrition-phase mismatch; trial ENDING (payment action genuinely required).
  Rendered in ONE consistent visual idiom directly beneath the hero header
  region — never five styles, never stacked.
- **P2 — TODAY'S EVIDENCE ACTION.** Morning weight one-tap (Pro), quiet when
  logged; first-review readiness line while pre-first-review (see §9).
- **P3 — OPTIONAL CONTEXT.** Last session slim row; free teaser; plateau
  observation; activation nudge; block-shape via the readiness chip.
- **P4 — REMOVE / REHOME.** Everyday trial presence (rehome to Profile/You
  except when ending); duplicate recovery restatements (merge); welcome card
  beyond the first session (already gated — keep gate); "progress at a
  glance" (rehome into the last-session row's no-plan variant).

## 7. DUPLICATION FINDINGS

From `STATE-MATRIX-AND-DENSITY.md` Part 3, classified (the lead's judgement):

| Duplication | Classification | Ruling |
|-------------|----------------|--------|
| Recovery state 3-way (banner + card + eyebrow) + chip | **NOISE** (and one genuine contradiction) | One voice per state: P1 slot carries the change; the hero eyebrow carries a two-word context tag; the chip defers to the card's wording source (§8, copy contract) |
| Last-session evidence 3-way (Free no-plan) | **NOISE** | One surface: the slim row; glance card folds into it |
| Plan/block position 2-way (hero eyebrow "N of M" pair) | **NOISE** — the code's own comments flag confusability | One counter in the eyebrow; the second moves into the block-shape sheet |
| Check-in message top/bottom inversion | **NOISE** (rank error, not repetition) | Check-in due lives in P1; nothing renders at the bottom |
| Deload banner vs RecoveryStateCard | Sequenced, not simultaneous — **USEFUL REINFORCEMENT** across moments | Keep the sequence, unify the idiom |
| Weight surfaces (tier-exclusive) | Non-collision | No change |
| Workout status header/card/button | **USEFUL REINFORCEMENT** (label, identity, action are different jobs) | Keep |

---

## 8. COACHING / INTELLIGENCE PRESENTATION FINDINGS

The four jobs (brief §6) are currently blended:

- **A. ACTION** lives correctly in the hero — keep.
- **B. MATERIAL CHANGE** lives in the coach banner (good content, wrong idiom
  crowd) AND implicitly in CoachBriefCard — split incorrectly.
- **C. EVIDENCE / WHY** correctly lives OFF Home (CoachOutputScreen owns the
  receipt) — the banner's "Tap to see why" is the right pattern: Home states
  the change, the tap answers why. Keep this contract.
- **D. DATA READINESS** currently has NO Home expression at all (post-repair),
  while the You tab and CoachOutputScreen carry it. §9 rules on this.

Target separation: **the P1 slot carries B (one sentence, one tap to C); the
hero carries A; P2 carries D when and only when actionable.** CoachBriefCard's
content (today's session-relevant coaching note) is A-context, not B — it
merges into the hero as one quiet line under the readiness chip, ending the
card-in-card.

**Copy contradiction fix (measured defect):** during an adaptive recovery
reduction the chip says the block is in normal training while the card says
training is eased (`readinessSummary.js:80-85` vs `recoveryState.js:185-201`).
Copy contract: both surfaces must derive their recovery wording from the SAME
resolved state (`gatedRecoveryState`), never from parallel derivations.

## 9. FIRST-REVIEW / INSUFFICIENT-EVIDENCE RULING

Audit of the current journey (post-ledger-removal): a pre-first-review Pro
athlete sees NOTHING on Home about review readiness; the answer lives two
taps away (You tab / CoachOutputScreen hold receipt). The trial S-variants
partially fill the gap with marketing copy — the wrong voice for a data
question.

**Ruling: Home earns a single, honest, self-retiring readiness line** in the
P2 slot, Pro pre-first-review only:

- Content pattern: "First review: [N] more morning weigh-ins" / "First review
  ready [day]" — real denominators from the ledger's actual gates, never
  `Math.min` clamping (the exact defect the founder named: 3–7 mornings all
  reading "3 of 3"), never displayed after the gate is met, one tap to the
  You-tab readiness surface.
- This is a REDESIGN of the concept the repair removed, not a restore: no
  "What your coach is reading" heading, no permanent presence, no achieved
  thresholds on display, no mixed denominators. It answers the brief's D-job
  ("do I need to log anything before a reliable review?") exactly when that
  question is live, then leaves the screen forever.
- Because it re-enters territory the founder ordered removed, it is
  founder-gated: **Ruling R2 (§24)** with my recommendation to adopt.

## 10. ESTABLISHED-USER COACHING RULING

- **Nothing changed:** Home shows header → hero → weight row → last session.
  No coaching surface at all. NO CHANGE IS A VALID INTELLIGENT RESULT — the
  calm screen IS the intelligence signal. No filler line.
- **Meaningful adjustment happened:** one P1 line ("Calories adjusted to
  2,350 kcal. See why.") — the existing banner's content in the unified idiom.
- **Recovery changed today's training:** one P1 line; the hero eyebrow gains
  the two-word tag; the session itself already reflects the change (engine).
- **Programme decision pending (block complete):** P1 becomes the decision
  entry ("Block complete. Choose what's next.") and the hero's action adapts
  (Campaign 21 pinned semantics unchanged).
- **Important evidence, no action:** stays OFF Home (Progress/You own it) —
  plateau observation is the one exception, P3, dismissible, training-only.

## 11. MORNING-WEIGHT RULING

Role: evidence collection — easy, quick, never dominant.

- **Position: below the hero** (P2), not above. The session is the reason the
  athlete opened the app; the weigh-in is a ten-second favour they do the
  coach. [Reverses the COMP-027 Part B strip-above-hero order → founder
  Ruling R1, §24.]
- **Not logged:** one row — label, yesterday's value ghost, one-tap log, done.
  The explanatory sentence ("Before food, after the bathroom…") shows only
  until the FIRST ever log, then retires permanently (currently daily copy).
- **Logged:** the row collapses to a quiet confirmation + trend glance tap.
  No second state, no card.
- The repaired alignment fix is untouched. One-tap logging is preserved
  exactly (`handleLogWeight` path, OB-8 deep-link contract included).

## 12. WORKOUT-ACTION RULING

- **Resume in-progress outranks everything** — including every banner and the
  P1 slot (collision 1 fix: banners render BELOW the continue card, or not at
  all while a workout is live — recommended: not at all except safety).
- Start planned session: hero as today, minus the inner CoachBriefCard
  (merged to a line), minus the second counter (§7).
- Recovery-week session: same hero, eyebrow tag + P1 line carry the state —
  the session action never changes idiom because the week is special.
- No plan: the EmptyState branches stand (already coherent); glance card
  folds into the last-session row.
- Skip stays a quiet text link, exactly as pinned (C18 semantics untouched).
- Block complete: hero action becomes the decision entry; no auto-activation
  (Campaign 21 law).
- Programme semantics, session-sequencing, order-as-guidance: untouched.

## 13. BANNER / ATTENTION PRIORITY CONTRACT

**One P1 slot. One idiom. One occupant. Ranked:**

1. Safety-consequential state (fail-closed surfaces; never suppressed by
   anything junior)
2. Block-complete decision needed
3. Coach decision to review (this week's, undismissed)
4. Weekly check-in due (promoted from the bottom; retires the nudge card)
5. Recovery adjustment / deload suggestion affecting today
6. Re-entry question (currently an overlay — becomes the P1 occupant when due)
7. Nutrition-phase mismatch
8. Trial ENDING with genuine payment action (see §14)
9. Plateau observation (P3 if slot occupied)
10. Activation nudge (P3; only when no P1 occupant)

Everything else waits. Dismissal semantics preserved per element. Marketing
never occupies P1 while any athlete-utility item is eligible. RecoveryStateCard
JOINS this contract (it currently sits outside the cap — collision 2).
Free-line/differential AttentionCards render only in the free footer region
(P3), never above the hero.

## 14. FREE / TRIAL / PRO RULING

- **Free:** hero-first identical to Pro; teaser stays post-3-sessions, P3,
  below last-session; differential/free-line stay in the P3 footer. Free must
  read as a complete product — it currently nearly does; the footer discipline
  finishes it.
- **Trial:** the everyday trial card REHOMES off the P1 stack: days 0–13
  trial state lives in Profile/You (and the existing check-in surfaces).
  Trial ENDING (last 48h / expiry with action) earns P1 rank 8. The S3
  zero-history variant's job ("one session starts your first review")
  transfers to the welcome card's second step — which already says it. This
  demotes marketing without hiding the commercial moment. [Founder Ruling
  R3, §24 — monetisation surface placement.]
- **Pro:** never "more cards" — Pro gains the weight row, the P1 coaching
  line when material, and nothing else the tier laws don't already grant.
- Tier LOGIC untouched everywhere; this is placement only.

## 15. COPY FINDINGS

Full catalogue: STATE-INVENTORY §3. Contract violations to fix at
implementation (copy only, semantics preserved):

1. The measured recovery contradiction (§8) — single wording source.
2. "Coach - this week's decision" → plain: "This week's coaching decision".
3. Daily weigh-in tutorial sentence → first-log-only (§11).
4. The two "N of M" counters in the hero eyebrow → one (§7).
5. Check-in nudge's three sentences + optional scan subline → one sentence in
   P1 ("Your weekly check-in is ready.") — the scan invitation lives on the
   check-in screen it belongs to.
6. No MEV/MRV/mesocycle/epoch jargon found in Home strings today (inventory
   confirms) — pin that as a guard.
7. Ban list for the new P1 idiom: no "coach is reading", no eligibility
   plumbing, no motivational filler, every line answers "so what" with either
   an action or a one-tap why.

## 16. CARD / CONTAINER FINDINGS

Current (inventory + density pass): up to 10 distinct container treatments;
worst state renders 6-7 bordered boxes. Target: **4 container classes total**
— header (none), hero (the one elevated card), P1 line (single quiet tinted
row, no border-in-border, one accent), rows (weight, last-session, footer
items: borderless, hairline-separated). The welcome card keeps its card form
(instructional, day-0 only). Card-in-card is eliminated (CoachBriefCard
merge). Alignment and type express everything else.

---

## 17. TARGET HOME ARCHITECTURE

Top to bottom. Every region: name / purpose / when / content / action /
max copy / weight / absorbs / must-not-contain.

**R1 — HEADER.** Orientation. Always. "Today" + greeting. No action. 2 lines.
Minimal weight. Absorbs: ScreenHeader unchanged. Must not contain: status,
counters, banners.

**R2 — TODAY LINE (the P1 slot).** The one material exception/change.
Conditional (one occupant, §13 ranks). One sentence + one tap-through +
optional dismiss. Max ~90 characters. Quiet tinted row, single accent, no
border stack. Absorbs: coach banner, deload banner, phase banner, check-in
nudge, re-entry overlay entry, block-complete entry, trial-ending state,
RecoveryStateCard's announcement duty. Must not contain: marketing while any
utility item is eligible; two occupants; internal thresholds; a second visual
idiom.

**R3 — PRIMARY ACTION (hero).** Start/resume/resolve. Always (variant per
state). Session name, one position counter, readiness line (chip), one quiet
coaching context line (ex-CoachBriefCard) when present, Start + Options, skip
link when applicable. Max: name + 3 support lines. Highest weight; the only
elevated card. Absorbs: hero, continue card (resume variant — outranks R2),
CoachBriefCard, no-plan EmptyState branches. Must not contain: nested cards,
recovery paragraphs, trial content, a second counter.

**R4 — EVIDENCE ROW (P2).** Today's data favour. Pro; hidden when nothing to
collect. Morning-weight one-tap (unlogged) or quiet logged state + trend tap;
OR the first-review readiness line (pre-first-review, R2 ruling §24). One row,
one line of copy. Low weight, borderless. Absorbs: TodayStrip, the readiness
gap. Must not contain: daily tutorial copy, sparkline dominance, two rows at
once (weigh-in wins; readiness line moves to R2 slot rank 4.5 on conflict
days — implementation detail).

**R5 — CONTEXT FOOTER (P3).** Reassurance and secondary paths. Conditional.
Last-session slim row (absorbs glance card); free teaser (≥3 sessions);
plateau/activation lines when P1 is occupied by something senior; free
attention items. Quiet rows, hairline separation. Must not contain: anything
requiring action today, coaching decisions, weight data.

**Sheets unchanged:** intent prompt, block shape, change workout — presentation
polish only where §15 copy items touch them.

## 18. NINE REPRESENTATIVE STATE MOCK STRUCTURES

**A. Established Pro, normal day** — Header / hero (name · counter ·
readiness · Start) / weight row (unlogged) / last session. Four regions,
zero banners, calm.

**B. Pro, coaching adjustment today** — Header / TODAY LINE "Calories
adjusted to 2,350 kcal. See why." / hero / weight row (logged, quiet) / last
session.

**C. Pro, planned recovery week** — Header / TODAY LINE "Recovery week.
Training is deliberately lighter. What that means." / hero (eyebrow tag
"Recovery · Session 2 of 3", same Start) / weight row / last session. ONE
recovery voice.

**D. Active workout to resume** — Header / CONTINUE hero (nothing above it) /
weight row / last session. Banners suppressed for the duration.

**E. New/early user building first review** — Header / hero (welcome-card
step text absorbed into the first-run variant OR welcome card until first
session) / readiness line "First review: 2 more morning weigh-ins" / (no
trial card).

**F. Established Free** — Header / hero / last session / teaser / attention
footer item if eligible.

**G. Trial ending, workout available** — Header / TODAY LINE "Your trial ends
tomorrow. Keep your coaching." / hero / weight row / last session. The one
state where commerce holds P1.

**H. Block complete awaiting decision** — Header / TODAY LINE "Block
complete. Choose what's next." / hero variant (decision entry as primary
action; no auto-activation) / last session.

**I. Re-entry after long absence** — Header / TODAY LINE (re-entry question
as the entry; sheet on tap, outcomes unchanged) / hero (eased variant per
existing engine) / weight row / last session.

## 19. KEEP / DEMOTE / REDESIGN / MERGE / REHOME / REMOVE TABLE

| Current element | Classification | Why |
|---|---|---|
| ScreenHeader | KEEP AS-IS | Does its one job |
| Hero (planned session) | REDESIGN (light) | Loses inner card + duplicate counter; gains coaching context line |
| Continue card | KEEP + PROMOTE | Absolute top in its state |
| Coach decision banner | MERGE → R2 | Right content, unified idiom |
| CoachBriefCard | MERGE → R3 line | Ends card-in-card |
| Check-in nudge | MERGE → R2 (promote) | Bottom → rank 4; retires nudge card |
| Deload banner | MERGE → R2 | One recovery voice |
| RecoveryStateCard | MERGE → R2 + hero tag | Joins the slot contract; contradiction fix |
| Nutrition phase banner | MERGE → R2 | Rank 7 |
| Plateau banner | KEEP BUT DEMOTE → P3 | Useful observation, not an exception |
| Activation banner | KEEP BUT DEMOTE → P3 | Never above the hero |
| Trial AttentionCard | REHOME (everyday) / R2 rank 8 (ending) | §14 |
| Free AttentionCard | KEEP BUT DEMOTE → footer | Free coherence |
| TodayStrip | REDESIGN + DEMOTE → R4 | Below hero, one-tap, tutorial copy retires after first log |
| HomeWelcomeCard | KEEP AS-IS | Day-0 job, already gated + dismissible |
| No-plan EmptyStates | KEEP AS-IS | Already coherent |
| Glance card | MERGE → last-session row | 3-way duplication fix |
| HomeProTeaserCard | KEEP AS-IS (position confirmed P3) | Earns its slot |
| HomeLastSessionCard | KEEP AS-IS | Already the right shape |
| Skip link | KEEP AS-IS | Pinned semantics |
| Intent/block/change sheets | KEEP AS-IS (copy touches only) | Behaviour pinned |
| First-review readiness line | NEW (founder-gated, §24 R2) | The one addition |

REMOVE count: zero outright removals — every current fact keeps a home; the
repair is rank, idiom and slot discipline. Deletion was not the goal.

## 20. PRESERVATION CONTRACT

Untouchable at implementation (Campaign 21's validated graph is senior):
workout start/resume paths incl. crash restore (`hasActiveWorkout`,
`startBlankSession`, `handleStartNextWorkout`, intent-prompt semantics);
readiness input values and their engine consumption; re-entry prompt outcomes
and `reEntryEaseState`; recovery/deload resolution (`gatedRecoveryState`,
`resolveRecoveryState`) — presentation may re-slot, never re-derive; skip
semantics (instance-scoped, neutral); coach decisions and their persistence;
morning-weight logging path + OB-8 deep-link; trial/subscription logic and
every `selectTrialVariant` input; activation stage machine; ED/calm/photo
suppression gates (fail-closed, tier-blind); cross-tab navigation fixes
(NAV-1/F4 routes); engine telemetry events currently fired; accessibility
labels/roles per element (re-slotted elements carry their labels with them);
the Android keyboard fixes on this screen's ScrollView. Every banner's
dismissal key keeps its meaning.

## 21. STARTUP-FLASH RECOMMENDATION

The auth-hydration flash (login/tier screen briefly visible before
authenticated state resolves) is a ROOT-NAVIGATOR/bootstrap concern, not a
Home concern: Home's own skeleton state is correct once mounted. It is part
of the first-impression PATH but not this screen's architecture.
**Recommendation: keep it a separate bounded startup task** (it has been
pending since the input-focus campaign; it should be scheduled next as its
own small defect task, not folded into Home implementation). No Home spec
item depends on it.

## 22. IMPLEMENTATION PLAN (no code)

Likely files: `HomeScreen.js` (region restructure, slot arbitration for R2,
strip/hero order swap, nudge retirement, banner-idiom unification);
`components/AttentionCard.js` (absorbs the R2 idiom or is replaced by a new
`TodayLine` component — engineering choice); `components/RecoveryStateCard.js`
(announcement duty moves to R2; card retires or becomes the tap-through
detail); `components/CoachBriefCard.js` (merges into hero line);
`components/TodayStrip.js` (R4 slim variants + tutorial-copy gate);
`components/HomeLastSessionCard.js` (absorbs glance stats variant);
`lib/readinessSummary.js` + `lib/recoveryState.js` (single wording source —
copy-level, no threshold changes); `lib/attention*/banner` helpers (rank
table). Complexity per §23's classes: the R2 slot arbitration is
state-routing (MEDIUM); everything else is presentation-only or copy-only
(LOW), except the trial rehome (MEDIUM, touches surfaces but not logic) and
zero items touch validated coaching logic (the §20 contract forbids it).

## 23. TEST PLAN

- Behaviour preservation: every §20 path pinned by existing suites
  (campaign5 firstUse, C18 re-entry, activation, trial variant, screen-mount
  Home tests) must pass unchanged or be re-pinned ONLY for render-location
  assertions, with rationale.
- New presentation guards: R2 single-occupancy (adversarial: make every rank
  eligible simultaneously → exactly the senior renders); resume-state banner
  suppression; strip-below-hero order; recovery single-voice (the
  contradiction can never return — one wording source asserted at both
  consumers); check-in-day P1 occupancy; trial-ending-only commerce in P1;
  weigh-in tutorial copy retires after first log; honest denominators on the
  readiness line (never Math.min-clamped display).
- State-matrix suite: the 18 material states from STATE-MATRIX rendered and
  snapshot/structure-asserted (mounted, per screen-mount conventions).
- Device checklist for the founder at implementation landing (per house law).

## 24. GENUINE FOUNDER RULINGS

**R1 — Morning weight below the hero.** Recommended: YES (P2, §11). This
reverses the COMP-027 Part B order you previously accepted; the evidence is
the density analysis (the session action losing the opening glance daily).
Alternative: keep the strip above the hero and apply only the copy/collapse
changes.

**R2 — The first-review readiness line returns to Home (redesigned).**
Recommended: YES (§9 — honest denominators, self-retiring, Pro
pre-first-review only, one tap to the You surface). This re-enters territory
the Today truth repair removed, so it is yours to call. Alternative: Home
stays silent pre-first-review (current state), the You tab remains the only
readiness surface.

**R3 — Everyday trial presence leaves the Home top slot.** Recommended: YES
(§14 — trial state rehomes to Profile/You; only trial-ENDING earns the Today
line). This trades daily conversion impressions for Home coherence; the
commercial moment is kept sharp rather than ambient. Alternative: trial
retains banner-cap rank 2 as today.

No other question requires your preference: every remaining decision follows
from the screen's job, existing law, or measured evidence.

## 25. FINAL VERDICT

**B. HOME / TODAY MOSTLY LOCKED — SPECIFIC FOUNDER RULINGS REQUIRED**

The target architecture, hierarchy, priority contract, copy contract,
preservation contract, state mocks and implementation plan are locked and
internally consistent. Three placement rulings (§24) need your call because
they reverse a previously accepted order (R1), re-enter deliberately removed
territory (R2), or trade commercial surface area (R3). With those answered,
Phase 2 can implement against this spec without further product questions.


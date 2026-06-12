# Deep Audit 2026-06-12 — Synthesis & Dual-Market Roadmap

Synthesises 12 agent reports (5 internal code audits `internal/int-0*`, 7 external
research reports `external/ext-0*`) plus the flag investigation. Personas:
**Besa** (nervous mass-market beginner) and **Eddie** (elite physique competitor),
now co-equal targets. Additive to the 2026-06-10 competitive audit.

---

## 1. The unifying thesis

**Volyume already has a world-class, deterministic coaching engine.** Across both
internal audits and external benchmarking it sits at or above the best in the
market on the things that matter: transparent *held* decisions (what changed AND
what didn't, with reasons — unique in the field), an ED-safety architecture no
competitor has, adaptive TDEE, volume landmarks, autoregulation, mesocycle
periodisation, and division-specific plans.

**Almost every gap this audit found is at the SURFACE layer, not the engine:**

1. The engine is **built and spoken for Eddie** — its intelligence is invisible
   to (or intimidating for) Besa, and even Eddie never *feels* coached because the
   output is a terse decision line, not a coach speaking.
2. There is **no guided beginner on-ramp** — Besa is dropped on a blank logger or
   an account+consent wall before any value, and can't answer "what do I do today?"
3. The **word-of-mouth loop is incomplete** — beautiful share artefacts with no
   friend-pull; the highest-value acquisition loop (a shareable plan link) doesn't
   exist.

So the dual-market win is a **presentation, language, on-ramp, and sharing
programme over the largely-unchanged engine** — high-leverage, mostly low-effort,
and almost entirely inside the hard constraints (no AI, offline-first, ED safety,
deterministic). The positioning that falls out of this is the mass-market prize:

> **"The £200-a-month physique coach, in your pocket, for £10–15."**
> Same methodology elite coaches charge for — adaptive nutrition, explained
> decisions, periodisation, safety — made *felt* (coach voice), *accessible*
> (beginner on-ramp + progressive disclosure), and *spreadable* (share loops).

This serves both personas with ONE engine: Besa gets a guided, encouraging coach
that answers "what do I do and why"; Eddie gets the precision, control and
credibility — surfaced through progressive disclosure rather than a separate build.

---

## 2. Convergent themes (ranked by leverage × conviction)

Each theme is independently supported by multiple agents (cited). Effort is rough:
S = days, M = ~1–2 weeks, L = multi-week / dependency.

### THEME A — Make the transparent coach FELT: the coach-voice / feedback layer  ★ highest leverage
The engine computes the decision but presents a terse line; it never speaks like a
coach. Elite coaching's universal **five-part response** is missing: (1) specific,
data-referenced acknowledgement → (2) plain-language trend interpretation →
(3) the decision + the reason → (4) one tactical cue for the week → (5) a
forward-pull "see you next check-in" anchor. The #1 reason coaching clients leave
is "felt unseen"; this is the fix, and it's copy/UX over data the engine already has.
*Evidence:* ext-06 (OPP-C01, its #1), ext-02 (#1 "coach message renderer"),
int-02 (F4 "best logic is invisible", F1 cold-start), int-04. *Persona:* Both.
*Effort:* S–M. *Constraint:* none (no engine change, no AI — templated en-GB).

### THEME B — A guided beginner on-ramp: answer "what do I do today?"
No guided first-plan funnel; quiz-first onboarding is **built but dark**
(`ONBOARDING_QUIZ_FIRST=false`); the free beginner lands on a blank logger; the
Plan Library has good beginner plans but no one-tap "start here"; set-type expert
techniques and jargon are thrown at novices. Every leading competitor answers the
D0 "what should I do?" question; Volyume's coaching power is a liability for Besa
until it does too. *Evidence:* int-01, int-03, int-05, ext-01 (Hevy Trainer/
Boostcamp/Fitbod all do this), ext-02, ext-03, ext-06 (OPP-C04). *Persona:* Besa.
*Effort:* M (flag flip is S; guided first session + plain on-ramp is M).
*Constraint:* touches `ONBOARDING_SEQUENCE_LOCKED` + `IDENTITY_AND_OWNERSHIP_LOCKED`.

### THEME C — One engine, two voices: persona-adaptive language + progressive disclosure
The locked voice forces plain-mechanism English for *everyone* and code-blocks
jargon (no expert register), yet beginners still hit raw jargon on diagnostic
surfaces ("deload", "training block", "tonnage", MEV/MAV/MRV, "refeed"). The fix
is progressive disclosure — conclusion-first for Besa, figures-and-science on
demand for Eddie — keyed off `experienceLevel`/`goalLock` signals already in the
code, plus an optional Motivational/Analytical tone choice (Apple Fitness+,
Freeletics shipped this). *Evidence:* int-02 (F2/F3), int-05, ext-02 (tone
switch), ext-04 (copy adapts at runtime), ext-05 (SDT language rules), ext-06
(progressive disclosure through the relationship). *Persona:* Both. *Effort:* M.
*Constraint:* proposes amending `COACHING_VOICE_SYNTHESIS_LOCKED` (the no-expert-
register rule + jargon-blocklist scope) — founder decision.

### THEME D — Beginner early-win & retention scaffolding (anti-churn, weeks 1–6)
The Jan–Feb / day-1–90 dropout is a **self-efficacy crisis, not willpower**. Today
there's an "early-win desert": one confetti burst between session 1 and the recap
unlock at session 10. Add a micro-milestone ladder (first workout / first week /
5-10-25 sessions), surface the *silent* streak-repair as an identity-reinforcing
moment, show a "Week 3 of 10" programme arc, and celebrate phase completion with a
next-phase reveal at the natural churn point. *Reconcile a tension:* ext-05 says
suppress the streak *number/loss* in the first ~30 days (a broken streak early is
maximally damaging); ext-04 says positive milestones are great — so **celebrate
positive milestones, hide loss/again-from-zero framing early**. *Evidence:* int-04,
ext-04, ext-05, ext-02, ext-06 (OPP-C10). *Persona:* Besa-led, Both. *Effort:* S–M.
*Constraint:* must inherit existing calm-mode/ED suppression (already exemplary).

### THEME E — Adherence-neutral, autonomy-supportive copy (functional, not just kind)
Shame → under-logging → corrupted intake data → wrong expenditure estimate → wrong
targets → user blames the coach. Adherence-neutral copy is therefore an
*algorithm-protection* measure, not only an ethical one. Audit every surface for
shame triggers; praise **effort/strategy over outcome** (growth-mindset evidence);
SDT autonomy language (drop "should/must/have to" → "worth considering / the
evidence suggests / your call"). Aligns with the ED-safety posture. *Evidence:*
ext-02, ext-03 (MacroFactor case), ext-05 (SDT, Dweck), ext-06. *Persona:* Both,
Besa-protective. *Effort:* S (copy pass, partly lintable). *Constraint:* none.

### THEME F — The word-of-mouth engine ("will they tell their friends?")
Virality = artefact **quality** × friend-pull. Volyume has artefacts, near-zero
pull. Highest-value, ranked: (1) upgrade PR/recap **share-card design** + cut
share friction to ~2 taps from the PR moment; (2) **shareable plan/programme link
+ a landing page for non-users** — the standout acquisition loop (Hevy hit 2M on
~$15k spend partly via this; Boostcamp's whole model); (3) milestone +
block-completion + an annual "Volyume Wrapped" recap card; (4) the **coach-as-
distributor** channel (one prep coach shares a plan link with 20 athletes = 20
credible installs); all built on / feeding the existing NEW-002 partner loop.
Persona split: Eddie shares for **status** (PRs, division, numbers), Besa for
**belonging/accountability** (partner, challenge, "I trained for a year").
*Evidence:* int-04, ext-01, ext-04, ext-07. *Persona:* Both. *Effort:* S (card
polish + share CTA) → M/L (plan-link landing page). *Constraint:* no body/nutrition
data in artefacts, no global leaderboards/public profiles, EU residency, decide the
Free/Pro line for share artefacts BEFORE launch and never move it (Strava backlash).

### THEME G — "What to eat": nutrition guidance for beginners
For Besa the nutrition killer isn't logging mechanics, it's **decision fatigue —
not knowing what to eat**. Deepen `mealSuggest.js` into real "what should I eat
today" guidance, add calorie-budget framing, and a rule-based **food-quality score**
(0–100) computed from the NOVA data already bundled in Open Food Facts — no AI.
Position "verified UK data beats AI guesses" against the new Welling-style AI
loggers. *Evidence:* ext-03. *Persona:* Besa-led. *Effort:* M. *Constraint:* Pro
feature (gating intact); deterministic.

### THEME H — Exercise instruction + a browsable library (the one below-floor gap)
0% of 449 exercises have any visual demo; ~62% have no form tip; and there is **no
standalone browsable exercise library** — exercises are only reachable via a
search-only picker, so a beginner who doesn't know movement names is stuck. This is
the single biggest "Besa can't learn a Romanian deadlift" blocker and the only
clearly below-category-floor finding. *Evidence:* int-03, ext-01. *Persona:* Besa-led,
Both. *Effort:* a standalone library screen is M; **visual demos are L and depend on
founder-sourced media (NEW-001)** — partially gated on assets, not code.

### THEME I — Information-architecture fixes
(a) **Train-vs-Plans** is a real beginner mental-model trap (start a workout on one
tab, manage the plan that defines it on another). (b) **Diary is a top-level tab
that's fully Pro-gated** — a free beginner has a quarter of the primary nav as a
dead-end; give it a teaching/teaser state instead of a bounce. (c) **Progress** is a
dense dashboard with no "do this now" lead for Besa. (d) Set-type expert techniques
exposed to everyone (gate behind `isBeginner`). (e) Wire the finished-but-unused
`PlateCalculator`. *Evidence:* int-03, int-05. *Persona:* mostly Besa. *Effort:* S–M.

### THEME J — Positioning & the competitive shift
**Hevy Trainer (Feb 2026)** now generates adaptive, auto-progressing programmes at
$24/yr — it competes directly for beginners, so "we're not a logger" is no longer
a clean line. The durable answer is the **"coach in your pocket"** positioning
(Theme A+B+C) plus **named-methodology anchoring** ("built on the principles elite
£200/mo coaches use — adaptive energy balance, volume landmarks, IOC RED-S safety")
on onboarding, the check-in card, and the paywall. *Evidence:* ext-01, ext-02,
ext-06 (OPP-C07). *Persona:* Both. *Effort:* S (copy + methodology surfacing).
*Constraint:* touches `GROWTH_STRATEGY_SYNTHESIS_LOCKED` (UK-physique-niche-first)
— founder positioning decision.

### Design-system polish (cross-cutting, from int-05)
Casing drift (Title Case vs sentence case), three different words for the same
volume landmark ("Max"/"Ceiling"/"Too much"), tap targets < 48px on several
screens, low adoption of the shared `Button`/`Card`/`EmptyState` primitives (e.g.
`EmptyState` re-rolls the very button it should use), `PRCelebration` not
reduce-motion gated, emoji PR icons, dead RIR styles, "Eight quick questions" copy
bug. All S, all constraint-free quality wins.

---

## 3. Prioritised build roadmap

Sequenced by leverage and dependency. With the founder's "build wholesale, no live
users, no caution" steer, these are built on `claude/main-branch-content-update-dcqicf`,
each lint+test green, surfaced for review — the items touching locked docs / ED
safety presentation / billing get an explicit nod first.

**WAVE 1 — The coach made felt + beginner on-ramp (the core repositioning)**
- A1 Five-part coach-response card (Theme A) — `S–M`, no gates.
- A2 Plain-language trend interpretation layer (Theme C/A) — `S`.
- A3 One-cue forward-pull + missed-check-in ghost-prevention push (Theme A/D) — `S–M`.
- B1 **Flip `ONBOARDING_QUIZ_FIRST` on + guided beginner on-ramp** (Theme B) — `M`,
  locked-doc nod. (This is the founder's flagged "switched-off-behind-a-flag" item.)
- B2 Guided first session + "what do I do today" Home answer for the plan-less
  beginner (Theme B/I) — `M`.
- E1 Adherence-neutral / SDT copy pass across check-in + diary + summary (Theme E) — `S`.

**WAVE 2 — Retention scaffolding + persona language**
- D1 Micro-milestone ladder + surfaced streak-repair + early-win moments (Theme D) — `S–M`.
- D2 Programme-arc "Week 3 of 10" + phase-completion celebration & next-phase reveal — `M`.
- C1 Persona-adaptive register + Motivational/Analytical tone + progressive
  disclosure of figures/science (Theme C) — `M`, locked-voice nod.
- C2 Beginner jargon → tap-to-explain on the diagnostic surfaces (Theme C/I) — `S`.
- I1 IA fixes: Diary teaser state for free, Progress "act now" lead card, set-type
  gating, wire PlateCalculator (Theme I) — `S–M`.

**WAVE 3 — Word-of-mouth + nutrition + library**
- F1 Share-card quality upgrade + 2-tap PR/milestone/block-completion share (Theme F) — `S–M`.
- F2 Shareable plan-link + non-user landing page (the acquisition loop) (Theme F) — `M–L`,
  positioning/Free-Pro nod.
- G1 "What to eat" meal guidance + rule-based NOVA food-quality score (Theme G) — `M`.
- H1 Standalone browsable exercise library screen (Theme H) — `M`. (Visual demos H2
  = `L`, waits on founder media — track separately.)
- J1 Named-methodology anchoring on onboarding/check-in/paywall (Theme J) — `S`.
- Design-polish batch (int-05) — `S`.

---

## 4. Founder decisions required (locked-doc / strategy forks)

These genuinely change what gets built and amend locked docs, so they need a
founder call before the dependent items ship (the rest proceeds without asking):

1. **Positioning** — adopt the dual-market "coach in your pocket" positioning and
   amend `GROWTH_STRATEGY_SYNTHESIS_LOCKED` (today: UK-physique-niche-first)?
2. **Coaching voice** — amend `COACHING_VOICE_SYNTHESIS_LOCKED` to add a
   persona-adaptive register + an optional expert/science layer for Eddie (relaxing
   the no-expert-register rule + the global jargon blocklist on opt-in surfaces)?
3. **Onboarding** — approve flipping quiz-first on + the resequence (amends
   `ONBOARDING_SEQUENCE_LOCKED` + `IDENTITY_AND_OWNERSHIP_LOCKED`)?
4. **Free/Pro line** — to widen the funnel, should any of the *coach-voice / guided
   on-ramp / share artefacts* be free (vs today's "all coaching is Pro")? This is
   the highest-stakes repositioning lever and the one most likely to move adoption.
5. **Notifications** — accept reconciling the push budget for the new coach-cue,
   ghost-prevention and milestone pushes (`NOTIFICATIONS_LOCKED`)?

---

## 5. What this audit confirms vs challenges from 2026-06-10

- **Confirms:** the transparent-coach + safety moat is real and uncopyable; EWMA
  trend, no-AI-as-moat, the generous-free + 14-day-trial monetisation shape, the
  COMP-001 workout-screen redesign (already shipped and good).
- **Challenges:** (a) the moat is a *concept* until the coach is made to *speak*
  (Theme A); (b) the "free path is Hevy-class, protect it" framing — protecting it
  is right, but leaving it guidance-free is the activation hole; (c) MEV/MRV chips
  were framed as the differentiator — they're Eddie's, and a D0 liability for Besa
  without an on-ramp; (d) COMP-018 streak is a *word-of-mouth* surface, not just
  retention, and needs beginner-loss suppression; (e) the competitive landscape
  moved (Hevy Trainer).
</content>

# PASS-3 v2 — FOUNDER DECISIONS LOG (per-item, with rationale)

Founder is deciding on each v2 gap/elevation item (`pass3-comparison-matrix.md` → "v2 DOMAINS"). Decisions
recorded verbatim-faithful with rationale and status. Statuses: ACCEPTED · REJECTED · MAYBE (parked) ·
DEFERRED (cost/triggered) · REFRAME (replaced by a better-scoped direction). Session 2026-06-14.

## DECIDED

### 1. Plate calculator (BD) — **REJECTED**
Founder: "Plate Calculator is lame. Nobody would use it and it's bloat for the sake of bloat. In the UK plates
are 10kg or 20kg, counting plates is not hard." → Do NOT wire the existing `PlateCalculator` component into the
flow. The component is now confirmed unwanted; it is dead code (flagged for optional removal, not removed
unilaterally per CLAUDE.md "mention dead code, don't fix"). Remove from BD elevate list.

### 2. UK food database (FL/NU/MP) — **DEFERRED (cost-gated), NOT an unaddressed lag**
Founder: "Our app already has UK supermarket, just not the expensive version — we use 3 different sources. I'll
pay later if the app takes off." → Re-grade: we DO ship UK supermarket coverage (3 sources). The gap is
specifically the **paid, curated/verified tier** (Nutracheck-grade), a deliberate **cost-deferred** decision
post-traction — not a quality oversight. Update FL/NU "WHERE WE LAG" + MP "UK wedge" accordingly: known,
cost-gated, revisit on traction. (My earlier "crowdsourced vs curated = lag" framing was missing the cost
decision.)

### 3. Passive cardio import (CD) — **MAYBE (parked)**
Founder: "Passive cardio maybe." → Not committed; park for later revisit. Keep in CD elevate as MAYBE, not a
planned build.

### 4. Recipe URL import (RC) — **REJECTED**
Founder: "Recipe import? From where? … This isn't a recipe book." → Generic recipe-site URL import is off-mission
for a physique app. Remove from RC elevate. (For the record: "from where" = paste a recipe-site link, deterministic
schema.org parse — confirmed not wanted.)

### 5. Bodybuilding meals (RC/MP) — **REFRAME / ACCEPTED as a direction to scope**
Founder: "We have a builder but we need to scope out actual bodybuilding meals. Not shit recipes. This isn't a
recipe book." → The real need is a **curated set of physique-appropriate meals** for the meal planner/builder
(deterministic, high-protein, UK-buyable), NOT a generic recipe importer. NEW SCOPING TASK — define what
"bodybuilding meals" means (criteria: protein density, UK ingredients, prep simplicity, meal-slot fit) before any
build. Replaces RC "URL import".

## DECIDED — Call 1 (nutrition/meals/recap), 2026-06-14
**ACCEPTED (build):**
- MP — Auto grocery list (aggregated, aisle-grouped shopping list).
- MP — Batch/leftover logic ("cook once, eat twice").
- FI — Protein-consistency metric.
- FI — Longer analytics windows (14/30/90-day).
- Meal building — Nested base components (reusable 'chicken base'/'rice base').
- RP — Wire existing ShareCard export to Year-of-Lifts/block recap cards.
- RP — Monthly recap cadence (block + annual already exist).
- RP — Relative/landmark framing instead of raw tonnage.

**ACCEPTED with REFINEMENT:**
- Meal building — weight entry. Founder: *"Maybe cooked and uncooked options? Most people cook uncooked and weigh
  at that... cooked weight over- and under-cooking is very possible and having too much left over or not cooking
  enough. Is there a stylish way to incorporate cooked and uncooked weight as options?"* → NOT cooked-only.
  **Support BOTH raw/uncooked AND cooked weight as per-item options** (raw is how most people actually weigh;
  cooked yield handles batch variance/leftovers). SCOPE a clean UX for raw-vs-cooked entry; fold into the
  bodybuilding-meals scope.

**DISMISSED (not suitable):**
- MP — Anti-repetition guarantee.
- FI — Weekend weak-spot detection.
- FI — Deterministic Satiety Index.

## DECIDED — Call 2 (builder/UX/cardio), 2026-06-14
**ACCEPTED (build):**
- BD — Mid-session exercise substitution (swap occupied-machine exercise without breaking the template; keeps
  volume tracking).
- UX — Timeline-style food logging (continuous timestamp; replaces rigid meal buckets).
- UX — iOS Core-Haptics custom waveforms (we already fire basic haptics; this is the polish layer).
- CD — Passive wearable import (upgraded from MAYBE → YES): read-only Apple Health/Health Connect cardio-session
  + HR, feedback-only, deterministic model preserved.
- CD — Cardio trend view (history list → "done vs planned" over time; plain wording, NOT "adherence").

**DISMISSED (not suitable):**
- BD — Per-set RIR input picker. **Founder: "No RIR — that's jargon, against our site ethos and the
  newbie-welcoming approach."** Confirmed by locked work: the per-set effort picker was already removed
  (`SetEntry.js:141-144`) and `MOVE_0_5_VOICE_RETROFIT.md:115-120` strips "RIR" from seeded notes for ALL users.
- BD — Standalone phone-free watch.
- BD — Per-exercise kg/lb units. Founder: "Cable stacks are rarely lbs." (Keeps deliberate kg-only.)
- UX — Advanced/dense personalisation toggle (keeps the deliberate "no personalisation" stance).

## STANDING CONSTRAINT — VOICE / NO-JARGON (applies to EVERY accepted item above)
Source (read in full 2026-06-14): **`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`** (canonical, supersedes all other
voice docs) + **`docs/MOVE_0_5_VOICE_RETROFIT.md`** (the "for all users" retrofit). Any new user-facing string
from this v2 work MUST:
- Pass `checkJargon` + the Section-6 failure-mode copy-lint (CI-enforced). Plain term ALWAYS leads; technical
  terms (RIR, TDEE, FFM, MEV/MRV, mesocycle, refeed, tonnage, adherence) appear ONLY via the opt-in science layer
  (bracketed-after-plain) or tap-to-explain — never bare on a surface.
- Pass the **honesty test** ("true if the user did nothing but kept logging?"), be **numbers-before-narrative**,
  **mirror-not-infer**, no motivational filler / moral food labels, British English, NO em/en dashes.
- Safety copy stays register-blind.
**Per-item voice guards:** "nested base components" → surface as "reusable meal parts" (not "nested recipe");
"cardio trend" → "how often you did your cardio / done vs planned" (not "adherence"); recap "relative framing" →
factual ("the weight of N …"), never hype/"crush"; protein-consistency → "how often you hit your protein."
(Related, not the canonical source, for awareness: `USER_FACING_COPY_AUDIT.md`, `COACHING_VOICE_CITATION_AUDIT.md`.)

## DECIDED — Call 3 (bodybuilding-meals delta), 2026-06-14
**KEY FINDING (read-backed):** the bodybuilding-meals system **already substantially exists** — `curatedMeals.js`
(~50 meals omni/veg/vegan, computed macros, British staples), `foodRoles.js` (PRO/CHO/FAT/VEG/FREE + dry/cooked/
ready weight-state `:139-145`), `mealPlanAssembler.js` (deterministic, ±10% band, training/rest variants,
floor-safe), `planPreferences.js` (diet/exclusions/meals-per-day/variety/rotation), `mealSwap.js`/`mealSuggest.js`.
So decision #5 ("scope bodybuilding meals") is mostly DONE; only the deltas below are open.
- Meal library coverage — **ENOUGH for now** (no expansion).
- **Raw/cooked weight entry — BUILD.** Data layer already knows dry/cooked (`foodRoles.js`); the gap is a
  user-facing choice to weigh raw OR cooked at log/build time; engine converts via existing weight-state.
- **Auto grocery list — BUILD.** Not present today (grep = 0). Aggregated UK shopping list from a plan.
- Batch/leftover logic — **DISMISSED** (supersedes the Call-1 acceptance — founder reversed).
- User-saved/nested meal parts — **DISMISSED** (curated components exist internally; user-defined ones not
  wanted — supersedes the Call-1 "nested base components" acceptance).

## APPROVED FOR BUILD — Calorie banking ("Plan a bigger day"), within SAFETY RAILS (2026-06-14)
Founder: *"we had calorie banking? So people can select to bank calories in the week for an off plan? That seems
like a great idea if we can do it in a stylish way."* Decision: **Build within safety rails.**
Status today (read-backed): user-controlled banking ABSENT (gap-corrections B7); engine day-variant cycling
EXISTS (`mealPlanAssembler.js dayVariantTargets` — moves calories between days within the ±band, weekly total
preserved, capped swing, auto-disabled when floored). Banking = let the USER aim that redistribution at a chosen
day. **HARD SAFETY RAILS (non-negotiable — this edits calorie targets, touches `src/coaching/safety`):**
1. Redistribution only — **weekly total preserved**; never creates a net deficit.
2. **Never below the daily floor** (1,200 kcal women / 1,500 men) or the FFM floor on ANY day.
3. **Capped** banked amount (reuse the assembler's capped day-swing).
4. **Auto-disabled** under any open ED-pattern flag, calm mode, or a floored/compressed target (same carve-out
   the assembler already applies).
5. Must **not trip or mask** ED under-eating / rapid-loss detection.
6. Copy: **no "cheat day" / "binge" / "save up"** framing (voice + safety). Surface as "Plan a bigger day".
7. **Invariant tests required** against the REAL safety engine for every rail above (CLAUDE.md build model).

**COACH INTEGRATION (founder requirement 2026-06-14: "the coach must accept this, read/see what's done, and not
react as if someone's had a huge eat day or under-eaten") — read-backed:**
- GOOD NEWS by construction: `weeklyCoach.js` already judges on the **7-day rolling AVERAGE intake + weight
  trend, not single days** (`:828-834`, `:388`, `:1129`); adherence is **average-vs-target** (`mapCalsAdherence
  :334-339`). Because banking PRESERVES the weekly total, a banked week has the SAME 7-day average and SAME weight
  trend → the coach sees no "huge eat day" and no "under-eaten" days. It is invisible to the trend logic.
- PRECEDENT: the coach already consumes deliberate day-variation it does NOT misread — carb-cycle high/low days
  (`macroCycle :1019`) and refeed days (`refeed :1043-1062`). **Model banking as the same class of planned
  day-variation** the coach already understands; do NOT invent a parallel path.
- HARD REQUIREMENTS so no surface misreads it:
  (a) banking writes a **planned per-day target** that the diary, the safety floor check, and the check-in
      auto-derivation (`deriveCalsAdherence`) all read — so any per-day "under target" indicator references the
      **banked** daily target, never the flat one (a deliberately-light banked day must NOT show as under-eaten);
  (b) the absolute daily floor (1,200/1,500) + FFM floor are checked against the **banked** daily number and any
      day that would breach is refused (rail #2);
  (c) the banked plan is **recorded as intentional** (a marker the coach/safety can see), so present + future
      per-day logic treats it as a plan, not a deviation;
  (d) the coach keeps judging on the preserved **weekly average** (already how it works) — banking changes the
      shape of the week, never the weekly total the engine adapts on.
Implementation = build phase (not this review branch); rails + coach-integration requirements are the spec.

## ALL DECIDED — v2 set complete
Open build queue (approved): grocery list, raw/cooked toggle, calorie banking (rails above), + the Call-1/2
accepted items (protein-consistency, 14/30/90d windows, recap share/monthly/relative, mid-session swap,
timeline logging, core-haptics, passive cardio import, cardio trend) — all under the standing no-jargon voice
constraint.
- RC: cooked-weight yield scaling; nested recipes.
- MP: anti-repetition guarantee; automated grocery aggregation; batch/leftover distribution.
- FI: 14/30/90-day windows; protein-consistency metric; weak-spot detection; (Gemini idea) deterministic Satiety
  Index.
- RP: monthly recap cadence (block already exists); wire share/export to recap cards; relative/landmark framing.
- BD: per-set RIR *input* surface; standalone phone-free watch; mid-session substitution; (flag) per-exercise
  kg/lb units (vs deliberate kg-only).
- UX: optional dense/personalisation toggle; iOS Core-Haptics waveforms; optional timeline logger.
- CD: cardio trend/adherence view.

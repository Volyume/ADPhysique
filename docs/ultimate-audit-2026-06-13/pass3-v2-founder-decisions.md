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

## STILL UNDECIDED (awaiting founder verdict — listed for continuation)
- RC: cooked-weight yield scaling; nested recipes.
- MP: anti-repetition guarantee; automated grocery aggregation; batch/leftover distribution.
- FI: 14/30/90-day windows; protein-consistency metric; weak-spot detection; (Gemini idea) deterministic Satiety
  Index.
- RP: monthly recap cadence (block already exists); wire share/export to recap cards; relative/landmark framing.
- BD: per-set RIR *input* surface; standalone phone-free watch; mid-session substitution; (flag) per-exercise
  kg/lb units (vs deliberate kg-only).
- UX: optional dense/personalisation toggle; iOS Core-Haptics waveforms; optional timeline logger.
- CD: cardio trend/adherence view.

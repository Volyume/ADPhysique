# PASS-4 — MASTER PRIORITY

Per `_AUDIT-SPEC.md:307`. Resolves the PRIORITY-SCORE NA-ids (impact/effort were not in the source docs). Tiers
reflect impact × (1/effort), and the blueprinting findings (several items already largely built → reclassified).
All carry the standing no-jargon voice constraint; safety/schema items carry hard gates.

## TIER 1 — quick wins (low effort, real gap, no blocking decision)
1. **Gate train/rest cycling to advanced-only** — fixes the illogic + coach inconsistency; small (gate one call). [NA-nutrition-6]
2. **Keyboard-completes-the-set** — one fewer tap mid-workout; small. [NA-wr-2]
3. **Protein-consistency metric** — behaviour-relevant; FoodInsights already range-based. [NA-nutrition-8]
4. **Analytics windows 14/30/90d** — loaders already range-based; mostly a selector. [NA-nutrition-9/10]
5. **Cardio trend view** — deterministic pieces already exist; add a multi-week reducer + section. [NA-cux-9]
6. **Relative anchor on the recap tonnage hero** — rest of recap already built. [NA-wr-10 founder wording]

## TIER 2 — medium build, high value
7. **Recomp-reframing view** — read-only over existing data; strong beginner-retention reframe. [NA-coaching-3/4]
8. **Auto grocery list** — genuinely absent; actionability win. [NA-nutrition-4]
9. **Plan diff/preview** — pre-commit dry-run; both screens already Pro-gated. [NA-coaching-12/13]
10. **Passive cardio import** — infra mostly exists; convenience (read-only, feedback-only). [NA-cux-4 founder]
11. **Named autonomy modes** — Coached/Collaborative/Manual; default = today's behaviour. [BLOCKED NA-coaching-10 safety]
12. **Raw/cooked weight toggle** — [BLOCKED NA-nutrition-1: no conversion factor in code — needs a source]
13. **Mid-session swap "keeps volume tracking" clause** — swap already exists. [NA-wr-3 founder clarify]
14. **Core-Haptics polish** — [BLOCKED NA-cux-19: needs a NEW dependency → founder approval]

## TIER 3 — large / careful, sequence ALONE
15. **Timeline food logging** — [NA-cux-13 time-of-day field?; NA-cux-15 founder replace-vs-toggle]
16. **Micronutrients / NRV** — schema migration; [BLOCKED NA-mn-1: Q1 schema authority]
17. **Calorie banking** — safety-adjacent; own blueprint + invariant tests; [NA-cb-1..5 + founder]

## ALREADY BUILT (reclassify toward no-action — net build is smaller than the list)
Recap share/export + monthly cadence (COMP-005); the swap mechanism itself; cardio import/trend infra; the
flexible meal-slot model. Confirm reclassification in founder review.

## SEQUENCING NOTE
Tier 1 first (fast, no blocked decisions). Tier 2 after its NA-ids/decisions clear. Tier 3 each alone, after the
schema-authority (Q1) and safety reviews. Every feature ships with invariant tests + a fresh-eyes review per the
build operating model.

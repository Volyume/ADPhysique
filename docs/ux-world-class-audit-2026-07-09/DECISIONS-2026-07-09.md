# Founder decision register (2026-07-09)

Rulings given by the founder in session, against `ASSESSMENT.md` section 5
and `SCOPING-DIETARY-PREFERENCES.md` section 7. These are settled. Do NOT
re-surface any REJECTED or HELD item as a suggestion in future sessions;
the founder's direction is to strengthen what exists until it ties together
as world class, not to propose additions that were ruled out.

## Assessment items

| Item | Ruling |
|---|---|
| Exercise media programme | **HOLD.** Founder is not putting money towards it now. Do not re-propose. |
| iOS Live Activities wiring | **HOLD.** |
| Plate calculator surfacing | **REJECTED.** Moot for UK-based users; absolutely not needed. Do not re-propose. |
| Haptic vocabulary rollout | **APPROVED.** Extend the existing expo-haptics vocabulary (`src/lib/haptics.js`) across builder/settings surfaces. No new dependency; the gated Core-Haptics question stays gated. |
| Paywall social proof (review excerpts) | **NO.** Stays dark. Do not re-propose. |
| Accessibility / dynamic type / ease-of-use pass | **APPROVED**, with added founder emphasis (verbatim): "I want more attention to user ability and ease of use and design as well. Strengthen that and any other areas instead of suggestions of additions that are already ruled out." |
| RPE/RIR reinstatement | **Treat as settled-removed.** The founder flagged the audit for re-surfacing already-decided removals; the effort picker stays out. |
| Billing default reconciliation, apply-all, giant sets | **Not ruled on.** Do not build; do not re-surface unprompted. |

## Dietary preferences and allergens (structured answers)

| Question | Founder answer |
|---|---|
| Scope | **Phase A + B.** Wire preferences into every suggestion surface, complete FSA vocabulary, first-class Dietary needs settings, plus ~25-40 new diet-tagged curated meals. Phase C (open-food allergen ingestion) not commissioned. |
| Allergy sync | **Sync diet + allergens** (additive `users_profile` columns, founder-applied migration). Taste-only food exclusions may stay local. |
| Diet axes | **Add pescatarian.** Halal/kosher deferred as a separate future decision. |
| Exclusion ceiling (ED-adjacent) | **Soft nudge past threshold** (~15 excluded foods): calm plain-voice line, no block, no shame, tier-blind. |

## Working direction (founder, verbatim)

"It's strengthening what we have so it's all world class and ties together
world class." / "Proceed with dietary."

## Active work queue (session order)

1. Dietary Phase A (engine wiring, settings surface, sync, nudge, tests)
2. Dietary Phase B (curated meal library expansion)
3. Haptics rollout across builder/settings
4. Ease-of-use, ability and design strengthening pass

## D8. Exercise engine + library rulings (founder, structured round, 2026-07-09)

| Question | Ruling |
|---|---|
| Set cap per exercise/session | **4 compound / 3 isolation** (split by the existing compound_isolation field). |
| Overflow past the cap | **Add a different-angle exercise** — weekly volume PRESERVED, spilled deterministically into a complementary-angle exercise (never trimmed). |
| Cap scope | **Auto-gen enforces; manual builder shows a calm nudge past the cap, never blocks.** Existing plans untouched (no migration prompt). |
| Library expansion | **~100 comprehensive** (plan-A Option B): all targeted fills incl. bands + wider depth + subregion-enforcement extension. |

Delegated engine-design details (recorded, not re-asked): max exercises per
session derived as ceil(sessionTarget/cap) bounded by existing session budget;
thin-equipment fallback = equipment-category diversity when no second angle
exists; biceps (and similar already-tagged muscles) join SUBREGION_REQUIREMENTS.
Build split: library agent owns seedExercises DATA + tags ONLY; engine agent
owns ALL planEngine.js changes; engine diff gets LEAD hands-on review before
push (deterministic, replay/invariant tests extended).

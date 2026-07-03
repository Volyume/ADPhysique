# VOLYUME consistency / copy / professionalism audit
**Date:** 2026-07-03. **Method:** five Opus agents over exclusive slices (screens x3, components+nav, lib copy), each auditing against VOLYUME's own standards (`audit/consistency/_STANDARDS.md`), applying the safe-fix class and flagging the rest. Full gate after: **417 suites / 5,769 tests, 0 failed; lint 0 errors** (warnings 93 to 70, the a11y additions cleared the difference).

**Headline:** the codebase is already highly disciplined. The safe-fix volume was almost entirely em-dashes in code comments; there were effectively no US spellings in user copy, no hardcoded colours in component styles, no placeholder or debug text, and the tab-bar active-state bug named in the brief is already fixed.

## Safe fixes applied (by area)

### Area 1 - Language
- **Em/en dashes removed: ~325**, across A1 (110), A2 (53), A3 (63), A4 (99). Nearly all sat in code comments; the em-dash lint rule (user-facing only) was already green everywhere. Two user-facing touches: a `MealPlanScreen` alert body, and normalising two `...` to the single `…` glyph.
- **Curly apostrophe to straight: 1** (`AddCustomFoodScreen`), matching the straight-quote convention.
- **UK English:** zero fixes needed in user copy. Every `-ize/-or/-er` hit was a code identifier, a library API (`result.canceled`), a style key, or a proper noun.
- **Brand:** "Volyume" consistent everywhere; only const identifiers/storage keys carry the uppercase form.
- **En-dash range convention (orchestrator resolution):** A3 had converted two user-facing rep ranges to hyphens; en-dash is the documented convention (`ExerciseDetailScreen`), so both were reverted to en-dash to keep ranges consistent app-wide.

### Area 2 - Visual & style
- **Hardcoded colours: none** in component styles (token discipline already clean; the one plate-colour hex is a documented exception).
- **Tab-bar active state: verified correct** - both glyph (filled/outline) and colour key off selection state only. The known inconsistency is not present.
- **Icons:** uniformly Ionicons; SVG only for charts. **Reduce Motion:** no gaps found; every animated component gates it.

### Area 3 - Professionalism & accessibility
- **Accessibility labels added: 23** in A1's slice (TextInputs, dismiss backdrops, buttons) - clearing every a11y warning in that slice.
- **No dead taps, placeholders, TODO/debug copy, or health-claim language** found in user surfaces.

Per-slice detail: `audit/consistency/A1..A5-*-findings.md` and `-decisions.md`.

## DECISIONS FOR THE FOUNDER (nothing here was auto-changed)

1. **Terminology: "workout" vs "session"** (flagged by all five agents). The same training bout is called both across adjacent copy (e.g. HomeScreen examples, notification channels, PlanUpdate/ProGoalSetup "Session length" vs MealPlan/Plans "Workout"). Pick one canonical term per concept and I will sweep it. This is the single biggest consistency item and it needs your ruling because either could be deliberate.
2. **En-dash vs hyphen for ranges.** I standardised on the documented en-dash convention. If you would rather ranges use a plain hyphen app-wide, say so and I will invert it consistently.
3. **Accessibility warnings (70 remain).** A1 cleared its slice; the rest are project-tolerated `react-native-a11y` descriptor warnings on other screens (including two WelcomeScreen onboarding CTAs). Options: a dedicated a11y pass, fix-just-the-CTAs, or leave as-is.
4. **Primitive duplication (tech debt).** `FeedbackSheet.js` and `PeekMenu.js` still hand-roll their own `<Modal>` sheet chrome; `BottomSheet.js` was built to replace exactly these two and the other four call sites were migrated, but these were not. A migration is behaviour-risky, so it is flagged, not done.
5. **Hardcoded animation durations.** `FeedbackSheet` (220/280/180 - 220 equals `motion.exit`) and `PRCelebration` (300/600) use literal durations rather than motion tokens. Tokenise or leave.
6. **Safety / coaching-voice / ED copy: left untouched by design** across every slice (ShareCard Article 9 field lists, calorie-target lines, coaching verdicts). One item to ratify if you want it: the daily-energy-target range on `NutritionTargetsScreen` uses an en-dash (kept, per the convention above). Nothing else here changed.
7. **Cosmetic minors:** "Seamless" in a `CoachOutputScreen` comment; the `restEnd` "Rest done" notification title reads slightly clipped versus the warm notification voice.

## On-device checklist (physical Android, EAS build)
The audit changed only comments, a handful of punctuation glyphs, and accessibility labels - no logic, no user-facing copy of substance, no styling values. Verify:
1. App builds and launches; open five or six screens across tabs - all render identically to before (no copy or layout change is expected).
2. TalkBack on: the newly labelled controls in the training/food screens (set inputs, sheet close buttons) now announce a meaningful label instead of nothing.
3. Rep ranges (exercise detail, routine detail, workout summary) all read with a consistent en-dash, e.g. "8-12 reps" rendered with the en-dash glyph.
4. Nothing on the never/kill list moved: no Home banner added, one-amber rule intact, ED/calm suppression unchanged, engine outputs identical (the full deterministic test suite is green).

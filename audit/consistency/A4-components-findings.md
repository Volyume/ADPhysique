# A4 - Components & Navigation - consistency findings

Slice (edit-ownership): `src/components/**/*.js`, `src/navigation/**/*.js`.
Audited against CLAUDE.md, `docs/rules/styling.md`, `_STANDARDS.md`.
Read-only elsewhere. No commits (orchestrator commits).

Test/lint state after fixes:
- `npx jest --runInBand src/components src/__tests__/screen-mount.test.js` -> 29 suites / 836 tests PASS.
- `npx eslint` on changed files -> 0 errors, 13 pre-existing a11y warnings (not introduced here; listed under decisions).

NOTE: the many `src/screens/*` files shown as modified in `git status` are a
SIBLING audit agent's slice, not this one. This agent modified only
`src/components/**` and `src/navigation/**`.

---

## AREA 1 - LANGUAGE (fixes applied)

### Em dashes in comments -> comma (SAFE-FIX class 2). Applied.
- 99 em-dash (U+2014) occurrences across 34 files (33 components + `RootNavigator.js`)
  rewritten to commas. **Every one was in a code comment / JSDoc / `{/* JSX comment */}`**
  - verified none sat in a user-facing string before editing, so no lint-user-copy
  line and no runtime string changed. Doc-header lines now read
  "Name, description" (grammatically valid; colon would occasionally read
  marginally better but comma is never wrong).
- Two mechanical artifacts from line-end / aligned-list dashes were hand-cleaned:
  - `RootNavigator.js:160` `Fire-and-forget ,` -> `Fire-and-forget,`
  - `AttentionCard.js:12-16` aligned priority list: stray ` , ` restored to
    aligned ` : ` colons (definition-list reading).
- Result: `rg '—' src/components src/navigation` (excluding tests) = NONE.

### UK spelling in user-facing strings
- No `-ize/-yze/-or/-er`, `behavior`, `favorite`, `canceled`, `math`, `gotten`,
  or `$`/`lbs` issues found in any component/nav user-facing string. Codebase is
  already British. The only `color`/`colorBlindSafe`/`optimize`-style hits are
  code identifiers / library props (out of scope). No change.

### Brand
- "Volyume" spelled/capitalised consistently everywhere (asset names, testIDs,
  storage keys and the `VolyumeMark` a11y label all correct). No change.

---

## AREA 2 - STYLE-SYSTEM (my primary area)

### Hardcoded colour/size literals -> token
- **Hex / rgba in component styles: NONE.** `rg '#[0-9A-Fa-f]{3,8}|rgba?\('`
  over `src/components` returned only a single hit that is a comment mention
  (`CoachDailyBrief.js:2`). Token discipline in this slice is clean; nothing to
  convert, nothing to invent. (The theme-token lint guard is intact.)

### Icon set / weight consistency
- Uniform: every icon is `@expo/vector-icons/Ionicons`. `react-native-svg` is
  used ONLY for the chart/sparkline/illustration/body-diagram primitives
  (`VolyumeChart`, `Sparkline`, `SvgBarSparkline`, `Illustrations`,
  `BodyDiagramHeatmap`). No mixed icon families (no MaterialCommunity/Feather/
  FontAwesome). Consistent - no fix.

### Tab-bar active-state treatment (named priority item) - VERIFIED CORRECT
- `VolyumeTabBar.js` + `RootNavigator.js` `MainTabs.screenOptions.tabBarIcon`:
  the filled-vs-outline glyph (`home`/`home-outline` etc., RootNavigator
  533-542) AND the colour (`isFocused ? colors.primary : colors.textMuted`,
  VolyumeTabBar:105) BOTH key off selection state only. Nothing else toggles
  appearance. The known "filled-vs-outline inconsistency" is NOT present in the
  current custom bar - no change required. (Sliding amber pill = `primaryBg`
  token; badge dot = `primary` token; all spacing/radius via tokens.)

### Motion values from tokens
- Overwhelmingly tokenised via `motion.*` (RollingNumber, Skeleton, Toast,
  PeekMenu, BottomSheet, MacroRings, ActiveSessionMiniBar, VolyumeTabBar,
  PressableCard). A few hardcoded animation durations remain - flagged in
  decisions (behaviour-adjacent tuned values, no auto-fix):
  `FeedbackSheet.js` (220/280/180), `PRCelebration.js` (300/600).

### Reduce Motion flattening - NO GAPS
- Every animated component gates `accessibility.reduceMotion`:
  RollingNumber (renders plain Text), Skeleton (static opacity), Toast,
  PeekMenu, FeedbackSheet, BottomSheet (all `reduceMotion ? 0`),
  ActiveSessionMiniBar `LiveDot` (static), MacroRings ring (instant value),
  VolyumeTabBar (pill jumps, no icon scale), PRCelebration (`subduedMode =
  subdued || reduceMotion || isFirstLift` -> no confetti / heavy haptics).
  Haptics all route through `lib/haptics`. No fix needed.

### Primitive duplication (LIST - flag-only, see decisions)
- `GradientCard.js` - already a documented shim forwarding to `Card`
  (resolved in a prior audit; NOT a live duplicate).
- Sheets correctly on the `BottomSheet` primitive: QuickAddSheet, FoodDetailSheet,
  MacroBreakdownSheet, CalorieBankSheet, CuratedMealSheet, CancelReasonSheet,
  PostLapseSheet, WhatsNewSheet.
- **Un-migrated duplicates (flag):** `FeedbackSheet.js` and `PeekMenu.js` still
  hand-roll their own `<Modal>` + slide/backdrop chrome, even though
  `BottomSheet.js`'s own header documents it was extracted to replace exactly
  these ("Feedback", "PeekMenu"). See decisions #4.

---

## AREA 3 - PROFESSIONALISM
- No TODO/FIXME/lorem/debug/placeholder copy in any user-facing component
  surface.
- No AI-speak / filler / gratuitous exclamation in component copy.
- Straight quotes throughout; no double-space or double-punctuation artifacts
  after the em-dash sweep (verified).

---

## Files changed (comment-only unless noted)
33 components with em-dash comments + `RootNavigator.js`; plus targeted artifact
cleanups in `AttentionCard.js` (aligned-list colons) and `RootNavigator.js`.
Full list in `git status` (this slice only): all `src/components/**` and
`src/navigation/RootNavigator.js`.

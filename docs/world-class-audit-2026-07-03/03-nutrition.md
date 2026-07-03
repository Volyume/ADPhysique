# Track 3: nutrition domain UX

TAP ECONOMY: usuals breakfast 2; typical relog 3; barcode hit 3+aim; barcode miss+OCR 6+2
photos; home-cooked meal 6 (slowest common path, with a needless confirm dialog); portion
adjust 3; remaining macros 1 glance; day-a-week-ago EIGHT taps (chevrons only).

FINDINGS RANKED:
1. CRITICAL/DECISION: Home has ZERO food quick-log entry (TodayStrip food cell removed by
   founder review 2026-06-30 — TodayStrip.js:13-14 now weight+cardio only). Every meal log
   starts with a tab switch. NEEDS FOUNDER DECISION (deliberate removal; do not silently
   re-add). MacroFactor/Cronometer keep a 1-tap log affordance on home.
2. HIGH: day navigation = 1 tap per day, no swipe, no calendar jump (DiaryScreen 892-899,
   540-542). Fix S: swipe on date row reusing shiftDate.
3. MED-HIGH: saved meal/recipe logging = 6 taps + blocking appAlert confirm
   (MyMealsScreen.confirmLog 80-89) — only routine write in domain with a confirm; and
   saved meals/recipes NEVER enter the Add-again/Frequents ranking
   (suggestFoodCandidates, FoodSearchScreen 184-206). Fix: S (optimistic+Undo) + M (fold
   meals/recipes into ranked pool).
4. MED systemic: three faster-paths are long-press-only with no sighted hint: FoodRow
   portion editor (a11y-hint only, FoodRow.js:54), water +500 long-press (1366-1389),
   multi-select entry (621-624). Fix S each: visible captions/targets.
5. LOW-MED day-1 trial: EmptyDiary "Copy yesterday" renders unconditionally — guaranteed
   dead tap for day-1 users (EmptyDiary 45-55; copyYesterday discovers after tap). Fix S.
6. GOOD: offline degrades honestly (waterfall 144-200, ScanLabel copy). Preserve.
7. GOOD: no jargon leaks in nutrition; targets screen explains inline (1154-1208).

ELEVATION: home food entry decision (leaner "Log lunch" deep-link into inferred slot);
day swipe; meals/recipes into ranked relog pool; drop confirm; visible long-press hints;
rotating "log again" tray above meal cards (most-likely repeat by time of day, no valence
colour, Pro-gated); hide copy-yesterday when empty; remember skip-name choice in OCR
(session default, S).

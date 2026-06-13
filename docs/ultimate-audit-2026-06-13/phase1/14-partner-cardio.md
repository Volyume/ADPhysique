# Phase 1 inventory — Partner & Cardio (2026-06-13)

Files read in full: `src/screens/PartnerScreen.js`, `src/screens/LogCardioScreen.js`,
`src/screens/CardioHistoryScreen.js`, plus `src/styles/theme.js`,
`src/navigation/RootNavigator.js`, `src/components/Button.js`,
`src/components/SegmentedControl.js`, `src/components/SearchBar.js` (for token + guard + touch-target resolution).

Token resolution reference (theme.js): `fontSize.micro`=10 (theme.js:257), `fontSize.xs`=11 (theme.js:258),
`fontSize.sm`=13 (theme.js:259), `fontSize.md`=16 (theme.js:260), `fontSize.lg`=17 (theme.js:261),
`fontSize.xl`=20 (theme.js:262), `fontSize.xxl`=24 (theme.js:263), `fontSize.xxxl`=32 (theme.js:264).
`spacing.xxs`=2, `xs`=4, `sm`=8, `md`=12, `lg`=16, `xl`=24, `xxl`=32, `xxxl`=48 (theme.js:228-239).
`radius.sm`=6, `md`=10, `lg`=14, `full`=999 (theme.js:241-248).
Type roles (theme.js:373-410): `type.title` = fontSize.lg (17) / weight 600 (theme.js:390-393);
`type.body` = fontSize.md (16) / weight 400 (theme.js:394-397); `type.label` = fontSize.sm (13) / weight 500 (theme.js:402-405);
`type.caption` = fontSize.xs (11) / weight 400 (theme.js:406-409); `type.num('title')` = fontSize.lg (17) / weight 600 + tabular-nums (theme.js:390-393, 417-421).

---

SCREEN: Partner (Training partner)
WHAT IT IS: The training-partner home: a low-signal accountability feature where one user pairs with a partner and each sees only derived weekly signals (training "ticks", a shared streak, resting status, cheers) and never any session/body/food detail (PartnerScreen.js:1-15, SEES/NEVER_SEES PartnerScreen.js:33-45).
WHAT IS ON IT: The screen renders one of four mutually exclusive states off `p.rowState`:
- Loading: an empty SafeAreaView while `p.loading` (PartnerScreen.js:85).
- PAIRED (`active` or `resting`, PartnerScreen.js:88, 95): a live card with the partner's first name (PartnerScreen.js:99; falls back to "Your partner" PartnerScreen.js:87), an optional shared-streak chip (PartnerScreen.js:100-102), a two-column week row — "You" + your ticks label (PartnerScreen.js:106-109), a vertical divider (PartnerScreen.js:110), and the partner column showing either a moon-icon + "Resting this week" when `rowState==='resting'` (PartnerScreen.js:113-117) or their ticks label (PartnerScreen.js:119). Below: a full-width "Cheer" button that becomes "Cheer sent" + disabled when `!p.cheerEnabled` (PartnerScreen.js:124-135), an optional caption "<partner> cheered you recently." when `p.lastReceived` (PartnerScreen.js:137-139), and an "End partnership" row with exit icon (PartnerScreen.js:142-145).
- PENDING (PartnerScreen.js:150): an hourglass icon, "Invitation sent. Waiting for your partner." text, and a "Cancel" link (PartnerScreen.js:151-157).
- EMPTY or ENDED (PartnerScreen.js:161): optional "Partnership ended." note when ended (PartnerScreen.js:163-165); a "Train with a partner" section with a pitch paragraph (PartnerScreen.js:167-174); a "What you each see" card listing the 4 SEES bullets with green ticks (PartnerScreen.js:177-184, 33-38); a "What neither of you will ever see" card listing the 5 NEVER_SEES bullets with warning crosses plus a fine-print line about ending/deletion (PartnerScreen.js:186-197, 39-45); and a pairing-controls card: a "Share a consistency streak" toggle (Switch) (PartnerScreen.js:201-208), a cap note "You can have one partner on Free. Go Pro for up to three." shown when `!p.canAdd` (PartnerScreen.js:210-212), a "Create invite" primary button (with spinner while busy) (PartnerScreen.js:214-220), an "Or enter a partner's code" label (PartnerScreen.js:222), and a code-input row with a TextInput ("Invite code") + a "Join" button (PartnerScreen.js:223-235).
Confirm dialogs: unpair via `appAlert` "End partnership?" (PartnerScreen.js:78-83).
NAVIGATION: Registered as `Stack.Screen name="Partner"` in the Progress stack with header title "Training partner" (RootNavigator.js:350, `ProgressStack`). It is the ONLY registration — not in any other stack. The header comment in the file says it is reached "from the Progress hub tile + the Consistency slim row" (PartnerScreen.js:6-8); those push sites are in AnalyticsScreen/ConsistencyScreen and NOT verified here. The screen itself pushes nowhere (no `navigation` prop used; all actions are in-screen via the `usePartners` hook).
GATING: **NOT gated.** The `Partner` route is registered with the raw `PartnerScreen` component, not `withProGuard` (RootNavigator.js:350; contrast the gated routes at RootNavigator.js:149-162). Within the screen, the free/Pro distinction is a soft capacity cap only: `p.canAdd` (from `usePartners`) drives the "one partner on Free / up to three on Pro" note and disables Create invite (PartnerScreen.js:210-216). Per CLAUDE.md the partner feature is "free 1 partner / Pro up to 3" (PartnerScreen.js:14), so the screen is reachable on Free with a 1-partner limit. The actual cap logic lives in `usePartners` (hooks/usePartners.js) — **NOT read here; cap enforcement NOT VERIFIED IN THIS FILE.**
CURRENT STRENGTHS: Clean state machine — exactly one of loading/paired/pending/empty-ended renders. The privacy receipt (explicit SEES vs NEVER_SEES lists + deletion fine print) is unusually transparent and trust-building (PartnerScreen.js:177-197). "Resting" is handled as a first-class non-fail state (PartnerScreen.js:113-117), matching the stated design rule (PartnerScreen.js:13). All interactive elements carry `accessibilityRole`/`accessibilityLabel`. Cheer button has clear sent/disabled feedback (PartnerScreen.js:132-134). Error paths use toasts with plain-language copy (PartnerScreen.js:59, 69).
CURRENT WEAKNESSES: The empty/ended state is long — pitch + 4-bullet card + 5-bullet card + fine print + toggle + create + code row all stack in one ScrollView (PartnerScreen.js:161-239), heavy for a first encounter. There is no visible explanation on-screen of what a "tick" is until you are already paired (the SEES bullet "Ticks only, like 3 of 4" at PartnerScreen.js:34 is the only definition). The shared-streak chip and the toggle both reference a "streak" but the toggle only appears pre-pairing, so a paired user cannot change it from here. No loading text during `p.loading` — just a blank screen (PartnerScreen.js:85), which reads as a flash of emptiness.
NEWBIE QUESTION: Mostly yes. The pitch ("One person who sees you showed up... No numbers, no comparison, no feed", PartnerScreen.js:170-173) and the SEES/NEVER_SEES lists explain the concept in plain terms. A first-timer may not know what "3 of 4 ticks" means until they have a plan with planned sessions, and "shared streak, counted in weeks" assumes they understand the weekly cadence. The invite/code mechanics (create vs join) are standard and clear.
ATHLETE QUESTION: Partially. An experienced competitor gets a deliberately minimal, no-metrics accountability nudge — which is the point — but there is nothing here that satisfies a competitor's appetite for data (by design, since weights/sets/reps are explicitly never shared, PartnerScreen.js:39-40). It works as a consistency companion, not a training-comparison tool. The 3-partner Pro cap is reasonable for a coach/training-group use case.
LOCATION QUESTION: Reasonable but arguably buried. It lives only in the Progress stack (RootNavigator.js:350), reached via a Progress tile / Consistency row per the header comment (PartnerScreen.js:6-8). Pairing the partner feature with consistency/progress is coherent (it is an accountability surface), but a social/accountability feature reachable only through a Progress sub-tile is easy to miss; there is no top-level or Home entry point registered.
VISUAL + USABILITY:
- Font sizes:
  - Section labels ("Train with a partner" etc.): `type.label` = fontSize.sm (13) (PartnerScreen.js:249, sectionLabel; theme.js:402-405).
  - Pitch paragraph: `type.body` = fontSize.md (16), lineHeight overridden to 22 (PartnerScreen.js:254; theme.js:394-397).
  - Partner name (live card): fontSize.lg (17), weight bold (PartnerScreen.js:262).
  - Streak chip text: fontSize.sm (13), weight bold (PartnerScreen.js:264).
  - Week column label ("You"/name): `type.caption` = fontSize.xs (11) (PartnerScreen.js:271; theme.js:406-409).
  - Week ticks value: `type.num('title')` = fontSize.lg (17) + tabular-nums (PartnerScreen.js:272; theme.js:390-393, 417).
  - "Resting this week" text: fontSize.sm (13) (PartnerScreen.js:274).
  - Cheer button label: `type.label` = fontSize.sm (13) (PartnerScreen.js:281).
  - "cheered you recently" caption: fontSize.sm (13) (PartnerScreen.js:283).
  - "End partnership" text: fontSize.sm (13), weight 600 (PartnerScreen.js:288).
  - Pending text: `type.body` = fontSize.md (16) (PartnerScreen.js:296).
  - "Cancel" link: fontSize.sm (13), weight 600 (PartnerScreen.js:297).
  - "Partnership ended." note: fontSize.sm (13) (PartnerScreen.js:298).
  - Bullet text (SEES/NEVER): `type.body` = fontSize.md (16) (PartnerScreen.js:304).
  - Fine print: fontSize.sm (13), lineHeight 19 (PartnerScreen.js:305).
  - Toggle label: `type.body` = fontSize.md (16) (PartnerScreen.js:309).
  - Cap note: fontSize.sm (13) (PartnerScreen.js:310).
  - Primary "Create invite" text: `type.label` (13) overridden to fontSize.md (16) (PartnerScreen.js:316).
  - "Or enter a partner's code": fontSize.sm (13) (PartnerScreen.js:317).
  - Code input text: `type.body` = fontSize.md (16) (PartnerScreen.js:322).
  - "Join" button text: `type.label` = fontSize.sm (13) (PartnerScreen.js:328).
- Touch targets:
  - Cheer button: `minHeight: 48` (PartnerScreen.js:278) — PASS.
  - "End partnership" row: `minHeight: 44` (PartnerScreen.js:287) — PASS (at the 44 floor).
  - "Cancel" invite link: text-only with `hitSlop={8}` (PartnerScreen.js:154); fontSize.sm (13) text + 8px slop is below a comfortable 44px target — **FLAG: likely < 44px effective.**
  - Create invite primary: `minHeight: 50` (PartnerScreen.js:313) — PASS.
  - Code TextInput: `minHeight: 44` (PartnerScreen.js:322) — PASS.
  - "Join" button: `minHeight: 44` (PartnerScreen.js:327) — PASS.
  - Switch: native RN Switch (PartnerScreen.js:203-207), OS-default target.
- Information density: Paired/pending states are light. The empty/ended state is dense (≈6 stacked blocks, PartnerScreen.js:161-239).
- Clean or cluttered: Paired view is clean and well-aligned (two-column week row with divider, PartnerScreen.js:105-122). Empty state is content-heavy but logically grouped into cards.
- Most important action prominent: In the paired state the "Cheer" amber filled button is correctly the most prominent element (PartnerScreen.js:124-135). In the empty state the amber "Create invite" button is the primary action and is visually dominant (PartnerScreen.js:214-220); the "Join with code" path is a secondary outlined button (PartnerScreen.js:324-328) — correct hierarchy.
- Small/standard/large behaviour: Whole screen is inside a `ScrollView` (PartnerScreen.js:92) with `paddingBottom: spacing.xxxl` (48) (PartnerScreen.js:247), so the long empty state scrolls on small devices. Edges `['bottom']` only (PartnerScreen.js:91) — relies on the navigator header for top inset (header title set at RootNavigator.js:350). Font sizes are all token-based so they scale with the larger-text accessibility setting (theme.js:325-337). Fixed `width: 18` on bullet tick/cross glyphs (PartnerScreen.js:302-303) will not scale with larger text and could clip an enlarged glyph.

---

SCREEN: LogCardio (Log cardio / Pick activity)
WHAT IT IS: A modal for manually logging a cardio session: pick an activity (favourites/recents first, then category-grouped library, or search), set duration + intensity, see an estimated calorie burn as feedback, and save. The estimate is explicitly never added to the food/calorie target (LogCardioScreen.js:1-11, footnote 225-228).
WHAT IS ON IT: Header bar with a close (X) button, a title that reads "Pick activity" before an activity is chosen and "Log cardio" after (LogCardioScreen.js:153-159), and a spacer.
- PICKER state (no activity, LogCardioScreen.js:161-192): a SearchBar ("Search cardio") (LogCardioScreen.js:163-165); when searching, a flat filtered ActivityList (LogCardioScreen.js:167-168); otherwise a "Your cardio" section of favourites (only if any, LogCardioScreen.js:171-175), a "Recent" section (only if any, LogCardioScreen.js:176-180), then one section per cardio category (Walking, Running, Cycling, Rowing, Swimming, Machines, HIIT, Conditioning, Sport, Other — labels LogCardioScreen.js:29-33) each with its category icon (LogCardioScreen.js:37-42) and an ActivityList (LogCardioScreen.js:181-189). Each activity row = category icon + display name + chevron-forward (LogCardioScreen.js:251-255).
- DETAIL state (activity chosen, LogCardioScreen.js:193-233): a "chosen" row showing the activity display name + "<Category> · tap to change" meta, tappable to reset to the picker, with a star favourite toggle (LogCardioScreen.js:195-203); a "Duration" label + a stepper (minus button, "<n> min" value, plus button; clamps 5–300 in 5-min steps) (LogCardioScreen.js:205-214); an "Intensity" label + a SegmentedControl with Easy/Moderate/Hard (LogCardioScreen.js:44-48, 216-217); when an estimate is available, a flame icon + "Burned about <n> kcal" row and the footnote "Already counted. This isn't added to your calorie target, your weight trend includes everything you burn." (LogCardioScreen.js:219-229); and a "Save" button (LogCardioScreen.js:231).
Data behaviour: prefills duration/intensity from the user's last log of that activity (LogCardioScreen.js:62-103); only estimates kcal when bodyweight is known, no silent default (LogCardioScreen.js:55-57, 105-107); save inserts a cardio log and `navigation.goBack()` (LogCardioScreen.js:119-141); error shows appAlert "Couldn't log / Try again." (LogCardioScreen.js:138).
NAVIGATION: Registered THREE times as `Stack.Screen name="LogCardio"`, each wrapped in the Pro guard `GatedLogCardio` and presented as a modal: in `DiaryStack` (RootNavigator.js:251-255), `HomeStack` (RootNavigator.js:303), and `ProgressStack` (RootNavigator.js:357). The comments state it is launched from the Train tab's CardioCard (RootNavigator.js:301-302) and the Progress tab (RootNavigator.js:355-356); registering per-stack keeps save/back returning to the originating tab. Reached via `route.params` that may carry `activityId` (prefill, LogCardioScreen.js:66) and `entryDate` (LogCardioScreen.js:124). It leads nowhere forward — on save or close it `goBack()`s (LogCardioScreen.js:136, 154). The push sites (CardioCard etc.) are NOT in these files and NOT verified here.
GATING: **Pro.** Wrapped by `withProGuard` as `GatedLogCardio = withProGuard(LogCardioScreen, 'Cardio')` (RootNavigator.js:161) and that gated component is used at every registration (RootNavigator.js:253, 303, 357). The comment confirms cardio is gated directly at every entry point because it is registered in multiple stacks (RootNavigator.js:158-162). Cardio is listed under Pro in CLAUDE.md. Guard internals live in `src/components/ProGate.js` — NOT read here.
CURRENT STRENGTHS: Activity-first design with favourites + recents + per-activity prefill makes repeat logging fast (LogCardioScreen.js:62-103). The "no silent 75kg" rule (estimate suppressed unless bodyweight known, LogCardioScreen.js:55-57, 105-107) is an honest data choice. The footnote correctly prevents the common double-counting confusion of "burned calories added back to target" (LogCardioScreen.js:225-228), consistent with the energy-balance model. Category icons aid visual scanning (LogCardioScreen.js:37-42, 252). Good accessibility labels throughout. Stepper clamps prevent nonsensical durations (LogCardioScreen.js:207, 211).
CURRENT WEAKNESSES: Duration is stepper-only in 5-minute increments (LogCardioScreen.js:207-213) — logging an exact 37-minute run is impossible; no direct numeric entry. When bodyweight is unknown the kcal row and footnote simply vanish (LogCardioScreen.js:219) with no prompt telling the user why or how to add weight, so the estimate silently disappears. The picker can be a long scroll (10 categories, LogCardioScreen.js:181) with no sticky section index. Intensity options are three coarse buckets only (LogCardioScreen.js:44-48).
NEWBIE QUESTION: Largely yes. "Pick activity → set time → set effort → save" is an intuitive flow, and Easy/Moderate/Hard is friendlier than METs. The footnote about calories not being added is the one subtle concept a beginner may not fully grasp, but it is written plainly. A newbie with no bodyweight set will see no calorie feedback and no explanation, which could confuse.
ATHLETE QUESTION: Partially. Favourites/recents and per-activity prefill suit a competitor logging the same conditioning regularly. But the 5-minute-only duration granularity and the three-bucket intensity will frustrate anyone wanting precise session logging; there is no pace/distance/HR input. The "estimate is feedback, not a target" stance is correct for a serious cut. METs are computed under the hood (`metFor`, LogCardioScreen.js:130) but not surfaced.
LOCATION QUESTION: Sensible. Cardio is logged from where the user already is — Train (Home), Diary, and Progress all register it as a modal returning to the origin (RootNavigator.js:251-255, 303, 357), so the action lands wherever it was invoked. Presenting it as a modal rather than a buried tab matches a quick-log action.
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` = fontSize.lg (17), weight 600 (LogCardioScreen.js:268; theme.js:390-393).
  - Section labels ("Your cardio", "Recent", categories): fontSize.xs (11), weight bold, uppercase, letterSpacing 1 (LogCardioScreen.js:272-275).
  - Activity row name: `type.body` = fontSize.md (16) (LogCardioScreen.js:281; theme.js:394-397).
  - Chosen activity name: `type.title` = fontSize.lg (17) (LogCardioScreen.js:287).
  - Chosen meta ("<Category> · tap to change"): fontSize.sm (13) (LogCardioScreen.js:288).
  - Field labels ("Duration"/"Intensity"): fontSize.sm (13) (LogCardioScreen.js:289).
  - Stepper +/- glyphs: fontSize.xxl (24), weight bold (LogCardioScreen.js:295).
  - Stepper value ("<n> min"): `type.title` = fontSize.lg (17) + tabular-nums (LogCardioScreen.js:296).
  - kcal text ("Burned about <n> kcal"): fontSize.sm (13) + tabular-nums (LogCardioScreen.js:298).
  - Footnote: fontSize.xs (11), lineHeight 16 (LogCardioScreen.js:299).
  - SegmentedControl labels: `type.label` = fontSize.sm (13) (SegmentedControl.js:42; theme.js:402-405).
  - "Save" button: Button size="lg" → fontSize.md (16), weight bold (Button.js:34, 106; LogCardioScreen.js:231).
  - SearchBar input: max(16, fontSize.md) = 16 (SearchBar.js:73).
- Touch targets:
  - Close (X) header button: icon size 24 with `hitSlop={12}` (LogCardioScreen.js:154-155) → ≈48px effective — PASS.
  - Activity rows: `paddingVertical: spacing.md` (12) + 18px icon ≈ 42px row height (LogCardioScreen.js:276-279) — **borderline, slightly under 44px.**
  - Chosen row: `padding: spacing.md` (12) (LogCardioScreen.js:284) — adequate (multi-line content).
  - Star favourite toggle: 22px icon with `hitSlop={10}` (LogCardioScreen.js:200-201) → ≈42px — **borderline.**
  - Stepper buttons: `width: 56, height: 52` (LogCardioScreen.js:294) — PASS.
  - SegmentedControl segments: `paddingVertical: spacing.sm + 2` (10) (SegmentedControl.js:38-40) → ≈33px tall — **FLAG: < 44px.**
  - Save button (lg): paddingVertical spacing.lg (16) + 16px text ≈ 48px (Button.js:34) — PASS.
- Information density: Picker is medium-to-high (many rows across up to 10 categories). Detail view is low — a handful of controls with breathing room.
- Clean or cluttered: Both states are clean; the detail view in particular is uncluttered. The picker relies on uppercase micro section labels to break up a long list.
- Most important action prominent: In the detail view the amber "Save" button is the clear primary action (LogCardioScreen.js:231). In the picker the primary action is choosing an activity; rows are visually uniform with no single dominant element, which is appropriate for a list.
- Small/standard/large behaviour: Both states use a `ScrollView` with `keyboardShouldPersistTaps="handled"` and `paddingBottom: spacing.xxxl` (48) (LogCardioScreen.js:162, 194, 269). SafeAreaView edges `['top']` (LogCardioScreen.js:152). Stepper button sizes are FIXED (56×52, LogCardioScreen.js:294) and will not scale with larger text, though the value text inside will, risking overflow. The fixed 24px header spacer (LogCardioScreen.js:158) balances the close button. SegmentedControl is flex-based and adapts to width. On a small 5.4" device the up-to-10-category picker requires significant scrolling.

---

SCREEN: CardioHistory (Cardio history)
WHAT IT IS: A reverse-chronological list of logged cardio sessions, grouped by day, each row showing activity, duration, intensity, and the estimated calories; each row has a small delete (soft delete so it syncs) (CardioHistoryScreen.js:1-10).
WHAT IS ON IT: Header bar with a back (chevron) button, title "Cardio history", and a spacer (CardioHistoryScreen.js:70-76). When there are no sessions, an EmptyState with heart icon, title "No cardio yet", text "Sessions you log show up here." (CardioHistoryScreen.js:78-84). Otherwise a SectionList grouped by day: each section header is the pretty date ("Mon 9 Jun" style, en-GB weekday/day/month, CardioHistoryScreen.js:26-33, 89-91); each row shows the activity name, a meta line "<n> min · <Easy|Moderate|Hard>" plus " · ~<n> kcal" when an estimate exists (CardioHistoryScreen.js:92-100, INTENSITY_LABEL 24), and a trash-outline delete button (CardioHistoryScreen.js:101-103). Delete triggers an appAlert "Remove this session?" with the activity + duration, Cancel/Remove (CardioHistoryScreen.js:57-66). The list reloads on focus (CardioHistoryScreen.js:55) and after a delete (CardioHistoryScreen.js:63).
NAVIGATION: Registered TWICE as `Stack.Screen name="CardioHistory"`, wrapped as `GatedCardioHistory` (NOT a modal, `headerShown:false`): in `DiaryStack` (RootNavigator.js:256-260) and `ProgressStack` (RootNavigator.js:358). The file header says it is "Reached from the Progress cardio card" (CardioHistoryScreen.js:7). It leads nowhere forward — the only navigation is the back button `navigation.goBack()` (CardioHistoryScreen.js:71). The push site (the Progress cardio card) is not in these files and NOT verified here.
GATING: **Pro.** Wrapped by `withProGuard` as `GatedCardioHistory = withProGuard(CardioHistoryScreen, 'Cardio')` (RootNavigator.js:162) and that gated component is used at both registrations (RootNavigator.js:259, 358). Cardio is Pro per CLAUDE.md. Guard internals in `src/components/ProGate.js` — NOT read here.
CURRENT STRENGTHS: Simple, fast, and honest — a plain grouped list with day headers, reads at a glance. Soft delete preserves sync integrity (CardioHistoryScreen.js:62-63, per header note). Reloads on focus so it reflects newly logged sessions without manual refresh (CardioHistoryScreen.js:55). Delete is guarded by a confirm dialog that names the session (CardioHistoryScreen.js:57-66), reducing accidental loss. Good empty state and accessibility labels. The meta line uses tabular-nums so durations/kcal align (CardioHistoryScreen.js:131).
CURRENT WEAKNESSES: No summary or aggregation — no weekly totals, no count, no total time/kcal, just a flat list, so a user cannot see trends here. No way to edit a session (only delete + re-log). No pull-to-refresh affordance (relies on focus reload only). The 200-row cap (`getRecentCardioLog(userId, 200)`, CardioHistoryScreen.js:43) is silent — a heavy user's older sessions simply won't appear with no indication. The day-header background is `colors.background` (CardioHistoryScreen.js:124) but the header is not a true sticky section header style, so on scroll it may not visually pin cleanly (SectionList default stickiness applies).
NEWBIE QUESTION: Yes. A dated list of "what cardio I did" is immediately understandable; "~<n> kcal" with the tilde reads as an estimate. Nothing here needs explanation.
ATHLETE QUESTION: Partially. A competitor can confirm what they logged, but there is no aggregation, no weekly conditioning volume, no trend — so it functions as a ledger, not an analysis tool. For serious cardio tracking the lack of totals and the inability to edit (only delete) are limitations.
LOCATION QUESTION: Reasonable. It sits in both the Diary and Progress stacks (RootNavigator.js:256-260, 358), reachable from the Progress cardio card per the header (CardioHistoryScreen.js:7). A history/log view belongs in Progress and Diary, so the placement is coherent; it is correctly a pushed sub-screen, not a tab.
VISUAL + USABILITY:
- Font sizes:
  - Header title: `type.title` = fontSize.lg (17), weight 600 (CardioHistoryScreen.js:119; theme.js:390-393).
  - Day section header: fontSize.xs (11), weight bold, uppercase, letterSpacing 1 (CardioHistoryScreen.js:121-125).
  - Activity name (row): `type.body` = fontSize.md (16) (CardioHistoryScreen.js:130; theme.js:394-397).
  - Meta line ("<n> min · ... · ~<n> kcal"): fontSize.sm (13) + tabular-nums (CardioHistoryScreen.js:131).
  - EmptyState title/text: rendered by `src/components/EmptyState.js` — **NOT read; sizes NOT DETERMINED IN CODE here.**
- Touch targets:
  - Back (chevron) header button: icon 24 with `hitSlop={12}` (CardioHistoryScreen.js:71-72) → ≈48px — PASS.
  - Row delete (trash) button: icon 18 with `hitSlop={10}` (CardioHistoryScreen.js:101-102) → ≈38px effective — **FLAG: < 44px.**
  - Rows themselves are not tappable (no row onPress; only the trash icon is interactive) (CardioHistoryScreen.js:92-104).
- Information density: Low to medium — one line of primary text + one meta line per row, grouped by day header. Comfortable.
- Clean or cluttered: Clean. Each row is a left text block + a right trash icon with `gap: spacing.md` (12) and a bottom hairline border (CardioHistoryScreen.js:126-129).
- Most important action prominent: This is a read/review screen; the most "important" interactive element is the per-row delete, which is correctly de-emphasised (muted small trash icon, CardioHistoryScreen.js:102) so it doesn't invite accidental taps. Appropriate hierarchy for a history view.
- Small/standard/large behaviour: Uses a `SectionList` (CardioHistoryScreen.js:85-106) which virtualises and scrolls on any size; `contentContainerStyle` padding `spacing.lg` (16) + `paddingBottom: spacing.xxxl` (48) (CardioHistoryScreen.js:120). SafeAreaView edges `['top']` (CardioHistoryScreen.js:69). All font sizes token-based so they scale with larger text (theme.js:325-337). No fixed-height rows (padding-based, CardioHistoryScreen.js:126-129), so rows grow gracefully with larger text. The fixed 24px header spacer (CardioHistoryScreen.js:75) balances the back button.

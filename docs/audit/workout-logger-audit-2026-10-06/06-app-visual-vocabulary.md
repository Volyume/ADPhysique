# A6: the visual vocabulary of the rest of Volyume (read-only audit)

Lane A6 of the workout logger audit, 2026-10-06. Branch `claude/workout-logger-audit-redesign-iykogt`, tree as found. Nothing under `src/` was touched.

Citation form is `file:line`. Paths are relative to `src/` unless they start `docs/` or `eslint.config.js`. OBSERVED is what the line does. SUGGESTS marks my inference. AMBIG points at a numbered item in section 11.

## Method and limits

- Read in full (primitives): `components/ScreenHeader.js`, `BackHeader.js`, `ModalHeader.js`, `Card.js`, `Button.js`, `Chip.js`, `SectionLabel.js`, `PressableCard.js`, `BottomSheet.js`, `EmptyState.js`, `Toast.js`, `Skeleton.js`, `InfoTooltip.js`, plus `HeaderAction`, `SearchBar`, `SegmentedControl`, `WindowChips`, `Stepper`, `TextField`, `NavRow`, `OptionCard`, `AppAlert`, `CollapsibleSection`, `RollingNumber`, `AnimatedEntrance`, `AnimatedRow`, `HintCaption`, `FieldError`, `LegendRow`, `Dropdown`, `PeekMenu`, `SettingsPrimitives`, `VolyumeTabBar`, `PRCelebration`; `lib/haptics.js`, `styles/theme.js:1-969`, `styles/layout.js`, `hooks/useTheme.js`, `docs/rules/styling.md:1-296`, `docs/DESIGN_SYSTEM.md:1-480`, `eslint.config.js:1-330`.
- Read in full (screens): `screens/AnalyticsScreen.js:1-895` (Progress root), `screens/RecoveryScreen.js:1-45` with `components/ReadinessCards.js:1-1094`, `MuscleRecoveryList.js:1-598`, `NextInPlanCard.js`, `FatigueTrendCard.js`, `BodyDiagramHeatmap.js:1-60,435-634`; `components/coachOutput/CoachOutputCards.js:1-225`; `components/food/MacroRings.js`, `EntryRow.js`, `MealSection.js`, `EmptyDiary.js`, `FeatureRow.js`, `FoodRow.js`, `FoodDetailSheet.js:240-663`, `QuickAddSheet.js`; Today parts `components/TodayStrip.js`, `home/TodayLine.js`, `home/EvidencePanel.js`, `HomeLastSessionCard.js`, `HomeChangeWorkoutSheet.js`, `HomeBlockShapeSheet.js`, `HomeWelcomeCard.js`, `RecoveryStateCard.js`, `HomeCommunityTodayRow.js`, `HomeCommunityIntroCard.js`; Community `components/community/CommunityHeaderAction.js`, `Eyebrow.js`, `DayDots.js`, `PersonRow.js`.
- Read in part: `screens/HomeScreen.js:1-330,1525-1660,2380-3957` (render and styles complete); `screens/CoachOutputScreen.js:1-700,805-930,2580-2640,2696-2735,2780-3705` (cards, views, render, styles; the ED lockout blocks at 700-805 not read, their styles at 3520-3622 were); `screens/DiaryScreen.js:660-700,840-912,1160-1330,1376-2652`; `screens/FoodSearchScreen.js:470-668,700-1272`; `screens/CommunityHubScreen.js:540-700,840-950`; `lib/shareCard/drawShareCard.js:1-260,660-1400,1636-1785` (the unread 260-660 and 1400-1636 are photo and layout plumbing); hero blocks only of `screens/LiftProgressScreen.js:684-767` and `screens/ExerciseDetailScreen.js:895-960,1560-1600`.
- Read in part, second pass (sheets, flows, lists): `components/PlanPreviewSheet.js:138-406`, `FeedbackSheet.js:228-330`, `community/MenuSheet.js`, `ReportSheet.js`, `ProfileMenuSheet.js`, `SkeletonPersonRow.js`, `food/DiaryDatePicker.js` and `EatenTimePicker.js` (modal bodies); the first lines after `<BottomSheet` in `food/CalorieBankSheet.js`, `CuratedMealSheet.js`, `RecipeDetailSheet.js`, `SavedMealDetailSheet.js`, `MacroBreakdownSheet.js`; `screens/PlanLibraryScreen.js:660-790`, `CommunitySearchScreen.js:100-215`, `LiftProgressScreen.js:366-392, 455-490, 640-690, 845-870`, `SettingsDataScreen.js:21-45, 266-320, 396-424`, `SettingsAccountScreen.js`, `CommunityHubScreen.js:780-850`, `HomeScreen.js:2740-2800, 3400-3480`; `hooks/useAccountActions.js:155-215`; `screens/FoodSearchScreen.js:70-112, 383-500, 560-660`. `components/ExercisePickerModal.js` was not read.
- Searched, not read line by line, because they hold no JSX (a grep for View, Text, Touchable, Ionicons, Card and Button tags returned 0): `HomeScreen.js:330-2380`, `CoachOutputScreen.js:930-2580`, `DiaryScreen.js:131-1160,1330-1420`, `FoodSearchScreen.js:87-700`. Every toast, appAlert, haptics and Animated call in those ranges was grepped and the user-visible ones read in place.
- Not read, per brief: `ActiveWorkoutScreen`, `components/workout/*`, `WorkoutSummaryScreen`, `WorkoutHistoryScreen`, `ActiveSessionMiniBar` (A1). Counts that span `screens` and `components` include those files as counts only. One grep hit on `WorkoutSummaryScreen.js` is marked "grep only".
- Counts of "files importing X" are `grep -rlE` over ES imports in `screens`, `components`, `navigation`, tests excluded.

## 1. The shared primitives

Paths in this section are under `components/` unless they start `screens/`, `lib/` or `styles/`.

### 1a. Chrome and containers

| Primitive | OBSERVED anatomy, props, sizes | Radius, border, fill | Files |
|---|---|---|---|
| `ScreenHeader` | props `title, subtitle, right` (ScreenHeader.js:49). Title `type.h1` 32 InterDisplay-Bold, one line, header role (:56-62). `right` defaults to a 34px circle brand-V chip, 19px glyph (:38-47, 64). Row minHeight 40 (:90). Subtitle `bodySm` `textMuted` (:67-71). Right slots seen: Today = Community pill (HomeScreen.js:2588), Nutrition = Trends pill (DiaryScreen.js:1450-1459), Coach = gear plus subtitle (screens/YouScreen.js:315-329), Train and Progress = the V (screens/PlansScreen.js:1241, AnalyticsScreen.js:404) | no fill, no border; chip is a circle on `chipInk` black in both themes (ScreenHeader.js:98-104; styles/theme.js:149-156) | 5, the five tab roots |
| `BackHeader` | props `title, onBack, right` (BackHeader.js:37). Chevron-back 24 `textPrimary` in a 48 column, title `type.title` 17 Medium centred one line with header role, 48 min right column (:62-71, 88-101). Back is TouchableOpacity, no spring | padding lg x md, bottom hairline `borderSubtle` (:80-87) | 69 (RecoveryScreen.js:29, CoachOutputScreen.js:3013, CommunityHubScreen.js:853) |
| `ModalHeader` | props `title, onClose, closePosition='right', rightAccessory` (ModalHeader.js:21). Close X 24 on the chosen side, 48 slots, title `type.title` centred (:7-19, 43-63) | same chrome as BackHeader (:44-51) | 23 (FoodSearchScreen.js:912) |
| `HeaderAction` and `CommunityHeaderAction` | labelled pill in the header's right slot: glyph 18 amber plus `captionStrong` label, minHeight 44 (HeaderAction.js:21-57; community/CommunityHeaderAction.js:105-117). Community adds an amber dot, or an amber numeric badge capped "9+" (:80-98, 124-145) | `surface2`, hairline `border`, `circle(44)` (HeaderAction.js:43-53) | 1 file imports `HeaderAction` (DiaryScreen.js:1453); the Community pill is on Today (HomeScreen.js:2588) |
| `Card` | props `tone, elevated, surface, radius, borderless, padding, onPress, onLongPress, onPressWithLayout` (Card.js:21-59). Default fill `surface`, radius `lg` 16, padding `lg` 16, border 1 `borderSubtle` (:39-43, 101, 152-155). `elevated` = `surfaceElevated` (:84-86). `padding="none"` for list cards whose rows self-pad (:87). `tone` draws the border as `withAlpha(tone, alpha.mid)` for primary, success, warning, error, gold, neutral (:66-73, 107). Any press prop swaps the root to `PressableCard`, role button (:111-130). Light theme only: `shadow.card` (:102) | see left | 62 |
| `EmptyState` | props `icon, title, text, actionLabel, onAction, secondaryLabel, onSecondary, ghost, onDismiss, compact, busy` (EmptyState.js:33-47). Card `surface`, 1px `borderSubtle`, padding xxl (compact lg), centred, gap md (:119-134). Icon sits in a 52px (44 compact) full-radius circle, `primaryBg` fill, `alpha.edge` amber ring, amber glyph 28 (24) (:142-152, 73-79). Title `type.title`, text `bodySm` `textSecondary` (:157-167). Actions are two `Button size="md" fullWidth={false}`, default plus `secondary` (:91-114). `ghost` is dashed, transparent, 0.75 opacity, grey glyph (:135-141, 153-156) | radius `lg` (:127) | 46 |
| `SectionLabel` | `variant` overline (default) or title, `tone` default, muted or primary, `heading` opt-in header role (SectionLabel.js:10-17, 28-31). Overline = `type.overline` 11 Medium UPPERCASE +0.5 tracking, `textSecondary`; muted = `textMuted`; primary = amber (:39-44; styles/theme.js:643-646). Title variant = `type.title` | none | 55 |
| `Eyebrow` (Community only) | caption 11, uppercase, `letterSpacing.overline`, `textMuted`; paddingTop xl, bottom sm; optional one trailing action in `type.label` `textSecondary`; zero amber, pinned by a guard (community/Eyebrow.js:62-78, 21-24) | none | Community screens |
| `NavGroup` and `NavRow` | one container for a run of rows (NavRow.js:78-93). Row = `PressableCard`, padding lg, gap md, 1px `borderSubtle` divider (:95-102). Tile 36, `surface2`, ink glyph 18 `textSecondary` (:103-110, 49-51). Label `bodyStrong`, sub `caption` `textSecondary`, chevron 16 `textMuted` (:111-115, 58). `selection()` on press (:40-42) | container radius `lg`, 1px `borderSubtle`, overflow hidden (:88-94); tile radius `md` | 3 (AnalyticsScreen.js:626-661) |
| `SettingRow` and `SettingsPage` | tile 34, `primaryBg`, amber glyph 18 (destructive: `errorBg` and `error`) (`components/SettingsPrimitives.js:37-45, 183-191`). Label `type.body`, sub `captionTight` `textMuted`, value `fontSize.sm`, chevron (:49-76). Row padding lg, gap lg, minHeight 48, 1px `borderSubtle` divider (:169-182). Page = BackHeader plus scroll, padding lg, gap sm (:92-112, 144-147) | section container radius `lg`, 1px `borderSubtle`, overflow hidden (:162-168); tile `md` | 23 import the file |
| `FeatureRow` | tile 34, fill `surface`, ink glyph 18; title `type.label`, sub `type.caption` `textSecondary`; chevron; minHeight 62 (food/FeatureRow.js:51-60, 63-88). `bordered` adds 1px `border`, `surface2` (:41-45, 73-76); the Diary uses the flush variant in one bordered list (DiaryScreen.js:2469-2474) | radius `md` | Diary, EmptyDiary |
| `CollapsibleSection` | header minHeight 48, `bodyStrong` title, chevron 18 `textSecondary`; children gap md (CollapsibleSection.js:39-53) | radius `lg`; edge `borderSubtle` frozen but `border` live (:44, 61) | 5 (CoachOutputScreen.js:3052-3058) |
| `LegendRow` | 12px swatch radius `xs` plus `captionTight` `textSecondary` label, wrapping, optional ramp and trailing InfoTooltip; no amber (LegendRow.js:36, 43-157) | swatch hairline in `border` | 4 |
| `DayDots` | seven dots Monday first; 6px (12px "cell" with weekday initials in `captionTight`); `accent` tone amber filled, `ink` tone `textSecondary` filled and hollow ring `border`, today ringed `textPrimary` (community/DayDots.js:81-158, 31-55) | circle | PlanWeekCard, PersonRow |

### 1b. Controls

| Primitive | OBSERVED anatomy, props, sizes | Radius, border, fill, press | Files |
|---|---|---|---|
| `Button` | variants (Button.js:61-79): `emphatic` = `primaryFill` fill, `onPrimary` ink, no border; `primary` (the DEFAULT, :100) = `surface2` fill, 1px `border`, `textPrimary` label, amber icons; `secondary` and `outline` = `surface` fill, 1px `border`, `textSecondary` label; `tertiary` = `primaryBg` fill, `alpha.edge` amber border, amber label and icon; `destructive` = `errorFill` fill, `onError` ink. Sizes (:81-87): `sm` pv 8, ph 12, 13px, icon 16; `md` pv 12, ph 16, 16px, icon 18 (default); `lg` pv 16, ph 16, 16px, icon 20. Label `fontFamily.semibold` (:310-312). Drawn height derives to about 34 (sm), 46 (md), 54 (lg) from :151 | radius `lg` for every size (:299); disabled opacity 0.5 (:309); `fullWidth` default true (:109, 272); sm gets hitSlop padded to 48 (:143-156); `state` idle, loading, success morphs by FadeIn and FadeOut `motion.state`, width-locked, success holds 900ms then `onSettled` (:89-93, 185-194, 233-253); `primary` and `emphatic` fire `selection()` on press (:196-202); `singleLine` for paired buttons (:119-125). Spring press via PressableCard (:255-277) | 116 |
| `Chip` | props `label, selected, onPress, icon, disabled, accessibilityRole, style, labelStyle, selectedLabelStyle` (Chip.js:17-40). Label `type.label` `textSecondary`; selected = `primaryBg` fill, `primary` border, `primary` label, icon 14 (:65-93) | pill `radius.full`, 1px `border`, padding md x sm, minHeight 48 Android and 44 iOS (:103-118); role button, radio or checkbox (:54-56); spring press | 46 |
| `SegmentedControl` | equal-width track, `equalWidth=false` content-sized; selected segment is an amber FILL (`primaryFill`, `onPrimary` text); label `type.label`; error border; role radiogroup (SegmentedControl.js:18-47, 49-69) | track `surface`, radius `md`, border 1.5 `border`, padding 3; segment radius `sm`-2; TouchableOpacity 0.85 | 6 |
| `WindowChips` | row of equal Chips, role tab; `inkSelected` draws the selected chip ink (`surface3`, `textPrimary` border and label) so a second control on a screen stays off amber (WindowChips.js:7-14, 52-68) | Chip geometry, minHeight 48 | 2 |
| `Stepper` | `value, onChange, min, max, step, unit, size` (Stepper.js:28-43). `md` 48x48 square buttons around a value in `fontFamily.bold` tabular `fontSize.lg`; `compact` 30x34 in a pill with hitSlop 8 (:140-187). role adjustable with increment and decrement actions (:76-83) | buttons radius `md`, `surface2`, 1px `border`; spring press | 4 (not the Diary: FoodDetailSheet builds its own 48x54, food/FoodDetailSheet.js:557-568) |
| `TextField` | `label, value, size sm/md/lg, leading, trailing, error, surface, keyboardType` (TextField.js:42-96). Label `captionStrong` `textSecondary` above (:133-137). Heights: sm 48, md 50, lg 54 (:22-30) | radius `md`, border 1.5 `border`, default fill `surface2` (:227-232); focus border `withAlpha(primary, alpha.strong)` (:147); error border `error` plus `FieldError` (:148, 182); disabled 0.55 (:234); iOS number pads get a Done (and optional Next) bar in `primary` (:190-213); inside a sheet it must be gorhom's `BottomSheetTextInput` (:99-104; components/BottomSheet.js:52-57) | 41 |
| `SearchBar` | search-outline 16 `textMuted`, input `type.body` 16 min, trailing clear (close-circle) or spinner (SearchBar.js:42-73) | `inputBg` fill, 1px `border`, radius `md`, padding md x sm (:75-94) | 8 |
| `Dropdown` | inline expand-in-place select; chevron amber once filled (Dropdown.js:39-56) | trigger `surface`, border 1.5 `border` (filled: amber at `alpha.strong`, open: full amber) (:96-110) | 3 |
| `OptionCard` | full-width selectable card: tile 40, label `bodyStrong`, detail `bodySm`, amber check-circle when active (OptionCard.js:20-37) | radius `lg`, 1px `border`; active `primaryBg` plus amber border (:40-57) | 1 |
| `HintCaption`, `FieldError` | one-time caption plus amber "Got it" (HintCaption.js:36-48); alert-circle 14 plus `caption` error text, live region (FieldError.js:12-26) | none | 4, 3 |

### 1c. Overlays and feedback

| Primitive | OBSERVED anatomy | Cite |
|---|---|---|
| `BottomSheet` | wrapper over `@gorhom/bottom-sheet` `BottomSheetModal` (BottomSheet.js:295-318). Panel `surface`, top corners `radius.xl` 20, 1px `border` top edge (:330-336). Handle 36x4 `radius.hair` in `border`, paddingTop sm (:337-345). Body paddingH lg, gap md (:346-349); bottom padding max(44, inset+16) (:103). Dynamic height, cap max(360, 92% of window) (:101). Scrim `colors.scrim`, tap to close, pan down to close, Android back closes (:238-262, 299). Props `showHandle, keyboardAvoiding, scroll, sheetStyle`; no header and no footer: children own both. 47 files | components/BottomSheet.js |
| `AppAlert` (`appAlert(title, message, buttons, options)`) | centred modal card on `scrim`, `surfaceElevated`, radius `lg`, padding xl, maxWidth 420, maxHeight 88% (AppAlert.js:237-247). Title `fontSize.lg` bold, message `fontSize.md` `textSecondary` (:254-265). Buttons minHeight 48, radius `md` (:282-298): default = `primaryFill` fill with bold `onPrimary` label (:300, 304); destructive = transparent with `error` TEXT (:301, 305); cancel = transparent with `textMuted` text (:302, 306). Row layout for 1-2 short buttons, stacked when more than 2 or labels exceed 26 characters (:105-106). 53 files | components/AppAlert.js |
| `Toast` (`useToast().show(message, {variant, duration, action})`) | one at a time, FIFO (Toast.js:20-24); host above the tab bar: bottom = 49 + inset + sm (:42, 234). Card `surface2`, 1px `border`, radius `md`, 4px left border in the variant tint, `shadow.lg`, min 220, max 480 (:238-247, 309-320). Variants (:55-66): success (check-circle, 2500ms), error (alert-circle, 4000), warning (warning, 3500), info (information-circle, AMBER tint, 2500), undo (arrow-undo, warning tint, 8000). Message `bodySm` medium; optional action label uppercase bold in the tint (:259-264, 329-333). 75 files | components/Toast.js |
| `InfoTooltip` | 14px `information-circle-outline` `textMuted`, hitSlop 15 (InfoTooltip.js:53-64); opens a transparent RN Modal, fade (:65); box `surface`, 1px `border`, radius `lg`, padding xl, maxWidth 320, `bodySm` `textSecondary`, 48 close X in the corner (:120-145). 27 files | components/InfoTooltip.js |
| `PeekMenu` | long-press menu through BottomSheet: title `fontSize.md` bold, caption subtitle, item rows (glyph 18 amber, or `error` if destructive, label `fontSize.md` semibold, pressed = `surface2`), full-width Cancel pill `surface2` (PeekMenu.js:135-187, 193-230). `commit()` on open (:93); item action deferred until the sheet has closed, and a throw toasts "That didn't work. Please try again." (:101-132). 3 files | components/PeekMenu.js |
| PR toast (`PRCelebration`) | the in-session PR celebration is one calm bottom-docked toast, not a takeover: `surface` card, radius `lg`, 1px `border`, glyph 20 (`gold` trophy for a record, amber barbell for a first lift), `captionStrong` muted title over `fontSize.md` bold value, 2200ms (PRCelebration.js:127-145, 222-245, 262-282, 211). Confetti `MilestoneBurst` only on the summary (:53-125) | components/PRCelebration.js |

### 1d. Loading, press and motion primitives

| Primitive | OBSERVED | Cite |
|---|---|---|
| `Skeleton`, `SkeletonCard`, `SkeletonRow` | blocks `surface3`, radius 6, opacity pulse 0.45 to 0.85 over `motion.pulse` 750ms each way, static 0.6 under Reduce Motion (Skeleton.js:24-64). `SkeletonCard(height=92)`: `surface2`, 1px `border`, radius `md`, padding md, three bars 120x12, 78%x20, 46%x12 (:68-85, 102-108). `SkeletonRow`: 36x36 block plus two bars (:87-97). 52 files | components/Skeleton.js |
| `PressableCard` | the spring press: scale 1 to 0.97 (prop `scale`), opacity 1 to 0.92, `springs.press` in, `springs.release` out; nothing under Reduce Motion (PressableCard.js:75-135). Optional origin-aware `onPressWithLayout` measures the card for a hero zoom (:57-115). 25 files import it directly; Button, Card with a press prop, Chip and Stepper wrap it | components/PressableCard.js |
| `AnimatedEntrance` | `FadeInDown`, `motion.enter` 320ms, delay = delay + min(index, 8) x 30ms; plain View under Reduce Motion (AnimatedEntrance.js:24-51). 9 files | components/AnimatedEntrance.js |
| `AnimatedRow` | enter `FadeInDown` 320, exit `FadeOut` 220, siblings glide by `LinearTransition` 200; needs stable keys (AnimatedRow.js:26-53). Importers: MealSection and the logger | components/AnimatedRow.js |
| `RollingNumber` | integer count-up on the UI thread, `motion.enter` with the `easeStandard` bezier, plain Text under Reduce Motion; never on body weight (RollingNumber.js:9-14, 56-91). Importers: `food/MacroRings.js` and `WorkoutSummaryScreen` (grep only) | components/RollingNumber.js |
| `VolyumeTabBar` | anchored band, `surfaceElevated`, hairline `borderSubtle` top, 49 + inset (VolyumeTabBar.js:129, 189-195). Active tab = amber icon and label (:138) on a sliding `primaryBg` cushion radius `lg`, 46 high, `springs.settle` (:49-56, 98-104, 196-202); icon settle-scale 1 to 1.06 (:59-71); amber coach dot (:211-221). Returns null while ActiveWorkout is focused (:109-110) | components/VolyumeTabBar.js |

### 1e. What pins the vocabulary today (tests and lint a redesign must still pass)

| Pin | OBSERVED | Cite |
|---|---|---|
| Button variants | only `emphatic, primary, secondary, tertiary, outline, destructive` may be passed | `src/__tests__/buttonVariantExists.guard.test.js:34-45` |
| Lint on screens and components | no raw hex, no `rgba(`, no hex-alpha concat, no numeric `fontSize` literal, no `fontWeight` literal, no numeric `letterSpacing` literal, no em dash, no machine-tell words, no ", always/ever/forever" tails | `eslint.config.js:199-254` |
| NOT lint-enforced | spacing, radius, width, height and duration literals (for example `borderRadius: 999` at food/FoodRow.js:149, `gap: 10` at HomeScreen.js:3860, `marginTop: 10` at Skeleton.js:81) | `eslint.config.js:199-254` (no such selector) |
| Accessibility | no `allowFontScaling={false}`, no blanket text-scale cap, native stack headers hidden, tab bar border from a token | `src/__tests__/accessibilityDesign.guard.test.js:39-74` |
| No inner components | a component declared inside a component and rendered as a tag fails (the weigh-in keyboard defect) | `src/__tests__/innerComponentRemount.guard.test.js:1-45`; `components/TodayStrip.js:12-22` |
| FlashList for long lists | converted surfaces may not use FlatList or SectionList | `src/__tests__/e8FlashList.guard.test.js:16-45` |
| Coach screen is haptic-free | by guard, so a hold path never buzzes | `screens/CoachOutputScreen.js:141-147` |
| Community amber | per-file count of `colors.primary` reads is pinned | `components/community/__tests__/rows.amber.guard.test.js:1-48` |

## 2. Screen chrome

### 2a. Header, safe area, edge margin and section spacing per surface

| Surface | Header | Safe-area edges | Edge margin and block gap | Bottom pad | Cite |
|---|---|---|---|---|---|
| Today (tab root) | `ScreenHeader title="Today"`, Community pill on the right | top | content `padding: lg` 16, `gap: lg` | `xxl` 32 | screens/HomeScreen.js:2561, 2588, 3565 |
| Progress (tab root, route `Analytics`) | `ScreenHeader title="Progress"` | top | `padding: lg`, `gap: md` 12 | `xxxl` 48 | screens/AnalyticsScreen.js:391, 404, 815; navigation/RootNavigator.js:591 |
| Train, Coach (tab roots) | `ScreenHeader` | top | padding lg, gap lg | Train `xxl`, Coach `xxxl` | screens/PlansScreen.js:1241, 2273; screens/YouScreen.js:313-315, 575 |
| Nutrition (tab root) | `ScreenHeader title="Nutrition"` plus Trends pill | top | `padding: lg`; blocks spaced by `marginBottom` lg and md, not `gap` | `sm + 56 + xl`, clears the FAB | screens/DiaryScreen.js:1433, 1450-1460, 2383-2395, 2459-2460 |
| Recovery (pushed) | `BackHeader title="Recovery"` | top and bottom | padding lg, gap md | `xxxl` | screens/RecoveryScreen.js:28-29, 44 |
| Coaching decision (pushed) | `BackHeader title="Coaching decision"` | top and bottom | padding lg, gap lg; a section's label to its group is gap md | `xxxl` | screens/CoachOutputScreen.js:3012-3013, 3246-3248, 3297-3301 |
| Add food (modal over a tab) | `ModalHeader title="Add food"`, then an underlined tab strip, then SearchBar with margin md | top | list rows pad lg | list pad `xxxl` | screens/FoodSearchScreen.js:911-954, 972, 1134-1136 |
| Community hub (pushed) | `BackHeader title="Community"` with a cluster of 34px circular icon buttons on the right | top | list padding lg | `xxl` | screens/CommunityHubScreen.js:852-853, 889, 904-911 |
| Settings family | `SettingsPage` wraps `BackHeader` | top and bottom | padding lg, gap sm | `xxl` | components/SettingsPrimitives.js:92-112, 144-147 |

### 2b. How sections are labelled

| Surface | OBSERVED | Cite |
|---|---|---|
| Today | no heading over the main stack; the hero's own eyebrow is a muted overline carrying plan position; one standalone muted label heads the injuries group | screens/HomeScreen.js:2866-2868, 3226-3229 |
| Progress | default-tone `SectionLabel` over each block: "Your plan week", "Your progress", "Recent sessions", "More" | screens/AnalyticsScreen.js:412, 436, 543, 627 |
| Recovery | `SectionLabel` plus InfoTooltip for "Your ratings"; the main block is headed by a `type.title` line with a `captionTight` muted sub ("Estimated from your sessions · last 14 days"), not an overline | components/ReadinessCards.js:870-873, 964-969, 1086-1087 |
| Coaching decision | `SectionLabel heading` over each group ("Your week", "Next", "Plan ahead", the held label) | screens/CoachOutputScreen.js:3091, 3100, 3149, 3195 |
| Community | uppercase `Eyebrow` with one optional trailing action ("Find people", "New group") | screens/CommunityHubScreen.js:695, 739; components/community/Eyebrow.js:62-78 |
| Diary | no overline over meals; each meal card carries its own `bodyStrong` name and a subtotal in its header; sheets use `SectionLabel` as their title | components/food/MealSection.js:151-156; screens/DiaryScreen.js:2038, 2105 |

### 2c. How a hero is set

| Surface | Hero element | Set as | Cite |
|---|---|---|---|
| Today | session name (no numeral hero) | `fontSize.xxl` 24, `fontFamily.heavy`, lineHeight 30, up to 3 lines; eyebrow above is a muted overline; meta under it `fontSize.sm` `textSecondary` | screens/HomeScreen.js:2866-2895, 3596-3602 |
| Progress | plan-week count | `t.type.h2` number and `bodyStrong` words on one baseline, `bodySm` subline, seven cells with initials | components/PlanWeekCard.js:56-73, 79-81, 91-95 |
| Recovery | the answer sentence (no numeral hero) | `type.h3` | components/ReadinessCards.js:1088 |
| Coaching decision | the decision | `type.h2` title in a `Card elevated`, "the one loud line on the screen"; a hero adjustment label is `type.h3` tabular | screens/CoachOutputScreen.js:3249-3253, 3381-3388 |
| Diary | calories left | numeral `fontSize.xxxl` 32 Bold tabular in a 132px ring, "left" `xs` muted; the eaten total beside it `fontSize.xl` semibold `textSecondary` | components/food/MacroRings.js:11-12, 396-431 |
| Lift volume, PR record | weight lifted, best lift | `type.num('display')` 40: ink for volume, AMBER for the PR record; unit `type.title` `textSecondary` on the same baseline | screens/LiftProgressScreen.js:759-767; screens/ExerciseDetailScreen.js:1575-1578 |
| Share card | the key number | InterDisplay-ExtraBold 108 to 160 design px, amber, unit at 0.3 ratio, caption `medium` `textSecondary` | lib/shareCard/drawShareCard.js:849-862, 1033-1036 |
| (grep only) | `type.num('display')` amber also appears at `WorkoutSummaryScreen.js:2566` and `NutritionTargetsScreen.js:2653` | | grep |

SUGGESTS: the app has no `type.hero` (AMBIG 1); its largest data numeral role is `type.num('display')` 40, and its only 32 to 40 numerals sit inside a card with a muted label above and the unit or a quiet reference beside (LiftProgressScreen.js:711-718, MacroRings.js:333-338).

### 2d. Rows versus cards, quoted from the live code

| Surface | OBSERVED | Cite |
|---|---|---|
| Today | "the hero is the screen's ONLY elevated object, surfaceElevated ranks it above every flat surface card in the stack". The rest are a slim `Card padding="none"` row (last session, Community row), a bordered `surface` pane (evidence), a tinted borderless row (Today line) or one grouped list: "one container, hairline-divided rows, heading outside the box" | screens/HomeScreen.js:3588-3589, 3664-3666; components/HomeLastSessionCard.js:51-55; components/HomeCommunityTodayRow.js:35-42; components/home/EvidencePanel.js:77-84; components/home/TodayLine.js:72-81 |
| Progress | "three or four compact pillar rows inside one container, never hero cards". One `Card padding="none" surface="surfaceElevated"` holds the rows, split by hairline rules drawn in `border` because "on the raised surface borderSubtle falls to 1.17:1". Recent sessions are separate pressable Cards; the doors are one NavGroup | screens/AnalyticsScreen.js:432-435, 441-451, 833, 572-589, 628-660 |
| Recovery | the by-muscle block is "a flat column on the screen, no card of its own. The figure is its own card"; the only cards are next-in-plan, ratings and the figure | components/ReadinessCards.js:1056-1060, 1043-1046; components/NextInPlanCard.js:104-107; components/BodyDiagramHeatmap.js:591-596 |
| Coaching decision | "Rows share one rule: a hairline between them, never around them; the card around a group is the shared Card primitive", applied as `Card padding="none"` holding `WeekRow` and `TextRow` | components/coachOutput/CoachOutputCards.js:22-25, 73-83; screens/CoachOutputScreen.js:3150-3162 |
| Diary | a meal is "a single contained card ... items are flush in-card rows", the subtotal in its header; entry rows carry a hairline top divider | components/food/MealSection.js:13-18, 149-156; components/food/EntryRow.js:193-199 |
| Status of the "rows on the canvas, a card means an object" law | recorded as HISTORY, reverted (D193); the live tree mixes both idioms as the rows above show | docs/rules/styling.md:201-213, 239-244 |

### 2e. Scales and facts the chrome reuses

| Fact | OBSERVED | Cite |
|---|---|---|
| Spacing | hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 | styles/theme.js:413-424 |
| Radius | hair 2, xs 4, sm 6, md 10, lg 16, xl 20, full 999, `circle(size)` | styles/theme.js:426-440 |
| Touch target | 48 for any control (`touchTarget.minimum`); the logger has its own `workoutLoggerSize` table | styles/layout.js:12-15, 17-40 |
| Radius by role in use | cards `lg`; inputs, search, banners, toast, icon tiles `md`; chips, badges, pills `full`; sheet top `xl`; FAB `circle(56)` | components/Card.js:39-43; components/TextField.js:227-232; components/Toast.js:313; components/Chip.js:107; components/BottomSheet.js:330-333; screens/DiaryScreen.js:2293 |
| Hairline width | two widths coexist: `StyleSheet.hairlineWidth` (headers, tab bar, EntryRow, WeekRow, PersonRow) and `1` (Card edge, NavRow, SettingRow, FoodRow dividers) | components/BackHeader.js:86; components/VolyumeTabBar.js:193; components/food/EntryRow.js:197; components/coachOutput/CoachOutputCards.js:156; components/community/PersonRow.js:190 versus components/NavRow.js:100; components/SettingsPrimitives.js:180; components/food/FoodRow.js:136 |
| Icons | Ionicons only; outline = inactive and filled = active (tabs); sizes 14, 16, 18, 20, 22, 24, 28, 32 in use; disclosure chevron `iconSize.sm` 16 `textMuted` | navigation/RootNavigator.js:748-755; styles/theme.js:913-918; components/NavRow.js:58; docs/DESIGN_SYSTEM.md:355-373 |
| Row heights | 48 floor; 62 to 64 where a row has an icon tile and a sub line | components/coachOutput/CoachOutputCards.js:152; components/food/FeatureRow.js:66; components/food/FoodRow.js:137; components/community/PersonRow.js:165; components/HomeChangeWorkoutSheet.js:193 |
| Type roles | `hero` 56 is listed in the rules doc but absent from the code; roles that exist: display 40, h1 32, h2 24, h3 20, title 17, body 16, bodyStrong 16, bodySm 13, label 13, overline 11, caption 11, captionTight 11, captionStrong 11, micro 10; `type.num(role)` adds tabular figures; `type.w(role, weight)` picks a face | docs/rules/styling.md:74-79; styles/theme.js:609-737 |
| Tabular figures in use | 145 `type.num(` call sites and 69 raw `tabular-nums` across screens and components (counts include logger files); `EntryRow`'s kcal figure carries none | components/food/EntryRow.js:239 |

## 3. The data row vocabulary

### 3a. Number plus unit plus label, as shipped

| Surface | Pattern | Type roles and colour | Cite |
|---|---|---|---|
| Today, weigh-in strip | label over value, "Logged" pill on the right; unit text beside the field when editing | label `type.caption` `textMuted`; value `type.bodyStrong` `textPrimary` tabular; pill `caption` with a `success` border and check | components/TodayStrip.js:357-365, 366-380, 232-244, 423 |
| Today, last session | one muted line "42m - 18 sets - 12,450 kg lifted" (hyphen separators, en-GB grouping) under "Last session - Today" and the name | `captionStrong` muted, `label` `textPrimary`, `caption` muted | components/HomeLastSessionCard.js:42-48, 58-71, 102-111 |
| Today, hero meta | "6 exercises" or a circuit line under the 24px name | `fontSize.sm` `textSecondary`, a hand-rolled size not a role | screens/HomeScreen.js:2889-2895, 3602 |
| Progress, plan week | "2 of 4" plus "sessions" on one baseline, subline, seven cells | `h2`, `bodyStrong`, `bodySm` `textSecondary` | components/PlanWeekCard.js:56-73 |
| Progress, volume strip | one sentence of numbers over an 8px segmented bar | `type.num('bodySm')` `textPrimary` | screens/AnalyticsScreen.js:826-829 |
| Progress, pillar row | overline label, verdict in words, evidence line, chevron | `overline` muted, `bodyStrong`, `bodySm` `textSecondary` | screens/AnalyticsScreen.js:838-842 |
| Progress, session row | name `bodyStrong`; meta "Tue 6 Oct · 52 min"; difficulty as the person's own word in an ink chip | `num('caption')` `textSecondary` | screens/AnalyticsScreen.js:796-805, 858-866 |
| Recovery, answer | "4 muscles still recovering, 2 nearly recovered, 8 recovered." | `type.h3` | components/ReadinessCards.js:326-337, 1088 |
| Recovery, muscle row | name left, "60% recovered" right, 6px bar in the graded `recovery` hue, one muted meta "Ready by Thursday · Trained 2 days ago" | `bodyStrong`, `type.num('label')`, `captionTight` muted | components/MuscleRecoveryList.js:159-163, 441-461, 583-597 |
| Recovery, ratings | plain lines "Fatigue after sessions · moderate (3.2 of 5)" | `type.body` `textPrimary` | components/ReadinessCards.js:404-419, 1079 |
| Coaching decision, week row | glyph 18 `textSecondary`, label left, value right (tabular, max 55% wide), mark glyph last; 48 tall; hairline between rows | label `type.body` `textSecondary`; value `bodyStrong` `textPrimary` | components/coachOutput/CoachOutputCards.js:49-71, 146-161 |
| Coaching decision, adjustment | label, `bodySm` note, `bodySm` semibold tabular detail line | `bodyStrong` (hero `h3` tabular) | screens/CoachOutputScreen.js:3376-3410 |
| Diary, kcal hero | ring 132 stroke 14; centre numeral plus "left" or "over"; eaten total plus "of 2,400 kcal" beside it | `fontSize.xxxl` Bold tabular; `xl` semibold `textSecondary`; `xs` muted | components/food/MacroRings.js:11-12, 300-339, 396-431 |
| Diary, macro bar | label `xs` muted left, "123 / 150g" `fontSize.sm` tabular right, 6px track, "Ng to go" `xs` muted | category hue per macro, never an adherence colour | components/food/MacroRings.js:149-171, 455-517 |
| Diary, entry row | name `fontSize.md` Medium; "412 kcal" `md` semibold on the right; "32P 40C 12F" caption muted; meta "120g  ·  08:30" | | components/food/EntryRow.js:56-57, 108-135, 217-240 |
| Diary, meal header | name `bodyStrong`; subtotal "620 kcal - 41g P" `fontSize.sm` tabular muted | | components/food/MealSection.js:151-156, 318-319 |
| Community, person row | name `bodyStrong`; second line DayDots or `bodySm`; right metric `num('label')`, or `num('title')` for the one result | | components/community/PersonRow.js:136-151, 183-185 |
| Lift volume hero | eyebrow `label`; value `num('display')` plus unit `title` `textSecondary` on one baseline; sub `num('caption')` muted; 64px bar chart with scrub | | screens/LiftProgressScreen.js:711-749, 759-767 |
| PR hero (exercise detail) | `Card tone="primary"`, `trophy` 18 amber plus muted SectionLabel plus InfoTooltip; value `num('display')` AMBER with a caption label; supporting values `num('title')` amber, "142.5kg x 8"; "Achieved ..." caption | | screens/ExerciseDetailScreen.js:904-957, 1575-1591 |
| Share card | hero numeral plus unit; stat row of up to four equal columns (display value plus 0.46-ratio unit over a regular caption); lift row with the name left and the set right, "90 kg × 8" | | lib/shareCard/drawShareCard.js:849-891, 898-934, 1165-1168 |

### 3b. Trends and deltas

| Device | OBSERVED | Cite |
|---|---|---|
| Signed text plus a neutral arrow | the weight row prints "+0.4 lbs" with an ink `arrow-up-outline`, `arrow-down-outline` or `remove-outline`; the valence colour was retired and "the arrow's shape is the only signal" | screens/CoachOutputScreen.js:2703-2710, 2722-2728, 2978-2980 |
| Words, not arrows | a pillar headline reads "Trending down over the last 2 weeks." | screens/AnalyticsScreen.js:116-121 |
| Body weight is never marked | the week-row builder never attaches a mark to weight or food rows | lib/coachOutput/viewCopy.js:184-188 |
| Latest bar amber, history dim amber | weekly weight-lifted bars: current week `primary`, earlier weeks `primaryDim` | screens/LiftProgressScreen.js:697-703 |
| Single-ink bars | fatigue bars are one `textSecondary`, "a verdict painted on a self-rating" removed | components/FatigueTrendCard.js:16-19, 46-52 |
| Toned segments | volume strip: `textMuted`, `success`, `macroCarb`; one `surface3` shade in a recovery week | lib/progress/volumeStrip.js:121-130; screens/AnalyticsScreen.js:746-756 |
| Graded single hue | recovery bar: `recovery` solid under 50%, `alpha.half` to 74%, `alpha.edge` from 75% with a 1px outline | components/MuscleRecoveryList.js:159-163, 447-456 |
| Comparison under a hero | "Up 12% on the 4-week average" in white semibold under the amber hero | lib/shareCard/drawShareCard.js:992-1020 |
| Scrub | the weight-lifted chart is interactive with `onScrubIndex` | screens/LiftProgressScreen.js:724-733 |

### 3c. How a state (on track, watch, act) is coloured

| Where | OBSERVED | Cite |
|---|---|---|
| Grammar | `stateColors`: onTrack `success`, watch `warning`, act `error`, neutral `textMuted`, info `macroCarb`. Only `styles/theme.js` and its test (`styles/__tests__/volumeStatusColor.test.js`) reference `stateColors` (grep over src and App.js); screens read the semantic tokens, or `toneColors` from `lib/volumeJudgement.js:111`, directly | styles/theme.js:821-836 |
| Volume bands | below `textMuted`, building `volumeMinimum` blue, growth `success`, beyond `macroCarb` blue: "No warning or error token: the highest band is a note" | lib/volumeJudgement.js:106-118 |
| Week-row marks | `checkmark-circle` `success` ("on plan") and `alert-circle` `warning` ("worth a look") at the row end | components/coachOutput/CoachOutputCards.js:42-43, 52, 67 |
| Readiness chip on Today | go = amber glyph, caution = `warning`, recover = `success` | components/CoachBriefCard.js:31-37; screens/HomeScreen.js:2546-2550, 3554 |
| Applied | a `successBg` pill with a check | screens/CoachOutputScreen.js:3389-3399 |
| Recovery | no status colour on a fact: "Facts are ink"; one terracotta `recovery` hue, "intensity, not hue, carries the reading" | components/ReadinessCards.js:33-34; styles/theme.js:191-201 |
| Calories | ring stays amber under or over target; "over" is the same ink as "left"; macro hues are categories, never adherence | components/food/MacroRings.js:21-35, 255-262 |
| Safety blocks | rapid-loss alert = `errorBg` card with an `error` border at `alpha.mid`; ED lockout = `warning` border; ED cleared = `success` border | components/coachOutput/CoachOutputCards.js:124-141, 180-187; screens/CoachOutputScreen.js:3520-3530, 3597-3605 |
| Form validation | `error` border plus a glyph-and-text FieldError line; an out-of-range number gets a `warning` toast | components/FieldError.js:12-21; components/food/QuickAddSheet.js:83 |

## 4. Amber usage on each surface

### 4a. The amber tokens and where each is used

| Token | Dark / light value | Used as | Cite |
|---|---|---|---|
| `primary` | #F5A623 / #8A5200 (ink) | text, icons, small marks, selected borders | styles/theme.js:60, 232 |
| `primaryFill` | #E08C0B / #F5A623 | large fills: Button `emphatic`, the default AppAlert button, SegmentedControl selected, checkbox on, kcal ring stroke, tab badge dot | styles/theme.js:61, 233; components/Button.js:65; components/AppAlert.js:300; components/SegmentedControl.js:66; components/food/EntryRow.js:209-210; components/food/MacroRings.js:33-35; components/VolyumeTabBar.js:218 |
| `primaryBg` | amber at .12 / .18 | tint behind a glyph tile, selected chip, banner row, tab cushion | styles/theme.js:63, 234 |
| `primaryDim` | #B45309 | earlier bars on the weight-lifted chart | styles/theme.js:62; screens/LiftProgressScreen.js:700 |
| tinted borders | `withAlpha(primary, alpha.edge .25 / mid .33 / strong .40)` | banners, tertiary Button, Card `tone`, TextField focus | components/Button.js:70; components/Card.js:107; components/TextField.js:147 |
| near-amber hexes | `chartLine` #F59E0B; `macroProtein` #F5A623 (same hex as `primary`); share-card accent #F5A623 | chart line, the protein bar, the card hero | styles/theme.js:165, 181; lib/shareCard/drawShareCard.js:76 |

### 4b. Amber rules written in the code (OBSERVED, not all applied everywhere)

| Rule as written | Cite |
|---|---|
| "amber only on an action, at most one per screen, never on a fact" (D214) | components/NavRow.js:7-13 |
| "A1 one-amber rule: `emphasis` marks the hero decision row ... the screen's ONE amber-filled Apply; every other row's Apply is the quiet outline variant" | screens/CoachOutputScreen.js:216-218 |
| "amber is never on a fact, and one amber sits on a screen, on the thing to do" | components/WindowChips.js:7-14 |
| "Facts are ink: no amber and no status colour on a fact" | components/ReadinessCards.js:33-34 |
| Community: "Amber is spent only on: the trained-today ring, a given Respect glyph, a PR mark ... Every other button is primary (charcoal), secondary, tertiary or icon-only" | components/community/__tests__/rows.amber.guard.test.js:3-6 |
| "colour is hierarchy; amber is an accent, a selection and an identity, not 'this is a button'" (D148) | components/Button.js:9-19 |
| Share card: "ONE amber object per card: the hero number", plus an amber outline the founder asked for on 2026-09-26 | lib/shareCard/drawShareCard.js:28-31, 677-686 |
| Doc: amber only on primary actions, active navigation and key data values | docs/DESIGN_SYSTEM.md:127-133 |

### 4c. Count per surface (default populated state; conditional extras listed after)

| Surface | Amber at rest | Count | Conditional extras | What amber means there |
|---|---|---|---|---|
| Today | Community pill glyph (components/community/CommunityHeaderAction.js:79); Community row glyph, members only (components/HomeCommunityTodayRow.js:43); hero Start button `play` glyph on raised charcoal (screens/HomeScreen.js:2963-2970; components/Button.js:68); last-session "Repeat" tertiary, amber label, glyph, tint and edge (components/HomeLastSessionCard.js:77-86; Button.js:70); the tab bar's active tab (components/VolyumeTabBar.js:133, 138) | 4 in content plus the tab bar | Community dot or badge (CommunityHeaderAction.js:84, 95); "Invite" tertiary when no friends (HomeCommunityTodayRow.js:50-58); Today line: tinted row, 6px dot, amber chevron (components/home/TodayLine.js:34-35, 51, 64); readiness chip glyph when the tone is "go" (HomeScreen.js:2546-2550; components/CoachBriefCard.js:33); weigh-in focus ring while editing (components/TextField.js:147); one plateau or activation banner, tinted row plus glyph (HomeScreen.js:2419-2425, 3875-3903); welcome step badges x2 (components/HomeWelcomeCard.js:58-66); no-plan icon circle and quick-start card (components/EmptyState.js:73-79; HomeScreen.js:3053-3066, 3927-3947); Community intro tile and button glyph (components/HomeCommunityIntroCard.js:36-46); refresh spinner (HomeScreen.js:2581); intent sheet: 3 glyph tiles and selected readiness chips (HomeScreen.js:3457-3459, 3421-3427); workout options: 2 to 3 tiles, selected row badge and check-circle, "Next up" badge (components/HomeChangeWorkoutSheet.js:79-116, 150-166) | action (Start, Repeat, Invite), entry to Community, "now" (Today line dot), selected, readiness "go". The resume card is `success` green, not amber (HomeScreen.js:3571-3575) |
| Progress root | none in content: pillar glyphs ink (screens/AnalyticsScreen.js:673-674, 687); week cells ink (components/PlanWeekCard.js:80); door tiles ink (components/NavRow.js:7-13, 103-108); difficulty chip ink (AnalyticsScreen.js:861-866); strip tones not amber (lib/progress/volumeStrip.js:121-130) | 0 plus the tab bar | recap banner in the first 7 days of a month once recaps unlock: tinted row, amber edge, amber newspaper glyph (AnalyticsScreen.js:597-617, 845-851); refresh spinner (AnalyticsScreen.js:399) | nothing on facts; the one amber is an invitation |
| Recovery | none: figure is the terracotta `recovery` hue; selected muscle is a `textPrimary` outline; learning card, ratings and legend are ink (components/ReadinessCards.js:33-34; components/MuscleRecoveryList.js:48-49; components/NextInPlanCard.js:28-30; components/BodyDiagramHeatmap.js:45-46, 472-474; components/LegendRow.js:36) | 0 plus the tab bar | none | not used |
| Coaching decision | hero Card amber border via `tone="primary"` (screens/CoachOutputScreen.js:344, 439, 560; components/Card.js:107); hero row glyph tile (CoachOutputScreen.js:244-246, 3361-3371); hero Apply `emphatic` fill (:276-286); "Plan ahead" door tiles x2 to x3 (:3197-3219; components/SettingsPrimitives.js:37-45) | 3 in the hero plus 2 to 3 door tiles | coach note glyphs (CoachOutputScreen.js:3023, 3106); insufficient-data 32px glyph (:832); error EmptyState icon circle (components/EmptyState.js:73-79); each secondary card repeats a glyph tile. "Hold everything" is never amber (CoachOutputScreen.js:3030-3034); Done is charcoal `primary` (:3223-3229) | action (Apply), the one decision, doors |
| Diary | Trends pill glyph (components/HeaderAction.js:37); kcal ring stroke `primaryFill` (components/food/MacroRings.js:33-35, 197, 302-310); protein bar `macroProtein` (MacroRings.js:358); scan FAB glyph (screens/DiaryScreen.js:1996); Water glyph and fill (DiaryScreen.js:2230, 2575) | 6 plus the tab bar | "+N planned" text (MacroRings.js:410-415); usual-chip glyphs, one per chip on an empty meal (components/food/MealSection.js:179, 196, 212); planned-banner edge (DiaryScreen.js:2530); checkbox on (components/food/EntryRow.js:209-210); sheet tiles (DiaryScreen.js:1947, 1962, 2116, 2131) | progress data (ring, protein, water), action (FAB, add), selected |
| Add food | active tab underline 2px (screens/FoodSearchScreen.js:1128-1132) | 1 plus one per row | each row's "+ Add" pill, amber glyph and label on `primaryBg` (components/food/FoodRow.js:114-124, 144-155); CTA row glyphs on the More tab (FoodSearchScreen.js:753); suggestion cards with a 3px amber left border and amber add glyph (:1160-1168, 902); spinner (:901) | selected tab, add action |
| Share card | outline frame, 6px at 1080 (lib/shareCard/drawShareCard.js:675-717, 124-126); hero numeral and unit (:849-862) | 2 | "NEW PR" marker on a lift row (:905); light theme: numeral #B45309, frame #F5A623 (:90-97, 119-126); the sticker has the numeral only and a hairline `rule` edge (:1759-1776) | identity (frame) and the one key number |

SUGGESTS: the default surfaces keep amber to 4 to 6 small marks. Where it multiplies (AppAlert's default button, FoodRow's "+ Add", amber-selected chips in two groups of one sheet) it is because a repeated control carries it: an alert with five options renders five amber-filled buttons (screens/DiaryScreen.js:675-688 with components/AppAlert.js:300; stacked by the rule at AppAlert.js:105-106), and FoodDetailSheet shows an amber unit chip and an amber meal chip at once (components/food/FoodDetailSheet.js:298-313, 446-461).

## 5. Motion and haptics actually in use

### 5a. Motion

| Trigger | What moves, token | Reduce Motion | Cite |
|---|---|---|---|
| Press on Button, Card with a press prop, Chip, Stepper, PressableCard | scale 1 to 0.97 and opacity 1 to 0.92; `motion.springs.press` in (420/36), `springs.release` out (250/22) | no scale, no opacity | components/PressableCard.js:75-135; styles/theme.js:956-961 |
| Press on a plain row | `TouchableOpacity` default dip with hand-picked `activeOpacity`: 0.85 x20, 0.7 x15, 0.75 x10, 0.8 x5, 1 x5, 0.88 x3, 0.9 x2 (counts include logger files) | none | components/NavRow.js:44-48 uses the spring; components/food/EntryRow.js:72 is a bare `TouchableOpacity` with no `activeOpacity` |
| First paint of a tab or block | `AnimatedEntrance` FadeInDown, `motion.enter` 320ms, stagger 30ms to a cap of 8 items; used on Progress plan week and Answer Block, Recovery block (index 1), each Diary meal (index i), Community hub header | plain View | components/AnimatedEntrance.js:24-51; screens/AnalyticsScreen.js:417, 440; components/ReadinessCards.js:933; screens/DiaryScreen.js:1734; screens/CommunityHubScreen.js:562 |
| Today root | nothing: no AnimatedEntrance, no RollingNumber, no Reanimated in HomeScreen (grep) | n/a | screens/HomeScreen.js (no match for `Animated`) |
| Diary row added or removed | `AnimatedRow` enter FadeInDown 320, exit FadeOut 220, siblings glide `LinearTransition` 200 | plain View | components/AnimatedRow.js:37-53; components/food/MealSection.js:222 |
| Button commit | idle to loading to success cross-fade `motion.state` 200 in a width-locked box; checkmark holds 900ms, `commit()` haptic on entering success, then `onSettled` (a sheet closes on it) | instant swap, hold unchanged | components/Button.js:89-93, 185-194, 233-253; components/food/FoodDetailSheet.js:495-503 |
| Sheet open and close | gorhom spring, `motion.springs.settle` (150/18); backdrop `scrim` | `{duration: 0}` | components/BottomSheet.js:264-267, 72 |
| Toast | in: opacity `motion.exit` 220 and translateY 40 to 0 over `motion.sheet` 260; out `motion.state` 200 | 0 duration | components/Toast.js:145-158, 191-203 |
| Loading | Skeleton opacity 0.45 to 0.85 over `motion.pulse` 750ms each way | static 0.6 | components/Skeleton.js:29-62 |
| Tab change | cushion slides by `springs.settle`; icon settle-scale 1 to 1.06 to 1 on focus | jumps, no scale | components/VolyumeTabBar.js:59-71, 98-104 |
| Stack push | hero zoom: opacity 0 to 1, scale 0.92 to 1 (or growth from the tapped card's rect), open 320 and close 220; modals use `presentation: 'modal'` | `animationEnabled: false` (AMBIG 3) | navigation/RootNavigator.js:299-395, 418-454, 476-477, 553-555 |
| Calories | ring sweep `withTiming` `motion.hero` 440; numerals `RollingNumber` `motion.enter` with `easeStandard`; only on change, never on mount replay | final value at once | components/food/MacroRings.js:249-253; components/RollingNumber.js:56-78 |
| Coaching decision reveal | staged `FadeInDown`, delay i x `motion.micro` 120; hero beat `motion.hero`; "Your week" next; the safety zone and held decisions never animate | no animation | screens/CoachOutputScreen.js:3003-3009, 3035, 3099 |
| Apply row settle | Apply button fades out on `motion.exit`; a tap-time hold line fades in on `motion.enter` | plain View | screens/CoachOutputScreen.js:188-214 |
| PR | calm toast fade `motion.exit` 220, 2200ms dwell; confetti (40 particles, springs, 2400ms) only for milestones on the summary | none | components/PRCelebration.js:60-125, 210-211 |
| Alerts and InfoTooltip | RN Modal fade | `none` | components/AppAlert.js:109; components/InfoTooltip.js:65 |
| Pull to refresh | RefreshControl, spinner `tintColor` `primary` on the tab roots (Community hub: `textMuted` with an amber android colour) | system | screens/HomeScreen.js:2581; screens/AnalyticsScreen.js:399; screens/DiaryScreen.js:1444; screens/CommunityHubScreen.js:874-881 |

Tokens in `motion`: micro 120, state 200, enter 320, exit 220, hero 440, sheet 260, pulse 750, plus the four-spring family (styles/theme.js:929-969). Usage outside the logger files, counted: `motion.state` 24, `motion.enter` 13, `motion.springs` 8, `motion.exit` 8, `motion.micro` 5, `motion.hero` 5, `motion.pulse` 4.

### 5b. Haptics

| Call | Where it fires outside the logger files | Cite |
|---|---|---|
| `selection()` | 252 call sites: tab change (navigation/RootNavigator.js:731-736), `Button` primary and emphatic press (components/Button.js:196-202), `NavRow` (components/NavRow.js:40-42), pillar rows (screens/AnalyticsScreen.js:682), almost every Today tap (screens/HomeScreen.js:2463, 2503, 3454), Diary day pager (screens/DiaryScreen.js:1008-1009), chips and rows in the food sheets (components/food/FoodDetailSheet.js:304, 317, 361), the Undo action itself (DiaryScreen.js:1313) | grep |
| `commit()` (Medium) | 15 sites: deletes after they land (DiaryScreen.js:1172, 1309; components/food/FoodDetailSheet.js:256; screens/MyRecipesScreen.js:203; screens/MyMealsScreen.js:168), PeekMenu open (components/PeekMenu.js:93), Button success entry (components/Button.js:189), builder add and remove (screens/ManualBuilderScreen.js:522, 568, 707, 769; screens/BuildWorkoutScreen.js:116; screens/RoutineDetailScreen.js:522), preferences save (components/food/DietaryPreferencesEditor.js:83), create exercise (components/ExercisePickerModal.js:843) | grep |
| `press()` (Light) | one site: water add | screens/DiaryScreen.js:1289 |
| `error()` | one site | screens/ProOnboardingScreen.js:540 |
| `planReady()` | two sites | components/FeedbackSheet.js:218; screens/ProOnboardingScreen.js:1476 |
| `prAchieved()` | the PR toast, unless gentle (calm, Reduce Motion, first lift), which uses `selection()` | components/PRCelebration.js:176-209 |
| `setLogged`, `warmupLogged`, `restDone`, `restAlmostDone`, `restCountdown`, `workoutComplete` | no call site outside the excluded logger files; defined at lib/haptics.js:100-180, with iOS rich patterns for rest-done and PR only (:62-81) | grep |
| Deliberately none | the Coaching decision screen (guarded); bulk food-write actions in the Diary, "excluded per the campaign's ED-pattern-detection rule"; held-decision surfaces | screens/CoachOutputScreen.js:141-147, 636-639; screens/DiaryScreen.js:2013-2016, 2151-2154 |
| Gate | every call is silenced when `accessibility.reduceMotion` is on, which is the OS setting OR the in-app toggle; whether haptics should follow motion is an open question in the file | lib/haptics.js:13-21, 30-33, 84-96; store/useAppStore.js:2383-2392 |
| Only module that imports expo-haptics | | lib/haptics.js (grep: no other file) |

## 6. The sheet and modal vocabulary

Paths are under `components/` unless they start `screens/`, `hooks/`, `lib/` or `styles/`.

### 6a. What `BottomSheet` fixes for every sheet

| Part | OBSERVED | Cite |
|---|---|---|
| Wrapper | `@gorhom/bottom-sheet` `BottomSheetModal`, controlled by `visible` and `onClose`; 47 files import it (grep). It has no header slot and no footer slot, so each consumer draws both inside `children` | BottomSheet.js:294-319; header comment :1-50 |
| Panel | `surface` fill, top corners `radius.xl` 20, 1px top edge in `border`; no side or bottom edge | BottomSheet.js:329-336, 370 |
| Handle | 36x4 pill, `radius.hair`, `border` colour, 8px above it; `showHandle={false}` hides it and gives the body `sm` top padding | BottomSheet.js:337-345, 305, 322-327, 275 |
| Scrim | `colors.scrim`: black at .55 dark and .45 light, full-opacity layer; a tap calls `onClose` before the animation runs | BottomSheet.js:238-249; styles/theme.js:189, 270 |
| Body | padding horizontal `lg` 16, gap `md` 12, bottom `max(44, inset + 16)` | BottomSheet.js:103, 346-349 |
| Height | content-sized (`enableDynamicSizing`), capped at `max(360, 92% of window)`; `scroll` swaps in a `BottomSheetScrollView` capped at that minus 96 (min 280) | BottomSheet.js:100-102, 277-292, 297-298 |
| Close paths | backdrop tap, Android hardware back, pan down; an X is never mandatory | BottomSheet.js:236-262, 299 |
| Keyboard | `keyboardAvoiding` = `interactive` behaviour and `adjustResize`; fields inside must be gorhom's input, switched by `InsideBottomSheetContext` | BottomSheet.js:52-57, 309-310; TextField.js:99-104 |
| Motion | `motion.springs.settle` (150/18); `{duration: 0}` and no mount animation under Reduce Motion | BottomSheet.js:264-266, 300 |
| Screen reader | `accessibilityLabel` per sheet; the screen behind is hidden from TalkBack and VoiceOver while any sheet is open | BottomSheet.js:36-46, 311 |

### 6b. Sheet headers: five idioms coexist (the container supplies none)

| Idiom | Spec | Used by | Cite |
|---|---|---|---|
| Title line | `fontSize.lg` 17 Bold `textPrimary`; optional `fontSize.sm` `textMuted` sub pulled up by `-xs`; no close X | FoodDetailSheet (2 lines, brand, source chip), QuickAddSheet, CuratedMealSheet, RecipeDetailSheet, SavedMealDetailSheet, FeedbackSheet, PlanPreviewSheet; CalorieBankSheet is the same size in Semibold | food/FoodDetailSheet.js:282-288, 531-532; food/QuickAddSheet.js:103-104, 177-178; food/CuratedMealSheet.js:51-57, 126-127; FeedbackSheet.js:245, 327-338; PlanPreviewSheet.js:145-147, 441; food/CalorieBankSheet.js:112, 205 |
| `type.h3` title | 20 Medium `textPrimary` over a `fontSize.sm` muted sub | Home "Workout options" and "Your block" | HomeChangeWorkoutSheet.js:35, 41-43, 184-188; HomeBlockShapeSheet.js:35, 41-43, 97-101 |
| Overline as title | `SectionLabel` (11 uppercase) with `moveTitle` padding, then rows | Diary "Move to", "Save as meal", "Day tools", "Copy from another day" | screens/DiaryScreen.js:2038, 2058, 2105, 2146, 2317-2319 |
| `bodyStrong` title and `bodySm` intro | plain text pair above two icon rows | Diary "Saved meals and recipes" | screens/DiaryScreen.js:1938-1939, 2362-2364 |
| `ModalHeader` bled to the panel edges | title centred, close X right, header wrapped in `marginHorizontal: -lg`; the only sheets with a visible close control besides the plate sheet | Community `MenuSheet` and `ReportSheet` (lead ruling V16, 2026-09-06) | community/MenuSheet.js:1-58; community/ReportSheet.js:13-15, 74-78, 113-115 |
| Title left, X right in the body | `type.title` plus `close` 22 `textPrimary`, hitSlop 12, `sheetStyle` paddingTop `lg` | Add food "Selected foods (N)" | screens/FoodSearchScreen.js:1016-1028, 1203-1210 |

### 6c. Button placement: eight footers in use

| Footer | Spec | Used by | Cite |
|---|---|---|---|
| Two equal buttons | `secondary` Cancel left, default `primary` (raised charcoal) right, both `flex: 1`, gap `sm`, marginTop `sm`; the right button morphs idle, loading, success and the sheet closes on `onSettled` | QuickAddSheet; FeedbackSheet (Cancel, Send) | food/QuickAddSheet.js:155-171, 198-199; FeedbackSheet.js:294-312 |
| Icon buttons, Cancel, wide action | [select-entries 48x48 outlined] [trash 48x48 outlined, `error` glyph] [Cancel `secondary`, content width] [Save changes `flex: 1`, `surface2` with a `border` edge] | FoodDetailSheet in edit mode (add mode drops the two icons) | food/FoodDetailSheet.js:463-505, 610-631 |
| One full-width primary, last | no Cancel, the header X closes; disabled until a reason is chosen, `loading` while sending | ReportSheet | community/ReportSheet.js:100-107 |
| Confirm over decline | full-width `emphatic` confirm above a full-width `tertiary` "Not yet" | PlanPreviewSheet | PlanPreviewSheet.js:390-406 |
| Right-aligned small pair | `sm` `secondary` Cancel and default Save, `justifyContent: flex-end`, Save disabled until a name is typed | Diary "Save as meal" | screens/DiaryScreen.js:2075-2096, 2356-2360 |
| Quiet text link | centred "Cancel" or "Close", `type.body` `textSecondary`, marginTop `lg`, below the list | Home sheets | HomeChangeWorkoutSheet.js:171-173, 237-238; HomeBlockShapeSheet.js:85-87, 104-105 |
| No footer: each row is the action | row taps close the sheet and act; destructive rows go to an AppAlert | Diary move, day tools, copy day, saved-meals sheets; Community menus | screens/DiaryScreen.js:2037-2050, 2104-2140, 1937-1971; community/MenuSheet.js:40-57 |
| Docked bar outside any sheet | "N to log" with a one-line subtotal over a `Log N` button, then a sheet for review | Add food plate bar | screens/FoodSearchScreen.js:992-1013, 1188-1209 |

A "tile, title, sub, chevron" action row is hand-built in four places with near-identical numbers: tile 38 or 40 in `primaryBg` at radius `md`, row minHeight 64 (HomeChangeWorkoutSheet.js:189-208; screens/DiaryScreen.js:2326-2345 and 2365-2380), or the same tile inside a `surface2` card at radius `lg` with padding `lg` (the pre-workout intent sheet, screens/HomeScreen.js:3742-3757). SUGGESTS: it is the app's de-facto "sheet action row"; no shared component owns it (the shared `SettingRow` tile is 34 and `primaryBg`, components/SettingsPrimitives.js:37-45).

### 6d. Centred modals and route-level modals

| Surface | OBSERVED | Cite |
|---|---|---|
| `AppAlert` | the one centred dialog: `surfaceElevated` card, radius `lg`, padding `xl`, edge `border` live, maxWidth 420; title `fontSize.lg` Bold, message `fontSize.md` `textSecondary` lineHeight 22; buttons 48 tall, radius `md`; row for one or two short buttons, stacked for three or more or labels over 26 characters | AppAlert.js:105-106, 237-307, 315 |
| Date and time pickers | iOS: a card in the AppAlert shape (maxWidth 420, `surfaceElevated`, radius `lg`, `border`) holding a native spinner and a right-aligned `sm` "Done"; Android: the system dialog | food/DiaryDatePicker.js:66-96, 100-104, 109-129; food/EatenTimePicker.js:54-76, 80-84 |
| `InfoTooltip` | transparent fade Modal, `surface` box, radius `lg`, maxWidth 320, 48 close X in the corner | InfoTooltip.js:65, 120-145 |
| Route-level modals | seven food routes only: FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, MyRecipes, MyMeals, RecipeBuilder; each draws its own `ModalHeader` or full-bleed camera. ActiveWorkout and WorkoutSummary are hero-zoom pushes, not modals | navigation/RootNavigator.js:416-454, 476-477 |
| Native stack headers | hidden everywhere (pinned) | src/__tests__/accessibilityDesign.guard.test.js:39-74 |

### 6e. How a destructive action is confirmed (nine patterns, chosen by reversibility)

| # | Pattern | Confirmation | Feedback after | Cite |
|---|---|---|---|---|
| D1 | Swipe a Diary row: a red panel 90 wide with `trash-outline` and "Delete" opens, and a second tap on it deletes | none | delete first, then `commit()` haptic, then an `undo` toast "[food name] deleted." for 8000ms with an Undo action (`selection()` haptic, then restore); a thrown delete closes the panel and toasts an error | food/EntryRow.js:140-183, 241-251; screens/DiaryScreen.js:1302-1323; Toast.js:64 |
| D2 | Multi-select in the Diary: a docked toolbar of four labelled actions, Delete in `error` | none | same: delete, `commit()`, toast "N entries deleted." with Undo restoring the set | screens/DiaryScreen.js:1163-1180, 2025-2030, 2302-2316 |
| D3 | Trash icon in an edit sheet | AppAlert "Remove this entry?" with the line "It comes off this day's totals." and `Cancel` plus `Remove` (destructive) | `onDelete` (the Diary's `deleteFromEditSheet`) deletes and raises the same Undo toast, then `commit()` fires and the sheet closes | food/FoodDetailSheet.js:243-258, 483-485; screens/DiaryScreen.js:1276-1285, 1911 |
| D4 | A reversible relationship change in a menu: Mute | none | a plain toast that names the reversal: "Muted. They are not told." | community/ProfileMenuSheet.js:94-96 |
| D5 | A consequential but reversible change: Block | AppAlert "Block @handle?" with the consequence and "You can unblock later." | toast "Blocked"; the row flips to Unblock | community/ProfileMenuSheet.js:69-81, 97-99 |
| D6 | Irreversible data actions in Settings: Clear workout history, Restore from backup | the row sits alone under its own section header ("Clear history"), drawn with the destructive tile (`errorBg`, `error`); AppAlert states the loss and "This cannot be undone."; the destructive button names the verb ("Clear everything", "Choose file") | success toast, or an AppAlert on failure | screens/SettingsDataScreen.js:270-297, 299-318, 406-419; components/SettingsPrimitives.js:37-45 |
| D7 | Delete account | two chained AppAlerts: "Delete account?" then Continue (destructive), "Are you sure?" then "Delete forever" (destructive); the row reads "Deleting account..." while it runs | audit log lines, no toast | hooks/useAccountActions.js:161-193; screens/SettingsAccountScreen.js:30-48 |
| D8 | Long-press menus (`PeekMenu`) | a destructive item draws `error` glyph and label; the action runs only after the sheet has closed | `commit()` on open; a throw toasts "That didn't work. Please try again." | PeekMenu.js:93, 101-132, 135-187 |
| D9 | A change that rewrites the plan (not destructive in the data sense) | a preview sheet with a Now and After table and "Nothing is saved until you confirm." / "Your current plan stays until you confirm."; `emphatic` confirm over `tertiary` "Not yet" | the receipt | PlanPreviewSheet.js:138-148, 162, 194, 390-406 |

OBSERVED across the nine patterns read: a delete the person can take back (food rows, mute) gets no dialog and an Undo or reversal toast; a delete that cannot be taken back (history, restore, account) gets an isolated row plus an AppAlert that names the loss; every destructive AppAlert button is red text on transparent, never a red fill (AppAlert.js:301, 305). AppAlert has 44 `style: 'destructive'` buttons in 27 files outside the logger files (5 more sit in `ActiveWorkoutScreen` and `WorkoutHistoryScreen`, counted not read) (grep); I did not classify each into D3 to D7. SUGGESTS: reversibility chooses the pattern, and the Undo toast (D1, D2) is the vocabulary a set or exercise delete in the logger would borrow; whether the logger already does is A1's finding.

### 6f. Feedback that closes a sheet or a flow

| Feedback | OBSERVED | Cite |
|---|---|---|
| Button morph then close | the action `Button` shows loading, then a checkmark for 900ms with the `commit()` haptic, then `onSettled` closes the sheet | Button.js:185-194, 233-253; food/QuickAddSheet.js:163-170 |
| In-sheet done state | FeedbackSheet swaps its content for a 36px `success` check-circle, "Thanks" and one muted line | FeedbackSheet.js:236-243, 402-410 |
| Toast after a single-food log | a Diary usual chip, the food sheet's "Add to diary" and Quick add raise `undo` with the food's name and portion (template "[name] logged, [portion].", "[name] added.", "Quick add saved."); the plate, a curated meal and a suggested food close back to the Diary with no success toast | screens/DiaryScreen.js:856-860; screens/FoodSearchScreen.js:512-514, 572-577; no toast at :472-474, 587-589, 629 |
| Partial failure named | "Logged [n] of [total]. The rest didn't save, try again." (error, 5000ms); the logged items leave the tray so a retry cannot double-log | screens/FoodSearchScreen.js:475-487 |
| Toast position | every toast docks at `49 + bottom inset + sm` above the screen bottom; the tab bar is hidden only while `ActiveWorkout` is the focused route, so on that screen the offset clears nothing (AMBIG 12); whether a bar shows under the Add food modal is AMBIG 14 | Toast.js:42, 234; VolyumeTabBar.js:108-110 |

## 7. Lists and pickers

Paths are under `src/`. The Add food screen is `screens/FoodSearchScreen.js` (FS below). `components/ExercisePickerModal.js` (the logger's own picker) was not read.

### 7a. Add food, top to bottom (the mature picker)

| Layer | OBSERVED | Cite |
|---|---|---|
| Frame | modal route; `SafeAreaView` top edge only; `ModalHeader title="Add food"` with the close X on the right | FS:910-912; navigation/RootNavigator.js:416-419 |
| Tab strip | horizontal `ScrollView`: Recent, Suggested, Favourites, Frequents, More. Label `type.label` `textMuted`, active `textPrimary` Semibold with a 2px amber underline (`radius.hair`); strip edge 1px `border`; tab padding `md`, role `tab`; `selection()` on change | FS:914-935, 1107-1132; lib/food/searchTabs.js:18-24 |
| Search | shared `SearchBar` with margin `md`, "Search foods or brands", spinner while a request runs; the same bar on every tab; 2 or more characters make it a database search from any tab (250ms debounce); autofocus only when the recents list loaded empty (a key remount makes the flag bite) | FS:940-954, 1134-1136, 383-409; searchTabs.js:26-34 |
| Pre-typing note | one `captionTight` muted line: "Saved foods work offline. Live search can also check trusted UK generics and branded products." Hidden once a query starts | FS:958-965 |
| Row | `FoodRow`: 64 tall, name `fontSize.md` Semibold on one line, meta `fontSize.sm` muted "Brand - serving - 412 kcal  Source", 1px `borderSubtle` divider; trailing "+ Add" pill (amber glyph and label on `primaryBg`, 40 tall, `radius` 999, hitSlop 12) or a chevron. Tap opens the food sheet, "+ Add" stages one serving on the plate, long-press cycles favourite, excluded, neutral (a toast confirms) | components/food/FoodRow.js:73-130, 132-162; FS:737-793, 638-661 |
| Row states | favourite appends "Starred" to the name; excluded draws the name struck through and muted with a `close-circle`; a custom food gets a trailing pencil | components/food/FoodRow.js:83-113, 141-143 |
| Ranking | typed results lift favourites (weight 3), foods logged in this slot or often (2), the person's own foods (1), then generic rows; stable within a weight | lib/food/searchTabs.js:45-64 |
| "More" tab | CTA rows, not food rows: amber glyph 20, `bodyStrong` label, chevron, 1px `borderSubtle`: Add custom food, Scan barcode, Quick add calories, Recipes, Saved meals | FS:720-735, 739-757, 1142-1147 |
| Suggested tab | cards on `surface`, radius `lg`, 3px amber left edge, name `bodyStrong`, macros `caption` `textSecondary`, amber `add-circle` 26 (food) or chevron (meal); above them a sized-for-this-meal hint and a leaf-glyph note | FS:819-905, 1149-1171 |
| Results footer | a `secondary` "Add custom food" button after a non-empty result list | FS:974-986, 1172-1186 |
| Plate bar (staging tray) | docked above the bottom inset: "N to log" `bodyStrong` over "~kcal - tap to review" `caption` muted, and a `Log N` button (default `primary`, raised charcoal, content width). The text opens a sheet "Selected foods (N)" with a remove `close-circle` per row (list capped at 360) and [Clear outline, Log selected primary] | FS:991-1013, 1015-1058, 1188-1225 |
| Logging | on success the screen pops back to the Diary; a single-food add raises the Undo toast (6f) | FS:472-474, 572-578 |

### 7b. The other searched lists, side by side

| Screen | Search | Filters | List | Loading, empty, error | Cite |
|---|---|---|---|---|---|
| Community search | `SearchBar` autofocus, spinner | two radio `Chip`s (People, Groups) under the bar; recent searches as plain `Chip`s with a `captionStrong` "Clear" in amber | `FlashList` of `ProfileCard` or `GroupRow` | 3 `SkeletonRow`; first-use `EmptyState`; offline and error `EmptyState` with "Try again"; no-match `EmptyState` | screens/CommunitySearchScreen.js:114-196 |
| Find people | `SearchBar`, `onSubmitEditing` hands the query on | none | `FlashList` | 5 `SkeletonRow`; `EmptyState` | screens/CommunityFindPeopleScreen.js:201-240 |
| Plan library | `SearchBar` "Search plans" inside a `filterPanel` | a horizontal `FlatList` of `Chip`s under the bar (collections), role radio; a division grid appears when one is chosen | `FlashList` in a `listBand`, quiz banner as a header card | 3 `SkeletonCard` of 96; `EmptyState` "No plans found"; error `EmptyState` "Couldn't load plans" with "Try again" | screens/PlanLibraryScreen.js:666-769 |
| Lift progress | `SearchBar`, shown only when rows exist | hand-built pill tabs (All lifts, Recent bests) and a wrapping row of metric pills, both `primaryBg` plus `primary` border when selected, not the shared `Chip` | `FlashList` of lift cards | 5 `SkeletonRow`; error `EmptyState compact`; empty is a hand-built 56px glyph plus title and text | screens/LiftProgressScreen.js:373-384, 460-478, 845-870, 640-680 |
| People filters | none | `SectionLabel tone="muted"` ("Where") over `Chip` groups inside a sheet | n/a | n/a | components/community/PeopleFiltersSheet.js:135-160 |

### 7c. Chips do four jobs

| Job | OBSERVED | Cite |
|---|---|---|
| Exclusive choice (radio) | meal slot (a row of equal chips, labels `fontSize.sm`), amount unit, raw or cooked, search mode, plan collection, report reason, readiness thirds. Selected = `primaryBg` fill, `primary` border and label | food/FoodDetailSheet.js:298-313, 357-378, 446-461; food/QuickAddSheet.js:139-153; HomeScreen.js:3410-3440; community/ReportSheet.js:82-92; Chip.js:65-93 |
| Window tab | `WindowChips`: equal chips, role tab; `inkSelected` draws the selected chip in ink so a second control on a screen stays off amber | WindowChips.js:7-14, 23-52, 64-68 |
| One-tap action | the Diary "usual" chip: `surface2`, `border`, pill, `type.label` ink text, amber `add` glyph 14; the label states the portion it will write ("Porridge oats, 60 g" shape) and a hold changes it | food/MealSection.js:171-217, 326-332, 43-58 |
| Recall | recent searches replay on tap | screens/CommunitySearchScreen.js:140-153 |

Two further selected-state idioms sit next to the chips: the underlined tab (FS:914-935) and the amber-filled `SegmentedControl` for 2 to 4 exclusive modes in forms (SegmentedControl.js:49-69; 6 importing files). Hand-built chip look-alikes exist: the usual chip above, the "+ Add" pill (FoodRow.js:144-155), Lift progress's two pill rows (screens/LiftProgressScreen.js:846-870), the Home "Next up" badge (HomeChangeWorkoutSheet.js:231-236).

### 7d. Sectioned lists and groups

| Device | OBSERVED | Cite |
|---|---|---|
| No `SectionList` | converted surfaces may not use `FlatList` or `SectionList`; sections are drawn as items | src/__tests__/e8FlashList.guard.test.js:16-45 |
| Overline label between groups | `SectionLabel` (55 files) or the uppercase Community `Eyebrow` with one trailing action | components/SectionLabel.js:28-44; components/community/Eyebrow.js:62-78 |
| One container per group | `Card padding="none"` or `NavGroup`: rows self-pad, hairline between rows, heading outside the box | screens/AnalyticsScreen.js:432-451, 628-660; components/NavRow.js:78-102; components/coachOutput/CoachOutputCards.js:73-83 |
| One card per section | a Diary meal: header with the name and a tabular subtotal, then flush rows, chips or an Add hub | components/food/MealSection.js:13-18, 149-156, 304-319 |
| Grouped muscles | Recovery groups its rows by muscle group and leaves empty groups out | components/MuscleRecoveryList.js:203 |

### 7e. Recents and "again", wherever they live

| Where | OBSERVED | Cite |
|---|---|---|
| Add food, first tab | slot-aware: the list is filtered to the meal being logged and each row carries its last-used portion; the code calls it "Add again", the tab says "Recent" | lib/food/searchTabs.js:10-17; FS:413-433 |
| Food sheet | opens on the remembered portion for this food in this slot (`last_quantity_g`, else the slot's remembered grams) | FS:1065-1072; food/MealSection.js:43-58 |
| Diary empty meal | "Your usual foods are below. Pick something else if this meal was different." then chips; where yesterday had food in the slot, a "Yesterday's [meal]" copy chip leads the row | food/MealSection.js:157-163, 184-217 |
| Community search | recent searches as chips with a "Clear" link | screens/CommunitySearchScreen.js:128-153 |

## 8. Empty, loading and error states as shipped

Paths are under `src/`. `EmptyState` anatomy is in section 1a, `Skeleton` in 1d.

### 8a. Loading

| Surface | OBSERVED | Cite |
|---|---|---|
| Today | first cold load only: `SkeletonCard` 64 (the weigh-in strip) then 160 (the hero) in a `gap: md` column, "the skeleton teaches the hierarchy"; it disappears when `loadData` ends, and `finally` clears it even if a loader throws | screens/HomeScreen.js:2690-2703, 523-558 |
| Progress | section labels render at once; the plan week and the Answer Block are each a `SkeletonCard` at the real block's height | screens/AnalyticsScreen.js:412-415, 437-439 |
| Recovery | three `SkeletonCard`s at 190 (ratings), 320 (by muscle) and 150 (learning), each only while its slot loads | components/ReadinessCards.js:944, 955, 1023, 1025 |
| Coaching decision | `LoadingView`: four `SkeletonCard`s (72, 140, 180, 120) under the kept `BackHeader` | screens/CoachOutputScreen.js:810-819, 2582-2589 |
| Diary | three `SkeletonRow`s at `lg` side padding while `!loaded` | screens/DiaryScreen.js:1655-1660 |
| Add food | Suggested tab: three `SkeletonRow`s ("content-shaped skeleton rather than a bare spinner"); a typed search shows the spinner inside the `SearchBar` | screens/FoodSearchScreen.js:819-828; components/SearchBar.js:59-60 |
| Community | `SkeletonPersonRow` x3, drawn in the person row's own shape because the shared `SkeletonRow` made every Community list "jump sideways" when data landed | screens/CommunityHubScreen.js:796-798; components/community/SkeletonPersonRow.js:1-43 |
| Other lists | Lift progress 5 `SkeletonRow`; Plan library 3 `SkeletonCard` of 96; Find people 5 `SkeletonRow` | screens/LiftProgressScreen.js:640-650; screens/PlanLibraryScreen.js:756-761; screens/CommunityFindPeopleScreen.js:222 |
| Pagination | an amber `ActivityIndicator` footer; refresh spinners are `primary` (Community hub `textMuted`) | screens/CommunityHubScreen.js:869, 875-880 |
| Rule as written | "render the skeleton in the same layout slot, so when real data arrives there's no jump"; full-screen spinners are replaced by skeletons on data-heavy screens | components/Skeleton.js:3-16 |
| Shape fidelity | blocks are `surface3`, bars radius 6, `SkeletonCard` is `surface2` with a `border` edge at radius `md` and three fixed bars; it does not draw the real block's shape. `SkeletonRow` passes `r={8}` but `Skeleton` reads `radius`, so its square renders at 6 (AMBIG 11) | components/Skeleton.js:24, 59, 68-97 |

### 8b. Empty

| Surface | OBSERVED | Idiom | Cite |
|---|---|---|---|
| Today, no plan | `EmptyState` barbell: "No active plan yet", a body sentence, `Start with a plan` (default button, `busy` while preparing) and `Browse plans` (secondary) | shared `EmptyState` | screens/HomeScreen.js:3018-3040 |
| Today, plan without sessions | `EmptyState`: "Your plan has no sessions yet", "Open your plan" and "Choose a different plan" | shared | screens/HomeScreen.js:2998-3012 |
| Today, first run | a dismissible welcome card above the stack, shown until the first session is logged | card | screens/HomeScreen.js:2735-2737 |
| Progress | `EmptyState` analytics glyph: "No training trends yet", "Training charts appear here once sessions are logged. Weigh-ins, photos and scans are in the rows above."; no action | shared, text only | screens/AnalyticsScreen.js:529-536 |
| Recovery, day zero | no card: one `bodySm` line under the kept heading, "Each muscle's recovery shows here after your first session.", or "No session in the last 14 days, so there is no estimate to show." | plain line | components/ReadinessCards.js:814-818, 976 |
| Coaching decision, hold | `InsufficientDataView`: a `Card` with a 32px amber `time-outline`, "Not enough to go on yet.", a receipt (rows of `checkmark-circle` `success` or `ellipse-outline` `textMuted` with the rule applied), the unlock date, then a `size="lg"` "Got it" | hand-built card with a ledger | screens/CoachOutputScreen.js:822-870 |
| Diary, empty day | a card: muted `restaurant-outline` 28, "Nothing logged for this day yet.", a "Meal builder" `FeatureRow`, then `Add food` (default, `sm`) and `Copy yesterday` (`secondary`, `sm`) | hand-built `EmptyDiary`, grey glyph, no amber ring | components/food/EmptyDiary.js:19-75, 77-100 |
| Diary, empty meal | one muted sentence ("Your usual foods are below...") then chips | inline | components/food/MealSection.js:157-163 |
| Diary, no targets | `EmptyState compact`, "Set nutrition targets" | shared compact | screens/DiaryScreen.js:1556-1565 |
| Add food, per tab | `EmptyState` with a tab glyph (clock, star, repeat) and one sentence, no title and no action | shared, text only | screens/FoodSearchScreen.js:75-85, 795-817 |
| Add food, no match | `EmptyState`: `No matches for "[query]".`, "Add custom food" and "Clear search"; an offline variant swaps the glyph to `cloud-offline-outline` and says live search cannot check the library | shared | screens/FoodSearchScreen.js:795-813 |
| Community hub section | "one line, one action, never a paragraph": a `bodySm` muted sentence and a `tertiary sm` button; a founder defect ("it looks rubbish") removed the boxed poster | plain line plus button | screens/CommunityHubScreen.js:810-848 |
| Lift progress | hand-built: 56px glyph, title, text; copy differs for a search, the Bests filter and a first run | hand-built | screens/LiftProgressScreen.js:660-679 |

OBSERVED: three empty idioms coexist (the shared `EmptyState`, hand-built cards, and one plain line), and the amber-ringed glyph appears only in the first; EmptyState is imported by 46 files.

### 8c. Error and failure

| Case | OBSERVED | Cite |
|---|---|---|
| Whole-screen load failure | `EmptyState` with `cloud-offline-outline`, a title naming what failed, a line that promises the data is safe ("Your training history is safe. This is a loading problem, not lost data.", "Nothing has been lost."), one retry button; the screen chrome stays | screens/AnalyticsScreen.js:511-523; screens/DiaryScreen.js:1661-1675; screens/CoachOutputScreen.js:874-893, 2592-2599; screens/PlanLibraryScreen.js:746-756 |
| Failure never reads as empty | the error branch is tested before the empty branch, and only when nothing is on screen to keep | screens/DiaryScreen.js:1661-1676; screens/AnalyticsScreen.js:503-510 |
| Partial failure inside a block | the block keeps its heading and says so in one `bodySm` `textSecondary` line: "Couldn't load the estimate just now." / "Couldn't load your ratings just now." | components/ReadinessCards.js:876, 970-971, 1081 |
| Offline with a cache | the cached list stays and a muted caption says "Showing what you last saw. You are offline."; with no cache, an `EmptyState` ("You are offline" or "Could not load Community") whose retry is the secondary button | screens/CommunityHubScreen.js:784-810 |
| Today | no screen-level error view: loaders guard themselves and `finally` clears the skeleton; failures of an action are toasts | screens/HomeScreen.js:523-558, 1051, 1564, 1655, 1769, 1807 |
| A write fails | an `error` toast (4000ms, 5000ms for plan start and partial log), plain words, no codes. Punctuation forms differ: "Couldn't save weight, try again" (Today), "Couldn't log that. Try again." (Diary), "Couldn't add that food, try again." (Add food) | screens/HomeScreen.js:1051; screens/DiaryScreen.js:868; screens/FoodSearchScreen.js:633 |
| Validation | `error` border plus a `FieldError` line; a number out of range raises a `warning` toast naming the range in the person's unit | components/FieldError.js:12-26; components/food/QuickAddSheet.js:76-90 |
| Retry copy | "Try again" (Coach, Plan library, Lift progress, Community), "Retry" (Diary, Progress) | screens/CoachOutputScreen.js:887; screens/PlanLibraryScreen.js:752; screens/LiftProgressScreen.js:658; screens/DiaryScreen.js:1671; screens/AnalyticsScreen.js:516 |

## 9. Light theme: what changes structurally

Paths are under `src/`. The theme is resolved by `resolveTheme(prefs)`: palette `baseColors`, overlaid by `lightColors` when the choice is light (`prefs.theme` is dark, light or system), then by the higher-contrast and colour-blind-safe tables for the chosen theme; `useTheme()` returns the live result (styles/theme.js:468-500; hooks/useTheme.js:9-31). A frozen `StyleSheet.create` block never flips, so a surface follows a theme change only through its live layer: the `buildLiveStyles(t)` override (applied last, so it wins) or values read from `useTheme()` in the body (components/BottomSheet.js:361-373; components/Card.js:60-65; docs/rules/styling.md:210-212; pinned for the primitives by components/__tests__/cp10Stage1LiveTheme.test.js:1-22).

| # | Structural change | Dark | Light | Cite |
|---|---|---|---|---|
| 1 | What carries elevation | the surface ladder, lighter is higher: background #0D0D0D, surface #191917, surfaceElevated #222220, surface2 #2A2A27, surface3 #343431; shadow opacities .3, .4, .5 | shadow is "the PRIMARY elevation cue": `Card` is the only consumer of `shadow.card` (offset 0 by 1, opacity .08, radius 4, elevation 1; grep); `shadow.sm`, `md`, `lg` opacities drop to .10, .14, .18 | styles/theme.js:37-49, 331-357, 785-794; components/Card.js:94-102 |
| 2 | Ladder direction | surfaceElevated is lighter than surface | inverted: surface is white #FFFFFF, surfaceElevated #F6F6F1 is darker ("inset darkens on light"), surface2 #EFEFEA, surface3 #E7E7E1, background #FAFAF7 | styles/theme.js:224-228 |
| 3 | Amber splits into ink and fill | `primary` #F5A623 is the ink (text, icons, selected borders); `primaryFill` #E08C0B is the deeper fill; `onPrimary` #0D0D0D | `primary` becomes the dark ink #8A5200 and `primaryFill` becomes the bright #F5A623; `onPrimary` stays near-black. The amber text and the amber button are different hues on a light screen | styles/theme.js:60-71, 232-234 |
| 4 | Watch colour | Okabe-Ito yellow #F0E442 | olive #6E6300, kept distinct from the amber ink | styles/theme.js:91, 235-239 |
| 5 | Ink for text on a tint | `onSuccessBg` #77C27A, `onErrorBg` #F88A82 | #266729, #AE2323, darker so pills clear 4.5:1 at every surface step | styles/theme.js:117-118, 249-250 |
| 6 | Tints and scrim | `primaryBg` .12, `warningBg` .15, scrim .55 | .18, .18, .45 | styles/theme.js:63, 92, 189, 234, 240, 270 |
| 7 | Chart and category hues | `chartLine` #F59E0B, `macroProtein` #F5A623, `recovery` #E8735A | `chartLine` and `macroProtein` #B45309, `recovery` #B5472F, `macroCarb` and `volumeMinimum` #1E78B4, `macroFat` #8E5BC7 | styles/theme.js:165, 181, 201, 261-275 |
| 8 | Destructive fill | `errorFill` #C62828 under white `onError` for a Button; `error` #F44336 stays the ink | `error` is already #C62828 | styles/theme.js:80, 93, 103, 243 |
| 9 | Fixed in both themes | `chipInk` #000 behind the header V, `camera` #000, Apple button colours, `onError` #FFF | same | styles/theme.js:80, 147, 156 |
| 10 | System chrome | status bar text light; navigation container `dark: true` | status bar text dark; `dark: false`; `Appearance.setColorScheme` follows the choice | App.js:203, 1094; navigation/navTheme.js:37 |
| 11 | Tab bar | `surfaceElevated` with a `borderSubtle` top edge | the same two tokens, so #F6F6F1 over a #E4E4DF hairline; the `tabBar` token (#111111 dark, #FFFFFF light) has no importer in screens, components or navigation (grep) | components/VolyumeTabBar.js:81, 192-194; styles/theme.js:127, 255 |
| 12 | Share card | own dark or light theme per card (default dark, toggle on the share screen): light ground #FAFAF7, text #1A1A18, hero numeral amber #B45309; the amber frame stays bright #F5A623; over a photo the card keeps the DARK palette (light text on the dark scrim); the sticker is dark in both | | lib/shareCard/drawShareCard.js:67-103, 116-126, 1536-1538, 1721, 1755; screens/ShareCardScreen.js:196, 1057-1065 |
| 13 | Modifier tables | `darkHC`, `darkCVD` | `lightHC`, `lightCVD` (the colour-blind palette swaps success to blue and error to magenta in both) | styles/theme.js:283-329, 475-477 |

OBSERVED: no component swaps a layout, a glyph or a radius by theme. Outside `styles/theme.js` the only theme conditionals are `Card`'s shadow (components/Card.js:102), the share card, the status bar and the navigation theme (grep for `resolvedTheme`, `isLight` and `=== 'light'` over screens, components, lib, navigation, App.js). Card-like containers draw their edge in `borderSubtle` in some files and in `border` in others, because the frozen and the live layers disagree in some of them (AMBIG 5). SUGGESTS: a new logger surface built from `Card`, `Button`, `Chip` and live tokens needs no light-theme code; one that hand-draws a shadow, a hairline or an amber text and an amber fill must read `primary` and `primaryFill` as the two different tokens they are.

## 10. The surfaces that read as the app's best

Paths are under `src/`. "Best" is my judgement from what the code and its comments record, not a measured result; the evidence for each is what the file does and what the founder is quoted as having changed. Order is by how much of the vocabulary the surface shows.

### 10a. Today: the hero card

- One elevated object. The hero is `Card surface="surfaceElevated"`; every other block on the screen is flat `surface`, so rank is carried by depth and not by colour (screens/HomeScreen.js:2860, 3588-3592). The card's style note: "Stat goes in the eyebrow line so we don't waste a row on a coloured pill that fights the workout name for attention" (HomeScreen.js:3583-3587).
- One shape, four states: workout in progress (a `success`-filled resume card), block complete, week complete and the training hero share the eyebrow, the 24px name, at most one line of body and at most one primary action; "week complete" has no primary action "because nothing is owed" (HomeScreen.js:2759-2775, 2783-2800, 2837-2858, 2860-2992).
- A five-step hierarchy with no numeral needed: muted overline eyebrow (recovery state and plan position), a 24px Heavy session name on a 30 line, a 13px `textSecondary` meta line, one `bodySm` recovery sentence that is also the door to Recovery, then the buttons (HomeScreen.js:2862-2895, 2897-2912, 3596-3602).
- One dominant action and one quiet one: "Start workout" in the default charcoal `primary` with the amber play glyph, beside a content-width `secondary` "Options"; view, blank, skip and switch live in a sheet "so the hero keeps a single dominant CTA" (HomeScreen.js:2961-2985, 3621-3623; components/Button.js:61-79).
- Extras are one sentence, never a nested card: the coach brief was reduced from a card-in-card to one dismissible line, and a "weeks running" echo was removed ("the weekly run/streak construct is rejected product-wide") (HomeScreen.js:2936-2955, 2987-2992, 3642-3655).
- It describes and never recommends (D219): the recovery line names the session shown; there is no reason line and no switch of the Start target (HomeScreen.js:2897-2912).

### 10b. Progress: the plan-week card and the Answer Block

- The screen opens on a count in words: "2 of 4" as an `h2` number and `bodyStrong` "sessions" on one baseline, one `bodySm` subline, seven weekday cells; no amber, no streak, no instruction (components/PlanWeekCard.js:2-24, 56-73, 92-95).
- The Answer Block is three or four rows (Progress photos is conditional) in ONE raised container: glyph, overline label, a verdict in words (`bodyStrong`), one evidence line (`bodySm` secondary), chevron; padding `lg` by `md`; hairlines drawn in `border` because on the raised surface `borderSubtle` "falls to 1.17:1" (screens/AnalyticsScreen.js:432-451, 832-842, 862-866).
- Facts stay ink: pillar glyphs, week cells and the difficulty chip carry no amber; the one amber on the screen is an invitation (the monthly recap banner) (AnalyticsScreen.js:597-617, 861-866).
- First paint keeps its shape: section labels render at once, skeletons hold each block's real height, `AnimatedEntrance` fades the blocks in (AnalyticsScreen.js:412-417, 437-440).

### 10c. Recovery by muscle

- It was rebuilt after a founder rejection recorded in the file: "this wall of text looks horrible it looks like raw text with no styles no interactivity no format at all ... this looks amateur" (2026-09-26). The fixes are the vocabulary: rows grouped under counted labels ("Still recovering · 4"), the recovered group collapsed to one line of names with a "Show details" link ("eight identical full bars buried the four rows that matter"), one row open at a time (components/MuscleRecoveryList.js:1-31).
- One row is a name, "60% recovered" (a percent always beside its word), a chevron, a full-width 6px bar and one muted meta line "Ready by Thursday · Trained 2 days ago" (MuscleRecoveryList.js:425-465, 563-573, 583-597).
- One hue graded by intensity, never a traffic light: the `recovery` terracotta solid under 50%, half strength to 74%, edge strength from 75% with a 1px outline (MuscleRecoveryList.js:152-165, 447-456).
- The answer leads in a sentence ("4 muscles still recovering, 2 nearly recovered, 8 recovered.", `type.h3`), the body figure is its own card, "Estimated" sits in the sub-line for every percent, and no amber appears anywhere ("Facts are ink") (components/ReadinessCards.js:33-34, 326-337, 964-969, 1088).

### 10d. Diary: the calorie ring, the meal card and the undo

- The hero counts down: calories left as a 32 Bold tabular numeral inside a 132px ring with a 14px stroke, "left" in `xs` muted; the eaten total sits beside it as a `fontSize.xl` secondary reference ("not a second hero"); the ring is amber and judges nothing, and "over" is the same ink as "left" (components/food/MacroRings.js:11-12, 21-35, 249-262, 300-339, 396-431).
- Motion only where data changes: the ring sweeps on a UI-thread shared value (`motion.hero` 440) and the numerals roll; no per-frame JS; a 1.3 text-scale cap keeps the numeral inside the ring (MacroRings.js:11-24, 249-253; components/RollingNumber.js:9-14).
- A meal is one card: name and a tabular subtotal in the header, flush rows with a hairline top, one-tap usual chips that state the portion they write, rows that glide in and out (components/food/MealSection.js:13-29, 149-156, 171-217, 221-247, 304-319; components/AnimatedRow.js:37-53).
- Reversible by design: a delete or a log commits, then an 8s Undo toast; no confirm dialog (screens/DiaryScreen.js:856-864, 1302-1323; components/Toast.js:64).
- Every number says what it is: "412 kcal", "32P 40C 12F", "120g  ·  08:30", "123 / 150g" (components/food/EntryRow.js:108-135, 217-240; MacroRings.js:455-517).

### 10e. The share card

- Built from the founder's complaint "it looks too AI generated ... Use styles from the rest of the app and none of the pill nonsense": no pills, no icons, no trophy, no glow, no gradient orb, no lit frame; uppercase section labels, hairline rules "the way the app's cards divide their rows", and ONE amber object, the hero number (lib/shareCard/drawShareCard.js:20-36).
- The amber outline is the founder's own request (2026-09-26) and is drawn round the content, at the app's card corner and 16 margin scaled to the card (`FRAME_RADIUS` 44 for radius 16, stroke 6) (drawShareCard.js:675-717).
- Structure comes from columns and hairlines: "Up to four numbers in equal columns, each a value (with its unit) over a plain caption. No boxes, no icons" (drawShareCard.js:874-896).
- A lift is a row "the way the app lists a set": name left, set right; a long name steps down to four fifths of its size before it wraps to a second line ("longer exercises don't fit in") (drawShareCard.js:898-934).

### 10f. Runners-up, and why they are not in the five

- Coaching decision: a `Card elevated` with a `tone="primary"` amber edge, a `type.h2` title ("the one loud line"), one amber `emphatic` Apply, hairline `WeekRow`s with a glyph, label, tabular value and mark, and a staged reveal that never animates the safety zone (screens/CoachOutputScreen.js:3249-3253, 3381-3388; components/coachOutput/CoachOutputCards.js:22-25, 49-71; CoachOutputScreen.js:3003-3009). Its vocabulary is mostly Today's and Progress's, with more amber.
- Food amount entry (`FoodDetailSheet`): one calm sheet where unit chips, a 48x54 stepper around a text field, four equal macro pills, meal chips and one action row do the job; it is the nearest app precedent for a number-entry sheet (food/FoodDetailSheet.js:282-505, 530-636). It repeats an amber selected chip in two groups and uses hand-rolled controls, so it is a precedent rather than a model.

### 10g. Founder verdicts recorded in the code (taste constraints)

| Verdict | Where | Cite |
|---|---|---|
| "too AI generated ... none of the pill nonsense" (2026-09-26) | share card restyle | lib/shareCard/drawShareCard.js:20-22 |
| "there's no border or outline so no obvious ending on a share. Need the amber outline we have in other areas of the app" (2026-09-26) | share card frame | lib/shareCard/drawShareCard.js:677-680 |
| "raw text with no styles no interactivity no format at all ... this looks amateur" (2026-09-26) | Recovery by muscle | components/MuscleRecoveryList.js:2-5 |
| "it looks rubbish": a boxed poster with a 52 dp icon, title, paragraph and button for an empty section (2026-09-14), and a skeleton that "jumped sideways" | Community hub, `SkeletonPersonRow` | screens/CommunityHubScreen.js:813-826; components/community/SkeletonPersonRow.js:5-16 |
| the weekly run or streak construct "is rejected product-wide" | Today | screens/HomeScreen.js:2987-2992 |
| "Never re-add a standing education row to the Diary without a founder order" (2026-08-17) | Diary | screens/DiaryScreen.js:1566-1571 |
| a standalone text link on the hero "read badly on its own" (2026-09-08), so Skip moved into the Options sheet | Today | screens/HomeScreen.js:2983-2986 |
| colour is "an accent, a selection and an identity, not 'this is a button'" (D148) | Button hierarchy | components/Button.js:9-19 |
| a ring that makes "no colour judgement about being under or over target" (2026-05-29) | Diary ring | components/food/MacroRings.js:21-28 |
| the "wireframe" edge: a frozen `borderSubtle` and a live `border` disagreed and the live one won | the logger's set editor (the doc's account; the file was not read) | docs/rules/styling.md:290-296 (inside the section marked history) |

### 10h. What the five have in common (SUGGESTS)

- One elevated or amber thing per screen, and the rest flat and ink (HomeScreen.js:3588-3589; AnalyticsScreen.js:432-451; ReadinessCards.js:33-34; drawShareCard.js:28-31).
- A number is always beside its words or unit, in tabular figures, and its reference sits quietly beside it rather than competing (PlanWeekCard.js:56-62; MacroRings.js:396-431; MuscleRecoveryList.js:425-465).
- A group is one container with hairlines between rows, a label outside the box, and a sentence for the verdict (AnalyticsScreen.js:432-451; MealSection.js:149-156).
- Motion is reserved for data that changed, and the press feel is the shared spring (MacroRings.js:249-253; PressableCard.js:75-135).
- Loading, failure and emptiness are branches of one chain, in that order, with the chrome kept: skeleton, then the error `EmptyState`, then the empty state, then content (screens/DiaryScreen.js:1655-1683; screens/CoachOutputScreen.js:2582-2610; screens/AnalyticsScreen.js:511-536), so a new surface needs no new state vocabulary.

## 11. Ambiguities

Recorded, not interpreted. Each item names the two things that disagree and where; I did not decide which is intended. Paths are under `src/` unless they start `docs/`.

1. Type scale: `docs/rules/styling.md:74` lists a `hero` role (56, InterDisplay-ExtraBold) in the live type section; `buildTypeRoles` has no `hero` (styles/theme.js:609-737). The largest data numeral role in code is `display` 40, and the share card draws its numeral at 108 (square), 138 (portrait) and 160 (story) design px (lib/shareCard/drawShareCard.js:849-862, 1031-1036).
2. Deleted roles: `docs/rules/styling.md:44-58` says `gold`, `silver`, `bronze`, `celebrationEmber`, `celebrationViolet` and `shadow.glow` were deleted (D173, D174) and `src/lib/__tests__/rewardProps.guard.test.js` fails if they return. The tree still defines and uses them (styles/theme.js:132, 161-162, 258-260, 800; components/PRCelebration.js:30-33, 237; components/VolyumeChart.js:463; screens/ProOnboardingScreen.js:3763) and that guard file does not exist.
3. Reduce Motion on stack transitions: `docs/rules/styling.md:118-127` says a stack transition cross-fades (corrected 2026-09-15, D182); `navigation/RootNavigator.js:392-395` still returns `animationEnabled: false` under Reduce Motion, an instant cut merged into every stack.
4. Button hierarchy: `docs/DESIGN_SYSTEM.md:262-272` tabulates Primary as `primaryFill` amber, a "Completion" `success` fill, and Tertiary as no fill; `components/Button.js:9-19, 61-79` makes `primary` a raised charcoal, has no completion variant, and draws `tertiary` on an amber tint with an edge. `docs/rules/styling.md:160-161` lists four variants and omits `emphatic` and `outline`.
5. Card edge colour: `Card` (components/Card.js:101), `EmptyState` (:181), `NavGroup` (NavRow.js:81), settings sections (SettingsPrimitives.js:134) and `MealSection` (food/MealSection.js:413, whose comment at :307-310 says `border` "carried a brighter outline than every real Card beside it") draw `borderSubtle` live. `CollapsibleSection` (:61), `EvidencePanel` (home/EvidencePanel.js:102), `EmptyDiary` (food/EmptyDiary.js:109), `AppAlert` (:315), the date-picker card (food/DiaryDatePicker.js:128) and the Add food suggestion card (screens/FoodSearchScreen.js:1250-1254) draw `border` live over a frozen `borderSubtle`.
6. Illustrations: `docs/DESIGN_SYSTEM.md:396` says first-run empties use the hand-built SVG `Illustrations`; `components/Illustrations.js` exists and no non-test file imports it (grep over src).
7. Press feel: `docs/rules/styling.md:129-130` says `PressableCard` for card-shaped touchables; the tree has 438 `<TouchableOpacity` tags in 115 files, 105 `<Pressable` and 37 `<PressableCard` (counts include logger files), with seven different `activeOpacity` values (5a).
8. Set notation, outside the logger files: "90 kg × 8" (ShareCardScreen.js:96-100; lib/shareCard/drawShareCard.js:1163-1167; community/ActivityItemRow.js:101); "142.5kg x 8 reps" with a letter x and no space (screens/ExerciseDetailScreen.js:1201-1202); "80 kg x 8" (community/PostCard.js:75); "62.5kg assistance × 6 reps" (lib/algorithms.js:543). Grep only: "3 × 90 kg × 8" (WorkoutHistoryScreen.js:140) and "4 x 8-12" (WorkoutSummaryScreen.js:1804). `drawShareCard.js:1163` calls the first form "the set as the app writes it".
9. Haptics: `lib/haptics.js:165-166` documents `press()` as "Pressing a primary action button"; `Button` fires `selection()` for that (Button.js:196-202) and `press()` has one call site (screens/DiaryScreen.js:1289). `docs/DESIGN_SYSTEM.md:399-400` pairs an error toast with `haptics.error()`; there are 237 `variant: 'error'` toasts and one `haptics.error()` call (screens/ProOnboardingScreen.js:540). Whether haptics should follow Reduce Motion is an open decision in the file (lib/haptics.js:13-21).
10. Amber on icon tiles, chips and buttons: `components/NavRow.js:7-13` makes tiles ink under "amber only on an action ... never on a fact" (D214, D174) and `components/WindowChips.js:7-14` says "one amber sits on a screen"; yet `SettingRow` (SettingsPrimitives.js:37-45), `EmptyState` (EmptyState.js:73-79, 142-152), the Home and Diary sheet rows (HomeChangeWorkoutSheet.js:199-206; screens/DiaryScreen.js:2335-2344), a `Toast` `info` (Toast.js:60) and AppAlert's default buttons (AppAlert.js:300) are amber, and `FoodDetailSheet` shows two amber-selected chip groups at once (food/FoodDetailSheet.js:298-313, 446-461).
11. Skeleton: `SkeletonRow` passes `r={8}` (components/Skeleton.js:90) but the prop is `radius` (:24), so the square draws at 6. `SkeletonCard` is one generic three-bar block while `docs/DESIGN_SYSTEM.md:391-393` says "content-shaped"; `community/SkeletonPersonRow.js:5-16` records that the shared row's shape made Community lists jump.
12. Toast docking: `components/Toast.js:42, 234` places every toast `49 + bottom inset + sm` above the bottom edge; `components/VolyumeTabBar.js:108-110` hides the bar while ActiveWorkout is focused, so there the offset clears nothing. Whether it collides with the logger's own docked controls is for A1.
13. Undefined token: `screens/ProOnboardingScreen.js:375-376, 1483-1484` read `motion.fast`; the `motion` table has no `fast` (styles/theme.js:929-969), so those durations are `undefined`.
14. Where Add food lives: `screens/FoodSearchScreen.js:102-103` says it is "a root-stack modal outside the tab navigator"; `navigation/RootNavigator.js:397-419` registers `FoodSearch` inside `DiaryStack`, a tab's nested stack. From the code alone I cannot say whether the tab bar shows beneath it.
15. Destructive colour pair: the destructive Button uses `errorFill` with `onError` for 4.5:1 (styles/theme.js:95-103; Button.js:61-79, AX-06); the Diary swipe-delete panel uses `colors.error` with `textPrimary` (food/EntryRow.js:241-253, 275-276). By the theme's own figure white on `error` is 3.68:1 (theme.js:98); in light the label is dark ink on #C62828 (my computation: 3.10:1).
16. Touch floor: `styles/layout.js:1-11` and `docs/DESIGN_SYSTEM.md:293-302` say 48 serves both platforms and "never hard-code the number"; `components/Chip.js:117` sets 44 on iOS; `workoutLoggerSize` holds 36, 36, 36 and 22 values (styles/layout.js:22, 31-32, 38) against the one exception the doc records (`docs/DESIGN_SYSTEM.md:307`).
17. Theming pattern for a new component: `docs/rules/styling.md:278-296` ("read from `useTheme()`, no `buildLiveStyles`") sits inside the section the file marks HISTORY (:201-212), whose banner points at the frozen-plus-live `buildLiveStyles` pattern. The tree carries both: 142 files define `buildLiveStyles`, and 117 more use `useTheme` without it (some build the live object inline, as HomeChangeWorkoutSheet.js:34-58 does, some are live-only, as Card.js and PlanWeekCard.js:39 are).

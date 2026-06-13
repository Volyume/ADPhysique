# Phase 1 inventory — Plans domain (2026-06-13)

Files audited in full:
- src/screens/PlansScreen.js
- src/screens/PlanDetailScreen.js
- src/screens/PlanLibraryScreen.js
- src/screens/PlanPreviewScreen.js
- src/screens/PlanUpdateScreen.js
- src/screens/ProGoalSetupScreen.js

Token resolution sourced from src/styles/theme.js (dark default palette).
Relevant resolved tokens used below:
- fontSize.micro = 10 (theme.js:257), fontSize.xs = 11 (theme.js:258), fontSize.sm = 13 (theme.js:259),
  fontSize.md = 16 (theme.js:262), fontSize.lg = 17 (theme.js:263), fontSize.xl = 20 (theme.js:264),
  fontSize.xxl = 24 (theme.js:265).
- type.label = fontSize.sm 13 / medium (theme.js:402-405); type.caption = fontSize.xs 11 / regular (theme.js:406-409);
  type.body = fontSize.md 16 / regular (theme.js:394-397); type.bodyStrong = fontSize.md 16 / semibold (theme.js:398-401);
  type.num('caption') = fontSize.xs 11 with tabular-nums (theme.js:406-409,417-421).
- spacing: xxs 2, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48 (theme.js:228-239).

---

SCREEN: Plans (PlansScreen)
WHAT IT IS: The Plans tab root. The hub for a user's training plans — shows the active plan, other saved plans, archived plans, saved workout templates, a block-advisor coaching banner, and decision cards to find/build/switch a plan. Free and Pro share the screen with adapted copy.
WHAT IS ON IT:
- ScreenHeader title "Plans" (PlansScreen.js:384).
- First-load skeleton: one 120px card + two 72px cards (PlansScreen.js:390-396).
- Block advisor card (conditional, only when `showBlockCard` — non-`continue` advice, active plan, not snoozed) (PlansScreen.js:362-364, 401-505):
  - icon in a 36px wrap (PlansScreen.js:410-416), headline text (PlansScreen.js:417), body text (PlansScreen.js:420).
  - signal chips for non-info signals, with high-severity variant (PlansScreen.js:423-433).
  - next-block section: optional pre-label "After your recovery week" (PlansScreen.js:438-439), headline (PlansScreen.js:441), body (PlansScreen.js:442).
  - post_recovery CTAs: restart button (icon + `nextBlock.actionLabel`) and a secondary button (`nextBlock.secondaryLabel`) routing to PlanUpdate (Pro) or ProUpgrade (free) (PlansScreen.js:445-461).
  - early_deload: two buttons "Got it, ease off this week" / "Keep going", both snooze (PlansScreen.js:466-475).
  - in_recovery / post_recovery snooze link "Remind me after recovery week" / "Not quite ready. Remind me later." (PlansScreen.js:478-493).
  - heads_up acknowledge link "Got it" (PlansScreen.js:499-503).
- Active plan card (when an active plan exists) (PlansScreen.js:508-555):
  - "ACTIVE" badge (PlansScreen.js:512-514); ellipsis options button (PlansScreen.js:515-517).
  - plan name (PlansScreen.js:519); workout count e.g. "3 workouts" (PlansScreen.js:520-524); "Week X of Y" if block status continue (PlansScreen.js:525-529).
  - Pro-only coach note "Precision Coaching™ adjusts this plan…" (PlansScreen.js:530-534).
  - "Start Next Workout" primary button (PlansScreen.js:536-544) and "View Plan" secondary button (PlansScreen.js:545-552).
- Free no-plan card (when no active plan AND tier !== 'pro') (PlansScreen.js:560-584): compass icon, title "No active plan yet", body copy, "Find my plan" button (→ FreeStarter), "Browse the library" secondary button (→ PlanLibrary).
- Pro no-plan row (no active plan AND tier === 'pro') (PlansScreen.js:586-591): calendar icon + "No active plan · Build one, browse the library, or create your own from scratch."
- "My plans" section (when myPlans.length>0) (PlansScreen.js:595-647): section title "My plans"; per plan card a meta workout count, ellipsis options, plan name (numberOfLines 2), and footer with "View plan" + "Set as active".
- "Archived plans" collapsible section (when archivedPlans.length>0) (PlansScreen.js:650-716): header "Archived plans · N" with chevron; expanded plan cards (0.7 opacity) with View plan + Restore.
- "Workout templates" section (when templates.length>0) (PlansScreen.js:719-754): title "Workout templates", subtitle "Saved workouts you can start directly.", per template a name (numberOfLines 2), exercise count, "Start" button, and ellipsis options.
- "Training blocks" row (always) (PlansScreen.js:757-770): layers icon, label "Training blocks", sub "View completed blocks and long-term progress", chevron → MesocycleBuilder.
- Decision Hub section (always) (PlansScreen.js:774-810): title "Switch your plan" (Pro w/ active plan) or "Start or build a plan"; Pro-with-plan subtitle; action cards from ACTION_CARDS_PRO_SWITCH (Pro) or ACTION_CARDS_DEFAULT (free). Free cards: "Plan Library" (badge "Recommended") and "Manual Builder" (PlansScreen.js:32-48). Pro cards: "Update training and rebuild" (→ PlanUpdate), "Pick from the Plan Library", "Build your own" (PlansScreen.js:55-77). Each card = icon, title, optional badge, description, chevron.
- PeekMenu (bottom-sheet options menu) used for plan/archived options (PlansScreen.js:817; opened at :302, :318).
- Pull-to-refresh RefreshControl (PlansScreen.js:382).
NAVIGATION: Route "Plans" in PlansStack, headerShown:false (RootNavigator.js:319). PlansStack is the "PlansTab" tab (RootNavigator.js:446). Reached by tapping the Plans tab; tab-press scrolls to top (PlansScreen.js:118-122) and pops the stack to top (RootNavigator.js:312-316). Leads to: PlanDetail (:268,:283,:303,:310,:547,:603,:627,:673,:697), RoutineDetail (:323), ActiveWorkout via HomeTab (:240,:349), FreeStarter (:574), PlanLibrary (:580), MesocycleBuilder (:759), card.screen targets PlanLibrary/ManualBuilder/PlanUpdate (:789), PlanUpdate or ProUpgrade (:453).
GATING: Free screen, shared by both tiers. No guard wraps the route (RootNavigator.js:319). Tier read via `tier` from useAppStore selector (PlansScreen.js:96-101) to branch copy and card sets; Pro-only inline elements: coach note (PlansScreen.js:530), Duplicate option hidden for Pro (PlansScreen.js:276). No Pro feature is exposed to free users here; the decision cards route free users to free destinations or (post_recovery secondary CTA) to ProUpgrade.
CURRENT STRENGTHS: Clear active-plan hero with the primary "Start Next Workout" action prominent. Distinct free vs Pro on-ramps. Offline-first: reads only local database (PlansScreen.js:145-153). Skeleton avoids empty flash. Snooze logic keeps the block banner from nagging. Good accessibility labels and hitSlop on icon buttons.
CURRENT WEAKNESSES: Information-dense when many sections are present (block card + active plan + my plans + archived + templates + training blocks + decision hub) — a returning power user can have a very long scroll. The block-advisor card carries a lot of conditional sub-states (5 action branches) and is the most complex element on screen. Two near-identical "View plan / Set as active" footer patterns plus the ellipsis menu duplicate the same actions, which is some redundancy. Template/My-plans cards repeat the same options affordance three ways (long-press, ellipsis, footer).
NEWBIE QUESTION: Mostly yes for a free first-timer — the no-plan card with "Find my plan" / "Browse the library" is an explicit, friendly on-ramp (PlansScreen.js:560-584). Terms like "training block", "templates" and the Decision Hub copy may be unclear to a complete beginner; "Workout templates" vs "My plans" distinction is not explained beyond the one-line subtitle.
ATHLETE QUESTION: Largely yes — block advisor (deload/recovery signals), week-in-block readout, division-aware library, and restart-block flow speak to experienced lifters. The Pro coach note and "Update training and rebuild" path give a competitor control. Could frustrate: the active-plan card shows workout count and week but no quick volume/structure summary without opening PlanDetail.
LOCATION QUESTION: Correct — this is the Plans tab root and is the natural home for plan management. The "Training blocks" entry and Decision Hub sensibly live here. Cardio was deliberately moved off this screen to Progress (PlansScreen.js:814-815), which is the right call per the in-file note.
VISUAL + USABILITY:
  - Font sizes:
    - Header title "Plans": fontSize.xl (20) bold (ScreenHeader.js:53-58).
    - sectionTitle ("My plans", "Workout templates", Decision Hub title): type.label → fontSize.sm (13) (PlansScreen.js:827).
    - sectionSubtitle: type.caption → fontSize.xs (11) (PlansScreen.js:828).
    - activeBadgeText "ACTIVE": fontSize.xs (11) black (PlansScreen.js:879).
    - activePlanName: fontSize.xl (20) bold (PlansScreen.js:880).
    - activePlanMeta: fontSize.sm (13) (PlansScreen.js:881).
    - activePlanWeek: type.num('caption') → fontSize.xs (11) (PlansScreen.js:882).
    - proCoachNote: fontSize.xs (11), lineHeight 18 (PlansScreen.js:842-845).
    - startNextBtnText: fontSize.sm (13) bold (PlansScreen.js:888).
    - viewPlanBtnText: type.label → fontSize.sm (13) (PlansScreen.js:893).
    - noActivePlanText: fontSize.sm (13) (PlansScreen.js:852); noPlanCardTitle type.bodyStrong → 16 (PlansScreen.js:865); noPlanCardBody fontSize.sm (13) (PlansScreen.js:866).
    - planCardName / templateName: type.bodyStrong → fontSize.md (16) (PlansScreen.js:912,928).
    - planCardMeta / templateMeta: type.num('caption') → fontSize.xs (11) (PlansScreen.js:913,929).
    - planCardFooterGhost / planCardFooterPrimary / archivedHeaderText: type.label → fontSize.sm (13) (PlansScreen.js:919,920,905-907).
    - startTemplateBtnText: fontSize.sm (13) bold (PlansScreen.js:935).
    - trainingBlocksLabel: type.bodyStrong → 16 (PlansScreen.js:840); trainingBlocksSub: type.caption → 11 (PlansScreen.js:841).
    - actionCardTitle: type.bodyStrong → 16 (PlansScreen.js:949); actionCardBadgeText: fontSize.micro (10) (PlansScreen.js:955); actionCardDesc: fontSize.xs (11), lineHeight 16 (PlansScreen.js:956).
    - blockCardTitle: type.bodyStrong → 16 (PlansScreen.js:994-996); blockCardBody: fontSize.sm (13), lineHeight 20 (PlansScreen.js:997-999); nextBlockHeadline type.bodyStrong → 16 (PlansScreen.js:1030-1032); nextBlockBody fontSize.sm (13) (PlansScreen.js:1033-1035); nextBlockPreLabel fontSize.xs (11) (PlansScreen.js:1026-1029).
    - signalChipText: fontSize.xs (11) medium (PlansScreen.js:1014-1016).
    - blockRestartBtnText: fontSize.sm (13) bold (PlansScreen.js:1043); blockNewBtnText type.label → 13 (PlansScreen.js:1049); blockSnoozeText type.caption → 11 (PlansScreen.js:1051).
  - Touch targets (flagging < 44px):
    - moreBtn (ellipsis) is 28×28 (PlansScreen.js:921) but has hitSlop 12 each side at call sites (e.g. PlansScreen.js:515-517, :616, :686, :744) → effective ~52px. FLAG: the active-plan ellipsis (PlansScreen.js:515) and footer text buttons rely on hitSlop; the rendered visual targets are below 44px.
    - planCardFooter "View plan"/"Set as active" text links use hitSlop 8 (PlansScreen.js:628,635) → effective ~ text height + 16; visual target likely < 44px tall. FLAG (relies on hitSlop).
    - startNextBtn / startTemplateBtn / blockRestart/blockNew buttons use paddingVertical spacing.md (12) or spacing.sm (8); startNext has padding 12 (PlansScreen.js:886) so ~ 24 + text — borderline but with text ~44px. startTemplateBtn paddingVertical spacing.sm (8) (PlansScreen.js:933) → smaller; FLAG potentially < 44px.
    - archivedHeader hitSlop 8 (PlansScreen.js:655); blockSnooze link paddingTop xs only (PlansScreen.js:1050) → small tap target, FLAG.
  - Information density: High when populated. Multiple stacked card sections with spacing.lg (16) gaps (PlansScreen.js:824). The block card alone can carry header + body + chips + next-block + 2 CTAs.
  - Clean or cluttered: Generally clean cards, consistent radius.lg. Clutter risk only when every optional section renders at once. No obvious misaligned elements in code.
  - Most important action prominence: Yes — for an active-plan user "Start Next Workout" (filled amber primary, PlansScreen.js:884-887) is the most prominent. For a free no-plan user "Find my plan" primary Button is top of the card.
  - Device behaviour: Whole screen is a ScrollView (PlansScreen.js:379) with contentContainerStyle padding spacing.lg and paddingBottom spacing.xxl (PlansScreen.js:824) — scales across sizes. Card widths are flex/full-width; icon wraps are fixed (40/48/36px). No fixed heights on real content (skeleton uses fixed heights only). Should adapt to 5.4"/6.1"/6.7".

---

SCREEN: PlanDetail (PlanDetailScreen)
WHAT IT IS: The detail view for a single plan — library plan or one of the user's own plans (route param `isLibrary`). Shows plan header/stats, its list of workouts, an optional "Why this plan" rationale (active auto-gen plan only), and manage actions.
WHAT IS ON IT:
- Plan header (PlanDetailScreen.js:211-256): badge row — "Library" badge (if isLibrary), "Active plan" badge (if isActive), "Featured" badge (if tags include 'featured') (PlanDetailScreen.js:213-230); plan name (PlanDetailScreen.js:231); optional description (PlanDetailScreen.js:232-234); stats row — Workouts count, "~N Est. sets/week" (computed = exerciseCount × 3, PlanDetailScreen.js:180-183), and Level (Beginner/Intermediate/Advanced from difficulty) (PlanDetailScreen.js:235-254).
- Primary action button: "Add to my plans" (isLibrary), or "Set active" (own plan, not active), or none (already active) (PlanDetailScreen.js:259-263).
- Workouts section (PlanDetailScreen.js:266-315): title "Workouts"; empty card if none ("No workouts in this plan." / "No workouts yet. Edit the plan to add workouts."); else per workout an index circle, name, exercise count ("N exercises" / "No exercises yet"), and — for non-library — an edit button (→ RoutineDetail) and a start button (→ ActiveWorkout).
- "Why this plan, for you" section (only isActive && !isLibrary && whyThis present) (PlanDetailScreen.js:317-332): bulleted rationale items ordered by WHY_ORDER (schedule, goal, experience, progression, equipment, recovery, nutrition, weakPoints) (PlanDetailScreen.js:27,324-329).
- Manage section (only !isLibrary && tier !== 'pro') (PlanDetailScreen.js:334-354): "Duplicate Plan" row; "Archive Plan" row (only if not active).
- Skeleton placeholder layout while loading (PlanDetailScreen.js:185-202).
- Pull-to-refresh (PlanDetailScreen.js:208).
NAVIGATION: Route "PlanDetail" registered in multiple stacks: PlansStack with title 'Plan' (RootNavigator.js:321), FirstRunStack headerShown:true (RootNavigator.js:477), ProOnboardingStack headerShown:true (RootNavigator.js:504). Title overridden at runtime to plan name (PlanDetailScreen.js:69). Reached from PlansScreen, PlanLibrary (:518,:555,:649), and onboarding flows. Leads to: RoutineDetail (:294), ActiveWorkout via HomeTab (:139), replace→PlanDetail on duplicate (:172), goBack on add/archive.
GATING: Free screen; no route guard. Manage actions (Duplicate/Archive) are hidden for Pro (PlanDetailScreen.js:336) per the in-file note that Pro manage their plan via the goal-change wizard. No Pro feature exposed to free users.
CURRENT STRENGTHS: Clear hierarchy: header → primary CTA → workouts → rationale → manage. The "Why this plan" rationale is a strong trust/transparency feature for the coached experience. Skeleton mirrors loaded layout. Good per-workout edit/start affordances.
CURRENT WEAKNESSES: "Est. sets/week" is a hardcoded heuristic (exerciseCount × 3, PlanDetailScreen.js:181) shown as "~N" — accurate only if every exercise is 3 sets; potentially misleading for an athlete. Difficulty fallback silently defaults to "Intermediate" when null is non-null-but-out-of-range (PlanDetailScreen.js:249). Library plans show no start/edit affordance (by design) but the workout rows then look slightly inert.
NEWBIE QUESTION: Mostly yes — workouts are numbered and named, the primary CTA is explicit. "Est. sets/week" and the rationale bullets assume some training literacy; a beginner may not know what a "set" target implies.
ATHLETE QUESTION: Partly — they get workout list, level, and rationale, but the only per-plan volume figure is the approximate "Est. sets/week" with no per-muscle breakdown. An experienced competitor would want set/rep schemes per exercise, which require drilling into RoutineDetail.
LOCATION QUESTION: Correct — a plan detail screen reachable from Plans, the Library, and onboarding is the right shared destination. Registering it in three stacks keeps back-navigation correct per the in-file routing notes.
VISUAL + USABILITY:
  - Font sizes:
    - planName: fontSize.xxl (24) black (PlanDetailScreen.js:381).
    - planDesc: fontSize.sm (13), lineHeight 20 (PlanDetailScreen.js:382).
    - planStatValue: fontSize.xl (20) black (PlanDetailScreen.js:385); planStatLabel: type.caption → fontSize.xs (11) (PlanDetailScreen.js:386).
    - sectionTitle: type.label → fontSize.sm (13) (PlanDetailScreen.js:388-390).
    - libraryBadgeText / activeBadgeText / featuredBadgeText: fontSize.xs (11) (PlanDetailScreen.js:369,374,380).
    - emptyCardText: fontSize.sm (13) (PlanDetailScreen.js:395).
    - workoutIndexText: fontSize.sm (13) bold (PlanDetailScreen.js:404); workoutName: type.bodyStrong → 16 (PlanDetailScreen.js:406); workoutMeta: type.caption → 11 (PlanDetailScreen.js:407).
    - manageRowText: type.body → fontSize.md (16) (PlanDetailScreen.js:425).
    - whyText: fontSize.sm (13), lineHeight 20 (PlanDetailScreen.js:433).
  - Touch targets:
    - editWorkoutBtn / startWorkoutBtn: 36×36 (PlanDetailScreen.js:409-416) with hitSlop 6 (PlanDetailScreen.js:295,304) → effective ~48px. FLAG: visual 36px < 44px (mitigated by hitSlop).
    - workoutIndex circle is 32×32 (PlanDetailScreen.js:400-403) but it is non-interactive (decorative).
    - manageRow uses padding spacing.lg (16) → row height comfortably ≥ 44px (PlanDetailScreen.js:422).
    - Primary Button uses size="lg" (PlanDetailScreen.js:260,262) — component-controlled height.
  - Information density: Moderate. Header + stats + one CTA + workout list. Manageable on one screen for typical plans.
  - Clean or cluttered: Clean. Consistent card styling. No misalignment in code.
  - Most important action prominence: Yes — the size="lg" primary button ("Add to my plans" / "Set active") sits directly under the header (PlanDetailScreen.js:259-263).
  - Device behaviour: ScrollView with padding spacing.lg, gap spacing.xl, paddingBottom spacing.xxl (PlanDetailScreen.js:362). Fixed icon/circle sizes (32/36px) won't scale with larger-text but text does. Adapts across device sizes.

---

SCREEN: PlanLibrary (PlanLibraryScreen)
WHAT IT IS: Browsable catalogue of ready-made library plans, with search, collection filter chips, a bodybuilding-division grid, a 2-question recommendation quiz (modal), and per-plan preview/add actions.
WHAT IS ON IT:
- SearchBar "Search plans" (PlanLibraryScreen.js:399-404).
- Horizontal collection chips: All plans, Featured, For women, For men, Beginner, Dumbbells only, Short sessions, Bodybuilding Divisions (PlanLibraryScreen.js:19-28, 407-439); the Division chip has a trophy icon (PlanLibraryScreen.js:426-433).
- Division grid (shown when Division collection active) (PlanLibraryScreen.js:442-447, 164-216): intro description, "Men's divisions" group with 3 chips (Men's Physique, Classic Physique, Men's Bodybuilding) (PlanLibraryScreen.js:32-48), "Women's divisions" group with 5 chips (Bikini, Wellness, Figure, Women's Physique, Women's Bodybuilding) (PlanLibraryScreen.js:50-76), and a selected-division description box (PlanLibraryScreen.js:206-213).
- Plans FlatList (PlanLibraryScreen.js:450-574):
  - Quiz banner header (when not searching, All collection, no quiz result) "Not sure where to start?" + body, chevron (PlanLibraryScreen.js:457-476).
  - Empty states: load-error card with "Try again" retry (PlanLibraryScreen.js:478-486); skeleton while loading (PlanLibraryScreen.js:487-492); "No plans found" with contextual subtext (PlanLibraryScreen.js:493-505).
  - Per plan card (PlanLibraryScreen.js:514-571): badge row (Featured/division/For women/For men/difficulty), workout count, plan name, 2-line description, footer "Preview plan" + "Add to my plans".
- Quiz modal (PlanLibraryScreen.js:577-671): sheet handle, progress dots, 2 question steps (goal: build muscle/get stronger/improve conditioning/get on stage; equipment: full gym/dumbbells only/home) (PlanLibraryScreen.js:82-102), "Skip and browse all plans"; result step with suggestion card, "Add this plan", "Preview first", "Browse all plans instead"; no-result step with "Browse all plans".
- Add-to-my-plans flow uses appAlert confirmations, branching on `fromFirstRun` (PlanLibraryScreen.js:288-338).
- Pull-to-refresh (PlanLibraryScreen.js:454).
NAVIGATION: Route "PlanLibrary" in PlansStack title 'Plan Library' (RootNavigator.js:325), FirstRunStack headerShown:true (RootNavigator.js:476), ProOnboardingStack headerShown:true (RootNavigator.js:503). Reached from PlansScreen (:580, action card), no-plan card, and onboarding flows; `fromFirstRun` param drives onboarding hand-off. Leads to: PlanDetail with isLibrary:true (:518,:555,:649), ProSetupComplete (onboarding) (:313,:325), goBack.
GATING: Free screen (Plan Library is an explicitly free feature per CLAUDE.md). No guard. No Pro gating inside.
CURRENT STRENGTHS: Rich discovery: search + collections + divisions + a guided quiz cover beginners and competitors. Robust empty/error handling (FF-004 retry, distinct from genuinely empty). Good accessibility labels including composed plan-card labels (PlanLibraryScreen.js:521-526). Seeds library if needed on load (PlanLibraryScreen.js:258).
CURRENT WEAKNESSES: Two parallel discovery mechanisms (collection chips + quiz) can feel redundant. The quiz scoring is a simple tag-weight heuristic (PlanLibraryScreen.js:122-142) and can return a single "best" with little explanation. Division grid + chips create a deep filter hierarchy that may be more than a casual free user needs. "Add to my plans" footer text link is small and visually similar to "Preview plan".
NEWBIE QUESTION: Yes — the "Not sure where to start?" quiz banner is an excellent beginner on-ramp, and collection labels are plain. Division terminology (Wellness, Classic Physique) is competitor-facing and may confuse a true beginner, but it is tucked behind its own chip.
ATHLETE QUESTION: Yes — division-specific collections with judged-criteria descriptions directly target competitors; difficulty badges and workout counts give quick triage. An athlete can bypass the quiz and filter straight to their division.
LOCATION QUESTION: Correct — the Library belongs under Plans and is also correctly surfaced in onboarding stacks for first-run plan selection.
VISUAL + USABILITY:
  - Font sizes:
    - chipText: type.label → fontSize.sm (13) (PlanLibraryScreen.js:697).
    - divisionGroupLabel: fontSize.xs (11) semibold (PlanLibraryScreen.js:705-708); divisionIntroDesc: fontSize.xs (11), lineHeight 18 (PlanLibraryScreen.js:710-714); divisionChipText: fontSize.xs (11) (PlanLibraryScreen.js:723); divisionDescText: fontSize.sm (13) (PlanLibraryScreen.js:730).
    - quizBannerTitle: fontSize.sm (13) bold (PlanLibraryScreen.js:746); quizBannerBody: type.caption → 11 (PlanLibraryScreen.js:747).
    - badgeText: fontSize.micro (10) (PlanLibraryScreen.js:766); workoutCount: type.caption → 11 (PlanLibraryScreen.js:768).
    - planName: type.bodyStrong → fontSize.md (16) (PlanLibraryScreen.js:769); planDesc: fontSize.sm (13), lineHeight 18 (PlanLibraryScreen.js:770).
    - previewText: type.label → 13 (PlanLibraryScreen.js:776); addBtnText: fontSize.sm (13) bold (PlanLibraryScreen.js:778).
    - emptyTitle: fontSize.xl (20) bold (PlanLibraryScreen.js:783); emptyText: type.body → fontSize.md (16) (PlanLibraryScreen.js:784-787).
    - quizQuestion: fontSize.lg (17) black (PlanLibraryScreen.js:810-814); quizOptionText: fontSize.md (16) (PlanLibraryScreen.js:822); quizSkipText: fontSize.sm (13) (PlanLibraryScreen.js:824).
    - quizResultTitle: fontSize.xl (20) black (PlanLibraryScreen.js:828-831); quizResultName: type.bodyStrong → 16 (PlanLibraryScreen.js:837); quizResultDesc: fontSize.sm (13) (PlanLibraryScreen.js:838); quizResultMeta: type.caption → 11 (PlanLibraryScreen.js:839); quizStartText: type.bodyStrong → 16 (PlanLibraryScreen.js:844); quizBrowseText: fontSize.md (16) medium (PlanLibraryScreen.js:850).
  - Touch targets:
    - collection chip: paddingHorizontal spacing.md (12), paddingVertical 7 (PlanLibraryScreen.js:692) → ~ 14 + text height ≈ 30-34px. FLAG: likely < 44px tall, no hitSlop on chip.
    - divisionChip: paddingVertical 6 (PlanLibraryScreen.js:718) → ~ 12 + text ≈ smaller still. FLAG < 44px.
    - addBtn: paddingVertical spacing.xs (4), paddingHorizontal spacing.md (PlanLibraryScreen.js:777) → very short tap target; FLAG < 44px, no hitSlop.
    - "Preview plan" text link has no padding/hitSlop (PlanLibraryScreen.js:554-560). FLAG < 44px.
    - quizOptionBtn: padding spacing.md (12) (PlanLibraryScreen.js:820) → ~ 24 + text ≈ borderline 44px.
    - quizSkip: paddingVertical spacing.sm (8) (PlanLibraryScreen.js:823) — small, FLAG.
  - Information density: High on the Division collection (intro + 8 chips + description) and moderate elsewhere. FlatList virtualises the plan list so long catalogues stay performant.
  - Clean or cluttered: Mostly clean; the division view is the densest. Chips wrap (PlanLibraryScreen.js:716).
  - Most important action prominence: On each card the two footer actions ("Preview plan" / "Add to my plans") are equal-weight text links — neither is a filled button, so the primary "Add" action is not visually dominant. The whole card is also tappable to preview (PlanLibraryScreen.js:516-518). In the quiz, "Add this plan" is a filled amber button (PlanLibraryScreen.js:840-844), correctly prominent.
  - Device behaviour: FlatLists (horizontal chips + vertical plans) with padding spacing.lg; chipsList fixed height 52 (PlanLibraryScreen.js:685). Quiz modal is a bottom sheet with paddingBottom spacing.xxl. Quiz dots fixed 8px. Generally responsive across sizes; fixed chip height could clip larger-text labels.

---

SCREEN: PlanPreview (PlanPreviewScreen)
WHAT IT IS: Pre-account "your plan" preview shown during quiz-first onboarding (COMP-030). Renders a deterministic, locally-derived plan shape from the onboarding quiz answers and pushes toward account creation ("save your plan"). No calories/macros.
WHAT IS ON IT (PlanPreviewScreen.js:25-46):
- Kicker label "YOUR PLAN" (PlanPreviewScreen.js:28).
- Headline `p.headline` (PlanPreviewScreen.js:29).
- Card: split name `p.splitName`, structure line `p.structure`, optional phase line "Built {phaseLine}." (PlanPreviewScreen.js:30-34).
- Nutrition note `p.nutritionNote` (PlanPreviewScreen.js:35).
- Footer (fixed, outside scroll): primary CTA "Create an account to keep it" (→ Login with intent pro_signup, fromQuiz) (PlanPreviewScreen.js:38-42, 19-23); fine print "No card. Nothing charged unless you choose." (PlanPreviewScreen.js:43).
All plan content comes from `buildPlanPreview(quiz)` reading the `onboardingQuiz` store slice (PlanPreviewScreen.js:12-17).
NAVIGATION: Route "PlanPreview" in WelcomeStack (RootNavigator.js:461), headerShown:false (stack default at :456). Reached from QuizScreen via navigate('PlanPreview') (QuizScreen.js:58) when ONBOARDING_QUIZ_FIRST is on and the user picks Pro (RootNavigator.js:458-461). Leads to: Login (PlanPreviewScreen.js:21).
GATING: Pre-account onboarding screen (not tier-gated; runs before sign-up). No withProGuard. Per the file header it is part of the Pro signup funnel but deliberately shows no calories/macros until after account + permission (PlanPreviewScreen.js:1-8,35).
CURRENT STRENGTHS: Focused, single-purpose screen — endowment-effect framing ("keep it", "No card"). Minimal and uncluttered. Deterministic preview (no AI), consistent with the coaching-engine rule. Fixed footer keeps the CTA always visible.
CURRENT WEAKNESSES: Very sparse — only a headline, one card, and a note; if `buildPlanPreview` returns thin content the screen could feel empty. No back affordance is rendered in-screen (headerShown:false) — relies on the system/stack gesture. No loading/error state if the quiz slice is missing (defaults to {} at PlanPreviewScreen.js:16, so output depends entirely on buildPlanPreview's handling).
NEWBIE QUESTION: Yes — it is plain-language and reassuring ("No card. Nothing charged unless you choose."), and shows a concrete plan shape rather than asking to sign up cold.
ATHLETE QUESTION: Partly — split name + structure + phase line speak to a trained user, but there is no volume, exercise list, or progression detail at this stage (intentional, pre-account). An athlete gets enough to feel the plan is "theirs" but not enough to evaluate it.
LOCATION QUESTION: Correct — it sits between the quiz and the account wall in the WelcomeStack, exactly the funnel position the header comment describes.
VISUAL + USABILITY:
  - Font sizes:
    - kicker "YOUR PLAN": fontSize.sm (13), letterSpacing 1, semibold (PlanPreviewScreen.js:52).
    - h1 headline: fontSize.xxl (24) black (PlanPreviewScreen.js:53).
    - splitName: fontSize.xl (20) heavy, primary colour (PlanPreviewScreen.js:55).
    - structure: fontSize.md (16) (PlanPreviewScreen.js:56); phase: fontSize.md (16) (PlanPreviewScreen.js:57).
    - note: fontSize.sm (13) (PlanPreviewScreen.js:58).
    - ctaText: fontSize.md (16) heavy (PlanPreviewScreen.js:61); fine: fontSize.sm (13) centred (PlanPreviewScreen.js:62).
  - Touch targets:
    - cta button: minHeight 50 (PlanPreviewScreen.js:60) → meets/exceeds 44px. Good.
    - No other interactive elements (no in-screen back button).
  - Information density: Very low — deliberately minimal.
  - Clean or cluttered: Clean.
  - Most important action prominence: Yes — the filled amber CTA in the fixed footer is the clear primary and only action.
  - Device behaviour: ScrollView body + fixed footer (PlanPreviewScreen.js:27,38). SafeAreaView edges top+bottom. No fixed content heights besides the 50px CTA min. Scales well across device sizes; content is short enough that small devices won't need to scroll much.

---

SCREEN: PlanUpdate (PlanUpdateScreen)
WHAT IT IS: Training-only plan rebuild wizard for the Plans tab. Lets a Pro user change training parameters (category, weak points, experience, days/week, session length, equipment, recovery) and rebuilds the plan around them. Deliberately does NOT change calories/macros (those live in the You tab).
WHAT IS ON IT:
- BackHeader title "Update training" (PlanUpdateScreen.js:144).
- Intro sub copy "Adjust your training setup and rebuild the plan around it. Your calorie and macro targets stay as they are…" (PlanUpdateScreen.js:151-153).
- "Competing in a category? (optional)" label + sub + Dropdown (PHYSIQUE_GOALS), placeholder "Not competing, General" (PlanUpdateScreen.js:156-166).
- Weak points (only when goal supports them): label "(optional, max 3)", sub, chip grid from WEAK_POINT_MUSCLES, max-3 toggle with warning toast (PlanUpdateScreen.js:169-195, 72-81).
- "Experience" label + sub + Dropdown (4 options) (PlanUpdateScreen.js:198-207, 21-26).
- "Training days per week" label + sub + SegmentedControl (3/4/5/6) (PlanUpdateScreen.js:210-219, 28).
- "Session length" label + SegmentedControl (45/60/75/90 min) (PlanUpdateScreen.js:221-227, 30-35).
- "Equipment" label + sub + Dropdown (6 options) (PlanUpdateScreen.js:230-239, 37-44).
- "Recovery" label + sub + Dropdown (3 options) (PlanUpdateScreen.js:242-251, 46-50).
- Save button "Rebuild my plan" / "Rebuilding…" when saving, disabled while saving (PlanUpdateScreen.js:253-265).
- handleSave rebuilds plan first (generateAndSavePlan), commits training profile only on success, surfaces partial/shortfall and error toasts, then goBack (PlanUpdateScreen.js:83-140).
NAVIGATION: Route "PlanUpdate" in PlansStack as GatedPlanUpdate, headerShown:false (RootNavigator.js:320). GatedPlanUpdate = withProGuard(PlanUpdateScreen, 'Update training') (RootNavigator.js:154). Reached from PlansScreen Pro action card "Update training and rebuild" (card.screen 'PlanUpdate', PlansScreen.js:55-62, navigate at :789) and the block-card post_recovery secondary CTA for Pro (PlansScreen.js:453). Leads to: goBack on success (PlanUpdateScreen.js:139).
GATING: Pro. Guarded by withProGuard at the route (RootNavigator.js:154,320); free users hitting the route get ProLocked (ProGate.js:135-138). This is consistent with FREE vs PRO rules (Precision Coaching adjustments / coached rebuild are Pro).
CURRENT STRENGTHS: Single-responsibility — training only, with an explicit promise that nutrition targets are untouched (PlanUpdateScreen.js:51-56,151-153). Safe failure model (FF-002): rebuild first, only commit profile on success, keep user on screen to retry (PlanUpdateScreen.js:108-125). Mirrors ProOnboarding/ProGoalSetup option lists for deterministic parity (PlanUpdateScreen.js:18-20). Disabled-state save button prevents double submit.
CURRENT WEAKNESSES: Long single-column form of dropdowns + segmented controls; no progress/preview of how the plan will change before committing (the result only appears as a toast + back). Weak-points section appears/disappears based on goal, which can shift layout. Overlaps heavily with ProGoalSetupScreen (same training fields) — two screens edit much of the same data, a potential source of confusion about which to use (the copy tries to disambiguate by pointing nutrition changes to the You tab).
NEWBIE QUESTION: Pro-only, so the audience is past first-run, but a less-experienced Pro user may not grasp how each field reshapes the plan; the per-field sub copy helps ("This sets your starting volume…"). "Weak points", "session length" mapping to exercise mix is reasonably explained.
ATHLETE QUESTION: Yes — experience, days, session length, equipment, recovery and division/weak-point biasing are exactly the levers a competitor wants, and the deterministic rebuild respects their answers. Missing: a preview/diff of the rebuilt plan before saving.
LOCATION QUESTION: Correct for the training-only intent — it lives in the Plans tab where plan structure is managed, and explicitly defers nutrition to the You tab, keeping a clean separation from ProGoalSetup.
VISUAL + USABILITY:
  - Font sizes:
    - BackHeader title "Update training": fontSize.lg (17) semibold (BackHeader.js:59-65).
    - sectionLabel: type.label → fontSize.sm (13) (PlanUpdateScreen.js:275-278).
    - sectionSub: fontSize.xs (11), lineHeight 17 (PlanUpdateScreen.js:280-283).
    - optionalTag: type.caption → fontSize.xs (11) (PlanUpdateScreen.js:285-288).
    - weakPointChipText: fontSize.xs (11) medium (PlanUpdateScreen.js:307-311).
    - saveBtnText: type.bodyStrong → fontSize.md (16) (PlanUpdateScreen.js:323).
    - (Dropdown / SegmentedControl text sizes are owned by those components, not set here — NOT DETERMINED IN THIS FILE.)
  - Touch targets:
    - weakPointChip: paddingHorizontal spacing.md (12), paddingVertical spacing.sm (8) (PlanUpdateScreen.js:295-302) → ~ 16 + text ≈ borderline, likely < 44px. FLAG (no hitSlop).
    - saveBtn: paddingVertical spacing.lg (16) (PlanUpdateScreen.js:317-321) → comfortably ≥ 44px.
    - BackHeader back chevron: 24px icon with hitSlop 12 (BackHeader.js:40-41) → effective ~48px.
    - Dropdown / SegmentedControl tap sizes — NOT DETERMINED IN THIS FILE.
  - Information density: Moderate-high — seven labelled controls stacked. Generous spacing.xxl between sections (sectionLabelSpaced, PlanUpdateScreen.js:279) keeps it readable.
  - Clean or cluttered: Clean, consistent label/sub/control rhythm.
  - Most important action prominence: Yes — the filled amber "Rebuild my plan" button at the bottom is the clear primary (PlanUpdateScreen.js:317-321).
  - Device behaviour: ScrollView, keyboardShouldPersistTaps handled, paddingHorizontal spacing.lg, paddingTop spacing.xl, paddingBottom spacing.xxxl (PlanUpdateScreen.js:146-150,273). No fixed content heights; scales across device sizes. Weak-point chips wrap (PlanUpdateScreen.js:289-294).

---

SCREEN: ProGoalSetup (ProGoalSetupScreen)
WHAT IT IS: The Pro goal/plan-change wizard ("Update your plan") in the You tab. Changes the physique category, current focus/phase, weak points, full training setup, and protein approach; recalculates nutrition targets AND rebuilds the plan, then routes to a change-summary screen.
WHAT IS ON IT:
- BackHeader title "Update your plan" (ProGoalSetupScreen.js:328).
- "Competing in a category? (optional)" label + sub + Dropdown (PHYSIQUE_GOALS), placeholder "Not competing, General" (ProGoalSetupScreen.js:339-349).
- Weak points (only when goal supports them): label "(optional, max 3)" + sub + chip grid, max-3 toggle with warning toast (ProGoalSetupScreen.js:352-378, 114-123).
- "What are you focused on right now?" label + sub "Drives your calorie target and how the plan is built." + Dropdown (TRAINING_PHASES) (ProGoalSetupScreen.js:383-393).
- "Experience" label + sub + Dropdown (ProGoalSetupScreen.js:396-405).
- "Training days per week" label + sub + SegmentedControl (3/4/5/6) (ProGoalSetupScreen.js:408-417).
- "Session length" label + SegmentedControl (45/60/75/90) (ProGoalSetupScreen.js:419-425).
- "Equipment" label + sub + Dropdown (ProGoalSetupScreen.js:428-437).
- "Recovery" label + sub + Dropdown (ProGoalSetupScreen.js:440-449).
- "Protein target" label + sub + three selectable cards (standard/optimised/advanced) each with icon, label, range, optional "Suggested" badge, short description, and a checkmark when active (ProGoalSetupScreen.js:452-493, 26-30).
- Footer note 1 (if weight known): "Targets use your latest weight, {weight}. Log a new one on Home." (ProGoalSetupScreen.js:495-502).
- Footer note 2: "Changing your goals updates your plan targets immediately. Precision Coaching adjusts at the next check-in." (ProGoalSetupScreen.js:504-509).
- Save button "Rebuild my plan", disabled until goal+phase chosen (ProGoalSetupScreen.js:511-521, canSave at :112).
- handleSave: recalculates nutrition targets via the nutrition engine (uses latest morning-weight EWMA, body comp), persists targets + profile, regenerates the plan, then navigation.replace to GoalChangeSummary with before/after kcal/macros + planRerolled flag (ProGoalSetupScreen.js:128-324).
NAVIGATION: Route "ProGoalSetup" in ProfileStack as GatedProGoalSetup, headerShown:false (RootNavigator.js:393). GatedProGoalSetup = withProGuard(ProGoalSetupScreen, 'Pro goal setup') (RootNavigator.js:153). Reached from YouScreen via navigate('ProGoalSetup') (YouScreen.js:134). Leads to: GoalChangeSummary via navigation.replace (ProGoalSetupScreen.js:303), which is registered in ProfileStack (RootNavigator.js:394).
GATING: Pro. Guarded by withProGuard at the route (RootNavigator.js:153,393); free users get ProLocked (ProGate.js:135-138). Recalculating nutrition targets and Precision Coaching are Pro features per CLAUDE.md — correctly gated.
CURRENT STRENGTHS: Single place where goal/phase drive both nutrition AND plan (the in-file note positions this as the nutrition-touching counterpart to PlanUpdate). Careful weight handling — uses smoothed morning-weight trend, not stale enrolment weight (ProGoalSetupScreen.js:203-246). Robust fallbacks so a partial profile still recalculates (ProGoalSetupScreen.js:214-217). Records deficit start/clear dates (ProGoalSetupScreen.js:125-157). Non-blocking failure handling for both nutrition recalc and plan reroll, with explanatory toasts (ProGoalSetupScreen.js:267-271,293-297). Routes to a change summary rather than silently popping.
CURRENT WEAKNESSES: This is a long, dense form (8 controls + 3 protein cards + 2 footer notes) — the most complex screen in this domain. Substantial field overlap with PlanUpdateScreen (same experience/days/session/equipment/recovery/weak-point set); the distinction (this also changes nutrition; PlanUpdate does not) is communicated only via copy and may confuse users about which screen to use. The handleSave function is large and does many side effects (nutrition recalc, weight write-back, body-comp recovery, profile save, plan regen) in sequence — high-risk surface. "Rebuild my plan" button label is identical to PlanUpdate's despite this screen doing much more.
NEWBIE QUESTION: Pro-only and post-onboarding, but still dense for a less-experienced user; sub copy explains each field. The protein-approach cards with ranges/"Suggested" badge are reasonably guided. The breadth (category + phase + full training setup + protein) is a lot to take in at once.
ATHLETE QUESTION: Yes — this is the competitor control centre: division/weak-point biasing, training phase (incl. cut/deficit), protein approach up to "advanced", full training setup, and a transparent change summary. Strong fit for an experienced athlete.
LOCATION QUESTION: Correct — it lives in the You/Profile tab (reached from YouScreen), which per the Plans-side copy is the designated place for goal and calorie/macro changes; PlanUpdate (Plans tab) handles training-only. Clear separation by intent.
VISUAL + USABILITY:
  - Font sizes:
    - BackHeader title "Update your plan": fontSize.lg (17) semibold (BackHeader.js:59-65).
    - sectionLabel: type.label → fontSize.sm (13) (ProGoalSetupScreen.js:531-534).
    - sectionSub: fontSize.xs (11), lineHeight 17 (ProGoalSetupScreen.js:536-539).
    - optionalTag: type.caption → fontSize.xs (11) (ProGoalSetupScreen.js:541-544).
    - weakPointChipText: fontSize.xs (11) medium (ProGoalSetupScreen.js:563-567).
    - phaseLabel (protein card title): type.bodyStrong → fontSize.md (16) (ProGoalSetupScreen.js:586-589); phaseDetail: fontSize.sm (13), lineHeight 18 (ProGoalSetupScreen.js:591).
    - approachRange: fontSize.xs (11) medium (ProGoalSetupScreen.js:599-601).
    - suggestedBadgeText: fontSize.micro (10) bold (ProGoalSetupScreen.js:607).
    - footerNoteText: fontSize.xs (11), lineHeight 17 (ProGoalSetupScreen.js:597).
    - saveBtnText: type.bodyStrong → fontSize.md (16) (ProGoalSetupScreen.js:614).
    - (Dropdown / SegmentedControl text — owned by those components — NOT DETERMINED IN THIS FILE.)
  - Touch targets:
    - weakPointChip: paddingHorizontal spacing.md (12), paddingVertical spacing.sm (8) (ProGoalSetupScreen.js:551-557) → likely < 44px. FLAG (no hitSlop).
    - protein phaseCard: padding spacing.lg (16) (ProGoalSetupScreen.js:573-578) → comfortably ≥ 44px tall.
    - saveBtn: paddingVertical spacing.lg (16) (ProGoalSetupScreen.js:609-612) → ≥ 44px.
    - BackHeader back chevron: 24px + hitSlop 12 (BackHeader.js:40-41) → ~48px.
    - Dropdown / SegmentedControl tap sizes — NOT DETERMINED IN THIS FILE.
  - Information density: High — the densest screen in this set (8 controls + 3 cards + 2 notes + save). spacing.xxl between sections keeps it legible but it is a long scroll.
  - Clean or cluttered: Clean per-element styling, but cumulatively heavy. Conditional weak-point block shifts layout.
  - Most important action prominence: Yes — filled amber "Rebuild my plan" at the bottom (ProGoalSetupScreen.js:609-612); disabled (surface2 fill) until canSave.
  - Device behaviour: ScrollView, keyboardShouldPersistTaps handled, paddingHorizontal spacing.lg, paddingTop spacing.xl, paddingBottom spacing.xxxl (ProGoalSetupScreen.js:330-334,529). phaseIconWrap fixed 40px (ProGoalSetupScreen.js:580-584); chips wrap. Text scales with larger-text token; long form means small devices scroll considerably. Adapts across sizes.

# Phase 1 inventory — Check-in & safety screens (2026-06-13)

Scope: five screens read in full. Per the brief this describes what each screen
shows; it does not evaluate the ED-safety mechanism itself.

Resolved theme tokens used below (from `src/styles/theme.js`, dark defaults):
fontSize.micro (10, theme.js:257), xs (11, theme.js:258), sm (13, theme.js:259),
md (16, theme.js:262), lg (17, theme.js:263), xl (20, theme.js:264),
xxl (24, theme.js:265), xxxl (32, theme.js:266). Type roles (theme.js:373–410):
type.caption => fontSize.xs (11, theme.js:407); type.label => fontSize.sm
(13, theme.js:403); type.body / type.bodyStrong => fontSize.md (16, theme.js:395/399);
type.title => fontSize.lg (17, theme.js:391); type.h3 => fontSize.xl (20,
theme.js:387); type.h2 => fontSize.xxl (24, theme.js:383). spacing scale
theme.js:228–239 (xs 4, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48).

---

```
SCREEN: WeeklyCheckIn
WHAT IT IS: The weekly Precision Coaching check-in. A four-step wizard (or a
  condensed "fast" card) that gathers how the user is feeling, how the week went
  against targets, recovery/issues, and training performance, then saves a
  weekly check-in and routes to the coach output. (WeeklyCheckInScreen.js:219,
  :577 saveWeeklyCheckin, :640 navigate to CoachOutput.)
WHAT IS ON IT:
  Gate states resolved before the form (gateState, :233; logic :499–519):
  - loading: skeleton cards (heights 72/160/120) (:1159–1168).
  - wrong_day: header with chevron-back + title "Weekly check-in" (:1182); card
    with calendar-outline icon (40px), title "Come back on {dayName}" (:1188),
    two body paragraphs explaining the weekly rhythm and pointing to Settings →
    Coaching reminders + logging weight from the Train tab (:1189–1194); "Got it"
    button (:1197).
  - too_soon: chevron-back; time-outline icon (32px) in a circular wrap; title
    "First check-in needs more data" (:1217); body citing FIRST_CHECKIN_MIN_DAYS
    and days left, the next landing date and chosen day name (:1218–1222);
    "Got it" button (:1223).
  - need_weights: chevron-back; scale-outline icon (32px, warning colour);
    title "A few more weight readings needed" (:1245); body with readings logged,
    MIN_WEIGH_INS requirement, an explanation of body-weight noise, and how many
    more to log (:1246–1252); "Log my weight first" button (:1254); a secondary
    "Check in anyway" defer button that opens the form (:1256–1258).
  - load_error: chevron-back; cloud-offline-outline icon (32px, warning);
    title "Couldn't load your week" (:1276); body (:1277); "Try again" button
    that re-runs the loader (:1280–1287).
  Main form chrome:
  - Header bar: chevron-back (doubles as previous-step) (:1303–1311); centre
    title "Weekly check-in" (:1317); either a "Quick check-in" tag (:1319) or a
    StepBar of 4 dots (:1320); right spacer.
  - Week-range label, e.g. "Mon 8 Jun – Sun 14 Jun" (:1345, formatWeekRange :51).
  - "Already checked in this week" row with success tick + edit/resubmit note,
    shown when re-entering (:1347–1354).
  Wizard step 0 "How are you feeling?" (renderStep0, :678):
  - Heading + subtitle (:681–682).
  - "Energy and motivation this week": 5 chips Low/Below normal/Normal/Good/High
    (values 1–5) (:685–696).
  - "Stress level this week" with hint "Work, life, family, anything outside the
    gym": 5 chips Low/Mild/Moderate/High/Very high (:700–711).
  - "Average sleep hours" (hint "Optional"): numeric text input, placeholder
    "7.5", maxLength 4 (:715–726).
  Wizard step 1 "This week's data" (renderStep1, :732):
  - Heading + subtitle (:735–736).
  - "Morning weight trend" (read-only): tick + "{n} days logged · trend {weight}"
    or a "no morning weights" note; "Not yet today" tag if not logged today
    (:739–763).
  - Cycle question (only when shouldShowCycleQuestion true): hint paragraph; two
    options "Affecting the scale" / "Not this week" (:769–785).
  - Nutrition adherence: if a kcal target exists, an auto-derived diary summary
    ("{x} of 7 days logged, averaging {y} kcal against your {z} target (under/on/
    over target)") and three options Hit it / Off target / Didn't track
    (:788–817); if no target, a tappable note routing to NutritionTargets
    (:818–826).
  - Steps (when stepsEnabled !== false): either an auto row "Averaged {n} a day.
    Tap to override." with a target verdict line, or a manual "Average steps a
    day" numeric input; a "No step target set" note when no target (:831–889).
  - Cardio (when a cardio prescription exists): "Prescribed cardio" with three
    options Did it / Mostly / Not this week (:894–906).
  Wizard step 2 "Recovery and issues" (renderStep2, :912):
  - "Overall muscle soreness this week": 5 chips None/Mild/Moderate/High/Very
    high (:919–930).
  - "Which muscles?" (only when soreness >= 2): a wrap grid of 10 muscle chips
    Chest…Core (:933–964).
  - "Any joint or tendon pain?": No / Yes options (:966–976).
  - "Anything else to flag?": multiline notes input, maxLength 280, with a
    char-count "{n}/280" (:978–992).
  Wizard step 3 "Training performance" (renderStep3, :998):
  - Heading + subtitle (pre-filled vs not) (:1001–1006).
  - Auto-derived sessions/PRs/volume-delta note, or a "no sessions logged" note
    (:1010–1028).
  - 4 perf cards with icons: "Beat my targets"/"Hit targets as planned"/
    "Struggled to hit targets"/"Performance dropped" (:1029–1058).
  Fast check-in card (renderFastCheckIn, :1071) shown when fastEligible:
  - Heading "Quick check-in" + subtitle (:1109–1112).
  - Summary card listing the auto-read rows (Training, Nutrition, Steps, Cardio,
    Weight) each with icon, label, value and a success tick (:1114–1123).
  - "Energy and motivation this week" 5 chips (:1126–1137).
  - "Overall muscle soreness this week" 5 chips (:1140–1153).
  CTA area (:1367):
  - Fast: "See this week's coaching" submit button (:1369–1385).
  - Wizard non-final: "Next" button + arrow icon (:1386–1404).
  - Wizard final: "See this week's coaching" submit button (:1406–1422).
  - "Add more detail" expand link from fast card into the wizard (:1427–1437).
  - Inline hint text when the current step can't advance (:1439–1447).
  Post-submit: schedules the next check-in reminder + weekly "coach ready"
  notification (:613–633), re-lays missed-check-in followups (:638), and may show
  an appAlert offering daily weight reminders before routing to CoachOutput
  (:642–660).
NAVIGATION: Route "WeeklyCheckIn", registered in ProfileStack (RootNavigator.js:387;
  ProfileStack function begins :364, its Stack.Navigator :370). headerShown:false.
  Component is GatedWeeklyCheckIn = withProGuard(WeeklyCheckInScreen, 'Weekly
  check-in') (RootNavigator.js:149). Reached from the You tab card
  (YouScreen.js:122 navigation.navigate('WeeklyCheckIn')). On submit it navigates
  to 'CoachOutput' with weekStart (WeeklyCheckInScreen.js:640). Gate "Got it"/back
  buttons call navigation.goBack(). The NutritionTargets link (:821) and the
  expand-to-wizard control stay in-screen.
GATING: Pro. Gated by withProGuard at RootNavigator.js:149 (withProGuard checks
  useAppStore(s=>s.tier) !== 'pro', ProGate.js:134–139). Consistent with CLAUDE.md
  free/Pro list (Precision Coaching adjustments are Pro).
CURRENT STRENGTHS: Auto-derivation pre-fills training, calories, steps and cardio
  from logged data so most weeks become a two-tap confirmation (fast card,
  :1071); gates fail closed on a load error rather than opening the form against
  missing data (:520–527 comment + load_error state); re-entry prefills saved
  answers for editing (:460–490); inputs carry accessibility roles/labels/state
  throughout; weekly range and "already checked in" state are clearly surfaced.
CURRENT WEAKNESSES: Very large file (1749 lines) carrying five gate screens, a
  four-step wizard and a fast card in one component; step 1 ("This week's data")
  can stack many sections (weight, cycle, nutrition, steps, cardio) into a long
  scroll; several inline IIFEs and long ternaries render copy (e.g. :850–862,
  :792–806) which is dense. The derived-note paragraphs are long and italicised
  (autoDerivedNote, :1628).
NEWBIE QUESTION: Mostly yes for the fast card (confirm two ratings). The full
  wizard introduces jargon a first-timer may not parse without thought —
  "working sets", "training volume up X% on last week", "deload"-adjacent
  framing, "prescribed cardio" — though most questions have plain-language hints.
ATHLETE QUESTION: Largely yes — it captures energy, stress, sleep, soreness by
  muscle, joint/tendon pain, cycle, calorie/step/cardio adherence and a training
  verdict derived from real sessions/PRs/volume, which an experienced competitor
  would recognise as a proper weekly readiness check.
LOCATION QUESTION: Reasonable — it lives off the You tab (YouScreen.js:122) and is
  the entry point to CoachOutput, matching the weekly coaching rhythm. NOT a
  judgement on whether the safety mechanism is correct.
VISUAL + USABILITY:
  - Header title: styles.headerTitle fontSize.md (16) bold (:1523–1527).
  - StepBar dots: 20x4px, radius 2 (:1531–1533).
  - Week label: type.label => fontSize.sm (13) primary colour (:1545–1548).
  - alreadyInText: fontSize.sm (13) (:1557).
  - stepHeading: type.h3 => fontSize.xl (20) (:1558–1562).
  - stepSubtitle: fontSize.sm (13) lineHeight 20 (:1563–1568).
  - sectionLabel: type.label => fontSize.sm (13) (:1572–1575); sectionHint:
    type.caption => fontSize.xs (11) (:1576–1579).
  - chipValue: fontSize.md (16) bold; chipLabel: fontSize.xs (11) (:1590–1593).
  - optionBtnText: type.label => fontSize.sm (13) (:1604).
  - weightSummaryText: fontSize.sm (13) (:1613); weightSummaryMissed:
    type.caption => fontSize.xs (11) (:1614).
  - skipNote / skipNoteTappable: fontSize.sm (13) (:1617, :1623).
  - autoDerivedNote: type.caption => fontSize.xs (11), italic (:1628–1633).
  - shortInput text: fontSize.lg (17) (:1639); notesInput: fontSize.md (16),
    minHeight 88 (:1654–1655); charCount: type.num('caption') => fontSize.xs (11)
    (:1657).
  - perfCardText: type.label => fontSize.sm (13) (:1667).
  - ctaBtnText: fontSize.md (16) bold (:1677); ctaHint: fontSize.sm (13) (:1679).
  - fast card: headerQuickTag fontSize.xs (11) (:1682); fastSummaryLabel /
    fastSummaryValue fontSize.sm (13) (:1699–1700); fastExpandText fontSize.sm
    (13) (:1702).
  - ritualIntroTitle: fontSize.xl (20) black (:1738–1743); ritualIntroSub
    fontSize.sm (13) (:1744–1748).
  - muscleChipText: fontSize.sm (13) (:1730).
  Touch targets: chips minHeight 52 (:1583); optionBtn minHeight 48 (:1597);
  ctaBtn height 52 (:1674); gateBtn paddingVertical spacing.lg=16 (:1500, text
  centred). All >= 44px. backBtn width 32 but has hitSlop top/bottom/left/right
  12 (:1306) → effective target >= 44. Muscle chips: paddingVertical spacing.xs=4
  + fontSize.sm text (:1718–1719) — likely under 44px tall (FLAG <44px). Steps
  auto row and weight summary rows use paddingVertical spacing.md=12 around a row
  of text/icon — comfortable.
  Information density: high on the wizard (especially step 1); the fast card is
  light. Multiple long italic derived-note paragraphs add reading load.
  Clean/cluttered: generally clean and tokenised; step 1 can become a long stack.
  Most important action prominent: yes — the full-width primary CTA ("Next" /
  "See this week's coaching") is the dominant element (:1671–1675).
  Small/standard/large behaviour: whole form is inside a ScrollView within a
  KeyboardAvoidingView (:1325, :1330), so it scrolls on small screens. shortInput
  has fixed width:120 (:1640). Font tokens scale via the larger-text setting
  (theme.js:325–337). No hard-coded heights that would clip content.
```

---

```
SCREEN: WellbeingCheck
WHAT IT IS: A five-question SCOFF-style self-screen about the user's relationship
  with food/eating. Stores a score locally and on the body profile; a score >= 2
  shows a supportive signposting alert. (WellbeingCheckScreen.js:22, :46 handleSave.)
WHAT IS ON IT:
  - Intro paragraph explaining the five questions are private, device-only, and
    shape how coaching is approached (:76–78).
  - Five question cards, each with the question text and a Yes / No button pair
    (SCOFF_QUESTIONS :12–18; rendered :81–108).
  - "Save answers" primary button (Button component, size "lg"), disabled until
    all five answered, with a loading state (:110–116; allAnswered :38).
  - Privacy footnote: "Your answers are stored on this device and never shared
    without your permission." (:118–120).
  - On save with score >= 2, an appAlert "Thank you for sharing that" with
    GP/dietitian signposting copy and a "Got it" button that pops back
    (:56–61). Score < 2 simply goes back (:62–63).
WHAT IT STORES: answers persisted to AsyncStorage key '@volyume_scoff_answers'
  (:20, :51); scoffScore (count of true answers, :50) saved to the local profile
  via saveLocalProfile and to the body profile via saveUserBodyProfile (:52–55).
  Answers reload on focus (:27–36).
NAVIGATION: Route "WellbeingCheck", registered in ProfileStack
  (RootNavigator.js:399), options { title: 'Wellbeing check' } (so it shows the
  default stack header, no custom in-screen header). Reached from the You tab
  (YouScreen.js:176 navigation.navigate('WellbeingCheck')). Exits via
  navigation.goBack() on save / alert dismiss (:60, :63, :66).
GATING: NOT DETERMINED IN CODE as Pro-gated. The Stack.Screen at
  RootNavigator.js:399 wraps WellbeingCheckScreen directly with no withProGuard
  and no ProGate; the screen itself contains no tier guard. It sits in
  ProfileStack (the You tab) which is reachable by all tiers. (CLAUDE.md does not
  list a wellbeing/SCOFF screen under either free or Pro.)
CURRENT STRENGTHS: Calm, non-clinical framing; explicit, repeated privacy
  assurance (intro + footnote); save disabled until complete; Yes/No buttons
  carry accessibility roles/labels/selected state (:89–91, :99–101); supportive
  rather than alarming signposting copy on a raised score.
CURRENT WEAKNESSES: No in-screen title/explanation of WHAT this screen is beyond
  "five questions about your relationship with food" — relies on the stack header
  title "Wellbeing check"; no visible scoring or result shown to the user (only a
  conditional alert); a duplicated blank line in styles (:175–176) is cosmetic
  dead space.
NEWBIE QUESTION: Yes — plain Yes/No questions in clear English, with an intro
  that sets expectations and reassures on privacy. A newbie can complete it
  without gym knowledge.
ATHLETE QUESTION: Adequate but minimal — an experienced competitor would
  recognise it as a wellbeing/ED screener; it offers no detail on how the score
  feeds coaching beyond the intro line "help shape how your coaching is
  approached" (:77).
LOCATION QUESTION: Reasonable as a You-tab self-check (YouScreen.js:176). NOT a
  judgement on the safety mechanism.
VISUAL + USABILITY:
  - intro: fontSize.sm (13) lineHeight 22 (:130–134).
  - question: fontSize.sm (13) lineHeight 22, textPrimary (:147–151).
  - btnText: type.label => fontSize.sm (13), textMuted; selected -> primary
    (:168–174).
  - privacy: fontSize.xs (11) lineHeight 18, centred (:177–182).
  - "Save answers" uses the shared Button component size "lg" (sizing defined in
    components/Button, NOT in this file → NOT DETERMINED IN CODE here).
  Touch targets: Yes/No btn paddingVertical spacing.md=12 around fontSize.sm (13)
  text → approx 12+12+~18 ≈ 42px tall (BORDERLINE / likely just under 44px; FLAG).
  Buttons are flex:1 so horizontally wide. Question cards padding spacing.lg=16
  (:138–145).
  Information density: low — five spaced cards in a list (gap spacing.lg=16,
  :136). Clean, not cluttered.
  Most important action prominent: yes — the full-width "Save answers" button is
  the clear primary action.
  Small/standard/large behaviour: content is in a ScrollView (:74) so it scrolls;
  paddingBottom spacing.xxxl=48 (:128). No fixed heights; font tokens scale with
  larger-text. SafeAreaView edges only 'bottom' (:73) — relies on the stack
  header for the top inset.
```

---

```
SCREEN: BlockReflection
WHAT IT IS: An end-of-mesocycle "Block summary": stats, an auto-generated
  narrative, PRs set, the best session, and a prompt to start the next block.
  (BlockReflectionScreen.js:77; data from getBlockReflectionData :85.)
WHAT IS ON IT:
  - BackHeader titled "Block summary" with an optional right-side play-circle
    button that opens a "RecapStory" (variant 'block') (:95–108).
  - Loading: three skeleton cards (heights 100/160/140) (:111–117).
  - Empty state (no data): calendar-outline icon, "No data found", "This block
    doesn't have any logged sessions yet." (:119–125).
  - Block title + dates: block name (header role), date range and planned weeks
    (e.g. "8 Jun 2026 – 5 Jul 2026 · 4 weeks") (:130–139, fmtDate :16).
  - 4-stat row (StatBlock :22): Sessions, Sets, Volume (kg), and Avg session
    (minutes, only when avgDuration > 0) (:142–153).
  - Narrative card: 1–6 generated lines about sessions, working sets + tonnage,
    average session length, week-to-week volume trend, top exercise, or a
    fallback "Block '{name}' is complete." (buildNarrative :32–69; rendered
    :156–160).
  - "Records set this block" section (only if PRs exist): trophy icon + per-PR
    rows showing exercise name, PR type label (Est. 1RM / Heaviest set / Most
    reps) and value with units (:163–179, PR_TYPE_LABELS :71–75).
  - "Best session" card (only if best-session volume > 0): flash icon, "Best
    session", its date and volume in kg (:182–193).
  - "What's next" section: recovery advice copy and a "Start a new block" link
    that goes back then navigates to MesocycleBuilder after a 300ms delay
    (:196–214).
  - "Done" button at the foot, goBack (:218–220).
NAVIGATION: Route "BlockReflection", registered in ProfileStack
  (RootNavigator.js:392), headerShown:false (the screen draws its own
  BackHeader). Reached from MesocycleBuilderScreen.js:239
  (navigation.navigate('BlockReflection', { mesocycleId: meso.id })). Leads to:
  'RecapStory' (play button, :100), back-then-'MesocycleBuilder' (start new block,
  :204–205), and goBack via BackHeader / "Done" (:218).
GATING: NOT DETERMINED IN CODE as Pro-gated. Stack.Screen at RootNavigator.js:392
  wraps BlockReflectionScreen directly — no withProGuard, no ProGate, and no tier
  check in the screen body. (Mesocycles/training blocks relate to the free
  training builder per CLAUDE.md, but no explicit gate is present in this code.)
CURRENT STRENGTHS: Clear hierarchy (title → stats → narrative → records → best
  session → next step); resilient to missing data (empty state, conditional
  sections, fmtDate guards :17, narrative fallback :64–66); a celebratory tone
  with PRs and best session; tabular-num styling on numeric values keeps figures
  aligned (prValue/bestSession use type.num).
CURRENT WEAKNESSES: The "Start a new block" 300ms setTimeout navigation
  (:204–206) is a timing hack that could feel laggy or race on a slow device;
  units are appended raw (pr.value + units, :175) without spacing logic here; the
  narrative is a stack of plain lines with no visual emphasis on standout numbers.
NEWBIE QUESTION: Mostly yes — "Sessions/Sets/Volume", the plain-English narrative
  and "Start a new block" are approachable. "Est. 1RM", "tonnage"/"working sets"
  and "deload" (narrative :54) are terms a first-timer may not know.
ATHLETE QUESTION: Yes — sessions, working sets, tonnage, week-to-week volume
  trend, PRs by type and best session are exactly the block-review metrics an
  experienced lifter expects.
LOCATION QUESTION: Sensible — reached from the Mesocycle builder at block end
  (MesocycleBuilderScreen.js:239) and routes onward to building the next block.
VISUAL + USABILITY:
  - blockName: fontSize.xxl (24) black (:241); blockDates: fontSize.sm (13)
    (:242).
  - statValue: fontSize.lg (17) black; statLabel: type.caption => fontSize.xs
    (11) (:254–255).
  - narrativeLine: fontSize.md (16) lineHeight 23 (:262).
  - sectionTitle: type.label => fontSize.sm (13) (:270).
  - prExercise: type.label => fontSize.sm (13); prType: type.caption =>
    fontSize.xs (11); prValue: type.num('bodyStrong') => fontSize.md (16)
    (:278–280).
  - bestSessionLabel: type.label => fontSize.sm (13); bestSessionDate:
    type.num('caption') => fontSize.xs (11); bestSessionVolume: type.num('title')
    => fontSize.lg (17) (:293–295).
  - nextTitle: type.bodyStrong => fontSize.md (16); nextBody: fontSize.sm (13)
    lineHeight 21; newBlockBtnText: type.label => fontSize.sm (13) (:302–303,
    :310).
  - emptyTitle: type.bodyStrong => fontSize.md (16); emptyBody: fontSize.sm (13)
    (:237–238).
  - doneBtnText: type.title => fontSize.lg (17) (:318).
  Touch targets: BackHeader right play button has hitSlop 10 all sides around a
  24px icon (:101–102) → ~44px (borderline-OK). newBlockBtn paddingVertical
  spacing.sm=8 around fontSize.sm text (:308) → likely under 44px tall (FLAG
  <44px). doneBtn paddingVertical spacing.lg=16 → comfortable (:315). Stat blocks
  are display-only (not interactive).
  Information density: medium — several stacked cards, but each is well spaced
  (content gap spacing.lg=16, :230).
  Clean/cluttered: clean; consistent card surfaces and tokens.
  Most important action prominent: arguably split — the "Start a new block" link
  (:201) is the forward action but is a low-emphasis text link, while the more
  prominent footer button is "Done" (goBack, :218). The most visually prominent
  control is the dismissive one, not the progression one.
  Small/standard/large behaviour: everything is in a ScrollView (:110),
  paddingBottom spacing.xxxl=48 (:230); statsRow is a flex row of 3–4 equal stat
  blocks (flex:1, :251) so it adapts to width; no fixed heights besides skeleton
  placeholders; font tokens scale with larger-text.
```

---

```
SCREEN: GoalLockConsent
WHAT IT IS: A consent screen shown when the user picks an aggressive-cut goal
  (competition / advanced recomp). The user confirms whether they are experienced
  (raises the ED-pattern detector threshold) or want standard safety checks.
  (GoalLockConsentScreen.js:32; header docblock :11–31; save :52.)
WHAT IS ON IT:
  - Title "A note about aggressive cuts" (:76).
  - Body paragraph stating Volyume can support aggressive cuts but has safety
    checks that hold a cut "when your body is telling us something's wrong"
    (:77–79).
  - Field label "Confirm one of these" (:81).
  - A radiogroup of two radio option cards (:83):
      * "advanced" — "I have prior experience managing aggressive cuts safely, or
        I'm working with a coach." (:84–96).
      * "standard" — "I'm new to this and want Volyume's standard safety checks to
        apply." (:98–110).
    Each card has a custom radio circle with a filled dot when selected (:90–92,
    :104–106).
  - Info note with an information-circle icon: "You can change this any time from
    You → Goal lock." (:113–118).
  - Primary CTA reading "Save" in edit mode or "Continue" otherwise; disabled
    until a choice is made (:120–129).
  Behaviour: in edit mode the current value is loaded as the default
  (getGoalLockAdvanced, :40–50). On save it writes setGoalLockAdvanced and records
  engine telemetry (goal_lock_set / goal_lock_cleared with source onboarding vs
  you_tab_edit) (:52–67), then either calls route.params.onContinue(advanced) or
  navigation.goBack().
NAVIGATION: Route "GoalLockConsent" is registered TWICE: in ProfileStack
  (RootNavigator.js:395, options { title: 'Goal lock' }) and in ProOnboardingStack
  (RootNavigator.js:513, options { headerShown: true, title: 'Goal lock' }). In
  both cases the screen uses the default stack header (it draws no in-screen
  header). Reached from the You tab as an edit surface (YouScreen.js:146,
  navigation.navigate('GoalLockConsent', { editMode: true })) and, per the
  docblock + onContinue param, from ProOnboarding step 3 (:25–27, :510–513). Exits
  via onContinue(advanced) or navigation.goBack() (:63–66).
GATING: NOT DETERMINED IN CODE as withProGuard-wrapped. Neither Stack.Screen
  registration (RootNavigator.js:395, :513) uses withProGuard/ProGate, and the
  screen body has no tier check. Contextually it is part of the Pro onboarding /
  Pro goal flow (docblock :13–14, ProOnboardingStack), but no explicit code-level
  Pro guard is present on this route.
CURRENT STRENGTHS: Plain, non-judgemental copy; a proper accessible radiogroup
  with radio roles + selected state (:83–106); CTA disabled until a choice is
  made (:123); a clear "you can change this later" note (:115–117); edit mode
  pre-loads the current setting so it isn't a blind re-pick (:40–50).
CURRENT WEAKNESSES: The screen does not state WHAT each choice changes (the
  detector-threshold difference lives only in the code docblock, :19–24), so the
  user consents without seeing the concrete effect; the two option cards are
  visually identical apart from the text, so the "default/recommended" standard
  option isn't signposted; the info note icon is small (14px, :114).
NEWBIE QUESTION: Mostly yes for the words ("new to this and want standard safety
  checks" is clear), but a newbie cannot tell what materially differs between the
  options because the effect isn't described on screen.
ATHLETE QUESTION: Partly — an experienced competitor understands the intent, but
  may want to know precisely what "prior experience" unlocks; the screen doesn't
  quantify it.
LOCATION QUESTION: Appropriate in both places — inside Pro onboarding when an
  aggressive-cut goal is chosen (:510–513) and as a You-tab edit surface
  (YouScreen.js:146). NOT a judgement on the safety mechanism.
VISUAL + USABILITY:
  - title: type.h2 => fontSize.xxl (24) bold (:138–143).
  - body: fontSize.md (16) lineHeight 22 (:144–149).
  - fieldLabel: fontSize.xs (11) uppercase, semibold, letterSpacing 0.5
    (:150–158).
  - optionText: fontSize.sm (13) lineHeight 20 (:172–177).
  - noteText: type.caption => fontSize.xs (11) (:198).
  - ctaText: type.bodyStrong => fontSize.md (16) (:207).
  Touch targets: option cards padding spacing.lg=16 around multi-line text
  (:163) → tall, comfortable. Radio circle is 22x22 but the whole Pressable card
  is the tap target. CTA paddingVertical spacing.md=12 around fontSize.md text
  (:200–202) → approx 12+12+~21 ≈ 45px (OK, ~>=44). No hitSlop on the CTA but the
  card-sized targets are large.
  Information density: low — title, one paragraph, two option cards, a note and a
  button. Clean.
  Most important action prominent: yes — the full-width amber CTA is the clear
  primary; option cards only outline in primary when active (:169–171).
  Small/standard/large behaviour: content in a ScrollView (:75) with
  paddingBottom spacing.xxxl=48 (:137); no fixed heights; radio sizes are fixed
  px (22/10) but small; font tokens scale with larger-text. SafeAreaView edges
  'top','left','right' (:74), relying on the stack header for chrome.
```

---

```
SCREEN: GoalChangeSummary
WHAT IT IS: A confirmation/summary shown after the user changes their coaching
  goal: a diff of what changed (training goal, phase, calories, macros, protein
  approach) with plain-language reasons, and a "what happens next" list.
  (GoalChangeSummaryScreen.js:126; reasoning helpers :11–71.)
WHAT IS ON IT:
  - Header: centre title "Here's what changed" with a close (X) button at right
    that calls handleDone (popToTop / goBack) (:166–172, :155–162).
  - Hero card: success tick (28px), "Goals updated", and a body that either
    summarises that targets were updated or says "Nothing meaningful changed."
    depending on anyChanged (:175–185).
  - "Training" section (only if goal or phase changed):
      * "Physique goal" ChangeCard with prev→next labels and a reason (:190–198).
      * "Training phase" ChangeCard with prev→next labels and a reason (:199–207).
  - "Nutrition" section (only if kcal/macros/approach changed):
      * "Daily calories" ChangeCard prev→next kcal with a reason (:215–223).
      * "Daily macros" card with MacroRow rows for Protein/Carbs/Fat showing
        prev→next and a signed delta, or an "unchanged" value; a note when macros
        didn't meaningfully change (:225–238, MacroRow :99–122).
      * "Protein approach" ChangeCard prev→next labels + reason (:240–248).
  - "What happens next" section (nextCard): bulleted lines — whether a fresh plan
    was rerolled or not (:256–260), that You-tab nutrition targets now reflect the
    numbers (:264–266), and (only if next.phase === 'cut') a diet-break note for
    deficits beyond eight weeks (:268–275).
  - "Got it" primary button at the foot, handleDone (:278–280).
  Reasoning text is generated by buildPhaseReason/buildGoalReason/buildKcalReason/
  buildProteinApproachReason (:11–71); change detection thresholds: kcal >= 50,
  macros >= 1g (:135, :143–146).
NAVIGATION: Route "GoalChangeSummary", registered in ProfileStack
  (RootNavigator.js:394), headerShown:false (draws its own header :166). Reached
  via navigation.replace('GoalChangeSummary', {...}) from
  ProGoalSetupScreen.js:303 (so it replaces the goal-setup screen on the stack).
  Exits via handleDone -> navigation.popToTop() (preferred) or goBack()
  (:155–162); both the X and "Got it" call it.
GATING: NOT DETERMINED IN CODE as withProGuard-wrapped. Stack.Screen at
  RootNavigator.js:394 wraps GoalChangeSummaryScreen directly (no withProGuard /
  ProGate), and the screen body has no tier check. It is reached from
  ProGoalSetupScreen (the Pro goal flow) but carries no explicit code-level Pro
  guard on this route.
CURRENT STRENGTHS: Strong "show the diff + explain why" pattern — every change
  carries a plain-language reason and a struck-through prev → highlighted next
  (:86–90, :320–322); reasons are direction-aware (e.g. calories up vs down copy,
  :52–62); gracefully handles the no-change case (:181–183, :234–236); macro
  deltas are signed and colour-coded (:112, :336–338); next-steps tell the user
  exactly where to look (Plans, Nutrition Targets).
CURRENT WEAKNESSES: The sectionLabel uses a negative marginBottom (-spacing.xs)
  to pull cards up (:308), a fragile spacing trick; kcal/macros are formatted with
  toLocaleString() with no locale arg (:219, :233 via MacroRow uses bare numbers)
  whereas other screens pass 'en-GB' — a minor consistency gap; reason copy can be
  long inside small cards.
NEWBIE QUESTION: Mostly yes — the diff layout (old → new) plus a one-line reason
  per change is approachable. Terms like "phase", "recomp", "lean gain",
  "surplus", "deficit", "maintenance" appear in the reason copy and may need
  context for a first-timer, though they are explained in plain words.
ATHLETE QUESTION: Yes — phase/goal/calorie/macro/protein-approach changes with
  reasons and a diet-break heads-up are exactly what an experienced user wants to
  see when their plan reflows.
LOCATION QUESTION: Appropriate — it replaces the goal-setup screen
  (ProGoalSetupScreen.js:303 navigation.replace) so the user lands on a clear
  summary right after committing a goal change, then pops to the You-tab root.
VISUAL + USABILITY:
  - headerTitle: type.bodyStrong => fontSize.md (16) (:293).
  - heroTitle: type.title => fontSize.lg (17); heroBody: fontSize.sm (13)
    lineHeight 20 (:302–303).
  - sectionLabel: fontSize.xs (11) uppercase semibold, letterSpacing 0.6
    (:305–309).
  - cardTitle: type.label => fontSize.sm (13); unchangedTag: fontSize.micro (10)
    italic (:316–317).
  - diffPrev: type.body => fontSize.md (16) strikethrough; diffNext:
    type.bodyStrong => fontSize.md (16) primary (:320–322).
  - cardValue: type.bodyStrong => fontSize.md (16); cardReason: fontSize.xs (11)
    lineHeight 18 (:324–325).
  - macroLabel: type.label => fontSize.sm (13); macroPrev/macroNext: fontSize.sm
    (13); macroUnchanged: type.label => fontSize.sm (13); macroDelta: fontSize.xs
    (11) (:331–336).
  - nextText: fontSize.sm (13) lineHeight 20 (:346).
  - doneBtnText: fontSize.md (16) bold (:353).
  Touch targets: header close (X) is a 22px icon with hitSlop 10 all sides
  (:169) → ~42–44px (borderline). doneBtn paddingVertical spacing.lg=16 (:350) →
  comfortable, full-width. The diff/macro rows are display-only.
  Information density: medium — a hero card, up to two training cards, up to
  three nutrition cards/rows and a next-steps card; conditional sections keep it
  from over-filling when little changed.
  Clean/cluttered: clean; consistent Card surfaces (uses shared Card component),
  the "old → new" arrows are a clear motif.
  Most important action prominent: yes — full-width amber "Got it" CTA is the
  dominant control; the X is a secondary dismissal.
  Small/standard/large behaviour: content in a ScrollView (:174) with
  paddingBottom spacing.xxxl=48 (:295); diffRow uses flexWrap (:319) so long
  prev→next labels wrap rather than clip; macro arrows are small fixed px (11px,
  :110); font tokens scale with larger-text. SafeAreaView edges 'top','bottom'
  (:165).
```

---

## Status

1. Files read in full: WeeklyCheckInScreen.js, WellbeingCheckScreen.js, BlockReflectionScreen.js, GoalLockConsentScreen.js, GoalChangeSummaryScreen.js, plus src/styles/theme.js and the relevant parts of src/navigation/RootNavigator.js and src/components/ProGate.js for citations.
2. Screens documented: all 5 (WeeklyCheckIn, WellbeingCheck, BlockReflection, GoalLockConsent, GoalChangeSummary).
3. Could-not-read / NOT DETERMINED: none unreadable. NOT DETERMINED items: code-level Pro gating for WellbeingCheck, BlockReflection, GoalLockConsent and GoalChangeSummary (no withProGuard/ProGate on their routes); the WellbeingCheck "Save answers" Button sizing (lives in components/Button, not in the screen file).

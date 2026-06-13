# Phase 1 — 11 · Onboarding & Auth

Scope: WelcomeScreen, FirstRunScreen, QuizScreen, LoginScreen, ProOnboardingScreen,
ProSetupCompleteScreen, Article9ConsentScreen, ImportScreen.

Token resolution source: `src/styles/theme.js` (dark/default palette, base fontSize
table). Resolved px values (no larger-text multiplier applied):
`fontSize.micro (10)`, `fontSize.xs (11)`, `fontSize.sm (13)`, `fontSize.md (16)`,
`fontSize.lg (17)`, `fontSize.xl (20)`, `fontSize.xxl (24)`, `fontSize.xxxl (32)`,
`fontSize.display (40)` (theme.js:256–266). Type roles:
`type.h2` = fontSize.xxl (24)/bold (theme.js:382–385); `type.title` = fontSize.lg (17)/semibold
(theme.js:390–393); `type.bodyStrong` = fontSize.md (16)/semibold (theme.js:398–401);
`type.label` = fontSize.sm (13)/medium (theme.js:402–405); `type.caption` = fontSize.xs (11)/regular
(theme.js:406–409); `type.body` = fontSize.md (16) (theme.js:394–397).
Spacing: `xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16, xl 24, xxl 32, xxxl 48` (theme.js:228–239).
Radius: `xs 4, sm 6, md 10, lg 14, xl 20, full 999` (theme.js:241–248).

---

## ONBOARDING ORDER & QUIZ-FIRST FLAG (cited)

- **Quiz-first flag:** `ONBOARDING_QUIZ_FIRST = true` (src/lib/onboarding/quizFlow.js:22).
  Comment states it is LIVE per founder decision 2026-06-12. A second flag
  `PHASE_PRE_ACCOUNT = true` (quizFlow.js:46) controls whether the cut/lean-gain/maintain
  phase question is asked pre-account.
- **Welcome routing:** `chooseTier('pro')` navigates to `QuizTraining` only when
  `ONBOARDING_QUIZ_FIRST` is on; otherwise both CTAs go to `Login` with an `intent`
  param (WelcomeScreen.js:55–64). `chooseTier('free')` always routes to `Login`
  with `intent: 'free_signup'` (WelcomeScreen.js:63).
- **Pre-account Pro flow (flag on):** Welcome → QuizTraining (QuizScreen) → PlanPreview
  (QuizScreen.js:56–59 navigates to `PlanPreview`) → account wall. Quiz answers live
  only in the in-memory store slice `onboardingQuiz` (QuizScreen.js:48; quizFlow.js
  docstring lines 6–17: never persisted/transmitted).
- **Top-level navigator priority** (RootNavigator.js:1096–1141):
  1. `!user` → `WelcomeStack` (RootNavigator.js:1117).
  2. signed-in cloud user, first-run not done, consent not yet checked → `SplashScreen`
     (RootNavigator.js:1131–1133).
  3. signed-in cloud user, consent checked + `healthConsent === false` → `Article9ConsentStack`
     (RootNavigator.js:1134–1136).
  4. `!firstRunComplete` → `tier === 'pro' ? ProOnboardingStack : FirstRunStack`
     (RootNavigator.js:1137–1139).
  5. both done → `MainTabs` (RootNavigator.js:1140).
- **Trial/tier grant:** the 14-day Pro trial (`tier='pro'`) is granted at Article 9
  consent via `cascade.startCascade()` (Article9ConsentScreen.js:105–117; RootNavigator.js:1102).
  This is why a new account passes through Article 9 before the navigator decides
  Pro vs Free onboarding.
- **WelcomeStack registration:** Welcome, QuizTraining (QuizScreen), PlanPreview,
  Login (RootNavigator.js:454–464).

---

SCREEN: WelcomeScreen
WHAT IT IS: The unauthenticated front door / tier-selection landing screen. First screen any signed-out user sees.
WHAT IS ON IT:
  - Hero wordmark image `volyume-wordmark.png` (WelcomeScreen.js:12, 70), width 150 (logoImg, WelcomeScreen.js:188).
  - Tagline "Less thinking. More lifting." (WelcomeScreen.js:71).
  - Identity line "Every change has a reason. Every non-change has a reason too." (WelcomeScreen.js:74).
  - Pro card (top, prominent): sparkles icon (WelcomeScreen.js:83); title "Pro" (WelcomeScreen.js:87); badge "Free for 14 days" (WelcomeScreen.js:89); subtitle "The coach who writes back." (WelcomeScreen.js:92); divider; bullet header "Everything in Free, plus:" (WelcomeScreen.js:99) and 4 PRO_BULLETS (WelcomeScreen.js:22–27, 100–105); trial note showing localised monthly price when loaded, else a price-free fallback (WelcomeScreen.js:108–112; price from `usePlayPrices`, WelcomeScreen.js:33–34); "Go Pro" CTA row with arrow (WelcomeScreen.js:114–117).
  - Free card (secondary): create-outline icon; title "Free" (WelcomeScreen.js:127); subtitle "The logbook a coach would write in." (WelcomeScreen.js:128); chevron-forward; 4 FREE_BULLETS (WelcomeScreen.js:15–20, 134–139).
  - Trust row: 3 muted items "Works fully offline · Exports anytime · No ads, ever" with icons (WelcomeScreen.js:148–163).
  - "Already have an account? Sign in" link (WelcomeScreen.js:166–173).
  - Entrance fade/slide animation, skipped under Reduce Motion (WelcomeScreen.js:30, 36–46).
NAVIGATION: Route `Welcome` in WelcomeStack (RootNavigator.js:457). Reached when `!user` (RootNavigator.js:1117). Pro CTA → `QuizTraining` (quiz-first on) else `Login {intent:'pro_signup'}`; Free CTA → `Login {intent:'free_signup'}`; sign-in link → `Login` (WelcomeScreen.js:59–63, 168).
GATING: Pre-auth screen, no tier guard; it is the tier *chooser*. Per comment (WelcomeScreen.js:48–54) both CTAs route to a real sign-up (no anonymous mode).
CURRENT STRENGTHS: Clear two-tier hierarchy with Pro visually dominant (amber border, shadow, elevation — WelcomeScreen.js:200–211). Honest price handling (no hardcoded fallback). Trust row addresses hesitation. Single ScrollView so it scales.
CURRENT WEAKNESSES: Dense for a first screen: hero + identity line + two multi-bullet cards + trust row + sign-in link. PRO_BULLETS are long sentences (e.g. WelcomeScreen.js:26 is two sentences) at fontSize.sm (13) — heavy reading on a landing screen. "Precision Coaching™" jargon appears before any explanation (WelcomeScreen.js:25).
NEWBIE QUESTION: Partly. "Workout logging", "Personal Records", "plan builder" are understandable; but "Precision Coaching™", "division-specific" framing, "check-in", and "your body responds" assume domain knowledge a first-timer lacks. The Free vs Pro distinction is legible though.
ATHLETE QUESTION: Reasonably. The Pro bullets name the differentiators an experienced lifter cares about (auto-adjusting training+nutrition, personalised calorie/protein targets, written rationale). No mention of competition divisions or specific methodology here, which a competitor would want before paying — that surfaces later in Pro onboarding.
LOCATION QUESTION: Correct location — it is the unauthenticated root (RootNavigator.js:1117) and the only entry to sign-up/sign-in per the no-anonymous-mode rule.
VISUAL + USABILITY:
  - tagline: fontSize.sm (13), color textMuted (WelcomeScreen.js:194).
  - identityLine: fontSize.xs (11), textMuted, lineHeight 16 (WelcomeScreen.js:195).
  - proTitle: fontSize.lg (17), black weight (WelcomeScreen.js:221).
  - betaBadgeText: fontSize.micro (10), black (WelcomeScreen.js:226).
  - proSubtitle: type.caption = fontSize.xs (11) (WelcomeScreen.js:227).
  - bulletHeader: type.caption = 11 (WelcomeScreen.js:232).
  - bulletText: fontSize.sm (13) (WelcomeScreen.js:234).
  - trialNote: fontSize.xs (11), lineHeight 17 (WelcomeScreen.js:237).
  - trustText / trustDot: fontSize.xs (11) (WelcomeScreen.js:244–245).
  - proCtaText: fontSize.sm (13), bold (WelcomeScreen.js:252).
  - freeTitle: fontSize.md (16), bold (WelcomeScreen.js:268).
  - freeSubtitle: type.caption = 11 (WelcomeScreen.js:269).
  - freeBulletText: type.caption = 11 (WelcomeScreen.js:271).
  - signInText: fontSize.sm (13); signInAction: type.label = 13 (WelcomeScreen.js:277–278).
  - Touch targets: Pro card whole-card touchable (WelcomeScreen.js:80, ample). Free card whole-card touchable (WelcomeScreen.js:121). Sign-in link paddingVertical spacing.sm (8) per side + hitSlop top/bottom 8 → ~13+16 = ~29px tall; **below 44px** without the hitSlop fully closing the gap (WelcomeScreen.js:166–169, 275). Pro CTA row paddingVertical spacing.md (12) → ~24+text ≈ 40–46px (WelcomeScreen.js:249).
  - Information density: high (hero + 2 cards + trust + link).
  - Most important action (Go Pro) is the most prominent element — yes (amber bordered/shadowed card, top position, filled CTA).
  - Small/large behaviour: ScrollView (WelcomeScreen.js:68) so content scrolls on small devices. Logo is fixed 150px (WelcomeScreen.js:188), does not scale with device. Text scales with OS/in-app larger-text via tokens.

---

SCREEN: FirstRunScreen
WHAT IT IS: First-run name + units capture for FREE users only (Pro signups go through ProOnboardingStack). Comment FirstRunScreen.js:10–14.
WHAT IS ON IT:
  - Title "Almost there." (FirstRunScreen.js:49).
  - Subtitle "Just your name, then a few quick questions to get you set up." (FirstRunScreen.js:50–52).
  - Field label "What should we call you?" (FirstRunScreen.js:54).
  - First-name TextInput, autofocus after 350ms (FirstRunScreen.js:24–27, 55–66).
  - "Continue" Button with trailing arrow, size lg, disabled until name entered (FirstRunScreen.js:68–75).
  - Hint card: info icon + "Next, three quick questions and we'll suggest a starter plan. Prefer to pick your own? You can skip and browse the library instead." (FirstRunScreen.js:77–84).
  - Units are forced to kg, no UI choice (FirstRunScreen.js:17–18 comment, localUnits='kg').
NAVIGATION: Route `FirstRunBranch` in FirstRunStack (RootNavigator.js:470). Reached when signed-in, `!firstRunComplete`, tier !== 'pro' (RootNavigator.js:1137–1138). On Continue → `FreeStarter {fromFirstRun:true}` (FirstRunScreen.js:38). Comment: FreeStarter calls completeFirstRun itself (FirstRunScreen.js:36–37).
GATING: Free path. It is the Free branch of the first-run gate (RootNavigator.js:1138, `tier === 'pro' ? ProOnboardingStack : FirstRunStack`). No in-screen guard.
CURRENT STRENGTHS: Minimal and focused — one input, clear CTA, autofocus, sets up the next step honestly. Disabled CTA until name present prevents empty advance.
CURRENT WEAKNESSES: Units decision (kg-only) is silent — a free user who thinks in lbs gets no choice and no explanation on this screen (FirstRunScreen.js:17–18). The "skip" mentioned in the hint is not actionable on this screen (it lives on the next FreeStarter screen), which could mislead.
NEWBIE QUESTION: Yes — "What should we call you?" plus a single field is about as clear as onboarding gets.
ATHLETE QUESTION: N/A for depth (this is the free quick-setup), but an experienced free user gets no training inputs here; that is by design and fine.
LOCATION QUESTION: Correct — Free first-run entry, distinct from the Pro wizard.
VISUAL + USABILITY:
  - title: type.h2 = fontSize.xxl (24), bold (FirstRunScreen.js:93).
  - subtitle: fontSize.sm (13), lineHeight 20 (FirstRunScreen.js:94).
  - fieldLabel: type.label = fontSize.sm (13), medium (FirstRunScreen.js:95).
  - input text: fontSize.lg (17) (FirstRunScreen.js:99), paddingVertical spacing.md (12).
  - hintText: fontSize.xs (11), lineHeight 17 (FirstRunScreen.js:108).
  - Touch targets: input paddingVertical 12 → ~17+24 ≈ 41px (borderline, FirstRunScreen.js:98). Continue is `Button size="lg"` → paddingVertical spacing.lg (16) × 2 + fontSize.md (16) ≈ 48px (Button.js:34) — meets 44px.
  - Information density: low/clean.
  - Most important action (Continue) is the most prominent — yes (filled lg Button).
  - Small/large behaviour: ScrollView (FirstRunScreen.js:48), all token-sized, scales well.

---

SCREEN: QuizScreen
WHAT IT IS: The COMP-030 pre-account quiz (quiz-first Variant B). Two sections — how you train, what you train for — answered before any account exists; answers go only to the in-memory store slice (QuizScreen.js docstring 1–12, 48).
WHAT IS ON IT:
  - Heading "Eight quick questions." (QuizScreen.js:64) and lede "Your plan takes shape as you answer." (QuizScreen.js:65).
  - Section "How do you train?" (QuizScreen.js:67).
  - "Experience" chips: New to lifting / A year or two in / Experienced (EXPERIENCE, QuizScreen.js:21–25, 69–74).
  - "Days a week" chips: 2,3,4,5,6 (DAYS, QuizScreen.js:26, 75–81).
  - "Session length" chips: 45/60/75/90 min (LENGTHS, QuizScreen.js:27, 82–88).
  - "Equipment" chips: Full gym / Home gym / Bodyweight (EQUIPMENT, QuizScreen.js:28–32, 89–95).
  - Section "What are you training for?" with goal chips from PHYSIQUE_GOALS / GOAL_LABELS (QuizScreen.js:97–103).
  - Conditional "Right now you want to…" phase chips from TRAINING_PHASES, only when `PHASE_PRE_ACCOUNT` (QuizScreen.js:104–114; flag quizFlow.js:46).
  - Footer "See your plan" CTA, disabled until experience + daysPerWeek + trainingGoal set (QuizScreen.js:54, 117–124).
  - Telemetry: `markQuizStep('quiz_open')` on mount, `markQuizStep('quiz_done')` on advance (QuizScreen.js:51, 57).
NAVIGATION: Route `QuizTraining` in WelcomeStack (RootNavigator.js:460). Reached from Welcome Pro CTA when quiz-first on (WelcomeScreen.js:59–61). On "See your plan" → `PlanPreview` (QuizScreen.js:58).
GATING: Pre-auth, pre-account. No tier guard; this is part of the Pro acquisition funnel but runs before any account or tier exists.
CURRENT STRENGTHS: Light, chip-based, fast to complete; chips are minHeight 44 (QuizScreen.js:137) so targets are compliant. Reuses coachingGoals as single source of truth so nothing is re-asked post-account (docstring 7–9). Privacy property is real (in-memory only).
CURRENT WEAKNESSES: **Heading/body mismatch:** says "Eight quick questions." but the actual question count is 4 (experience, days, length, equipment) + goal + conditional phase = 5–6 distinct asks, not eight (QuizScreen.js:64 vs the rendered questions). The session-length question is not gated into the "ready" check (`ready` = experience && daysPerWeek && trainingGoal, QuizScreen.js:54) so a user can skip length/equipment and still proceed. The Welcome experience options (3) differ from the post-account ProOnboarding experience options (4: adds "Competitive") — QuizScreen.js:21–25 vs ProOnboardingScreen.js:71–76 — a mismatch a prefilled wizard will not be able to map "advanced" cleanly across.
NEWBIE QUESTION: Mostly yes — plain-language chip labels ("New to lifting", "Full gym"). "What are you training for?" with physique-goal chips may include competition divisions a beginner won't recognise (depends on PHYSIQUE_GOALS labels, defined outside this file).
ATHLETE QUESTION: Adequate as a teaser but shallow — only 3 experience bands, no weak-point or division depth here (that is deferred to the post-account wizard). The "your plan takes shape as you answer" promise sets an expectation the preview must satisfy.
LOCATION QUESTION: Correct for the quiz-first funnel (pre-account, WelcomeStack). Its existence is flag-gated (ONBOARDING_QUIZ_FIRST, currently true).
VISUAL + USABILITY:
  - h1: fontSize.xxl (24), black (QuizScreen.js:132).
  - lede: fontSize.md (16) (QuizScreen.js:133).
  - section: fontSize.lg (17), bold (QuizScreen.js:134).
  - q (question labels): fontSize.sm (13) (QuizScreen.js:135).
  - chipText: fontSize.sm (13); chipTextOn bold (QuizScreen.js:139–140).
  - ctaText: fontSize.md (16), heavy (QuizScreen.js:144).
  - Touch targets: chips minHeight 44 (QuizScreen.js:137) — compliant. CTA minHeight 50 (QuizScreen.js:142) — compliant.
  - Information density: moderate; one scrollable column of chip rows.
  - Most important action ("See your plan") is the most prominent — yes, fixed amber footer button (QuizScreen.js:117–124, 141–144).
  - Small/large behaviour: ScrollView body + fixed footer (QuizScreen.js:62–125); chips wrap (`flexWrap:'wrap'`, QuizScreen.js:136). Scales well.

---

SCREEN: LoginScreen
WHAT IT IS: The combined sign-in / create-account screen (email+password and OAuth). Mode toggles between signin and signup.
WHAT IS ON IT:
  - Faint decorative background VolyumeMark size 120 at opacity 0.04 (LoginScreen.js:232–234).
  - Brand block: VolyumeMark size 56 + tagline "Less thinking. More lifting." (LoginScreen.js:247–250).
  - OAuthButtons (Apple/Google) (LoginScreen.js:259–263).
  - Form title "Sign in to your account" / "Create your account" (LoginScreen.js:267–269).
  - Signup-only backup prompt: shield icon + "A free account keeps your training and progress backed up and synced…" (LoginScreen.js:270–277).
  - EmailPasswordFields component (LoginScreen.js:279–287).
  - "Forgot password?" (sign-in mode only) (LoginScreen.js:290–298).
  - Primary CTA "Sign In" / "Create Account", size lg (LoginScreen.js:302–310).
  - Mode-switch link "Don't have an account? Create one" / "Already have an account? Sign in" (LoginScreen.js:313–325).
  - Logic: 8-char password minimum + email regex validation on signup (LoginScreen.js:54–61); "No account found" alert offering switch-to-signup on failed signin (LoginScreen.js:90–105); "Check your email" confirmation alert on unconfirmed signup (LoginScreen.js:109–118); cross-user SQLite wipe if a different user previously signed in on this device (LoginScreen.js:130–142); new signup sets `tier='pro'` to route into ProOnboarding (LoginScreen.js:159–168); existing sign-in runs syncAll (LoginScreen.js:180–181).
WHAT IS ON IT (note): "Continue without an account" was deliberately removed (LoginScreen.js:327–331 comment).
NAVIGATION: Route `Login` in WelcomeStack (RootNavigator.js:462). Reached from Welcome CTAs (Free always; Pro when quiz-first off) and the sign-in link (WelcomeScreen.js:63, 168), or from the quiz-first "Save your plan" account wall (downstream of PlanPreview). Initial mode from `route.params.promptSignup` or an `*_signup` intent (LoginScreen.js:38–40). Post-auth routing is driven by RootNavigator's auth listener + tier, not a navigation.navigate call here.
GATING: Pre-auth. No tier guard; `tier`/`setTier` read from store (LoginScreen.js:27–32) and a new account is flipped to `pro` (LoginScreen.js:168) so the navigator sends it through ProOnboardingStack.
CURRENT STRENGTHS: One screen for both auth modes; OAuth surfaced above the form (LoginScreen.js:255–263). Strong error UX: regex + length validation before network, and a helpful "create account instead?" recovery on unknown-credentials (LoginScreen.js:90–105). Cross-user data-safety wipe is a genuine correctness guard (LoginScreen.js:130–142). KeyboardAvoidingView + scroll (LoginScreen.js:236–241).
CURRENT WEAKNESSES: Several declared styles are dead/unused on this screen (`brandName` LoginScreen.js:365–372, `divider`/`dividerLine`/`dividerText` 421–426, `localBtn`/`localBtnText`/`localNote` 439–458) — leftover from the removed local-mode and a now-unused brand text. (Noted, not fixed.) The signup→`tier='pro'` flip (LoginScreen.js:168) means *every* new account created from this screen is routed into Pro onboarding regardless of whether they tapped the Free card on Welcome; the Free vs Pro distinction is reconciled later via the trial cascade rather than here, which is non-obvious.
NEWBIE QUESTION: Yes — standard email/password + social login pattern is universally understood. The backup-prompt copy explains why an account is needed.
ATHLETE QUESTION: N/A (auth screen); nothing here blocks or confuses an experienced user.
LOCATION QUESTION: Correct — terminal screen of WelcomeStack, the only auth surface besides the equivalent step inside ProOnboarding (which shares the same field components).
VISUAL + USABILITY:
  - brandTagline: fontSize.sm (13) (LoginScreen.js:373–377).
  - formTitle: type.title = fontSize.lg (17), semibold (LoginScreen.js:386–390).
  - forgotText: type.label = fontSize.sm (13) (LoginScreen.js:395–398).
  - modeSwitchText: fontSize.sm (13) (LoginScreen.js:411–414).
  - backupPromptText: fontSize.sm (13), lineHeight 20 (LoginScreen.js:434–436).
  - Primary CTA: `Button size="lg"` ≈ 48px tall (Button.js:34) — meets 44px.
  - Touch targets: modeSwitch minHeight 44 (LoginScreen.js:404–410) — compliant. forgotBtn has only `alignSelf` + negative margin, no explicit minHeight, but hitSlop top/bottom 10 each (LoginScreen.js:293–294) → ~13+20 ≈ 33px effective — **below 44px**.
  - Information density: moderate (brand + OAuth + form + CTA + switch); fits without crowding.
  - Most important action (primary CTA) is the most prominent — yes.
  - Small/large behaviour: KeyboardAvoidingView + ScrollView with `keyboardShouldPersistTaps` (LoginScreen.js:236–241). Brand mark fixed at 56/120px (won't scale). Text tokenised.

---

SCREEN: ProOnboardingScreen
WHAT IT IS: The 5-step Pro guided setup wizard (account → profile → training logistics → goal → recovery/reminders), ending in plan + nutrition generation. `TOTAL_STEPS = 5` (ProOnboardingScreen.js:50).
WHAT IS ON IT (by step):
  - Shared header: back chevron (when applicable), VolyumeIcon 22, "PRO" badge, progress bar (endowed-progress base 12%), "Step X of 5", title, sub (ProOnboardingScreen.js:766–807).
  - Step 1 (account): OAuthButtons; EmailPasswordFields (mode signup/signin); primary CTA "Create account and continue"/"Sign in and continue"; switch-auth link (ProOnboardingScreen.js:811–875). 8-char password min (ProOnboardingScreen.js:339–342); "Check your email" alert on unconfirmed signup (ProOnboardingScreen.js:352–364); auto-advance past step 1 if already authenticated (ProOnboardingScreen.js:268–289). Quiz-prefill effect copies onboardingQuiz fields into the wizard on mount (ProOnboardingScreen.js:196–210).
  - Step 2 (profile): first name; biological sex segmented (male/female); age; height (ft+in / cm toggle); body-weight units (st/kg/lbs); current body weight; optional body fat % + measurement method segmented (visual/BIA/caliper/DEXA) (ProOnboardingScreen.js:879–1097). Validates weight 30–300 kg and age 13–100 (ProOnboardingScreen.js:400–423).
  - Step 3 (training logistics): Dropdown training experience (4 options incl. Competitive); session length segmented (45/60/75/90); training days/week segmented (3/4/5/6); equipment Dropdown (6 options) (ProOnboardingScreen.js:1101–1171). Requires experience + sessionLength + equipment (ProOnboardingScreen.js:425–434).
  - Step 4 (goal): focus/phase Dropdown (TRAINING_PHASES); optional "Competing in a category?" Dropdown (PHYSIQUE_GOALS); division-scoped weak-point chips (max 3); collapsible protein-target selector (standard/optimised/advanced with Recommended badge) (ProOnboardingScreen.js:1175–1309). Requires trainingGoal + trainingPhase (ProOnboardingScreen.js:436–449).
  - Step 5 (recovery & reminders): "How your coaching works" card; recovery Dropdown (poor/average/good); coaching reminders — morning weight toggle + hour scroller, weekly check-in toggle + day scroller; daily movement — step target toggle, cardio toggle (ProOnboardingScreen.js:1313–1556). Requires recoveryRating (ProOnboardingScreen.js:499–503).
  - Step 5 "Building your plan" overlay: full progress bar + 4 staged lines mapped to real generation phases, min 3.2s dwell, ActivityIndicator/checkmark per stage; skipped under Reduce Motion (ProOnboardingScreen.js:451–497, 1316–1352; STAGE_DWELL_MS 800, SEQUENCE_TOTAL_MS 3200, ProOnboardingScreen.js:58–59).
  - On submit: requests notification permissions, schedules reminders, saves profile, computes nutrition targets via the shared engine, logs body metric + morning weight, saves body profile, generates+saves plan; on plan failure shows an alert and still navigates to ProSetupComplete (ProOnboardingScreen.js:514–762). `navigation.replace('ProSetupComplete')` on success/failure (ProOnboardingScreen.js:749, 761).
NAVIGATION: Route `ProOnboarding` in ProOnboardingStack (RootNavigator.js:502). Reached when signed-in, `!firstRunComplete`, `tier === 'pro'` (RootNavigator.js:1137–1138). Leads to `ProSetupComplete` (ProOnboardingScreen.js:749, 761); can side-trip to GoalLockConsent (registered RootNavigator.js:513, comment 510–512) and NutritionEducation.
GATING: This IS the Pro branch (RootNavigator.js:1138). Profile is synced with `tier='pro'` + `isBetaTester:true` (ProOnboardingScreen.js:374). It collects exclusively Pro features (nutrition targets, coaching reminders, cardio, steps).
CURRENT STRENGTHS: Disciplined 3–5-fields-per-step structure (comment ProOnboardingScreen.js:425–428); endowed-progress bar; sensible non-blank defaults so the engine never gets a silent fallback for weight (ProOnboardingScreen.js:151–167, 400–423 refuses bad weight); honest staged build sequence tied to real phases with a min-dwell that never completes before the work; robust account/OAuth resume logic (ProOnboardingScreen.js:268–289). Quiz-prefill avoids re-asking quiz-first users.
CURRENT WEAKNESSES: Very large single component (~1780 lines) holding 5 step UIs + all submit logic. Style sheet carries dead/unused blocks (`offerCard` family ProOnboardingScreen.js:1744–1762, `skipBtn`/`skipNote` 1775–1780, `fieldWrap`/`fieldInput`/`eyeBtn` 1661–1675) — leftover. Experience-band mismatch with the pre-account quiz (4 bands here, ProOnboardingScreen.js:71–76, vs 3 in QuizScreen) means the prefill (ProOnboardingScreen.js:203) can carry a value the quiz never offered or vice versa. Step 5 is information-dense (coaching explainer + recovery + 2 reminder blocks with scrollers + 2 movement toggles).
NEWBIE QUESTION: Mixed. Step 2 fields are clear; but "experience" bands are defined by months/years (good), while step 4 ("phase" cut/lean-gain/maintain, competition divisions, protein "optimised/advanced") and the body-fat measurement methods (BIA/caliper/DEXA) assume knowledge a true beginner lacks. The hints mitigate but it is a lot to absorb.
ATHLETE QUESTION: Strong. Division selection, weak-point prioritisation (max 3), protein-approach override with ranges, recovery rating feeding plan volume, body-fat % + method feeding Katch-McArdle BMR — these are exactly the levers an experienced competitor expects.
LOCATION QUESTION: Correct — the Pro first-run branch, entered only for tier=='pro' before first-run completes.
VISUAL + USABILITY:
  - stepTitle: fontSize.xxl (24), bold, lineHeight 30 (ProOnboardingScreen.js:1587–1590).
  - stepSub: fontSize.sm (13), lineHeight 20 (ProOnboardingScreen.js:1591).
  - stepCount: type.num('caption') = fontSize.xs (11) (ProOnboardingScreen.js:1586).
  - proBadgeText: fontSize.micro (10), black (ProOnboardingScreen.js:1575–1578).
  - fieldLabel: fontSize.xs (11), semibold (ProOnboardingScreen.js:1612–1615).
  - fieldHint: fontSize.xs (11), lineHeight 18 (ProOnboardingScreen.js:1616).
  - input text: fontSize.md (16), paddingVertical spacing.md+2 (14) (ProOnboardingScreen.js:1655–1660).
  - primaryBtnText: fontSize.lg (17), bold (ProOnboardingScreen.js:1770); primaryBtn paddingVertical spacing.lg+2 (18) → ~17+36 ≈ 53px, compliant (ProOnboardingScreen.js:1765–1769).
  - seqHeading: fontSize.xxl (24); seqLine: fontSize.md (16) (ProOnboardingScreen.js:1595–1603).
  - notifTitle: type.bodyStrong = fontSize.md (16); notifSub: fontSize.xs (11), lineHeight 17 (ProOnboardingScreen.js:1710–1711).
  - Touch targets: toggle 44×26 (ProOnboardingScreen.js:1722–1724) — width compliant, height 26 below 44 but acceptable as a switch; hourChip paddingVertical 7 → ~11+14 ≈ 25px **below 44px** (ProOnboardingScreen.js:1734–1737); wpChip paddingVertical spacing.sm (8) → ~11+16 ≈ 27px **below 44px** (ProOnboardingScreen.js:1647–1650); segmentSmall (height-unit toggle) paddingVertical spacing.xs (4) → very small **below 44px** (ProOnboardingScreen.js:1687–1689); switchAuthBtn paddingVertical spacing.md (12) → ~13+24 ≈ 37px **below 44px** (ProOnboardingScreen.js:1772).
  - Information density: step 5 high; steps 2–4 moderate.
  - Most important action (Continue/primary CTA) is the most prominent — yes per step.
  - Small/large behaviour: every step wrapped in KeyboardAvoidingView + ScrollView (e.g. ProOnboardingScreen.js:813–815, 1106–1107); hour/day pickers are horizontal ScrollViews (ProOnboardingScreen.js:1415–1432). Tokenised text scales. The "Building your plan" overlay is centred and fixed (ProOnboardingScreen.js:1594).

---

SCREEN: ProSetupCompleteScreen
WHAT IT IS: The Pro onboarding hand-off / reveal screen — shown once after the wizard, summarising the daily routine and the generated plan + targets. Comment ProSetupCompleteScreen.js:30–33.
WHAT IS ON IT:
  - Header furniture matched to the wizard: VolyumeIcon 22 + "PRO" badge; full progress bar; "Setup complete" eyebrow with check icon (ProSetupCompleteScreen.js:123–136).
  - Headline "You're all set, {firstName}." (ProSetupCompleteScreen.js:138); sub = personalised receipt line or "Here's your daily routine." (ProSetupCompleteScreen.js:139, receipt built ProSetupCompleteScreen.js:95–99).
  - Card 1 "1 · Log your weight" (ProSetupCompleteScreen.js:142–154).
  - Card 2 "2 · Hit your daily targets" (only if targetKcal present): kcal ring drawn full showing target kcal; horizontal macro bars (protein/carbs/fat, sized by kcal share, protein emphasised); goal chip + phase chip; targets note; "New to calories and macros? 5-minute guide" link → NutritionEducation (ProSetupCompleteScreen.js:157–229).
  - Card 3 "3 · Train your split" (collapsible, opens expanded): plan name + workout count; split rationale; numbered routine list; "Why this plan, for you" reasons block from whyThis (ProSetupCompleteScreen.js:232–292). No-plan fallback copy (ProSetupCompleteScreen.js:250–254).
  - Card 4 "4 · Check in once a week" (ProSetupCompleteScreen.js:295–307).
  - "Start training" Button (size lg) → `completeFirstRun()` (ProSetupCompleteScreen.js:84–86, 311–319).
  - Entrance animation, skipped under Reduce Motion (ProSetupCompleteScreen.js:36–52).
  - Data loaded from AsyncStorage nutrition targets + active plan/routines + whyThis JSON (ProSetupCompleteScreen.js:54–82).
NAVIGATION: Route `ProSetupComplete` in ProOnboardingStack (RootNavigator.js:506). Reached via `navigation.replace('ProSetupComplete')` from the wizard (ProOnboardingScreen.js:749, 761). "Start training" calls `completeFirstRun()` (no navigate) which flips firstRunComplete so the navigator re-renders to MainTabs (ProSetupCompleteScreen.js:84–86; RootNavigator.js:1137–1140). Macro guide link → `NutritionEducation` (ProSetupCompleteScreen.js:217).
GATING: Pro-only (inside ProOnboardingStack, RootNavigator.js:506). Surfaces only Pro data (nutrition targets, generated plan, weekly check-in, Precision Coaching rationale).
CURRENT STRENGTHS: Strong "reveal" moment — shows the actual generated plan, real kcal ring matching the Diary signature, and a "why this plan, for you" rationale tied to the engine's actual decisions (the methodology promise made on Welcome). Graceful no-plan fallback (ProSetupCompleteScreen.js:250–254). Numbered 1–4 routine framing teaches the daily loop.
CURRENT WEAKNESSES: Card-heavy and long — four cards plus a ring and macro bars; on a small device this is a lot of scrolling before the single "Start training" CTA. Card 2 only appears if AsyncStorage targets loaded (ProSetupCompleteScreen.js:157), so a sync timing failure silently drops the nutrition reveal.
NEWBIE QUESTION: Good — numbered steps, plain "log your weight / hit your targets / train your split / check in", plus an explicit "New to calories and macros?" ramp link (ProSetupCompleteScreen.js:222–227). Best newbie-onboarding screen of the set.
ATHLETE QUESTION: Strong — named split, workout count, per-decision rationale, division/phase chips and macro composition satisfy a competitor that the plan was actually built to spec.
LOCATION QUESTION: Correct — the last beat of the Pro wizard before MainTabs.
VISUAL + USABILITY:
  - doneEyebrow: type.num('caption') = fontSize.xs (11), semibold (ProSetupCompleteScreen.js:348).
  - headline: type.h2 = fontSize.xxl (24), bold (ProSetupCompleteScreen.js:350–353).
  - sub: fontSize.sm (13), lineHeight 20 (ProSetupCompleteScreen.js:354–356).
  - routineTitle: type.bodyStrong = fontSize.md (16) (ProSetupCompleteScreen.js:369).
  - routineBody: fontSize.sm (13), lineHeight 19 (ProSetupCompleteScreen.js:370).
  - ringValue: fixed 34px (eslint-disabled, ProSetupCompleteScreen.js:383–384); ringSub fontSize.xs (11) (ProSetupCompleteScreen.js:385).
  - macroBarLabel fontSize.xs (11); macroBarValue fontSize.sm (13) (ProSetupCompleteScreen.js:394–397).
  - goalChipText: fontSize.xs (11), semibold (ProSetupCompleteScreen.js:407).
  - eduLearnText: type.label = fontSize.sm (13) (ProSetupCompleteScreen.js:409).
  - targetsNote: fontSize.xs (11), lineHeight 17 (ProSetupCompleteScreen.js:410).
  - whyPlanTitle fontSize.xs (11); whyPlanText fontSize.sm (13), lineHeight 20 (ProSetupCompleteScreen.js:424, 427).
  - Touch targets: card 3 whole-card collapsible touchable (ample, ProSetupCompleteScreen.js:232). eduLearnRow has no minHeight but is a row with icons (~14px text + padding ≈ 30px) — **below 44px** (ProSetupCompleteScreen.js:408). "Start training" Button size lg ≈ 48px — compliant.
  - Information density: high (4 cards + ring + macro bars).
  - Most important action ("Start training") is prominent but lives at the very bottom after a long scroll — its prominence depends on the user scrolling to it (ProSetupCompleteScreen.js:311–319).
  - Small/large behaviour: ScrollView (ProSetupCompleteScreen.js:115). Ring fixed 128px and ringValue fixed 34px won't scale with larger-text (ProSetupCompleteScreen.js:377–384). Other text tokenised.

---

SCREEN: Article9ConsentScreen
WHAT IT IS: The UK/EU Article 9 health-data consent gate. Shown to every signed-in cloud user who has not granted explicit consent; blocks the rest of the app until they tick and continue. Locked copy per docs/PRIVACY_CONSENT_LOCKED.md (Article9ConsentScreen.js:14–26).
WHAT IS ON IT:
  - Title "Health and nutrition data consent" (Article9ConsentScreen.js:138).
  - Intro paragraph on why consent is needed (Article9ConsentScreen.js:140–142).
  - "The information Volyume uses…" bullet list (5 items) (Article9ConsentScreen.js:144–151).
  - "An automated safety check:" paragraph describing the ED safety system watching weight/energy/food (Article9ConsentScreen.js:153–156).
  - "What we never do with it:" bullet list (never sell / never share with advertisers / never train a public AI model) (Article9ConsentScreen.js:158–163).
  - "Where it lives:" bullet list (encrypted local / UK servers with RLS / deleted on account deletion) (Article9ConsentScreen.js:165–170).
  - Consent checkbox row "I agree to Volyume using my health and nutrition data to coach me." (Article9ConsentScreen.js:172–185).
  - Withdraw note "You can withdraw this consent at any time in You → Privacy." (Article9ConsentScreen.js:189–191).
  - "Continue" CTA (disabled until checked; shows "Saving…" while busy) (Article9ConsentScreen.js:193–201).
  - "Read the full privacy policy" ghost link → PrivacyPolicy (Article9ConsentScreen.js:203–205, 129–133).
  - Logic: ensures profile row exists, calls `record_health_consent` RPC (audit trail), caches consent in AsyncStorage, fires telemetry with consent version 2026-06-06, and awaits `cascade.startCascade()` (the 14-day Pro trial grant) before resolving (Article9ConsentScreen.js:44–127; CONSENT_VERSION Article9ConsentScreen.js:34).
NAVIGATION: Route `Article9Consent` in Article9ConsentStack (RootNavigator.js:490). Reached when signed-in cloud user, consent checked, `healthConsent === false` (RootNavigator.js:1134–1136). It does not navigate on success — `healthConsentGranted()` flips store state and the navigator re-renders into FirstRunStack/ProOnboardingStack/MainTabs (Article9ConsentScreen.js:118; RootNavigator.js:484–486). Privacy-policy link → in-stack PrivacyPolicy (RootNavigator.js:494).
GATING: Compliance gate that precedes both tiers. Per RootNavigator.js:1098–1103 it sits above the Pro/Free branch, and it is where the trial cascade sets tier='pro' for new accounts (Article9ConsentScreen.js:100–117).
CURRENT STRENGTHS: Plain-language, structured legal copy (what's used / safety check / what we never do / where it lives) — genuinely readable for a consent screen. Versioned consent text pinned in the audit trail (Article9ConsentScreen.js:34, 91–97). Withdrawal right stated before consent per Art 7(3) (Article9ConsentScreen.js:187–191). Network-failure tolerant: local flag still records so the user is never stranded (Article9ConsentScreen.js:69–80). Disabled-until-checked CTA.
CURRENT WEAKNESSES: Long single scroll of legal text before the action — unavoidable for compliance but heavy. The trial-grant coupling (cascade.startCascade at consent) is invisible to the user here; they are not told on this screen that ticking starts a Pro trial (the "Free for 14 days" framing lives back on Welcome).
NEWBIE QUESTION: Yes for comprehension — the copy avoids legalese. A newbie may not grasp that this is also the moment their Pro trial starts, but the consent ask itself is clear.
ATHLETE QUESTION: N/A (compliance gate); nothing here is training-specific.
LOCATION QUESTION: Correct and required — it must precede any health-data collection (RootNavigator.js:1098–1103), so it sits above the onboarding branches.
VISUAL + USABILITY:
  - title: type.h2 = fontSize.xxl (24), bold (Article9ConsentScreen.js:227–232).
  - body: fontSize.md (16), lineHeight 22 (Article9ConsentScreen.js:233–237).
  - subhead: type.bodyStrong = fontSize.md (16), semibold (Article9ConsentScreen.js:238–242).
  - bulletText: fontSize.sm (13), lineHeight 22 (Article9ConsentScreen.js:251–256).
  - consentText: fontSize.sm (13), lineHeight 20 (Article9ConsentScreen.js:282–287).
  - withdrawNote: fontSize.sm (13), lineHeight 20 (Article9ConsentScreen.js:288–293).
  - ctaPrimaryText: type.bodyStrong = fontSize.md (16) (Article9ConsentScreen.js:302).
  - ctaGhostText: fontSize.sm (13), underlined (Article9ConsentScreen.js:308–312).
  - Touch targets: checkbox row paddingVertical spacing.md (12) on a full-width row → ample (Article9ConsentScreen.js:257–268); checkbox glyph itself 24×24 but the whole Pressable row is the target. ctaPrimary paddingVertical spacing.md (12) → ~16+24 ≈ 40px (borderline **below 44px**, Article9ConsentScreen.js:294–300). ctaGhost paddingVertical 12 → ~37px **below 44px** (Article9ConsentScreen.js:303–307).
  - Information density: high but appropriately so (legal disclosure).
  - Most important action (Continue) is prominent (amber fill) but gated behind the checkbox and below all text — correct for consent.
  - Small/large behaviour: ScrollView (Article9ConsentScreen.js:137). All text tokenised, scales.

---

SCREEN: ImportScreen
WHAT IT IS: A staged flow to import a workout-history CSV from Hevy or Strong into Volyume. Presentation only; parsing/writing lives in src/lib/importExternal.js (ImportScreen.js docstring 1–11).
WHAT IS ON IT (by stage):
  - Always: header "Bring your history" + explainer body (ImportScreen.js:153–157).
  - Stage idle: two source cards (Hevy / Strong) with export instructions (ImportScreen.js:31–44, 159–171); "Pick CSV file" primary card (ImportScreen.js:173–176); optional error text (ImportScreen.js:178).
  - Stage parsing: spinner + "Reading your file…" (ImportScreen.js:182–187).
  - Stage preview: preview card with source label; Sessions / Sets / Exercises stats; breakdown rows (matched / will-be-created custom / already-imported-skip); new-custom-exercise names block with hint; "Import N sessions" CTA; "Pick a different file" secondary CTA (ImportScreen.js:189–247).
  - Stage importing: spinner + "Bringing your history in…" + "This usually takes a few seconds." (ImportScreen.js:249–255).
  - Stage done: success card (check icon, "Welcome to Volyume", counts summary); "Done" → goBack; "Import another file" (ImportScreen.js:257–276).
  - Logic: DocumentPicker (CSV types), reads file, parseCSV → detectFormat → parseHevy/parseStrong → analyzeImport; rejects unknown format / empty workouts (ImportScreen.js:63–109); runImport then fire-and-forget bulkUploadLocalData to push to cloud (ImportScreen.js:111–139).
NAVIGATION: Route `Import` in ProfileStack (RootNavigator.js:397, title 'Import history'). Reached from within the You/Profile tab (not part of the first-run onboarding chain). "Done" → `navigation.goBack()` (ImportScreen.js:269).
GATING: Free feature — it lives in ProfileStack with no withProGuard/Gated wrapper (RootNavigator.js:397, contrast the `Gated*` wrappers on the same stack e.g. RootNavigator.js:384, 386, 388). Importing workout history aligns with the Free tier (workout logging is Free per CLAUDE.md). Requires a signed-in `user.id` to confirm (ImportScreen.js:112).
CURRENT STRENGTHS: Clean state-machine UI; every stage is explicit and the preview gives an honest before-commit breakdown (matched vs created vs skipped). Tolerant errors with specific guidance for wrong-file/empty/unknown-format (ImportScreen.js:86–99). Immediate cloud push so a sibling device sees the data (ImportScreen.js:121–130). Numbers formatted with toLocaleString (ImportScreen.js:285).
CURRENT WEAKNESSES: No edit-mapping UI — unmatched exercises silently become custom (by design, docstring 6–8), which a user may not expect even with the hint. Only Hevy and Strong are supported; any other tracker hits the "doesn't look like…" dead end (ImportScreen.js:86–92).
NEWBIE QUESTION: Mostly yes — per-source export instructions are step-by-step (ImportScreen.js:36–43). A brand-new gym-goer with no prior app has nothing to import, but the screen is self-explanatory for those who do.
ATHLETE QUESTION: Yes — an experienced lifter migrating from Hevy/Strong gets sessions, sets, weights, reps preserved and a clear matched/created breakdown; this is a meaningful switching-cost reducer.
LOCATION QUESTION: Reasonable — it lives under You/Profile (RootNavigator.js:397), discoverable post-setup. It is NOT in the first-run onboarding chain, so a new migrator must find it in settings rather than being offered it during onboarding (a discoverability gap rather than a wrong placement).
VISUAL + USABILITY:
  - h1: type.h2 = fontSize.xxl (24), bold (ImportScreen.js:303–307).
  - body: fontSize.sm (13), lineHeight 20 (ImportScreen.js:308–313).
  - sourceName: type.bodyStrong = fontSize.md (16) (ImportScreen.js:329–332).
  - sourceText: fontSize.sm (13), lineHeight 20 (ImportScreen.js:333–337).
  - primaryCtaText: type.bodyStrong = fontSize.md (16) (ImportScreen.js:349–352).
  - secondaryCtaText: type.label = fontSize.sm (13) (ImportScreen.js:362–365).
  - statValue: type.num('h2') = fontSize.xxl (24) (ImportScreen.js:409–412); statLabel type.caption = fontSize.xs (11) (ImportScreen.js:413–417).
  - breakdownText: fontSize.sm (13) (ImportScreen.js:425–428).
  - previewSource / unmappedHead: fontSize.xs (11) uppercase (ImportScreen.js:396–402, 437–444).
  - unmappedText: fontSize.sm (13); unmappedHint type.caption = 11 italic (ImportScreen.js:445–455).
  - errorText: fontSize.sm (13), colour error (ImportScreen.js:367–372).
  - doneTitle: type.title = fontSize.lg (17); doneBody fontSize.sm (13) (ImportScreen.js:466–475).
  - Touch targets: primaryCta paddingVertical spacing.md (12) → ~16+24 ≈ 40px (borderline **below 44px**, ImportScreen.js:339–348); secondaryCta paddingVertical 12 → ~37px **below 44px** (ImportScreen.js:353–360). These are PressableCard CTAs.
  - Information density: low at idle, moderate at preview; clean.
  - Most important action (Pick CSV / Import N sessions) is the most prominent — yes (amber fill primaryCta).
  - Small/large behaviour: ScrollView (ImportScreen.js:152). statRow uses flex:1 columns (ImportScreen.js:403–408) so the three stats space evenly across widths. Text tokenised. The stat numerals use tabular-nums for alignment.

---

## CROSS-SCREEN NOTES

- Recurring sub-44px touch targets on text-link / chip / ghost-button affordances:
  WelcomeScreen sign-in link (~29px), LoginScreen forgot-password (~33px) and
  switch (44 OK), ProOnboarding hourChip/wpChip/segmentSmall/switchAuth (~25–37px),
  ProSetupComplete eduLearnRow (~30px), Article9 ctaPrimary/ctaGhost (~37–40px),
  Import primary/secondary CTAs (~37–40px). Primary `Button size="lg"` CTAs (FirstRun,
  Login, ProSetupComplete) are ~48px and compliant (Button.js:34).
- Fixed (non-scaling) sizes that won't grow under larger-text: WelcomeScreen logo 150
  (WelcomeScreen.js:188), LoginScreen brand mark 56/120 (LoginScreen.js:233, 248),
  ProSetupComplete kcal ring 128 + ringValue 34 (ProSetupCompleteScreen.js:377–384),
  several literal `fontSize: 28/38` brand styles (WelcomeScreen.js:191 unused `wordmark`,
  LoginScreen.js:367 unused `brandName`).
- Dead/unused styles observed (mentioned, not fixed per house rule): WelcomeScreen
  `wordmark` (191); LoginScreen `brandName`, `divider*`, `localBtn*`, `localNote`
  (365–458); ProOnboardingScreen `offerCard` family, `skipBtn/skipNote`,
  `fieldWrap/fieldInput/eyeBtn` (1661–1780).

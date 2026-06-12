# Internal Audit 01 — Onboarding, First-Run, Auth & D0–D14 Activation

**Deep audit 2026-06-12 · Slice: the brand-new-user journey, app-open → first week.**
Read against actual code (App.js, RootNavigator.js, Welcome/FirstRun/Quiz/ProOnboarding/
ProSetupComplete/Article9Consent screens, `src/lib/onboarding/*`, `src/lib/trialActivation.js`,
`src/lib/notifications/scheduler.js` + `trainingReminders.js`, HomeScreen first-run states).
Additive to the 2026-06-10 competitive audit (esp. `-01-onboarding-research.md`, COMP-013/023/030).
Both personas held throughout: **Besa the Beginner** (nervous, mass-market) and **Eddie the Elite**
(competitive, wants precision/credibility fast).

---

## 1. Current-state map (verified against source)

### 1.1 Routing spine (`RootNavigator.renderNavigator`, lines 1089–1123)
1. `!user` → **WelcomeStack** (tier cards → Login, or Quiz when `ONBOARDING_QUIZ_FIRST` is on).
2. Signed-in, consent unresolved (`!healthConsentChecked`) → blocking **SplashScreen**.
3. Signed-in + `healthConsent === false` → **Article9ConsentStack** (un-skippable; `startCascade`
   grants the 14-day Pro trial here, flipping `tier='pro'`).
4. `!firstRunComplete` → `tier==='pro'` ? **ProOnboardingStack** : **FirstRunStack**.
5. Both done → **MainTabs** (5 tabs: Train / Plans / Diary / Progress / You).

### 1.2 The two front doors
- **Pro path:** Welcome → Login/account (ProOnboarding step 1 of 5) → Article 9 consent (trial
  granted) → ProOnboarding steps 2–5 (body stats → training logistics → goal/division/phase/weak
  points → recovery + reminders + steps/cardio) → "Building your plan" labour-illusion sequence
  (4 × 800 ms staged lines) → **ProSetupCompleteScreen** (the COMP-013 reveal: weight habit,
  kcal ring + macros, named split with "why this", weekly check-in) → "Start training" → MainTabs.
- **Free path:** Welcome → Login → **FirstRunScreen** (first name ONLY) → "Start logging" →
  MainTabs Home, which shows a quick-start card + Plan Library card + blank-session link.

### 1.3 COMP-030 quiz-first front door — **built but dark.**
`ONBOARDING_QUIZ_FIRST = false` (`src/lib/onboarding/quizFlow.js:21`). The QuizScreen,
PlanPreviewScreen, in-memory quiz slice, and the ProOnboarding prefill effect (lines 199–210) all
ship and are wired, but the flag is OFF, so **today every user hits the account+consent wall before
one personalised pixel.** Live flow = account-first.

### 1.4 D0–D14 activation machinery (Pro)
- **D0:** plan + kcal/macro targets generated; ProSetupComplete sets the four-habit expectation
  (weigh-in, targets, train, weekly check-in). Morning-weight + check-in notifications scheduled
  IF the user left the toggles on AND granted OS permission at step 5.
- **Morning weigh-in:** 7 weekly triggers, rotating warm copy, default 07:00 (`scheduleMorningWeightNotification`).
- **Training reminders** (`trainingReminders.js`): one weekly notif per scheduled training day —
  but gated on `REMINDER_PREF_KEY === 'true'` and a stored `SCHEDULE_KEY`. **Neither is set during
  onboarding** (see F3).
- **~D3:** `scheduleTrialDay3Notification` — "the coach saw you" moment. Three variants by real
  data: S1 on-track, S2 training-not-weighing, S3 nothing logged. Suppressed under an open ED flag.
- **~D5–D7:** first weekly check-in unlocks (needs `FIRST_CHECKIN_MIN_DAYS=5` of data +
  `MIN_WEIGH_INS=3` weigh-ins in trailing 7d); `scheduleWeeklyCoachReady` lays the Monday 09:00 push
  only when a check-in is actually submitted.
- **~D12 / D14:** cascade-gate pushes ("trial ends in two days" / "you're back on free"). NB the
  scheduler comment says day 19/21 but the constants derive day-2 and day-0 from `proTrialEndsAt`,
  i.e. **day 12 and day 14** of the 14-day trial.
- **Free users get essentially none of this** — no trial banner, no day-3 moment, no scheduled
  reminders unless they manually enable training reminders somewhere.

---

## 2. Findings, ranked by severity

Each tagged with persona + impact. Severity = activation/retention damage × how many users hit it.

### F1 — CRITICAL · Both · activation+conversion · The account+consent wall before any value
**The single biggest divergence from evidence, and it is fully built to fix yet switched off.**
A brand-new user must give email/password AND tick an Article 9 special-category health-consent
checkbox before seeing one personalised thing. The 2026-06-10 research scored this the strongest
conversion finding (impact 9); Flo proves special-category data does NOT force consent-first; Duolingo's
soft-wall lifted DAU ~20%. COMP-030 Variant B (quiz → plan preview → "save your plan" wall) is coded,
tested, and reversible by one flag — `ONBOARDING_QUIZ_FIRST`.
- **Beginner harm:** the consent screen is a wall of legalese (weight, body fat, food diary,
  *"screening questions about eating habits"*, *"signs of under-fuelling or disordered eating"*) as
  the *second screen of their life in the app*. For a nervous beginner this is intimidating and, worse,
  faintly alarming — it foregrounds eating-disorder surveillance before any trust is built.
- **Elite harm:** less, but still pure friction before the credibility payoff.
- **Where it lives:** flip `ONBOARDING_QUIZ_FIRST` after the founder's baseline measurement, OR (if the
  DPO blocks pre-account phase questions) at minimum move the *plan-preview reveal* ahead of the wall.
- **Recommendation:** this is the headline. Treat the dark COMP-030 flag as the primary lever; it needs
  founder + DPO sign-off (per the blueprint §10), not new engineering.

### F2 — CRITICAL · Beginner · activation · The Free path dumps the beginner with NO plan and NO guidance
`FirstRunScreen` collects **only a first name**, then "Start logging" → Home. A free Besa now faces a
quick-start card ("Start your first session — no plan needed"), a Plan Library card, and a blank-session
link. There is **no guided first workout, no "we picked this for you", no quick win.** The most
intimidated, least knowledgeable user in the product gets the *least* structure. Compare Fitbod (one
equipment question → a generated, finishable workout) — the category's proven activation pattern.
- The Free tier *can* legally show Plan Library + builder (both free). So a free user CAN reach a
  structured plan — but only if they self-navigate to Plans → Library → pick → understand splits. A
  nervous beginner will not. They tap "Start your first session", stare at a blank logger, and churn.
- **This is the dual-market gap in one screen.** Elite onboarding (ProOnboarding) is rich; beginner
  onboarding is a name field and a shrug.
- **Recommendation:** give Free a lightweight 2–3 question micro-quiz (days/week, experience,
  full-gym/home/bodyweight) that auto-selects and installs a Plan Library plan, landing them on a
  ready first session. Reuses the existing `splitForDays` logic in `planPreview.js` and the Plan Library.
  Closes the activation gap without touching gating (plan selection is free).

### F3 — HIGH · Both · retention · Training-day reminders are never armed at onboarding
`scheduleTrainingReminders` only fires when `REMINDER_PREF_KEY==='true'` and `SCHEDULE_KEY` exist.
ProOnboarding step 5 schedules morning-weight + weekly-check-in reminders, but **nothing writes the
training schedule or enables training reminders.** So the "today's a training day" nudge — the single
most retention-relevant notification for a beginner building a habit — is off by default for everyone.
The D3 moment and weigh-in nudges fire; the *go-train* nudge does not.
- **Beginner harm:** highest. Habit formation in week 1 is the whole game; the app stays silent on
  exactly the days it should gently prompt.
- **Recommendation:** derive the training schedule from the generated plan's routine days at plan-gen
  time and enable training reminders by default (with the existing opt-out). For Free, set it when a
  Library plan is installed.

### F4 — HIGH · Beginner · activation · Jargon arrives too early for a beginner who picks a division
ProOnboarding step 4 surfaces physique divisions and a **weak-points grid scoped to the division**
("Anything to bring up?"). The copy is mostly plain, and MEV/MRV/RIR are correctly kept out of
onboarding (good — `planPreview.js` explicitly avoids them). BUT:
- The QuizScreen header says **"Eight quick questions"** while rendering **6 fields** — a small but
  real credibility/trust nick on the very first personalised screen (`QuizScreen.js:64`).
- ProSetupComplete's "Why this plan, for you" rationale and the split names (Push/Pull/Legs, Upper/Lower)
  land with zero translation for a true beginner. Eddie loves it; Besa may not know what "Upper/Lower"
  means.
- **Recommendation:** add a one-line plain-English gloss to split names on the reveal for beginners
  (experience === 'beginner'), e.g. "Upper / Lower — two days for your upper body, two for legs." Fix
  the "Eight questions" copy to match the real count (or make the quiz 8 questions).

### F5 — HIGH · Both · conversion · The trial value-expectation is set late and thinly
`TRIAL_CONVERSION_STRATEGY_2026-06-06.md` names the highest-leverage fix as onboarding copy that
plainly states the week-1 arc: "log your morning weight every day; your first check-in is in about a
week and your first coaching adjustment about a week after that." ProSetupComplete lists the four habits
but **does not anchor them to the trial timeline or the day-14 aha.** A trialist who doesn't understand
*when* the magic happens churns before it does (the strategy memo's exact worry).
- The Welcome Pro card markets "Free for 14 days" + the methodology promise well; the *post-signup*
  expectation-setting is where it thins out.
- **Recommendation:** add a single timeline line to ProSetupComplete ("Weigh in daily — your first
  coaching review lands ~day 7, your first real adjustment ~day 14") and surface trial-day context in
  the Home banner (the `trialBannerLine` helper already supports `trialDay`).

### F6 — MEDIUM · Both · trust/credibility · Cardless-trial strength is under-stated at the wall
The research flagged the cardless 14-day trial as an *under-marketed* differentiator vs the 82% of
H&F apps that demand a card on day 0. The Welcome card says "Free for 14 days" + "free week on Google
Play when you subscribe" (slightly confusing two-trial framing), but the **Article 9 consent screen —
the moment of maximum hesitation — says nothing reassuring** ("No card. Nothing charged unless you
choose"). Cal AI's top complaint is hidden pricing; Volyume should bank the opposite.
- **Beginner harm:** the consent screen reads as risk; a "no card, nothing charged" line would convert
  fear into trust at the exact friction point.
- **Recommendation:** add the no-card reassurance line near the consent CTA (does not change locked
  consent copy — it's adjacent reassurance, flag as PROPOSAL since the screen text is locked).

### F7 — MEDIUM · Beginner · activation · The "Building your plan" labour illusion can read as a stall, not theatre
ProOnboarding's 4×800 ms staged sequence (`Balancing your week` → `Setting your starting volume` →
`Choosing your exercises` → `Fitting sessions to your N minutes`) is well-built and honest. Good. But
it's the *only* theatrical beat and it's purely functional; Runna's win is a **named coach intro +
"feel seen"** after the build. Volyume has the receipt line (`getSetupReceiptLine`) but no warmth/voice
moment that says "I've got you."
- **Recommendation:** consider a one-line coach-voice intro on the reveal ("Right — here's the week I'd
  put you on, and why."). Pure copy, no AI (deterministic template), serves the "supported" mandate.

### F8 — MEDIUM · Both · flow · Free→Pro discovery is buried and late
The Pro teaser on Home only appears after **3+ logged sessions** (`HomeScreen.js:1354`). A free beginner
who never gets to 3 sessions (F2) never sees it. And there's no in-flow moment that shows a free user
what coaching would do for them until they've already built a habit alone.
- **Recommendation:** keep the 3-session teaser but add an earlier, softer "what Pro adds" surface in
  the Free first-run (Plan Library is free; a single "Pro would adjust this as you go" line on the
  installed plan is honest and non-gating).

### F9 — LOW/MEDIUM · Both · flow · Article 9 consent screen has no decline path in-app
The locked sequence doc specifies a decline → "delete and exit" follow-up screen. The actual
`Article9ConsentScreen` has only a disabled-until-ticked Continue and a privacy-policy link — **no
decline affordance at all.** A user who won't consent is simply stuck (can only OS-back out of the app).
Minor (consent is required to use the product), but it's a dead-end vs the spec.
- **Recommendation:** confirm intended behaviour; if the spec's decline path is wanted, it's missing.

### F10 — LOW · Beginner · flow · First name is mandatory with no skip
Both FirstRun and ProOnboarding hard-block on a non-empty first name. Trivial friction, but it's a
required text field as the first interaction for a beginner. Most trackers (Hevy) don't gate on it.
Acceptable; noted for completeness.

---

## 3. Cross-cutting observations & where I disagree with prior work

- **Agree, and escalate:** the 2026-06-10 research called the account/consent wall the top finding.
  Reading the code, it's *worse* than they framed for the **beginner** specifically — the consent
  screen's ED-surveillance language as screen 2 is actively off-putting to the exact mass-market user
  this audit wants to win. The fix isn't just conversion; it's beginner psychology.
- **Disagree (mild):** prior work treated the Free path ("name + units → logging") as "already
  Hevy-class" and a strength to protect. It is Hevy-class *as a tracker*. But Volyume is sold as
  *coaching*, and the Free beginner gets neither a plan nor guidance — Hevy users at least arrive
  wanting to log. Volyume's free beginner arrives wanting to be told what to do and gets a blank logger.
  Protecting the free floor is right; leaving it guidance-free is the activation hole (F2).
- **Placement principle confirmed:** the strongest features for this slice (COMP-030 preview, the
  ProSetupComplete reveal, the day-3 moment) are well-built but **mis-placed or dark** — the dark
  quiz flag (F1) and the Free path's missing guided start (F2) are placement failures, not capability
  gaps. "A great feature hidden is a failed feature" applies almost exactly to COMP-030.

---

## 4. Top recommendations (ranked, with placement)

1. **Decide COMP-030.** Flip `ONBOARDING_QUIZ_FIRST` (or ship the plan-preview-before-wall subset)
   after founder/DPO sign-off. Highest leverage; already built. *Welcome → Quiz → Preview → wall.*
2. **Give Free a guided first plan** (F2). Micro-quiz → auto-install a Library plan → land on a
   ready first session. *FirstRunScreen extension; reuses `splitForDays` + Plan Library.*
3. **Arm training-day reminders at plan-gen** (F3). Derive schedule from the plan; default-on with
   opt-out. *planAutoGen + step-5 / Library-install hook.*
4. **Set the trial timeline expectation** (F5) and add the no-card reassurance at consent (F6).
   *ProSetupComplete copy + Article 9 adjacent line (PROPOSAL — consent copy is locked).*
5. **Translate jargon for beginners on the reveal** and fix the "Eight questions" mismatch (F4).
   *ProSetupComplete split-name gloss; QuizScreen header.*

All comply with hard constraints: no AI/LLM (templates only), ED safety untouched, gating intact
(plan selection + Library are Free), offline-first, British English. F1 and F6 touch locked docs and
are flagged as PROPOSALS for the founder, not applied.

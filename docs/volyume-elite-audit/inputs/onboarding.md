# Volyume Elite Audit — O2: Onboarding & First-Session Experience

**Auditor:** O2 (onboarding + first-session). **Date:** 2026-07-04.
**Scope:** app-open → first value, for both the default trial-Pro new user and
the free path. Read-only evidence + options; the main-loop lead decides.
**Method:** source read of `App.js`/`RootNavigator.js` routing, `WelcomeScreen`,
`LoginScreen`, `OAuthButtons`, `Article9ConsentScreen`, `ProOnboardingScreen`
(all 5 steps), `ProSetupCompleteScreen`, `FirstRunScreen`, `FreeStarterScreen`,
plus telemetry (`observability.js`, `engineTelemetry.js`), permission call-sites,
and the five zero-data tab surfaces (cross-checked against
`docs/audit/guidance-audit-2026-07-03.md`).

---

## Executive summary (10 lines)

1. The journey is craftsman-grade in voice and detail: calm copy, honest
   trial-first Welcome, well-explained sex gate, real-range validation, draft
   persistence across process death, and a genuinely motivating plan reveal.
2. Severity counts: **0 P0 · 2 P1 · 4 P2 · 2 P3.**
3. **P1:** the whole activation funnel is effectively unmeasurable — only two
   *persistent* events exist; `audit()` is a Sentry breadcrumb, not analytics.
4. **P1:** the 14-day trial begins as a *silent side effect* of tapping
   "Continue" on the Article 9 consent screen; that screen never says so.
5. Default new users are trial-Pro (cascade grants Pro at consent), so the
   free `FirstRunStack` is essentially unreachable as a first choice (P2).
6. Effort precedes value for the trial-Pro user: ~25–30 discrete interactions
   across a 5-step wizard before the reveal; step 2 is a dense cold form (P2).
7. The emotional arc dips hardest in the middle — the consent wall then the
   profile form — and recovers strongly at `ProSetupComplete`.
8. The Article 9 wall is plain-English and compliance-locked (do not weaken),
   but its framing assumes Pro coaching a free-only user will never receive (P2).
9. First empty session is strong: Home/Diary/Progress teach; one bare state
   remains on Plans (Pro no-active-plan row) (P2).
10. Permissions choreography is good: only notifications are asked mid-setup
    (tied to an explicit toggle, prefs persist regardless); camera/media deferred.

---

## Flow map (verified against source)

Splash (`RootNavigator` `SplashScreen`, min 1600ms; released early only for a
returning onboarded user) → `renderNavigator()` priority ladder
(`RootNavigator.js:1352-1399`):

1. `!user` → **WelcomeStack** (`Welcome` → `Login`; `QuizTraining`/`PlanPreview`
   registered, only reached when `ONBOARDING_QUIZ_FIRST` is on).
2. signed-in + consent unresolved for a new user → **Article9ConsentStack**.
3. `!firstRunComplete` + `tier==='pro'` → **ProOnboardingStack**.
4. `!firstRunComplete` + tier not pro → **FirstRunStack** (free).
5. both done → **MainTabs**.

**WelcomeScreen** — trial-first, one CTA "Start your 14 days" →
`Login {intent:'pro_signup'}` (or the pre-account quiz if the flag is on). Free
tier shown as "Yours free, always" *informational* card, not a competing choice.
"Already have an account? Sign in" is the only other route.

**LoginScreen** — OAuth only (Apple on iOS, Google on Android via
`OAuthButtons`). No email/password, no anonymous. Success is driven by
`onAuthStateChange` in `RootNavigator`.

**Article9ConsentStack** — un-skippable health-data consent (LOCKED, fails
closed). Checkbox + Continue. On Continue: upsert profile row →
`record_health_consent` RPC → local cache → `track('article9_consent_recorded')`
→ **`startCascade()` (grants the 14-day Pro trial, sets tier='pro')** → sync.

**ProOnboardingStack** (5 steps, `TOTAL_STEPS=5`):
- Step 1 **Account** — OAuth; auto-advanced if already signed in.
- Step 2 **About you** — first name, biological sex (gate), age, height, body
  weight (units), optional body fat + method. `canContinue` blocks on all
  required fields at real ranges (30–300 kg, age 13–100).
- Step 3 **Training setup** — experience, session length, days/week, equipment.
- Step 4 **What you're training for** — focus/phase (drives calories; shows a
  *provisional kcal* line), optional competition division, optional weak points,
  optional protein tier.
- Step 5 **Recovery & reminders** — recovery rating, morning-weight + weekly
  check-in toggles/times. Continue runs the "Building your plan" staged sequence
  (min ~3.2s), generates + saves the plan, then `navigation.replace('ProSetupComplete')`.
- **ProSetupComplete** — "You're all set, {firstName}", personalisation receipt,
  4-step routine (weigh-in, macro rings + goal chips, collapsible split with
  "Why this plan", weekly check-in with named first-review date and the 14-day
  trial arc), links to Nutrition guide + Methodology, optional "Build my first
  week of meals". "Start training" → `completeFirstRun()` → MainTabs.

**FirstRunStack** (free) — `FirstRunScreen` (name only) →
`FreeStarter` micro-quiz (3 questions: goal, equipment, days) → installs a
difficulty-0 library plan and `completeFirstRun()`; "Skip, I'll choose myself"
always visible.

---

## Time-to-first-value

**Default new user = trial-Pro** (cascade grants Pro at consent). App-open to a
startable workout:
Welcome (1 tap) → Login (1 tap) → OAuth system dialog (1–2 taps) → Article 9
(checkbox + Continue = 2 taps) → wizard step 1 auto-skipped → **step 2 ~6–8
interactions**, step 3 ~5, step 4 ~2–4, step 5 ~3–5 + a notification permission
dialog → 3.2s build → ProSetupComplete ("Start training", 1 tap) → Home → tap
the session hero to start. **≈5 screens and ~25–30 discrete interactions before
Home; +1 to start a workout.** Motivating value (plan reveal, calorie target,
macro rings, "why this plan") lands at ProSetupComplete, *before* Home — value is
front-loaded at the reveal, but a lot of cold form precedes it.

**Free user** (only reached when the trial is ineligible/declined): Welcome →
Login → OAuth → Article 9 → FirstRun name (1 type + 1 tap) → FreeStarter (3 taps
→ "Start with this plan") → Home **with today's session already answered**.
**≈3 onboarding screens, ~6–8 taps; +1 to start a workout.** Much lighter, value
(a ready plan) arrives fast.

**Where effort precedes value:** the consent wall and step-2 profile form are the
two heaviest, coldest beats, both sitting *before* any personalised payoff.

---

## Emotional arc

- **Welcome** — warm, confident, honest. Tagline *"Less thinking. More lifting."*
  (`WelcomeScreen.js:76`); promise *"A coach that reads your training and adjusts
  your plan."* (`:92`); trust row *"Works fully offline · Exports anytime · No
  ads, ever"* (`:159-165`). The app's promise is communicated clearly here.
- **Login** — sparse but calm; brand mark + tagline; a waiting caption *"Waiting
  for Google or Apple…"* (`LoginScreen.js:88`). No shame, no friction copy.
- **Article 9** — the coldest, heaviest moment, and it is placed *first*. Plain
  English, not legalese (*"Volyume works by using your health and nutrition data
  to tell you what to train, what to eat, and when to back off."*
  `Article9ConsentScreen.js:177-179`), and the ED safety check is disclosed
  honestly (`:191-193`). Still a dense wall before any value.
- **Step 2 profile** — a cold multi-field form, softened by per-field "why" hints
  (*"Used to calculate your calorie and nutrition targets accurately."* `:955`)
  and *"About two minutes. Your answers shape the plan the coach builds."* (`:933`).
- **Recovery is returned** — *"You're all set, {firstName}."*
  (`ProSetupCompleteScreen.js:201`), the receipt line, macro rings and the split
  reveal deliver the promised payoff. The brand's calm/no-shame voice is present
  from screen one and strongest at the reveal; the dip is the middle third.

---

## Findings

### What is already good
- **Trial-first honesty (OB-1).** One CTA that says exactly what happens; the old
  dead Free control is gone; the free tier is stated as what remains
  (`WelcomeScreen.js:24-145`). Price shown only when Play returns it (no
  hardcoded figure).
- **The sex gate is correct and explained.** No default; `advanceFrom2` +
  `canContinue` refuse to advance without an explicit male/female choice, and the
  hint says *why* (`ProOnboardingScreen.js:456-459, 922-926, 955`).
- **Real-range validation with helpful, calm messages** for weight and age
  (`:466-476`); Continue is gated so there is no enabled-then-alert gap.
- **Draft persistence across process death (OB-3)** with a sex-gate clamp so a
  corrupt draft can never restore past the gate (`:309-361`).
- **Provisional kcal at step 4** from the same pure engine call the final plan
  uses (`:1301-1305`) — the "why" is made concrete mid-wizard.
- **The reveal.** Macro rings, goal chips, named first-review date, the 14-day
  arc stated calmly, and "Why this plan, for you"
  (`ProSetupCompleteScreen.js:201-420`). This is the funnel's peak and it earns it.
- **Consent decline affordance (OB-6)** — a hesitant user has sign-out/delete
  routes instead of force-quitting (`Article9ConsentScreen.js:249-286`).
- **Permissions choreography** — notifications requested only at step 5, tied to
  a toggle, and prefs persist regardless of the dialog result (OB-2,
  `ProOnboardingScreen.js:593-594`); camera/media fully deferred to the features
  that need them (ProgressPhotos, ShareCard).
- **Empty first session mostly teaches** — Home first-launch guide, Home/Plans
  no-plan teaching cards, `EmptyDiary` with context-aware CTAs, Analytics
  "Your progress starts here" (per guidance-audit cross-check).

---

### P1-1 · Activation funnel is effectively unmeasurable
**Area:** telemetry / observability.
**Evidence:** persistent (queryable) events in the whole path are only
`track('article9_consent_recorded')` (`Article9ConsentScreen.js:112`) and
`track('onboarding_step_completed', {step})` for steps 1–4
(`ProOnboardingScreen.js:445`, called at `:427,477,489,505`). Everything else is
`audit()`, which is `track.userAction` → `breadcrumb(...)`
(`observability.js:346-348, 299-301`) — a Sentry breadcrumb attached to crashes,
**not** an analytics event. No event for: Welcome viewed, CTA tapped, OAuth
success, trial started, **step 5 completed** (`emitStepDone(5)` is never called),
plan generated, ProSetupComplete reached, "Start training" tapped, first workout
started. The entire **free path is uninstrumented** (`FirstRunScreen`,
`FreeStarterScreen` have zero `track`/`audit`).
**User impact:** none directly. **Business impact:** the team cannot see where
users drop off, cannot measure activation, cannot A/B the wizard, and cannot tell
whether the trial-Pro funnel converts. Confirms the "P5 funnel events
known-unbuilt" note. **Complexity:** M.
**Options:** (a) instrument the full funnel now with `track()` at every step incl.
step 5, welcome/CTA, trial start, plan generated, first workout — one small
event-name schema; (b) instrument only the trial-Pro spine (Welcome→reveal→first
workout) and defer the free path; (c) leave unbuilt (status quo) — measurement
stays blind.

### P1-2 · The 14-day trial starts as a silent side effect of the consent tap
**Area:** consent / billing clarity.
**Evidence:** `Article9ConsentScreen.handleContinue` awaits `startCascade()`,
which grants the 14-day Pro trial and sets `tier='pro'`
(`Article9ConsentScreen.js:126-138`; comment `:121-125`). The on-screen copy is
entirely about *data consent* — nothing on the screen says tapping "Continue"
also begins the paid trial. The Welcome screen mentions the 14 days, but the
screen where the trial actually starts is silent about it.
**User impact:** the trial commences on a health-data consent action; a user
focused on the privacy decision may not register that their trial clock has
started here. **Business impact:** conflates a legal consent with a commercial
enrolment; risk of "I didn't know my trial had started" support/refund friction
and store-policy scrutiny. **Complexity:** S (copy only; the LOCKED consent body
is untouched — this is an additive line below it, like the OB-6 affordance).
**Options:** (a) add one plain line near the CTA, e.g. *"Tapping Continue also
starts your 14 days of full access. No card needed."*; (b) surface the trial
start as its own explicit micro-confirmation after consent; (c) leave as-is and
rely on the Welcome-screen disclosure. (Do not alter the locked consent copy or
gate ordering.)

### P2-1 · Effort precedes value — dense step-2 cold form, ~25+ interactions before the reveal
**Area:** onboarding load / conversion.
**Evidence:** step 2 asks name, sex, age, height (2 fields), weight units +
weight (up to 2 fields), optional BF% + method in one screen
(`ProOnboardingScreen.js:936-1145`); four wizard steps total ~25–30 interactions
before ProSetupComplete. Mitigations present: endowed-progress bar (`:837`),
"About two minutes" (`:933`), per-field why-hints, draft save, provisional kcal.
**User impact:** the heaviest form sits immediately after the consent wall and
before any payoff — the classic abandonment zone. **Business impact:** every
added field costs trial-start completion. **Complexity:** M.
**Options:** (a) turn on quiz-first (`ONBOARDING_QUIZ_FIRST` is currently
`false` — `quizFlow.js:24`; account-first is the live path) so the plan takes
shape *before* the account + form, and confirm rather than re-enter (COMP-030
plumbing already exists and prefills steps 3–4); (b) split step 2 (identity vs body metrics) or make BF%
a post-onboarding nudge; (c) keep as-is — the value is front-loaded at the reveal
and drafts protect progress. (Founder call: this is a "do the full thing vs do
less" fork — surface, do not pre-decide.)

### P2-2 · No brand-new user can choose Free up front
**Area:** flow / positioning.
**Evidence:** Welcome has a single trial CTA and a "Sign in" link for existing
accounts (`WelcomeScreen.js:83, 170-177`); the default path grants Pro via
`startCascade` at consent, so `FirstRunStack` (free) is reached only by
trial-ineligible/returning users (`RootNavigator.js:1395-1396`). The free
`FirstRunScreen`/`FreeStarter` flow is well-built but effectively unreachable as a
first choice.
**User impact:** a user who wants only free training-logging is enrolled into the
trial by default with no signposted "just start free" route. **Business impact:**
intended (OB-1) and good for trial take-up, but risks feeling like a forced trial
and can clash with store "free app" expectations; also means the polished free
on-ramp rarely runs. **Complexity:** S–M. **Options:** (a) keep trial-first as
the locked OB-1 decision; (b) add a quiet "Just start free" link under the CTA
that routes to `FirstRunStack`; (c) offer the free path only to users who decline
the trial. (Founder decision — OB-1 is a recorded founder call.)

### P2-3 · Article 9 consent framing assumes Pro coaching a free-only user won't receive
**Area:** consent proportionality / comprehension.
**Evidence:** the consent body is framed around nutrition/weight-trend coaching,
food diary, weekly check-ins and eating-habit screening
(`Article9ConsentScreen.js:177-207`) — all Pro surfaces. A free (training-only)
user must consent to this processing to pass the un-skippable gate, yet will never
log food or check-ins. The copy is plain-English and LOCKED (do **not** weaken or
reorder). **User impact:** a training-only user is asked to agree to health-data
uses that don't apply to them, which can read as over-collection and cause
hesitation at the wall. **Business impact:** possible consent-wall drop-off for
free-intent users; proportionality questions. **Complexity:** S (additive framing
only). **Options:** (a) since default users are trial-Pro, accept the current
single consent (simplest, status quo); (b) add one contextual line noting the
food/check-in items apply when those Pro features are used; (c) no change — flag
only. (Locked-copy change needs founder + privacy sign-off; present as evidence.)

### P2-4 · One bare empty state on a first-session surface (Plans, Pro no-active-plan)
**Area:** first-session empty states.
**Evidence:** the Pro no-active-plan state on `PlansScreen` is a near-bare text
row (*"No active plan · Build one, browse the library, or create your own from
scratch."*), not the icon-title-body-CTA teaching shape used elsewhere; already
logged as guidance-audit Tier 2 #17. All other first-session surfaces
(Home first-launch + no-plan, `EmptyDiary`, Analytics zero-data, You as a hub)
teach correctly. **User impact:** a Pro user with no active plan (e.g. cloud
restore still pulling) gets a flat row instead of a next action. **Business
impact:** minor first-session polish gap. **Complexity:** S. **Options:** (a) give
it the teaching-card shape (icon + title + body + CTA), matching Home's no-plan
card; (b) reuse Home's Pro no-plan component; (c) leave for the guidance-audit
backlog.

### P3-1 · Cancelled/failed OAuth on ProOnboarding step 1 gives no feedback
**Area:** auth resilience.
**Evidence:** `LoginScreen.handleOAuth` shows a toast on cancel/error
(`LoginScreen.js:34-41`), but `ProOnboarding.handleOAuthOnboarding` only
`logInfo`s a cancel and returns with no user-visible feedback
(`ProOnboardingScreen.js:417-420`); errors show an alert but a plain cancel is
silent. **User impact:** a user who backs out of the OAuth sheet at the account
step sees nothing and may not know what to do. **Business impact:** small
avoidable stall at the account wall. **Complexity:** S. **Options:** (a) mirror
LoginScreen's cancel toast; (b) add a one-line helper under the buttons; (c) leave.

### P3-2 · Notification permission requested mid-setup, before the plan reveal
**Area:** permissions timing.
**Evidence:** `requestNotificationPermissions()` fires in `advanceFrom5` at step 5
(`ProOnboardingScreen.js:594`), i.e. before ProSetupComplete demonstrates value.
Mitigated: it is tied to explicit reminder toggles the user just set, and the
chosen prefs persist regardless of the dialog result (OB-2). **User impact:**
minor — the ask is contextual, not cold. **Business impact:** slightly earlier
than "after first value", a small permission-grant-rate risk. **Complexity:** S.
**Options:** (a) keep (contextual, low risk); (b) defer the OS prompt to the first
time a reminder would actually fire; (c) move it just after ProSetupComplete.

---

## Scope cuts (runtime budget)
- Steps 4/5 read in full for copy; the remaining ~340 lines of step-5 time
  pickers and the StyleSheet were skimmed (no user-facing logic there).
- Empty-state and telemetry/permission sweeps were run as sub-agents and
  cross-checked against `docs/audit/guidance-audit-2026-07-03.md`; I did not
  re-open every tab screen line-by-line.
- Quiz-first pre-account flow (`QuizScreen`/`PlanPreviewScreen`, gated by
  `ONBOARDING_QUIZ_FIRST`) was mapped from the router + Welcome only; the flag
  is currently `false` (`quizFlow.js:24`), so account-first is live and the
  quiz screens are dormant.

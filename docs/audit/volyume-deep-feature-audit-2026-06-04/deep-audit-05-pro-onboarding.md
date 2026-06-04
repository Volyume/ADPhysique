# Deep Feature Audit — Item 4: Pro onboarding wizard

**Document:** deep-audit-05-pro-onboarding.md
**Item:** 4 of master inventory (Group 1 — the onboarding new signups reach: tier is set to Pro at signup, so this is the live first-run for everyone in beta)
**File:** `src/screens/ProOnboardingScreen.js` (1558 lines), components `OptionCard`, `SegmentedControl`, `OAuthButtons`, `EmailPasswordFields`
**Status:** AWAITING APPROVAL
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A 4-step setup wizard (`TOTAL_STEPS = 4`) entered when `tier === 'pro' &&
!firstRunComplete` (`RootNavigator.js:951-952`). It collects account, body, and
training data, schedules reminders, computes nutrition targets, generates the
first plan, and hands off to `ProSetupComplete`.

- **Step 1 — Create account** (`:646-710`): `OAuthButtons` + `EmailPasswordFields`
  + a primary CTA; title "Create your account." / "Sign in to continue." A mount
  effect (`:263-273`) auto-advances past step 1 if the user is already
  authenticated and has no profile — which is the normal case, because the user
  has just authed at `LoginScreen` (Item 2). So in the standard
  Welcome→Login→consent→ProOnboarding flow, **step 1 is skipped** and is a
  duplicate of the Login screen.
- **Step 2 — Profile** (`:714-909`): first name, biological sex, age, height
  (ft+in / cm), body-weight units (st/kg/lbs), body weight. ~6 fields. Title
  "Let's get you set up." / "about two minutes". Defaults pre-filled so no field
  is blank; validation refuses bad weight/age before advancing (`:382-405`).
- **Step 3 — Training profile** (`:913-1103`): training experience (4 `OptionCard`s),
  session length (`SegmentedControl`), days/week (`SegmentedControl`), equipment
  (6 `OptionCard`s), "What are you focused on right now?" (training phase
  `OptionCard`s), optional "Competing in a category?" (`Dropdown`), weak-point
  chips, and a collapsible protein target. Title "Your training profile." / "about
  30 seconds." **This is ~8 distinct controls in one long scroll.**
- **Step 4 — Recovery & reminders** (`:1107-1310`): a "How your coaching works"
  explainer card, recovery rating (`OptionCard`s), morning-weight reminder toggle
  + hour scroller, weekly check-in toggle + day scroller, daily step target
  toggle, cardio toggle. On Continue: requests notif permission, saves profile,
  logs body metric + morning weight, computes + saves nutrition targets, and
  `generateAndSavePlan` → `navigation.replace('ProSetupComplete')` (`:422-596`).

Header on every step: brand row (`VolyumeIcon` + PRO badge + optional back
chevron), a 4-segment progress bar, "Step X of 4", title, sub.

### Findings
1. **Step 3 is overloaded.** ~8 controls (several with sub-options) on one
   scrolling screen, against the 3-5-fields-per-step best practice (Step B). The
   "about 30 seconds" sub (`:923`) under-states it. This is the single biggest UX
   issue in the flow.
2. **Two segmented-control implementations on the same wizard.** Step 2 uses a
   hand-rolled `segment`/`segmentRow` (`:744-755`, `:834-850`) for sex and units;
   step 3 uses the shared `SegmentedControl` component (`:945`, `:956`). Same
   control, two code paths and two looks.
3. **Inconsistent toggle accessibility.** The steps and cardio toggles set
   `accessibilityRole="switch"` + `accessibilityState` + label (`:1259-1261`,
   `:1282-1284`), but the morning-weight and weekly-check-in toggles (`:1161-1166`,
   `:1205-1210`) set none — a screen reader cannot tell they are switches.
4. **Step 1 redundancy.** The account step duplicates `LoginScreen` and is
   auto-skipped in the normal flow; "Step X of 4" therefore counts a step the
   user effectively never does. Minor, but the wizard is really 3 data steps.
5. **Progress bar starts empty.** The first segment is "active", none "done"
   (`:603-611`); the Endowed Progress Effect says starting at 10-20% lifts
   completion (Step B).
6. **Email-confirmation friction reappears** (`:340-343`, "Check your email …
   sign in here, then continue") — same as Login (Item 2), flagged there.

### Design assessment (values cited)
- On-system tokens; progress segments `height: 3` amber done / amber-alpha active
  / border pending (`:1335-1338`). PRO badge amber. `OptionCard`/`SegmentedControl`
  shared components used in step 3. Hand-rolled `Dropdown`, toggles, and segments
  elsewhere. Hints are `fieldHint` muted under each `fieldLabel`.
- Polish is high; the wizard reads premium and intentional. The inconsistency is
  internal (custom vs shared controls), not off-brand.

### UX / usability
- **Strong:** progress bar + "Step X of 4" (both), sensible pre-filled defaults
  (no blank-field traps), validation before advancing, a "why we ask" hint on
  almost every field (`:743`, `:855-857`, `:929`, `:984`…), an honest coach
  explainer, "Recommended" protein badge, optional weak points, and
  available-not-forced framing for steps and cardio.
- **Weak:** step 3 overload (#1), the a11y toggle gap (#3), control inconsistency
  (#2), and the optimistic "30 seconds" copy.

### Flow assessment
- Reached post-consent. Back nav on steps 3-4 (`goBack`), none on 1-2 (by design:
  can't go back past a completed account). Back preserves entered data (state).
  On finish → `ProSetupComplete`. The plan generates here, so the user lands on a
  ready Home (strong). A plan-gen failure shows a clear recovery Alert (`:583-586`).

### Integration assessment
- Deeply integrated: writes profile, body metrics, nutrition targets, reminders,
  and the generated plan. Shares the auth components with `LoginScreen`. The
  divergences are the duplicate segmented control and the toggle a11y gap.

---

## STEP B — RESEARCH (live web, 2026-06-04)

### Multi-step onboarding form best practice (with numbers)
- **Progress indicators cut abandonment 20-25%**, and **"step 2 of 4" beats
  "step 2"** — showing both position and total. (Volyume does both. ✓) [Heyflow; DEV]
- **3-5 fields per step** (some say up to 5-9), grouped by logical category, to
  avoid overwhelm. (Volyume step 3 ≈8 controls — over. ✗) [Anve]
- **Chunking into more small steps increases completion**, and the **Endowed
  Progress Effect** — starting the bar at 10-20% on screen 1 — measurably lifts
  completion. Start with a low-friction question. [Anve]
- **Longer-but-chunked onboarding can be a win** for committed-user apps: "some of
  the highest-converting apps have 40-50 screen onboarding flows … fewer users
  finish but convert at much higher rates" — i.e. the fix for an overloaded step
  is to split it, not delete fields. [RevenueCat]
- **One-question-per-screen** is the fitness-app trend (Fitbod: "What equipment do
  you have?" per screen), correlated with first-action completion and return.
  [DEV; UXCam]
- **Allow back navigation without losing data**; labelled step indicators help for
  5+ steps. (Volyume preserves data ✓; numeric "Step X of 4" is fine at 4 steps.)

### Platform standards
- Apple HIG onboarding: fast, optional, progressive disclosure — supports
  chunking and not front-loading everything on one screen. [Apple HIG]

---

## STEP C — COMPARISON

### Where Volyume leads
- **Best-practice progress signalling** (bar + "Step X of 4") — the 20-25%
  abandonment lever, done right. [Heyflow]
- **Every field explains why it is asked** — rare and excellent; directly raises
  willingness to answer. [DEV]
- **Sensible pre-filled defaults + hard validation** — no blank-field traps, no
  silent bad-macro fallback.
- **Generates the plan during onboarding** so the user lands on a ready Home, not
  an empty state — the "first meaningful action" the research prizes. [DEV/Fitbod]
- **Honest, non-coercive framing** (available-not-forced steps/cardio; "be honest,
  it adjusts to protect you").

### Where Volyume lags
- **Step 3 overload** vs the 3-5/step rule and the one-question-per-screen trend.
- **Internal inconsistency** (two segmented controls) and an **a11y toggle gap**.
- **Empty starting progress** (misses the Endowed Progress Effect).
- Minor: duplicate account step in the count; optimistic "30 seconds".

### Critical gaps
- None functional. The overloaded step 3 is the one that measurably costs
  completion.

---

## STEP D — PROPOSAL

### Summary
The wizard is well-built; the work is to chunk the overloaded step 3, unify the
duplicated control, close the toggle-a11y gap, and apply the endowed-progress
start. The chunking is the headline (Medium effort); the rest are quick wins.

### Specific changes — one by one

**1. Split step 3 into two smaller steps. [Code/structure] — `:913-1103`**
- What: divide "Your training profile" into (3a) **Logistics** — experience,
  equipment, days/week, session length — and (3b) **Goal** — focus/phase, optional
  competition category, weak points, protein. Bump `TOTAL_STEPS` to 5 and update
  the progress bar + "Step X of N".
- Evidence: 3-5 fields/step; chunking increases completion + endowed progress;
  one-question-per-screen trend. [Anve; DEV; RevenueCat]
- Effort: Medium (state stays the same; only the render splits and the step
  indices/validation shift). Recommend as the headline.

**2. Unify on the shared `SegmentedControl`. [Code/design] — step 2 `:744-755`, `:834-850`**
- What: replace the hand-rolled `segment`/`segmentRow` for sex and body-weight
  units with the shared `SegmentedControl` already used in step 3.
- Evidence: component consistency; one look, one code path; CLAUDE.md design rules.
- Effort: Low.

**3. Fix the toggle accessibility gap. [A11y] — `:1161-1166`, `:1205-1210`**
- What: add `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, and
  a label to the morning-weight and weekly-check-in toggles, matching the steps
  and cardio toggles.
- Effort: Low.

**4. Start the progress bar partially filled. [Design] — `ProgressBar` `:600-614`**
- What: render the first segment as partially complete on step 1 (Endowed
  Progress Effect), e.g. treat the just-completed account as "done" so a user who
  auto-skips to step 2 sees real progress.
- Effort: Low.

**5. Correct the "30 seconds" copy on step 3. [Copy] — `:923`**
- Once split, set honest sub-copy per sub-step (e.g. "Takes a minute. This shapes
  your plan."). Effort: Low.

**6. (Flag, not proposed) Step-1 redundancy.** Because the user authed at
`LoginScreen`, consider dropping the account step from the Pro wizard entirely (it
is auto-skipped) and counting only the 3 data steps, OR keeping it solely as the
fallback for an unauth'd entry. A routing decision; flag for your call.

### COPY CHANGES
Current (`:923`): "Takes about 30 seconds. This shapes your entire plan."
Proposed (per split sub-step): "Takes a minute. This shapes your plan." (and a
matching one-liner on the goal sub-step).

### What to keep (with evidence)
- The progress bar + "Step X of N" (20-25% abandonment lever). [Heyflow]
- The "why we ask" hint on every field. [DEV]
- Pre-filled defaults + hard validation; plan generation during onboarding;
  available-not-forced framing; the coach explainer; the "Recommended" protein
  badge; back-nav-preserves-data.

### IMPACT / EFFORT
- **Impact: High** for change 1 (measured completion lever); Medium for 3-4
  (a11y + endowed progress); Low for 2/5; flag for 6.
- **Effort: Medium** for the step split; **Low** for everything else.

### SOURCES
- Anve — Multi-step form best practices (3-5 fields, endowed progress): https://voiceforms.anvevoice.app/blog/multi-step-form-best-practices/
- Heyflow — Progress indicators reduce abandonment 20-25%: https://heyflow.com/blog/reduce-form-abandonment-progress-indicators/
- DEV — Fitness app onboarding guide (data, motivation, completion): https://dev.to/paywallpro/fitness-app-onboarding-guide-data-motivation-completion-an0
- RevenueCat — Why your onboarding might be too short: https://www.revenuecat.com/blog/growth/why-your-onboarding-experience-might-be-too-short/
- UXCam — Apps with great onboarding: https://uxcam.com/blog/10-apps-with-great-user-onboarding/
- Userpilot — Onboarding wizard pitfalls: https://userpilot.com/blog/onboarding-wizard/
- Apple HIG — Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding

# Deep Feature Audit — Item 2: Login / sign-up screen

**Document:** deep-audit-03-login-screen.md
**Item:** 2 of master inventory (Group 1, core flows — second screen of FL1)
**Files:** `src/screens/LoginScreen.js`, `src/components/auth/EmailPasswordFields.js`, `src/components/auth/OAuthButtons.js`
**Status:** IMPLEMENTED (approved 2026-06-04, "Ok"; changes 1-4 applied, change 5 flagged only)
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The single auth screen for both sign-up and sign-in, reached from every Welcome
CTA (`intent: pro_signup` / `free_signup`) and from the "Sign in" link. One
screen, two modes toggled by a switch at the bottom.

Structure (`LoginScreen.js:236-340`):
1. Faint decorative background wordmark (`VolyumeMark size={120}` opacity 0.04, `:240`).
2. Brand block: `VolyumeMark size={56}` + tagline "Less thinking. More lifting." (`:254-257`).
3. Divider.
4. **OAuthButtons** (`:266-270`): Continue with Apple (iOS only) + Continue with
   Google, then an "or with email" divider.
5. **Form block** (`:273-302`): title ("Sign in to your account" / "Create your
   account"); a **backup prompt** shown only when `promptSignup && !isSignIn`
   (`:277-284`); `EmailPasswordFields`; "Forgot password?" (sign-in only).
6. Primary **Button** ("Sign In" / "Create Account"), with `loading` (`:305-313`).
7. Mode switch ("Don't have an account? Create one" / "Already have an account? Sign in").
8. `betaNote`: "No subscription required" (`:336`).

Behaviour:
- **Mode init** (`:45-47`): `promptSignup = route.params.promptSignup === true || route.params.intent === 'pro_signup'`. Initial mode = signup if `promptSignup`, else signin.
- Email auth (`:53-194`): inline validation (email regex `:61`; 8-char password on signup `:65`), audit events, sign-up vs sign-in, a "No account found → Create account" recovery alert (`:97-112`), an email-confirmation alert (`:121-125`), cross-user local wipe (`:137-148`), profile/data sync, and on a brand-new signup `if (!tier) await setTier('pro', …)` (`:175`).
- OAuth (`:196-220`): disables both buttons; completion handled by `RootNavigator.onAuthStateChange`.
- Forgot password (`:222-232`).

`EmailPasswordFields`: email + password inputs, labels, focus border (amber-alpha),
a show/hide eye toggle, correct `autoComplete`/`textContentType` autofill hints,
`keyboardType="email-address"`, `autoCapitalize="none"`. Single password field,
no confirm-password.

`OAuthButtons`: Apple (iOS only, per App Store rule), Google, "or with email"
divider. Presentational, disabled-state aware.

### Three defects found (all about the Free path + legibility)
1. **A new "Free" user lands on Sign In, not Create Account.** `promptSignup`
   (`:45-46`) only fires for `pro_signup` (or the explicit `promptSignup` param).
   Welcome's Free CTA sends `intent: 'free_signup'` (`WelcomeScreen.js:49`), which
   is **not** matched, so a brand-new user who just chose the Free tier is dropped
   on the **sign-in** form and must notice and tap "Create one" to proceed. The
   code comment at `:43-44` says this is deliberate ("Welcome's 'Go Pro' intent
   lands us in signup tab"), but it leaves the Free signup path mis-routed.
2. **The reassurance prompt is Pro-only.** The backup prompt (`:277-284`,
   "Create a free account to keep your plan, workouts, and progress safe…") is
   gated on `promptSignup && !isSignIn`. Because Free intent never sets
   `promptSignup`, a Free user — even after switching to "Create one" — never sees
   it. New Free accounts get zero reassurance about why an account is needed.
3. **The trust line is the least legible text on the screen.** "No subscription
   required" (`:336`) uses `colors.textDisabled` (`:461-465`), the faintest token.
   It is a valuable payment-anxiety reducer rendered almost invisibly.

### Design assessment (values cited)
- On-system tokens throughout: `colors.background`, `colors.surface`, amber
  accents, scale spacing/radii. Inputs use `radius.md`, border 1.5, focus
  `withAlpha(primary, 0.502)` (`EmailPasswordFields.js:91`).
- Brand mark dialled to 56 (`:255`) — deliberately not dominating (comment `:250-253`).
- Decorative bg wordmark opacity 0.04 — subtle, not a banned gradient/orb.
- Hierarchy clear: OAuth first, then email form, then CTA. Matches "social-first".
- `betaNote` contrast aside, type and spacing are consistent and premium.

### UX and usability assessment
- **Form minimalism is excellent**: two fields (email, password), single
  password with show/hide, no confirm-password, correct autofill + keyboard
  types. This is best-practice (Step B) and a real strength.
- **Social-first** ordering is correct (OAuth above email).
- **Error recovery is strong**: unknown-account offers "Create account"; email
  not confirmed handled distinctly (AUTH-6 precedence, `:84-96`).
- **Loading/disabled** states handled (Button `loading`, OAuth `disabled`).
- **Weaknesses**: the Free-intent mis-route (#1) and missing reassurance (#2);
  the faint trust line (#3); minor touch-target size on the mode-switch
  (`paddingVertical: spacing.xs` = 4, `:410`) and forgot-password
  (`marginTop: -spacing.sm`, `:397`) — both likely under the 44pt target height.
- **Email confirmation friction**: on sign-up the user is told "Check your email …
  come back here and sign in" (`:121-125`), a return trip many find annoying
  (Step B). This is a Supabase-config/auth-architecture matter, flagged not
  proposed here.

### Flow assessment
- Reached from Welcome (3 entry points) + RootNavigator. On success, routing is
  driven centrally by `onAuthStateChange`. No back button to Welcome (WelcomeStack
  header hidden) — a user who chose the wrong tier cannot return to re-read them,
  though during beta every new signup becomes Pro anyway (`:175`), so tier choice
  is presently cosmetic (a tier-system note, out of scope for this screen).

### Integration assessment
- The auth components are shared with the Pro onboarding account step (so any
  change here is consistent across both surfaces). Native theme + voice.

---

## STEP B — COMPETITOR RESEARCH (live web, 2026-06-04)

### Sign-up / sign-in form best practice (with numbers)
- **Fewer fields convert.** "Forms with 5 fields or fewer maintain 50%
  conversion rates versus 20% for 10+ fields." [Authgear; abtasty]
- **No confirm-password.** "making users confirm their password decreases
  conversion … in one case study, removing the confirm password field increased
  the conversion rate by 56.3%." Use a show/hide toggle instead. [Authgear]
- **Social login first.** "Social login reduces registration abandonment by 45%";
  many users "gladly 'Sign up with Google/…/Apple' to skip filling a form."
  [Authgear; ParallelDevs]
- **Mobile-optimised forms** (right keyboards, no excess scroll, autofill) "show
  40% higher completion rates". [Authgear]
- **Login friction kills conversion**, and is "even more deadly" on mobile;
  support autofill/one-tap. [Corbado]

### Email-confirmation friction
- Mandatory confirmation "require[s] all users to go through an extra step, and
  even though added with good intentions, it's viewed as a hindrance for those
  who made no mistake." The sign-up-then-return-to-sign-in round trip is a
  recognised drop-off point. [Quora discussion — anecdotal, treated as
  directional sentiment, not hard data]

### Platform / store rules
- Offering any third-party social sign-in on iOS requires **Sign in with Apple** —
  already correctly implemented as iOS-only (`OAuthButtons.js:14`). [App Store rule]

---

## STEP C — COMPARISON

### Where Volyume leads
1. **Textbook-minimal form**: email + password only, single password, no
   confirm-password, show/hide toggle. Directly matches the highest-leverage
   conversion rules (the ~56% confirm-password finding; ≤5 fields). [Authgear]
2. **Social-first** with correct Apple-on-iOS compliance — captures the ~45%
   abandonment reduction. [Authgear; App Store rule]
3. **Correct autofill + keyboard types** (`EmailPasswordFields.js:34-38,57-60`) —
   the mobile-optimisation that lifts completion ~40%. [Authgear]
4. **Strong error recovery**: unknown-account → offer create; confirmed-email
   handled distinctly. Better than the bounce-back-to-same-error pattern.
5. **"No subscription required"** reduces payment anxiety (when legible).

### Where Volyume lags
1. **Free signup mis-routed to Sign In** (#1) — a self-inflicted friction the
   competitors don't have; new users should land where they can act.
2. **No reassurance for Free signups** (#2) — the "why an account" prompt is
   Pro-only.
3. **Faint trust line** (#3) — the best reassurance message is the least visible.
4. **Email-confirmation round trip** — friction relative to magic-link / auto-
   sign-in flows (flagged, architecture-level).

### Critical gaps
- None catastrophic. The Free-intent mis-route is the most material (it makes the
  Free path feel second-class from the first tap, continuing the Item 1 theme).

### User-sentiment gaps
- Users reward fast, social-first, low-field signup (Volyume delivers) and resent
  email-confirmation round trips (Volyume has one — flagged).

---

## STEP D — PROPOSAL

### Summary
Keep the (genuinely best-in-class) form. Fix the Free path so a new Free user
lands on Create Account with the same reassurance Pro gets, and make the trust
line legible. Small, mostly one-line changes. Email-confirmation flow is flagged
for a separate decision, not changed here.

### Specific changes — one by one

**1. Route any signup intent to Create Account. [Code] — `LoginScreen.js:45-46`**
- What: extend the signup-mode trigger to include `intent === 'free_signup'`
  (generalise to any `*_signup` intent), so a user arriving from either Welcome
  CTA starts on the create-account form.
- Evidence: Welcome sends `free_signup` (`WelcomeScreen.js:49`); landing a new
  user on sign-in is needless friction. Continues the Item 1 Free-parity theme.
- Touches: one condition (code).

**2. Show the reassurance prompt for every create-account view. [Code/copy] — `LoginScreen.js:277`**
- What: change the gate from `promptSignup && !isSignIn` to `!isSignIn` so the
  backup prompt shows whenever the user is creating an account (Free or Pro,
  arrived-or-switched). Lightly refine the copy so it reads right for someone who
  has nothing logged yet.
- Evidence: new Free accounts currently get no "why an account" reassurance;
  reassurance at the point of commitment reduces abandonment. [Corbado; Authgear]
- Touches: gate (code) + copy.

**3. Make the trust line legible. [Design] — `LoginScreen.js:461-465`**
- What: `betaNote` colour `colors.textDisabled` → `colors.textMuted`.
- Evidence: it is a payment-anxiety reducer; the faintest token undersells it.
- Touches: one style value.

**4. (Minor, optional) Touch-target sizes. [Design] — mode switch (`:408-412`), forgot (`:395-398`)**
- What: ensure ≥44pt tappable height (add `minHeight`/`hitSlop`).
- Evidence: iOS HIG / Material minimum target. Low priority.

**5. (Flagged, not proposed) Email-confirmation round trip (`:121-125`).** Moving
to a magic link, auto-confirm, or auto-sign-in-on-confirm-deep-link would remove
a known friction point, but it is an auth-architecture + security decision. Raise
as its own item; do not change in this pass.

### COPY CHANGES
Current (`:280-282`): "Create a free account to keep your plan, workouts, and progress safe. If you lose or change your phone, everything restores instantly."
Proposed: "A free account keeps your training and progress backed up and synced. Change or lose your phone and everything restores instantly."

(No other copy changes; "No subscription required" text stays, only its colour changes.)

### What to keep (with evidence)
- Email + password only, single password, no confirm-password, show/hide toggle
  (the ~56% confirm-password conversion finding; ≤5 fields → ~50%). [Authgear]
- OAuth-first ordering + Apple-on-iOS compliance (≈45% abandonment reduction).
- Autofill hints + keyboard types (≈40% completion lift).
- The unknown-account → Create-account recovery alert and the distinct
  email-not-confirmed handling (AUTH-6).
- Brand block, decorative wordmark, divider, and the overall hierarchy.

### IMPACT / EFFORT
- **Impact: High** for change 1 (every new Free user currently lands on the wrong
  form); Medium for 2; Low for 3-4.
- **Effort: Low** — two small code conditions, one copy refinement, one colour
  value (optional minor touch-target tweak).

### SOURCES
- Authgear — Login & Signup UX 2025 guide: https://www.authgear.com/post/login-signup-ux-guide/
- Authgear — Sign-up form best practices: https://www.authgear.com/post/sign-up-form-best-practices/
- abtasty — Best practices for sign-up forms: https://www.abtasty.com/blog/best-practices-sign-up-forms/
- ParallelDevs — Mobile sign-up form UX: https://www.paralleldevs.com/blog/ux-best-practices-creating-sign-forms-mobile-apps/
- Corbado — Login friction kills conversion: https://www.corbado.com/blog/login-friction-kills-conversion
- Quora — email confirmation friction (anecdotal sentiment): https://www.quora.com/Why-does-Reddit-trick-users-into-giving-their-email-address-during-the-sign-up-process
- Apple HIG — Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding

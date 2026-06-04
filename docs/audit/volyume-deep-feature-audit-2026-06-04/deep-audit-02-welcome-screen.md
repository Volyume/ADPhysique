# Deep Feature Audit — Item 1: Welcome screen (tier selection)

**Document:** deep-audit-02-welcome-screen.md
**Item:** 1 of master inventory (Group 1, core flows — first screen of FL1)
**Screen:** `src/screens/WelcomeScreen.js`
**Status:** IMPLEMENTED (approved 2026-06-04; all four copy changes applied)
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The first screen a new user ever sees. Rendered by `RootNavigator.renderNavigator()`
when `!tier` (no tier chosen yet) — i.e. fresh install or a cleared/abandoned
setup (`RootNavigator.js:947`). It is the tier-selection gate: the user picks
**Pro** or **Free**, and either choice routes to `LoginScreen` to create a real
account (`WelcomeScreen.js:48-50`, `chooseTier`). There is also a "Sign in" link
for returning users.

Structure, top to bottom (`WelcomeScreen.js:52-156`):
1. **Hero** — wordmark image at 150px wide (`:167`) + tagline "Less thinking.
   More lifting." (`:57`).
2. **"Who Volyume is for" disqualifier** (`:60-68`) — an uppercase label plus two
   body paragraphs that describe the ideal user and actively warn off others:
   "If you want a tap-to-log workout app or a calorie counter on its own, there
   are faster ones out there."
3. **Pro card** (`:73-105`) — primary. Amber 1.5px border + amber shadow glow,
   `sparkles` icon, "Pro" title with a filled amber **"Free beta"** badge,
   subtitle "The coach who writes back.", a divider, header "Everything in Free,
   plus:" and four checkmark bullets, and a filled amber **"Go Pro"** CTA.
4. **Free card** (`:108-135`) — secondary. 1px neutral border, `create-outline`
   icon, "Free" title, subtitle "The logbook a coach would write in. Yours
   forever.", four lighter checkmark bullets, and a backup note: "Your data
   stays on your device. Sign up anytime to sync and protect it."
5. **"Already have an account? Sign in"** link (`:139-146`).
6. **Founder note** (`:150-152`): "Built by a lifter, for lifters. Not a generic
   fitness app." (opacity 0.6).

Options/config: exactly two — Pro or Free. Both lead to sign-up. No other state:
this is a pure navigation screen (no loading, empty, or error states; none
needed).

### Design assessment (values cited)
- **Tokens are consistent with the app.** Background `colors.background`
  (`#0D0D0D`), cards `colors.surface` (`#191917`), single amber accent
  `colors.primary` (`#F5A623`), radii from the scale (`radius.xl` = 20 on cards,
  `radius.lg` = 14 on the CTA), spacing from the scale. No off-system values.
- **Hierarchy is deliberate and correct.** Pro is unmistakably primary (amber
  border `:201`, amber shadow `shadowOpacity 0.18` `:204`, top position, filled
  CTA), Free is secondary (neutral border, muted bullets via `type.caption`).
  This matches the "highlight the recommended plan" pricing-UX rule (Step B).
- **Type scale:** proTitle `fontSize.lg` (17) black; bullets `fontSize.sm` (13);
  Free bullets `type.caption` muted; disqualifier body `fontSize.sm` (13)
  `textSecondary`, lineHeight ×1.5 — readable. Tagline `fontSize.sm` muted.
- **Two-card layout, not three.** Avoids the "three-card dashboard" fingerprint
  CLAUDE.md bans. Checkmark bullets here are explicitly sanctioned by CLAUDE.md
  ("Where they earn their keep (Welcome screen tier cards) they're fine").
- **One borderline item:** the Pro card has an amber **shadow glow**
  (`shadowColor: colors.primary`, `:203-207`). CLAUDE.md bans "soft-glow
  backgrounds"; this is a contained card elevation, not a background orb, so it
  reads as acceptable, but it is the one place the screen flirts with the banned
  pattern. Flag, not a defect.
- **Polish:** high. Feels finished and premium. The disqualifier is a
  distinctive, on-brand touch most competitors do not attempt.

### UX and usability assessment
- **Primary action cost:** one tap to choose a tier → `LoginScreen`. Minimal.
- **Touch targets:** both cards are large full-width targets; the sign-in link
  has `hitSlop` (`:142`). Adequate.
- **Feedback:** `activeOpacity={0.88}` on cards. Fine for a nav screen.
- **Copy/tone:** mostly excellent and distinctively human ("Less thinking. More
  lifting.", "The coach who writes back.", the disqualifier). On-voice, no AI
  tells, no cheerleading.
- **The one real defect — copy/behaviour mismatch on the Free card.** The backup
  note says "Your data stays on your device. **Sign up anytime** to sync and
  protect it." (`:131-133`). This describes a local-first, sign-up-later model.
  The app does **not** have that model: `chooseTier('free')` routes straight to
  the sign-up flow (`:48-50`), and `IDENTITY_AND_OWNERSHIP_LOCKED.md` decision 1
  bans anonymous mode entirely (acknowledged in the code comment at `:41-47`).
  So tapping Free demands an account immediately — the user cannot "sign up
  anytime". The copy promises something the flow contradicts. This is a
  trust/clarity defect on the very first screen.
- **Secondary tension — a disqualifier before any value.** "there are faster
  ones out there" (`:66`) actively pushes some users away on screen one, before
  they have experienced anything. Intentional premium positioning, but it sits
  against the gradual-engagement evidence in Step B.
- **No beginner trap** beyond the above; the screen is otherwise self-explanatory.

### Flow assessment
- **Reached:** root, when `!tier`. **Exits:** Pro → Login(`intent: pro_signup`);
  Free → Login(`intent: free_signup`); "Sign in" → Login (no intent). No back
  needed (it is the stack root). No dead ends.

### Integration assessment
- Fully native: theme, voice, amber accent, the wordmark hero matching the
  `SplashScreen`. Consistent with the rest of the app. The only cross-cutting
  dependency is the locked no-anonymous-mode rule, which the Free copy violates
  in spirit (above).

---

## STEP B — COMPETITOR RESEARCH (live web, 2026-06-04)

### How the strongest competitors handle the first screen / tier choice
- **Hevy / Strong (logging-first):** neither forces a tier choice up front. Hevy
  "launched as a free Strong competitor … keeping its core features free", and
  its free plan "includes unlimited workouts, full exercise library, workout
  templates, and volume tracking, making the free experience more complete than
  Strong's or most other apps." Strong is praised for "the cleanest, fastest
  workout logging … tap-to-log interface". Both get the user logging fast; the
  Pro upsell is contextual and later, not a gate. [Vora]
- **MacroFactor (premium, no free tier):** "there isn't (and will never be) a
  free version … MacroFactor is ad-free and focused on creating a premium,
  best-in-class user experience." It offers a 7-day full-feature trial after a
  long onboarding quiz. Users tolerate the hard model *because the product earns
  it*: "MF is awesome. It's better at calorie tracking than any other app on the
  market." [NutriScan]
- **Fitbod (quiz → limited free → paywall):** allows ~3 workouts then locks.
  Complaints: "Loved the first workouts, but once the trial ended, everything
  locked," and users would prefer "a limited but functional free version."
  [Autonomous]

### Industry onboarding/paywall best practice
- **Don't jump from quiz to paywall; recap value first.** "the most common
  mistake … is moving to the paywall before the user has stated a goal or
  experienced any value, asking users to pay for a promise they have not yet
  evaluated"; add a value recap so the user thinks "I see what I'm getting → now
  I decide if it's worth paying for." [dev.to / Airbridge]
- **The first screen should not be a signup.** Gradual engagement: "removing
  onboarding friction can boost Day 1 retention by up to 50%"; "the forced login
  wall is even more deadly" on mobile; trial-first "can drastically reduce your
  app's abandonment rates" (Zocdoc lets users find a doctor before any
  registration); "average 40-60% of users" abandon at first sight when friction
  is high. [Appcues gradual engagement; Corbado; Usability Geek]

### "Choose your plan" UX standards
- Highlight the recommended plan with colour/size; label it; **do not** overwhelm
  with too many plans; allow side-by-side comparison; consider recommending a
  plan based on stated preferences; **avoid dark patterns** (no fake urgency, no
  pre-ticked upsell). [UX Planet; Smart Interface Design Patterns; Appcues]

### Platform standards
- **Apple HIG — Onboarding:** "if onboarding is necessary, provide a flow that's
  fast, fun, and **optional**"; keep it brief (≈three screens max) and let users
  skip; teach by progressive disclosure; ideally people "understand your app …
  simply by experiencing it." [Apple HIG; brilworks summary]

---

## STEP C — COMPARISON

### Where Volyume leads
1. **Honest expectation-setting (the disqualifier).** Almost no competitor tells
   you who the app is *not* for. This is differentiated and matches the
   premium-positioning that works for MacroFactor. Most fitness apps over-promise;
   Volyume filters. (`:60-68`)
2. **Exactly two tiers, recommended one highlighted, clean comparison.** Matches
   the pricing-UX rule (highlight recommended, don't overwhelm). "Everything in
   Free, plus:" is a textbook clear comparison framing. [UX Planet]
3. **Genuinely generous Free tier** (unlimited offline logging, library, PRs,
   plan builder, blocks, full stats — `:13-18`). Directly counters the Fitbod
   "everything locked" complaint and mirrors the Hevy free-tier generosity users
   praise. [Autonomous; Vora]
4. **No dark patterns.** No countdown, no pre-ticked Pro, honest "Free beta"
   badge. Cleaner than the freemium-pressure tactics flagged as harmful. [Appcues]
5. **Distinctive brand voice and premium polish** — stronger first impression
   than the generic competitor welcome screens.

### Where Volyume lags
1. **Forced sign-up before any value.** Both CTAs route to account creation
   (`:48-50`); the locked no-anonymous rule means there is no "try first."
   Hevy/Strong let you log immediately, and the gradual-engagement evidence is
   clear that a first-screen signup wall raises first-sight abandonment (40-60%
   range cited). Volyume cannot remove the wall (locked), but currently it does
   nothing to *set the expectation* of it.
2. **Misleading Free-card copy** (the Step A defect): "stays on your device. Sign
   up anytime" contradicts the forced-signup reality. No competitor researched
   makes a promise its own flow breaks; this is a self-inflicted trust gap.
3. **Tells rather than shows.** Best practice favours a value taste/preview; the
   screen is all bullets, no glimpse of the product. (Lower priority; larger
   work.)

### Critical gaps
- The only true gap is the **truthfulness gap** between the Free-card copy and
  the no-anonymous-mode reality. Everything else is tension/opportunity, not a
  gap.

### User-sentiment gaps
- Users coming from Hevy/Strong expect to "just start." Volyume's generous Free
  partly satisfies that, but the forced-signup-for-Free undercuts the "start now"
  expectation those users carry. Setting the expectation honestly (it is free,
  no card, ~1 minute) is the in-bounds mitigation.

---

## STEP D — PROPOSAL

### Summary
The screen is strong and largely best-in-class for positioning. The work is
small and almost entirely copy: (1) fix the one misleading line so the Free card
tells the truth about needing an account, (2) set the sign-up expectation up
front so the wall is not a surprise (we cannot remove it — it is locked), and
(3) a decision on the disqualifier's sharpest line. No structural redesign.

### Specific changes — one by one

**1. Fix the Free-card backup note (the misleading line). [Copy] — `WelcomeScreen.js:131-133`**
- What changes: the note that implies local-first / sign-up-later.
- Evidence: contradicts `chooseTier` (`:48-50`) and the locked no-anonymous rule
  (`IDENTITY_AND_OWNERSHIP_LOCKED.md` decision 1; code comment `:41-47`). No
  competitor breaks its own promise on the first screen.
- Touches: copy only.

**2. Set the sign-up expectation near the CTAs. [Copy] — add one muted line under the cards (`~:136`)**
- What changes: add a single honest line so tapping a tier → sign-up is expected,
  not a surprise. Mitigates the abandonment spike the gradual-engagement research
  warns about, within the locked constraint.
- Evidence: Appcues gradual engagement; Corbado login friction (set expectation
  when you cannot remove the wall).
- Touches: copy (+ a small `Text` style reuse).

**3. Tighten the disqualifier's hardest line. [Copy/decision] — `WelcomeScreen.js:65-67`**
- What changes: keep the "Who Volyume is for" block (it is a strength), but
  decide on the line "there are faster ones out there," which can shed
  would-convert users on screen one.
- Options: (a) keep as-is (intentional premium filter — defensible, MacroFactor-
  style); (b) soften to set expectations without sending people to competitors.
- Recommendation: **(b)** — keep the filter, drop the explicit "go use something
  else" nudge on the very first screen.
- Evidence: HIG "experience before commit"; gradual-engagement abandonment data.

**4. (Flagged, not proposed now) Value preview.** A one-glimpse product taste
(e.g. a single screenshot/animation of the weekly read) before or after tier
choice would satisfy "show, don't tell" and HIG "experience it." This is a
larger design/build item; I am flagging it, not proposing it in this copy pass.

### COPY CHANGES
Current (`:131-133`): "Your data stays on your device. Sign up anytime to sync and protect it."
Proposed: "Your free account keeps every session backed up and synced across devices. No card, no ads."

Current (new line, none today): —
Proposed (add under the cards): "Both tiers are a free account. No card. About a minute to set up."

Current (`:66-67`): "If you want a tap-to-log workout app or a calorie counter on its own, there are faster ones out there. Volyume rewards a few weeks of consistent data with adjustments most apps cannot make."
Proposed (option b): "Volyume is built for a few weeks of consistent data: that is when the weekly read earns its place. If you only want a quick tap-to-log or a standalone calorie counter, it is more than you need."

### What to keep (with evidence it works)
- The two-card, Pro-highlighted structure (pricing-UX best practice: highlight
  recommended, only two plans). [UX Planet]
- "Everything in Free, plus:" comparison framing (clear side-by-side). [UX Planet]
- The generous Free bullets (counters the Fitbod lock complaint). [Autonomous]
- The "Free beta" badge honesty and the absence of dark patterns. [Appcues]
- The checkmark bullets here (explicitly sanctioned by CLAUDE.md for Welcome).
- The brand voice, tagline, and the disqualifier *concept*.
- The hierarchy, tokens, and hero.

### IMPACT / EFFORT
- **Impact: High** — it is the first screen, and change 1 removes a trust-eroding
  contradiction; changes 2-3 address the highest-evidence friction (forced-signup
  surprise) within the locked constraint.
- **Effort: Low** — copy-only (one note rewrite, one added line, one paragraph
  edit); no new components, no flow change, no migration.

### SOURCES
- Vora — Best Strength Training Apps 2026 (Hevy/Strong): https://askvora.com/blog/best-strength-training-apps-2026
- NutriScan — MacroFactor cost / no free version: https://nutriscan.app/blog/posts/macrofactor-cost-2026-free-version-29f5edc98b
- Autonomous — Fitbod review (lock complaints): https://www.autonomous.ai/ourblog/fitbod-app-review
- dev.to — Onboarding breakdown, first screen to paywall: https://dev.to/paywallpro/complete-onboarding-breakdown-9-steps-from-first-screen-to-paywall-2j7
- Airbridge — App onboarding before the paywall: https://www.airbridge.io/en/blog/5-steps-app-onboarding-before-the-paywall
- Appcues — Gradual engagement (first screen should not be a signup): https://www.appcues.com/blog/gradual-engagement-mobile-app-first-screen
- Corbado — Login friction kills conversion: https://www.corbado.com/blog/login-friction-kills-conversion
- Usability Geek — First-time use friction: https://usabilitygeek.com/first-time-use-how-to-reduce-initial-friction-of-app-usage/
- UX Planet — Pricing table design best practices: https://uxplanet.org/best-practices-for-pricing-table-design-2d99e46201da
- Smart Interface Design Patterns — Pricing plans UX: https://smart-interface-design-patterns.com/articles/pricing-plans/
- Appcues — Freemium upgrade prompts: https://www.appcues.com/blog/best-freemium-upgrade-prompts
- Apple HIG — Onboarding: https://developer.apple.com/design/human-interface-guidelines/onboarding
- Brilworks — Apple HIG best practices: https://www.brilworks.com/blog/apple-human-interface-guidelines/

# Coverage 05 — First-run emotional quality

Audit date: 2026-07-09. Scope: the emotional arc of a brand-new user's first
session in VOLYUME, from the wordmark moment through Article 9 consent,
onboarding, the first-value reveal, and the transition into daily use on
Home. Read-only; no code changed. This fills the coverage gap the master
index (`00-MASTER-INDEX.md` section 5) named explicitly: *"Onboarding
first-impression / emotional 'wow', brand feel — Real gap... nobody asked
'does this feel like a premium product in the first 60 seconds.'"*

## Method

Read in full, in the order a new user actually hits them:
`src/screens/WelcomeScreen.js` (286 lines), `src/screens/LoginScreen.js` (141),
`src/screens/Article9ConsentScreen.js` (423), `src/screens/FirstRunScreen.js`
(123), `src/screens/FreeStarterScreen.js` (335), `src/screens/
ProOnboardingScreen.js` (2,202, all six steps plus the plan-build sequence),
`src/screens/ProSetupCompleteScreen.js` (610), the relevant slices of
`src/screens/HomeScreen.js` (welcome/orientation card, hero session card, and
both no-plan empty states), `src/navigation/RootNavigator.js`'s routing
priority and `SplashScreen` (its full render), `src/components/
EmptyState.js`, and `src/lib/supabase.js`'s `signInWithGoogle`/
`signInWithApple`. Cross-checked against `docs/COACHING_VOICE_SYNTHESIS_
LOCKED.md` (the three-register model, Stage 1 "cold-start factual" in
particular) and `00-MASTER-INDEX.md` + `04-flow-usability.md` so nothing
below repeats a flow/tap-count/copy-correctness finding already logged
there — this lane is the emotional lens only: does each beat feel warm,
confident, calm and premium, or generic/cold/tedious.

Grepped the same seven first-run screens for AI-tell vocabulary
("unlock your potential", "seamless", "leverage", "journey", "empower",
"delve", "game-changing"), em dashes, and stray exclamation marks in
user-facing `Text` — **zero hits**. That sweep (and lane 01's own AI-tell
audit) is already clean here; this report does not re-litigate copy
correctness, only tone and structure.

## Summary

**5 findings** (FR-1 to FR-5): **0 A, 4 B, 1 C**. Class split: **2 SAFE**
(FR-2 straightforward, FR-3 mostly motion tuning), **1 JUDGEMENT** (FR-1),
**2 GATED** (FR-4, FR-5 — both are tone-only observations on a locked
consent/trial surface; no change to gating, consent substance, or trial
mechanics is proposed).

**Headline finding for this lane:** VOLYUME's first-run flow is
unexpectedly mature. Nearly everything a "world-class Silicon Valley"
onboarding checklist asks for is already built and already warm: an
Endowed-Progress-Effect progress bar, honest staged "building your plan"
copy tied to real work, a personalised completion reveal with a receipt
line built only from what the engine actually used, a genuinely crafted
splash animation, and zero AI-tell vocabulary anywhere in the path. The
gaps that remain are narrow and specific, not systemic — see below.

---

## Findings

### FR-1 — Free-tier onboarding completion has no equivalent celebratory reveal
**Severity: B — Class: JUDGEMENT**

`src/screens/FreeStarterScreen.js:96-112` (`handleStartPlan`): on success it
copies the plan, activates it, calls `completeFirstRun()` and the user is
simply in `MainTabs`. No haptic, no staged reveal, no personalisation
receipt — the only feedback that anything happened is the screen changing.

Compare `src/screens/ProSetupCompleteScreen.js:31-149`: a personalised
headline ("You're all set, {firstName}"), a receipt line built only from
inputs the engine acted on (`getSetupReceiptLine`, :158-162), a staged
`FadeInDown` reveal so the page settles block-by-block instead of appearing
at once (`stage()`, :114-115), macro/calorie visuals matching the Nutrition
tab's own shape, a named first-check-in date instead of a vague "end of your
training week" (:404-425), and one calm success haptic marking the moment
(`planReady()`, :103-108).

Free and Pro onboarding necessarily differ in content (Free has no nutrition
targets to show), but the **presentation warmth gap is a choice, not a
consequence of the tier boundary** — a staged reveal, a haptic, and a
one-line "here's what's ready" summary for the Free starter plan would not
expose any Pro feature to a Free user (CLAUDE.md's Free/Pro gating rule
governs feature access, not presentation polish). Today, a Free user's
"you're set up" moment is measurably flatter than a Pro user's, even though
both just finished the same emotional labour (three questions, one CTA).

**Proposed change:** give `FreeStarterScreen`'s success path its own small
completion beat — a one-second staged reveal of the chosen plan's name/days,
a completion haptic parity with `planReady()`, and a line naming what's
ready ("Your first session is waiting on Home"). Founder call because it's
a design-investment decision (new component/state), not a mechanical fix.

### FR-2 — Raw provider/SDK auth error text can surface at the very first touchpoint
**Severity: B — Class: SAFE**

`src/screens/LoginScreen.js:41`: `toast.show(result.error.message ||
'Sign-in failed', { variant: 'error' })`. `src/screens/
ProOnboardingScreen.js:566`: `appAlert('Sign-in failed',
result.error.message)`. Both pass the raw `error.message` from
`src/lib/supabase.js` straight to the user with no rewrite. That function
returns provider/SDK text verbatim on several paths — `src/lib/
supabase.js:228,281` forward the Supabase/GoTrue `error` object unedited,
and :235,288 fall back to the native SDK's own `e?.message` ("Google sign-in
failed." is the only in-house fallback; anything the SDK actually throws
goes straight through).

This is the exact "raw error slugs interpolated into user toasts" pattern
lane 01 already flagged and rated SAFE at three other sites (L01-B35), just
not caught at the two earliest ones — sign-in, which for most new users is
literally the first thing they tap in the entire app. A user whose very
first interaction produces a technical GoTrue/native-SDK string (rather
than a calm human sentence) gets the coldest possible opening impression,
directly contradicting the locked voice doc's "no inferred jargon, plain
language" standard.

**Proposed change:** in both call sites, always show one calm fallback
sentence (e.g. "That didn't go through. Try again.") and keep the existing
`logError` call as the place the raw message actually goes — matching the
fix pattern already approved for L01-B35's three sites.

### FR-3 — The wordmark moment is more crafted in the screen you don't get to look at
**Severity: C — Class: JUDGEMENT**

The genuinely well-built "wordmark moment" is `RootNavigator.js:1469-1557`'s
`SplashScreen`: a staggered sequence (hero scale-back-ease + fade, wordmark
fade-up, an accent-bar sweep, then the tagline), all inside `SPLASH_MIN_MS`
= 1,600ms (`:708`). It is well-crafted, but it is also gone before most
users register more than "something animated."

The screen the user actually sits on and reads — `WelcomeScreen.js` — treats
its own hero image and the pricing cards below it as one flat block:
`fadeIn`/`slideUp` (:46-56) is a single shared pair of Animated.Values
applied to both `styles.hero` (:75-78) and `styles.cards` (:80-93). There is
no equivalent of `ProSetupCompleteScreen`'s per-block `stage()` delay
(:114-115) to let the logo land a beat before the cards, even though that
exact staggering technique is already proven elsewhere in the same flow two
screens later.

**Proposed change:** give `WelcomeScreen`'s hero (logo + tagline) its own
lead-in delay ahead of the cards, reusing the `stage()`/delayed-Animated
pattern `ProSetupCompleteScreen` already has, so the wordmark gets a beat of
its own on the one screen where the user has time to actually see it. Small,
non-textual, no locked surface touched — flagged JUDGEMENT only because it's
a motion-design call, not because it's risky.

### FR-4 — "Required" pill lands right after the user has disclosed sensitive body data
**Severity: B — Class: GATED (tone only; no change to consent/onboarding gating proposed)**

`ProOnboardingScreen.js:1750-1751` and `:1794-1795`: the morning-weight and
weekly-check-in reminder rows on the final onboarding step each carry a
`requiredPill` reading "Required". This lands immediately after Step 3
("Add your starting body composition" — body-fat%, an ED-adjacent
disclosure the copy elsewhere is careful to keep optional and pressure-free,
:1302-1310) and Step 2's weight/height collection. The pill itself is styled
calmly (primary-tinted, not alarm-red — `:2124-2128`), and it is factually
accurate: these two reminders can't be turned off from this screen. But
"Required" is an administrative/compliance word dropped onto a screen whose
subject is a daily weigh-in, at the one moment in the flow where a softer
register would cost nothing.

**Proposed change (tone only, pending a founder decision since this is
onboarding copy):** replace "Required" with a phrase that still conveys the
same fact without the compliance register — e.g. "Part of your coaching" or
"Set with your plan" — while leaving the underlying behaviour, the fields it
gates, and the onboarding-enforcement rule entirely untouched. No weakening
of anything is proposed; this is wording only.

### FR-5 — The 14-day trial starts in complete silence, and it's the biggest missed positive beat in the whole arc
**Severity: B — Class: GATED (cross-references L08-A5; tone angle only)**

`Article9ConsentScreen.js:127-139` calls `cascade.startCascade()` the
instant `Continue` is tapped — this is the actual moment a new user's
14-day Pro trial begins. Nothing on screen marks it: the screen simply
unmounts into the splash gate or onboarding. `00-MASTER-INDEX.md`'s L08-A5
already flags this from the funnel/legal angle ("no toast/banner at the
consent moment that starts the clock"). From the emotional-arc lens it
matters for a different reason: this is the exact point in the journey
where a user has just finished reading a dense, necessarily sober consent
screen (correctly Stage-1-cold per the locked voice doc — see Strengths
below) and ticked a box. The very next real event — a trial actually
starting — earns zero acknowledgement, positive or neutral, before the
wizard's own genuine high point (`ProSetupCompleteScreen`'s "You're all set")
five screens later. The arc has a flat stretch exactly where a small,
honest "your 14 days start now" note would cost nothing and reads as the
app noticing the user, not narrating at them.

**Proposed change:** fold into whichever L08-A5 fix the founder selects; do
not resolve independently of that decision (both sit on the same
consent/trial-start line and the founder should see them as one surface,
not two separate patches).

---

## Already emotionally strong (no change proposed)

- **Article 9 consent screen's tone is correctly calibrated, not cold by
  accident.** The locked voice doc's own Stage 1 ("cold-start factual")
  register explicitly bans warmth here — "warmth reads as marketing or
  patronising" — and `Article9ConsentScreen.js` honours that: plain,
  factual, no false friendliness, and the ED-safety line itself
  ("Volyume checks your weight trend, energy, and food logs together for
  signs of under-fuelling or disordered eating... it pauses your calorie
  changes and points you to support," :196-199) is stated matter-of-factly
  with no alarm language — exactly the calm/non-triggering bar this lane's
  brief asked for. The "What if I don't agree?" disclosure (:247-291) is a
  genuine trust-builder: a hesitant user's only alternative used to be
  killing the app.
- **`SplashScreen` (`RootNavigator.js:1469-1557`) is a genuinely crafted
  wordmark moment** — staggered hero scale-back-ease, wordmark fade-up, an
  accent-bar sweep, then the tagline, all Reduce-Motion aware.
- **`ProOnboardingScreen`'s wizard psychology is deliberate and it shows:**
  the Endowed Progress Effect on the bar (opens at 12% instead of 0%,
  `:198-209`), a per-step "This step sets" outcome preview
  (`STEP_OUTCOMES`, :65-93), and the four-stage "Building your first plan"
  sequence (:680-728, rendered :1646-1693) that is honestly tied to real
  `_generatePlanInner` phases and aborts instantly on failure rather than
  faking completion.
- **`ProSetupCompleteScreen` is the standout screen of the whole app for
  this brief** — a personalised, staged, receipt-driven reveal that makes
  the user feel seen rather than processed (see FR-1 for where its bar
  isn't yet matched elsewhere).
- **Body-composition disclosure is explicitly optional and pressure-free**
  ("An honest estimate sharpens your first plan. Skip this if you are not
  sure," `ProOnboardingScreen.js:1303`) — a good ED-safety-adjacent tone
  call at a point where many competitor apps push a mandatory, higher-
  pressure ask.
- **`FreeStarterScreen`'s reassurance footnote** — "The first couple of
  weeks are for learning the movements. That counts as progress" (:212-214)
  — is a well-judged line that defuses early-stall anxiety before it starts.
- **Zero AI-tells anywhere in the path**: no em dashes, no exclamation
  marks in user-facing copy, none of the standard AI-generic vocabulary,
  across all seven screens read for this lane.
- **`HomeScreen`'s first-run orientation card and empty states** (already
  confirmed by lane 04, re-verified here through the emotional lens): the
  "Welcome to Volyume" card is instructional only, gated cleanly on
  `totalSessions === 0`, dismissible, and never duplicates the CTA below
  it; both the Free and Pro no-plan empty states name a next step in a
  reassuring voice with no dead ends.

## SAFE quick wins

- **FR-2** — stop passing raw provider/SDK error text to the user at the
  two earliest auth touchpoints (`LoginScreen.js:41`,
  `ProOnboardingScreen.js:566`); always show one calm fallback sentence,
  keep `logError` as-is.

## Needs a decision

- **FR-1** — founder call on investing in a Free-tier completion beat
  (staged reveal + haptic + one summary line) to close the warmth gap with
  Pro's `ProSetupCompleteScreen`. Not gated (no Pro feature exposed to
  Free), but a real design-investment choice.
- **FR-3** — motion-design call: give `WelcomeScreen`'s hero its own lead-in
  beat ahead of the cards below it, reusing the staggering technique
  `ProSetupCompleteScreen` already proves works.
- **FR-4** — GATED (onboarding copy): soften "Required" pill wording on the
  two reminder rows at the final onboarding step. Tone only; no field,
  gate, or enforcement change proposed.
- **FR-5** — GATED (consent/trial screen copy): fold into the L08-A5
  decision already queued in the master index rather than resolving
  separately — present the founder with one combined "what happens the
  moment Continue is tapped on Article 9" question, not two.

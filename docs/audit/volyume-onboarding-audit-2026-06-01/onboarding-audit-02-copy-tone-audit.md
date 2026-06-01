Status: COMPLETE | Timestamp: 2026-06-01 | Phase 2: Copy and tone

# Copy and tone audit

Assessed against the house voice: plain spoken, short sentences, British
English, no em dashes, no AI tells, no cheerleading, sits alongside coaches
not above them. Most of the existing copy is already strong and on-voice. The
problems are concentrated, not pervasive.

## What is already good

- Welcome qualifier block (`WelcomeScreen.js:60-67`). "If you want a
  tap-to-log workout app or a calorie counter on its own, there are faster
  ones out there." Honest, confident, no hype. Keep it.
- Founder note on setup-complete (`ProSetupCompleteScreen.js:276-286`). Plain,
  personal, credible. Keep it.
- Step hints in onboarding ("Be honest. It adjusts to protect you.",
  `ProOnboardingScreen.js:1022`). Good: explains why a question is asked
  without a tutorial voice.
- Steps rationale ("the first thing the coach leans on when progress slows,
  before it touches your food", `:1124`). Clear, specific, no jargon.

## Onboarding copy, issues

1. Stale internal framing leaks toward the user. Step 3's "What are you
   focused on right now?" is commented as driving "weak-point spec"
   (`:963-965`), and the phase list still offers "Bring up a weak point"
   (`coachingGoals.js:201-208`) whose detail reads "Priority muscles get
   MAV-level volume; everything else drops to maintenance." In onboarding there
   is no muscle picker, so this promise is only half-true: a user who picks it
   gets a generic side-delts-and-biceps weak-point day, not the muscles they
   care about. The copy writes a cheque the onboarding flow does not cash.

2. "This shapes your entire plan." (`:924`) overstates, given days per week is
   silently fixed at 4 and weak points are not collected. The plan is shaped by
   fewer answers than the user is told.

3. Two different time estimates. Step 2 says "about two minutes" (`:716`),
   Step 3 says "about 30 seconds" (`:924`). Minor, but they read as
   copy-by-committee. Pick one honest per-step estimate or drop them.

4. The optional division question hint is good but buried. "Only if you're
   chasing a competitive physique." (`:980`) is the clearest single line about
   what division does, yet it sits under a dropdown most users will skip. The
   division choice is where the app earns its "different calibre" claim; the
   copy hides it.

## Plan builder copy, issues

5. The builder header is "Update your plan." (`:288`) and the CTA is "Rebuild
   my plan." (`:575`). Both are correct and appropriately returning-user. Good.

6. Weak-point copy promises a bias that often does not happen. "Muscles you
   want to bring up. Your plan biases extra volume towards them."
   (`:351-353`). True only when the phase is "Bring up a weak point"
   (`planEngine.js:173`). A user on Bulk or Cut who picks three muscles is told
   their plan will bias toward them, and it will not. This is the single most
   important copy-versus-behaviour mismatch in either flow. The "always-on
   division bias" decision fixes the behaviour; the copy should then read
   honestly for both cases (small always, larger on the weak-point phase).

7. The division/`coachingNote` is never shown in the builder. Each goal has a
   one-line judging note (for example bikini, "Judged on glute shape, hamstring
   development, conditioning and overall flow.", `coachingGoals.js:74`) that
   would tell a returning user exactly what changing division does. It is
   defined and unused on this screen.

## Cross-flow consistency

8. Same concept, different words. Onboarding labels the schedule question
   nothing (it is not asked); the builder calls it "Training days per week"
   (`:432`). Onboarding calls equipment "Equipment" with hint "What do you have
   access to?" (`:955-956`); the builder uses "Equipment" with "What you have
   access to. Exercise selection adapts to the kit available." (`:471-472`).
   These should be one shared string per concept so the two flows read as one
   product.

9. The phase question is worded identically in both ("What are you focused on
   right now?"), which is good and should be the template for the rest.

## ED-safety and tone (locked constraints)

- No cheerleading anywhere in either flow. Confirmed. The setup-complete
  screen reports facts, it does not congratulate. Keep this through any new
  weak-point copy: "Your plan puts more work here" not "Great choice, let's
  bring up those delts."
- Adherence-neutral framing must extend to weak points. Describe what the plan
  does, not what the user should feel about it.

## Recommended copy fixes (summary, full strings in Phase 6)

- Rewrite the weak-point selector copy for the always-on model so it is true
  on every phase.
- Surface each division's judging note when a division is selected, in both
  flows, one short line.
- Make the schedule, equipment, experience, recovery and phase strings shared
  constants so both flows match word for word.
- Settle a single per-step time estimate, or remove estimates.
- Soften "This shapes your entire plan." to a claim onboarding can keep once
  days and weak points are added to it.

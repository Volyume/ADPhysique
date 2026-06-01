# Onboarding Audit 05 — Research

Status: COMPLETE (Phase 5 of 7)
Date: 2026-06-01
Method: fresh web research, June 2026. Findings below are mapped to the Volyume
decisions they inform. Sources listed at the end.

---

## 1. What the best fitness onboarding flows do

- **Personalisation that visibly changes the product lifts first-month
  retention materially.** The flow should ask only what changes the experience,
  and the user should see that change. (UXCam, VWO, Adapty.)
- **Speed wins. Users abandon past 3 to 5 steps and decide within ~20
  seconds.** The first session should end at a product, not an empty home.
  (Adapty, Glance, designstudiouiux.)
- **Explain why each question is asked.** Health apps that justify each field
  convert higher, and "this takes 3 minutes, you can come back" reduces
  abandonment in regulated contexts. (VWO, WorkBright.)
- **Frame fitness questions without judgement.** "What do you enjoy?" beats "how
  unfit are you?". (Glance, weareaffective.)
- **Show a quick win.** A guaranteed first-day success and visible progress
  early. (designstudiouiux.)

Read against Volyume: the wizard already explains "why" well (the strongest
thing it does) and already ends at a product (the reveal plus an auto-generated
plan). It is, however, longer than the 3 to 5 step guideline once the duplicate
account step and the consent interruption are counted, and the "quick win" is
diluted by sending the user to a competitor app for food (doc 04, F0).

## 2. Plan creation and re-enrolment for existing users

- **Smart defaults / pre-population, always overridable.** Pre-select from what
  is known, let the user change anything, keep them in control. (NN/g, Appcues,
  Userpilot.)
- **Defeat the blank page.** Templates, sample data, prior selections lower the
  barrier for a returning user starting again. (Appcues.)
- **Onboarding is lifecycle, not first-run.** Existing users are re-onboarded
  on new features and on re-enrolment, with a lighter, familiar flow. (NN/g.)

Read against Volyume: `ProGoalSetup` already pre-populates from `userProfile`
and is correctly lighter than onboarding. The gaps are reachability (it is
hidden unless Pro + active plan) and consistency (it looks nothing like the
wizard, doc 03 D1/D2).

## 3. Communicating expertise without overload

- **Credibility is clarity, not jargon.** Summaries, plain analogies, visible
  method beat flaunted terminology. Users distrust apps that "sell with
  science" but cannot back it. (AAAS, app-quality-claims study.)
- **Show the mechanism once, plainly, then get out of the way.** Recognisable,
  honest method markers raise perceived credibility. (MIT QSS.)

Read against Volyume: the "Why this plan, for you" rationale on the reveal and
the per-question hints are exactly this pattern done well. The risk is the
opposite, hard terms leaking in ("MAV-level volume", doc 02), and product terms
used before being defined ("Precision Coaching").

## 4. Progressive disclosure and flow length

- **Target 3 to 5 screens, 1 to 2 questions that visibly personalise, a
  meaningful action inside 60 seconds.** (Glance, Gravatar.)
- **Reveal advanced controls in context, after the first session,** not up
  front. (Pendo, LogRocket, Userpilot.)
- **Fitness is an exception that needs more inputs** (goal, level, schedule,
  equipment, constraints), so the craft is sequencing and justifying them, not
  cutting them. (weareaffective.)

Read against Volyume: this supports the current "collect what shapes the plan,
justify each" approach, and supports deferring days-per-week and protein into
the flow rather than hiding them, while pushing food-logging mechanics into
in-context learning on the Eat tab rather than a pre-emptive explainer that
points elsewhere.

---

## Implications for the proposal (doc 06)

1. Keep and extend the "explain why" pattern, it is Volyume's research-backed
   strength.
2. Cut the duplicate account step and smooth the consent interruption to get
   back under the 3 to 5 step guideline.
3. Introduce the Eat logger as the food path, in context, and delete the
   MyFitnessPal instruction. The quick win is "log one thing in Eat", not "go
   download another app".
4. State the weight-trend-first model plainly once: the user's job is weigh in
   and check in, food logging sharpens it.
5. Pre-populate the builder (already done) and make it reachable and visually
   consistent with onboarding.

---

## Sources

- https://uxcam.com/blog/10-apps-with-great-user-onboarding/
- https://vwo.com/blog/mobile-app-onboarding-guide/
- https://adapty.io/blog/how-to-fix-your-onboarding-flow/
- https://adapty.io/blog/mobile-app-onboarding/
- https://www.nngroup.com/articles/mobile-app-onboarding/
- https://www.appcues.com/blog/essential-guide-mobile-user-onboarding-ui-ux
- https://userpilot.com/blog/progressive-disclosure-examples/
- https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/
- https://www.pendo.io/pendo-blog/onboarding-progressive-disclosure/
- https://thisisglance.com/learning-centre/how-long-should-my-apps-onboarding-process-be
- https://blog.gravatar.com/2024/09/03/app-onboarding/
- https://www.designstudiouiux.com/blog/mobile-app-onboarding-best-practices/
- https://weareaffective.com/learning-centre/what-are-the-best-onboarding-practices-for-different-types-of-apps
- https://www.aaas.org/programs/public-engagement/communicating-science-online
- https://direct.mit.edu/qss/article/2/3/845/107044
- https://workbright.com/blog/the-ultimate-guide-to-online-onboarding-forms-on-mobile/

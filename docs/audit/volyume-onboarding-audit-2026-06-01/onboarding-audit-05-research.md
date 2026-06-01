Status: CURRENT (post-rebuild, unchanged) | 2026-06-01

REFRESH NOTE. This is external onboarding research (best-in-class flows,
specialisation UX, progressive disclosure). It is independent of the engine
rebuild and remains current; no update needed. It underpins the beginner
"Not sure" default and the experience gating in doc 06.

# Onboarding and plan-builder research

Live web research as of 1 June 2026, for the Volyume onboarding and
plan-builder audit. Every claim is cited inline with its URL. This
document is self-contained: you should not need to open another file
to act on it.

A note on what "onboarding" means here. Two distinct schools show up
in the research and they pull in opposite directions:

- The consumer-subscription school (Noom, BetterMe, Simple). Long
  quiz funnels, often 100 plus screens, tuned to sell a subscription
  at the end. Completion is high because the user has already paid
  with attention and feels the plan is theirs.
- The activation school (Duolingo, MacroFactor, Oura). Short, get to
  the first useful moment fast, defer everything that can wait.

Both work. They work for different reasons and at different points in
the funnel. The sections below keep the two straight, because copying
Noom's 113 screens into an activation context is how you build a
funnel that converts trial-buyers and loses lifters.

---

## 1. Best-in-class onboarding flows

### Future (human coaching, premium)

Future opens with a short sign-up quiz about goals and experience,
then matches you to two or three coaches. You can also browse coach
bios and pick yourself. After picking, you have a FaceTime meet and
greet to talk through goals and fitness level. Trust is carried by
the coaches, not the UI: over 80% of coaches have trained pro,
collegiate or Olympic athletes, and 95% plus hold an exercise-science
degree. A physical welcome kit (handwritten card from the coach, water
bottle, leased Apple Watch) lands the relationship. The coach then
texts every morning and adjusts the programme around travel or
illness.
Source: https://www.sypnotix.com/reviews/future-app-review
Source: https://future.co/

Lesson for Volyume: Future defers almost all programme depth to the
coach conversation. The app's job at onboarding is matching and
trust, not extracting twenty preferences. The credential stats are
concrete and verifiable, which is why they read as real rather than
as marketing.

### Caliber (science-led, free tier plus coaching)

Caliber runs a long, thorough quiz: current fitness level, strength
training experience, available equipment and more. The length is
defended by framing each question as needed to build a genuinely
personalised plan. After the quiz you get a one-on-one intro with a
coach. The free tier is generous: unlimited workouts, 600 plus
exercises, exercise tutorials. The proprietary "Strength Score" rates
your strength relative to your potential for your age and sex, which
gives the user a single number to anchor on and progress against.
Source: https://barbend.com/caliber-fitness-app-review/
Source: https://apps.apple.com/us/app/caliber-strength-training/id1482405410

Lesson: a long quiz survives if every question visibly feeds the
output, and if there is a payoff artefact at the end (the Strength
Score). Length without a visible payoff is where abandonment lives.

### MacroFactor (nutrition, expert-respected)

A setup wizard produces a coached programme from goals and
preferences. It estimates energy needs with a standard TDEE formula
from demographics, body data and lifestyle, then states plainly that
this first estimate may be well off and will be refined after two to
four weeks of logging. On a coached programme the user just checks in
weekly and follows the adjustments.
Source: https://macrofactor.com/welcome/
Source: https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low

Lesson: MacroFactor is honest that the day-one plan is a first
estimate, not a verdict. That honesty lowers the stakes of the
onboarding answers, which reduces the paralysis that makes people
abandon. The real personalisation happens from logged data, not from
the quiz.

### Whoop (wearable, recovery)

Connect the band over Bluetooth, then a profile-creation flow asks
about goals and interests, followed by a step-by-step walkthrough of
how to wear the band and use the app. Recent versions front the AI
assistant during onboarding to learn what the member wants. The
evaluation work stresses that words, pacing and structure in
onboarding set expectations for how supportive and reliable the
product feels later: onboarding is a relationship-building moment, not
just a UI flow.
Source: https://everydayindustries.com/whoop-wearable-health-fitness-user-experience-evaluation/
Source: https://mobbin.com/explore/flows/06390f2f-8598-4b94-88f5-0bcb7b65ece4

### Oura (wearable, sleep and readiness)

Ring-to-app connection takes about ten minutes. The flow asks which
areas the user wants to focus on (being more present, athletic
performance and so on), how sleep is right now, and what affects it,
building a qualitative picture. Educational modules explain the
biometrics and scores. Reviewers liked the short onboarding and the
focus-area question. The criticisms are sharp and useful: the setup
did not prepare people for how to actually use the app day to day, and
interpreting the key metrics needed clearer guidance. Suggested fixes
were to cut setup steps, keep excitement up across touchpoints, and
personalise the guidance.
Source: https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/
Source: https://ouraring.com/blog/get-started/

Lesson: asking for a focus area early is a light, high-value
personalisation move. But teaching people to read the output cannot be
skipped, and Oura got dinged for skipping it. That maps directly to a
weak-point or specialisation feature: picking the focus is easy,
understanding what the app then does with it is the hard part.

### Duolingo (habit, gold standard for activation)

Duolingo inverted the usual order: use the product first, sign up
later. It nudges sign-up but does not force it until you finish a
lesson and want to save progress. Up front it asks a couple of light
questions, a goal and a motivation, then drops you into a lesson with
the mascot. The team has called the use-first inversion one of the
highest-impact retention changes it has made.
Source: https://goodux.appcues.com/blog/duolingo-user-onboarding
Source: https://userguiding.com/blog/duolingo-onboarding-ux

Reported results from the enhanced onboarding: first-week churn down
47%, users completing their first week up 30%, satisfaction up 15%.
Treat these as case-study figures, widely cited but not from a
controlled public study.
Source: https://medium.com/@nwobodoprincess4/case-study-enhancing-user-onboarding-for-duolingo-e7b311d85269
Source: https://medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020

Lesson: the single biggest lever is letting the user feel value before
asking for commitment. For Volyume, the equivalent of "do a lesson
before sign-up" is "see a real generated session, or a plausible plan
preview, before being asked to commit to setup".

### Noom (consumer subscription, long-funnel school)

Noom's web-to-app funnel is 113 screens and takes a typical user up to
15 minutes, with roughly 10 minutes of psychology quiz. After health
questions it runs a behavioural profile quiz using sliders between two
statements across about 10 questions, and at one point asks ten
four-option questions framed as creating 262,144 possible
combinations. The funnel uses loading bars and data visualisations
(reported to lift conversion 10 to 20%), and "processing theatre":
every few screens it updates the projected goal date so the user sees
their input mattering. The point of the behavioural quiz is emotional
buy-in and high perceived value, not just data capture.
Source: https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/
Source: https://web2appworld.com/breakdowns/noom/
Source: https://www.retention.blog/p/the-longest-onboarding-ever

Lesson and warning: Noom's length is a sales mechanic. It works
because each answer feels like it personalises the pitch, and because
sunk-cost attention makes the paywall easier to accept. It is the
wrong template for the part of Volyume that an already-paying or
already-committed lifter touches. Borrow the mechanics (visible
progress, a projected outcome that moves with input, framing answers
as personalisation) and reject the raw length.

### Headspace (wellness)

Narrative welcome screens set expectations, the product identifies
user attributes early, then guides the user straight into a first
three-to-five-minute meditation. The calm tone of the onboarding
matches the product's whole proposition.
Source: https://tearthemdown.medium.com/product-teardown-headspace-user-onboarding-personalisation-b6effd0df1d7

Lesson: onboarding tone should match product tone. For Volyume that
means plain, factual, no encouragement the user did not ask for. The
onboarding voice is the product voice.

### Fitbod (adaptive strength, added)

Fitbod's generation pulls from goal, experience level, available
equipment, training split, session duration, warm-ups and cooldowns,
logged history, exercise variability and supersets/circuits. It scores
each muscle group 0 to 100% on recovery (muscles take up to about
seven days), prioritises fresher muscles, and shifts volume away from
recently hammered groups. It rotates movements to balance weak points,
analysing every logged set to adjust future sessions.
Source: https://fitbod.me/blog/how-fitbod-personalizes-your-workout-plan-using-smart-training-algorithms/
Source: https://fitbod.me/blog/fitbod-algorithm/

### Hevy (logging-first, added)

Hevy Trainer's onboarding asks experience level, goal, equipment,
workout frequency, duration, and an extra-focus selection on chosen
muscle groups. Meaningful personalisation, narrower than Fitbod's
stack. Strong and Hevy otherwise leave programming to the user, so
they are less recovery-aware by design.
Source: https://fitbod.me/blog/fitbod-vs-hevy-9-reasons-fitbod-beats-hevy/
Source: https://www.findyouredge.app/news/best-strength-training-apps-2026

Lesson: Hevy already ships the exact pattern Volyume needs for weak
points: an "extra focus on these muscle groups" step inside
onboarding. The differentiator is not having the step, it is what the
app credibly does with it afterwards (Fitbod's recovery and balancing
logic) and how it is explained.

### Common abandonment drivers across the set

- Friction at the start. 74% of potential users abandon an app if they
  hit friction early, and around 90% of users abandon apps within the
  first week.
  Source: https://vwo.com/blog/mobile-app-onboarding-guide/
- Length with no visible payoff. Users will answer five or six
  questions if the output is obviously personalised to them. The
  payoff has to be visible, not promised.
  Source: https://blog.funnelfox.com/health-fitness-app-growth-playbook-expert-talk-recap/
- No "save and come back". Telling users a step takes a set time and
  that they can resume later cuts abandonment.
  Source: https://blog.funnelfox.com/health-fitness-app-growth-playbook-expert-talk-recap/

---

## 2. Plan-builder and re-enrolment for existing users

There is little named UX literature for "new plan for an existing
lifter" specifically, so this section combines the strength-app
patterns above with the smart-defaults and returning-user research.

The core idea from the returning-user research: detect that the user
is returning and adapt. Two answers are enough to route someone into
the right flow, pre-populate the right template, and skip steps that
do not apply. Collect anything else later through progressive
profiling.
Source: https://formbricks.com/blog/user-onboarding-best-practices

Smart-defaults rule of thumb: set every default to the choice the
large majority (around 95%) would pick if forced to choose. Good
defaults cut the work and lift completion, because every needless
interaction is a leak in the funnel. Tools routinely pre-populate
fields for returning visitors from stored data so they do not retype.
Source: https://www.shopify.com/partners/blog/cognitive-load
Source: https://www.useronboard.com/onboarding-ux-patterns/sensible-defaults/
Source: https://knowledge.hubspot.com/forms/form-fields-pre-populated-with-your-own-or-someone-else-s-information

Watch the default state, though. The wrong default is worse than no
default: it quietly pushes people into a plan that does not fit and
they only notice once they are committed.
Source: https://humbleteam-agency.medium.com/the-quickest-way-to-ruin-onboarding-wrong-default-state-558eed4ab37a

Concrete pattern for Volyume's "create a new plan" for an existing
user:

- Pre-fill from the last plan, do not start blank. Carry forward
  equipment, training days, experience level, split. These rarely
  change session to session, so they are safe high-confidence
  defaults.
- Show the carried-forward answers as editable, not hidden. The user
  should see "4 days, full gym, intermediate, upper/lower" and be able
  to change any of it in one tap. This gives returning users the same
  depth as first-timers without making them retype it.
- Make the changes the focus. The thing that actually differs on a new
  plan is usually the goal or the weak point. Lead the re-enrolment
  flow with those, and collapse the stable stuff into a confirmable
  summary.
- Offer two clear doors: "same as last time, tweak the focus" versus
  "start fresh". MacroFactor and the coached-programme apps make
  re-enrolment a short check-in rather than a fresh quiz, because the
  history already exists.
  Source: https://macrofactor.com/welcome/
- Use history as a credibility signal. Fitbod's logged-history input
  is the model: a returning user's previous sets and recovery state
  should visibly shape the new plan, so re-enrolment feels like the
  app remembers them rather than meeting them again.
  Source: https://fitbod.me/blog/fitbod-algorithm/

Net: returning users should get a confirm-and-adjust flow, not the
first-run quiz. The depth stays available behind an "edit" affordance.
The default path is short; the full path is one tap away.

---

## 3. Communicating expertise without overload

What works:

- Concrete, verifiable specifics over round claims. "Join 47,392
  users" beats "join thousands" because a precise number feels
  checkable. Future's "80% trained pro athletes, 95% hold an
  exercise-science degree" works for the same reason.
  Source: https://www.airbridge.io/en/blog/social-proof-for-apps
  Source: https://www.sypnotix.com/reviews/future-app-review
- Goal-matched proof over generic praise. A testimonial or stat that
  mirrors what this user wants beats generic acclaim.
  Source: https://www.airbridge.io/en/blog/social-proof-for-apps
- Trust signals and social proof are different tools. Trust signals are
  authority and legitimacy markers (credentials, the science behind a
  recommendation). Social proof is peer validation (reviews, user
  counts). Layering both across the journey has been associated with
  15 to 40% conversion lifts.
  Source: https://www.reform.app/blog/trust-signals-vs-social-proof-key-differences

What feels empty:

- Social proof shown too early, before the user understands what the
  app does, reads as pushy. Let people grasp the value first, then
  bring proof at decision moments. There are three trust moments:
  pre-install (store listing), onboarding (first two to three
  minutes), and the paywall. 82% of trial decisions happen on day
  zero, so the screens between download and first paywall are the
  highest-leverage window.
  Source: https://www.airbridge.io/en/blog/social-proof-for-apps
  Source: https://weareaffective.com/learning-centre/when-should-apps-use-social-proof-in-onboarding

Balancing beginner reassurance with expert credibility:

- Let the day-one output be explicitly provisional. MacroFactor states
  the first estimate may be well off and improves with logged data.
  This reassures the beginner (no wrong answers) while signalling
  expertise (the system knows its own error bars).
  Source: https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low
- Give a single anchor number that grows. Caliber's Strength Score
  gives beginners a friendly handle and experts a credible,
  potential-relative metric, in one object.
  Source: https://barbend.com/caliber-fitness-app-review/
- Match tone to product. Headspace's calm onboarding mirrors the
  product. Volyume's plain, factual voice is itself a credibility
  signal: a tool a serious lifter built, not a hype funnel.
  Source: https://tearthemdown.medium.com/product-teardown-headspace-user-onboarding-personalisation-b6effd0df1d7

---

## 4. Personalisation and weak-point / specialisation selection

The training reality, which should shape the UX:

- Specialisation means concentrating on one or two lagging body parts
  with extra volume, frequency and intensity, pulling some volume from
  your strongest areas.
  Source: https://www.gymaholic.co/articles/specialization-weak-muscles
- It is an intermediate-to-advanced tool. For a true beginner,
  everything is a weak point, so specialisation is premature. The
  common guidance is to wait until roughly a year of consistent,
  balanced training before identifying real lagging areas.
  Source: https://www.muscleandstrength.com/articles/principles-for-bringing-up-weak-body-parts.html
  Source: https://www.gymaholic.co/articles/specialization-weak-muscles

This has a direct UX consequence: the weak-point step must behave
differently by experience level. Offering a beginner a
"pick your lagging muscle" screen invites a bad, arbitrary answer.

How apps already do the focus selection:

- Hevy: an "extra focus on selected muscle groups" step in onboarding.
  Source: https://fitbod.me/blog/fitbod-vs-hevy-9-reasons-fitbod-beats-hevy/
- Oura: a "which areas do you want to focus on" step with broad,
  plain-language options, well liked in reviews.
  Source: https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/
- Fitbod: the user does not hand-pick weak points at all. The system
  infers balance from logged history and recovery, then rotates
  movements to bring up lagging areas. The personalisation is earned
  from data, not asked for in a quiz.
  Source: https://fitbod.me/blog/fitbod-algorithm/

Designing the "I'm not sure / I don't know my weak points" path:

- Survey-design research warns that a bare "I don't know" option
  produces messy data and gets over-chosen. The better move is a
  filter question first: establish whether the user is in a position
  to answer before asking them to.
  Source: https://www.sheilabrobinson.com/using-an-i-dont-know-option-in-survey-design/
- For Volyume that means gating the weak-point step. Ask experience
  and training history first. If the user is a beginner, or says they
  are not sure, route them to a balanced plan rather than forcing a
  pick. Frame it as the correct choice, not a fallback: "Build
  everything evenly for now, focus a body part later" is the
  expert-correct answer for a newer lifter, and it matches the
  training literature.
- If a focus is wanted but the user is unsure which, offer an inferred
  suggestion from history or a short self-assessment, the way Fitbod
  infers balance from logged sets, rather than a blank menu of muscles.
  Source: https://fitbod.me/blog/fitbod-algorithm/

Making specialisation feel meaningful rather than arbitrary:

- Show what the choice does. Picking "bring up shoulders" should
  visibly change the plan: more shoulder volume and frequency placed
  early in sessions, with volume trimmed elsewhere, which is exactly
  the training prescription. If the pick does not visibly move the
  plan, it feels arbitrary.
  Source: https://www.gymaholic.co/articles/specialization-weak-muscles
- Tie it to the recovery/balance model so the user can see the app
  reasoning about trade-offs, the way Fitbod surfaces recovery scores
  per muscle group. The selection then reads as feeding a system, not
  as a cosmetic tag.
  Source: https://fitbod.me/blog/how-fitbod-personalizes-your-workout-plan-using-smart-training-algorithms/

---

## 5. Progressive disclosure and flow length

What must live in the flow vs be taught in context:

- Front-loading everything causes cognitive overload and is a poor way
  to teach functionality. Progressive disclosure teaches one thing at
  a time, in context, mirroring how people learn.
  Source: https://thisisglance.com/learning-centre/whats-the-difference-between-progressive-onboarding-and-traditional-onboarding
- Fitness apps are explicitly named as a progressive-disclosure case:
  goals, weight, excluded exercises, sessions per week and so on are a
  lot to ask, so reveal features gradually as the user meets them.
  Source: https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/
- Use contextual cues (coach marks, tooltips) on first encounter
  instead of UI-blocking tutorial modals.
  Source: https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/

So the flow should carry only what is needed to generate a usable
first plan: goal, experience, equipment, days per week, and a
gated focus question. Everything else (reading the plan, editing
sessions, swapping exercises, interpreting recovery) is taught in
context the first time the user hits it. Oura's review feedback is the
cautionary tale: it kept onboarding short but failed to teach people
to read the output, so users were left adrift.
Source: https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/

Length benchmarks and completion evidence:

- Product tours in the top 1% for completion stay within five steps.
  Past five steps, completion drops sharply and more than half the
  users disengage.
  Source: https://userpilot.com/blog/user-onboarding-guide/
- Activation checklists should hold at most about seven essential
  items.
  Source: https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/
- Mobile onboarding completion is low in absolute terms: around 8.4%
  at 30 days globally. Checklist completion averaged 19.2% with a
  median of 10.1% across 188 companies in a 2025 study. Treat anything
  you build as fighting a steep drop-off curve.
  Source: https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/
- Length only survives when each step is visibly personalising the
  output. Users accept five or six questions when the result is
  obviously theirs. Noom's 113 screens work because the funnel keeps
  showing the projection move and framing answers as personalisation,
  not because length is good in itself.
  Source: https://blog.funnelfox.com/health-fitness-app-growth-playbook-expert-talk-recap/
  Source: https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/

First-time vs returning users:

- First-time: short flow to a first real plan, then teach in context.
  Aim for the smallest set of questions that still produces a
  credibly personalised plan, with each one visibly feeding the
  output, and a save-and-resume escape hatch.
  Source: https://blog.funnelfox.com/health-fitness-app-growth-playbook-expert-talk-recap/
- Returning: confirm-and-adjust, not re-quiz. Detect the returning
  user, pre-fill from last plan with safe defaults, lead with what
  changed (goal or focus), keep full depth one tap behind an edit
  control. Collect anything new through progressive profiling over
  time.
  Source: https://formbricks.com/blog/user-onboarding-best-practices
  Source: https://www.shopify.com/partners/blog/cognitive-load

---

## Source list

- https://uxcam.com/blog/10-apps-with-great-user-onboarding/
- https://vwo.com/blog/mobile-app-onboarding-guide/
- https://blog.funnelfox.com/health-fitness-app-growth-playbook-expert-talk-recap/
- https://future.co/
- https://www.sypnotix.com/reviews/future-app-review
- https://barbend.com/caliber-fitness-app-review/
- https://apps.apple.com/us/app/caliber-strength-training/id1482405410
- https://macrofactor.com/welcome/
- https://help.macrofactorapp.com/en/articles/206-what-should-i-do-if-my-initial-expenditure-or-recommended-energy-intake-seems-too-high-or-too-low
- https://everydayindustries.com/whoop-wearable-health-fitness-user-experience-evaluation/
- https://mobbin.com/explore/flows/06390f2f-8598-4b94-88f5-0bcb7b65ece4
- https://everydayindustries.com/oura-ring-onboarding-user-experience-evaluation/
- https://ouraring.com/blog/get-started/
- https://goodux.appcues.com/blog/duolingo-user-onboarding
- https://userguiding.com/blog/duolingo-onboarding-ux
- https://medium.com/@nwobodoprincess4/case-study-enhancing-user-onboarding-for-duolingo-e7b311d85269
- https://medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020
- https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel/
- https://web2appworld.com/breakdowns/noom/
- https://www.retention.blog/p/the-longest-onboarding-ever
- https://tearthemdown.medium.com/product-teardown-headspace-user-onboarding-personalisation-b6effd0df1d7
- https://fitbod.me/blog/how-fitbod-personalizes-your-workout-plan-using-smart-training-algorithms/
- https://fitbod.me/blog/fitbod-algorithm/
- https://fitbod.me/blog/fitbod-vs-hevy-9-reasons-fitbod-beats-hevy/
- https://www.findyouredge.app/news/best-strength-training-apps-2026
- https://formbricks.com/blog/user-onboarding-best-practices
- https://www.shopify.com/partners/blog/cognitive-load
- https://www.useronboard.com/onboarding-ux-patterns/sensible-defaults/
- https://knowledge.hubspot.com/forms/form-fields-pre-populated-with-your-own-or-someone-else-s-information
- https://humbleteam-agency.medium.com/the-quickest-way-to-ruin-onboarding-wrong-default-state-558eed4ab37a
- https://www.airbridge.io/en/blog/social-proof-for-apps
- https://www.reform.app/blog/trust-signals-vs-social-proof-key-differences
- https://weareaffective.com/learning-centre/when-should-apps-use-social-proof-in-onboarding
- https://www.gymaholic.co/articles/specialization-weak-muscles
- https://www.muscleandstrength.com/articles/principles-for-bringing-up-weak-body-parts.html
- https://www.sheilabrobinson.com/using-an-i-dont-know-option-in-survey-design/
- https://thisisglance.com/learning-centre/whats-the-difference-between-progressive-onboarding-and-traditional-onboarding
- https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/
- https://userpilot.com/blog/user-onboarding-guide/
- https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/

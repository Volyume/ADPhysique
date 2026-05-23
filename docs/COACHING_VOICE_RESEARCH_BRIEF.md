# Volyume coaching voice: deep research brief

You are running one of three parallel deep-research passes (ChatGPT,
Gemini, Claude) to ground Volyume Complete's coaching communication
voice in evidence, then propose specific phrasing patterns for
seven user-facing surfaces. The other two AIs are running the same
brief independently. A fourth pass adjudicates between your outputs.

Be sceptical of received fitness-app wisdom. Surface real
behaviour-change research, real coaching practice, and real app
post-mortems. Cite primary sources where you can. Flag uncertainty
honestly. Don't ground recommendations in a single paper.

## Context

Volyume is a UK iOS/Android coaching app for resistance training
and nutrition. Closed Play test now, GA in roughly four weeks. The
top tier (Volyume Complete) integrates food logging with the
existing adaptive training and nutrition engine. Pricing ladder is
locked (Free / Pro at £0.99-£2.99 / Complete at £1.99-£6.99 across
open beta, founders, standard windows). Three tiers, no LLM in the
engine (deterministic rules), B2B coach surface is phase 2.

The system has a name in the existing app: **Precision Coaching**.
It already appears on the welcome screen ("Precision Coaching that
adjusts your training and nutrition as your body responds"), on
the check-in surface header, on the weekly coach output screen
header, in the notification titles ("Precision Coaching · check-in"),
in the Pro upgrade and subscription policy copy, and across the
Play Store and App Store listings. Your phrasing recommendations
must use this name, not "the engine" or "the system" as
placeholders. Generic terms read as anonymous machine output;
"Precision Coaching" is what the user already knows it as.

Existing app surfaces use the name two ways: as a proper noun on
its own ("Precision Coaching has held...") and as a possessive ("your
Precision Coaching adjusts at the next check-in"). Both are
acceptable. Engine internals (weeklyCoach.js, the deterministic
rules) can be referenced descriptively but the user-facing label is
Precision Coaching.

Precision Coaching produces output weekly. It can observe (read the
user's weight, food log, training, check-ins), apply deterministic
rules (adaptive TDEE, FFM floor, ED-pattern detection, refeed
prescription), and explain (surface why decisions were made). It
cannot converse, negotiate, listen in real time, or remember
between sessions in any human sense.

The user base skews male (typical training-app demographic) but
deliberately includes recovering-disordered-eating populations, the
exact subgroup Eikey 2021 (BJPsych Open) shows is harmed by
quantified-self apps with the wrong tone. Some users have linked
coaches (phase 2); most do not.

## The problem

The current draft copy across hold cards, paywall triggers, consent
screens, notifications, and cascade gates reads like a manager
delivering verdicts. "We've held your calorie cut. Your numbers
recover for two weeks, we'll suggest new targets." It's factually
correct, but it lands like a parent or a bureaucrat.

A rewrite into warmer copy ("let's give your body a moment, we'll
work it out together") caught a different problem: false intimacy.
There is no "together." The engine is a one-way surface. Promising
collaboration the system can't deliver is a lie a user notices the
moment the next weekly output lands without addressing what they
said. That's a trust-erosion path.

So the brief is not "make it warmer." It's:

1. Find an evidence-based coaching voice that is **honest about
   who makes the decisions** (Precision Coaching, not the user, not
   a "together"), **warm without manufactured intimacy**, **safe for
   the at-risk subgroup**, and **calibrated to relationship depth**
   (early surfaces more factual, later surfaces can be warmer once
   Precision Coaching has visibly worked for the user).
2. Provide specific phrasing patterns for seven surface types.
3. Pressure-test against the failure modes documented in app
   abandonment research and ED-app harm research.

The non-negotiable foundation is honesty about decision authority.
Volyume's Precision Coaching is a deterministic engine. The user
logs, trains, eats, checks in. Precision Coaching reads that data,
applies rules, decides. Phrases that imply the user is part of the
decision ("we'll work it out together", "let's decide", "your call")
are lies. Lies in copy break trust at first contact. The voice
must be warm and supportive without lying about agency.

## The ten research pillars

For each pillar, return: a tight summary of what the literature
supports, the strongest 2-3 primary citations, any contested
findings, and one paragraph of practical implications for
Volyume's seven surfaces.

### 1. Autonomy-supportive vs. controlling language

Self-determination theory (Deci & Ryan and extensions). The
controlling vs. autonomy-supportive distinction in health and
fitness coaching. What linguistic markers separate the two: should
vs. could, you need to vs. you might choose to, second-person
prescriptive vs. inclusive first-person plural, etc. Specifically
in the context of weekly written feedback rather than live coaching
sessions.

### 2. Motivational interviewing in one-way surfaces

The OARS model (open questions, affirmations, reflections,
summaries). How MI principles translate to app copy where there is
no dialogue. The work of Miller and Rollnick and downstream
adaptations for digital health interventions. What's salvageable
from MI in a push-only context, what's not.

### 3. Safety-hold communication for at-risk populations

CBT-E (Fairburn), FBT (Lock & Le Grange), and behavioural-activation
work on phrasing concern about under-eating, rapid weight loss, or
binge risk without triggering shame, denial, or app abandonment.
The 2025 Cruz et al. meta-commentary in IJED on fitness/diet app
harm. What clinicians have found works when an automated system
needs to convey "we've noticed something concerning" to a user who
may have an active ED or be in recovery.

Specifically: how to deliver the safety message in a way that
preserves the user's sense of self-efficacy and avoids implying
shame, failure, or paternalism. What words to avoid (e.g. the
"unhealthy" framing). What words tend to land.

### 4. Elite-coach communication patterns in strength and nutrition

Look at what published evidence-based coaches actually sound like
when delivering hard news to a client: Lyle McDonald, Eric Helms
(in his coaching and podcast voice, not his cited research),
Layne Norton, Renaissance Periodization at their best, Stronger By
Science, Paul Carter, Greg Nuckols, Holly Baxter. What voice
attributes do they share? Where do they fail? Where does the
register tip from coach to guru? Cite specific public-domain
examples (podcasts, articles, course material) where you can.

This is the "what does good actually look like in our industry"
pillar. Cross-reference against the academic SDT/MI literature in
pillars 1 and 2.

### 5. App-specific behaviour change literature and post-mortems

Published research and post-mortems on what specifically in copy
causes app abandonment, and what specifically retains users
through difficult moments (missed days, paywalls, safety holds,
clinical-adjacent alerts). Headspace, Calm, Noom, MyFitnessPal,
Streaks, Strava, Reflectly. Academic work on tone-driven churn in
behaviour-change apps. The 2022 Cronin et al. review and similar.

### 6. Plain-language health communication

Lang et al. 2025 (JMIR, DOI 10.2196/50862) showed jargon density
predicts comprehension failure in 1,241 NIHR plain-language
summaries. CDC's Everyday Words for Public Health Communication.
NHS plain-language guidance. The prescriptive register for health
copy when the audience may include people in clinical or
sub-clinical states. What words specifically (the CDC list is a
start) and what sentence structures (the NHS active-voice rule).

### 7. Counterfactual framing combined with autonomy-supportive language

Kuhl, Artelt, Hammer 2023 (arXiv 2306.07637 / Springer LNCS DOI
10.1007/978-3-031-44070-0_14, N = 161) established that upward
counterfactual explanations ("with X, this would have been Y")
outperform downward counterfactuals and no-explanation conditions
on task performance and knowledge. How to combine that finding
with the autonomy-supportive principles from pillar 1. The
specific phrasing patterns that deliver an upward counterfactual
without sounding like nagging or upsell.

### 8. The "feel seen" question

What specifically in copy makes a user feel a system understands
them, vs. feeling like they're getting form-letter output.
Research on personalisation cues, acknowledgement language ("we
noticed..." vs. "you've been..."), the difference between data
mirroring and inferred-state reflection, and the line where
acknowledgement tips into intrusion. Relevant work in
human-computer interaction (CHI proceedings, transparency in AI,
the explainable-AI literature on user trust).

### 9. Honesty about decision authority (the most important pillar)

In Volyume the user does not make Precision Coaching's decisions.
The user logs, trains, eats, weighs, checks in. Precision Coaching
reads that data, applies deterministic rules, and decides what
target to set, what to hold, what to adjust. There is no
negotiation. The user's "input" to Precision Coaching is their
behaviour, not their preferences in that moment.

This means phrases like "we'll work it out together", "let's
decide what's next", "tell us if you want a different approach"
are factual lies. Precision Coaching will decide next week the
same way it decided this week, regardless of what the user thinks
about it. Lying about decision authority breaks trust at first
contact, not over time. A user who reads "together" and then
experiences another one-way output the following week has learned
the system lies.

Research areas:

- The literature on honesty in product copy and the trust impact
  of overpromise. Identify the specific patterns: false promises,
  ungrounded compliments, manufactured stakes, fake deadlines,
  pluralised "we" implying a team where there's an algorithm,
  framing decisions as collaborative when they aren't.
- Newsletter writers and podcast hosts who feel close despite no
  real reciprocity. What linguistic markers let them be warm
  without implying dialogue or shared decision-making.
- Explainable-AI literature on transparency and trust (the
  Kaur et al. 2020 CHI work and downstream). What users perceive
  as honest vs. patronising disclosure of automated
  decision-making.
- Practical patterns that acknowledge the user's contribution
  (their effort, their data, their attention) without implying
  the user voted on the decision.

For Volyume's surfaces, the test is: would this sentence still be
true if the user did nothing but kept logging? If the answer is
no (e.g. "we'll work this out together" depends on the user
contributing something they aren't asked to contribute), it's a
lie and has to be rewritten.

### 10. Voice calibration to relationship depth (secondary)

Separately from honesty, there's a question of warmth calibration.
A first-time user reading "let's give your body a moment" hasn't
seen Volyume work for them yet. By contrast, a user at week 12 who
has watched Precision Coaching catch a stall, suggest a refeed,
and walk through a deload has earned the right to a warmer tone,
and Volyume has earned the right to use it.

Research on relationship-depth calibration in product copy. Stages
of trust formation in digital products (Mayer & Davis 1995 and the
app-context downstream). What specifically should change between
week 0 and week 12 in tone, intimacy, and warm-coach phrasing,
holding the honesty constraint from pillar 9 fixed.

The output for this pillar should include a staged voice
specification: what early surfaces (onboarding, week 1-2) sound
like vs. steady-state surfaces (week 3+) vs. safety surfaces
(ED-pattern, FFM floor, rapid-loss) at any point. All stages share
the same honesty rule; they differ in warmth.

## The eight surface types needing the voice pass

For each, return one recommended phrasing pattern at the end of
your deliverable, plus a sample applied to the existing draft we
have.

### Surface 1: Safety hold cards

User has triggered the ED-pattern lockout, the FFM floor hold, or
the rapid-loss compressed-upward correction. Engine refuses
further deficit and explains why. User is by definition in a
sensitive moment.

Existing draft for ED-pattern lockout (warm version):

> Pause week. Let's give your body a moment.
> Your weight's been dropping fast over the last few weeks, your
> energy scores have been low, and your food log shows you running
> lean. That's a tough combination, and one we want to walk you
> through.
> Here's the why. When the deficit gets too sharp for too long,
> your body holds onto fat and starts breaking down muscle to fuel
> itself. Performance in the gym drops. Recovery slows. And the
> hunger that's been quiet so far catches up, usually all at once.
> That's how most cuts come undone, even when the scale is moving.
> So we're holding your calorie target steady this week. Keep
> training, keep your check-ins going, and aim to hit the target
> you've got, not eat under it. Once your energy steadies for a
> couple of weeks, we'll work out the next step together.

Known issue: "work out the next step together" is a factual lie.
The engine alone makes the decision next week, based on the same
rules. The user's role is to keep training, eating, and logging;
they do not negotiate the target. The honesty test from pillar 9
applies: rewrite to language that's true if the user does nothing
but keeps logging.

### Surface 2: Differential paywall triggers (Move #4)

Free user has reported adherence as "under" or "over" in 2 of the
last 3 weeks. The relevant insight card surfaces a "with food
data, we'd be able to tell" preview tied to a 14-day Pro trial CTA.
Six contexts: stalled lift, extreme soreness, deload, missing TDEE,
block summary, energy crash.

Current draft (one example):

> Your bench has stalled for three weeks. With food data, we could
> tell you if it's training or fuel. Try Pro free for 14 days.

This needs to land as coaching insight, not upsell.

### Surface 3: Article 9 health-data consent screen

GDPR Article 9 explicit consent required at onboarding before
storing weight, food intake, BF%, energy, recovery, ED-pattern
signals. The user has no relationship with Volyume yet.

Current draft is in legal-document register. Needs to be
trust-building and demonstrate competence without losing legal
sufficiency.

### Surface 4: Onboarding goal-lock screen

User selected an aggressive cut goal (physique competition or
advanced recomp). Engine offers a goal-lock that raises the
ED-pattern detector threshold from 2 to 3 signals. User has no
relationship with Volyume yet.

Current draft is one screen with a 2-option radio button.

### Surface 5: Cascade trial transitions (Move #5)

Three modal screens: day 14 ("Complete trial ends, choose Pro or
pay"), day 28 ("Pro trial ends, choose Free or pay"), and
subscription-failure banner. Users are at different relationship
depths depending on usage during the trial.

### Surface 6: Notifications

Daily check-in reminders, weekly check-in nudges, cascade gate
notifications, payment-failure alerts. Push-only at v1. Max 80
characters per push body. The user may be at a 3 a.m. low or a
post-workout high when they receive these.

ED-pattern flag fires only in-app, never push (already locked).

### Surface 7: Cleared / recovery copy

When a safety hold lifts after the user's signals settle for two
weeks. User has just gone through a difficult moment and the system
needs to acknowledge it without trivialising or over-celebrating.

Current draft:

> Hold lifted. You've turned a corner.
> The signals that prompted last week's pause have settled. Energy's
> back up, weight's moving at a healthier pace, and your food log
> shows you fuelling properly.
> We'll start moving your target again at the next weekly run. Take
> it gently from here. Your body responds better to a steady pull
> than a sharp one.

### Surface 8: Existing weekly coach output (the shipping app)

Volyume already ships a weekly coach engine that produces output
strings the user reads at every Sunday-evening check-in. These
strings live in `src/lib/whyThisTemplates.js` (a 12-key library of
"why this advice" explanations covering volume status, progression,
auto-regulation, week-phase descriptions, split rationales, deload
predictions, time-crunch adjustments, travel-mode adjustments,
posing/conditioning) and in `src/lib/weeklyCoach.js` (the weekly
output assembly including calorie adjustment magnitudes, held
decisions, energy and recovery scores, autoregulation matrix
outputs, MATADOR diet-break triggers).

The existing register tends toward direct factual statements
("Your bench has stalled three weeks. Try N+2.5kg × R-1, or stick
at N for R+1") and inherits the existing app's "Direct. Precise.
No fluff." rule. It does not use jargon, does not use AI tells, and
does not over-celebrate. But it has not been written against the
honesty-about-decision-authority principle (pillar 9) or the
relationship-depth principle (pillar 10), because both principles
are outputs of this research.

Your phrasing patterns and the eventual voice pass should apply to
this existing surface too. The implementation will be a coordinated
re-write across the seven new surfaces and the existing weekly
coach output, so they all share one voice rather than the new
surfaces sounding warmer than the legacy ones.

You don't need to re-draft the existing strings as part of this
brief. The synthesis step after the three-AI pass will produce the
revised text. What you need to do in this pass is ensure the
patterns and the failure-mode catalogue you propose work cleanly
when applied to the existing coach register, not just to the
newer safety-hold and consent surfaces. Flag any patterns where
the existing direct factual register and the new coach voice
create tension you can't resolve.

## Constraints and existing locked rules

Voice rules already locked for Volyume (from CLAUDE.md and
DESIGN_SYSTEM.md):

- **No em dashes** ever. Full stop, comma, or colon.
- **British English** spelling: optimise, colour, behaviour, centre.
- **No AI tells**: "let me", "I'll", "I'd be happy to",
  "certainly", "absolutely", "dive into", "delve into", "leverage",
  "utilise", "facilitate", "robust", "seamless", "streamline",
  "comprehensive", "ensure" as filler, "it's important to note",
  "may potentially", "could possibly".
- **No marketing jargon**: "perfect", "guaranteed", "beast mode",
  "crush", "shred", "hacks", "AI Builder", "level up".
- **No emoji in functional UI copy.**
- **No motivational filler.** "Great job!" / "You did it!" /
  "Way to go!" are banned. Celebrations reserved for genuine PRs.
- **Numbers are the hero.** Data before description.
- **Direct. Precise. No fluff.** Existing app uses copy like
  "Finish Workout", "COMPLETE SET", "Discard Workout?", "Set not
  saved, try again."
- **Volyume sits alongside coaches, not above them.** Never imply
  Volyume replaces a human coach.
- **Coach Builder is deterministic, rules-based.** Never describe
  the engine as AI or machine learning. The engine is a set of
  rules, not a model.
- **Plain English.** No jargon: no MEV/MAV/MRV/RIR/RPE, no
  "metabolic adaptation", no "training stimulus", no
  "stimulus-to-fatigue ratio", no bare researcher surnames.

These rules constrain your phrasing recommendations. Recommendations
that violate them are not options.

## The deliverable shape we need

Structure your response as:

### Part 1: Findings, by pillar

For each of the ten pillars, return:

- 4-8 sentence synthesis of what the literature supports
- 2-3 strongest primary citations with DOIs or stable URLs
- Any contested findings, named explicitly
- A practical implication paragraph (no more than 5 sentences) on
  how this pillar should shape Volyume's seven surfaces

### Part 2: A consolidated phrasing pattern set

Roughly 8-15 named phrasing patterns derived from the findings, with
each pattern given:

- A short name (e.g. "Observed-state acknowledgement, not inferred
  emotion")
- The principle (1-2 sentences)
- A 1-2 sentence example of the pattern in use
- The opposite/failure mode it avoids

### Part 3: Re-drafts of surfaces 1-7

For each of surfaces 1-7 listed above, write your recommended
copy applying the phrasing patterns from Part 2. Match the
format/length constraints noted (e.g. push under 80 characters,
cascade gate is one modal screen).

Note where you're uncertain. Note where you'd want to A/B test if
we could. Note where the surfaces should use different voice
registers based on the relationship-depth principle from pillar 10.

Surface 8 (existing weekly coach output) is not re-drafted in this
research pass. The synthesis step does that. Your job for surface 8
is to confirm the patterns from Part 2 work cleanly against the
existing direct factual register, and to flag any unresolvable
tension between the new voice and the legacy register.

### Part 4: Failure-mode catalogue

A list of 5-10 specific phrasings or patterns that look reasonable
but the research suggests would harm trust, retention, or the
at-risk subgroup. Each entry: the failure phrasing, why it fails,
what to use instead.

### Part 5: Open questions

Where the literature is thin, contested, or your recommendation
relies on practitioner observation rather than published evidence,
say so. Be specific about what would close the gap (a study not
yet done, a question only user research can answer, etc.).

## Voice rules for the deliverable itself

Apply the constraints above to your own output. The deliverable
should read like the kind of work a serious practitioner would
write. No em dashes. No AI tells. British English. Direct. Precise.

Cite primary sources, not blog posts, where possible. If you cite a
podcast or coaching course, name it and timestamp where you can.

Don't bullet-point everything. The findings sections specifically
deserve prose. The phrasing pattern section is a list.

Keep the total deliverable to roughly 3,500-5,000 words. Tight is
better than thorough.

## What we're not asking for

- Visual design recommendations. Colours, typography, layout are
  out of scope.
- Engine-logic recommendations. The thresholds, gates, and detector
  rules are locked in our prior research and are not being
  revisited here.
- General coaching philosophy essays. Stay on Volyume's seven
  surfaces.
- LLM integration suggestions. Volyume's engine is deterministic;
  conversational LLM features are out of scope for v1 and v1.x.

---

End of brief. Run independently; do not condition your output on
the other two AIs. We'll synthesise across the three after.

# impl-COMP-006 — Publish the methodology: "How Precision Coaching decides"

**Blueprint agent · 10 June 2026 · Approved seed:** `../competitive-audit-03-master-proposals.md`
COMP-006 (impact 7 / effort 2 / priority 4.0). **Code ground truth verified against:**
`src/screens/CoachOutputScreen.js` (full read, 2,160 ln),
`src/screens/WelcomeScreen.js` (full read, 242 ln),
`src/lib/whyThisTemplates.js` (full read, 421 ln),
`src/lib/weeklyCoach.js` (full read, 1,304 ln),
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (full read),
`web/apps/web/src/app/(app)/coaching/page.tsx` (full read),
`web/apps/web/src/app/page.tsx` (full read).
Integration map row verified: `impl-00-integration-map.md` COMP-006.

**Method note:** direct fetches of publisher pages were blocked where noted (403).
Claims marked *(search-extract)* come from search-result extraction and should be
treated as directionally reliable rather than audited.

---

## 0. Code ground truth — what already exists

Before any competitive comparison, what the codebase actually has:

**Held-decision architecture is fully built.** `weeklyCoach.js` outputs a
structured `heldDecisions` array (lines 1031–1097) with typed entries:
`ed_pattern_lockout`, `ed_pattern_cleared`, `rapid_loss_corrected`, `ffm_floor`,
and a plain `calories` type with a reason string. Every hold already has a
plain-English `reason` field. The engine surfaces *why it did not change* every
week it holds.

**WHY_LIBRARY is locked copy (lines 251–294, weeklyCoach.js).** Twelve keyed
reason strings fire deterministically: `on_target_holding`, `off_target_cal_up`,
`off_target_cal_down`, `recovery_lagging`, `performance_regressed`,
`building_baseline`, `stabilise_sessions`, `steps_bump`, `deload_suggested`,
`diet_break_suggested`, `push_volume`, `low_data_weight`. These already appear as
`WhyBlock` on every coach card.

**whyThisTemplates.js exports 11 plain-English template functions** for
exercise selection, volume status, progression, autoregulation, week phase,
split rationale, deload prediction, time crunch, travel, posing/conditioning,
and three locked ED-safety copy blocks (lines 348–406). The jargon guard is
already enforced at dev time.

**CoachOutputScreen.js renders** a `WhyBlock` (line 1539), a `HeldDecisionsCard`
(lines 1567–1573) with history shelf, and a `credentialNote` footer (lines
1612–1617): "Precision Coaching is built on published training science: volume
landmarks, autoregulation, and RED-S safety limits, configured to your data."

**WelcomeScreen.js PRO_BULLETS** already includes: "After every check-in, your
coach explains every decision. What changed, what was left alone, and why."
(line 25). The identity line target is in the hero block (lines 61–65) which
currently carries only `Less thinking. More lifting.` and the tagline.

**Web coaching page** (`web/apps/web/src/app/(app)/coaching/page.tsx`) exists
and renders the full coaching history for logged-in users. The web landing page
(`web/apps/web/src/app/page.tsx`) already has a "Precision Coaching" capability
cell with: "A weekly review that changes your plan and explains why."

**What is missing:**
1. A dedicated "How Precision Coaching decides" screen (in-app, accessible from
   You tab, linkable from trust row and paywall).
2. An enhanced receipt line on the `WhyBlock` with a "Learn more" tap target
   linking to the methodology screen.
3. The identity line on WelcomeScreen.
4. A `/methodology` or `/how-it-works` page on the web.
5. Surfacing the existing held-decision reasons more prominently when the user
   might not scroll to them (they currently render at the bottom of CoachOutput).

---

## 1. Best-in-market bar

### 1.1 MacroFactor — the single best reference

MacroFactor's methodology transparency is the category benchmark. What makes it
work is not a single feature but a consistent architectural commitment across
four surfaces:

**The algorithm page.** `macrofactor.com/macrofactors-algorithms-and-core-philosophy/`
(also published on Stronger by Science) explains the expenditure algorithm in
plain prose: the core premise ("changes in body mass over time reflect energy
balance"), what it does weekly, why static TDEE is wrong, and — critically —
*where it admits error*. The team "doesn't mind admitting their algorithms don't
produce absolutely perfect recommendations in every scenario" *(search-extract)*.
That admission builds more trust than a perfect-sounding claim.

**The "How Should I Interpret Changes to My Energy Expenditure?" help article.**
(`help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure`)
This is the in-product answer to the user's moment of confusion: the calorie
target changed and they don't know why. The article is short, plain, and maps
the number to the mechanism. MacroFactor has documented that their Fall 2024
algorithm update (v3) made the system "more responsive to meaningful changes...
while being more stable when faced with transient fluctuations" *(search-extract)*.
That kind of version-tracked changelog is unusual in consumer apps.

**Annual report.** The 2025 annual report is publicly framed around transparency
and community, with a public roadmap and monthly newsletter *(search-extract,
macrofactor.com/annual-report-2025/)*. Users describe the company as "very
transparent about what they will add or won't add to the app."

**In-app citation links.** Embedded links in the app let users access the
research behind recommendations. MacroFactor treats science literacy as a
feature, not an obstacle.

**The result**: MacroFactor holds a 4.7+ App Store rating (search-extract),
won Google Play's "Best Everyday Essential" award in 2024 *(search-extract)*,
and independent reviewers across five sites (outlift.com, marrastrength.com,
dr-muscle.com, trygaya.com, best-nutrition-apps.com) consistently cite the
algorithm transparency as a primary differentiator. The brand voice is: "We
built this on science and we will explain the science."

**What Volyume can do better:** MacroFactor's transparency is nutrition-only.
It does not explain its training adjustments, deload timing, or safety holds
in the same depth. Volyume's held-decision architecture already covers all of
these. The moat is wider — it just has not been told.

### 1.2 Oura Ring — factor-by-factor breakdown as the standard for wearables

Oura's Readiness Score breakdown is the consumer expectation for any score-based
advisory. Every contributor factor is named, weighted (visually, not numerically),
and explained in one line: "Resting heart rate: slightly elevated — may indicate
recovery is still underway." The score is not a black box; it is a sum of
labelled parts. Users trust it because they can interrogate it.

Key mechanism: the factor list is ordered by influence that week, not
alphabetically. When HRV is low, it is listed first. This ensures the user's
attention lands on what matters rather than scanning a static checklist.

What transfers to Volyume: the held-decision card could list the signals that
*fired* in order of weight (e.g. "1. Weight trend: on target. 2. Recovery: low
this week. 3. Last adjustment: 1 week ago — cooldown active.") rather than a
single sentence.

### 1.3 Whoop — the mechanism sentence

Whoop documents its Strain algorithm on whoop.com/thelocker/how-does-whoop-strain-work-101/
with the key sentence that makes the number trustworthy: "The WHOOP algorithm is
logarithmic, meaning the higher your Strain gets, the harder it becomes to build
more." One mechanism sentence that explains behaviour users actually observe
(the score doesn't go up linearly). This is the "plain-mechanism language"
pattern from COACHING_VOICE_SYNTHESIS_LOCKED.md §3 rule 10 in practice.

What transfers: for every Precision Coaching decision, there is a one-sentence
mechanism that explains *why the rule works*, not just what the rule is. "We
wait two weeks between calorie changes because the trend needs time to settle."
That sentence is not in the app anywhere.

### 1.4 Noom — psychology explained as feature, not footnote

Noom's daily lessons centre on the "why" behind eating behaviours: why emotional
eating happens, how "all or nothing" thinking works, why deficits above a certain
level trigger hunger rebound *(search-extract, choosingtherapy.com/noom-review)*.
The lessons are short (under 3 minutes) and interactive. The review pattern
across 816K App Store reviews shows users specifically mention the psychology
content in positive reviews.

What Noom gets wrong: the explanations are delivered in timed daily lessons that
require returning to them. They are content, not context. Users who miss a few
days fall behind. Volyume's approach should be the opposite: explanations appear
at the moment of the decision, not in a separate curriculum.

### 1.5 Avatar Nutrition — still operating (claim corrected)

The tasking brief described Avatar Nutrition as having "died"; web research
(2026) shows it is still operating as a subscription service at avatarnutrition.com.
It remains relevant as a transparency case: Avatar surfaces the macro adjustment
algorithm as a named feature ("adaptive nutrition coaching") but does not explain
why specific adjustments fire. User reviews on JustUseApp (search-extract) note
satisfaction with the adjustments but occasional confusion about specific changes.
Avatar shows that naming adaptivity is not enough; explaining the trigger is what
builds trust.

**Single best reference: MacroFactor.** Not for any one feature but for the
principle that the algorithm explanation page *is* the product, not a
supplement to it. When a competitor asks "why did my calories change?", the
answer is a help article. When a Volyume user asks "why was my calorie cut
held?", the answer should be already in front of them on the card that held it.

---

## 2. What fails

### 2.1 The black box: silent changes that feel random

The most consistent App Store complaint pattern in the fitness coaching category
is not inaccuracy — it is unexplained change. UCL research published October 2025
found that "users of fitness and calorie-counting apps experienced emotional strain
when calorie targets were changed without explanation" (studyfinds.org, search-extract).
One user on MyFitnessPal reported being prescribed "negative 700 calories a day"
with no explanation (searchextract, hootfitness.com switching-intent post). The
research found "users lacked autonomy when algorithms dictated calorie targets."

The key insight from the research (PMC8367144, nutrition app user perspectives):
"One-third of survey participants mentioned that incorrect nutrient and energy
output would be a barrier to selecting a specific nutrition and diet app." Trust
in the number precedes use of the number. An app that changes a target silently
has destroyed its own authority.

### 2.2 Anti-pattern: one-time explainer screen users skip

Generic onboarding screens ("Here's how our algorithm works!") have near-zero
retention. Users in setup mode are trying to get to the product, not learn about
it. The explanation must arrive at the moment of decision, not three screens before
the first goal is set. This is the error Noom's daily lesson format partially
makes: explanation as curriculum requires the user to seek it out rather than
meeting them at the point of confusion.

### 2.3 Anti-pattern: over-explanation as noise

MacroFactor's `Why This Week` section has been criticised in some reviews for
verbosity (search-extract, outlift.com review). A 400-word explanation of why
calories changed is not read; it is scrolled past. The pattern that works is
the one-sentence mechanism followed by an optional "learn more" path. The
sentence earns the tap; the tap earns the longer explanation.

### 2.4 Anti-pattern: jargon in the explanation

RP Hypertrophy's algorithm explanations are cited in the COMP-013 blueprint as
driving beginners away. Explaining a decision in terms the user cannot parse
(MEV, MRV, stimulus-to-fatigue ratio) is worse than no explanation: it signals
exclusion. The whyThisTemplates.js jargon guard exists precisely because this
failure mode was already identified and locked against.

### 2.5 Anti-pattern: explanation that contradicts what just happened

If the "why this week" block says "trend is on target, no change needed" but the
user's actual calorie target changed three days ago via a different path, the
explanation breaks trust permanently. Every receipt line must mirror the
specific decision made, not a generic phase summary. This is the honesty-test
rule from COACHING_VOICE_SYNTHESIS_LOCKED.md §1 applied to transparency copy.

---

## 3. User psychology

### 3.1 The trust-building moment

The trust literature is clear: trust in a decision-making system is built by
accurate explanation at the moment of decision, not by capability claims in
advance (Mayer, Davis & Schoorman 1995, *Acad Manage Rev* 20(3):709-734, DOI
10.5465/AMR.1995.9508080335; Kaur et al. 2020, *Proc CHI*, DOI
10.1145/3313831.3376219 — both verified citations from COACHING_VOICE_SYNTHESIS_LOCKED.md).

For Volyume, the trust-building moment is the first time a user's calorie target
is held when they expected it to change. They wanted the cut deepened. Precision
Coaching held it. If there is no explanation, the app feels arbitrary. If the
explanation is a sentence — "Trend is on target. No change needed." — the user
accepts it intellectually but does not trust it. If the explanation says: "Your
trend is right on target at -0.6% this week. The last adjustment was 6 days ago.
Two weeks of data are needed before the next one" — the user now understands the
rules and trusts that they apply consistently.

### 3.2 "No change" is the highest-trust surface

The "held" case is psychologically harder than the "changed" case. A calorie
increase is welcome. A calorie cut is expected. A hold when the user wanted a
cut is a friction point that the explanation must resolve. The existing
`heldDecisions` architecture already captures this. The gap is surfacing it
prominently enough that users read it rather than scrolling past it.

The MacroFactor model: when expenditure recalculates without changing the
recommendation, the app still shows a "no change this week because..." row.
The act of showing the held decision signals that the app is paying attention,
not that nothing happened.

### 3.3 "It refused to cut my calories" — the word-of-mouth moment

The most quotable Precision Coaching output is not a calorie change. It is the
ED-pattern lockout copy in whyThisTemplates.js:

> "We've held your calorie cut. We've noticed a few signals together: your weight
> has been dropping faster than your intake suggests, your energy scores have been
> low, and your food log shows you eating less than your target for a few weeks
> running. We'd rather pause than push."

That is the verbatim locked copy on line 354 of whyThisTemplates.js. No other
fitness app has shipped copy like that. When a user tells a gym friend "my app
refused to cut my calories because it thought I was at risk", that story converts.
The methodology page is the mechanism that makes the story believable: it proves
the decision was systematic, not a bug.

The FFM floor hold generates an equivalent story: "Precision Coaching held my
calories because my intake was below my lean-mass safety floor." The held-decision
card renders this with the actual numbers (line 1063–1064 of weeklyCoach.js):
"Your seven-day average intake of X kcal is at or below your safety floor of Y kcal."
That specificity is the quotable moment.

### 3.4 Understanding versus trusting

There is an important distinction. A user can *understand* that a rule exists
("the app holds calories for two weeks after a change") and still not *trust*
the system if the rule feels arbitrary. Trust comes from believing the rule is
grounded in something real. The methodology page's job is to connect each rule
to its mechanism:

- Two-week cooldown: "Because trend data takes two weeks to stabilise after a
  change; acting faster than that amplifies noise."
- Volume landmark floor: "Because below a certain number of sets, a muscle
  stops growing. The floor is the minimum proven to stimulate adaptation."
- Deload trigger: "Because sustained overreaching without a recovery week
  eventually reduces performance and raises injury risk."

These are not hard to write. They are not in the app today.

### 3.5 Effort budget

The methodology page must be skippable. Users who trust the system will never
open it. Users who do not trust it yet will read it once and then trust it.
The design should be: one paragraph per decision type, optionally expandable,
with no required interaction. No quiz. No lesson sequence. It is a reference
document that earns trust by existing, not by being consumed.

---

## 4. The Volyume implementation

### 4.1 Surface A: "How Precision Coaching decides" in-app page

**Placement:** You tab > [new row] "How Precision Coaching works" — between the
existing "Precision Coaching" shortcuts group and the Settings group, based on
the You tab surface map in impl-00-shared-brief.md. This is not in Settings; it
is a first-class row in the You tab because it is a feature, not a preference.

**What it contains (six sections, all collapsible):**

**Section 1: The weekly cycle** (always visible, ~40 words)
"Every week, Precision Coaching reads your weight trend, your check-in, and your
training. It compares what happened to what was expected. That comparison drives
the decision. Nothing is random. Everything can be explained."

**Section 2: Why changes wait (the cooldown rule)**
"Calorie targets change at most once every two weeks. A shorter gap would
amplify noise in the data. Two weeks is enough time to see whether a change
is working."

**Section 3: Why holds happen**
"When the trend is on target, when data is thin, when recovery is low, or when
a safety signal fires, Precision Coaching holds rather than acts. The held-decision
card on your weekly review shows exactly which of these applied."

**Section 4: Training signals**
"Volume adjusts based on how your energy and soreness scored against your sessions
completed. The signal is a number of sets to add or remove. The reason is the
recovery-and-performance matrix that produced it."

**Section 5: Safety floors (brief, links to full ED copy)**
"Precision Coaching will not suggest a calorie cut if your recent intake is
already below the energy floor for your lean mass. It will not continue a cut if
multiple signs of energy deficiency appear together. These checks are there by
design. They are not bugs."

**Section 6: What Precision Coaching cannot do**
"It cannot see food you did not log. It cannot read how you feel, only what you
scored. It cannot override your choices. Its adjustments are suggestions until
you apply them."

**Tone notes:** All six sections follow the COACHING_VOICE_SYNTHESIS_LOCKED.md
Stage 2 register (warmed by data) and pattern 6 (rationale-attached prescription).
Each section opens with the rule and closes with the mechanism. No jargon.
No em dashes. No researcher surnames. British English throughout.

**Empty-state / offline:** The page is entirely static copy. It loads instantly
with no data dependency. There is no offline edge case.

**Accessibility:** All collapsible sections use `accessibilityRole="button"` on
their headers. The page is readable at any text size. No timed content.

**Navigation path:** You tab > "How Precision Coaching works" row.
Back button returns to You tab root. The page is navigable from three additional
entry points: (a) "Learn more" link at the bottom of any WhyBlock on
CoachOutputScreen; (b) "How we decide" link in the COMP-012 trust row on
WelcomeScreen; (c) the methodology link in the COMP-007 paywall social proof
section (COMP-007 integration — see Section 5).

**Screen name:** `MethodologyScreen`. New file: `src/screens/MethodologyScreen.js`.
Navigator entry in the Profile stack (the stack CoachOutputScreen and YouScreen
already live in, confirmed by impl-00-integration-map.md COMP-006 row).

### 4.2 Surface B: Receipt line on coach cards in CoachOutputScreen

**What changes on the WhyBlock component (line 360–366 of CoachOutputScreen.js):**

The existing `WhyBlock` renders two text elements: `Why this week:` and the
`whyThisWeek` string. The enhancement is one addition: a `Learn more about how
this decision was made` tappable line below the why-text, navigating to
`MethodologyScreen`. This is a secondary link, 12pt, `colors.textMuted`, no
affordance beyond the text.

The link is **always present** on the WhyBlock, not conditional on a specific
decision type. Every weekly output has a why; every why can be explained. The
consistency is the point.

**What changes on the HeldDecisionsCard (lines 506–577):**

The `standardDecisions` map (line 519) currently renders a `pause-circle-outline`
icon and the `d.reason` string. No change to the existing layout is needed —
the reason strings in `weeklyCoach.js` `heldDecisions` are already plain English
and already pass the honesty test. The enhancement is an optional footer row at
the bottom of the `HeldDecisionsCard`:

"Precision Coaching held this decision because of the rules on how it works. [See
how Precision Coaching decides]" — the bracketed text is the tap target.

This link appears only when `standardDecisions.length > 0` (i.e. there are actual
holds to explain). ED-pattern and rapid-loss blocks already have rich copy and
CTAs; they do not need the methodology link.

**What changes in the existing WHY_LIBRARY (weeklyCoach.js lines 251–294):**

No changes to the WHY_LIBRARY strings are required. They already pass the
honesty test and the COACHING_VOICE_SYNTHESIS_LOCKED.md patterns. The voice
synthesis document (Section 8) calls for a "mechanical pass" over these strings
but notes "the voice doesn't change dramatically — the existing register is
already most of the way there." That pass is separate from COMP-006.

The sole new copy requirement is the `Learn more` link text:
`"Understand how this decision was made"` — 38 chars, fits on one line at
any text size above 12pt, passes the honesty test (the methodology page
does explain how the decision was made), no jargon.

### 4.3 Surface C: Identity line on WelcomeScreen

**Current hero block (lines 61–65, WelcomeScreen.js):**
```
<Image source={HERO} ... />
<Text style={styles.tagline}>Less thinking. More lifting.</Text>
```

**Proposed addition:** a second tagline line below the existing tagline, in a
slightly smaller or equal size, dimmer colour (`colors.textMuted`), no bold:

```
Every change has a reason. Every non-change has a reason too.
```

This is the approved identity line from the COMP-006 spec.

**Exact position:** below `Less thinking. More lifting.` in the hero block, before
the cards. The hero block's `gap: spacing.sm` already accommodates a second line.

**Style:** `fontSize.xs`, `colors.textMuted`, `textAlign: 'center'`, same as
`styles.tagline` or one step lighter. It should read as a secondary caption, not
a competing headline. The tagline carries the brand; this line carries the
methodology promise.

**Why this wording:** it makes a claim no competitor makes. "Every non-change
has a reason too" is a direct reference to the held-decision architecture and
the thing that most surprises users when they first see it. It signals that this
app is different before the user has even signed up.

**ED/wellbeing flags:** WelcomeScreen is a pre-auth surface with no access to
user state. No flag behaviour needed.

### 4.4 Copy direction — example strings in house voice

All examples follow COACHING_VOICE_SYNTHESIS_LOCKED.md: terse, British English,
no jargon, no em dashes, numbers before narrative, plain mechanism.

**Example 1: Methodology page Section 2 (cooldown rule)**
"Calorie targets change at most once every two weeks. A shorter gap would amplify
noise in the weight trend. Two weeks is enough to see whether the last change is
working."
(Passes: honesty test, numbers before narrative, plain mechanism, no jargon.)

**Example 2: WhyBlock "Learn more" link context — held decision**
"Calories held. Trend is on target."
[Understand how this decision was made]
(Passes: terse, factual, the link does not summarise what MethodologyScreen
contains — it invites the user to go there. Not a spoiler.)

**Example 3: Methodology page Section 5 (safety floors)**
"Precision Coaching will not suggest a calorie cut if your intake over the last
seven days is already at or below the energy floor for your lean mass. The floor
is 30 kcal per kilogram of lean mass per day, taken from sports medicine guidance
on energy availability. Below it, the body begins breaking down muscle to fuel
itself. This check is not optional."
(Passes: mechanism stated, real number given (30 kcal/kg FFM), source noted
without citing surnames in surface copy, no moral language, no motivational
filler. The phrase "not optional" flags that this is a locked decision per
pattern 15 — no fake-autonomy framing.)

**Example 4: Section 4 (training signals)**
"Volume adjusts by 1 to 3 sets per muscle group per week, based on how your
energy, soreness, and session completion scored together. If recovery is low,
volume holds or drops. If recovery is strong and sessions were all hit, it
increases. The scoring matrix is the same every week."
(Passes: specific numbers given, mechanism described, consistency of the rule
is stated explicitly — which is what makes a rule trustworthy.)

---

## 5. Whole-package integration

### 5.1 COMP-007 (paywall social proof)

The methodology page is the "proof document" that the COMP-007 paywall proof
section references. The paywall can include a row: "Built on published science.
[See how the coaching works]" — linking to MethodologyScreen or the web
methodology page. This is the mechanism behind "Precision Coaching that adjusts
your training and nutrition as your body responds" (the existing PRO_BULLETS
line 22–25 of WelcomeScreen.js). The bullet makes a claim; the methodology page
proves it.

### 5.2 COMP-013 (reveal moment)

The reveal moment references the methodology when presenting the generated plan:
"Your plan was built from the rules Precision Coaching follows. [See how it
decides]" — a quiet link at the bottom of ProSetupCompleteScreen. This is the
first moment a new Pro user is exposed to the methodology architecture, before
any weekly output has run.

### 5.3 COMP-012 (trust row)

The trust row on WelcomeScreen includes "Built on published training science" as
a verified claim (per impl-COMP-012-trust-row.md, the claim is true and the
methodology page is the citation). The trust row links to MethodologyScreen
or the web methodology page. This is the `[See how the coaching works]` tap
target suggested in COMP-012's trust-row blueprint.

### 5.4 Web methodology page

The web already has a `coaching` page (`web/apps/web/src/app/(app)/coaching/page.tsx`)
for logged-in users. A separate public route is needed:
`web/apps/web/src/app/methodology/page.tsx` (or `/how-it-works/page.tsx`).

This page is **public** (no auth required) because it is the primary trust signal
for users considering the app who google "how does Volyume coaching work." It
mirrors the MethodologyScreen content in long-form prose with the six sections
plus the science basis — appropriate for a web reading context.

The web landing page (`web/apps/web/src/app/page.tsx`) already has three
capability cells. The "Precision Coaching" cell currently reads: "A weekly review
that changes your plan and explains why." This cell should gain a `[How it works]`
link to `/methodology`. That link costs one line of JSX.

### 5.5 Streaming/offline behaviour

MethodologyScreen is static copy. Zero data dependencies. Works with no
connection. No Supabase reads. Consistent with the offline-first architecture rule.

### 5.6 ED/wellbeing flags

MethodologyScreen describes the safety system in plain terms (Section 5 of the
page). It does not name specific users, does not reference individual flags, and
does not show any personalised state. It is safe to render regardless of whether
an ED-pattern flag is open. The in-app links to MethodologyScreen from
HeldDecisionsCard are conditionally hidden from the ED-pattern lockout block and
rapid-loss block (those blocks have their own rich copy and CTAs in
whyThisTemplates.js; adding a methodology link would dilute the safety message).

---

## 6. Retention and word-of-mouth mechanics

### 6.1 The primary loop

**Cue:** user opens weekly coach output, sees a hold or an unexpected change.
**Action:** taps "Understand how this decision was made."
**Reward:** sees the rule that produced the decision, understands it is
consistent and grounded, trusts the system.

The reward is not dopamine. It is *relief from uncertainty*. For the subset of
users who are analytical (a high proportion of competitive athletes and physique
users, Volyume's core audience) uncertainty about a black-box system is the
primary reason to churn. Removing that uncertainty converts sceptics.

### 6.2 The quotable moment

Three scenarios produce word-of-mouth:

**Scenario A (FFM floor hold):** "My app wouldn't let me cut more because my
intake was below a safety floor calculated from my lean mass. It showed me the
exact number." — User tells a friend who is aggressively cutting. That friend
downloads the app.

**Scenario B (ED-pattern lockout, verbatim copy from whyThisTemplates.js line
352):** "We'd rather pause than push." — User screenshots the card and shares it.
The methodology page explains why the system has this check, making the story
credible to the new user hearing it.

**Scenario C (held calories):** "It held my calories for two weeks and explained
exactly why — there wasn't enough data yet. Most apps would have just changed
the number and broken my trust." — User leaves a review. MacroFactor converted
users from MyFitnessPal partly on exactly this trust point *(search-extract,
hootfitness.com)*.

### 6.3 The passive trust signal

MethodologyScreen does not need to be read to work. Its existence — the fact
that it *can* be consulted — signals that the system has rules and is not
hiding them. The App Store description can mention: "Every coaching decision can
be explained. See the methodology any time." That claim converts hesitant users
who will never open the page.

---

## 7. Beating the benchmark

MacroFactor explains its nutrition algorithm on a public web page and in help
documentation. That is the best transparency practice in the category today.
But MacroFactor does not:

1. Explain *training* adjustments (volume changes, deload triggers) in the
   same depth as nutrition.
2. Show the specific signals that fired for a specific week's decision, in
   plain English, on the card that produced the decision.
3. Explain safety holds, or even reveal that safety floors exist, in its
   standard user-facing output.
4. Have a structured held-decision architecture at all — its output is either
   a recommendation or silence.

Volyume's held-decision architecture already does all four of these in the
engine. COMP-006 surfaces what is already there.

The differentiator is not the methodology page (MacroFactor has an equivalent).
The differentiator is **per-decision transparency at the moment of the decision.**
MacroFactor tells you how the algorithm works in general. Volyume tells you *why
this specific decision, this specific week, produced this specific outcome.* That
is a different — and harder — thing to build. Volyume has already built it. COMP-006
is the act of showing it.

---

## 8. Measurement

Four metrics, all within the existing telemetry allowlist or requiring minimal
new events:

**1. Methodology page open rate** — percentage of weekly coach output views that
include a tap to MethodologyScreen or the web methodology page. Target: >10% in
the first month (new feature novelty), settling to >4% steady-state. A user who
opens it once and never returns has been served: the purpose is not recurring
engagement, it is one-time trust formation.

**2. HeldDecision "learn more" tap rate** — percentage of coach output renders
where a held decision was present and the user tapped the methodology link.
Target: >15% (users who see a hold are motivated to understand it). This is the
highest-intent signal.

**3. Methodology → session start rate** — users who visit MethodologyScreen and
then complete a check-in or log a session within 7 days, compared to users who
did not visit it. A measurable trust-activation effect. Proxy for "did
understanding the system increase commitment?"

**4. Churn difference (held-explanation users vs non)** — 90-day retention
comparison between Pro users who tapped the methodology link at least once vs
those who did not. Hypothesis: explanation readers churn less because
uncertainty was resolved. This is a lagging metric but the most commercially
significant. Log a `methodology_opened` event; join against the tier churn table.

Implementation note: `track` in `src/lib/engineTelemetry.js` is the existing
pattern for engine events. Add `methodology_opened` (with `source` param:
`why_block` / `held_decisions` / `you_tab` / `paywall`). This is a single
telemetry call.

---

## 9. Build notes

### 9.1 Files touched

**New file:**
- `src/screens/MethodologyScreen.js` — static copy screen, ~200 lines,
  no data dependencies, six collapsible sections, registered in the Profile
  navigator stack.

**Modified files:**
- `src/screens/CoachOutputScreen.js` — two changes:
  (a) Add one tappable line to `WhyBlock` component (lines 360–366): navigation
  to MethodologyScreen.
  (b) Add one footer link to `HeldDecisionsCard` (lines 506–577): navigation to
  MethodologyScreen, conditional on `standardDecisions.length > 0`, hidden from
  ED-pattern and rapid-loss blocks.
- `src/screens/WelcomeScreen.js` — add one `<Text>` line to the hero block
  (after line 63): identity line copy, styled as secondary tagline.
- Navigation file (likely `src/navigation/ProfileNavigator.js` or equivalent) —
  register MethodologyScreen in the Profile stack. No new tab; no new tab icon.
- `web/apps/web/src/app/methodology/page.tsx` — new public web page, mirrors
  MethodologyScreen sections in long-form prose.
- `web/apps/web/src/app/page.tsx` — add `[How it works]` link to the
  "Precision Coaching" capability cell (line 37–40), pointing to `/methodology`.

**No changes to:**
- `src/lib/weeklyCoach.js` — the engine and its heldDecisions output are correct.
  No copy changes needed; the mechanical voice-pass described in
  COACHING_VOICE_SYNTHESIS_LOCKED.md Section 8 is a separate future move.
- `src/lib/whyThisTemplates.js` — no changes. The WHY_LIBRARY strings are
  already correct. The ED safety copy blocks are locked verbatim.
- Any billing file, safety system, coaching engine logic.

### 9.2 Reuse opportunities

- The six methodology sections reuse the `credentialNote` footer style pattern
  already in CoachOutputScreen (lines 1612–1617) for the "Built on published
  training science" framing — same register, same font size, natural reference
  point for the design.
- The `Ionicons` `chevron-forward` + section header pattern used throughout
  the You tab settings sub-pages is the natural component for collapsible
  sections.
- The web methodology page can reuse the same three-column grid from the landing
  page capability cells (`web/apps/web/src/app/page.tsx` lines 35–54) for
  the short-form section headers.

### 9.3 Effort sanity check vs score 4.0

Score 4.0 = "quick win, low effort, high confidence." Verified against the
actual build:

- `MethodologyScreen.js`: static copy, no API calls, no state. Likely 3–4 hours
  for a competent developer including navigator registration, accessibility
  attributes, and light styling reuse. No novel engineering.
- `CoachOutputScreen.js` changes: two navigation taps added to existing
  components. Under 1 hour.
- `WelcomeScreen.js` change: one `<Text>` element added. 30 minutes including
  style decision.
- Web methodology page: Next.js static page with no data fetching. 2–3 hours
  including copy decisions.
- Landing page link: one `<Link>` added. 15 minutes.

**Total estimated effort: ~8–10 hours of implementation.** The bulk is copy
decisions (6 sections of MethodologyScreen, voice-reviewed for jargon). This
is consistent with score 4.0.

### 9.4 Risks

**Risk 1 (highest): Copy needs founder review before ship.**
The methodology page makes specific claims about *how the engine works* (the
two-week cooldown, the volume matrix, the FFM floor calculation). If any of
these descriptions are imprecise, the page actively damages trust by claiming
transparency while being wrong. The copy must be reviewed against the actual
engine logic by the founder before shipping. Suggest: founder reviews each of
the six sections against weeklyCoach.js and whyThisTemplates.js. This is not
an optional step.

**Risk 2: The identity line on WelcomeScreen.**
"Every non-change has a reason too" assumes the user will eventually see a
held-decision card. If a user signs up, never triggers a hold, and never sees
the held-decision architecture, the tagline is a promise that was never
demonstrated. Mitigated by: the methodology page exists and explains holds
even if the user has not experienced one. The tagline is honest in the general
case.

**Risk 3: Methodology page version drift.**
If the engine changes (new hold type added, cooldown period changed) and the
methodology page is not updated, it becomes actively misleading. Suggest: add
MethodologyScreen to the "must review on engine changes" checklist. The page
is not locked copy like ED safety strings, but it should be treated as a
living document.

**Risk 4: Link placement in HeldDecisionsCard.**
The "See how Precision Coaching decides" link must not appear alongside the
ED-pattern lockout block. That block has a specific structure (Get support CTA,
Read more) and adding a methodology link would dilute the safety message and
potentially create confusion between "why this safety check exists" and "get
help now." This is already specified above (Section 4.2) but must be confirmed
in implementation.

---

*Blueprint status: complete. No code changes made.*
*Verified files: CoachOutputScreen.js (2160 ln), WelcomeScreen.js (242 ln),*
*whyThisTemplates.js (421 ln), weeklyCoach.js (1304 ln),*
*COACHING_VOICE_SYNTHESIS_LOCKED.md, web/apps/web/src/app/(app)/coaching/page.tsx,*
*web/apps/web/src/app/page.tsx, impl-00-integration-map.md.*

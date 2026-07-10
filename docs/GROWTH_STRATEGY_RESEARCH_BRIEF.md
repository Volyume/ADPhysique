⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Volyume Complete: growth strategy deep research brief

You are running one of two parallel deep-research passes (Claude
Deep Research and Gemini Deep Research) to ground Volyume Complete's
growth strategy in evidence. The other AI is running the same brief
independently. A third pass adjudicates between your outputs and
pressure-tests every citation.

Be sceptical of received marketing wisdom. Surface real
peer-reviewed evidence, real published app post-mortems, real
disclosed CAC and retention data. Cite primary sources. Flag
uncertainty honestly. Distinguish "vendor marketing claim" from
"measured outcome in a published study."

## Context

Volyume is a UK iOS / Android coaching app for resistance training
and nutrition. Closed-test on Play, currently v1.1.0. Approval to
production in roughly 3 weeks. The food layer, FFM safety floor, and
three-tier ladder are already built and tested (548 Jest tests
pass).

Allan is the sole founder. Holds a full-time professional role
outside Volyume. **Has no existing audience**: no large social
following, no podcast, no email list, no coaching client roster,
no warm coach network. Knows a few people through social media; not
mobilisable as a launch channel. This cold-start position is the
single most important constraint for this research. Every "tactic"
that assumes existing distribution is irrelevant.

The financial target is **£100,000 profit per year as a realistic
12-month goal, with £1,000,000 ARR as a stretch.** Profit not ARR
because Apple/Google take 15% (Small Business Programme tier) and
RevenueCat takes 1% above $2,500/mo MRR. Infrastructure is on free
tiers. £100k profit means roughly £130-150k ARR.

The locked product is described in detail in `docs/HANDOFF.md` and
`docs/MASTER_VISION_AND_PLAN.md`. Headline:

- Three tiers: Free, Pro (£0.99 open beta / £1.49 founders / £2.99
  standard), Complete (£1.99 / £3.49 / £6.99).
- 28-day cascade trial: 14 days Complete free, then 14 days Pro
  free, then Free with hold-at-any-stage.
- Phase 2 B2B coach surface: tiered flat pricing (£29.99 / £59.99 /
  £119.99 per month), 60-day trial, first 100 coaches get 6 months
  free + lifetime 50% off. Coach pays, linked clients get Complete
  free during active link.
- The system has a name in the app: **Precision Coaching**. Use it.
- Deterministic rules engine. No LLM anywhere in the product.
- UK-first launch.
- Five locked engine safety guardrails (FFM floor, ED-pattern
  lockout, rapid-loss compression, protein cap, adherence-quality
  gate). Tier-blind, fire for everyone including Free users.

## What Allan's existing research established (input, not locked)

Allan has done initial growth research with a generalist AI. Key
claims from that research, presented here as INPUT for you to
pressure-test, NOT as locked direction:

- The £1M ARR math works at 600 B2B coaches plus 5,060 consumer
  Complete subscribers.
- B2B coaches act as a viral acquisition channel, each bringing
  10-20 clients on average.
- Programmatic SEO and AI-generated short-form video can substitute
  for paid acquisition.
- AI customer support can deflect 70-86% of tier-1 inquiries.
- The pricing undercut (£2.99 vs MacroFactor's £9.50) is a
  customer-acquisition lever.
- The DUAA 2025 and UK GDPR posture is a regulatory moat against
  less disciplined competitors.

Some of these claims are likely directionally correct; others are
likely wrong or assume conditions Volyume doesn't have (existing
audience, marketing budget, willingness to use AI content). Treat
the list as hypotheses, not findings.

## Hard constraints (do not propose violations)

These are non-negotiable. Recommendations that ignore them are not
options.

- **No LLM in the product.** Not in Precision Coaching, not as a
  recipe parser, not as a Complete-tier utility, not anywhere
  user-facing. The deterministic-engine promise extends across the
  entire product. Don't propose LLM features.
- **No AI-generated marketing content.** No programmatic SEO with
  LLM narrative blocks. No AI video generation pipelines. No AI
  voiceover, no AI-written long-form. Allan has explicitly rejected
  this on voice-rule grounds (mass AI content has AI tells by
  default; Google's March 2024 spam update penalises programmatic
  AI content) and on the basis that AI content can't meet Volyume's
  voice quality bar.
- **Voice rules apply to all marketing copy.** No em dashes. No AI
  tells ("let me", "I'll", "certainly", "absolutely", "dive into",
  "delve into", "leverage", "utilise", "facilitate", "robust",
  "seamless", "streamline", "comprehensive", "ensure" as filler).
  No marketing jargon ("crush", "shred", "beast mode", "perfect",
  "guaranteed", "hacks", "level up"). British English. No emoji in
  functional UI. Plain English. No bare researcher surnames in
  surface copy. See `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`.
- **Volyume sits alongside coaches, not above them.** Marketing
  copy must never imply Volyume replaces a coach.
- **Budget posture.** £0 recurring infrastructure target. Paid
  services only approved when MRR covers them 2x. Free tiers
  everywhere possible. See `docs/BUDGET_POSTURE_LOCKED.md`.
- **Cold start is real.** Strategies that assume an existing
  audience, mailing list, podcast, or warm coach network are
  irrelevant. The founder cannot bootstrap from his own
  distribution because he doesn't have any.
- **4-week launch horizon.** Open beta starts in ~4 weeks. The
  growth strategy must include the first 90 days post-launch as the
  most-detailed slice; longer horizons are secondary.

## The problem

Volyume has built a defensible product. The locked decisions are
sound. But without a path to acquire the first 1,000 paying
consumers and the first 100 coaches **from cold**, the product
launches into silence.

The standard fitness-app growth playbook (existing audience pours
in, paid acquisition fills the rest, AI content scales the funnel)
is unavailable to Allan. We need an evidence-based growth playbook
that works:

1. With no existing audience.
2. With near-zero marketing budget at launch (scaling as MRR
   permits).
3. With strict voice rules that bar AI-generated content.
4. In the UK fitness-app market specifically.
5. Within the constraints of a sole founder holding a full-time
   role outside Volyume.

The 10 pillars below scope what the research needs to surface.

## The ten research pillars

For each pillar return: a tight prose synthesis of what the
literature supports, the strongest 2-4 primary citations with DOIs
or stable URLs, contested findings named explicitly, and one
paragraph of practical implications for Volyume specifically.

### 1. Cold-start growth for evidence-based fitness apps without an existing audience

How did the apps Volyume competes with (MacroFactor, Carbon Diet
Coach, RP Hypertrophy, Stronger By Science Strength, Hevy, Strong)
actually bootstrap their first 1,000 paying users? Where did
founder Greg Nuckols, where did Mike Israetel, where did the
MacroFactor team start? Distinguish "had an existing audience and
poured it in" (the Stronger By Science case) from "had to start
cold" (most others). For the cold-start cases, what specifically
worked? Reddit organic? App Store search? Product Hunt? Hacker
News? Specific creator partnerships?

What does the published founder-interview literature say about the
first 90 days for fitness apps that didn't have a network to draw
on?

### 2. Coach acquisition from cold start in the UK strength and physique space

The Volyume B2B model assumes a path to 100+ coaches. Without
Allan's existing network, how does that path actually look?

Map the UK strength / physique coach population: how many
practising online coaches exist in the UK? Where do they
congregate online (UKSCA forums, Facebook groups like UK Fitness
Pros, the OPEX UK community, certification body alumni groups, ASCA
or NSCA UK chapter events, BWLA, Stronger By Science membership,
RP coach community)? Which of those are open to founder cold-DM
outreach and which aren't?

What's the realistic acquisition rate (coaches per week) when a
sole founder with no existing reputation does cold outreach in
those channels? What CAC has been measured for coach-app
acquisition specifically (Trainerize, TrueCoach, MyPTHub case
studies)?

What does the published evidence say about coach willingness to
switch platforms (it's high friction; the migration tools in the
locked Volyume B2B scope address this), and the realistic
penetration curve for a new entrant in this space?

### 3. Consumer cohort archetype and acquisition channels

Who is the realistic Volyume consumer? The locked product appeals
to a specific archetype: intermediate UK lifter who reads
evidence-based content, can't justify £100+ per month for a real
coach, wants the safety net of a proper engine, dislikes
MyFitnessPal's "good food / bad food" framing, has the patience
for weekly check-ins.

Find the published or industry data on where this archetype
actually lives online. Specifically:

- UK subreddits (r/fitness, r/leangains, r/StrongerByScience,
  r/StartUpFitness, r/xxfitness, r/UKfitness) - what are the
  realistic install / conversion rates from organic founder
  participation, and how do moderators react to founders posting?
- YouTube comment sections of evidence-based UK creators (Will
  Tennyson, James Linker, Mike Thurston, Eugene Teo).
- Podcast listeners (Stronger By Science Podcast, MASS Office Hours,
  Iron Culture, 3DMJ Podcast, Revive Stronger).
- Specialist Facebook groups in the UK lifting community.

What's the realistic install conversion rate from each of these
channels for a UK fitness app at the £6.99 Complete price point?

### 4. The viral coefficient of B2B coach-to-client conversion

Allan's research assumes one coach brings 10-20 clients who install
Volyume. What's the actual published evidence on this in the
coaching-app market?

When Trainerize / TrueCoach / MyFitnessPal Premium / Cronometer
have coach-mandated-client-install programmes, what % of mandated
clients actually install? What % continue using the app after the
coach link ends? What does the friction look like, and what
mitigates it?

For Volyume specifically (where the coach pays and the client gets
Complete free), is the conversion likely higher (because the client
gets value for free) or lower (because the client didn't ask to be
there)? Find the analogous case studies.

### 5. Pricing elasticity in the UK consumer fitness-app market

Volyume's standard price (£2.99 Pro / £6.99 Complete) is a deep
undercut against MacroFactor (£9.50/mo equivalent) and Carbon
(£11.99/mo). Is the undercut a customer-acquisition advantage, or
does it signal low quality and reduce perceived value?

What's the published evidence on price elasticity in subscription
fitness apps specifically? Is the £2.99 / £6.99 ladder the right
spread, or should the gap be wider / narrower? What does the
research say about price anchoring at the cascade gates (the user
sees £1.99 first, then £0.99, then "drop to free")?

Specific question: is there evidence that the £2.99 Pro price will
attract a less-committed cohort with worse retention than a £6.99
Pro price would? This matters for the £100k ARR pathway because
churn destroys low-price plans.

### 6. Differential paywall: deterministic six triggers vs ML-optimised timing

The locked Move #4 paywall is six deterministic trigger contexts
(stalled lift, extreme soreness, deload, missing TDEE, block
summary, energy crash). Allan's research proposed an ML classifier
choosing the timing. He's held the deterministic version for v1 but
open to ML for v1.1 if evidence supports it.

What does the published evidence say about ML-optimised paywall
timing vs deterministic trigger logic in fitness apps specifically?
At what scale does the ML approach start to outperform (it needs
enough event data to train; below that, deterministic rules likely
win)? What does Spotify, Headspace, Calm publish about their
paywall optimisation? What did the JMIR mobile-health literature
identify as the threshold where personalised timing beats fixed
rules?

If the answer is "ML wins at scale X," tell us what X is and
whether Volyume is likely to hit it in year one.

### 7. Retention benchmarks for paid fitness apps

What's the realistic 30 / 60 / 90 / 180 / 365 day retention for
paid fitness apps in the UK at our price point? Best-in-class
numbers from published data (Strong, Hevy, MacroFactor have shared
some). Median numbers. Bottom-quartile numbers.

What specifically drives churn at each stage? At what point does
the curve stabilise (the "core users" floor)?

For Volyume specifically: the cascade trial (14d Complete, 14d Pro,
then Free) is unusual. Most apps use a 7-day or 14-day single-trial
model. What's the published evidence on multi-stage trial cascades
and their conversion / retention vs single trials?

### 8. App Store Optimization (ASO) for evidence-based fitness apps in the UK

ASO is the one acquisition channel that doesn't need AI content,
doesn't need an existing audience, and doesn't need paid spend.
What does best practice look like for a UK fitness app launching
into the Health & Fitness category in 2026?

Specifically: which keywords drive the most-qualified install
traffic for evidence-based UK lifters? What's the realistic
install-to-paid conversion rate for organic App Store / Play search
traffic at our price point? What ASO tactics (title, subtitle,
screenshots, preview video, in-app event content for Apple)
actually move the needle, and which are theatre?

What are the published case studies of small fitness apps that won
on ASO alone?

### 9. Acquisition channels with measured CAC for fitness apps, that do NOT rely on AI-generated content

Real numbers, not vibes. For each channel listed, find published or
disclosed CAC and conversion data for fitness apps in the £3-7/mo
price range:

- **Reddit organic founder participation** (NOT paid ads).
  Posting in r/Fitness, r/leangains, etc. Subreddit-specific rules.
  Conversion rates.
- **Podcast sponsorships** (Stronger By Science Podcast, MASS, Iron
  Culture, Revive Stronger, 3DMJ). What does a 60-second mid-roll
  cost? What's the realistic install rate per 1000 listens for a
  fitness app?
- **YouTube creator partnerships** (Will Tennyson, James Linker,
  Eugene Teo, Mike Thurston, Geoffrey Verity Schofield). What's the
  realistic cost and CAC?
- **PR / press** (Strength & Conditioning Journal, T-Nation,
  Stronger By Science articles, MASS reviews). Can a new app get
  reviewed editorially? What's the path?
- **Apple Featured / Google Play Editor's Choice.** What does the
  application process look like? What gets selected?
- **Founder-as-channel** (Allan posting on X / Threads / Bluesky /
  Instagram / TikTok using his own face and voice, not AI). What's
  the realistic 12-month organic follower growth and install
  conversion from posting consistently in this category?

### 10. What kills fitness apps in months 0-12, applied to Volyume's specific risks

The Kidman et al. 2024 abandonment taxonomy (JMIR 26:e56897, DOI
10.2196/56897, 525,824 participants, 22 churn drivers in 6
categories) is verified primary evidence. Apply it specifically to
Volyume's locked product and cold-start position.

Predict the top 5 churn risks for Volyume in months 0-12. For each:
the Kidman driver category it maps to, why Volyume is specifically
exposed, the early warning signals in our telemetry that would
catch it, and the specific mitigation given our locked constraints
(no LLM, no AI content, sole founder, no budget).

What does the published evidence say about which of these risks
typically kills fitness apps in the first year specifically?

## Required deliverable shape

### Part 1: Findings, by pillar

Per pillar: 4-8 sentences of prose synthesis, 2-4 primary citations
with DOIs or URLs, contested findings flagged, one paragraph of
practical implications for Volyume.

### Part 2: Two scenario pathways

**Pathway A: £100,000 profit per year, realistic 12-month target.**

Detail the month-by-month cohort assumptions, channel mix, and
conservative conversion rates that get from cold start to ~£130-150k
ARR in 12 months. Explicitly call out: how many coaches by month X,
how many consumer subscribers by month X, what channels deliver
them, what the realistic CAC is per channel, and what total
"founder hours per week" the plan demands (it must fit alongside a
full-time job).

**Pathway B: £1,000,000 ARR stretch goal, 24-36 month horizon.**

What would need to be true to hit this? What's the realistic
fastest path? What are the 3-5 specific things that have to break
the right way (e.g. one viral creator endorsement, one major
press feature, the coach viral coefficient landing at 12x rather
than 4x). For each, flag the probability honestly.

### Part 3: The three sharpest specific recommendations

Three actions Allan should take in the first 90 days post-launch,
prioritised by ROI and tractability given the cold-start position.
Each: what it is, why it's the top of the priority list, what it
costs in money and time, what success looks like at day 30 / 60 /
90.

### Part 4: What to NOT do

5-10 tactics that look attractive but the evidence says don't work
for Volyume's specific profile. Each with the why. This catches
shiny-object thinking before it eats founder time.

### Part 5: Open questions only user research or A/B testing can answer

What can't be answered from literature, only from running the
actual experiment? Frame each as a specific testable hypothesis
with a kill criterion.

### Part 6: Pressure-test of Allan's existing research

For each of the six claims listed in "What Allan's existing
research established" earlier in this brief, name verified or
falsified. Provide the evidence. If a claim is directionally right
but the magnitude is wrong, say so.

## Constraints on the deliverable itself

- Apply Volyume's voice rules to your own output. No em dashes. No
  AI tells. British English. Direct. Precise.
- Cite primary sources, not blog posts or vendor marketing pages,
  where possible. If you cite a Twitter thread or a YouTube
  interview, name it and timestamp it.
- Keep the total deliverable to roughly 5,000-7,000 words. Tight is
  better than thorough.
- Use prose for the findings sections. The recommendations and
  failure-modes deserve lists.

## What you're NOT being asked to do

- Marketing copy. We don't need taglines, slogans, ad creative.
  Just the strategy.
- Visual / brand identity. Out of scope.
- Engineering architecture. Locked.
- Product strategy. Locked.
- AI-content generation tactics. Off the table by founder decision.
- General "how to grow a SaaS" essays. Stay specifically on UK
  fitness apps in the £3-7/mo price range with a cold-start
  founder.
- LLM-feature recommendations. There are no LLMs in this product.

---

End of brief. Run independently; do not condition your output on
the other AI's response. We'll synthesise across both passes after,
with citation pressure-testing.

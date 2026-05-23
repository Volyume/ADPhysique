# Coaching voice synthesis (LOCKED)

Single source of truth for Volyume's user-facing voice. Combines the
three deep-research passes (Gemini, ChatGPT, Claude) on
`COACHING_VOICE_RESEARCH_BRIEF.md`. Citations marked `[PENDING AUDIT]`
will be replaced with verified references when
`COACHING_VOICE_CITATION_AUDIT.md` completes. This document supersedes
the three individual passes for any voice-related decision and
extends `CLAUDE.md` plus `DESIGN_SYSTEM.md`.

Locked principles already triangulated; surface re-drafts already
applied with Precision Coaching naming; only specific citations and
two contested questions wait on the audit.

## 1. The non-negotiable foundation: honesty about decision authority

Triangulated across all three passes. Load-bearing pillar.

Precision Coaching makes the decisions: weekly targets, holds,
adjustments. The user logs, trains, eats, weighs in, checks in. The
user's input is behaviour, not negotiation. Phrasing that implies
shared decision-making ("we'll work it out together", "let's
decide", "your call") is factually false in Volyume and breaks
trust the moment the next one-way weekly output lands.

The **honesty test sentence** for every line of engine output:

> Would this sentence still be true if the user did nothing but kept
> logging?

If no, rewrite. "We'll work out the next step together" fails (the
user doesn't work anything out). "Precision Coaching will reassess
at the next weekly run" passes.

Allowed first-person plural: "we" used by the Volyume team in
support, marketing, policy, and "the team behind Volyume". Banned
first-person plural: "we" used inside Precision Coaching output to
imply shared decision-making with the user.

Evidence: SDT autonomy-support literature [PENDING AUDIT:
Ntoumanis 2021], explainable-AI trust [PENDING AUDIT: Kaur 2020],
product-copy ethics [PENDING AUDIT: Lakkaraju & Bastani 2020], trust
model [PENDING AUDIT: Mayer Davis Schoorman 1995]. Convergent
across all three deep-research passes.

## 2. Three voice registers (all share the honesty rule, differ in warmth)

Triangulated across all three passes. Stage names from the Gemini
pass, content cross-referenced.

### Stage 1: Cold-start factual (onboarding, weeks 0-2)

A user this early hasn't seen Precision Coaching do anything yet.
Warmth read as marketing or as patronising. The only currency that
builds trust at this stage is **accuracy of observation and
honesty about what Precision Coaching cannot yet see**. No
"welcome aboard". No "we're excited". No inferred-state language.
No premature praise.

Example permitted opener: "Precision Coaching has set your starting
target at 2,650 kcal. The reason: your weight, height, age,
activity, and the goal you picked. Precision Coaching cannot yet
see your food log. You can add it any time."

Example banned opener: "Welcome to Volyume. Let's work together to
hit your goals."

### Stage 2: Warmed-by-data (weeks 3+)

After the user has seen Precision Coaching read the data, set
targets, catch a stall, suggest a deload, the relationship has a
real record. Modest warmth is now permitted, drawn entirely from
that record. Affirmations of effort that reference specific logged
data are appropriate. Reflective summaries are appropriate.

Example permitted line: "You logged 19 of the last 21 days. Bench
is up 5 kg, your weight is down 1.4 kg, energy held above 6 on 12
of 14 days."

Inferred-state language remains banned: "you've been working hard"
is fine if it's true on the data (sessions completed, days logged);
"you must be tired" is not (inference, not observation).

### Stage 3: Safety-cold (any week)

When a safety hold fires (ED-pattern lockout, FFM floor hold,
rapid-loss correction), warmth **tightens**, not loosens. The
register becomes more clinical, more specific, more anchored to
numbers, and externalises the **pattern**, not the person.
Motivational filler is a measurable risk to the at-risk subgroup
[PENDING AUDIT: Eikey 2021, Cruz 2025, Cerea 2025] and is banned in
this register.

Externalisation rule (from FBT, [PENDING AUDIT: Rienecke & Le
Grange 2022]): the **trajectory** is the object of concern, not
the user. "This pattern — weight falling fast plus low energy plus
eating under target — is the one that breaks cuts" is correct.
"You're being too aggressive" is not (locates the problem in the
user). Note the FBT caveat that externalisation can be perceived as
dismissive if overdone.

## 3. The phrasing patterns (LOCKED)

Fifteen patterns deduplicated from the three passes. Each is a hard
spec for copy review.

1. **Precision Coaching as named actor.** Name Precision Coaching as
   the decision-maker for any automated decision. The user is the
   actor for their behaviour. Example: "Precision Coaching has held
   your calorie target steady this week. The reason: your weight
   has dropped 1.6 kg in three weeks." Avoids false collaboration.

2. **Numbers before narrative.** Open with the observation in
   numbers; prose follows. Example: "Weight down 1.6 kg in three
   weeks. Energy below 5 on 8 of 14 days. Food log: most days under
   target." Avoids hand-waving and aligns with the existing
   "numbers are the hero" rule.

3. **Mirror data, never infer state.** State what the user logged,
   not what the user felt. Example: "Your log shows 600 kcal under
   target on most days." Not: "You've been pushing too hard."
   Avoids paternalism and intrusion.

4. **Externalise the pattern, not the person.** The trajectory is
   the object of concern. Example: "This pattern is the one that
   breaks cuts." Avoids shame.

5. **Upward counterfactual without sales register.** Name what
   Precision Coaching could resolve with missing data. Precision
   Coaching is the beneficiary, the user is not the deficient
   party. Example: "Precision Coaching cannot tell from training
   alone whether your bench has stalled. With food data, it could
   separate training from fuel." Avoids nagging upsell.

6. **Rationale-attached prescription.** Every prescription has a
   one-sentence reason in plain English. Example: "Precision
   Coaching has held the target steady. The reason: when the
   deficit gets too sharp for too long, the body holds onto fat and
   starts breaking down muscle."

7. **Action-belongs-to-user.** The actions named for the user are
   only the things the user can actually do. Example: "Your work
   this week: log, train, eat to the target, weigh in."

8. **Honesty-test sentence.** Every sentence in Precision Coaching
   output passes "would this still be true if the user did nothing
   but kept logging?". If no, rewrite.

9. **No motivational filler without data referent.** Never affirm
   without a referent in the data. Example: "Energy held above 6 on
   12 of 14 days." Not: "You're doing great."

10. **Plain-mechanism language.** Substitute jargon with one-clause
    mechanism. Example: "Your body holds onto fat and starts
    breaking down muscle to fuel itself." Not: "Catabolic substrate
    utilisation increases." Substitute "TDEE" with "the calories
    your body uses." Substitute "FFM" with "lean mass" or "muscle."

11. **One decision per screen.** A surface delivers one Precision
    Coaching decision and its reason. A goal-lock screen does not
    also try to upsell.

12. **Cold-start trust by accuracy, not warmth.** In weeks 0-2,
    credibility comes from Precision Coaching being demonstrably
    accurate about what it sees and honest about what it cannot.

13. **Safety-cold register.** When a safety hold fires, warmth
    tightens. Clinical specificity replaces coaching warmth.

14. **Volyume alongside coach, never replacing one.** Where the user
    has a linked coach (phase 2), Precision Coaching references the
    coach as the other adult in the room. Where there is no linked
    coach (v1), Precision Coaching does not pretend to be one.
    Example: "If a coach is supporting you, this is the kind of
    pattern they would want to see." Phase 2 surface can say
    "Your coach can see this hold in their dashboard."

15. **No fake-autonomy framing on locked decisions** (from the
    Claude pass, [PENDING AUDIT: 2024 experiment showing fake
    autonomy-supportive language reduced behavioural intentions
    through reactance]). Reserve "could", "might", "consider" for
    places where the user genuinely has a choice. Where Precision
    Coaching has already locked a decision, state the decision
    directly. "Eat to the target this week" passes; "you could
    consider eating to the target this week" fails because the
    target isn't optional.

## 4. Voice rules layer (additive to existing CLAUDE.md and DESIGN_SYSTEM.md)

The existing voice rules continue to apply: no em dashes, British
English, no AI tells, plain spoken voice, no jargon, alongside
coaches not above. The following new rules layer on top.

- **Precision Coaching** is the named decider for engine output, not
  "the engine", not "the system", not "the algorithm". Use as a
  proper noun ("Precision Coaching has set") or as a possessive
  ("your Precision Coaching adjusts at the next check-in").
- **Honesty test** applies to every Precision Coaching output line.
- **Numbers-before-narrative** is the default sentence structure.
- **Mirror-not-infer.** No emotional inference. No "you must feel".
- **No moral labels on food.** "Good", "bad", "unhealthy",
  "clean", "junk" are banned in surface copy about food.
- **No fake-autonomy on locked decisions.** Reserve "could/might"
  for genuine choices.

## 5. Locked surface re-drafts

Each surface gets:
- The voice register it operates in (Stage 1/2/3).
- The pattern numbers applied (cross-referencing Section 3).
- The locked copy block.
- Notes on what was rejected and why.

### Surface 1: Safety hold card (ED-pattern lockout, FFM floor hold, rapid-loss correction)

Register: Stage 3 (safety-cold). Patterns: 1, 2, 3, 4, 6, 7, 8, 10, 13, 14.

```
Header: Pause week
Title:  Precision Coaching has held your calorie target steady

Body:   What Precision Coaching sees.
        Weight down 1.6 kg in three weeks. Energy scores below 5
        on 8 of the last 14 days. Food log: most days under target.

        Why this matters. This pattern — weight falling fast, low
        energy, and eating under target — is the one that breaks
        cuts. When the deficit gets too sharp for too long, the
        body holds onto fat and starts breaking down muscle to fuel
        itself. Training quality drops. Recovery slows. Hunger that
        has been quiet so far catches up, often all at once.

        Precision Coaching has held your calorie target at its
        current number this week. Your work this week: keep
        logging, keep training, eat to the target (not under it),
        weigh in as normal.

        Next step. Precision Coaching will reassess at the next
        weekly run. If energy holds above 6 and the weight loss
        rate slows for two weeks, the target will move again.

        If a coach or clinician is supporting you, this is the kind
        of pattern they would want to see.

If goal_lock_advanced was true at flag time, body extension:
        You set a goal lock for an aggressive cut, so Precision
        Coaching held off until three signals stacked up instead
        of two. That happened this week. The advice stays the
        same: hold the target, look after your energy, and the
        target will move again when the signals settle.

CTAs:   [ Get support ]  -- Beat (UK), NEDA (US), Butterfly (AU) by device locale
        [ Why this hold ] -- opens info panel
```

Rejected: "Let's give your body a moment" (false collaboration).
"We'll work out the next step together" (factual lie). "You've
been doing too much" (inferred state). The "you might consider"
softening (fake autonomy on a locked decision).

### Surface 2: Differential paywall triggers (Move #4)

Register: Stage 2 (warmed by data). Patterns: 1, 2, 5, 14.

Six contexts share the same structure. Below: stalled lift as the
example; the other five (extreme soreness, deload, missing TDEE,
block summary, energy crash) follow the same template with the
data line and the "what Precision Coaching can't see" line
adapted.

```
Title:  Your bench has not moved in three weeks
Body:   Last estimated 1RM: 102.5 kg, unchanged since 28 April.

        Precision Coaching cannot tell from training data alone
        whether the cause is training load or fuel. With your food
        log, it could separate the two.

        Pro includes the food log. 14 days, free, no payment now.

CTAs:   [ Try Pro free for 14 days ]
        [ Not now ]
```

Rejected: "Don't miss out" / "act now" / "your gains depend on it"
(false urgency, sales register). The day-14 trial CTA reverts to
"Get Pro" pricing once the user's trial entitlement is used.

### Surface 3: Article 9 health-data consent screen

Register: Stage 1 (cold-start factual). Patterns: 2, 7, 8, 10, 11, 12.

```
Title:    Health data permission
Subtitle: (none)

Body:     For Volyume to coach you, Precision Coaching needs to
          read and store the health data you log.

          What Precision Coaching will store, if you agree:
          - your weight
          - your body fat percentage (if you log it)
          - what you eat
          - your weekly check-ins (energy, recovery, how you feel)
          - the screening questions you answered about eating

          What Precision Coaching does with it:
          - sets your weekly calorie and training targets
          - holds your target steady if signs of under-eating or
            rapid weight loss show up together
          - shows your linked coach, if you have one (phase 2)

          What never happens:
          - never sold
          - never shared with advertisers
          - never used to train a public AI model

          Where it lives:
          - on your phone, in encrypted local storage
          - on Volyume's servers in the UK, with strict access
            controls
          - all of it removed within 30 days if you delete your
            account

          UK and EU data law (Article 9 of GDPR) requires explicit
          consent for this. This consent is separate from the
          Volyume terms of service.

CTAs:     [ ] I agree to Volyume storing this data so Precision
              Coaching can coach me.

          [ Continue ]   (disabled until ticked)
          [ Read the full privacy policy ]
```

Rejected: "Storage of health metrics" (corporate jargon). Generic
GDPR boilerplate (legal-document register).

### Surface 4: Onboarding goal-lock screen

Register: Stage 1 (cold-start factual). Shown only for
physique_competition or advanced_recomp goal selections. Patterns:
1, 6, 7, 8, 11, 12, 15.

```
Title:  A note on aggressive cuts
Body:   You picked a goal that involves an aggressive cut.
        Precision Coaching can support that, with one tradeoff
        you should know about.

        Volyume has safety checks. If signs of under-eating and
        rapid weight loss show up together, Precision Coaching
        holds the calorie target so the cut doesn't get sharper.
        These checks are there for the at-risk users that
        calorie-tracking apps have historically harmed.

        For an aggressive cut, Precision Coaching can raise the
        bar before those checks fire, so a competition prep
        doesn't get held up at the standard threshold.

        Choose one:

        (•) I'm experienced with aggressive cuts, or I'm working
            with a coach. Raise the safety threshold from 2
            signals to 3.
        ( ) I'd rather keep Volyume's standard safety checks.

        Either choice keeps the absolute safety floor (eating
        below the minimum lean-mass energy threshold) in place.
        You can change this any time from You -> Goal lock.

CTAs:   [ Continue ]
```

Rejected: "unhealthy patterns" (banned moral label, Claude's
inconsistency in its own pass). "We can apply a Goal Lock" (Claude
phrasing — sounds bureaucratic). "Recommended" tag on the standard
option (premature paternalism for a Stage 1 user).

### Surface 5: Cascade trial transitions (Move #5)

Register: Day 14 modal is Stage 1-2 transitional. Day 28 modal can
warm to Stage 2 (the user has 28 days of demonstrated competence
to point to). Failure banner stays Stage 1 (3am payment failures
shouldn't feel punitive). Patterns: 1, 2, 7, 8, 11, 15.

```
Day 14 ("Complete trial ends, choose Pro or pay"):
Title:  Your Complete trial ends today
Body:   14 days in.

        What Precision Coaching has done:
        - 2 weekly target updates
        - 1 deload recommendation
        - food log integrated on 11 of 14 days

        What happens next:
        - Stay on Complete: keep all features and the locked-in
          founders/open-beta price.
        - Switch to Pro: keep the engine and food log; lose Peak
          Week module, photo timeline, body composition charts,
          coach link.
        - Drop to Free: keep your training data, lose the
          adaptive updates and food log.

CTAs:   [ Stay on Complete (£1.99/mo, locked for life) ]
        [ Switch to Pro (£0.99/mo) ]
        [ Drop to Free ]
```

(Pricing shown reflects open-beta window; replace with the
current window from `catalogue.js` at render time. Do NOT hard-code
specific prices in copy strings — read from the catalogue.)

```
Day 28 ("Pro trial ends, choose Pro or Free"):
Title:  Your Pro trial ends today
Body:   28 days in. You logged on 24 of 28 days. Weight is down
        1.2 kg. Energy averaged 6.2 out of 10.

        Precision Coaching has run 4 weekly updates and held the
        target steady once when energy dipped.

        What happens next:
        - Stay on Pro: keep the engine, food log, and weekly
          updates at the price you locked in.
        - Drop to Free: keep your training data, lose the
          adaptive updates and food log.

CTAs:   [ Stay on Pro ]
        [ Drop to Free ]
```

```
Subscription-failure banner (in-app):
Title:  Payment didn't go through
Body:   Precision Coaching kept your data and your current target.
        Nothing has changed.

        Update billing in [Apple ID / Google Play] within 3 days
        to keep your tier. After 3 days the account moves to
        Free; your data still stays.

CTAs:   [ Open billing ]
        [ Remind me later ]
```

Rejected: countdown timers, "save 50%", "don't lose your gains"
(false urgency). "We'll keep your data" (Volyume marketing-we is
fine in some places, but here Precision Coaching is the actor and
"Precision Coaching kept" is more honest).

### Surface 6: Notifications (push, max 80 char body)

Register: Stage 1 (cold factual). Patterns: 1, 2, 7, 11. ED-pattern
flag is locked in-app only and is not in this list.

```
Daily check-in reminder:
"Today's check-in is open. Weight, energy, sleep. Two minutes."

Weekly check-in reminder:
"Weekly check-in is open. Your update lands Monday morning."

Weekly coach output ready:
"This week's update is ready. Precision Coaching has set new
targets."

Cascade gate (day 12 of 14):
"Your Complete trial ends in 2 days. Tap to choose what's next."

Cascade gate (day 26 of 28):
"Your Pro trial ends in 2 days. Tap to choose what's next."

Subscription payment failure:
"Payment didn't go through. Precision Coaching kept your data.
Update billing in Settings."

Subscription about to expire (after user-initiated cancellation):
"Your subscription ends on [date]. After that you'll drop to Free.
Your data stays."
```

Rejected: exclamation marks, "Don't miss out", "Last chance"
(false urgency). Generic motivational pushes ("Crush today!").

### Surface 7: Cleared / recovery copy

Register: Stage 3 tipping into Stage 2. Patterns: 1, 2, 3, 6, 9, 13.

```
Title:  Hold lifts at the next weekly run
Body:   What Precision Coaching sees. Energy scores held above 6
        for two weeks. Weight loss rate slowed to 0.3 kg per
        week. Food log shows you eating to the target.

        What changes. Precision Coaching will move your calorie
        target down again at the next weekly run, in a smaller
        step than before. The reason for a smaller step: the
        body responds more durably to a steady pull than a
        sharp one.

        Your work stays the same. Log, train, eat to the target,
        weigh in.
```

Rejected: "You've turned a corner" (motivational filler that risks
reinforcing restriction). "Fantastic work" (banned by spec).
"Take it gently from here" (autonomy-violating directive).

### Surface 8: Existing weekly coach output (legacy `whyThisTemplates.js` and `weeklyCoach.js`)

The legacy strings in the live app already use a direct factual
register, which is closer to Stage 2 than the new copy ever was.
But they use generic "the system" phrasing in places, and they
predate the honesty-test and the explicit naming of Precision
Coaching as the decider.

The implementation pass after this synthesis will go through every
exported string in `whyThisTemplates.js` (the 12 WHY_LIBRARY keys)
and every output line in `weeklyCoach.js`, rewriting to the
Section 3 patterns. The voice doesn't change dramatically — the
existing register is already most of the way there — but every
sentence will pass the honesty test and every reference to
"the engine" or "the system" becomes "Precision Coaching."

That mechanical pass happens in a separate move, sequenced before
Move #2 (ED-pattern detection) so the new safety-hold copy and
the legacy weekly-coach copy ship to users in one consistent voice
rather than landing as a mismatched pair.

## 6. Failure-mode catalogue (LOCKED)

Hard-block any of these in copy review. Linter-enforceable.

| Failure phrase | Why it fails | Use instead |
| --- | --- | --- |
| "We'll work this out together" / "let's decide" / "your call" | Factual lie. Precision Coaching decides, user logs. Fails honesty test. | "Precision Coaching will reassess at the next weekly run." |
| "You're doing amazingly" / "great job" / "fantastic" | Motivational filler without data referent. For at-risk subgroup, "amazing" applied to weight loss reinforces restriction. | "Weight down 1.4 kg in four weeks. Energy held above 6 on 12 of 14 days." |
| "You're being too hard on yourself" / "you must be discouraged" | Inferred state. Precision Coaching cannot read self-criticism. | Name the data Precision Coaching sees, do not name the user's inner state. |
| "Unhealthy pattern" / "bad habits" / "junk food" | Moral category the at-risk subgroup uses against themselves. CBT-E avoids "unhealthy". | "This pattern is the one that breaks cuts" or "rapid weight loss with low energy." |
| "Don't worry, we've got you" | False promise. Volyume does not "have" the user. Volyume sits alongside coaches, not above them. | "Precision Coaching has set X. Your work this week is Y." |
| "Crush this week" / "shred" / "beast mode" | Already banned by CLAUDE.md. Contraindicated for at-risk subgroup. | Name the work in factual terms. |
| "Streak broken" / "you missed a day" | Shame trigger. In ED-and-app qualitative literature, streak language drives abandonment. | "You logged on 19 of 21 days this block." |
| "AI has analysed your data" | Violates the deterministic-engine spec; users may infer Precision Coaching learns about them in ways it does not. | "Precision Coaching applied its rules to your data." |
| "You need to eat more" / "you should" / "you must" | Controlling. For at-risk subgroup, triggers reactance. | "Precision Coaching held the target. The reason: rapid loss plus low energy plus eating under target. Eat to the target this week." |
| "It's up to you" / "you decide" (on a locked target) | Fake-autonomy framing. Backfires per Claude's [PENDING AUDIT: 2024 reactance experiment]. | State the locked decision directly. |
| "Storage of health metrics" / GDPR boilerplate | Corporate register. Reads as legal document, not coach. | Plain English ("the health data you log"). |
| "How do you feel about your progress?" | Open question in a one-way surface. User frustrates trying to respond. | State observation, give rationale, state next step. |
| "Save 50% now" / "act now" / "don't miss out" | False urgency. App-abandonment literature [PENDING AUDIT: Kidman 2024] lists urgency framing among churn drivers. | State the option and its tradeoff calmly. |
| "Volyume coaches you better than any human" | Violates "alongside coaches not above them" rule. | Volyume helps you get more out of any coach you work with. |
| "We've adjusted your plan with AI" | Violates deterministic-rules framing. | "Precision Coaching has adjusted your plan." |

## 7. Application to existing locked docs

The implementation pass mapping. For each existing locked doc that
contains user-facing copy, the synthesis says which patterns apply
and what changes. The string-by-string rewrite happens in the
implementation move that follows.

| Existing doc | Surfaces it locks | Voice changes required |
| --- | --- | --- |
| `UI_FLOWS_LOCKED.md` | All UI screens | Apply pattern 1 (Precision Coaching naming) everywhere. Replace "the engine" / "the system" with "Precision Coaching." Re-check empty-state strings against pattern 9 (no motivational filler). |
| `ONBOARDING_SEQUENCE_LOCKED.md` | Screens 3, 6, 10, 12 | Surface 3 redraft is in Section 5 above. Surface 4 redraft is in Section 5 above. Screen 10 (food layer intro) and 12 (first-run summary) need pattern-1 retrofit. |
| `PRIVACY_CONSENT_LOCKED.md` | Article 9 consent, deletion confirmation | Use Surface 3 redraft for Article 9. Deletion-confirmation copy is already largely in voice; check for "we" misuse. |
| `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` | All cascade and billing surfaces | Use Surface 5 redrafts. Replace specific prices in copy with placeholders that read from `catalogue.js` at render time. |
| `NOTIFICATIONS_LOCKED.md` | All push categories | Use Surface 6 redrafts. Update existing copy table with new lines. |
| `MOVE_2_ED_PATTERN_DETECTION.md` | ED-pattern lockout, cleared variant, goal-lock onboarding | Use Surface 1 (lockout), Surface 7 (cleared), and Surface 4 (goal lock) redrafts. The currently-locked copy in this doc is replaced wholesale. |
| `MOVE_3_UPWARD_GATE_COMPRESSION.md` | Rapid-loss correction held-decision card | Apply Surface 1 template (Stage 3 safety-cold). Specific text drafted at Move #3 implementation. |
| `MOVE_4_DIFFERENTIAL_PAYWALL.md` | Six conversion-trigger contexts | Use Surface 2 template for all six. The six locked copy lines in this doc get rewritten to the new template. |
| `MOVE_5_TIER_INFRASTRUCTURE.md` | Cascade gate screens, restore-purchases flow | Use Surface 5 redrafts. |
| `src/lib/whyThisTemplates.js` | 12 WHY_LIBRARY keys | Surface 8 mechanical pass. Each key's copy retrofitted to patterns 1, 2, 6, 8, 9, 10, 15. Each output line passes the honesty test. |
| `src/lib/weeklyCoach.js` | Weekly coach output assembly | Surface 8 mechanical pass. Output strings retrofitted. Internal logic unchanged. |

## 8. Evidence base and confidence ratings

Confidence per principle, pending the citation audit completion:

| Principle | Confidence | Source convergence |
| --- | --- | --- |
| Honesty about decision authority | High | All 3 passes converge. Trust model and xAI literature both cited. |
| Three-stage voice register | High | All 3 passes converge. |
| Numbers before narrative | High | All 3 passes converge. Aligns with existing DESIGN_SYSTEM.md. |
| Mirror-not-infer | High | All 3 passes converge. |
| Externalise the pattern, not the person | Moderate | Convergent. FBT caveat (overdoing externalisation reads as dismissive) noted. |
| Plain-mechanism language | High | Convergent. Lang 2025 evidence verified in prior research round. |
| Upward counterfactual framing | High | Kuhl 2023 verified in prior research round. |
| Safety-cold register | Moderate-High | Convergent. Pending Cruz 2025 / Cerea 2025 / Eikey 2021 DOI verification in audit. |
| No fake-autonomy on locked decisions | Moderate | Single source (Claude), [PENDING AUDIT]. Important if confirmed. Apply provisionally. |
| Volyume alongside coaches, not above | High | Already in CLAUDE.md, reinforced by all three passes. |

When the citation audit completes, this section will be replaced
with a verified citations table mapping each principle to its
strongest verified source.

## 9. Open questions

Things this research could not resolve. Carry into post-launch
telemetry and small qualitative studies.

1. **Whether "Precision Coaching" as a named actor reads as cold**
   to users who otherwise expect warmth. The xAI trust literature
   predicts honesty trumps warmth. No direct study of this naming
   choice exists. A small post-launch usability check (n = 8-12)
   would help.
2. **Whether pattern externalisation carries the same protective
   effect as FBT illness externalisation** in an app context. FBT
   warns externalisation can be dismissive if overdone. Worth a
   small qualitative study with recovered-ED users in the UK
   fitness population.
3. **Whether the staged-warmth schedule (cold week 0-2, warmed
   week 3+, cold during holds) matches user expectations.**
   Mayer-Davis-Schoorman predicts yes but app-context data is thin.
4. **Whether the safety hold lands differently for unlinked vs.
   coach-linked users.** The phase-2 coach surface changes the
   framing. Cannot test until phase 2 ships.
5. **Whether proactive disclosure of the deterministic-engine spec
   in onboarding** ("Precision Coaching follows rules; it is not
   AI") builds trust enough to justify the onboarding friction.
6. **Whether removing "Precision Coaching" from 80-char
   notifications** in exchange for character budget breaks the
   honesty principle in a way users notice.

## 10. What lands next

Once this synthesis is locked:

1. The citation audit completes and Section 8 gets the verified
   sources.
2. An implementation move (Move #0.5, sequenced before Move #2)
   does the mechanical voice retrofit across the existing
   `whyThisTemplates.js`, `weeklyCoach.js`, and the
   user-facing strings in the existing screens.
3. Move #1 and onwards apply the new patterns from day one.
4. Post-launch telemetry tracks the open questions in Section 9.

This document is the source of truth for the voice. Disagreements
between this doc and any other doc are resolved in favour of this
one.

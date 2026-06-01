# Onboarding Audit 08 — Look, Feel and Communication vs the Field

Status: COMPLETE (supplementary to Phases 3 and 5)
Date: 2026-06-01
Method: Volyume's intended design language read from `docs/DESIGN_SYSTEM.md`
and `theme.js` tokens, its voice read from the flow copy, then benchmarked
against the named competitors via fresh web research (June 2026). Caveat: this
assesses composition, tokens and copy from source, not a running build.

---

## 1. Where Volyume is trying to sit

The design system is explicit and, on paper, genuinely premium and
differentiated (DESIGN_SYSTEM.md:18-46):
- Reference feeling: "Whoop / Linear / Stripe, a calm, dense, exact tool", not
  Headspace softness or gym-bro hype.
- Amber `#F5A623` on near-black `#0D0D0D`, one accent used sparingly, depth by
  tonal elevation not shadow, no gradients/orbs/glows.
- Numbers are the hero, tabular figures everywhere data appears.
- No gamification: no streaks-on-fire, no XP, no confetti.
- Dark-only by decision (Whoop/Oura/Robinhood precedent).
- Voice: "Direct. Precise. No fluff", data before description, no motivational
  filler, no emoji, no em dashes (DESIGN_SYSTEM.md:305-317).

This is a coherent, distinctive position. Amber-on-black is more ownable than
the ubiquitous blue-on-dark, and "precision instrument" is a real wedge.

## 2. The competitive field, look and voice

| App | Look / feel | Voice / communication | What they own |
|---|---|---|---|
| MacroFactor | Clean, data-dense, non-gamified | Compliance-neutral, never moralises, "observe and adjust, get out of the way" | Scientific authority, no-guilt data |
| Whoop | Dark, metric-led, recovery/strain loop | Authoritative, performance, written/AI rationale | Performance authority, the daily loop |
| Oura | Minimalist, calm, one readiness score | Quiet, non-flashy, health-serious | Minimalist sophistication |
| Future | Warm, human, coach-forward | Human relationship, your named coach writes to you | The human coach feeling |
| Noom | Bright, lesson cards, colour-coded foods | Psychology, behavioural, chatty (can read cheesy) | Behaviour change |
| Duolingo | Playful, mascot, heavy gamification | Cheeky, streak-driven | Habit through play |

Sources: MacroFactor, Whoop and Oura design/voice notes, Noom and Future voice
notes (see list at end).

## 3. Where Volyume lands

Volyume's intended position is a blend of the two most credible poles:
**MacroFactor's data ethos** (the coach observes your weight trend and adjusts,
it does not moralise, "trend over perfection", NutritionEducationScreen:44) and
**Whoop's written authority** (the coach "explains every decision, what
changed, what was left alone, and why", WelcomeScreen:24), with a cheap, honest
dose of **Future's human signal** via the founder note
(ProSetupCompleteScreen:275-287).

That is a strong, ownable combination the others do not have in one place: a
coach that adapts **both training and nutrition together** and **writes back the
rationale**, bodybuilding-specific, private, no gamification. The Welcome copy
states it well: "a coach reading their weight, food, energy, and training
together, then adjusting each week." (WelcomeScreen:63).

Crucially, Volyume's actual coaching philosophy is **MacroFactor-grade**: it is
weight-trend-led and compliance-neutral by construction (weeklyCoach.js:373-379,
the 5% cap and 2-week cooldown in NutritionEducationScreen:154-160). It is at
the credible end of the market. The problem is communication, not capability.

## 4. Where the audited flows betray the design system

The design system says what Volyume is NOT (DESIGN_SYSTEM.md:18-26): "not a
generic AI-generated fitness app", "not a dark SaaS template", "nothing
decorative that doesn't earn its place". The audited flows break that promise in
specific places:

1. **It points users to a competitor.** Telling a new user to log food in
   MyFitnessPal or Cronometer (NutritionEducationScreen:103-109) is the single
   most off-brand thing in the app. A precision instrument that outsources its
   own core loop to a basic calorie counter reads as not-actually-premium, and
   hands the credibility to the competitor by name.
2. **The paywall undersells to the wrong axis.** "Pro adds food data / turns on
   the food layer" (PaywallScreen:107-109) frames Volyume as a food tracker
   bolt-on, surrendering the "coach who writes back" position to a
   MacroFactor-style "food data" framing, while showing a defunct "Complete"
   comparison and a wrong price. This is the opposite of the design system's
   "data before description, no fluff" and it damages the premium read.
3. **Three builders, three visual languages.** The design system mandates one
   press feel, one component set, numbers-as-hero. The wizard (dropdowns), the
   builder (icon cards) and the manual builder (pills) look like three products
   (doc 03, D1/D2). Inconsistency is the template smell the system says to
   avoid.
4. **Decoration creep.** `ProGoalSetup` puts an icon on every option card
   (:333, :392, :420, :484, :510), against "do not amber-colour decorative
   icons, it dilutes the affordance" and "nothing decorative that doesn't earn
   its place". The cosmetic Manual Builder goal pills are pure decoration that
   does nothing (ManualBuilder:20-26).
5. **Numbers-as-hero is honoured where it matters** (the reveal kcal/macros, the
   block tonnage chart), so the system's best principle is intact, the failures
   are at the edges, not the core.

## 5. Communication verdict vs the field

- Against **MacroFactor**: Volyume matches the data ethos but does not say so.
  MacroFactor's whole pitch is "compliance-neutral, no guilt, we adjust for
  you." Volyume does exactly this (weight-trend, caps, cooldown) yet never makes
  the claim on a conversion surface, and the nutrition primer drifts toward
  generic "adherence" language and a competitor recommendation.
- Against **Whoop**: Volyume's "explains every decision" rationale is its
  closest match and arguably its strongest asset. It is real
  (ProSetupComplete "Why this plan, for you"). It should be louder and earlier.
- Against **Future**: the founder note is a cheap, genuine human signal Future
  charges a premium for. Keep and protect it.
- Against **Noom/Duolingo**: Volyume correctly rejects gamification and chatty
  psychology. The disqualifier on Welcome ("there are faster ones out there")
  is exactly the confident, non-cheesy register the design system wants. Keep.

## 6. Recommendations (look, feel, communication)

These fold into doc 07, called out here for the brand lens:
- L1. Delete the MyFitnessPal/Cronometer instruction and own the food loop with
  Eat. The most off-brand line in the app. (doc 07, C1.)
- L2. Re-pitch Pro on the "coach who writes back, adapts training and nutrition
  together" axis, not "food layer". Lead conversion with the written-rationale
  proof Whoop-style. (doc 07, C2.)
- L3. Make the compliance-neutral, no-guilt promise explicit ("log food or
  don't, your weight drives the calls, no penalties for an off day"). It is
  true, it is MacroFactor's whole moat, and Volyume gives it away by staying
  silent. (doc 07, H1.)
- L4. Unify the three builders to one component language so the flow reads as
  one precision instrument, not a template. (doc 07, H5.)
- L5. Trim decorative icons in the builder to match the accent-discipline rule.
- L6. Protect the founder note and the disqualifier, they are the human and
  confidence signals competitors pay dearly for.

Bottom line: Volyume's design system and coaching engine are already at the
credible, premium end of the field, level with MacroFactor and Whoop on the
things that matter. The audited flows undersell that and, in one place, actively
hand credibility to a competitor. The fix is communication and consistency, not
a redesign.

---

## Sources

- https://macrofactor.com/macrofactor/
- https://askvora.com/blog/best-apps-nutrition-recovery-workouts-2026
- https://nogood.io/blog/whoop-marketing-strategy/
- https://www.whoop.com/us/en/thelocker/introducing-whoop-coach-powered-by-openai/
- https://stormotion.io/blog/fitness-app-ux/
- https://www.mdpi.com/2078-2489/12/9/365
- https://bodybuddy.app/blog/7-best-alternatives-to-noom-that-actually-work-in-2026
- https://athletechnews.com/age-of-ai-human-personal-trainers-might-become-a-luxury-future-caliber/
- https://pimpmytype.com/review-fitness-app/

# Track 4c (child of coaching audit): goal setup / lock / methodology / change summary

KEY FINDINGS RANKED:
1. S REGRESSION vs locked spec: GoalLockConsentScreen dropped TWO load-bearing sentences
   from COACHING_VOICE_SYNTHESIS_LOCKED.md:371-395 — the "2 signals to 3" mechanism
   (only in a code comment now) and the closing "either choice keeps the absolute
   safety floor in place" reassurance. Highest-value fix; documented regression.
2. S: stale docstring GoalLockConsentScreen.js:13-19 (claims onboarding interstitial;
   removed 2026-05-29, screen is You-tab-only now).
3. M: coachGlossary/InfoTooltip NOT wired into ProGoalSetupScreen or ProSetupComplete
   despite 13 other screens using it; approved gloss strings sit unused.
4. S: MethodologyScreen says "fat-free mass" 3x — violates locked Pattern 10 ("substitute
   FFM with lean mass/muscle"), no glossary fallback.
5. S-M: MethodologyScreen can't deep-link a section from route.params.source (already
   tracked for telemetry) — safety-seekers land on cooldown section.
6. S: ProGoalSetup footer "adjusts at the next check-in" — no date; ProSetupComplete
   already computes firstReviewLabel, reuse it.
7. S: "New to calories and macros?" primer link is BELOW the ring/bars on
   ProSetupComplete (279-291) — offer education before the numbers.
OBS (flag for ED-owner triage, not a proposed change): GoalChangeSummaryScreen has no
getOpenEdPatternFlag check before deficit-phase framing, unlike ProSetupComplete.
GOOD: ProGoalSetup inline whys on every field; ProSetupComplete "Why this plan, for
you"; GoalChangeSummary directional-correct reasons + explicit "unchanged" labels.

ELEVATION: cumulative "Your coaching decisions" receipt timeline on You tab (aggregates
setup/goal-change/held-decision reasons — trust compounds); every number deep-links to
ITS methodology section; safety floor drawn as a visible floor line on the calorie ring
(qualitative, no raw numbers); GoalChangeSummary one-line "what you're trading"
synthesis above the cards.

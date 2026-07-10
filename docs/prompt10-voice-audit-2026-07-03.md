> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Voice audit whose fixes were applied hands-on the same day; historical record. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Prompt 10 — Voice audit against COACHING_VOICE_SYNTHESIS_LOCKED (2026-07-03)

Audit run by a scoped agent over src/screens and src/components against the
locked voice doc (read in full) plus CLAUDE.md's language rules; fixes
applied hands-on the same day. This file is the record: findings, what was
fixed, one ruling for the founder to overrule if disagreed, and what remains.

## Overall verdict (audit's words, condensed)
Spelling discipline is genuinely strong: no American spellings survive in
user-facing copy, and diet-culture/shame vocabulary is essentially absent.
The drift is at the seams: the en-dash rule had not propagated into
numeric-range prose, and the "Precision Coaching" naming discipline erodes
on secondary screens where "the coach", "the system" and unnamed "we"
creep back in.

## Fixed in this pass (commit refs in git)
1. **Goal-lock consent screen (ED-safety-adjacent, highest priority).** The
   live copy had drifted from the locked Surface 4 block into vague
   personification ("your body is telling us something's wrong"). Restored
   the Surface 4 register: Precision Coaching named as the decider, the
   two signals named plainly.
2. **MethodologyScreen** "the system working / the system asleep" and an
   unnamed "we never suggest cutting" → Precision Coaching named, per the
   locked doc's own mapping table for that surface.
3. **Start-action naming standardised on "workout"** (the doc's
   one-mental-model rule): "Start your first session" → "Start your first
   workout", the blank-session link, and the mismatched error toast.
   Aggregate counts deliberately keep "sessions" (a week has sessions; you
   start a workout). The finish loop now closes with the word the button
   opened: the summary screen and its navigator titles read "Workout
   complete" (share-card fallback aligned; Maestro flow updated).
4. **Same-surface naming duality** on PlansScreen's two adjacent option
   cards ("Precision Coaching" vs "the coach") → one name.
5. **YouScreen** unnamed actor ("We rebuild the plan") → Precision Coaching.
6. **The one exclamation mark** ("Goal reached!") → full stop.
7. **Prose en dashes** converted to "to" everywhere a SENTENCE stated a
   range (nutrition education rates, portion guides, recovery-week copy,
   ACWR tooltip, fat-target lines, Epley note).

## One ruling taken (overrule if disagreed)
The locked doc's en-dash example is prose ("ranges read 'MEV to MRV'").
Compact NUMERIC NOTATION — rep-range cells ("8–12" beside a weight), date
ranges ("3 Jun – 9 Jun"), the builder's range separator, and the estimated
kcal range — kept the en dash as data notation, not sentence punctuation.
Converting those to "to" would bloat tight numeric cells. If the founder
wants the ban absolute, it is a mechanical follow-up (and only then should
the lint gate extend to –).

## Recorded, not fixed (needs founder direction or separate scope)
- **Per-surface "Precision Coaching" vs "your coach" sweep** beyond the
  same-screen fixes: CardioPlanCard, CardioHistory, SettingsCoaching,
  NutritionEducation each use the informal register; the doc allows one
  register per surface, so these are candidates rather than violations.
  A full sweep should pick the register surface-by-surface deliberately.
- **CalorieBankSheet "we can't shift that much"** (SUSPECTED only):
  borderline UI-validation copy vs engine voice.
- **Out of the audited scope but highest-stakes voice surfaces**:
  src/lib/whyThisTemplates.js and the weeklyCoach copy builders (Surface 8
  in the locked doc), notification copy, and share-card text. These want
  their own pass with the same method.
- The audit sampled Alert dialog bodies rather than reading all 82 screens
  line-by-line; residual drift may exist outside the grepped patterns.

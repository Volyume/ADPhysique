# SPEC — ULTIMATE-006 / M1 · U-B-9 (LOCKED-PATH): tone-driven coaching copy layer

Status: **AWAITING FOUNDER REVIEW of the locked-contract change.** Founder authorised the locked path
on 2026-06-13 ("extend the existing showScience/withScience layer… with you reviewing the locked-doc
change before merge"). This spec is that review artifact; I edit the locked surfaces only after your nod.

Why this is gated: U-B-9 drives copy on the coaching-narration surfaces, which are governed by
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (a LOCKED doc) and a jargon blocklist that *throws* if jargon
appears in any exported coaching string (`whyThisTemplates.js` `assertNoJargon`; `coachRegister.js`
`clean()`), em/en dashes included. The only sanctioned way to surface a technical term is
`withScience(plain, tech, showScience)` → "plain term (technical term)", opt-in, plain term always leads.

## Current wiring (grounded in code, 2026-06-13)
- `CoachOutputScreen.js:1505` already renders via `buildRegisteredCoachResponse` and `:804`
  `resolveRegister({ coachTone: userProfile?.coachTone ?? 'automatic', … })`. So the supportive/precise
  REGISTER swap is already wired on CoachOutput.
- `CoachReviewScreen.js` / `WeeklyCheckInScreen.js`: NOT register-wired.
- `withScience` (the C2 science layer) is BUILT (`coachRegister.js:308`) but **used nowhere** — the
  opt-in technical-term layer is not surfaced yet.
- `showScience` is persisted on the profile (`SettingsCoachingScreen.js:39,53`), default OFF.

## Proposed locked change (3 parts)
1. **Surface the sanctioned science layer (the blueprint's "reuse show-the-science semantics").**
   Thread `userProfile.showScience` into the registered response and wrap a CONFIRMED set of
   plain↔technical pairs with `withScience(plain, tech, showScience)`. Default (science OFF) changes
   NOTHING anywhere; ON appends "(tech)" after the plain term. Copy outside the brackets still passes
   `checkJargonScienceOn`. **FOUNDER TO CONFIRM the pairs against the locked doc** — candidates:
   - "weekly target range" → "(MEV to MRV)"  (the helper's own docstring example)
   - "lighter week" → "(deload)"
   - "reps left in the tank" → "(RIR)"
   No pair ships without your confirmation; none introduces jargon outside the brackets.
2. **Free CoachReview defaults to Supportive** (blueprint: "free CoachReview… default to Supportive
   glosses, since the lever is Pro"). It already renders plain recommendations, so this is confirming
   Supportive and (only if a confirmed pair renders there) gating brackets on `showScience`.
3. **Precise / athlete-units half = DEFERRED.** The blueprint marks the per-muscle-sets / native-units
   switch "evidence-thin… optional/FOUNDER input" (depends on U-B-8). Out of scope until you call it.

## Guards & tests (the contract is self-defending)
- Existing: `coachRegister.test.js` parity invariants (precise ladder must mirror supportive) +
  `assertNoJargon`/`checkJargon`/`checkJargonScienceOn` (throw on jargon or em/en dash).
- ADD: a test that science-ON renders "(tech)" after the plain term, science-OFF stays byte-identical,
  and every science-ON string passes `checkJargonScienceOn`.

## SIGN-OFF CHECKLIST (founder)
- [ ] Confirm/edit the plain↔technical pairs in part 1 (or supply the locked set).
- [ ] Confirm wiring free CoachReview to Supportive (part 2).
- [ ] Confirm the Precise/units half stays deferred (part 3).
- [ ] Then I implement on the locked surfaces, run the locked-lib tests, and commit to THIS BRANCH for
      your review before any merge to main.

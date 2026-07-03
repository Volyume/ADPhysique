# A5 - src/lib copy audit (FLAG-ONLY decisions for the founder)

None of the items below were edited. Each needs a founder/orchestrator call.

## FLAG-1 (safety-adjacent) - `food/planExplain.js`, plan-change + safe-floor copy
File: `src/lib/food/planExplain.js` (whole module).
This module renders plan edits into coach voice and includes safe-floor
lines: `:56` "You are at the lowest your plan should go...",
`:66` "A lower target would drop you below your safe floor, so nothing
changes...", `:114` "That is as far as it goes this week. Your safe floor
holds the rest." This is coaching-verdict + calorie-floor-adjacent copy, so it
is FLAG-ONLY per the slice rules and the ED-safety constraint.
Proposed change: **none.** The copy is already British, no dashes, honesty-test
compliant, numbers-before-narrative. Recorded only so the founder ratifies that
no touch is needed. No spelling/dash fix is pending on it.

## FLAG-2 (tone, notifications) - `notifications/restEnd.js:60-61`
Copy: title `'Rest done'`, body `'Next set when you're ready.'`
`NOTIFICATIONS_LOCKED` voice bans "clipped commands or one-word fragments
('Done.', 'Do it.')". The title "Rest done" reads as a two-word fragment and
the body is near-imperative. The rest-end addendum (NOTIFICATIONS_LOCKED,
2026-07-01) explicitly permits "calm copy" for this session-feedback surface
and gives no exact string, so this may be an accepted terse exception.
No spelling/dash issue. Flagged as a tone decision only (I do not change
notification tone). Founder call: keep as-is, or warm slightly, e.g.
title "Rest's up" / body "Take your next set whenever you're ready."

## FLAG-3 (deliberate glyph) - `notifications/categories.js:78`
Copy: rest-timer action button `buttonTitle: '−15s'` uses U+2212 MINUS SIGN,
while its pair `'+15s'` (`:77`) uses ASCII `+`. U+2212 is not an em/en dash, so
it is outside the SAFE-FIX auto-apply class. It is almost certainly deliberate
(a typographic minus that pairs visually with `+`; it cannot be typed by
accident). Left unchanged. Founder call: keep the typographic minus, or
normalise the pair to ASCII `'-15s'`/`'+15s'` for byte-level consistency.

## FLAG-4 (house-style, punctuation) - Oxford comma vs house register
`food/sanityChecks.js:46` "Protein, carbs, and fat add up to..." and `:67`
"...protein, carbs, and fat are entered." use the Oxford comma.
`food/planExplain.js:130-135` documents the house list register as
**Oxford-free** ("a, b and c"). So these two validation strings deviate from
the documented British house style. Not auto-fixed because (a) both forms are
valid British English, (b) removing a comma is a style judgement the
orchestrator should set as canon, and (c) these strings may be asserted by
tests. Founder/orchestrator call: adopt Oxford-free everywhere (drop the comma
before "and" in the two sanityChecks lines) or accept the mix.

## FLAG-5 (units spacing consistency) - "100g" vs "50 g"
`food/sanityChecks.js` uses "per 100g" / "100g per 100g" / "over 100g"
(no space between value and unit), whereas `food/planExplain.js` ("50 g"),
`food/mealPlanAssembler.js:299` ("g short") and `food/csvExport.js`
("${qty} g") put a space. "per 100g" is a common fixed nutrition-label
convention, so the no-space form is plausibly deliberate. Not in the SAFE-FIX
class. Flagged for a consistency decision: standardise on "100 g" (spaced) or
keep "per 100g" as the label idiom.

## Scoping note (not a founder decision, an FYI)
Em/en dashes and unicode ellipses exist in **code comments** across food and
notification files (e.g. `food/adherence.js:22` "0-1 fraction",
`food/perDayTargets.js`, `notifications/winbackContent.js:9`), and pervasively
in comments across all of `src/lib` including the excluded engine files
(often as box-drawing `───` dividers, U+2500, which are NOT dashes). Per the
slice ("USER-FACING STRING COPY") and the no-drive-by rule, comment dashes were
NOT mass-edited: a partial fix limited to two domains, while identical comments
remain in excluded engine files, would increase inconsistency rather than
reduce it. If a comment-normalisation sweep across all of lib is wanted, it is
better done as one dedicated pass with explicit authorisation.

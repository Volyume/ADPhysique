# Share-card audit — 2026-07-27, with lead rulings

Founder order (verbatim): "I need you to audit the share cards as well and make
sure they are all elite. I've noticed some dont have the logo and such and some
do and things like that depending on the sizing and function."

Audit run by a read-only agent that rendered every card headlessly through
`scripts/render-share-card.cjs`, so the findings below are from actual PNG
output rather than from reading layout code.

All cards are drawn by one Skia renderer, `src/lib/shareCard/drawShareCard.js`,
onto an offscreen 1080px-wide surface. Preview and export run the identical path,
so there is no capture-quality or blur problem to fix.

---

## RULINGS

Decisions are lead-ruled under D33 on one criterion: the best result for the app
and its users. Section 2 inviolables remain binding and none is weakened here.

### R1 — C1: a card can export with NO logo. FIX. (This is the founder's bug.)

`ShareCardScreen.js` and `BeforeAfterShareSheet.js` load the wordmark
asynchronously into state, but the export guards check only Skia, FileSystem and
typefaces. When `wordmark` is null, `drawShareCard.js` silently substitutes
plain system-font text "Volyume" -- no V mark, no gradient, wrong weight. Two
live routes in: any swallowed asset-load failure, and tapping Share/Save before
the async load resolves (the first preview render always has `wordmark === null`).

This is exactly "some don't have the logo". Fix: add `wordmark` to the readiness
guard and to the buttons' `disabled` prop in both files, and DELETE the text
fallback so an unbranded card cannot be produced silently. A card that cannot be
branded must not export at all.

### R2 — C2: the weekly card's suppression fails OPEN. FIX. The weight number STAYS.

Two separate things; they get opposite answers.

**The suppression posture is a defect — fix it.** `ShareCardScreen.js:77`
defaults `suppress = false`, and only one caller passes the real value. The
sibling Pro surface does the opposite and is right: `usePhotoSuppression` starts
suppressed and fails closed on a read error. The share-card screen must not
trust a route param for an ED-safety gate. Fix: call `usePhotoSuppression()`
inside `ShareCardScreen` and OR it with the route param, so the gate fails
closed and the caller can still force suppression. Defence in depth; strictly
safer in every direction.

**The bodyweight number is NOT a breach and is NOT removed.** The founder
explicitly authorised it, recorded verbatim at
`src/lib/shareCard/greatWeek.js:13-19` (correction of 2026-06-22, superseding
the earlier qualitative-only call): the card "MUST celebrate the real
achievement -- the actual weight lost/gained and the PRs". It only ever fires on
a week `isGreatWeek` has already cleared of every ED-safety signal
(`safetyClear`: no ED-pattern flag, no FFM floor hold, no rapid-loss flag).
Removing a founder-ruled decision because a summary line elsewhere is out of
date would be exactly the corner-cutting Section 4 forbids.

**Documentation debt, surfaced not silently patched.** CLAUDE.md Section 2 names
only ONE share-card bodyweight exception (the Pro before/after card). The
weekly recap card is a SECOND founder-approved exception that the locked text
never recorded. The code is correct and the founder's decision stands; the
constitution's wording lags it. Flagged to the founder for a one-line
correction. No code change follows from this.

*Verified clean by the audit:* the before/after card's calm-mode / ED-flag
withholding genuinely exists, at three layers, fail-closed. No non-exempt card
carries a name, measurement or private note.

### R3 — H1/H2: one lockup, one size, on every format. FIX.

`markH = isSquare ? 66 : 90` makes the mark 22.8% of width on square and
portrait but 31.1% on story -- a 36% jump -- and `volyume.app` prints only when
`!isSquare`. That is the "depending on the sizing" half of the founder's report.
Fix: express the mark as a fraction of canvas width so it is identical across
formats, and render `volyume.app` on every format.

On 9:16 the whole footer currently sits inside Instagram's Story reply bar, so
the logo is the first thing the viewer loses. Fix: lift the footer block clear
of that band.

### R4 — H3/H4/M2/M3: text and numbers must not collide, clip, or leave holes. FIX.

Hero numeral descenders cut through the unit label on the session and milestone
cards (commas in `1,240,000` strike through "TOTAL KG LIFTED"). The weekly card
already solves this; lift its formula into a shared helper and use it everywhere.
An empty `heroValue` still reserves the full hero band, leaving a ~300px void.
Two-line truncation drops the tail with no ellipsis. Long plan names run off the
canvas edge with no width fit.

### R5 — M1: "NEW PB" becomes "NEW PR". FIX.

One string in the whole family says PB; the app standardised on PR.

### R6 — H5: story dead space. FIX.

Fixed `H` fractions leave ~40% of a story card empty. Distribute the content
block around the vertical centre, as `drawBeforeAfter` already does.

### R7 — M6: palette drift from theme tokens. FIX.

`PALETTE.border` is the theme's `surface3` (`#343431`), not its `border`
(`#6E6E6E`, chosen for 3:1 WCAG 1.4.11), so outlines are near-invisible in
export. `textMuted` has drifted by one hex digit. Correct both and name the
source token in a comment.

### R8 — M5: hard-coded `kg`. FIX, carefully.

The session card and recap payload hard-code "kg" while every sibling threads
units. Not user-visible today (gym units are kg-only) but a latent lie. Thread
the unit through. `src/__tests__/p15UnitDisplayCopy.guard.test.js:63` pins the
current string and must be updated in the same change.

### R9 — M9/L5/L1: copy consistency. FIX.

Entry points standardise on "Create share image"; actions on "Share image" /
"Save to gallery". `AnalyticsScreen.js:47` "A year of showing up. Few do that."
is a comparison against other people on a card family whose stated principle is
"never a comparison to others" -- drop the second sentence. The tagline's
double-space letter-spacing hack becomes explicit tracking.

### R10 — M7: the one Pro card has no rendered-output coverage. FIX.

`scripts/render-share-card.cjs` and `drawShareCard.test.js` never exercise
`cardType: 'beforeAfter'` -- the only card carrying bodyweight is the only one
nobody can eyeball. Add square/portrait/story cases. Delete the dead `premium`
fixture key.

### R11 — M4/L2/L3/L4: accepted, lower priority. FIX where cheap.

Dead "Date" toggle on some milestone cards (default the date in `buildParams`
rather than patching seven call sites); a zero-work session is still shareable
(hide the action at 0 working sets); stat boxes stretch to fill so proportions
differ card to card; fixed cache filenames overwrite between exports.

### R12 — canvas sizes: NOT changing 1:1 to 4:5 in this sweep.

The audit recommends retiring the square canvas for 4:5. Declined for now: it is
a product/format decision affecting what users have already been sharing, not a
defect, and it is not needed to fix anything the founder reported. Surfaced as a
founder question instead of being pre-decided either way.

---

## NOT CHANGED

- The coaching engine: untouched. Nothing here is engine-adjacent.
- ED-safety: strengthened only (R2 makes a gate fail closed). No floor, gate,
  threshold or suppression is weakened or removed.
- The founder-ruled bodyweight number on the weekly recap card: retained.
- Billing, identity, free/pro gating: untouched. Share artefacts remain free
  except the before/after card, which stays Pro.

# 11: Boostcamp studied; Volyume drawn in its grammar

Lead, hands-on, 2026-10-07. Authority: the founder, 2026-10-07: "I like
the dark Boostcamp one, can we learn more from that. Our design doesn't
look good." This file and the page's section 11 replace the two-state
proposal (00 section 8.2, page sections 7 to 10) as the build direction,
pending the go-ahead. The research (09) and the user-base weighing (10)
still apply and are used.

OBSERVED is measured or quoted; SUGGESTS is inference.

## 1. Sources read

- Boostcamp's six store screenshots (the same six on the App Store,
  id 1529354455, v266, and on Google Play, `com.bpmhealth.boostcamp`,
  4.9 stars), the logging screen and the keypad screen enlarged two
  times from the 800 px Play copies and measured by pixel.
- Lane A4's dossier (04 section 2.5) and lane A5's Boostcamp reviews
  (05: the March 2026 redesign, the rest-timer regressions, data loss,
  swipe-deletes).
- boostcamp.app/workout-tracker and /features (fetched 2026-10-07).

## 2. What the logging screen is (OBSERVED)

Colours, exact from the pixels: page #1F1F1F; sections #262626; input
wells #191919 with a slightly lighter edge; row hairlines #303030 to
#363636; values and names #FFFFFF; secondary #B9B9B9; column labels
#B5B5B5, sentence case; placeholder #838383; accent #FFC400 (done check,
Finish) and #FFCC00 (exercise name); W badge #7D6417 with the accent
glyph; F badge #724848 with a red glyph; pending check #353535.

Sizes, converted at about 1.1 px per point and rounded: session title 24
bold; exercise name 18 semibold in the accent, its index 17 white; row
values 15 regular; cell second lines and column labels 13; toolbar
labels 11 under 22 pt glyphs; row pitch 62; section header 56; bands of
about 12 between full-bleed sections; joined wells about 108 x 44; check
circle 28; keypad keys about 100 x 64 with a 24 value over a 13 label.

Anatomy: toolbar (Rest and Calc as glyph-over-label tools, a dark pill
with the session clock and pause, a filled yellow Finish); session title
and a note field; per exercise a full-bleed section: header (index, name,
chevron, a square rest button), column labels (Set, Previous, Target,
Lbs, Reps, a tick-all double check), rows (marker W / 1 / 2 / F,
Previous as value over RPE, Target as value over the rule, the joined
wells with an RPE mini-badge, the check), a footer (Add Set, Swap,
overflow); then the next exercise's header. A docked custom keypad with
tabs Reps | RPE, a keyboard toggle, info and Clear.

Features behind it (A4 2.5; vendor pages): RPE and RIR on every set on
the free tier; set types by tapping the set number; tap Previous to
fill; swipe to delete; auto-start rest timer; plate calculator; Auto
Progression (Pro) with next-session weights; Live Activities; weekly
report; 11,000 programmes.

## 3. What its users say about the look (A5, dated)

Design praise is 1.7% of 1,675 high-star reviews across the field and
Boostcamp takes 3 of those 29: "very well designed UI" (2026-03-12),
"Love the new UI. Best feature is having the previous weight and reps on
current workout" (2026-03-31). The same redesign: "Strongly dislike the
new one" (2026-03-27), "custom workouts hard to find" (2026-03-28),
"increasingly cluttered" (2026-06-08). Later: "rest timer UX is
significantly worse" (2026-09-19), "the timer is all but useless as the
app resets when you change apps" (2026-08-25), "lost all my data"
(2026-09-12), accidental swipe-deletes (2026-07-08, 2026-09-14).
SUGGESTS: the look is admired; the regressions are what people leave
over.

## 4. The lessons (SUGGESTS, from section 2)

1. Depth from tone, not lines: three greys a few points apart.
2. Full-bleed sections with bands, not rounded cards.
3. One accent with three jobs: the exercise name, the done check, the
   finish.
4. Two-line cells: the number over its context in grey 13.
5. One input object per row: joined wells and one check.
6. Moderate type with weight contrast, 15 to 18 for content.
7. Named tools in the toolbar.
8. A steady rhythm: 62 rows, hairlines, 56 headers, 12 bands.

## 5. Taken and left

Taken, in house tokens: full-bleed sections and bands; the tonal ladder
(background / surface / surface elevated); amber for the exercise name,
the done check and the W badge; sentence-case 13 labels; two-line cells
(Last; Target as the coach's numbers over the coach's rule: "+2.5 at
10", "warm-up", "last set"); joined wells, white on logged rows, grey
placeholders on pending rows, the next set filled in white with an amber
ring on its check; W and F badges on tinted fills; the footer; the
toolbar with Rest and Notes and the session clock in a well; the docked
keypad with 2.5 kg step keys and Next.

Left: the plate calculator (D15, D57); RPE and RIR fields (settled); the
yellow-filled Finish (no filled amber button in the house; Finish stays
the amber glyph); swipe-to-delete (its users lose sets to it); the
programme-note block (the Target column is the coach's prescription);
the pause on the session clock.

## 6. The drawings

`09-drawing-bc-black.png` (page #0D0D0D, sections #191917, wells
#0D0D0D), `09-drawing-bc-sheet.png` (page #191917, sections #222220,
wells #191917; a modal flow may sit on the surface colour per the design
system), `09-drawing-bc-keypad.png` (the sheet tone with the keypad open
on set 2's weight). Session Upper A, exercise 2 of the session, set 1
logged a moment ago, rest running. Legend on the page, section 11.

## 7. What this re-opens beyond 00 section 8.2

- The bottom "Log set" bar and the single-CTA contract: the row's check
  is the confirm (Boostcamp and five other apps in 09 section 5).
- One exercise in the workspace: the session is one sheet; finished and
  upcoming exercises are collapsed headers; the outline sheet becomes
  unnecessary.
- The row-sequence laws and the steppers: as in 00 section 8.2.
- Kept: the 44 dp rest strip (the full rest view, countdown at 40 and the
  next set at 24, sits behind the Rest tool; opening itself after Log is a
  setting); icon-only Finish; D150; D63; no plate calculator; no RPE or
  RIR; no media; no typeface change.
- Traded: live values at 16 in the wells (the field's median, Boostcamp's
  15) rather than the 24 argued in 09 section 6; the far-distance case is
  served by the rest view.

## 8. For the go-ahead (in chat, 2026-10-07)

G1 build in this grammar, yes or what is still wrong; G2 tone, A
near-black or B sheet; G3 the confirm, A per-row check (as drawn) or B
keep the bottom bar for the next set; G4 scope, A the whole logger in one
campaign or B this screen first.

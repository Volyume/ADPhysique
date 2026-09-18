# 40 — THE FINISH SPEC (D192, 2026-09-18)

_The founder walked build 3583 on 2026-09-17 and said: "This looks like utter
shit all over the place. It doesn't look like a proper app at all." Then:
"Finish it properly but not with sizes as ordered. Use your full judgement to
make it look premium and not at all AI built. Font sizes look off and all
sorts, there's no consistency either." This page is that judgement, written
down so every lane builds the same thing. Rulings live in the register as
D192; this is the working spec._

## 1. What was wrong, measured

| Cause | Evidence |
|---|---|
| The ground moved to warm charcoal and nothing moved with it | card surface 1.07:1 on the ground, hairline 1.39:1; both read as the same black |
| Two component languages on every screen | Train: bordered cards with boxed icons; Coach: hairline rows; Today and Progress: both |
| A "big everything" type scale with a 56 hero on top | row titles at 20, buttons at 64 dp with 20 labels, body 16 at 1.5, then a 56 name in a card |
| The app narrates itself | about a dozen explanatory paragraphs across the nine screenshots |
| Day zero never designed | every screen an empty state written as an apology |

## 2. Type (landed in `theme.js`, D192)

| Role | Size / line | Face | Use |
|---|---|---|---|
| hero | 40 / 46 | InterDisplay ExtraBold | the ONE loud element where it is a name or a number: Today (the session's name), the logger (the working weight) |
| display | 34 / 39 | InterDisplay Bold | a metric that is the point of its screen (the diary ring number) |
| h1 | 28 / 32 | InterDisplay Bold | screen titles |
| h2 | 22 / 29 | Inter SemiBold | card headline, a section's one big line |
| h3 | 18 / 23 | Inter SemiBold | sub-headings |
| title | 16 / 21 | Inter SemiBold | every row title, card title, button label |
| body | 15 / 21 | Inter Regular | running text |
| bodyStrong | 15 / 21 | Inter Medium | emphasis inside body |
| bodySm / label | 13 / 18 or 17 | Regular / Medium | secondary lines under a title |
| caption / captionStrong | 12 / 16 | Regular / SemiBold | metadata, chart labels |
| overline | 12 / 16, caps, 0.6 | Inter Medium | section labels |
| micro | 10 | Regular | chart axes only |

Rules. Weight comes from a shipped face, never a numeric `fontWeight` on
Android. **The hero and display steps carry a NAME or a NUMBER, never a
sentence**: a 30-word coaching decision at 40 became eight lines of display
type on Progress (seen in the first renders). A sentence that is the screen's
loud element sets in h2: the week's decision on Progress and the session
verdict on the summary both do (amended 2026-09-18 at the Progress landing;
the h3 row used to name the verdict, and Progress used to be listed among
the hero screens). A screen uses at most five sizes. A row is title + one
secondary line; a card is one headline + one meta line. Numbers are tabular
and carry their unit in the same role (law 7). Nothing on a screen is larger
than its hero, and only Today and the logger have one.

## 3. Surfaces (landed, D192)

Dark, on the founder's `#111110` ground: surface `#252422` (1.22:1), elevated
`#2D2C29`, surface2 `#363531` (inputs, chips), surface3 `#403E3A`;
hairline `borderSubtle #3D3B37` (1.69:1 on the ground, 1.39:1 on a card);
control edge `border #878279` (4.95:1); selected edge `borderLight #999288`.
Inks: `textPrimary #F2EFE7`, `textSecondary #B7B0A4`, `textMuted #B2AB9F`,
all AA or better on every surface including surface3. Tinted-banner inks
lifted to clear 4.5:1 on the lighter ladder. Light: the hairline darkens to
`#D9D8D2` so it can be seen. Both hand-copied mirrors (`widgets.js`,
`drawShareCard.js`) moved with the tokens.

## 4. One component language

1. **Screen** = title (h1) + sections. No subtitle sentence under a title.
2. **Section** = overline label + content. Section gap 28; inside 12.
3. **Row** (every list, settings, tools, nav, history, people): 56 to 64 dp;
   title 16 semibold; ONE secondary line at 13, optional; a 20 dp glyph in
   textSecondary at the left, never boxed; chevron in textMuted; hairline
   between rows; no box round the group. The page pays the gutter once.
   Measured cap (2026-09-18, from the Settings render): a row with a glyph
   and a chevron leaves about 314 dp for text at 360 dp wide, and bodySm
   sets about 5.8 dp per character, so a secondary line fits one line at
   **50 characters or fewer**; a full-width meta line (a card, no glyph or
   chevron) at 56. The earlier "under 60" allowed lines that wrapped.
4. **Card** (only for an object: the plan, the session ahead, a meal, a lift,
   a person): surface fill, 1 px hairline, radius 16, padding 16; one
   headline (h2 or title), one meta line, controls at the foot; never a
   paragraph, never a boxed icon inside.
5. **Metric**: overline label above, number + unit in one role. Display
   size only where the number is the screen's point.
6. **Control**: buttons 44 (md) / 52 (lg) tall, radius 10, label 16 semibold;
   one committing action per screen, and only that one carries amber
   (fill if it is the once-per-journey action, otherwise the amber leading
   glyph); chips 36 tall, radius full, 13 medium; steppers 48.
7. **Copy**: no paragraphs on a main screen. A section may carry one line of
   secondary text under 60 characters. Explanations live behind a tap or
   nowhere. Status lines are facts ("No sessions yet this week"), never
   instructions.
8. **Empty state**: one line and one action, in the section's own place; no
   illustration, no paragraph, no box.
9. **Amber**: now, the one action, a personal best, a live meter. Nothing
   else. Today's cell outlines until you train, then fills (D191).
10. **Rhythm**: 16 gutter; vertical 8-grid: 8, 12, 16, 24, 32.

## 5. The screens, in the order they are fixed

1. Today: hero card at 40 with the block chip retired from the card (the
   week line opens the block sheet); ribbon; nutrition; weight; check-in as
   rows. 2. Train: the plan card without its paragraph; PLAN TOOLS as rows.
3. Nutrition: the ring's track on the hairline token at zero, one number
format, macro rows without the "to go" lines, the barcode button clear of
the meal-builder row, chips and water as rows. 4. Progress at day zero:
three pillar rows with one line each, no trends box, MORE STATS as rows.
5. The logger: no reserved hole when no weight is entered; steppers and
buttons at control size; the two amber edges reviewed. 6. Coach: rows at
the new scale (mostly the token change). 7. Readiness sheet: one question,
three answers, the optional pills behind a "More detail" row. 8. Block
sheet: ribbon, the week line, one definition line, the choose-next button.
9. Community hub: header to one action, day zero as one line per section.
Each lands only after its render is reviewed; then one build.

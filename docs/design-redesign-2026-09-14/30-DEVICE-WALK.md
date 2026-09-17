# 30 — THE DEVICE WALK (redesign, stages 1-4, plus the ledger)

_Created 2026-09-15 on the founder's instruction (D181): "keep the checklists
accumulating so whenever you do build, you have the full walk list ready."_

**What this is.** Every lane in this campaign ended with a device checklist, and
each one lived inside an agent report nobody re-reads. This is those checklists
consolidated into ONE walk, deduplicated and ordered by journey rather than by
lane, so it can be walked front to back on a phone.

**How to use it.** Walk sections A to I once in **dark** (the default), then the
starred steps again in **light**. Section J is the accessibility sweep. **Section
K is ED-safety and is not optional**: it is the block that says whether anything
in this campaign touched a safety behaviour, and the honest answer is supposed to
be "nothing changed".

**What to report back.** Anything that does not match "expect". Also anything
that looks *wrong but not listed* -- the value of a device walk is the founder's
eye, not the checklist's coverage. Screenshots beat descriptions.

**Lettered steps** (13a, 21a, 31a ...) were added after the walk was first
numbered, on the founder's instruction to keep it accumulating. The letters keep
the earlier cross-references (steps 4, 31, 37, 41, 43) valid. Anything dated
2026-09-16 or 2026-09-17 is not in build 3581.

**The one-line summary of what changed**, so the walk has a frame: the app's
ground moved to a warm charcoal; one element per screen got large; the category
props (flames, trophies, medals, confetti, glows) are gone; and amber went from
roughly 980 sites to the dozen it is actually for. Nothing about coaching,
safety or data changed.

---

## THE SHORT WALK (if there is only ten minutes)

1. Home. 2. Start a session, log one set, beat a best. 3. Finish it.
4. Progress. 5. Diary. 6. Any Settings sub-page. 7. Flip to light theme on any
of them. 8. Section K, every step.

---

## A. Cold open and first impression

1. **Install and open cold.** *Expect:* no crash; the ground is a warm dark
   charcoal rather than a flat near-black, and text is a warm off-white rather
   than pure white. This is the single biggest change and it should read as
   *quieter*, not darker.
2. **Home, no plan yet** (or a fresh account). *Expect:* the quick-start card is
   a plain card with a hairline, its glyph grey. No amber-tinted panel, no amber
   disc behind the glyph.
3. **Any empty state** (History with no sessions, Body metrics with no entries).
   *Expect:* a quiet glyph, a title, a line of text. **No 52 dp amber disc, no
   card border round it.** This one component changed on 87 screens, so if it is
   wrong it is wrong everywhere.

## B. Today

4. **Home with a plan.** *Expect:* the session name is the one large element on
   the screen, at display size. Under it, one meta line reading like "6
   exercises · 18 sets · about 52 min". Then Start.
5. *Expect:* four sections below, as rows on the background rather than cards:
   Your week (the ribbon), Nutrition, Progress, Coach.
6. **The week ribbon.** *Expect:* seven cells, same size and position; a trained
   day is a neutral fill; **today is amber**. A rest day draws as a rest day, not
   as a gap.
7. **Banners** (coach, deload, plateau, nutrition phase, activation). *Expect:*
   each is a plain card with a hairline. No amber wash behind any of them.
8. **Pull to refresh.** *Expect:* the spinner is amber. This is deliberate.
9. ★ **Tap the nutrition row.** *Expect:* it opens the Diary tab. (This once
   pointed at a tab that does not exist; no test would have caught it.)

## C. The logger — the most-changed surface

10. **Start a session.** *Expect:* the bottom tab bar's focused tab is a neutral
    raised cushion with full-ink icon and label. **No amber pill.**
11. **The working weight** is the one large element, at display size, with its
    unit. *Expect:* it does not animate or count up.
12. **Log a set.** *Expect:* the row's border flashes amber for about 0.7 s then
    settles. That flash is the only amber on the card.
13. **Log a warm-up set.** *Expect:* a small grey middle dot sits where a working
    set's number would be, **in the same column**, and the row text still ends
    " - Warm-up". Nothing shifts left or right. The row is **not** on a yellow
    wash any more.
13a. ★ **The logged sets are ledger lines** (D184, 2026-09-17). *Expect:* each
    logged set is ONE hairline-ruled line: a grey set number in a fixed column,
    the figure ("100kg × 8", exactly as it read before) in ink, tabular, then a
    grey chevron at the right edge. **No badge behind the number, no border or fill around the row.** The
    rule between rows is the subtle hairline, full width, and the first row of
    the block has none above it. The lines are the same height they were (36 dp)
    -- if the input has moved further from the top of the screen than it did
    before, that is a defect (the D168 objection, and the reason the primitive's
    48 dp floor is overridden here).
13b. **Behaviour on those lines is unchanged.** Tap one: the edit sheet opens.
    Long-press one: the menu opens, and the row keeps its own edges while the
    menu is up. TalkBack reads the row ONCE, beginning "Edit set 2" and then the
    figure -- not twice, and not silently (the ledger line inside the pressable
    is deliberately not its own accessibility node).
13c. **The upcoming sets** below the logged ones. *Expect:* a grey set number
    and "8-12 reps" (or "Set 4") in grey, shorter than a done line, no rule, no
    fill, nothing amber. They read as the quietest thing in the column.
14. Open the warm-up ramp sheet. *Expect:* a grey upward-trend arrow, not a
    yellow flame.
15. **The set steppers.** *Expect:* the − and + glyphs are grey, not amber. Touch
    targets and step size unchanged; long-press still repeats.
16. **The rest timer.** *Expect:* the drain bar is amber and shrinks with the
    countdown; the +30/−30 labels are ink and grey.
17. **Beat a previous best.** *Expect:* a small **amber barbell**, not a trophy.
    No confetti, no burst, no reward haptic, no full-screen takeover. The toast
    is bottom-docked and auto-dismisses.
18. **Log the first ever set on a new exercise.** *Expect:* "First lift logged"
    -- and it is **not** called a record.
19. **The exercise outline.** *Expect:* the current exercise's dot is amber;
    complete rows tick; the chevron is grey. (The thin amber line above the strip
    is deliberate -- founder device order 2026-08-22, see section L.)
20. **Finish.** *Expect:* the tick glyph is amber; the × beside it is muted.

## D. The workout summary

21. *Expect:* the four-week verdict is the one large element. The stat grid's
    first tile shows a chart glyph, not a flame, and every figure states its
    unit.
21a. ★ **The set breakdown under each exercise** (D184). *Expect:* each working
    set is one hairline-ruled line -- "1" in a grey column, then "100kg x 8" in
    ink, tabular -- **no chips, no pills, no borders**. Warm-ups are not listed
    here (they never were). **Judge the density, and say so either way:** a
    five-exercise session shows twenty-odd ink lines under the stat grid. The
    plan's sentence is "everything behind it grey"; the primitive draws a done
    figure in ink with a grey index, so that the summary -- where every row is
    done and nothing is current -- is not a list where nothing is primary. If
    it reads as a wall rather than a log, that is the one design question this
    change leaves open, and it is yours.
22. **If a PR was set.** *Expect:* an amber barbell on a **plain card** -- not a
    yellow caution panel with a yellow label.
23. **Cross a milestone (5/10/25/50/100 sessions).** *Expect:* the card, the
    copy and the share action are all still there. **No gold border, no gold
    circle behind the icon, no particle burst, no reward haptic** -- every rung
    now gets the same quiet tick.
24. **Finish a block.** *Expect:* no gold border; the block-story button shows a
    film glyph.

## E. Progress

25. *Expect:* the screen ends in a **decision** -- the coach's actual sentence --
    and that decision is the large element, above the evidence that supports it.
26. **The weight trend.** *Expect:* one neutral colour at every value. **No line
    is red, green or yellow.** A bodyweight trend is never coloured good or bad.
27. ★ **"Effective maintenance"** (Body metrics). *Expect:* the figure reads
    **"2,400 kcal/day" with a thousands separator.** It printed "2400" until
    2026-09-15.
28. **Weekly tonnage bars.** *Expect:* only the "Now" bar is amber; every bar
    behind it is neutral.
29. **A chart with a personal best on it.** *Expect:* the PB marker is a small
    **amber** ring-and-dot (it was gold), and the trend line through it is
    neutral.
30. **The twelve-week training calendar.** *Expect:* trained squares in the
    ribbon's neutral fill. **Count the squares against what you actually did** --
    this walk was written after a defect that dropped one real day and doubled
    another, twice a year, around the clock change.
31. **Exercise detail.** *Expect:* the hero PR number is amber and is the ONLY
    amber figure on the card. The "Estimated max" chip has **no gold background**
    and its text is readable.
31a. **Exercise detail, the history list** (D184). *Expect:* every past
    session's sets as the same hairline-ruled lines the logger draws: set number
    in a grey column, "100kg x 8" in ink (the string is byte-for-byte what the
    old chips printed), a warm-up's figure in grey with its " - Warm-up"
    suffix. One session per card, lines inside it with no gaps.
31b. **Lifts** (Progress → Lifts). *Expect:* every level badge -- Beginner
    through **Elite** -- is the same neutral outline pill with grey text. Until
    2026-09-15 the Elite badge read its colour from a token that no longer
    existed and fell through to the Beginner grey, so an Elite lift was badged
    like a beginner's.
31c. ★ **Tap an exercise row in Lifts, and a plan card in Plans.** *Expect:* the
    detail screen **grows from the row you tapped**, not from the centre. Then
    scroll a long list fast and tap a row that has just come into view.
    *Expect:* it opens **every time**. A recycled row used to be able to eat
    the tap (fixed 2026-09-16).

## F. Nutrition and the diary

32. **The diary.** *Expect:* the macro ring is **still there and still one colour
    at every value** -- but that colour is now neutral, not amber, and the card
    around it is gone. Under/over target must look identical in treatment.
33. *Expect:* the calorie figure says what it is ("left" / "over" with its unit),
    never a bare number.
34. **The water meter.** *Expect:* fill still amber, track neutral.
35. **Nutrition targets → "Open the full calculation".** *Expect:* four rows with
    **grey glyphs and no coloured discs**. The Calories row is **no longer tinted
    yellow**. Every figure and sentence must be unchanged.
36. ★ **Add a food by scanning a label.** *Expect:* uncertain figures are
    outlined in the **caution colour**, and the banner reads **"Highlighted
    figures aren't certain, check them."** It used to say "Amber figures", which
    is useless to anyone who cannot distinguish the colour.
37. **Select entries in the diary (long-press).** *Expect:* the tick box fills
    with full ink and the tick **inside it is the page colour** -- a dark tick on
    a light box in dark theme, light on dark in light theme. ★ **Check this one
    in light theme especially**; it was briefly invisible there.

## G. Community

38. *Expect:* **visually unchanged.** Every unread dot, trained-today ring and PR
    mark still amber.
39. ★ **One thing did change:** a **trained day** in the day-dots row is now the
    same neutral fill the week ribbon uses, with **today** still amber. Before,
    every trained day was amber and the app's own signature device disagreed
    with itself across two screens.
40. The "See all" link, the header glyph and the shield glyph are now neutral.
    The Respect heart is full ink when given (the filled/outline shape already
    carried the state).

## H. Settings

41. **Any Settings sub-page.** *Expect:* every row's icon is a **plain grey
    glyph with no amber disc behind it**, and all labels start on the same left
    edge with no ragged column. This changed on 104 rows across 17 screens.
42. ★ **The delete / sign-out row.** *Expect:* glyph and label **still red**. If
    either went grey, stop -- that is the state-colour grammar.
43. **Switches.** *Expect:* off is a dark bar with a mid-grey knob; on is a
    lighter bar with a knob in the page colour. **No amber anywhere.**
44. ★ **Toggle one and watch the knob cross.** *Expect:* it stays visible the
    whole way. Do not accept "it was quick".
45. ★ **Look at a switch that is OFF.** *Expect:* a grey knob. Roughly twenty
    switches used to draw an **amber** knob while switched off.
46. **A screen with many switches** (Notifications, Display). *Expect:* no row
    shouts louder than the others.

## I. Share

47. **Share a session, a PR, a milestone, a weekly recap and a before/after**, in
    both square and portrait. *Expect:* the card renders, the wordmark is
    present, and nothing is clipped.
48. **The PR card specifically.** *Expect:* "PERSONAL RECORD" as a quiet
    letter-spaced eyebrow with **no gold pill**; the exercise name; the lift as
    the hero **in amber**; "Previous best" underneath. **No glow behind the
    number, no trophy, no gold anywhere.** The tonal ground stays -- confirmed by
    the founder (D181).

## J. Accessibility sweep

49. ★ **Flip to light theme while a screen is open** (do not restart). *Expect:*
    everything recolours immediately. Nothing keeps the boot palette. This is the
    check for a defect class fixed ten times in this campaign.
50. **Largest text size.** Re-walk steps 4, 31, 37, 41. *Expect:* every selected
    state still reads -- fill, edge and weight must not collapse -- and nothing
    clips.
51. **Higher contrast on.** *Expect:* switch bars get lighter and the on/off
    difference gets **stronger**, not weaker. ★ Look hard at an ON switch's knob.
52. **Colour-blind safe mode.** *Expect:* switches look identical to step 43.
53. **Reduce Motion on.** *Expect:* the log-flash cross-fades rather than
    animating; the amber still appears and clears. No celebration anywhere.
53a. **Reduce Motion on, then move around the whole app** (2026-09-16).
    *Expect:* every push and every sheet-style screen (share, the exercise
    picker, settings sub-pages) **cross-fades**; nothing slides in from the
    side or the bottom. And nothing is DELETED: the log-flash still appears
    and clears, the personal-best toast still appears, the row-grown
    transition of step 31c becomes a plain cross-fade rather than vanishing.

### J2. The card sweep (D186, 2026-09-17) -- what is a card now and what is not

54a. ★ **Any Settings sub-page, and You.** *Expect:* the rows sit directly on
    the page, with one hairline above each group and hairlines between rows.
    **No box around a group, no fill, no rounded corner.** Rows start at the
    same left edge as the page title (they no longer pay a second gutter).
    Tap targets unchanged.
54b. **Coach tab, a week with something to apply.** *Expect:* the verdict is an
    elevated card with its amber outline (unchanged). Below it, the plan-edit
    note, the lead sentence, the focus and the countdown are **hairline
    sections, not boxes**. Then a hold week ("Nothing to change"): *Expect:*
    the verdict is the **same elevated card**, without amber. One slot, one
    shape. If a card in that slot looks wrong to you in either state, say so:
    that is the one Coach-tab question this sweep leaves open.
54c. **Diary.** *Expect:* each MEAL is still a card (a meal is a thing you add
    to), now with the app's one card edge; the "today's plate" teaser and the
    empty-diary state are hairline sections on the page.
54d. **Plans.** *Expect:* a plan is a card; folders and the unfiled list are
    hairline groups with their rows on the page's edge. **Lifts:** each lift
    row is a card (you open it, long-press it); the standing header and the
    body-weight prompt are hairline sections. **Progress:** the training-block
    card stays a card; the calendar, duration, frequency and workload panels
    are hairline sections, and a fresh install's "No plan running yet" is a
    hairline section, not a box.
54e. **Home.** *Expect:* the constraint group and the quick-start row are
    hairline sections; the day badges in "change workout" are circles.
54f. **Weekly check-in, onboarding, body metrics, wellbeing.** *Expect:* the
    gate state, the scan prompt, the questions, the confirm and log forms and
    the sequence panel are hairline sections on the page's ground. Every
    button that used to wear a card corner has the tighter control corner.
    **Nothing about what these screens SAY or SUPPRESS changed** (section K
    still proves that).
54h. **Today, tap the block chip ("stop N short" / week line).** *Expect:* the
    "Your block" sheet ends after the recovery-week paragraph. **No "Reps in
    reserve" paragraph** (founder order 2026-09-17, D189). TalkBack on the
    chip says "See the shape of your training block" and nothing about the
    effort target.
54i. **Today, before any weigh-in.** *Expect:* the morning-weight row reads
    "Morning weight / Not logged yet / Log" and nothing else. **No "Before
    breakfast" sentence** (founder order 2026-09-17, D190).
54j. ★ **Today, the hero card** (D191). *Expect:* "Start workout" carries a
    small **amber play glyph**; "Options" is quieter, with a grey glyph. The
    two no longer read as twins. Start workout is still a raised grey button,
    not an amber-filled one.
54k. ★ **Today, the week ribbon, before you train** (D191). *Expect:* today's
    cell is an **amber outline** on the quiet fill, not a solid amber block.
    Then finish a session. *Expect:* today's cell **fills amber**. Any other
    trained day is the neutral fill. Say whether the outline reads as "today"
    at a glance; this is your favourite component and the change is mine.
54l. **Today, before any food is logged** (D191). *Expect:* the Nutrition line
    reads "2,580 kcal target" with "Nothing logged yet · Protein 192 g" under
    it, in the same sizes as before. Log one food. *Expect:* it returns to
    "N / 2,580 kcal" and "Protein N / 192 g".
54m. **Logger buttons** (D186 tail). *Expect:* Log set, the swap-browse
    button, the superset and keep-training buttons and the auto-advance
    action all have the slightly tighter control corner; colours and heights
    unchanged. A cluster or per-side prompt is a hairline section, not a box.
54n. **Workout summary, the stat tiles** (D186 tail). *Expect:* the tiles
    are plain figures on the page under **one** hairline above the row, not
    one box each; the "Rate this workout" button has the control corner; the
    save-error banner (if you ever see it) keeps its tinted shape.
54o. **Exercise detail, the chart** (D186 tail). *Expect:* the strength chart
    sits under a hairline with no box or fill, in dark and in light.
54p. **Onboarding, the sequence panel** (D186 tail). *Expect:* unchanged, a
    charcoal surface with a hairline. That is your D147 verdict and it stands.
54q. **Avatar presets** (D187). *Expect:* on the profile's avatar picker, in
    any Community list and on the join screen, every preset glyph is plain
    ink. No amber Strength, no red Conditioning, no yellow Power. Selection
    shows only as the ring and the tick.
54g. ★ **Look for orphan rules.** A hairline directly under a screen title,
    two hairlines with nothing between them, or a hairline at the very top
    of a screen with nothing above it is a defect of this sweep. Report the
    screen.
54. **TalkBack.** Swipe a switch, a chip and a stat. *Expect:* state announced
    correctly; the big numbers read as one sentence with their units.

---

## K. ED-SAFETY — NOT OPTIONAL

Nothing in this campaign was supposed to change any of this. These steps exist to
prove that. **Any deviation here is a stop-everything finding.**

55. **Calm mode on.** Open Progress, Body metrics, the diary and a session
    summary. *Expect:* everything that was withheld before is still withheld.
    Nothing new appeared. No celebration, no reward haptic.
56. **Calm mode on → finish a session that crosses a milestone.** *Expect:* the
    milestone card is **withheld entirely**, as before.
57. ★ **With an open ED flag, open your own profile.** *Expect:* the physique
    tile shows the **neutral "not scored yet" placeholder** -- **not** a body-fat
    percentage. Until 2026-09-15 the suppression withheld the score and then
    showed the raw percentage instead, which was worse than doing nothing.
58. **With an open ED flag, open Progress and Body metrics.** *Expect:* no
    weekly rate, no maintenance figure, no state dot. The weight and the chart
    stay.
59. **Coach output with an ED flag open.** *Expect:* the lockout card is
    unchanged, with its caution edge, its exact copy, the Beat UK signposting,
    and **"Get support" still a solid amber button**.
60. **Calorie floors.** Force a very aggressive cut in Nutrition targets.
    *Expect:* the floor banner appears with its **green shield** and its exact
    wording; the caution banners keep their **yellow** glyph; and the **"Ease
    this cut to about N kcal" nudge is still amber** and still raises calories
    when tapped.
61. **Weight- and food-adjacent reminders.** With an ED flag open, confirm they
    are still suppressed.
62. **Anywhere in K:** no body-weight number animates or counts up.

---

## L. Known, deliberate, and not defects

Listed so they are not reported as bugs.

- **The thin amber line above the logger's exercise strip.** A named founder
  device order of 2026-08-22 ("the same amber at the same weight, but STATIC and
  full width"). By the campaign's own rule a static full-width accent edge is
  decoration, but reversing a founder device verdict is the founder's call. It
  is untouched, and it is the one open question from stage 3.
- **The macro bars in the diary keep their category hues** (amber protein, blue
  carbs, violet fat). Those are category tokens on a meter, which is what they
  are for.
- **The camera reticle and the label-alignment frame stay amber.** They are drawn
  over a live camera feed, where no neutral can be guaranteed legible against
  arbitrary scene content.
- **Spinners, pull-to-refresh, meters that track a live value, the set you are
  on, today's cell, the one committing button on a screen, and personal-best
  marks are all still amber.** That is the whole list of what amber is for.

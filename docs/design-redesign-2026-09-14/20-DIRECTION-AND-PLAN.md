# 20 — DESIGN DIRECTION AND PLAN (2026-09-14, v3 — DIRECTION RULED)

Authority: founder, in chat 2026-09-14, twice.

First: "I'd like you to plan a complete app look and feel redesign as I don't
like what we have and I think it looks far too much like it's built by ai",
naming eight references (Revolut, Things 3, Linear, Flighty, Airbnb, Arc, Calm,
Duolingo) and asking for research, a plan and image suggestions.

Then, correcting it: "And importantly, I wouldn't make it look like a fitness
app. The current 2026 design trend is actually moving toward minimalism,
thumb-friendly layouts, bottom sheets, restrained glass effects, tactile depth
and purposeful micro-interactions rather than simply throwing gradients and
cards everywhere", plus the Dezzayn resource.

**Status: DIRECTION RULED BY THE FOUNDER (D165). Stage 1 is building.**
The three directions in v2 are superseded by direction **D — "Ledger, dark"**
(section 4), ruled by the founder in chat 2026-09-14 along with a screen-level
specification for Today and Progress and three corrections to the lead's plan.
The research rulings behind it are **D164**; both are in
`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`.

**ONE THING IS HELD, and it is held openly rather than quietly reduced:** the
founder's Progress specification makes bodyweight the single largest element in
the product and adds a headline body-fat figure. That is ED-adjacent, Section 2
requires a stop rather than an interpretation, and it is with the founder as a
question (section 10). Everything else builds meanwhile.

**Version history in this file:** v1 proposed one direction ("Instrument") and a
new typeface; v2 withdrew the typeface, corrected six research points and
offered three directions; v3 records the founder's ruling and their additions.
v1 and v2 are superseded, not deleted, so a later stage can see what changed.

**v2 supersedes v1 of this file.** v1 proposed a single direction called
"Instrument" and a new typeface. The typeface is withdrawn (section 2.6) and
the single direction is replaced by three (section 4), both because of the
founder's non-fitness correction and because two further research lanes
reported after v1 was written. v1's diagnosis (section 1) is unchanged, because
it is measured rather than argued.

Evidence, four read-only lanes, all in this folder:
- `10-research-references.md` — the eight references broken into 42 nameable
  devices, plus fourteen further products, plus a 20-item checklist of what
  makes an app read as machine-made (Opus, web).
- `11-current-state-audit.md` — what Volyume's visual system actually is, with
  counts and file:line, and the blast radius of changing it (Opus, tree).
- `12-shipped-patterns.md` — what large products actually shipped in 2025-26,
  dated and attributable, and what of it is reachable on RN 0.81 / Expo 54
  (Opus, web + tree).
- `13-trends-verified.md` — the founder's six trend claims tested one by one
  against evidence rather than commentary (Opus, web).

Delivered to the founder in chat as an artifact showing the corrections, the
three directions rendered as the same screen, and the plan:
https://claude.ai/code/artifact/b97ca3da-d1ad-47ca-9936-38fc00963036

## 1. The diagnosis: a good system, applied generically (unchanged from v1)

The founder's verdict is right, and the cause is NOT the palette, the tokens or
the font. Those are genuinely well built: Inter ships as a real custom font
(`src/styles/fonts.js:4-12`, loaded `App.js:209-210`), contrast is computed and
asserted for four palettes across five elevation steps in both themes
(`theme.test.js`), and the token lint has held 268 product files to 14 raw
radius literals. `docs/rules/styling.md:55` claiming "System fonts" is simply
wrong and must be corrected.

The failure is one layer up, in composition and authorship:

1. **Nothing is ever loud.** 73.9% of all typed text in the product is 11 px or
   13 px; 92.9% is 16 px or smaller; **five sites in 106 screens exceed 24 px**.
   `type.display` has one call site. On four of five tab screens the largest
   text is the screen's own name.
2. **Every block is the same object.** Every tab screen is
   `SafeAreaView > ScrollView(padding: lg) > ScreenHeader > stacked cards`;
   every block is the same width (viewport − 32), the same radius (16) and the
   same hairline. There is no full-bleed moment in the daily product.
3. **One radius does five jobs.** `radius.lg` is the card, the button, the empty
   state, the tooltip and the tab-bar pill (`Card.js:39`, `Button.js:299`,
   `EmptyState.js:127`, `InfoTooltip.js:122`, `VolyumeTabBar.js:200`). A button
   and a card are geometrically identical.
4. **204 `<Card>` instances in 65 files, plus 85 files that hand-roll one**, plus
   `EmptyState` as a separate card at 99 instances in 54 files. The Today screen
   repeats `Card → SectionLabel → Text → Text` three times, which is the literal
   tell critics name first.
5. **99 identical empty states**: a 52 px amber circle round a stock outline
   glyph, centred title, centred body, centred buttons.
6. **No signature device.** `theme.js:28-29` promises a Skia glow on the Home
   Start button; there is no Skia glow anywhere in the app.
7. **683 stock Ionicons, 244 of them amber-tinted**, against the app's own
   written rule not to spend amber on decoration.

Worth noting for the founder: `eslint.config.js:256-261` already errors on
machine-tell WORDS in copy. The project has an enforced anti-AI-fingerprint rule
that covers vocabulary only; every structural tell above passes it clean.

## 2. What the research corrected, including two of ours

Recorded because a later stage must not rebuild from the uncorrected version.

**2.1 Dezzayn's screens are paywalled.** The app index is genuinely public
(1,130 apps, 15 categories) but every flow and element search resolves to a
login, and a public app page gives one paragraph and one cover thumbnail. The
publicly reachable Revolut "cover" is its splash screen. $12/month, $30/quarter,
$100/year. Nobody has browsed those screens on the founder's behalf; the shipped
patterns in report 12 were sourced from published design-team writing, platform
documentation and dated release notes instead.

**2.2 "2026 is moving to minimalism" is mis-framed.** The strongest recent
evidence runs the other way: a CHI 2026 study built ten apps twice, to Google's
calmer guidelines and to Material 3 Expressive, and tested 48 participants; the
expressive builds were **33% faster to first fixation on the target element and
20% faster to task completion**, and were preferred aesthetically. What they
varied was size, shape, colour, containment and type, i.e. **hierarchy**, not
decoration. So the goal is differentiation, not less ink, and the measured
defect at 1.1 above is exactly the defect that study punishes. Trend writing for
2026 is genuinely split (one camp "calm interfaces", another "anti-design and
maximalism as a response to AI-generated mediocrity"); it is the weakest class
of evidence in the folder and is discounted.

**2.3 The thumb-zone heat map is not true.** The researcher who produced it
later found that people prefer to touch the **middle** of the screen, are most
accurate there, and change grip constantly; NN/g concur. The instruction
survives with a different reason: controls off the top corners, committing
button large, because of accuracy and reach in the middle two-thirds. The usable
hard number is a **58 dp** one-handed thumb target, against the 44-48 dp
everyone quotes; our 48 dp minimum stays as the floor, and the primary
committing control goes above it.

**2.4 Bottom sheets, but not in the logger.** NN/g are explicit: a sheet must
not replace page-to-page flows, sheets must not stack, a close affordance is
always visible. `@gorhom/bottom-sheet` has open Android defects specifically in
the keyboard-plus-list case, which is precisely set entry. **RULED: sheets for
one short choice or one value (the app already does this in 35 places); set
editing stays inline in the ledger.**

**2.5 Glass has a kill switch on both platforms.** Apple shipped a Tinted mode
in iOS 26.1 after criticism of roughly 1.5:1 contrast, then a transparency
slider; Android's VP of product management for UX is on record promising a
setting to turn blur off. A material both platform owners had to make optional
within twelve months cannot carry a product's identity. We do not have
`expo-blur` installed and `theme.js:26` already declines it on the Android-first
rule; adding it would be a founder-gated new dependency. **RULED: depth from
surface-lightness steps and hairlines, which the contrast suite already asserts.
No blur, no glow, no depicted material.**

**2.6 The lead withdraws the new typeface.** v1 proposed Archivo at an expanded
width and described it as reading like a scoreboard. A scoreboard is a sports
cue, which is the opposite of the founder's correction the following day. The
reference set we want to descend from pairs one grotesque with tabular figures
and adds a mono only in developer tooling. We already ship Inter and Inter
Display (seven faces) and already have `type.num(role)`. The gap was never the
typeface; it is that five sites in 106 screens set type above 24 px. **RULED: no
new font.** This also removes a decision from the founder and a thing that
would date.

## 3. The honest answer to "don't make it look like a fitness app"

We currently do. A dark ground with one hot accent IS the category signature
(Strava orange on dark, Whoop near-black with signature red); we are amber on
near-black, inside it rather than outside it. And we carry the category's props:
four flame sites including the set row and the workout card; macro rings drawn
in Skia; trophy glyphs plus literal gold/silver/bronze colour tokens; 244
amber-tinted stock icons; and a promised glow which is also on the published
list of machine-made tells and should stay unbuilt.

One precision worth keeping: the widely quoted "this looks AI-made" palette,
named in the New Yorker in June 2026, is a **cream ground with a rusty orange
and a large italic serif**. That is not us. Our exposure is narrower: amber
spent as decoration rather than as meaning.

**The four amber disciplines** (they apply to every direction below):
1. **Scarcity.** Amber marks "now" and nothing else: today's ribbon cell, the
   set you are on, the one committing button, a personal best.
2. **No warm ground.** The accent never becomes a wash, a tint behind a glyph,
   or a gradient.
3. **No co-occurring tells.** Amber never appears alongside a flame, a trophy, a
   medal colour or a glow. Those go (stage 3).
4. **Earned by data.** A colour is applied because a number or a state justifies
   it, never because a row needs visual interest.

## 4. THE RULED DIRECTION: D — "Ledger, dark" (founder, D165)

The founder ranked the three (B five stars, A four and a half, C three and a
half) and then ruled a hybrid rather than any one of them:

> "I would NOT choose A exactly as shown. I'd choose a hybrid of A + B, with B's
> visual language and A's information architecture."

With the decisive qualification, which is why this is not simply "B":

> "I actually think Dark = primary Volyume identity, Light = alternative theme
> is stronger. And I'd make the dark theme less 'Terminal' than A. Think: Linear
> x Things 3 x Apple x high-end performance software rather than: Bloomberg x
> developer terminal."

**So: B's visual language and restraint, A's information architecture, C's
warmth in the ground, shipped dark-first with light as the alternative theme.**
A, B and C as rendered are superseded. D is what gets built.

**The palette, as the founder specified it.**
- Ground: "very dark charcoal rather than absolute black. Something around:
  `#111110`". This moves off `#0D0D0D`, so the contrast suite is recomputed —
  the cost v2 attributed to direction C is now in scope and is accepted.
- Primary text: "warm off-white rather than pure white".
- Secondary text: "muted warm grey".
- Accent: amber, "only when something actually means something".

**Why the warmth matters, in the founder's terms.** Volyume should feel
"premium + intelligent + physical + modern", not "developer tools + financial
terminal". The austerity of A was read as "Bloomberg terminal for people who
lift weights" — distinctive, but the wrong brand. Warmth is the correction, and
it is a ground-and-ink correction rather than a decoration one: nothing in the
no-gradient, no-glow, no-prop list is relaxed to get it.

**The light theme is not dropped.** B stays as the alternative theme and is
built out properly rather than left as the half-finished palette it is today
(`theme.js:200-201` still records that it wants an on-device sign-off).

## 4a. The founder's own statement of the design law

Recorded verbatim, because it supersedes any paraphrase of it and is the thing
a later stage is checked against:

> "Volyume should not look like a fitness app. It should look like a premium
> personal performance system. No gamification. No decorative fitness
> iconography. No gradients. No glow. No gratuitous cards. No neon. No
> motivational bullshit. Use typography, spacing, hierarchy and data to create
> visual interest. Amber means now / action / meaningful change. Large
> typography establishes what matters. Rows establish information. Cards are
> reserved for genuine objects. Every screen should have one obvious thing that
> matters most. The interface should tell the user what happened, why it
> happened and what to do next."

## 4b. Three changes the founder made to the lead's plan

**1. No cryptic minimalism. A number states what it is.** On the bare "9,240"
under a workout row: "I don't immediately know what 9,240 means ... You don't
want the minimalist design to become cryptic. That's an important distinction."
This is now a law (5.7). Restraint is never bought with ambiguity, and removing
a unit is not restraint.

**2. The card doctrine, corrected.** The lead's page said "all three drop the
cards", which was wrong as written. The founder:

> "Don't interpret that as 'Cards are bad.' The better principle is: Don't put
> everything in a card. A card should mean: This thing is an object. A workout
> might be an object. A set isn't. A macro number probably isn't. A trend isn't
> necessarily. A button definitely isn't."

Law 2 is restated to this. The test is **objecthood**, not containment, and the
stage 3 sweep removes cards that fail the test rather than cards as such.

**3. Today is the centre of the product; Progress ends in a decision.** Both
screens are specified at section 4c, in the founder's own order. The rationale
is a positioning statement, not a layout preference:

> "Volyume's proposition is: Your data tells you what to do next. So the UI
> should constantly reinforce that. Not 'Here are 17 metrics.' But: Here's what
> happened. Here's why. Here's what you should do."

## 4c. The two specified screens

**TODAY** (founder's order and wording):

```
TODAY
Tuesday · 15 September

Upper A
6 exercises · 18 sets · ~52 min
[ START ]

YOUR WEEK
M  T  W  T  F  S  S
[ribbon]
4 sessions this week

Nutrition
2,840 / 3,200 kcal
Protein 218 / 230 g

Progress
+0.4 kg this week

COACH
Weight and performance are both moving as planned. No change needed.
```

**PROGRESS** (founder's order and wording):

```
98.5 kg
+0.4 kg this week
[restrained graph]

PHYSIQUE      ~11%
PERFORMANCE   ↑
TREND         On target

DECISION
Keep calories unchanged.
```

Two things about the Progress screen are NOT settled by this section: the
ED-safety question at section 10, and whether every one of those four facts can
be sourced from what the engine already computes without inventing a number.
Both are being established before that screen is built. Nothing here licenses a
new computation: the coaching engine is deterministic and stays pure.

## 5. The laws (founder-confirmed, and now seven)

**Law 1 — One loud thing per screen.** Exactly one element at display scale
(40-72 px), always the thing the screen is for: the session on Today, the
working weight in the logger, the headline figure on Progress. Everything else
drops so that one thing carries. (Whoop sets its recovery score at ~72 pt for
arm's-length readability; we top out at 20 px. The CHI 2026 finding at 2.2 is
the evidence that this saves time rather than merely looking better.)

The founder restated this as an information hierarchy, and that restatement is
now the law's definition rather than a gloss on it: **"What am I doing? / What
do I need to know? / What do I do?"** On Today that is the session name, then
its meta line, then Start. Every screen answers those three in that order, and
the first one is the loud thing.

**Law 2 — Rows on the canvas; a card means an object.** Content sits on the
background, separated by space and a `borderSubtle` hairline. This is Things 3
and Linear, and it is the fix already proven on Community under CR-17/D163.

The founder corrected the lead's phrasing here and the correction is the law:
NOT "cards are bad", but **"don't put everything in a card. A card should mean:
this thing is an object."** The test is objecthood. A workout might be an
object; a set is not, a macro number probably is not, a trend is not
necessarily, and a button definitely is not. Stage 3 removes the cards that
fail that test, not cards as such.

**Law 3 — Geometry carries meaning.** A control is 10 px and never a pill; a
card stays 16 px; one full-bleed moment is allowed per screen and only one.

**Law 4 — Depth, not glass.** Five ranks of surface lightness plus hairlines,
each asserted by the contrast tests we already run. Press feedback under 100 ms,
settling under 400. No blur, no glow, no depicted material (2.5).

**Law 5 — Motion with a ceiling.** Feedback starts within 100 ms and finishes
inside 400 ms, decelerating in and accelerating out, never the same curve both
ways. Reduce Motion replaces motion with a cross-fade rather than removing the
feedback. No celebratory animation and no reward haptics: that is the ED-safety
rule, and it is also what keeps the app from reading as a game.

**Law 6 — Amber means one thing.** The four disciplines at section 3.

**Law 7 — A number states what it is.** Restraint is never bought with
ambiguity. Every figure carries its unit and, where the unit alone is not
enough, its name: "9,240 kg" rather than "9,240". Founder, on exactly that
figure: "You don't want the minimalist design to become cryptic. That's an
important distinction." Units follow the user's own preference (kg/lb) as they
do everywhere else in the app.

**The two signature devices** (the app has none today; built once, reused
everywhere, which is what makes an app read as authored):
- **The week ribbon.** Seven cells, always the same position and size: filled
  for a session, outlined for a planned rest day, amber for today. On Today, on
  Progress, on a profile, in the widget. It is also the honest, ED-safe answer
  to a streak, because a rest day draws as a rest day, not a gap.
- **The ledger.** Every set, everywhere, as hairline-ruled rows of tabular
  figures: the set you are on in amber, everything behind it grey. A training
  log that looks like a log book.

**Progression, ED-safe.** Denominator framing ("47 of the last 50 weeks"), never
a streak that can break; progress advances whether or not the session went well
(Duolingo's safest mechanic, and Gentler Streak's whole posture). Every
loss-aversion device is refused: no flame that speeds up, no hearts, no leagues,
no red broken state, no confirmshaming notification.

## 6. The reference set, revised

**Keep four.** Linear (recede the chrome; a four-step ink ladder; negative
tracking on display sizes only). Things 3 (rows on the canvas; hierarchy from
weight and space). Flighty (one surface showing a different most-relevant fact
per phase; and "explain the number", which our deterministic engine already
computes and never says). Revolut, for ONE idea only: a single searchable hub so
the tab bar never grows past five (106 screens sit behind four tabs today).

**Drop four, with reasons.** Duolingo: its engine is loss aversion, which our
ED-safety rules forbid outright. Calm: designed for a dark room and a resting
pulse, not gym lighting at arm's length. Airbnb: its device is owned
photography, which we do not have, and stock imagery is itself a machine-made
tell. Arc: gesture-primary navigation fails one-handed use with chalky hands
(its press/release physics are already in our motion tokens).

**Add four, and note the change of purpose.** Whoop and Strong/Hevy are now
studied as the category we are trying to sit OUTSIDE, not as models to copy;
they tell us what the signature is so we can avoid it. Gentler Streak (2024
Apple Design Award) replaces Duolingo outright. Garmin stays as the warning:
they shipped big decorative cards, users complained that less data fitted on
screen, and they retrofitted a four-stat strip. That is the failure mode we are
already in.

## 7. The plan: four stages, each shippable alone

106 screens, 162 components, 256 theme-consuming files, and **189 of them write
every colour twice** (frozen `StyleSheet.create` plus a per-render `live` object;
153 carry an explicit `buildLiveStyles`). A big bang would be a month of risk
with nothing to show. Each stage is green, merged and device-walked before the
next starts.

**Stage 1 — the spine.** Author the three objects everything else is made of
(the number display, the set row, the primary button), plus the ribbon and the
ledger. Add the display step to the type scale (existing faces; no new font).
Split `radius.lg` into a card radius and a control radius. Write laws 1-7 into
`docs/rules/styling.md` with a source guard behind each, exactly as
`community.layout.guard.test.js` now does. Correct the "System fonts" error in
the styling rules. Nothing user-visible changes except those objects, everywhere
they already appear.

The ground moves to the founder's charcoal in this stage too, because it is a
token change and the contrast suite has to be recomputed once rather than twice.
Stage 1 touches no ED-adjacent surface, so it does not wait on section 10.1.

**Stage 2 — the five screens that matter.** Today, the logger, Progress, the
workout summary, Nutrition. Today and Progress are specified by the founder at
section 4c and are built to that specification, in that order; the other three
are recomposed to the laws. The logger is hurt most by the current scale: 6,941
lines, largest type 20 px, on the screen you read with a bar in your hands.
Progress is gated on the section 10.1 answer; the rest of stage 2 is not. This
is the stage the founder judges.

**Stage 3 — the long tail and the props.** The other hundred screens and the
empty states: retire the 99 boxed empties to the section rule proven on
Community, remove the flames, the medal colour tokens and the reward props (§3),
thin the stock iconography, sweep hand-rolled cards into the real one.
Mechanical, agent-run, guarded.

**Stage 4 — the moments.** The origin-aware hero-zoom transition the app already
has but uses on only 9 of 137 screens, and one properly made personal best
moment that states a fact rather than throwing confetti. Last, because it is
decoration if the rest is not right.

## 8. What must survive the redesign

Named so a later stage cannot quietly lose them: the computed WCAG contrast
assertions (`theme.test.js`); the token lint bank; the state-colour grammar;
tabular numerals (154 sites); 48 dp touch targets; Reduce Motion; the calm
non-shaming voice; and the origin-aware transition, which is well built and
should be extended rather than replaced.

## 9. Cost facts the plan must not get wrong

- The double-write problem (189 files) needs a position BEFORE screen one.
- "Change the card" means three components: `Card`, `EmptyState`, and 85
  hand-rolled ones.
- 92 test files assert on presentation (57 on colour tokens, 28 on type roles);
  each stage updates its own guards rather than weakening them.
- Any palette change must be mirrored by hand into `src/widgets/widgets.js` and
  `src/lib/shareCard/drawShareCard.js`, which cannot import the theme.
- The light theme is live and user-selectable, and `theme.js:200-201` records
  that it still wants the founder's on-device sign-off. That is outstanding, and
  direction B would make it the primary theme.
- Amber on the current ground computes at 9.59:1 (#F5A623 on #0D0D0D). Any
  ground change (direction C) re-runs the whole suite.

## 10. Open items for the founder

**1. ED-SAFETY: bodyweight as the loudest thing in the product. HELD, not
reduced.** The specified Progress screen makes `98.5 kg` the single largest
element on the screen, and adds `PHYSIQUE ~11%` as a headline fact. Today also
gains `+0.4 kg this week`.

This is not a restyle of something that already exists at that prominence; it
is a material change in how loudly the product states a person's bodyweight and
body composition. CLAUDE.md Section 2 says to stop and ask on anything touching
the ED-safety system rather than interpret, and Section 4 forbids quietly
shipping a reduced version instead. So the lead is doing neither: the question
goes to the founder with the evidence attached, and everything else on both
screens is built meanwhile.

The question is not whether to build the founder's design. It is the narrow one
of what the screen does for a person the app has already flagged: today the app
withholds weight-adjacent content under calm mode and under an open ED flag, and
a 40-72 px bodyweight figure is the loudest possible version of exactly that
content. The options are put to the founder in chat with what each one costs.
Nothing about floors, gates, detectors, calm mode or the Beat UK signposting
changes under any of them.

**2. The rest timer.** `loggerVisualArchitecture.guard.test.js:6,58` pins the
rest timer small and bans `fontSize: 26`, recorded from a founder device
verdict. Law 1 wants the working weight loud and the timer quiet, which agrees
with that verdict, but it is confirmed rather than assumed before stage 2
touches that screen.

**3. Dezzayn, optional.** $12/month for a standing reference library. Useful for
a redesign this size; nothing in the plan depends on it.

**Closed by D165:** which direction (answered: D, section 4).

## 11. Device checklist (when stage 1 lands, not before)

Written now so the stage cannot land without one: on a physical Android device
from an EAS build of main, (1) every screen still passes contrast in both themes
at the largest accessibility text size; (2) the loud number on Today and in the
logger is legible from two metres; (3) a long session name at the largest text
size does not truncate mid-word; (4) Reduce Motion still flattens every new
transition; (5) the widget and the share card still match the app's palette;
(6) the primary committing control measures at least 58 dp and sits clear of the
top corners; (7) every figure on every changed screen carries its unit, in the
user's own unit preference (law 7); (8) the warm ground reads as charcoal rather
than black on an OLED panel in gym lighting, and the warm off-white does not
read as cream.

ED-safety: stage 1 reads and writes no weight, food or notification behaviour,
and the ribbon draws a planned rest day as a rest day rather than a gap. When
Progress is built (stage 2), its checklist additionally walks calm mode and an
open ED flag on that screen specifically, per whatever the founder answers at
section 10.1.

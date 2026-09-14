# 20 — DESIGN DIRECTION AND PLAN: "Instrument" (lead, 2026-09-14)

Authority: founder, in chat 2026-09-14: "I'd like you to plan a complete app
look and feel redesign as I don't like what we have and I think it looks far
too much like it's built by ai", naming eight references (Revolut, Things 3,
Linear, Flighty, Airbnb, Arc, Calm, Duolingo) and asking for research, a plan
and images. NOT YET RULED: this is a proposal with three founder forks in
section 7. Nothing is built.

Evidence, both read-only and both in this folder:
- `10-research-references.md` — the eight references broken into 42 nameable
  devices, plus fourteen further products, plus a 20-item checklist of what
  makes an app read as machine-made (Opus, web).
- `11-current-state-audit.md` — what Volyume's visual system actually is,
  with counts and file:line, and the blast radius of changing it (Opus, tree).

Delivered to the founder in chat as an artifact showing the diagnosis, the
three laws and rendered screens: https://claude.ai/code/artifact/b97ca3da-d1ad-47ca-9936-38fc00963036

## 1. The diagnosis: a good system, applied generically

The founder's verdict is right, and the cause is NOT the palette, the tokens
or the font. Those are genuinely well built: Inter ships as a real custom
font (`src/styles/fonts.js:4-12`, loaded `App.js:209-210`), contrast is
computed and asserted for four palettes across five elevation steps in both
themes (`theme.test.js`), and the token lint has held 268 product files to 14
raw radius literals. `docs/rules/styling.md:55` claiming "System fonts" is
simply wrong and must be corrected.

The failure is one layer up, in composition and authorship:

1. **Nothing is ever loud.** 73.9% of all typed text in the product is 11 px
   or 13 px; 92.9% is 16 px or smaller; **five sites in 106 screens exceed
   24 px**. `type.display` has one call site. On four of five tab screens the
   largest text is the screen's own name.
2. **Every block is the same object.** Every tab screen is
   `SafeAreaView > ScrollView(padding: lg) > ScreenHeader > stacked cards`;
   every block is the same width (viewport − 32), the same radius (16) and
   the same hairline. There is no full-bleed moment in the daily product.
3. **One radius does five jobs.** `radius.lg` is the card, the button, the
   empty state, the tooltip and the tab-bar pill (`Card.js:39`,
   `Button.js:299`, `EmptyState.js:127`, `InfoTooltip.js:122`,
   `VolyumeTabBar.js:200`). A button and a card are geometrically identical.
4. **204 `<Card>` instances in 65 files, plus 85 files that hand-roll one**,
   plus `EmptyState` as a separate card at 99 instances in 54 files. The
   Today screen repeats `Card → SectionLabel → Text → Text` three times, which
   is the literal tell critics name first.
5. **99 identical empty states**: a 52 px amber circle round a stock outline
   glyph, centred title, centred body, centred buttons.
6. **No signature device.** `theme.js:28-29` promises a Skia glow on the Home
   Start button; there is no Skia and no glow anywhere in the app.
7. **683 stock Ionicons, 244 of them amber-tinted**, against the app's own
   written rule not to spend amber on decoration.

Worth noting for the founder: `eslint.config.js:256-261` already errors on
machine-tell WORDS in copy. The project has an enforced anti-AI-fingerprint
rule that covers vocabulary only; every structural tell above passes it clean.

## 2. The direction: Instrument

Volyume is a precision tool used at arm's length, mid-set, by someone who
trains properly. It should read like an instrument: quiet nearly everywhere,
enormous where it counts, warm rather than clinical. Not a lifestyle app, not
a game. The register is competence and clarity, never hype and never cosy.

**Law 1 — One loud thing per screen.** Exactly one element at display scale
(40-72 px), always the thing the screen is for: the session on Today, the
working weight in the logger, the headline figure on Progress. Everything else
drops so that one thing carries. (Whoop sets its recovery score at ~72 pt
specifically for arm's-length readability; we top out at 20 px.)

**Law 2 — The canvas is the surface.** Rows sit on the background, separated
by space and a `borderSubtle` hairline. A `Card` comes to mean one thing: a
discrete object you can pick up (a plan, a person, a photo). This is Things 3
and Linear, and it is the fix already proven on Community under CR-17/D163.

**Law 3 — Geometry carries meaning.** A control is 10 px and never a pill; a
card stays 16 px; one full-bleed moment is allowed per screen and only one.
Shape becomes a signal instead of a default.

**The signature devices** (the app has none today; these are built once and
reused everywhere, which is what makes an app read as authored):
- **The week ribbon.** Seven cells, always the same position and size: filled
  for a session, outlined for a planned rest day, amber for today. On Today,
  on Progress, on a profile, in the widget. It is also the honest, ED-safe
  answer to a streak, because a rest day draws as a rest day, not a gap.
- **The ledger.** Every set, everywhere, as hairline-ruled rows of tabular
  figures in the display face: the set you are on in amber, everything behind
  it grey. A training log that looks like a log book.

**Typography.** Keep Inter for UI and body: it is legible in a gym, it already
ships, and it is also the safest possible choice, which is why it cannot also
be the personality. Add ONE face for the loud thing and for figures:
**Archivo** at an expanded width (OFL, two more .ttf files, no new npm
dependency). Caveat to walk on device: at expanded widths a long session name
can run out of room at the largest accessibility text sizes; the fallback is
the same face at normal width.

**Colour.** The palette stays. The BUDGET changes: amber means exactly one
thing, "now" (today's ribbon cell, the set you are on, the one committing
button, a personal best). One cool tone joins it so the app can say "rested"
without saying "good". A live critique names beige-and-orange as the signature
of machine-made design; the defence is discipline, not a different hue: amber
on data only, never a decorative wash, never an icon that fills a circle.

**Progression, ED-safe.** Denominator framing ("47 of the last 50 weeks"),
never a streak that can break; progress advances whether or not the session
went well (Duolingo's safest mechanic, and Gentler Streak's whole posture).
Every loss-aversion device is refused: no flame that speeds up, no hearts, no
leagues, no red broken state, no confirmshaming notification.

## 3. The reference set, revised

**Keep four.** Linear (recede the chrome; a four-step ink ladder; negative
tracking on display sizes only). Things 3 (rows on the canvas; hierarchy from
weight and space). Flighty (one surface showing a different most-relevant fact
per phase; and "explain the number", which our deterministic engine already
computes and never says). Revolut, for ONE idea only: a single searchable hub
so the tab bar never grows past five (106 screens sit behind four tabs today).

**Drop four, with reasons.** Duolingo: its engine is loss aversion, which our
ED-safety rules forbid outright. Calm: designed for a dark room and a resting
pulse, not gym lighting at arm's length. Airbnb: its device is owned
photography, which we do not have, and stock imagery is itself a machine-made
tell. Arc: gesture-primary navigation fails one-handed use with chalky hands
(its press/release physics are already in our motion tokens).

**Add four.** Whoop, the closest reference to what we are. Gentler Streak
(2024 Apple Design Award), which replaces Duolingo outright. Strong/Hevy, for
an interface built on the assumption you are mid-session and resting between
sets. Garmin as a warning: they shipped big decorative cards, users complained
that less data fitted on screen, and they retrofitted a four-stat strip. That
is the failure mode we are already in.

## 4. The plan: four stages, each shippable alone

106 screens, 162 components, 256 theme-consuming files, and **189 of them
write every colour twice** (frozen `StyleSheet.create` plus a per-render
`live` object; 153 carry an explicit `buildLiveStyles`). A big bang would be a
month of risk with nothing to show. Each stage is green, merged and
device-walked before the next starts.

**Stage 1 — the spine.** Author the three components everything else is made
of (the number display, the set row, the primary button), plus the ribbon and
the ledger. Add the display face. Split `radius.lg` into a card radius and a
control radius. Write the three laws into `docs/rules/styling.md` and put a
source guard behind each, exactly as `community.layout.guard.test.js` now
does. Correct the "System fonts" error in the styling rules. Nothing
user-visible changes except those objects, everywhere they already appear.

**Stage 2 — the five screens that matter.** Today, the logger, Progress, the
workout summary, Nutrition. Recompose each to the three laws. This is the
stage the founder judges.

**Stage 3 — the long tail.** The other hundred screens and the empty states:
retire the 99 boxed empties to the section rule proven on Community, thin the
stock iconography, sweep hand-rolled cards into the real one. Mechanical,
agent-run, guarded.

**Stage 4 — the moments.** The origin-aware hero-zoom transition the app
already has but uses on only 9 of 137 screens, and one properly made personal
best moment that states a fact rather than throwing confetti. Last, because it
is decoration if the rest is not right.

## 5. What must survive the redesign

Named so a later stage cannot quietly lose them: the computed WCAG contrast
assertions (`theme.test.js`); the token lint bank; the state-colour grammar;
tabular numerals (154 sites); 48 dp touch targets; Reduce Motion; the calm
non-shaming voice; and the origin-aware transition, which is well built and
should be extended rather than replaced.

## 6. Cost facts the plan must not get wrong

- The double-write problem (189 files) needs a position BEFORE screen one.
- "Change the card" means three components: `Card`, `EmptyState`, and 85
  hand-rolled ones.
- 92 test files assert on presentation (57 on colour tokens, 28 on type
  roles); each stage updates its own guards rather than weakening them.
- Any palette change must be mirrored by hand into `src/widgets/widgets.js`
  and `src/lib/shareCard/drawShareCard.js`, which cannot import the theme.
- The light theme is live and user-selectable, and `theme.js:200-201` records
  that it still wants the founder's on-device sign-off. That is outstanding.

## 7. Founder forks (not lead-ruled)

1. **The display face.** Archivo adds two files and no dependency, and it is
   the single most visible change in the plan. Yes, or Inter everywhere and
   we buy character through scale alone.
2. **The rest timer.** `loggerVisualArchitecture.guard.test.js:6,58` pins the
   rest timer small and bans `fontSize: 26`, recorded from a founder device
   verdict. Law 1 wants the working weight loud and the timer quiet, which
   agrees with that verdict, but it is confirmed rather than assumed.
3. **How far, how fast.** Stages 1 and 2 give a new-looking app across the
   five daily screens; 3 and 4 finish it. The lead's recommendation is to ship
   1 and 2, live with it for a week, then decide.

## 8. Device checklist (when stage 1 lands, not before)

Written now so the stage cannot land without one: on a physical Android
device from an EAS build of main, (1) every screen still passes contrast in
both themes at the largest accessibility text size; (2) the loud number on
Today and in the logger is legible from two metres; (3) a long session name
at the largest text size does not truncate mid-word; (4) Reduce Motion still
flattens every new transition; (5) the widget and the share card still match
the app's palette. ED-safety: nothing in this plan reads or writes weight,
food or notification behaviour, and the ribbon draws a planned rest day as a
rest day rather than a gap.

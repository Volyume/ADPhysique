# Visual Redesign — Reference Research (READ-ONLY)

**Date:** 2026-09-14
**Scope:** mechanical device-level research on the founder's eight named
references; an alternative reference set for a strength-training app used
mid-set in a gym; and a testable checklist of what makes an app read as
"AI-built".
**Method:** WebSearch/WebFetch against 2024-2026 sources, plus a read-only
survey of this repo's own tokens and screen composition for grounding.
**Evidence rule:** every claim is marked `[SOURCE]` (found in a cited page),
`[REPO]` (observed in this codebase) or `[JUDGEMENT]` (my reasoning).

Device IDs (`R1`, `T3`, …) are stable so the lead can cite them.

---

## 0. Repo grounding (read-only survey)

Facts the recommendations are costed against:

- `[REPO]` Already installed and therefore FREE to use: `react-native-reanimated`
  4.1.1, `react-native-worklets`, `@shopify/react-native-skia` 2.2.12,
  `react-native-svg` 15.12.1, `react-native-gesture-handler` 2.28,
  `@gorhom/bottom-sheet` 5.2.14, `@shopify/flash-list` 2.0.2,
  `expo-linear-gradient`, `expo-haptics` + `react-native-haptic-feedback`,
  `expo-image`, `zeego`, `react-native-android-widget`, plus the local native
  modules `live-activity` and `rest-timer-live`. **No device below needs a new
  dependency.** (`package.json`)
- `[REPO]` Token system is already mature: surface ladder
  `#0D0D0D → #191917 → #222220 → #2A2A27 → #343431`, amber `#F5A623` /
  `#E08C0B`, warm-pulled greys, Material-3 motion curves, four named springs,
  `radius.lg = 16`, spacing scale `2/4/6/8/12/16/24/32/48`, Inter + Inter
  Display shipped as separate faces. (`src/styles/theme.js`, `fonts.js`)
- `[REPO]` **The type scale is barely used at the top end.** Across
  `src/screens` the role histogram is: `caption` 580, `bodySm` 448, `body` 343,
  `label` 272, `title` 71, `h3` 41, `h2` 16, **`h1` 2**. Across 106 screens,
  display type is used twice.
- `[REPO]` **Screens are card stacks.** 45 of 106 screens render `<Card`;
  204 `<Card` instances in `src/screens` + `src/components`. `HomeScreen.js`
  is 3,573 lines and its JSX repeats `Card → SectionLabel → Text → Text`
  three times consecutively.
- `[REPO]` Iconography is the stock `@expo/vector-icons` Ionicons set; there
  is one bespoke mark (`BrandMark.js`).
- `[REPO]` `letterSpacing` is 0 for every role except `overline` (0.5) and
  `wordmark` (2), by a recorded 2026-07-09 decision.

`[JUDGEMENT]` Those five facts, not the tokens, are why the app reads as
generic. The palette and motion system are good; the **composition** is
homogeneous, and the type never gets loud. Sections 9 and 10 return to this.

---

## 1. Revolut — information architecture

**What I found.** `[SOURCE]` Revolut's structure is Home / Payments / **Hub**,
where the Hub (also described as a "Control Center") holds *every* product on
one scrollable, searchable page, and users **pin or unpin** products from the
Hub onto Home or Payments — Home can be emptied entirely and made fully
personal (Medium/UX Planet teardowns; App Fuel gallery). `[SOURCE]` The home
screen is composed of tab bar + avatar + card + button row + search + top nav,
with the card stack as the visual subject. `[SOURCE]` They adopted a
swipeable "Stories" card pattern (Instagram idiom) to teach features.
`[SOURCE]` Their visual language is "sleek dark interface, gradient cards,
fintech precision"; marketing type is Aeonik Pro at 80-136px with -2.72px
tracking, body Inter 400. `[SOURCE]` An accessibility case study criticises
the same home screen for "visual overwhelm, missing context, unclear
labelling and eye strain" — so it is not an unqualified model.

**Devices.**

- **R1 — Three-zone home: hero → action row → ledger.** One number owns the
  top third; a horizontal row of 4-5 round icon+label actions sits under it;
  a reverse-chronological list fills the rest. *For the user:* the answer,
  the verbs, the history — in that order, no scanning. *In Volyume:* today's
  session (or "rest day") as the hero, 4 actions (Start / Log weight / Log
  food / Swap), then the recent-sessions ledger. *Cost:* **M** — mostly
  deleting cards from `HomeScreen.js`.
- **R2 — The Hub.** One destination that lists every feature, grouped and
  searchable, so the tab bar never grows past 4. *For the user:* stops feature
  sprawl becoming navigation sprawl. *In Volyume:* `[REPO]` 106 screens behind
  a 4-tab bar is exactly this problem. *Cost:* **M**.
- **R3 — Pin to Home.** The user chooses which modules appear on Home.
  *Cost:* **M** (needs a persisted order + a reorder screen; `DragReorderList`
  already exists `[REPO]`). `[JUDGEMENT]` See G2 (Garmin) for the caution:
  customisation is often an apology for a home screen that failed to choose.
- **R4 — Sheet-first actions.** Every action opens a bottom sheet over the
  current context rather than pushing a screen. *For the user:* never loses
  place mid-task. `[REPO]` `@gorhom/bottom-sheet` is installed and
  `BottomSheet.js` exists. *Cost:* **S** per flow.
- **R5 — Search as a home affordance**, not a magnifier buried in a header.
  *Cost:* **S-M**.
- **R6 — Stories cards.** `[JUDGEMENT]` **Do not take this.** It is a
  social-media idiom that will read as consumer-app noise against a "calm,
  precision instrument" voice, and it is a known AI-era cliché.

---

## 2. Things 3 — typography and restraint

**What I found.** `[SOURCE]` MacStories: the app "is dominated by white
space, but it uses bold fonts, lovely icons, and thoughtful splashes of color
to create a welcoming, easy-to-use environment" — i.e. **weight and space do
the hierarchy, colour is a garnish**. `[SOURCE]` The Magic Plus button "can be
dragged and dropped into different spaces of the app to do different things";
dropping it on a day "you've just assigned its start date". `[SOURCE]` "Tap on
a task, and it will pop out into a card-like form while the rest of the list
fades into the background." `[SOURCE]` Projects organise through headings, not
containers. `[SOURCE]` The app "feels like it was built with haptic feedback in
mind", with checkbox spring physics repeatedly singled out. `[SOURCE]` Apple
Design Award winner; secondary sources cite "generous whitespace" and a "calm
layout" as the documented signature.

**Devices.**

- **T1 — Rows on the canvas, not cards.** A list is text rows separated by
  whitespace and a bold section heading; there is no container per item.
  *For the user:* 2-3x more content per screen, no nested-box noise.
  *In Volyume:* the single highest-leverage change available —
  `[REPO]` 204 `<Card` instances. *Cost:* **M** (one `Row` primitive, then
  screen-by-screen migration; big diff, low risk).
- **T2 — Fixed three-slot row.** leading control · title · trailing meta.
  Every list in the app uses the same slot grammar. *Cost:* **S**.
- **T3 — Hierarchy from weight + space only.** Heading semibold, body
  regular, meta grey; **no colour used for rank**, only for state.
  *Cost:* **S** (a discipline, not code).
- **T4 — Magic Plus (drop target = meaning).** One draggable create
  affordance whose destination sets the new item's attributes.
  *In Volyume:* drag "+" onto a day in the week strip to schedule; drop it
  between two exercises to insert there. *Cost:* **L** (gesture + drop-zone
  choreography), but it is `[JUDGEMENT]` the single most "handmade" device on
  this list — it cannot be produced by defaults.
- **T5 — Pop-open detail.** Tapping a row expands it in place into a card
  while the list dims behind, instead of a navigation push. *For the user:*
  no context loss, no back-button tax mid-set. *Cost:* **M** (Reanimated
  shared transition; installed).
- **T6 — Spring + haptic pairing on the one completion action.** *In
  Volyume:* the set-complete tick. `[REPO]` `motion.springs.release` and
  `expo-haptics` already exist. *Cost:* **S**.
- **T7 — Whitespace as the divider.** No hairlines between rows; section
  breaks are 24-32px of nothing plus a heading. *Cost:* **S**.

`[JUDGEMENT]` "Handmade rather than generated" in Things = a small number of
decisions that a generator would never make, each expensive: the drop-target
semantics (T4), the in-place pop (T5), the tuned spring (T6). Volyume needs
**two or three** such moments, not twenty.

---

## 3. Linear — serious/professional feel

**What I found.** `[SOURCE]` Linear's own redesign note: they made the
navigation sidebar "a few notches dimmer, allowing the main content area —
where users work — to take precedence"; the principle is **"structure should
be felt not seen"**; dividing lines "had quietly proliferated across the
platform, sometimes appearing without clear reason" and were softened; tab
bars became "more compact rather than spanning the full width of the screen,
with rounded corners and smaller icon and text sizing"; they reduced icon
usage, scaled icons down, and removed "unnecessary visual treatments like
colored team icon backgrounds"; and they moved the default greys from "a cool,
blue-ish hue" to "a warmer gray that still feels crisp, but less saturated".
`[SOURCE]` Third-party token extractions give canvas `#010102`, surfaces
`#0f1011 / #141516 / #18191a`, hairlines `#23252a / #34343a`, ink
`#f7f8f8 → #d0d6e0 → #8a8f98 → #62666d`, accent `#5e6ad2`; display sizes
80/56/40px at weight 600 with letter-spacing -3.0 / -1.8 / -1.0px; body 16px
at 400; **buttons at 8px radius, explicitly "never pill-rounded"**; borders at
0.5-1px replacing drop shadows entirely; and the stated principle **"the dark
canvas IS the whitespace"**. *Caveat:* those token tables are community
extractions of the **marketing site**, not the product — treat the exact hexes
as indicative, the structure as reliable.

**Devices.**

- **L1 — Luminance ladder as the only depth cue.** Surfaces lift, shadows do
  not exist. `[REPO]` Volyume already mandates this in its materials policy —
  it is *already compliant*; the gap is that its ink ladder is not used with
  the same discipline.
- **L2 — Four-step ink ladder, strictly applied.** Primary / secondary /
  tertiary / quaternary, and **nothing** renders at primary unless it is the
  thing you came for. *Cost:* **S** (audit + token discipline).
- **L3 — Recede the chrome.** Dim the tab bar, headers and nav below the
  content. *For the user:* the workout, not the furniture, is the brightest
  thing on screen. *Cost:* **S**. `[JUDGEMENT]` Highest ratio of
  seriousness-gained to effort on this whole list.
- **L4 — Icon diet.** Fewer icons, smaller, no coloured icon backgrounds, no
  icon that merely decorates a label. *Cost:* **S-M** (a deletion pass).
- **L5 — Negative tracking on display type only.** -1 to -3px at 40-80px,
  0 for running text. `[REPO]` Volyume ships `InterDisplay-Bold/ExtraBold`
  and currently sets tracking 0 everywhere; the recorded 2026-07-09 decision
  was about *running text on Android*, which this does not contradict.
  *Cost:* **S** (one token + a display role).
- **L6 — Accent on ~2% of pixels.** One amber thing per screen.
  *Cost:* **S** (discipline; `[REPO]` worth an automated count).
- **L7 — 8-10px radius on interactive controls, pill reserved for chips.**
  `[REPO]` `radius.md` is 10 — already right; the risk is `radius.full`
  creeping onto buttons. *Cost:* **S**.
- **L8 — Status as a precise small glyph + word**, never a fat coloured
  badge. *Cost:* **S**.
- **L9 — Hairline discipline.** A border only where two things must not be
  confused; whitespace everywhere else. *Cost:* **S**.

`[JUDGEMENT]` Keyboard-first → touch translates as: **every frequent action
has a fixed, memorable screen position**, so it becomes muscle memory. That is
the touch equivalent of a shortcut, and it matters more in a gym than
anywhere else.

---

## 4. Flighty — progression / status / "live"

**What I found.** `[SOURCE]` Flighty's marketing: "pilot-grade data that you
can actually understand"; it tracks "the inbound aircraft 25 hours before your
flight" and predicts delays "up to 6 hours before the airline says anything";
it answers "See why you're delayed. Finally!"; and it presents "gate info,
departure times, baggage belts, and booking codes — all at a glance" across
named phases (Preflight / At the airport / After landing). `[SOURCE]` Their
Live Activity was rebuilt with a "glowing glass" look, an "intuitive visual
flight path" and "vibrant glance-able status"; `[SOURCE]` press coverage
describes ~15 **"smart states"** that surface terminal, gate, departure time,
check-in code, seat, baggage claim "just as you need it"; `[SOURCE]` the
widget becomes a countdown to the next trip when you are not flying.

**Devices.**

- **F1 — Phase rail.** A horizontal rail with named phases and a live
  position marker; the current phase is the only one at full ink.
  *In Volyume:* the mesocycle (accumulation → intensification → deload) or
  the session (warm-up → working sets → finished). *Cost:* **M** (SVG/Skia,
  both installed).
- **F2 — Smart states: one surface, many states.** The same component shows
  a *different* most-relevant fact per phase, so it is never generic.
  *In Volyume:* the Home hero — pre-session shows the next lift and target
  load; mid-session shows the next set; post-session shows what changed; on a
  rest day shows the recovery read. *For the user:* the app always answers
  the question they actually have. *Cost:* **M-L**. `[JUDGEMENT]` This is the
  device that makes an app feel alive rather than static, and it is the one I
  would take from Flighty above all others.
- **F3 — The live surface off-app.** Live Activity / widget / lock screen as
  a first-class view of an in-progress thing. `[REPO]` `live-activity`,
  `rest-timer-live` and `react-native-android-widget` already exist —
  this is extension work, not new capability. *Cost:* **M**.
- **F4 — Big number + unit + one context line.** Value at display size,
  unit at caption size baseline-aligned, one grey sentence beneath.
  *Cost:* **S**.
- **F5 — Explain the number.** Never show a status without the reason.
  *In Volyume:* "Load held at 80kg — last session's last set fell 2 reps
  short." `[JUDGEMENT]` Fits the deterministic-engine mandate perfectly: the
  engine already knows why, it just isn't saying.
  *Cost:* **S-M** (copy + plumbing, no engine change).
- **F6 — Upstream cause surfacing.** Show the thing that will determine the
  next event before the event. *In Volyume:* fatigue/recovery state shown
  *before* the session, not after. *Cost:* **M**.

---

## 5. Airbnb — large visual moments

**What I found.** `[SOURCE]` The 2025 release: "pristine white canvases give
way to full-bleed photography, and the interface itself disappears so the
listings can breathe"; full-bleed media at 4:3 / 16:9 with 14-20px corner
rounding. `[SOURCE]` VP of Design Teo Connor on the new icon set, built
in-house over two years: "They've got a ton of utility, they're a universal
language, and they're playful", with "loads of fun details" for people who
look closely. `[SOURCE]` They moved from flat minimalism to tactile 3D
Pixar-ish icons. `[SOURCE]` The Trips tab became a "living itinerary" — a
time-aware consolidation rather than a reservation list. `[SOURCE]` Connor on
restraint: "People are always going to come to us to book a home, so we needed
to enhance that, not get in the way of it."

**Devices.**

- **A1 — One full-bleed moment per flow.** *In Volyume:* `[JUDGEMENT]` the
  only honest full-bleed image this app owns is **the user's own progress
  photo**, and the founder-approved Pro before/after card is where it belongs
  (subject to the calm-mode / ED-flag withholding rule in CLAUDE.md §2).
  **Do not buy stock gym photography** — see AI-tell #11. *Cost:* **S** on an
  existing surface.
- **A2 — Media radius 14-20px.** `[REPO]` `radius.lg = 16` already matches.
- **A3 — Living itinerary.** A time-aware list that reorders itself around
  "now". *In Volyume:* the week view, where today is the anchor.
  *Cost:* **M**.
- **A4 — A bespoke icon set.** *For the user:* nothing else signals authorship
  as fast. `[REPO]` Volyume is on stock Ionicons. *Cost:* **L** for a full set;
  **S** for the high-leverage subset. `[JUDGEMENT]` Draw ~12 custom icons (the
  tab bar, the four home actions, muscle groups) in `react-native-svg` and
  leave Ionicons for the long tail. That buys most of the authorship for a
  fraction of the cost.
- **A5 — Hero-then-dense.** Image carries the feeling; a tight, strongly
  ranked text block carries the facts, immediately below. *Cost:* **S**.

---

## 6. Arc — modern interaction

**What I found.** `[SOURCE]` Arc Search's documented gestures: "Swipe left and
right on the bottom bar to cycle between recent tabs"; "Swipe up on the little
tab stack to switch tabs with style"; press-and-hold the tab stack to reach
Spaces; press-and-hold "+" for voice; "Pinch (your screen) to summarize"; a
hidden fidget-spinner easter egg on the empty state. `[SOURCE]` Desktop Arc
uses a two-finger swipe to switch Spaces and a vertical sidebar.
`[SOURCE]` Press coverage describes the mobile aesthetic as "skeuomorph-ish",
teasing out "physicality, depth, and shadows".

**Devices.**

- **AR1 — Gesture on the persistent bottom bar.** Swipe the one piece of
  permanent chrome to move between the most recent contexts.
  *In Volyume:* swipe the mini-bar (`[REPO]` `ActiveSessionMiniBar.js` exists)
  to move between exercises mid-session. *Cost:* **M**.
- **AR2 — Press-and-hold as the "more" layer.** Long-press reveals the wider
  space, keeping the tap surface single-purpose. `[REPO]` `PeekMenu.js` and
  `zeego` already ship. *Cost:* **S**.
- **AR3 — A gesture that performs an action, not navigation** (pinch to
  summarise). *In Volyume:* `[JUDGEMENT]` pinch the session list to collapse
  to a one-line-per-exercise density. *Cost:* **M**.
- **AR4 — Chrome that hides on scroll and returns on intent.** *Cost:* **S-M**
  (Reanimated scroll handler).
- **AR5 — Physicality: press depresses, release overshoots once, drag has
  weight.** `[REPO]` `motion.springs.press/release` are already defined and
  are exactly this. *Cost:* **S** — apply them everywhere pressable.
- **AR6 — A hidden easter egg on a dead-end screen.** `[JUDGEMENT]` Cheap
  authorship signal; must not be celebratory about training data (ED rules).

`[JUDGEMENT]` **Hard constraint:** the brief says one-handed, mid-set,
sometimes sweaty. `[SOURCE]` Touch research: ~75% of phone touches are thumb;
~49% of users are one-handed; average thumb contact ≈ 1in ≈ 72px; HIG minimum
44×44pt, Material 48×48dp; and explicitly, "sweaty fingers after a set need
bigger targets than a banking app ever has to worry about." So: **every Arc
gesture is an accelerator, never the only path**, and every mid-workout target
should be ≥56dp with a generous hit slop (`[REPO]` `hitSlop` is already 12 all
round — raise for workout controls).

---

## 7. Calm — premium atmosphere

**What I found.** `[SOURCE]` Calm's system: a near-white canvas, deep navy ink
`#1a3e6f`, **a single blue→purple gradient `#2477aa → #6461e0` reserved for
primary CTAs**, and one humanist family (Figtree) at three weights.
`[SOURCE]` "Rather than shouting serenity through soft pastels and hand-drawn
motifs like most wellness apps, Calm whispers it through restraint — a quiet,
almost editorial composure", with a single hero photograph carrying the
atmosphere while everything around it stays understated. `[SOURCE]` During
sessions a gradient moves slowly in the background. `[SOURCE]` Their
onboarding keeps "a visible primary action and a valid alternative", avoids
urgency ("urgent language conflicts with the product's supportive promise"),
and tests reduced-motion. `[SOURCE]` The same teardown's warning:
"copying gradients, nature imagery, and quiet language without a strong
content route produces mood but not activation."

**Devices.**

- **C1 — One gradient, one job.** Exactly one gradient in the product,
  reserved for the single most important action. `[REPO]` `GradientCard.js`
  and `expo-linear-gradient` exist and the materials policy already permits
  precisely one Skia glow (the Home Start button) — **that is the slot**.
  *Cost:* **S** (mostly a removal pass).
- **C2 — One type family, three weights, no exceptions.** `[REPO]` Inter is
  registered in seven faces; `[JUDGEMENT]` collapse call sites to
  regular/semibold/display-bold and the app immediately reads as authored.
  *Cost:* **S-M**.
- **C3 — Slow continuous motion for ambience; fast decisive motion for
  controls.** Never mix the two speeds. `[REPO]` `motion.pulse` (750ms) vs
  `motion.micro` (120ms) is already this distinction. *Cost:* **S**.
- **C4 — Copy without urgency.** `[JUDGEMENT]` Already law here
  (`COACHING_VOICE_SYNTHESIS_LOCKED.md`); worth a fresh pass against the
  source's exact test: does any string imply the user is behind?
- **C5 — Editorial composure over decoration.** *Cost:* **S**.

`[JUDGEMENT]` **Genre caution.** Calm's palette and pacing are designed for a
dark room and a resting pulse. Volyume is used under gym lighting, at
arm's length, breathing hard. Take C1, C2, C3 and C4; do **not** take the
atmosphere — low-contrast dreamy surfaces will fail both the WCAG tests and
the arm's-length legibility requirement (see W1).

---

## 8. Duolingo — progression psychology (safe vs unsafe)

**What I found.** `[SOURCE]` The streak counter is the output of "over 600
experiments... across four years"; a 7-day streak makes users 3.6x more likely
to finish the course and 2.4x more likely to return next day. `[SOURCE]`
Device-level: node states run "New skill (gray)" → Crown levels 1-5 →
Legendary (gold); the colour system is green `#58cc02` success, red `#ff4b4b`
mistakes/hearts, orange `#ff9600` streak, yellow `#ffc800` XP; button copy is
"Continue" / "Got It"; "one tap to start, lesson fits in 3 minutes";
**"the progress bar still advances after wrong answers"**; and — the explicit
pressure device — **"the flame icon animates faster as the day progresses"**
when the streak is at risk. `[SOURCE]` Critics document the owl as "a symbol
of streak anxiety" with "guilt-inducing messages and sad animations", and in
2025 Duolingo staged Duo's "death", "turning user guilt into a viral marketing
campaign". `[SOURCE]` Duolingo's own breakthrough finding: "making streaks
easier to maintain actually increased long-term engagement and learning
outcomes."

**SAFE to borrow** (none of these depend on loss):

- **DU1 — The path.** One visible sequence; exactly **one** node is "current".
  *For the user:* zero ambiguity about what to do next. *In Volyume:* the
  mesocycle as a path of sessions. *Cost:* **M**.
- **DU2 — Node states with size, not colour.** done / current / upcoming,
  where the current node is physically larger and is the only one carrying an
  action. **No locked/greyed-out state** (`[JUDGEMENT]` "locked" implies
  failure to qualify; in a training app every session must remain startable).
  *Cost:* **S**.
- **DU3 — One-tap start.** The primary action is reachable in one thumb tap
  from launch. *Cost:* **S**.
- **DU4 — Unambiguous button verbs.** "Continue" / "Got it" — never "OK",
  never a bare chevron. *Cost:* **S**.
- **DU5 — Progress advances regardless of outcome.** *In Volyume:* completing
  a session counts as completed even if every set missed target.
  `[JUDGEMENT]` This is the single most ED-safe mechanic Duolingo has, and it
  is the one nobody copies. *Cost:* **S**.
- **DU6 — A completion summary.** Calm, factual, one screen.
  `[REPO]` `WorkoutSummaryScreen.js` exists. *Cost:* **S**.

**UNSAFE — do not borrow** (each violates CLAUDE.md §2 ED-safety):

- Streak counter that can break; any "you lost your streak" state.
- **The escalating flame** (animation speed as time pressure) — a literal
  loss-aversion timer.
- Hearts / lives / lockout on failure.
- Red "broken" or "missed" states on a calendar or path.
- Leagues, leaderboards, ranking — also banned by the no-public-profiles rule.
- Variable-ratio rewards (chests) — gambling schedule.
- Guilt-framed notifications ("Don't let your team down", "Are you really
  going to give up now?" — `[SOURCE]` named as confirmshaming).

**The safe substitute, with evidence.** `[SOURCE]` UX Magazine's ethical-streak
framework: emphasise "long-term trends over daily perfection", and reframe
"You broke your streak" as **"You've completed 47 of the last 50 days"**;
provide grace periods and earn-back by effort; never design "systems where
missing one day feels like complete failure". `[SOURCE]` Gentler Streak ships
exactly this: "consistency over perfection", "taking a break never means
starting over", "no guilt, no punishment", and an adjustable status for injury
or illness that "removes FOMO from sight and mind".

- **DU7 — Denominator framing.** Show "18 of the last 21 planned sessions",
  never a fragile consecutive count. *Impact:* **High**. *Cost:* **S**.

---

## 9. A better reference set for THIS product

`[JUDGEMENT]` The founder's eight are strong on *craft* and weak on *context*:
none of them is used at arm's length, one-handed, by someone out of breath,
and none carries ED-safety constraints. The additions below fix that.

### Keep (4)

| Ref | Why it survives | The one device |
|---|---|---|
| **Linear** | The whole "serious tool" verdict rests here, and Volyume's tokens are already 80% aligned | **L3 — recede the chrome** |
| **Things 3** | Directly attacks the card-stack problem (`[REPO]` 204 Cards) | **T1 — rows on the canvas** |
| **Flighty** | The only reference that models a *journey with live state* | **F2 — smart states** |
| **Revolut** | IA only — the Hub solves 106-screens-behind-4-tabs | **R2 — the Hub** |

### Drop (4), with reasons

- **Duolingo** — `[JUDGEMENT]` keep DU1-DU7 as *patterns*, but drop it as a
  visual/psychological reference. Its engine is loss aversion; Volyume's
  constitution forbids that. Everything safe in it is better sourced from
  Gentler Streak (non-shaming framing) and Things 3 (clarity).
- **Calm** — `[JUDGEMENT]` wrong genre for gym lighting and arm's-length
  reading. Keep the four rules (C1-C4); drop the atmosphere.
- **Airbnb** — `[JUDGEMENT]` the device that makes Airbnb work is *owned
  photography of the thing you are buying*. Volyume owns no imagery. Buying
  stock is an active AI-tell (#11). Keep A4 (bespoke icons) and A1 applied
  only to the user's own progress photos.
- **Arc** — `[JUDGEMENT]` gesture-primary navigation is the wrong bet for
  sweaty one-handed use `[SOURCE: touch-target research]`. Keep AR2 and AR5
  as accelerators and physics; drop the spatial model.

### Add (7)

- **W1 — Whoop: arm's-length numerals + three-tier disclosure.** `[SOURCE]`
  Whoop renders the recovery score at "72pt equivalent" *specifically for
  arm's-length readability*; the app is exactly three tiers — Tier 1 three
  metrics, "no graphs, no charts, no noise"; Tier 2 trends; Tier 3 raw
  biometrics — where "each tier adds complexity only when the user asks for
  it", tier boundaries are **screen-level, not accordions**, and "tiles
  function as doorways, not destinations". Colour is a strict three-word
  vocabulary (green/yellow/red) and "every hue carries meaning. No decorative
  accent colors." Black backgrounds are justified functionally: data pops,
  eye strain drops for low-light checks. `[JUDGEMENT]` **This is the single
  most relevant reference in the entire set** — it is the only one designed
  to be read across a gym floor, and `[REPO]` Volyume's own DESIGN_SYSTEM.md
  already names Whoop as the reference feeling. *Impact:* **High**.
  *Cost:* **M**.
- **PL1 — Peloton: the mid-workout minimum.** `[SOURCE]` "Peloton's workout
  screen keeps the timer and heart rate zone as the only two elements above
  the fold... everything else waiting until the set ends", with weekly
  totals, badges and the social feed pushed below the fold or into another
  tab. *In Volyume:* `ActiveWorkoutScreen` should show **the current set and
  the timer, and nothing else**, above the fold. *Impact:* **High**.
  *Cost:* **M**.
- **G1 — Gentler Streak: the ED-safe progression model.** `[SOURCE]` 2024
  Apple Design Award; "Activity Path" gives a Daily Readiness read plus 10-day
  and 30-day views; it offers a qualitative "Path of Effort / Path of Rest"
  read instead of a single readiness number; status can be set to injured or
  ill, which removes FOMO; the copy is explicitly non-shaming. `[JUDGEMENT]`
  This is the reference that should replace Duolingo outright — it is the
  proof that visible progress and a sense of journey survive without
  loss-aversion. *Impact:* **High**. *Cost:* **M**.
- **O1 — Oura: "One Big Thing" + score shortcuts.** `[SOURCE]` The redesign
  cut five tabs to three (Today / Vitals / My Health); Today gives "One Big
  Thing" to focus on, with a row of Score Shortcuts across the top for
  everything else, changing "dynamically throughout the day"; the team's
  stated model — "We wanted to make the Today tab like the 'Top Stories' page
  of a news app." *In Volyume:* Home = one decision + a shortcuts strip.
  `[REPO]` `TodayStrip.js` is already the seed. *Impact:* **High**.
  *Cost:* **M**.
- **S1 — Strong/Hevy: the set row is the atom.** `[SOURCE]` Strong's
  interface "is built around the assumption that you are mid-session, resting
  between sets, and need to log quickly, everything designed to minimize the
  time between finishing a set and getting the data recorded"; Strong wins on
  rest-timer UX and **supports different timers for warm-up vs working sets,
  which Hevy does not — users "consistently mention it as a frustration"**;
  Hevy logs supersets, drop sets and rest-pause natively in the flow.
  `[REPO]` `SetEntry.js` and `RestTimer.js` exist. *Impact:* **High**.
  *Cost:* **S-M**.
- **ST1 — Strava: kill the mode toggle.** `[SOURCE]` The July 2025 Record
  redesign's "most meaningful change is the overlay of key sport metrics on
  the map, eliminating the need to toggle between a MAP VIEW and DATA VIEW".
  `[JUDGEMENT]` Generalised: any mid-activity screen that makes the user
  switch views is a design failure. Audit Volyume for mid-workout toggles.
  *Impact:* **Medium**. *Cost:* **S-M**.
- **GA1 — Garmin Connect: the cautionary tale + the Essentials row.**
  `[SOURCE]` Garmin's card-based home redesign drew sustained criticism —
  "the large size of the graphs, meaning less data is viewable", limited
  "In Focus" options — and in v5.27 (July 2026) they added an optional
  **"Essentials row — up to four user-selected stats at the top of Home"**.
  `[JUDGEMENT]` Two lessons: (a) big decorative cards *reduce* information
  for serious users, which is precisely the failure mode Volyume is in;
  (b) a four-stat user-chosen strip is a cheaper, better answer than full
  pin-to-home customisation (R3). *Impact:* **Medium**. *Cost:* **S**.

### Considered and judged low-value here

`[JUDGEMENT]` **Fitbod** (its differentiator is AI-adaptive programming —
`[SOURCE]` "AI that analyses every set you log" — constitutionally banned
here); **Ladder / Caliber** (coach-led video, a different product shape);
**Zwift** (game world, wrong genre); **Runna** (plan-as-calendar; worth one
look at how the next session is marked, nothing more); **TrainingPeaks** (the
CTL/ATL/TSB "Performance Management Chart" is the one idea — a long-horizon
load vs fatigue vs form curve; `[REPO]` `FatigueTrendCard.js` is the place to
compare); **Apple Fitness rings** (closed-loop daily progress with no
punishment for a missed day is genuinely ED-safe, but the ring itself is
over-copied); **iOS 26 Liquid Glass** (`[SOURCE]` Apple's new material —
`[JUDGEMENT]` do not chase it: `[REPO]` Volyume is Android-primary, blur is
explicitly declined in the materials policy, and translucency is a
legibility risk at arm's length); **Eight Sleep / Athlytic / Bevel**
(`[SOURCE]` Bevel reads strain/recovery/sleep from Apple Health — a
one-screen "where am I today" readout; marginal beyond what Whoop and Oura
already give us).

---

## 10. What makes an app look "AI-built" — an audit checklist

Each line: the tell, the source, and **a test a lead can actually run**.
`[REPO]` markers show where Volyume currently fails.

**Layout & composition**

1. **Uniform card grid / card-stack screens.** `[SOURCE]` "every card weighs
   the same"; `[SOURCE]` "Six identical cards in a row, each with an icon, a
   heading, and two lines of text". **Test:** count `<Card>` per screen; more
   than 3 stacked full-width cards of similar height = fail.
   `[REPO]` **FAILS** — 45/106 screens, 204 instances; `HomeScreen.js` repeats
   `Card → SectionLabel → Text → Text` three times consecutively.
2. **Every screen is the same screen.** `[SOURCE]` "every screen is a
   variation of the same dashboard — same sidebar, same card grid, different
   data". **Test:** screenshot 10 screens, blur them; if you cannot tell them
   apart, fail. `[REPO]` likely fails.
3. **Mechanical spacing.** `[SOURCE]` "perfectly even spacing with no
   rhythm... one uniform gap everywhere". **Test:** is the gap *within* a
   group smaller than the gap *between* groups, everywhere?
4. **Decorative bento grid.** `[SOURCE]` "Most bento grids on the web in 2026
   are decorative. Cells are the same size, content was retrofitted to fit
   them, and the layout reads as a card wall." **Test:** does any cell differ
   in size because its content matters more?
5. **Centred hero + three feature cards** as the default page shape.
   `[SOURCE]` named repeatedly.

**Typography**

6. **Flat type scale — the strongest tell.** `[SOURCE]` "one hero metric
   dominates, secondary metrics shrink" is the prescribed fix, implying the
   failure. **Test:** histogram your type-role usage. `[REPO]` **FAILS
   badly** — `h1` appears **twice in 106 screens**; 1,300+ uses sit in the
   11-16px band. Nothing in this app is ever loud.
7. **Inter (or the default system face) at default tracking, everywhere.**
   `[SOURCE]` "Inter font and bounce animations on everything" named as the
   generated-app signature. **Test:** is there *any* typographic decision a
   generator would not have made (a display face, real negative tracking,
   tabular figures on data)? `[REPO]` Inter Display is shipped but tracking
   is 0 on every role — the differentiating decision is available and unused.
8. **Beige/cream + orange + serif.** `[SOURCE]` Jim Nielsen names exactly
   this as "a specific, repeatable 'AI slop' palette", alongside serif
   typefaces. `[JUDGEMENT]` Amber on warm charcoal is *adjacent* to this and
   worth defending deliberately — amber must read as instrument/precision
   (sparse, high-contrast, on data), never as warm decorative wash.

**Colour, material, motion**

9. **Purple→cyan gradients, glassmorphism, neon glow.** `[SOURCE]` named
   explicitly. **Test:** count gradients. More than one semantic role = fail.
   `[REPO]` PASSES today — the materials policy already forbids this.
10. **Bounce on everything / one easing for everything.** `[SOURCE]` "bounce
    on every hover"; `[SOURCE]` "bounce animations on everything".
    **Test:** do controls and ambience move at different speeds?
    `[REPO]` tokens support it; check call sites.
11. **Generic AI imagery / stock hero illustration.** `[SOURCE]` "AI-generated
    hero illustrations that use the default Midjourney aesthetic... signals
    'AI content' rather than 'premium design'"; a 2026 designer survey found
    widespread frustration at "a specific overused yellow hue".
    **Test:** is every image either the user's own data or a real photograph
    the company owns?

**Iconography**

12. **Stock icon set, unmodified.** `[SOURCE]` Airbnb built theirs over two
    years precisely to avoid this. **Test:** is any icon in the app drawn
    for this app? `[REPO]` **FAILS** — Ionicons throughout, one bespoke mark.
13. **Tiny, thin icons.** `[SOURCE]` Nielsen: AI apps use "much smaller,
    thinner icons than their native counterparts".
14. **Sparkle emoji ✨ as the "smart" affordance.** `[SOURCE]` "AI = sparkles
    and rainbow colors"; a commenter calls it "the telltale sign of buttons
    not to click". **Test:** grep for ✨ / "magic" / "smart" in UI copy.
    `[JUDGEMENT]` Critical for Volyume: a deterministic engine that decorates
    itself with sparkles will be *read* as an LLM.
15. **Shimmer as the universal loading idiom.** `[SOURCE]` shimmering
    "thinking" text "repurposed to indicate any kind of asynchronous task".
    `[REPO]` `Skeleton.js` pulses — check it is used for data loading only,
    never for "computing".

**States & copy**

16. **Undesigned edge states.** `[SOURCE]` "empty states are blank, errors
    are raw strings, loading is a spinner"; `[SOURCE]` "empty and error states
    that were never designed". **Test:** does every list have a written empty
    state naming the object? `[REPO]` partially passes — `EmptyState` is used
    in 71 screens; audit the copy, not the presence.
17. **Generic copy register.** `[SOURCE]` "Welcome back!", "Something went
    wrong"; `[SOURCE]` "default LLM register — competent, balanced, faintly
    enthusiastic". **Test:** grep for those two strings verbatim; then read
    10 random strings and ask whether they could belong to any app.
18. **No action hierarchy.** `[SOURCE]` "primary button, secondary button,
    and text link near-identical weight". **Test:** one unmistakable primary
    per screen.
19. **Default component styling.** `[SOURCE]` stock buttons/inputs/shadows
    "instantly recognizable because thousands of generated apps ship them
    unchanged"; the prescribed fix is to customise "three or four core
    components" with specific radius, weight and focus states "to signal
    authorship". `[JUDGEMENT]` For Volyume the three are: **the set row**,
    **the number display**, **the primary button**.
20. **Everything at the same corner radius / pills everywhere.**
    `[SOURCE]` Linear's rule: buttons at 8px, "never pill-rounded".

`[JUDGEMENT]` **The diagnosis.** Tells 1, 2, 6, 12 and 19 are where this app
actually fails, and they are all *composition and authorship* failures, not
token failures. The founder's instinct is right, and the fix is not a new
palette — it is: break the card stack (T1), make one thing per screen loud
(W1/F4), draw ~12 icons (A4), and author three components (19).

---

## 11. Recommended devices — scored

Impact = effect on the "not AI-built / serious instrument" verdict.
Cost = React Native build effort with the **currently installed** stack
(S ≈ ≤1 day, M ≈ 2-5 days, L ≈ >1 week). `[JUDGEMENT]` on all scores.

| ID | Device | Source ref | Impact | Cost |
|---|---|---|---|---|
| T1 | Rows on the canvas, not cards | Things 3 | High | M |
| W1 | Arm's-length numerals + 3-tier disclosure | Whoop | High | M |
| L3 | Recede the chrome (dim nav below content) | Linear | High | S |
| F2 | Smart states — one surface, many states | Flighty | High | M-L |
| PL1 | Mid-workout minimum (two things above fold) | Peloton | High | M |
| O1 | "One Big Thing" + score-shortcut strip | Oura | High | M |
| G1 | Non-shaming progression (Path of Effort/Rest) | Gentler Streak | High | M |
| DU7 | Denominator framing ("18 of last 21") | UX Mag / Gentler | High | S |
| A4 | ~12 bespoke icons (tab bar + home actions) | Airbnb | High | M |
| L2 | Four-step ink ladder, strictly applied | Linear | High | S |
| L5 | Negative tracking on display type only | Linear | High | S |
| F4 | Big number + unit + one context line | Flighty | High | S |
| S1 | The set row as the authored atom | Strong/Hevy | High | S-M |
| DU5 | Progress advances regardless of outcome | Duolingo (safe) | High | S |
| R2 | The Hub (kill tab-bar sprawl) | Revolut | Medium | M |
| R1 | Three-zone home: hero → actions → ledger | Revolut | Medium | M |
| DU1 | The path — one visible "current" node | Duolingo (safe) | Medium | M |
| F1 | Phase rail with live position marker | Flighty | Medium | M |
| F5 | Explain the number (engine says why) | Flighty | Medium | S-M |
| T5 | Pop-open detail (no navigation push) | Things 3 | Medium | M |
| C1 | One gradient, one job | Calm | Medium | S |
| C2 | One family, three weights | Calm | Medium | S-M |
| L4 | Icon diet | Linear | Medium | S-M |
| L6 | Accent on ~2% of pixels | Linear | Medium | S |
| AR5 | Press/release physics everywhere pressable | Arc | Medium | S |
| T6 | Spring + haptic on the one completion action | Things 3 | Medium | S |
| GA1 | User-chosen four-stat Essentials row | Garmin | Medium | S |
| ST1 | Kill mid-activity view toggles | Strava | Medium | S-M |
| F3 | Live surface off-app (widget / Live Activity) | Flighty | Medium | M |
| R4 | Sheet-first actions | Revolut | Medium | S (per flow) |
| DU4 | Unambiguous button verbs | Duolingo (safe) | Medium | S |
| T2 | Fixed three-slot row grammar | Things 3 | Medium | S |
| T7 | Whitespace as divider (drop hairlines) | Things 3 | Medium | S |
| A3 | Living itinerary (time-aware week) | Airbnb | Medium | M |
| AR2 | Long-press as the "more" layer | Arc | Low-Med | S |
| AR1 | Swipe the mini-bar between exercises | Arc | Low-Med | M |
| AR4 | Chrome hides on scroll | Arc | Low-Med | S-M |
| L8 | Status as small glyph + word | Linear | Low-Med | S |
| A1 | One full-bleed moment (own progress photo) | Airbnb | Low-Med | S |
| T4 | Magic Plus (drop target = meaning) | Things 3 | Low-Med | L |
| AR3 | Pinch to change list density | Arc | Low | M |
| AR6 | One hidden easter egg | Arc | Low | S |

**Explicitly rejected:** Revolut Stories cards (R6); Duolingo streak counter,
escalating flame, hearts, leagues, chests, red broken states, guilt
notifications; Calm's low-contrast atmosphere; Airbnb-style stock
photography; Arc's gesture-primary navigation; iOS 26 Liquid Glass /
translucency; Fitbod-style AI adaptation.

---

## 12. Sources

AI aesthetic — [Jim Nielsen, *The AI Aesthetic*](https://blog.jim-nielsen.com/2026/ai-aesthetic/) ·
[explainx.ai summary](https://explainx.ai/blog/ai-aesthetic-design-patterns-jim-nielsen-2026) ·
[SmoothUI, *AI Design Slop*](https://smoothui.dev/blog/ai-design-slop) ·
[SaaSUI, *SaaS UI Looks AI-Generated? 7 Fixes*](https://www.saasui.design/blog/saas-ui-looks-ai-generated) ·
[Kompozy, *The AI design aesthetic*](https://kompozy.io/guides/the-ai-design-aesthetic) ·
[StudioMeyer, *Web Design Trends 2026 reality check*](https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check)

Linear — [Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh) ·
[DESIGN.md token extraction](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/linear.app/DESIGN.md)

Things 3 — [MacStories review](https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/)

Revolut — [Don Mullen product breakdown](https://medium.com/@donnachadh.mullen1/my-favorite-product-9677ae071d63) ·
[UX Planet study](https://uxplanet.org/revolut-assignment-ux-study-version-1-8cbe7a78c67) ·
[Revolut design tokens](https://www.designmd.co/d/revolut)

Flighty — [flighty.com](https://flighty.com/) ·
[Live Activities & widgets help](https://flighty.com/help/live-activities-widgets) ·
[Flighty Live Activity redesign announcement](https://x.com/Flighty/status/1967632929343017412)

Airbnb — [It's Nice That, *From homes to haircuts*](https://www.itsnicethat.com/articles/airbnb-app-redesign-140525) ·
[9to5Mac coverage](https://9to5mac.com/2025/05/13/airbnb-app-redesign-services-experiences-originals/)

Arc — [Arc Search hidden features](https://arc.net/blog/arc-search-hidden-features) ·
[speek.dev Arc write-up](https://speek.dev/blog/arc) ·
[Inverse on Arc mobile skeuomorphism](https://www.inverse.com/gear/arc-web-browser-mobile-app-skeuomorphism-design)

Calm — [Calm design system breakdown](https://www.shadcn.io/design/calm) ·
[ScreensDesign, Calm onboarding](https://screensdesign.com/articles/calm-onboarding-design/)

Duolingo — [Blake Crosley, *Gamification as Design Language*](https://blakecrosley.com/guides/design/duolingo) ·
[Yu-kai Chou on streak design](https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/) ·
[UX Magazine, *Hot streak design without shame*](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame) ·
[Opinions & Conditions, *The Duolingo Owl, Dark Patterns, and Digital Guilt*](https://opinionsandconditions.substack.com/p/duolingo-owl-dark-patterns-digital-guilt)

Health/training — [925 Studios, *WHOOP Design Breakdown*](https://www.925studios.co/blog/whoop-design-breakdown) ·
[Oura, new app experience](https://ouraring.com/blog/new-oura-app-experience/) ·
[Gentler Streak](https://gentlerstories.com/gentlerstreak/) ·
[Strava, redesigned Record experience](https://press.strava.com/articles/strava-launches-redesigned-record-experience) ·
[RepReturn, Strong vs Hevy](https://repreturn.com/strong-app-vs-hevy/) ·
[ScreensDesign, Peloton breakdown](https://screensdesign.com/showcase/peloton-fitness-workouts) ·
[Garmin Connect new look](https://www.garmin.com/en-US/newsroom/press-release/wearables-health/garmin-connect-gets-a-new-look-simplified-design-provides-a-more-customized-experience/) ·
[T3, Garmin 2026 analysis](https://www.t3.com/active/fitness-trackers/garmin-future-2026-direction-analysis)

Touch/ergonomics — [Parachute Design, thumb zone](https://parachutedesign.ca/blog/thumb-zone-ux/) ·
[DesignYourWay, fitness app design](https://www.designyourway.net/blog/fitness-app-design/)

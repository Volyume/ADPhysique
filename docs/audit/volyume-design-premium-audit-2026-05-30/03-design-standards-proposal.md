# 03 — Volyume design standards proposal

**This is the review checkpoint.** It is the definitive reference for what
Volyume should look and feel like at its best. It is written to be
implementable in React Native with the libraries already in the repo (plus
two small, named additions). Nothing here has been built yet. Read it,
amend it, confirm it — then Phase 4 (application audit) and Phase 5
(roadmap) proceed against the confirmed version.

Every standard below traces to either the internal audit (`01`) or the
research (`02`). Where a value is a judgement call, the rationale is given
so you can overrule it with full context.

---

## 0. The one decision I need from you first

There is a live contradiction in the repo about Volyume's core identity:

- **The shipped code** uses **amber `#F59E0B`** primary on **`#0D0D0D`**,
  and `CLAUDE.md` repeatedly calls amber "the brand", "the amber
  affordance".
- **`docs/DESIGN_SYSTEM.md`** (marked "approved direction") specifies
  **electric blue `#2979FF`** primary on `#0A0A0A`.

These cannot both be true. My recommendation, and everything below assumes
it unless you say otherwise:

> **Keep amber. Retire the blue.** The brief says to treat the existing
> identity as the foundation to elevate, not replace, unless research
> strongly indicates otherwise — and research does not indicate otherwise.
> Amber on near-black is a *more distinctive* premium position than blue:
> blue-on-dark is the single most common SaaS/fintech dark-mode choice
> (it's the Linear/Stripe/Robinhood-adjacent default), whereas a warm amber
> is closer to an instrument/terminal feeling and is genuinely ownable in
> fitness, where everyone else is electric blue, green, or red. Amber also
> pairs better with the "serious precision tool, not gym-bro hype" identity
> the design doc itself describes.

If you agree, a side task is to rewrite `DESIGN_SYSTEM.md` so the repo stops
carrying two contradictory sources of truth. If you'd rather go blue, say so
now — it changes the accent values throughout this document but nothing
structural.

**One refinement I do recommend even if we keep amber:** the current amber
`#F59E0B` is quite saturated for a dark UI, where research says saturated
accents "optically vibrate". I propose a slightly **deepened, marginally
desaturated amber for large fills** and keeping the bright amber for small
accents and text-on-dark. Details in §3.

---

## 1. Visual identity and tone

**The personality, stated precisely:** Volyume is a *precision instrument
for serious lifters* — closer to a Whoop or a Bloomberg terminal than to a
consumer wellness app. The feeling target is **calm, dense, exact, and
quietly confident**. Numbers are the hero; the interface is the frame, not
the picture. Restraint is the brand.

**The three reference apps to feel like** (from `02`):
- **Whoop** — disciplined progressive disclosure on a near-black canvas;
  one big number first, depth one layer down.
- **Linear** — restraint as a feature; a tight, low-chrome dark aesthetic
  where "if most people don't notice what changed, that's a good sign".
- **Stripe** — tabular numerals everywhere data appears; the quiet
  data-craft signal.

**Explicitly *not*:** Headspace/Calm (illustrated, soft, atmospheric),
gym-bro hype (flames, lightning, shouting caps), or generic dark-SaaS
(decorative gradient mesh, glassmorphism everywhere). Volyume's existing
"what it is not" list in `DESIGN_SYSTEM.md` is correct and should survive.

**What defines premium *for serious, goal-oriented fitness users
specifically*:** glanceability under fatigue (readable at arm's length,
mid-set, one-handed), data you can trust at a glance (aligned, stable
numerals that don't jitter on update), zero condescension (no celebration
for ordinary actions, no streak-shaming), and speed (no effect that drops a
frame on a mid-range Android between sets).

---

## 2. Typography system

### 2.1 Typeface

**Recommendation: adopt Inter as the bundled UI face, with a tabular-figure
treatment for all data, and keep the system font as the automatic
fallback.**

- **Primary (UI + body + headings): Inter**, embedded via the `expo-font`
  config plugin (build-time embed avoids the first-frame font flash).
  Rationale: Inter is the screen-optimised, large-x-height face behind
  Linear and Notion; it gives Volyume a deliberate typographic signature
  that the bare system font does not, without the $50K+ of a custom
  commission. It ships tabular figures.
- **Numerals (the hero): Inter with `fontVariant: ['tabular-nums']`**
  applied through the type roles for every weight, rep, set count, timer,
  percentage and volume figure. This is the Stripe move and it is the single
  highest-craft-per-effort typography change. *No separate mono font* — a
  second face for numbers adds bundle and risk; Inter's tabular figures are
  enough and keep one family.
- **Fallback:** system (SF Pro / Roboto) if the font fails to load, which
  the RN stack handles automatically.

*Honest caveat / your call:* the locked doc defers a custom font to a
"Stage 2 visual pass". This proposal argues Stage 2 has arrived — a bundled
Inter is the difference between "competent" and "distinctive" typography and
is low-risk via the config plugin. If you'd rather stay on the system font
for now, everything else in this section still applies (SF Pro actually does
the optical tracking automatically, which is a point in favour of waiting);
the type *ramp* is what matters most, and that we adopt regardless.

### 2.2 The type scale (adopt the existing `type` roles — this is the
biggest single win)

The theme already defines nine semantic roles with the right values
(`theme.js:219-256`). **The standard is: every text element uses a `type`
role. No screen hand-assembles `{ fontSize, fontWeight }` again.** Values
below are the current token values, tuned slightly toward the research
(body up to 16, display tracking confirmed negative):

| Role | Size | Weight | Tracking | Line-height | Use |
|---|---|---|---|---|---|
| `display` | 40 | 800 | −0.5 (−1.25%) | 1.2 (48) | the one hero number on a screen (workout timer, recovery-style score) |
| `h1` | 32 | 700 | −0.5 | 1.2 (38) | screen title when it's the focal point |
| `h2` | 24 | 700 | −0.4 | 1.25 (30) | section headers |
| `h3` | 20 | 600 | −0.3 | 1.3 (26) | card titles, sub-section |
| `title` | 17 | 600 | −0.2 | 1.3 (22) | list-row titles, exercise names |
| `body` | **16** (was 15) | 400 | 0 | 1.5 (24) | running copy |
| `bodyStrong` | 16 | 600 | 0 | 1.5 (24) | emphasised body, primary data labels |
| `label` | 13 | 500 | +0.2 | 1.35 (18) | metadata, captions-with-weight |
| `caption` | 11 | 400 | +0.4 | 1.35 (15) | timestamps, finest print |
| `data` (NEW) | inherits | — | tabular | — | a modifier mixed into any role for numerals: `{ ...type.title, fontVariant: ['tabular-nums'] }` |

Changes from current: **body 15→16** (research: 16–17 is the premium body
size; 15 reads a touch cramped). Tracking values are already correct in the
token and just need to actually reach the screen via the roles. Display/
heading negative tracking is the visible premium difference today's screens
miss because they bypass `type`.

**Numerals rule (the hero rule):** any text node that renders a number the
user reads as data — weight, reps, sets, %, kg/lb, kcal, seconds, dates in
tables — carries `fontVariant: ['tabular-nums']`. Provide this as a
`type.num(role)` helper so call sites stay one line.

### 2.3 Usage rules

- One `display` element per screen, maximum. It is reserved for the single
  most important number (active-workout timer; a headline score). If two
  things both want to be the biggest, neither is.
- Weight ladder discipline (keep the doc's existing rule): 800 for the hero
  number only; 700 headers/buttons/exercise names; 600 card titles/primary
  data; 500 secondary labels/nav; 400 body/metadata.
- Emphasis is by weight and colour, never by italic or underline.
- Never negative-track body or smaller. Never positive-track display.

---

## 3. Colour system

Dark-only remains the standard — stated as a *decision* (Whoop/Oura/
Robinhood-after-hours precedent; functional for 5am/gym-lighting use), not
an omission. No light theme is planned; the accessibility contrast/colour-
blind/large-text swaps stay.

### 3.1 Semantic architecture (this is the elevation fix)

The central change from `01`/`02`: **widen and lightly warm the surface
ladder so elevation actually reads, and add the missing "elevated" tier for
modals/menus.** Today's ladder steps ~10 luminance points and is pure
neutral; premium dark ladders step wider and often carry a faint tint. Amber
is warm, so a *barely* warm-grey ladder ties the surfaces to the brand
without anyone noticing consciously.

| Semantic token | Current | **Proposed** | Role |
|---|---|---|---|
| `background` | `#0D0D0D` | `#0D0D0D` (keep) | app base |
| `surface` | `#1A1A1A` | `#191917` | cards, sheets (1st elevation) |
| `surfaceElevated` (NEW) | — | `#222220` | nested cards, the raised tier today's flat look misses |
| `surface2` | `#242424` | `#2A2A27` | inputs, chips |
| `surface3` | `#2E2E2E` | `#343431` | skeletons, fills, highest |
| `border` | `#6E6E6E` | `#6E6E6E` (keep — WCAG-tuned) | 1px edges |
| `borderSubtle` (NEW) | — | `#2E2E2C` | hairline dividers *inside* a card (low-contrast, Linear-style) |

The warmth is deliberately tiny (the `…17/…20/…27/…31` blue-channel
pulldown is a few points), enough to read "instrument", not enough to look
tinted. If you prefer pure neutral, drop the warmth and just take the wider
*spacing* between steps — the spacing is what fixes the flatness; the warmth
is the brand grace note.

**Accent:**

| Token | Current | **Proposed** | Role |
|---|---|---|---|
| `primary` | `#F59E0B` | `#F5A623` (text/icon/small accents) | the one accent on dark |
| `primaryFill` (NEW) | — | `#E08C0B` (large filled buttons) | slightly deepened so big amber fills don't optically vibrate |
| `primaryDim` | `#B45309` | `#B45309` (keep) | pressed/disabled amber |
| `primaryBg` | `rgba(245,158,11,0.10)` | `rgba(245,166,35,0.12)` | soft accent fills, active chips |

Rationale: research says desaturate/deepen accents for large dark fills;
keeping a bright amber for *small* marks (icons, the brand affordance, key
data values) preserves punch where it's tiny, while the deepened
`primaryFill` calms the big CTA. If you want zero change here, the current
`#F59E0B` is acceptable everywhere — this is a refinement, not a fix.

**Semantic states** keep current values (`success`/`warning`/`error` and
their `Bg`s); they're already colour-blind-swappable. One addition for the
data-app feel: a dedicated **`dataUp` / `dataDown`** pair (reuse
`success`/`error`) so trend numerals can shift colour the Robinhood way
without overloading the success/error meaning.

### 3.2 Depth and hierarchy through colour

Depth is expressed by **the tonal ladder first, a single hairline second,
shadow third (sparingly).**
- Background vs card: the widened `background`→`surface` step.
- Card vs nested element: `surface`→`surfaceElevated`.
- Inside-card dividers: `borderSubtle` (low-contrast), not the full
  `border`.
- Card edge on background: keep the 1px `border`, but it can now be subtler
  because the tonal step does more work.

### 3.3 Gradient

**Standard: no decorative gradient. Gradient is permitted only as a
*functional data encoding*** (e.g. a volume bar transitioning MEV→MAV→MRV
green→amber→red, or a single subtle top-of-screen vignette on the active-
workout hero if it improves number legibility). This keeps the existing
`CLAUDE.md`/`DESIGN_SYSTEM.md` rule, which `02` confirms is the premium-dark
position. No orbs, no glow, no mesh background. Implement functional
gradients with `expo-linear-gradient` (already installed); reserve Skia for
the one case where a mesh/radial genuinely encodes data.

---

## 4. Spacing and layout system

- **Base unit: 4, on an 8-major grid.** Keep the existing `spacing` ramp
  (2/4/8/12/16/24/32/48) — it's well adopted (2,246 uses).
- **Add two intermediate steps** the audit showed people hardcoding:
  `hair: 1` (the `marginTop:1` optical nudge, 27+ hand-rolled uses) and
  `xs2: 6` (dense data-row gaps, the `gap:3/5/6` cluster). Small, but it
  removes the most common arbitrary values.
- **Screen edge margin: `spacing.lg` (16)** as the standard; `spacing.md`
  (12) permitted on dense data screens. One value per screen, not mixed.
- **Component gaps:** related items `spacing.sm` (8); within a card section
  `spacing.md` (12); between sections `spacing.xl` (24); major breaks
  `spacing.xxl` (32).
- **Safe area:** continue `react-native-safe-area-context`; every scroll
  view bottom-pads `spacing.xxl` so content clears the tab bar (already the
  pattern in newer screens — make it universal).
- **Density standard:** Volyume is *deliberately denser* than a wellness
  app (it's an instrument) but never cramped. The test: a primary number
  always has at least `spacing.md` of clear space around it so it reads
  instantly. Breathing room is spent on the hero data, saved on chrome.

---

## 5. Surfaces and depth

- **Layers:** background → `surface` (cards/sheets) → `surfaceElevated`
  (nested) → modal/sheet (`surface` + `radius.xl` top corners + `scrim`
  behind). The `scrim` token (`rgba(0,0,0,0.55)`) stays the one backdrop.
- **Shadows:** keep them rare and tokenised. The standard: **only floating,
  temporary, above-everything surfaces get a shadow** — Toast (already
  does), the Diary FAB (already does), and menus/peek sheets. Everything
  anchored in the layout expresses depth through the tonal ladder, not
  shadow. This is both the premium-dark technique *and* the Android-safe one
  (`shadowOffset/Opacity/Radius` are iOS-only; Android `elevation` is
  coarse). When a shadow is used it must come from the `shadow` token — no
  more inline `'#000'` shadow blocks (9 exist today).
- **Blur / glass: not adopted as a standard.** `expo-blur` is not installed,
  and on Android it's experimental, can't blur behind a `Modal`, and only
  improves on Android 12+. The one place it could earn its place is a single
  backdrop-blur behind the active-workout bottom controls — and even that
  must degrade to a solid translucent fill on Android. Treat as an optional
  Phase-5 "moment", not a system-wide material. If pursued, implement via
  Skia `backdrop-filter` (more controllable than expo-blur) with a solid
  fallback.
- **Border radius:** keep the tiered token (sm 6 / md 10 / lg 14 / xl 20 /
  full 999) and **add two missing steps** the audit showed hardcoded 91
  times: `xs: 4` (chart dots, tiny chips) and a `circle` helper
  (`borderRadius: size/2`) so avatars/FABs stop hand-computing. Radius tier
  rule stays: modal (20) ≠ card (14) ≠ control (10) ≠ tag (6).

---

## 6. Motion standards

Re-platform everyday motion onto **Reanimated v3** (installed, currently
unused) and tokenise it. Keep the existing hand-tuned peaks (PR confetti,
splash) — they're good — but bring everyday motion up to a consistent
standard. **Reduce-motion gating stays mandatory on every animation** (it's
already first-class; do not regress it).

### 6.1 Tokens (replace the under-used `motion` token with researched values)

| Token | Value | Curve | Use |
|---|---|---|---|
| `motion.micro` | 120ms | standard `cubic-bezier(0.2,0,0,1)` | taps, toggles, opacity dips |
| `motion.state` | 200ms | standard | state changes, colour/size shifts |
| `motion.enter` | 320ms | emphasized-decelerate `cubic-bezier(0.05,0.7,0.1,1)` | sheets, cards, screen content entering |
| `motion.exit` | 220ms | emphasized-accelerate `cubic-bezier(0.3,0,0.8,0.15)` | leaving |
| `motion.hero` | 440ms | emphasized | the one "important moment" per screen |
| `motion.spring` | stiffness 150, damping 18, mass 1 | — | press, drag-release, any physical-feeling move (≈ iOS 0.8 damping) |

### 6.2 What must exist for the app to feel alive

- **One unified press feel** everywhere (see §8): the `motion.spring` scale
  to 0.97 + opacity dip. This is the highest-impact motion change.
- **Screen-content entrance:** primary screens fade+rise their first
  content block on focus (`motion.enter`, translateY 8–12px). Subtle, once,
  not per element — except lists (next item).
- **Staggered list entrance** on the main data lists (workout history,
  exercise library, plans): items enter with `motion.enter` and a ~30ms
  per-item stagger, capped at the first ~8 items. Reanimated layout
  animations do this declaratively.
- **Number transitions** on the hero data: when a tracked value changes
  (weight logged, volume updated), the numeral cross-fades/counts rather
  than hard-cutting. This is the Robinhood signal, applied with restraint —
  hero numbers only, not every figure.
- **Sheet/modal:** keep the current tuned slide+fade, retimed to the tokens.

### 6.3 What must never animate

- Frequent standard controls beyond the press feel (Apple HIG: the system
  already handles these; extra motion adds latency).
- The hero number's *position* (it may cross-fade its value, never bounce
  or slide — a jittering primary number is the opposite of an instrument).
- Anything, when reduce-motion is on.
- Background/decoration — there is none, and none animates.

### 6.4 RN implementation

Reanimated v3 worklets (UI thread) for all of the above; Gesture Handler for
any drag; Moti optional for the declarative list/entrance brevity. Set
`CADisableMinimumFrameDurationOnPhone = true` and verify 120fps on-device
(don't assume it). No animation on a continuous scroll surface that runs
through Skia.

---

## 7. Iconography

- **Set:** keep Ionicons (`@expo/vector-icons`), used exclusively. One set.
- **Sizing: enforce the `iconSize` token** (16/20/24/32). The standard:
  inline-with-text 16; standard action 20; primary/nav 24; feature 32. No
  more ad-hoc 14/18/40 (the audit found ~60% hardcoded).
- **Weight/style: outline = available/inactive, filled = active/done/
  selected.** Keep the documented rule, enforce it. One stroke weight
  (Ionicons default).
- **Colour:** `textSecondary`/`textMuted` for utility icons; `primary` only
  for active/affordance icons (the amber affordance is the brand — don't
  dilute it by amber-colouring decorative icons).

---

## 8. Interaction feedback

### 8.1 Press states (the consistency fix)

**Standard: one press primitive, one feel, everywhere.** Route every
tappable surface through `PressableCard` (or `Button`, which wraps it):
spring scale to 0.97 + opacity dip to ~0.92, reduce-motion aware. Retire the
scattered `TouchableOpacity activeOpacity={…}` pattern (72 files, 8
different opacity values today).

Per element type:
- **Primary button:** `Button` primary — spring 0.96 (slightly deeper for
  the hero CTA) + `haptics.press()`.
- **Secondary/tertiary button:** `Button` — spring 0.97.
- **Card / list row:** `Card onPress` / `PressableCard` — spring 0.97.
- **Icon button / chip:** `PressableCard` scale 0.94 (small targets read a
  deeper press) — no haptic unless it commits a change.
- **Tab bar:** platform default + `haptics.selection()` on change.
- **Disabled:** opacity 0.5, no press animation, no haptic (one treatment
  app-wide — `Button` already does this).

### 8.2 Haptic map

Volyume's `haptics.js` is already best-in-class and matches Apple's guidance
(`02.E`). **The standard is to keep the vocabulary and widen its reach.**
The confirmed map:

| Interaction | Haptic | Helper |
|---|---|---|
| Log working set | Light impact | `setLogged()` |
| Log warm-up set | Selection | `warmupLogged()` |
| PR achieved | Success + Heavy (120ms later) | `prAchieved()` |
| Workout complete | Success + Heavy×2 | `workoutComplete()` |
| Rest timer done | Medium + Heavy | `restDone()` |
| Rest 3s warning | Light | `restAlmostDone()` |
| Toggle / segment / picker tick | Selection | `selection()` |
| Primary button press | Light impact | `press()` |
| Commit / undo / toggle-off | Medium | `commit()` |
| Error / blocked action | Warning | `error()` |

Rules: never the sole confirmation (Taptic is silent in Low Power Mode /
when disabled); reduce-motion gates all of it (already does); **do not add
haptics to frequent navigation taps** — reserve for meaningful moments to
avoid haptic fatigue. The work is reach, not redesign: wire `selection()`
into the everyday toggles/segments/pickers that currently have none.

---

## 9. Loading, empty, and error states

### 9.1 Skeletons (close the tier gap)

**Standard: every screen that fetches data shows a content-shaped skeleton,
never a bare spinner.** `Skeleton.js` is already good; the job is coverage —
the 14 screens still on `ActivityIndicator` (Food search, Food insights, My
recipes, Exercise detail, Share card, Import) move to `SkeletonCard`/
`SkeletonRow` matched to their real content shape. A bare spinner is only
acceptable for a sub-second inline action (a button's own `loading` state,
which `Button` already handles).

### 9.2 Empty states

`EmptyState.js` is already premium (icon, title, text, primary+secondary
CTA, ghost preview variant, hand-built SVG illustrations). Standard:
- **Illustrated** empty state (the `Illustrations.js` SVGs) for the *first-
  run / no-data-yet* moments on hero surfaces (no workouts, no plans, no
  PRs, no chart data).
- **Simple** `EmptyState` (icon + copy, `compact`) for inline/secondary
  empties.
- **Ghost** variant for "here's what this will look like" previews.
- Copy tone per `DESIGN_SYSTEM.md`: direct, data-first, no motivational
  filler, no emoji. "No personal records yet" + one line, not a paragraph.

### 9.3 Error states

- **Transient/action errors:** `Toast` variant `error` (4s, left-accent
  bar) + `haptics.error()`. Copy states the problem plainly: "Set not saved.
  Try again." — no chatbot apology.
- **Inline field errors:** the existing inline message pattern, `error`
  colour, below the field.
- **Full crash screen** (`App.js`): functional today but visually plain.
  Bring it to standard — `background`, `type` roles, the brand mark, a
  single "Restart" `Button`, monospace only for the (collapsible) stack.

---

## 10. The journey

How it should *feel* to move through Volyume, end to end:

- **Screen transitions:** default platform push for ordinary navigation
  (Apple HIG: don't over-animate routine moves); the `heroZoomTransition`
  (scale 0.92→1 + fade) reserved for *entering a workout* and *finishing
  one* — the two moments that deserve weight. Content within a screen rises
  in once on focus (`motion.enter`). Lists stagger. Nothing bounces.
- **First impression (onboarding):** establish the instrument identity in
  the first three seconds — the splash (already crafted) into a calm,
  dense, number-forward first screen. No carousel of feature cards, no
  confetti welcome. The first thing the user should feel is "this is
  precise and built for me", not "this is friendly".
- **Opening a workout (the signature moment):** this is Volyume's
  equivalent of Things' Magic Plus or Whoop's recovery dial — the one
  surface that must feel best. Entering the active workout uses
  `heroZoomTransition`; the screen leads with the `display`-size timer/next-
  set in tabular numerals; the **COMPLETE SET** button is unambiguously the
  largest, deepest-pressing, amber-filled action on the screen with a
  `setLogged()` haptic; rest timer end fires `restDone()`; a PR fires the
  existing confetti + `prAchieved()`. Everything else recedes. A lifter
  glancing from the bar should read the next set in under a second.

---

## 11. Summary of what changes vs what's already right

**Already premium — preserve, don't touch:**
- The centralised token file and accessibility swaps.
- The `haptics.js` vocabulary (just widen reach).
- The `PressableCard` spring and `Button` primitive (just widen reach).
- `EmptyState` + `Illustrations` + `Skeleton` components (just widen reach).
- Reduce-motion discipline (mandatory to preserve).
- The "no decorative gradient / no orbs / numbers-are-hero / direct copy"
  rules — research confirms them as genuinely premium.

**The changes, in leverage order:**
1. **Adopt the `type` roles everywhere** + tabular numerals on all data
   (the single biggest perceived-quality win; infrastructure already
   exists).
2. **One press feel everywhere** (route 72 `TouchableOpacity` files through
   `PressableCard`).
3. **Widen + lightly warm the surface ladder** and add `surfaceElevated`
   (fixes the universal flatness).
4. **Tokenise motion onto Reanimated** with the researched curves/durations;
   add screen entrance + list stagger.
5. **Skeletons on the remaining 14 spinner screens.**
6. **Bundle Inter** (config plugin) for a typographic signature — optional,
   higher-effort, your call vs staying on system font.
7. **Enforce `iconSize`, extend `radius`/`spacing`** with the missing steps;
   move inline shadows/hex to tokens; add a CI guard.

---

## 12. Open questions for you (please answer before Phase 4)

1. **Amber vs blue** (§0) — confirm keep amber (my strong recommendation),
   or switch to blue.
2. **Custom font** (§2.1) — bundle Inter now, or stay on the system font for
   this pass? (Everything else works either way.)
3. **Surface warmth** (§3.1) — take the slightly-warm grey ladder, or keep
   pure neutral and just widen the steps?
4. **Accent refinement** (§3.1) — adopt the deepened `primaryFill` for large
   buttons, or leave `#F59E0B` everywhere?
5. **Body size 15→16** (§2.2) — agree, or keep 15 for density?
6. **The one blur "moment"** (§5) — interested in a single backdrop-blur on
   the active-workout controls (Android-degraded), or skip blur entirely?

Once you've answered (or said "all your recommendations"), I'll write the
application audit (`04`) and the prioritised roadmap (`05`) against the
confirmed standard, then the executive summary (`00`). **No app code will
change until you've approved this and the roadmap.**

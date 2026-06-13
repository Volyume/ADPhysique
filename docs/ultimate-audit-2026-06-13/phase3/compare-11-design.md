# Phase 3 master comparison — Area 11: Design, visual quality & premium feel

Reconciles Volyume's current component library (Phase-1 fragments
`phase1/15a-components.md`, `15b-components.md`, `15c-components.md`,
`15d-components.md`) against the market design research
(`phase2/research-11-design.md`). READ-ONLY; no new research, no code change.
British English. Every market claim carries its research status; every
Volyume-current claim carries its file:line.

```
AREA: Design, visual quality & premium feel

VOLYUME CURRENT:
A mature, token-driven design system, not a loose set of screens. A single
theme (src/styles/theme.js) defines fontSize / spacing / radius / colour /
motion tokens, and the component library is built almost entirely against it.
The premium foundations the market research names as the primary levers are
present and deliberate:
- TYPOGRAPHY + SPACING discipline: a resolved type scale and type.* roles
  (body/bodyStrong/title/label/caption) and a spacing/radius token set, used
  consistently across primitives (15a theme reference :6-16; Card.js tokenised
  "no literals found" 15a:323-325; ProgressSections "strong token discipline,
  good use of type.* roles" 15b:339-342).
- ONE PRESS MODEL / MICROINTERACTION: PressableCard gives every primitive the
  same spring press-in (scale 0.97 + opacity dip), explicitly "documented as
  matching Apple/Linear/Whoop/Spotify press feel", reduce-motion aware
  (PressableCard.js:5-7,:43-66, 15b:283-299).
- MOTION as a token: AnimatedEntrance uses Reanimated FadeInDown on the
  tokenised motion.enter (320ms) emphasized-decelerate curve, staggered, with a
  reduce-motion fallback (AnimatedEntrance.js:22,:38-45, 15a:32-41).
- HAPTICS: escalating success haptics on the PR moment and rest-timer
  countdown, selection haptics on picks (PRCelebration.js 15b:170-173;
  RestTimer.js 15b:404-425; ReasonPicker uses lib/haptics 15b:394).
- ONE DISCIPLINED BRAND ACCENT: a single amber primary runs the whole system
  (Button primary, Chip selected, ProBadge, lock chip, MacroRings ring), with
  withAlpha tints rather than hex-concat for accent borders (Card.js:51 15a:321;
  GradientCard uses withAlpha 15b:100).
- SKELETON LOADERS already exist: Skeleton / SkeletonCard / SkeletonRow mirror
  real content shape, shimmer pulse collapsed under reduce-motion, used across
  16 screens, accessibilityRole "progressbar" (Skeleton.js:23-84,:87, 15c:129-144).
- DESIGNED EMPTY STATES: a shared EmptyState card (adherence-neutral, no-shame
  copy, ghost "your data will look like this" preview) plus a designed
  food-diary EmptyDiary and five bespoke hand-tuned empty-state SVG
  illustrations (EmptyState.js:5-18,:39-48 15a:443-464; EmptyDiary.js 15d:24-49;
  Illustrations.js:22-166 15b:107-124).
- DARK-MODE-FIRST, NO PURE BLACK/WHITE: dark theme background is #0D0D0D not
  #000000 (Button.js note 15a:267); CVD-safe / shape-carries-meaning state
  glyphs (no colour-only, no red) in the streak strip (StreakWeeksSection.js:106
  15c:196-197); a deliberate Class-B rule that headline numbers and value text
  never carry a state colour (TodayStrip 15c:285; WeightTrendCard 15c:368-372).
- SUPPORTIVE, NON-CLINICAL TONE in copy by construction: no-shame empty states,
  forgiving streak language with no "streak" word and no red, withheld under
  ED/wellbeing suppression, plain coaching sentences that translate numbers into
  an action (WeeklyStreakStrip "no jargon" 15c:342-355; StreakWeeksSection:47
  15c:193; FatigueTrendCard "Push your next session"/"Consider a lighter day"
  15b:60-61; WeightTrendCard plain-English insight 15c:372-376).
- ONE HERO MOMENT: PRCelebration full-screen confetti + spring card + escalating
  haptics, rendered app-globally (PRCelebration.js:33-186, App.js:827 15b:169-183).

NEWBIE VERDICT:
Well served on the foundations, with sharp jargon cliffs in the data surfaces.
The supportive, non-shaming tone the market research says beginners most need
is structurally present (no-shame empty states, forgiving streak copy, plain
coaching sentences, EmptyDiary "Nothing logged yet today." 15d:45). Calm
defaults and skeletons reduce first-load anxiety. But several data components
are explicitly flagged "only fully makes sense to experienced users": the
BodyDiagramHeatmap assumes MAV/MRV concepts with no education on "Over limit"
(15a:182-188), EngineLog uses "Rep regression"/"+1 set" coaching-literate terms
(15a:491-497), VolumeBars MEV/MAV ticks have no on-screen legend (15c:311-313),
PlateCalculator assumes bar/per-side loading literacy (15b:254). "P C F" macro
shorthand appears unexpanded in some food rows (15d:79). The newcomer's day-one
read is clean and kind, but the deep surfaces drop jargon without inline
teaching.

ATHLETE VERDICT:
Strongly served. The fast-logging, data-dense, "spartan-speed" qualities the
research says the experienced user reads as beauty are here: 52x52 steppers and
hero-numeral value inputs in SetEntry (15c:88-91), a full scrub/crosshair/
tooltip chart engine (VolyumeChart 15c:317-338), ACWR / mesocycle / fatigue /
readiness depth (ProgressSections, ReadinessCards), tabular-nums on every
numeral, and progressive-enhancement gestures (chart long-press scrub, TodayStrip
tap/long-press). The system can carry density without feeling cheap — exactly
the Linear "modular depth" lesson. The gap for the athlete is the inverse of the
newbie's: there is no single opt-in DENSE mode; density is per-component, not a
global power-user toggle.

BEST IN CLASS:
- Premium minimalism with modular depth — Linear: "very thoroughly considered
  and carefully designed", "feels native", a large modular component set so
  minimalism stays interesting not barren.
  https://www.eleken.co/blog-posts/linear-app-case-study — VERIFIED
- Warmth without clutter — Monzo: clean structure + restrained animation + ONE
  disciplined accent (Hot Coral) used "as a moment of delight".
  https://www.creativebloq.com/web-design/ux-ui/monzos-brilliant-ui-design-is-a-delight-to-use — VERIFIED
- Premium = typography + spacing + animation, not features — Craft: "Typography
  is carefully considered. Spacing feels intentional", polish that reads as
  "someone cared deeply about how the app looks and feels".
  https://calmevo.com/craft-app-review/ — VERIFIED
- Supportive non-clinical fitness feel — Gentler Streak (ADA 2024 winner): "no
  streaks, no scolding", stats "translated into words", "life happens"
  sick/injured/break states, soft/warm illustration.
  https://developer.apple.com/news/?id=3m0ht22s — VERIFIED;
  https://www.sketch.com/blog/gentler-streak/ — VERIFIED
- Beautiful health data-viz + calm — Oura: four summary scores front-and-centre,
  serene imagery, "polished, easy to read" charts that "encourage exploration".
  https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/ — VERIFIED
- Warm colour system / no pure black — Headspace: warm palette, warmest neutral
  ~#FFF8F0, curved edge-free characters, "wisest warmest friend".
  https://raw.studio/blog/how-headspace-designs-for-mindfulness/ — VERIFIED
- Fast/low-bloat logging as beauty — Hevy ("no bloat, no gamification, no
  upselling") and Strong ("clean to the point of being spartan").
  https://askvora.com/blog/best-strength-training-apps-2026 — VERIFIED
- Loading + empty-state pattern leaders — skeleton screens (Facebook/LinkedIn/
  YouTube); Gmail/Airbnb/Linear/Notion empty states.
  https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/ — VERIFIED;
  https://blog.logrocket.com/ux-design/empty-states-ux-examples/ — VERIFIED

TOP 50 RANGE:
A wide spectrum, though the research itself flags it carries ~33 named apps with
~16 VERIFIED on design-specific sourcing (below its 50-app / 20-VERIFIED target;
research §1 coverage note). At the top sit the design-led products whose whole
reputation is feel: Linear, Craft, Monzo, Oura, Headspace, Gentler Streak
(VERIFIED). The strength-logging tier prizes spartan speed over polish — Hevy,
Strong (VERIFIED). The data-dense tier is "acceptable to the right user but
cluttered by default" — Whoop "home page feels cluttered… chock-full of
information" vs Oura's four summary scores (VERIFIED). A long tail is named but
thin or unsourced on design: Fitbod, Caliber, MacroFactor, Calm, Strava
(PARTIAL); Garmin Connect, Nike Run Club, Peloton, Apple Fitness+ returned
ecosystem/sync threads not visual critiques (PARTIAL); Cronometer, BetterMe,
Virtuagym, Jefit appeared in list only (NOT FOUND).

WHERE WE LEAD:
- Token system + one press model + tokenised motion already deliver the
  "intentional, considered, native-feeling" base the market reads as premium —
  the Linear/Craft lesson is implemented, not aspirational (PressableCard
  15b:283-299; AnimatedEntrance 15a:32-41; Card "no literals found" 15a:323-325).
  Supports: Linear https://www.eleken.co/blog-posts/linear-app-case-study —
  VERIFIED; Craft https://calmevo.com/craft-app-review/ — VERIFIED.
- Skeleton loaders already shipped across 16 screens, reduce-motion aware
  (Skeleton.js 15c:129-144) — the perceived-speed pattern the research recommends
  is in place, not a gap.
  Supports: https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/ — VERIFIED.
- Supportive, non-shaming tone is built into the components, not bolted on:
  no-shame EmptyState, no "streak" word / no red, ED suppression, word-based
  coaching lines (15a:443-464; 15c:193,:342-355; 15b:60-61). This matches the
  Gentler Streak gold standard and the MyFitnessPal "control-and-numbers
  backfires" finding.
  Supports: https://developer.apple.com/news/?id=3m0ht22s — VERIFIED;
  https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/ — VERIFIED.
- Dark-mode discipline aligns with the literature: no pure black (#0D0D0D),
  state via shape not colour-only, headline numerals never state-coloured
  (15a:267; 15c:196-197,:285). Matches the "never pure black, desaturate, signal
  depth by tone" guidance.
  Supports: https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/ — VERIFIED.
- Bespoke, on-brand empty-state illustrations (five hand-tuned SVGs) rather than
  generic icons (Illustrations.js 15b:107-124) — the warm-monochrome-illustration
  approach the research praises in Linear/Notion.
  Supports: https://blog.logrocket.com/ux-design/empty-states-ux-examples/ — VERIFIED.
- A genuine hero moment (PRCelebration) — emotion is what's remembered, and the
  app has exactly one deliberate emotional peak (15b:169-183).
  Supports: https://medium.com/design-bootcamp/microinteractions-and-emotion-tiny-details-huge-impact-efec5714a6a8 — VERIFIED.

WHERE WE LAG:
- NO global summary-first / opt-in dense split. The research's headline
  recommendation is the Oura-default-with-Whoop-opt-in pattern, mapping onto
  Volyume's dual audience. Today density is decided per component
  (data-dense Progress cards always render dense), with no power-user toggle.
  Supports: https://www.tomsguide.com/wellness/sleep-tech/whoop-vs-oura-i-tested-each-sleep-tracker-for-two-weeks-heres-my-winner — VERIFIED;
  research §5 Proposal 1.
- Jargon without inline teaching on the deep surfaces — empty states are
  supposed to double as onboarding (what / why / what-to-do), but
  BodyDiagramHeatmap ("Over limit", MAV/MRV), EngineLog ("Rep regression"),
  VolumeBars (MEV/MAV ticks, no legend) drop terms cold (15a:182-188,:491-497;
  15c:311-313). Newbie risk.
  Supports: https://www.eleken.co/blog-posts/empty-state-ux — VERIFIED.
- TWO animation systems coexist — AnimatedEntrance (Reanimated, tokenised) vs
  BottomSheet (RN Animated with LITERAL durations 260/200ms, untokenised easing)
  (15a:548-550; BottomSheet.js:24-27 15a:208-213). The "intentional, consistent
  motion" premium signal is partly undercut by an untokenised second system.
  Supports: https://calmevo.com/craft-app-review/ — VERIFIED (animation quality
  as premium signal).
- Sub-44px touch targets on multiple interactive elements — InfoTooltip ~30px
  (15b:445-446), Chip ~29px, CardioPlanCard "Log cardio" ~21px, EmptyState CTAs
  ~37px, DifferentialBadge CTA ~40px, SegmentedControl cell ~34-36px, Dropdown
  rows ~40px, ServingPicker unit pill, BodyDiagramHeatmap SVG regions (15a:551-556;
  15c:74-76; 15d:281-283). "Predictable, in-control" navigation = trust, and
  hard-to-hit targets erode it.
  Supports: https://www.insivia.com/designing-for-trust-web-design-elements-that-enhance-credibility-in-healthtech-platforms/ — VERIFIED.
- LATENT LIGHT-THEME CONTRAST BUG — Button primary/destructive use
  colors.background as on-fill ink instead of onPrimary; identical in dark, but
  near-white-on-amber under the light theme (Button.js:25,:28 15a:262-271,:540-543).
  WCAG AA 4.5:1 risk if light theme ships.
  Supports: https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/ — VERIFIED
  (contrast-ratio requirement, applied here to light theme by inference).
- Privacy posture not surfaced as a trust signal — the research says EU
  residency / no-third-party-PII should be VISIBLE in the UI, not just true; the
  component inventory shows no trust-badge / data-residency surface (absent from
  all four fragments; FeedbackSheet only states what is stripped, 15b:86).
  Supports: https://thisisglance.com/blog/healthcare-app-psychology-building-trust-through-design — VERIFIED;
  research §6 Interpretation (architecture alignment).

MISSING ENTIRELY:
- No opt-in compact/dense "power-user" view mode anywhere in the library
  (research Proposal 1; Whoop density-as-opt-in — VERIFIED).
- No surfaced privacy / data-residency trust badge or "where your data lives"
  affordance (research §6 — VERIFIED for the principle; absent in fragments).
- No tokenised motion system shared by sheets (BottomSheet bypasses motion.*;
  15a:208-213) — i.e. no single motion language across both animation libraries.
- An on-screen LEGEND/KEY for shape-coded and landmark-coded data is missing on
  several surfaces (StreakWeeksSection glyph strip 15c:208; VolumeBars MEV/MAV
  15c:311-313; BodyDiagramHeatmap band meaning for newbies 15a:182-188).
- NOTE — not gaps the research found, but inventory dead/unwired surfaces that
  affect "premium consistency": Chip, ExerciseCard, Stepper, VolumeBars,
  PlateCalculator, OptionCard, SourceChip, ServingPicker, HeldDecisionCard are
  built but unimported (15a:366-371,:507-511; 15c:173-176,:301-303; 15b:154-158,
  :241-244; 15d:142-147,:272-277,:300-305). Several screens hand-roll buttons/
  chips instead of the existing primitives (15a:536-539), a consistency drift the
  primitives were meant to retire. No market source bears on this; flagged as a
  Phase-1 finding only.

USER SENTIMENT:
What users want that the market does not fully provide:
- Beauty = CALM + CLARITY in users' own words ("delightful UI", "beautiful
  graphs and stunning visuals", "serene landscapes… more tranquility") — Oura
  reviews. https://www.producthunt.com/products/oura/reviews — VERIFIED;
  https://www.pocket-lint.com/new-oura-app-update-finally-redesigned/ — VERIFIED.
- The ABSENCE of bloat is itself praised as beauty: "no bloat, no unnecessary
  gamification, and no aggressive upselling" (Hevy); "clean to the point of being
  spartan" (Strong). https://askvora.com/blog/best-strength-training-apps-2026 — VERIFIED.
- Users actively resent control-and-numbers framing and fake-streak punishment:
  "shame, guilt, frustration and burnout… reminders that felt nagging or
  judgmental." https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/ — VERIFIED.
- A "wisest, warmest friend" guiding tone is what people remember
  (Headspace). https://raw.studio/blog/how-headspace-designs-for-mindfulness/ — VERIFIED.
The unmet want across the market is an app that is BOTH data-deep for the
athlete AND calm/supportive for the beginner — the Oura-calm / Whoop-depth split
nobody resolves in one product (research INTERPRETATION on Q2). Volyume's
dual-audience design is positioned to own exactly this gap if it adds the
summary-first / opt-in-dense layer.

VERIFICATION STATUS:
The substantive design findings this block leans on are VERIFIED. The
PARTIAL/NOT-FOUND and inference-flagged dependencies are:
- Q4 dark-mode colour/contrast (no-pure-black, desaturate, tonal elevation, the
  light-theme Button contrast point) rests on AUTHORITATIVE GENERAL dark-mode UX
  literature applied to fitness by INFERENCE — the research explicitly found NO
  source critiquing a named fitness app's dark mode (research Q4 NOTE/GAP). The
  WHERE-WE-LEAD dark-mode point and the WHERE-WE-LAG light-theme contrast point
  inherit this inference flag.
- The "opt-in density" recommendation rests on the Whoop-vs-Oura comparison
  (VERIFIED) plus the research's own INTERPRETATION mapping it to Volyume's dual
  audience — the interpretation is not itself a sourced market finding.
- The "surface privacy posture" point rests on a VERIFIED trust-design principle
  plus the research's architecture-alignment INTERPRETATION (not a market
  observation of a competitor doing it).
- Several long-tail apps referenced for the TOP 50 RANGE are PARTIAL (Fitbod,
  Caliber, MacroFactor, Calm, Strava, Garmin, Nike Run Club, Peloton, Apple
  Fitness+) or NOT FOUND (Cronometer, BetterMe, Virtuagym, Jefit); the range
  statement carries that spread per the research §1 table and coverage note.
- Coverage caveat carried from source: the design research met neither its
  50-app target (~33 named) nor its 20-VERIFIED floor (~16); principle-led depth
  was prioritised over app count (research §1 coverage note, §6).
```

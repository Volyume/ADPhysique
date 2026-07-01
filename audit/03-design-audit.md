# Volyume — Design Audit (03)

Date: 2026-07-01 · Read-only session · Method: three parallel design
subagents (token-system extraction, screen-level critique, motion & polish),
every claim verified at the cited file:line. Companions: `01-codebase-audit.md`
(engineering), `02-ux-audit.md` (journeys/friction).

**Headline.** The de facto design system (`src/styles/theme.js`, 571 lines,
4 palettes, WCAG ratios documented inline and asserted in tests) is strong and
~91% adopted (~5,300 token references vs ~542 raw literals). The gaps are
concentrated and nameable: a stale rules doc, one missing type role causing
299 hand-rolled lineHeights, 29 ad-hoc alpha stops, orphaned primitives
(Chip.js has zero importers), and a *flatness* problem — one card recipe, one
header size and one amber tint rank everything equally. Motion primitives are
excellent but under-adopted (five tuned haptic events are never called; no
list in the app animates add/remove).

**Corrections to the record:**
- `docs/rules/styling.md` no longer describes the shipped app (mandates
  `#1A1A1A` surfaces, `#F59E0B` accent, radius 12, body 14, "never add light
  mode" — the real system is `#191917`, `#F5A623`, radius 16, body 16, plus a
  full light palette, theme.js:127-169). **Rewrite the rules doc from
  theme.js.**
- One true colour bug: the Android widget amber is `#F59E0B` while claiming to
  match brand `#F5A623` (`src/lib/widgets.js:17`). ShareCard/CSV palettes are
  deliberate exceptions (documented in-file).

---

## 1. Proposed token system (migration-mapped, zero visual regression)

Merges only where imperceptible (≤3 RGB points / ≤0.03 alpha); everything else
is a rename/alias. Existing theme.js is 90% of the answer.

**Colour roles (dark values; light/HC/CVD tables carry over):**

| Proposed | Value | Absorbs |
|---|---|---|
| `bg` | #0D0D0D | background; widget INK |
| `surface.1–.4` | #191917 / #222220 / #2A2A27 / #343431 | surface / surfaceElevated / surface2 / surface3 (+ ShareCard canvas equivalents stay local) |
| `surface.input` | #222220 | inputBg #1E1E1E (2-pt lift onto the ladder — eyeball once) |
| `surface.tabBar` | #111111 | tabBar (deliberate under-bg, keep) |
| `border.strong/.contrast/.subtle` | #6E6E6E / #7A7A7A / #2E2E2C | border / borderLight / borderSubtle; tabBarBorder #222222 → subtle (2-pt) |
| `text.hi/.mid/.disabled` | #FFFFFF / #9E9E9E / #727272 | textPrimary / **textSecondary+textMuted merged** (#9B9B9B→#9E9E9E, 3-pt, invisible; keep `textMuted` alias) / textDisabled |
| `brand/.fill/.dim/.on` | #F5A623 / #E08C0B / #B45309 / #0D0D0D | primary family; **fix widgets.js #F59E0B → #F5A623**; chartLine likewise |
| `ok/warn/danger` (+`.bg`) | #4CAF50 / #F0E442 / #F44336 | success/warning/error (stateColors, volumeColors stay as aliases) |
| `data.protein/carb/fat/fibre`, `tier.gold/silver/bronze`, `scrim` | as-is | macro*, medals, scrim |
| `camera` | #000000 | ScanLabelScreen's 3× raw #000 (true black behind a viewfinder is correct — token it like appleBtnBg) |
| celebration tokens | — | PRCelebration's #FF6B35/#9C27B0 (last un-tokenised UI colours) |

**Alpha convention** — 29 ad-hoc `withAlpha` stops (17 on primary alone,
incl. indistinguishable 0.25/0.251, 0.33/0.333/0.314 from mechanical hex
conversion) collapse to **7 named stops**: `ghost 0.08 · tint 0.12 · soft 0.19
· edge 0.25 · mid 0.33 · strong 0.40 · half 0.50`. Max delta 0.033 on an
already-translucent tint; 93 of 153 call sites are primary and collapse
mechanically.

**Type** — keep the 9 roles; add the two missing ones that caused the bleed:
- `type.bodySm` = 13/20/regular — absorbs the dominant hand-rolled combo
  (fontSize.sm + lineHeight 18–20 ≈ 177 sites; lineHeight literals are 55% of
  ALL raw style literals, 299 occurrences).
- `type.captionTight` = 11/16 — absorbs xs + lineHeight 16/17 (~64 sites).
- Real heroes (96/44 YearOfLifts, 34 ProSetupComplete) stay as documented
  one-off data-display exceptions; `type.h1`/`display` (0 uses) retained.

**Spacing** — scale unchanged (sound). Migrate: raw `1`→`spacing.hair` (token
exists, 0 uses, 19 raw sites), 3/5/6/7/10/14/18 → nearest step (±1-2px,
eyeball list). **Radius** — add `hair: 2` (progress-bar caps; raw 2/3 appear
30×) ; migrate ~20 hand-computed circles to the existing `circle()` helper
(1 use today). **Elevation** — document that the surface ladder IS dark-mode
elevation; `shadow.sm/md` (0 uses) are retained solely as the light-theme cue.
**Motion** — either add `motion.sheet 260` or retime BottomSheet (its private
OPEN 260/CLOSE 200 constants bypass motion.enter 320/exit 220 — founder
eyeball).

**Component adoption** — no new tokens needed: point the **7 hand-rolled chip
implementations** (QuizScreen, WeeklyCheckIn ChipRow, CoachingReminders
ChipRow, NutritionTargets PillGroup, ShareCard SegmentBtn, ProOnboarding
wpChip, SettingsProfile dietChip) at the orphaned `components/Chip.js` — six
are already pixel-equivalent; and swap EmptyState's hand-rolled inner buttons
for `<Button size="sm">` (the design system currently drifts against itself,
EmptyState.js:119-133).

---

## 2. Screen scorecard

| Screen | Hier. | Density | Contrast | Rhythm | Quality | **Overall** |
|---|---|---|---|---|---|---|
| ActiveWorkout | 8 | 8 | 7.5 | 8 | 8 | **8** |
| DiaryScreen | 7 | 7.5 | 8 | 7.5 | 7.5 | **7.5** |
| ProOnboarding | 7.5 | 7 | 7.5 | 8 | 7.5 | **7.5** |
| WeeklyCheckIn | 7.5 | 7 | 6.5 | 8 | 7.5 | **7.5** |
| ShareCard | 7.5 | 8 | 7.5 | 8 | 7.5 | **7.5** |
| HomeScreen | 6.5 | 7 | 7 | 7 | 7 | **7** |
| PlanLibrary/Detail | 7 | 7.5 | 7.5 | 8 | 6.5 | **7** |
| WorkoutSummary | 6.5 | 6 | 7 | 7.5 | 7.5 | **7** |
| YouScreen/Settings | 7 | 6.5 | 7 | 8 | 7 | **7** |
| NutritionTargets | 6.5 | 5.5 | 7.5 | 8 | 7 | **6.5** |
| CoachOutput | 5.5 | 5.5 | 7 | 7 | 6 | **6** |
| Analytics (Progress) | 6 | 7 | 6.5 | 7.5 | 5.5 | **6** |

Contrast ratios are genuinely strong app-wide (theme-documented, test-asserted).
The legibility debt is **size, not colour**: 11px (`fontSize.xs`) used as
multi-sentence body copy across banners, nav-row subtitles, coach briefs and
derived check-in context; 10px `micro` escapes its documented "chart axis
only" role into legends and labels.

### The five biggest-gap screens (current → elite)

1. **CoachOutputScreen (6) — the flagship presented as a memo.** ~14 stacked
   blocks in four competing tint families; the static "plan next week's meals"
   card wears the same amber border as the hero decision; 13px section headers
   indistinguishable from 13px body; a solid-amber Done outweighing every
   Apply. **Elite:** one screen-width verdict at top (week's delta + the
   single decision, display-size tabular numerals); exactly one amber object
   (the hero Apply); working/off collapsed to a two-column ledger; advisory
   content demoted to plain rows or a "Details" disclosure; safety blocks keep
   their colour — they'd then be the only other coloured thing; Done becomes a
   quiet text action.
2. **AnalyticsScreen (6) — a nav hub wearing a dashboard's name.** No focal
   chart; the only inline viz is a 56px PR bar; weekly volume reduced to 10px
   micro text; everything real behind eight identical nav tiles. **Elite
   (Whoop/Oura bar):** open on one large owned visual — weekly training-load
   chart with this week highlighted and a display-size current-week numeral;
   streak + weight trend as two half-width sparkline cards; volume-by-muscle
   as an inline stacked bar using the existing volumeStatusColor grammar; the
   tile grid collapses to one "More" row.
3. **WorkoutSummaryScreen (7) — the emotional peak at body-copy scale.** Hero
   numbers at 20px in four equal boxes, then ~10 same-weight cards mixing
   celebration with admin. **Elite:** tonnage as THE headline at display size
   (keeping its existing animated counter), comparison verdict fused into it
   ("Strongest session in 4 weeks"), volume compressed to one bar strip, and
   two zones: "what happened" (celebratory, top) / "tell the coach" (inputs,
   one distinct card at the end).
4. **NutritionTargetsScreen (6.5) — right numbers buried in prose.** Four
   consecutive 4–6-sentence 13px paragraphs of rationale + seven same-shape
   cards after the macros. **Elite:** hero kcal + three macro cards with thin
   proportional bars in the existing macro hues fill the first viewport; each
   "why" compresses to one bolded claim with the paragraph behind a
   disclosure; whys/phase/confidence merge into one "How we got here" card;
   only warnings and the EA ease-nudge keep tint.
5. **HomeScreen (7) — a good hero fighting a flat stack.** Hero, last-session,
   pro-teaser and coaching-nudge cards are typographically and chromatically
   identical; six banner variants share near-identical amber treatments.
   **Elite:** the hero is the only elevated object (surfaceElevated exists and
   is unused in all 12 screens); Start is the sole filled-amber element; last
   session demotes to a single-line row; banners render as one slim line above
   the hero, not a card-sized sibling.

### Cross-screen patterns dragging every score
1. 11px as body copy app-wide (+10px micro out of its lane) — add and adopt
   `type.bodySm`.
2. One card recipe for every rank — `surfaceElevated` and the elevation ladder
   are never used to rank importance.
3. Section headers ≈ body text (13px medium/semibold everywhere) — long
   scrolls have no navigational scent.
4. **Amber inflation** — tints and borders mark banners, static info cards,
   secondary buttons and true CTAs alike, so the brand colour stops meaning
   "the one thing to do".
5. Numerals rarely celebrated — `type.num()` display sizes exist and are used
   as a hero exactly once in twelve screens, in a data app.

---

## 3. Motion, feedback & polish inventory

**Touch feedback:** two press languages coexist — PressableCard spring-scale
0.97 (14 files) vs ~120 raw TouchableOpacity across six different
activeOpacity values (0.7–0.88, mixed within single screens). Seven files
bypass the haptics vocabulary with raw expo-haptics, defeating its
Reduce-Motion no-op (RestTimer's countdown ladder, SetEntry steppers).
Settings toggles are silent on some screens, haptic on others.

**Transitions:** the crafted `heroZoomTransition` is applied to only 2 routes
(ActiveWorkout, WorkoutSummary) although "tap a card → it expands" is the
house doctrine; PlanDetail/RoutineDetail/ExerciseDetail are flat platform
pushes. The choreographed splash hard-swaps to the first screen with no
exit fade.

**Loading:** `Skeleton` is a proper system (reduce-motion fallback, 17
screens) but the Progress tab root has no skeleton at all (whole dashboard
pops with layout shift), four data-heavy screens sit on bare spinners, and
YouScreen has no loading state.

**Haptics — the dead vocabulary:** `prAchieved`, `restDone`,
`restAlmostDone`, `warmupLogged`, `workoutComplete` are exported, tuned, and
**never called** (RestTimer/PRCelebration re-implement two of them inline).
Finishing an entire workout fires no haptic. Check-in submit and plan-ready
are silent. Diary swipe-delete is silent.

**Micro-interactions:** zero `LayoutAnimation`/Reanimated `Layout`/`exiting`
anywhere — every list mutation is a jump-cut (Diary delete, ActiveWorkout
set rows). The rest timer — the most-watched component in the app — is pure
ticking text with no draining fill. All determinate progress bars snap.
`AnimatedEntrance` exists but Home/Analytics/You/Summary mount flat.

**Celebrations:** PRCelebration is a flagship (40-particle burst, haptic
ladder, subdued mode under reduce-motion/calm). But the milestone ladder's
payoff is a flat gold card — **100 sessions gets the same quiet beat as 5**;
`nextSessionRung` ("2 sessions to your first 10") is built and tested with
no UI consumer; ProSetupComplete (the Pro funnel's peak) is one fade+slide
with a statically-full progress bar.

### Top 5 "make it feel alive" wins
1. **Wire the dead haptic vocabulary** (workoutComplete on finish, restDone,
   prAchieved, check-in commit, delete beats) — mostly one-liners; also fixes
   the Reduce-Motion bypass.
2. **Reanimated Layout/exiting on Diary + set rows** — kills every jump-cut in
   the two highest-frequency loops, ~3 lines per list.
3. **A draining fill bar on the rest timer** — the most-watched dead component
   becomes live feedback.
4. **Scale milestone celebration to the rung** — reuse PRCelebration particles
   (gold palette, same subdued/ED gates) for 50/100 sessions.
5. **Extend heroZoomTransition to PlanDetail/RoutineDetail/ExerciseDetail** —
   pure navigator-options change.

### Do not break (crown jewels)
PressableCard; the Skeleton system; AnimatedEntrance; the choreographed
splash; PRCelebration incl. subdued mode; YearOfLifts story; MacroRings
count-up; Toast; VolyumeChart scrub haptics; the universal reduce-motion
discipline; and every ED-calm suppression gate on celebratory surfaces —
any new motion must gate identically.

---

## 4. Incremental migration strategy (no big-bang)

Each phase is independently shippable, testable, and small enough for one
session + one founder device-walk. Order chosen so mechanical/no-visual-diff
work lands first and per-screen judgement work lands last. Constraints
honoured throughout: no new dependencies; ED/calm/reduce-motion gates
untouched; British English; founder eyeballs every "±1-2px" judgement item
from a green build.

**Phase 0 — truth & safety (no pixel changes).**
Rewrite `docs/rules/styling.md` from theme.js; fix the widget amber
(#F59E0B→#F5A623 — the only deliberate pixel change, it's a bug); add the
`camera` + celebration tokens; add `type.bodySm`/`captionTight`, `radius.hair`,
the 7 alpha stops, `motion.sheet` — tokens only, no call sites yet. Guard:
lint + full suite + theme contrast tests.

**Phase 1 — mechanical sweeps (near-zero visual diff, high volume).**
One PR per sweep: (a) withAlpha stops → named stops; (b) lineHeight literals
→ bodySm/captionTight; (c) circles → `circle()`; (d) raw 1px margins →
spacing.hair; (e) chip sites → shared Chip; (f) EmptyState buttons → Button.
Each sweep is grep-driven, screen-mount tests green, founder spot-checks the
short "eyeball list" (±1-2px judgement calls flagged per sweep).

**Phase 2 — the felt layer (adoption of existing primitives).**
The five "alive" wins above + skeletons for Progress/You/spinner screens +
press-language unification (card-shaped touchables → PressableCard; one
activeOpacity token for the rest) + toggle haptics parity. Every addition
behind the existing reduce-motion/ED gates. Guard: device walk of the core
loop (log a session end-to-end) per change.

**Phase 3 — hierarchy passes, one screen per session (the judgement work).**
Order by gap × traffic: CoachOutput → Analytics → WorkoutSummary →
NutritionTargets → Home. Each pass applies the same four rules (one hero per
screen · one amber object · headers ≥15px semibold or eyebrow-caps ·
surfaceElevated ranks the hero) using the elite descriptions in §2 as the
spec. No engine values, no copy-register changes, ED/safety blocks keep their
colour and position. Guard: before/after screenshots to the founder per
screen; adversarial review agent per screen against this document.

**Explicitly out of scope for this programme:** any engine output, safety
copy, billing surface, or new dependency. Motion on ED-suppressed surfaces
ships only in its subdued form.

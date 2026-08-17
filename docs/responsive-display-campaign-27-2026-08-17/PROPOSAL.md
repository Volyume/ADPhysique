# CAMPAIGN 27 — RESPONSIVE DISPLAY CONSISTENCY: PROPOSAL

Founder question 2026-08-17: text and layout render very differently
between an iPhone 17 Pro Max and a Galaxy S22+, and will be worse on
smaller screens; Progress text overflow was the proven case. Research
how apps do this and propose a solution for consistent display.

Founder ruling received in advance (verbatim intent, recorded D103):
open to modifying any law - including EP-14's uncapped text scaling -
for the betterment of the app; "All texts can be sized as suited for
the best product." Goal: elite and consistent across the device range.

Evidence: AUDIT-FINDINGS.md (codebase map, file:line) and
RESEARCH-FINDINGS.md (industry practice, sourced) in this folder. This
proposal is the lead synthesis. NO production code changes yet.

## 1. Why the two phones differ (three stacked mechanisms)

1. VIEWPORT: ~384dp usable width (S22+) vs ~440dp (17 Pro Max) against
   FIXED dp type tokens - the same 16dp body line occupies visibly more
   of the Samsung's width; sub-360dp devices are worse.
2. FONT SCALE: Android's system font size multiplies on top
   (allowFontScaling true app-wide per EP-14), and the in-app
   largerText x1.2 STACKS with it - no ceiling anywhere on the
   combination (theme.js:504-506).
3. BRITTLE LAYOUTS: 68 files clamp text to one line and 23 to two, on
   many sentence-length strings; two competing row idioms; a fixed
   96dp label column in the logger tuned only at 1x. The failure class
   is TRUNCATION, not hard clipping (audit section 3).

## 2. The proposed system (four pillars)

### Pillar A - wrap-first layout law (root fix, biggest win)
New styling.md law: sentence-length copy NEVER carries
numberOfLines={1|2}; line clamps are allowed only on identifiers
(names, food products, labels) where truncation is honest, and every
clamped Text sits in a flex:1 + minWidth:0 wrapper (the codebase's own
safe idiom, already used by the fixed Progress pillars and the logger
rows). Phase 2 sweeps the audit's top-15 register (Home coach line,
TodayStrip logWhy, hero session name, NowCard position line, MacroRings
planned hint, banners, onboarding chips, Settings rows...), then the
grep-matched remainder. This is the same fix that already cured
Progress, applied as law.

### Pillar B - per-surface font-scale policy (amends EP-14)
Industry-consensus shape, central and explicit instead of scattered:
a single table in theme.js, e.g.

  fontScaleCaps = { reading: 2.0, chrome: 1.3, numeral: 1.15 }

- READING copy (body text, coach lines, explainers): scaling honoured
  up to 2.0x OS multiplier - Apple's own "at minimum 200%" bar; the
  Android 14 curve tempers the top end anyway.
- CHROME (chips, tab labels, stat tiles, section labels, buttons):
  capped 1.3x, applied through the shared primitives (Button, Chip,
  SectionLabel, tab bar), NOT via thousands of inline props.
- NUMERALS in fixed geometry (rest timer, kcal ring, share heroes):
  keep their existing 1.15-1.3 caps, now sourced from the table.
Consequences handled in the same change: the Settings copy that
promises "your phone's text size is respected" is amended to stay
honest ("within limits that keep every screen usable"); the EP-14
guard is REWRITTEN to enforce the new law - caps may come only from
the central table, never inline literals - which also closes the
audit's finding that WorkoutSummaryScreen's 1.3 cap currently evades
the guard entirely.

### Pillar C - narrow-device bucket (width consistency)
A DISCRETE device-class step, per platform-design-system convention
(both Apple and Material use stepped ramps, never continuous
formulas): when window width < 390dp (catches the S22+ class and
everything smaller), resolveTheme steps the display sizes down one
notch (display 40->36, xxxl 32->29, xxl 24->22; body STAYS 16) and
horizontal screen padding drops one spacing step. Implemented inside
the existing resolveTheme/useTheme pipeline so every migrated surface
gets it for free. Explicitly REJECTED: continuous moderateScale-style
scaling - neither platform vendor recommends it, it fights font
scaling, and it produces the blurry half-dp values the library's own
damping exists to hide.

### Pillar D - regression net
- Maestro flows with built-in screenshot diffing in an EAS Workflow,
  fixed matrix: a ~360dp Android profile at raised system font size +
  a large iPhone, covering Today, Diary, logger, Progress, Plans.
- A manual max-accessibility-size pass added to every campaign device
  checklist (both platform owners instruct this).
- Guard tests: the rewritten scale-cap guard (Pillar B) plus a source
  guard for the wrap-first law on the top-15 surfaces.

## 3. Phasing

- PHASE 2a (highest value, lowest risk): Pillar A sweep of the top-15
  register + SettingRow/minWidth normalisation + SetEntry label column
  made scale-aware. No law changes needed to start beyond styling.md.
- PHASE 2b: Pillar B central cap table + primitive wiring + Settings
  copy + guard rewrite (this is the EP-14 amendment landing).
- PHASE 2c: Pillar C narrow bucket in resolveTheme + device checklist.
- PHASE 2d: Maestro net (can run parallel to 2b/2c).
Each phase lands green through the usual gates with its own device
checklist; agents build 2a/2d (sonnet), lead builds 2b/2c hands-on
(theme pipeline + law changes are judgement/safety-adjacent).

## 4. Founder choice points

1. Approve the EP-14 amendment as specified in Pillar B (per-surface
   caps from a central table, Settings copy amended)? The alternative
   - keep everything uncapped and rely on wrap-only - fixes overflow
   but leaves dense chrome degrading at 2x.
2. Approve the Pillar C narrow-device bucket (<390dp, display sizes
   -1 step, body unchanged)? Alternative: skip width adaptation and
   accept the remaining density difference between phone classes.
3. Phasing order above, or compress 2a-2c into one campaign?

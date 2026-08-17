# ELITE SHARE-CARD REVAMP — DESIGN SPEC (Campaign 30, D108)

Founder order 2026-08-17: complete revamp - "don't work well at all,
look dull, data doesn't fit, not attractive or share worthy... as good
and as appealing as competitors." Evidence: INVENTORY (agent audit with
rendered PNGs of every current card) and RESEARCH (competitor/format
findings) summarised in this folder's sibling notes; prior technical
audit docs/audit/share-card-audit-2026-07-27.md remains valid law where
not superseded here.

## Verdict on the current system

Technically correct, visually monotone. One near-black gradient + one
amber treatment for all five card types; the hero numeral renders
identically whether it is a PR or a routine total; the brand footer
(23%-width wordmark + tagline + underline + volyume.app) is a loud
lockup by 2026 standards; the photo background is camera-only, opt-in,
and buried under a flat 0.62 black scrim; story format leaves 40-45%
bare gradient on four of five types; no sticker export, no template
picker. Research: photo-first transparent/tone-matched cards are what
gets shared; opaque dense branded cards are what users bypass with
third-party tools. Whoop and RP have NO share cards - a restrained
dark-premium photo-first system is differentiating, not catch-up.

## The design (five pillars)

### 1. Photo-first composition
- The user's photo becomes the CANVAS, not a tint: gallery picker added
  beside camera capture; full-bleed cover-fit; content anchored to the
  lower third with a TONE-SAMPLED gradient scrim (sample the photo's
  dominant dark tone, build the scrim from that hue - the MacroFactor
  technique) instead of the flat black wash. Legibility floor: computed
  contrast check; fall back to a deeper scrim only where the sample is
  too bright.
- No photo chosen: each card type gets its OWN crafted dark-premium
  background (subtle directional gradient + one restrained accent
  geometry per type), replacing the single shared gradient. Dark,
  calm, expensive - never neon.

### 2. A visual signature per moment
- PR: the trophy card - oversized numeral with a warm amber glow
  treatment, "PERSONAL RECORD" kept, previous-best as quiet context.
  The dead zone dies: the numeral scales to balance the canvas.
- Session: clean editorial composition - session name large, ONE hero
  stat, max three quiet supporting stats. Exercise chips capped and
  redesigned as a single quiet line, not six boxes.
- Milestone: large-type editorial (the number IS the design).
- Weekly recap: calm summary card, unchanged data laws.
- Before/after: keep the structure; plates restyled to the new system.
- Unify in-card number formatting with the app law (NBSP, spaced
  units) - the current 120kg-vs-100 kg inconsistency dies.

### 3. Format system
- Story 9:16 becomes a first-class composition (content balanced
  against the photo, top 14% / bottom 20% platform-chrome safe zones),
  square 1:1 stays, portrait 4:5 wired for ALL types (the renderer
  already supports it; this resolves the open R12 question by offering
  all three with story-first defaults - founder taste call below).
- NEW: transparent STICKER export (PNG, stat block + small mark only,
  no background) for pasting onto the user's own story - the Strava
  Sticker Stats pattern, and the strongest single share-worthiness
  lever the research found.

### 4. The brand whispers
- Footer replaced by a small trailing mark: compact wordmark +
  volyume.app in one quiet line. The tagline band is dropped from
  photo cards (founder taste option: keep or drop on flat cards).
  Research: small trailing mark is the elite norm; the loud lockup is
  the anti-pattern.

### 5. Choice without clutter
- A template strip above the preview: the card types valid for this
  moment rendered as live thumbnails (the Hevy pattern), replacing
  blind segmented controls. Format row: Story / Square / Portrait /
  Sticker. Background row: My photo / Dark (per-type crafted) /
  Sticker-transparent. Existing per-type data toggles carry over
  unchanged.

## Laws inherited without exception
Every guard in the inventory's law table carries forward: brand-mark
ratios and story safe-bottom, preview-width and error-state guards,
share-target resilience, a11y selected-states, p15 unit/NBSP laws,
tonnage-units parity, read-only reachability, the greatWeek
engine-parity integration test, and the partner-win allowlist. Privacy
law: no name/bodyweight/measurements/notes on any card; the TWO
bodyweight exceptions (Pro before/after; weekly weight hero) keep
their triple-layer calm/ED withholding - and the STICKER export
inherits the Strava-precedent rule that suppressed content has NO
export path at all. Documentation debt from the 2026-07-27 audit
(CLAUDE.md Section 2 does not name the weekly weight-hero exception)
is surfaced to the founder with this spec rather than left unrecorded.

## Build plan (next session, after the C27 resume + D107-2 specs, or
## ordered ahead of them - founder's call)
- B1 renderer: per-type backgrounds, PR glow, composition rebalance,
  portrait wiring, sticker draw path. Verified via the EXISTING
  render harness (extend scripts/render-share-card.cjs; eyeball PNGs
  before any device build).
- B2 backgrounds: gallery picker, tone-sampling scrim, contrast floor.
- B3 screen UX: template strip with live thumbnails, format/background
  rows, sticker share path.
- B4 gates: guard re-pins + new pins (sticker suppression, tone-scrim
  contrast floor), full suite, device checklist (the founder walks
  real exported cards into Instagram Stories on device).

## Founder taste choices (answer with the build order)
1. Default format: story-first (recommended) or keep square-first?
2. Tagline band on flat (non-photo) cards: drop everywhere
   (recommended) or keep on flat?
3. Optional display typeface for hero numerals: would need a font
   asset decision (the 2026-07-10 unheld brand-font item) - system
   sans with weight contrast is the no-new-asset default.

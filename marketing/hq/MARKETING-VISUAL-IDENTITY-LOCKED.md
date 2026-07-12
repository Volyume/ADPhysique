# Volyume Marketing Visual Identity — LOCKED

**Status:** Governing document for every outward-facing visual asset (social,
articles, store, email, video). Locked. Any deviation is a founder decision,
made in advance, not a designer's judgement call in the moment.

**Builds on:** `docs/DESIGN_SYSTEM.md` (the app's visual identity — this
document restates the relevant tokens and rules, never contradicts them).
**Typeface source:** `docs/ux-world-class-audit-2026-07-09/BRAND-FONT-SHORTLIST.md`.
**Tone/voice source:** `marketing/hq/CLAIMS-STANDARDS.md` §8-9 — every word on
an asset is also subject to that gate; this document governs the picture, not
the licence to write generated-sounding copy on top of it.
**Language:** British English throughout, including in this document.

**The goal.** Every visual asset must look like it was made by a human
designer for a distinctive brand. It must never look like generic
AI-generated marketing. A person scrolling past should recognise a Volyume
asset before they read a single word, and nothing in it should trip the
tells that mark a generated ad: the glossy stock photo, the gradient
background, the centred hero text, the after-photo with the too-perfect
lighting. If an asset could have been produced by typing a prompt into an
image generator, it has failed, regardless of how polished it looks.

---

## 1. The core principle

**Real over generated.** Volyume's own dark, editorial restraint is the
differentiator, not a decoration on top of it. The entire fitness marketing
category is bright, hyped, and built on transformation photography — before/
afters, sweaty gym stock, neon gradients, shouting typography. Volyume wins
by being the opposite: calm, dark, editorial, data-led. This is a strategic
choice, not a taste preference, and it is inseparable from the product's own
identity (`docs/DESIGN_SYSTEM.md` — "Whoop / Linear / Stripe... a calm, dense,
exact tool").

Consistency is what reads as human. A single striking asset can be produced
by anyone, including a generator, by accident. What a generator cannot
produce is a *system*: the same palette, the same two typefaces, the same
recurring format, applied without fail across a hundred assets over a year.
That discipline is the tell of a real designer with a real brief, and it is
the whole strategy of this document. Every rule below exists to protect that
system, not to add flourish.

---

## 2. Colour

Restated from `docs/DESIGN_SYSTEM.md` §Colour Palette (`src/styles/theme.js`
is the source of truth; this document must never drift from it).

| Token | Value | Use in marketing assets |
|---|---|---|
| `background` (near-black) | `#0D0D0D` | the default canvas for nearly every asset — social tiles, article headers, video backgrounds, store screenshots' surrounding frame |
| `surface` | `#191917` | card/panel fills within an asset (e.g. the decision-card body, a quote block) |
| `surfaceElevated` | `#222220` | a nested panel inside a surface, used sparingly |
| `border` / `borderSubtle` | `#6E6E6E` / `#2E2E2C` | hairline dividers and card edges — never a decorative outline |
| `primary` (amber) | `#F5A623` | the one accent |
| `primaryFill` | `#E08C0B` | a filled amber element where a fill is unavoidable (e.g. the verdict pill), deepened so it doesn't vibrate on the near-black canvas |
| `textPrimary` | `#FFFFFF` | headlines, hero numbers |
| `textSecondary` / `textMuted` | `#9E9E9E` / `#9B9B9B` | supporting copy, captions, metadata |

**Rule: amber is an accent, used sparingly.** One or two elements per asset
carry amber, never more: a verdict pill, a single highlighted number, a
single underline or mark. Amber is never a fill covering more than a small
element, never a gradient, never a background wash, never a full-bleed
colour block. If an asset has amber everywhere, it has already lost the
restraint that makes it distinctive.

**Near-black is the default canvas** for nearly everything: social posts,
article hero images, video backgrounds, email banners, the space around
product screenshots. White or off-white canvases are permitted only where a
specific channel mechanically requires them (e.g. an email body rendered in
a client that forces a white background) and even then the Volyume elements
within stay near-black-and-amber, not colour-inverted.

**No other accent colours** are introduced anywhere in marketing without
explicit founder approval. This includes the app's own semantic colours
(`success` green, `warning` yellow, `error` red) — those are functional UI
states inside the product, not marketing decoration, and do not appear on
marketing assets. No blues, greens, pinks, purples, or "brand-adjacent"
secondary palettes. One accent, always.

---

## 3. Typography

**Two typefaces only, everywhere, forever.** More than two typefaces on a
single asset is itself a banned tell (§7).

### Display/heading face

Primary recommendation: **Schibsted Grotesk** — editorial, newsroom-bred
trust, digital-first, a quietly distinctive character that reads as
"credible and calm" rather than "app font." It fits the category-contrast
strategy: editorial is the register competitors don't occupy.

Safe fallback: **Manrope** — the app's own font shortlist leader
(`BRAND-FONT-SHORTLIST.md`), geometric with humanist warmth, verified tabular
figures. If the app itself ships Manrope as its in-product face, using it in
marketing too tightens the whole-brand consistency.

The founder confirms the final pick before it is locked into any brand kit,
template, or Canva asset (per that document's own D25 status: the app
typeface decision is still open). Until confirmed, treat Schibsted Grotesk
as the working default for new marketing assets and note in any brief that
it is provisional pending the founder's call — do not silently switch once a
pick is made; re-issue assets under the confirmed face.

### Monospace face — numbers, data, stats, captions

**All numbers, statistics, data values and captions use a monospace face.**
Recommendation: **IBM Plex Mono** (primary) or **Space Mono** (alternative) —
both free, widely available on Google Fonts, both carry real tabular figures.

This is the signature. Monospace numerals are what make a Volyume asset
instantly recognisable as Volyume before a single word is read, in exactly
the way tabular figures make the in-app numbers legible at a glance
(`docs/DESIGN_SYSTEM.md` §Numbers are content). No other fitness brand pairs
an editorial grotesk with a terminal-style monospace for its data. That
pairing, applied without exception, is the visual fingerprint.

Use monospace for: the hero number on a decision card, percentages, weights,
reps, dates, timestamps, prices, and every caption or metadata line under an
asset. Use the display face for: headlines, verdict words, body sentences.
Never swap the two roles.

### Alignment

**Left-aligned by default. Never centred blocks of text.** This applies to
headlines, body copy, captions, everything — matching the product's own
left-led, content-first layout discipline. A centred paragraph or a centred
headline stack is one of the clearest AI-marketing tells (the default output
of every template generator) and is banned outright (§7).

---

## 4. Layout

- **Asymmetric grid.** Content sits off-centre; negative space does work on
  one side of the frame. No symmetric, centred compositions.
- **Generous negative space.** Near-black canvas left open and unfilled is a
  feature, not a gap to close. Match the product's own "silence is
  deliberate" principle (`docs/DESIGN_SYSTEM.md` §Distinctive product
  principles).
- **Left-aligned, content-led.** The eye starts top-left, follows one clear
  path. No decorative elements competing with the content for attention.
- **One idea per asset.** A single number, a single claim, a single
  screenshot, a single message. Never stack multiple unrelated messages or
  data points onto one visual.

**Banned in layout:**
- Centred text on an image (the single most recognisable generic-ad tell).
- Gradient backgrounds of any kind.
- Drop shadows used decoratively (soft glows, floating-card shadows for
  effect). The product itself only uses shadow on floating temporary
  surfaces (`docs/DESIGN_SYSTEM.md` §Surface and card style) — marketing
  follows the same restraint.
- Busy compositions: more than one visual focal point, competing typographic
  sizes, decorative icons or illustrations with no informational job.

---

## 5. The signature format: the decision card

Volyume's own recurring visual unit, used across social, articles and store.
It is built directly from the product's real weekly coaching decision and
nobody else in the fitness category has an equivalent format, because
nobody else's product makes an explainable weekly change/hold call.

**Structure, every time:**

1. **A real number** — set in the monospace face, large, tabular. Always a
   genuine figure traceable to `marketing/hq/PRODUCT-FACTS.md` per the Claim
   Rule (`CLAIMS-STANDARDS.md` §2) — never an invented or illustrative number.
2. **A change/hold verdict** — a short amber pill (`primaryFill` fill, dark
   bold label, generous corner radius matching the app's `radius.full`
   pill token), one or two words: "CHANGE" or "HOLD," or the specific
   direction ("+2.5kg," "HOLD"). This is the one place a filled amber
   element is expected and correct.
3. **One plain-English reason line** — set in the display face, regular
   weight, left-aligned beneath the pill. States the reason in the product's
   own calm, plain coaching voice (no hype, no exclamation marks, no em
   dashes — `CLAIMS-STANDARDS.md` §8-9 governs the words).

**Visual treatment:** near-black canvas, a `surface`-toned card panel with a
single hairline border, generous internal padding, left-aligned throughout.
No icon, no illustration, no decorative flourish inside the card — the
number, the pill, and the reason line are the entire content.

This format recurs identically across every channel: Instagram/social tiles,
article inline graphics, App/Play Store screenshots, and email. Recurrence
without variation is the point — a reader who has seen it twice recognises
it on the third sighting without reading it.

---

## 6. Real product, always

Every asset that shows the app shows the **real app**, not a mockup drawn to
resemble it.

- Screenshots come from `marketing/hq/assets/screenshots/` — demo data only,
  never a real user's data.
- Screens `01`-`07` are for general marketing use (social, articles, ads).
  Screen `08` (`08_track_your_own_baseline.jpg`) is store-listing only.
- Screenshots are presented inside clean, pure-CSS/HTML-built device frames
  — no photographic hand-holding-a-phone renders, no stock lifestyle
  photography around the device, no glossy 3D bezel renders.
- **Real numbers over invented ones**, always. Any number appearing beside a
  screenshot or in a decision card is a genuine figure traceable to
  PRODUCT-FACTS, per the Claim Rule. If a true number isn't available for a
  given claim, the claim is omitted, not invented (`CLAIMS-STANDARDS.md`
  §2.4).

---

## 7. BANNED — the AI-spam tells

Enforced by the compliance gate (`marketing/hq/CLAIMS-STANDARDS.md` §10) on
every asset, alongside the claims checks. A visual asset containing any of
the following fails review and is returned for a redo, no borderline
allowance:

- **AI-generated imagery of any kind.** No image-generator output anywhere
  in a public asset, however polished.
- **Stock photos**, especially gym/fitness/body stock (the grinning face on
  a treadmill, the flexing silhouette, the tape-measure-on-belly shot).
- **Before/after or transformation imagery.** Also a claims ban
  (`CLAIMS-STANDARDS.md` §5) — doubly prohibited.
- **AI illustration styles**: glossy 3D renders, corporate-memphis figures,
  plasticky/rubbery character art, the generic "friendly abstract shapes"
  house style of template generators.
- **Gradient-heavy backgrounds** of any kind, decorative or not.
- **Emoji clusters.** One emoji maximum in a social caption, and only where
  the platform convention plainly expects it; none in imagery, ever
  (matches `CLAIMS-STANDARDS.md` §9.13).
- **Default Canva templates used as-is.** Canva is assembly only (§10 below)
  — a stock template with the logo swapped in is a fail.
- **Centred hero text on a photo.** Already banned under Layout; restated
  here because it is the single most common tell.
- **More than two typefaces** on any one asset.
- **Neon or multi-colour palettes.** One accent colour only (§2).
- **Grinning-stock-face energy** — forced enthusiasm, exaggerated
  expressions, anything that reads as performed rather than real.
- **Anything that looks like every other fitness ad.** The catch-all test:
  if a reviewer has seen this exact composition on a competitor's feed, it
  fails, regardless of which specific rule it breaks.

---

## 8. Video

Same identity, in motion. The rules above apply frame-by-frame; motion adds
the following:

- **Screen recordings of the real app** — actual capture of the product in
  use, demo data only, never a re-created or simulated UI.
- **Kinetic typography over near-black** — the display and monospace faces
  animating on-screen, following the same left-aligned, one-idea-at-a-time
  discipline as static assets.
- **The decision-card format, animated** — the number, pill and reason line
  can build in sequence (number first, then verdict, then reason), but the
  final held frame is identical to the static format in §5.
- **Cuts stay calm, not frenetic.** Match the product's own motion
  discipline (`docs/DESIGN_SYSTEM.md` §Motion) — deliberate pacing, no
  jump-cut hype editing, no beat-matched flash cuts.

**Banned in video**, in addition to §7:

- AI avatars or synthetic presenters.
- Generic stock or drone B-roll (gym exteriors, city skylines, anonymous
  runners at sunset).
- Morphing AI transitions (the liquid-warp, the AI-generated scene blend).
- Uncanny AI faces, in any capacity, presenter or background.

**Voice.** If a voiceover is used, it is one warm, natural UK voice, used
sparingly and only where it earns its place. Muted-autoplay video with
on-screen captions is very often the better choice for social: it avoids the
synthetic-voice tell entirely and matches how most people actually watch on
these platforms. No synthetic/AI-generated voice, ever.

---

## 9. The consistency rule

Every asset — social, article, store, email, video — uses the same palette
(§2), the same two typefaces (§3), and the same decision-card format
language (§5), applied without variation. A Volyume asset should be
recognisable as Volyume from the palette and layout alone, before any word
on it is read. This repetition is not a limitation to work around; it is the
entire strategic bet of this document. A designer or agent building a new
asset should be reaching for the same four or five components every time,
not inventing a new look for each campaign.

---

## 10. Tooling note

Canva is used for assembly, never as a source of look. Every Canva asset is
built from a Volyume-branded custom setup, never a stock template:

- A brand kit holding the locked palette (§2) — near-black canvas, surface
  tones, and amber as the one accent, with no other colours available to
  select.
- The two locked typefaces (§3) loaded as brand fonts, no others available
  in the kit.
- The device-frame components (§6) built once, reused for every screenshot
  asset.
- The decision-card template (§5) built once, reused for every asset that
  needs it, with only the number, verdict and reason line changed per use.

The aim is that Canva executes this locked system precisely — it is a layout
tool, not a design decision. Any Canva output that could have come from an
un-branded stock template, with or without the logo swapped in, has failed
this document regardless of how the individual elements were sourced.

---

**Governance.** This document is downstream of `docs/DESIGN_SYSTEM.md` and
never contradicts it; where the two ever appear to disagree, the app design
system governs and this document is corrected. This document is upstream of
every marketing visual asset; any exception (a new accent colour, a third
typeface, a departure from the decision-card format) is a founder decision,
made in advance per `CLAUDE.md` §4's no-silent-corner-cutting rule, never a
designer's or agent's call in the moment.

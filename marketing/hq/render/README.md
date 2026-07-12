# Carousel render pipeline

Code-rendered social carousel slides: pixel-perfect PNGs generated from HTML
and CSS, replacing Canva for production assets. Canva's API cannot set fonts
or draw shapes precisely to spec; this pipeline can.

**Status:** production path for carousel/social image assets.

## What is here

- `carousel.css` — the locked visual identity
  (`../MARKETING-VISUAL-IDENTITY-LOCKED.md`) implemented as a CSS design
  system: colour tokens, the two locked typefaces, the heading block, mono
  stat, decision card, mini decision card, and dot/trend/fork diagram
  components. 1080x1350 canvas, `#0D0D0D` background, amber `#F5A623`
  accent used sparingly, left-aligned throughout.
- `carousel-template.html` — a single-page renderer. It builds one slide's
  DOM from a plain JS slide-content object using only the components
  defined in `carousel.css`. New slide "kinds" belong here, matched 1:1 to
  a component already described in the locked identity doc — do not invent
  new visual language without a founder decision.
- `render-carousel.cjs` — the node script that drives Playwright + headless
  Chromium (following the same headless-render approach as
  `../../../scripts/render-share-card.cjs`) to screenshot each slide of a
  content JSON file to a numbered PNG.
- `fonts/` — Schibsted Grotesk (variable, weights 400-800) and IBM Plex
  Mono (400/500/600/700), downloaded once from Google Fonts as woff2 and
  referenced locally via `@font-face` in `carousel.css`. Rendering never
  hits the network — offline and deterministic.
- `assets/volyume-wordmark.png` — copy of `../../../assets/volyume-wordmark.png`,
  used as-is (no recolouring) in the slide footer per §6 of the identity
  doc.
- `carousel-1.json` — Carousel 1's six slides
  ("When should you actually change your calories?"), encoded from
  `../copy-library/social/week-1-carousels.md`.
- `out/` — rendered PNG output, one subfolder per carousel.

## How the weekly cycle calls this

```
node render-carousel.cjs <content.json> <outDir>
```

- `<content.json>` is either a bare array of slide objects, or an object
  with a `slides` array (see `carousel-1.json` for the shape: `heading`,
  `supporting`, optional `headingAmber`, `monoStat`, `diagram`,
  `decisionCard`, `miniCard`).
- `<outDir>` defaults to `./out` if omitted.
- Output is `slide-01.png`, `slide-02.png`, ... in slide order, each
  1080x1350.

Example (what was run to produce `out/carousel-1/`):

```
node render-carousel.cjs carousel-1.json out/carousel-1
```

Playwright is not a repo dependency (per `CLAUDE.md`'s "never add
dependencies without asking") — it is a global install in this
environment at `/opt/node22/lib/node_modules/playwright`, with Chromium
preinstalled at `/opt/pw-browsers/chromium`. `render-carousel.cjs` resolves
it from that path if a local `node_modules/playwright` is not present. If
this pipeline is run in a different environment, either install Playwright
locally (ask the founder first, per the dependency rule) or ensure the
same global install and `PLAYWRIGHT_BROWSERS_PATH` are available.

Content JSON files are written from the gated copy in
`../copy-library/social/*.md` — copy is only lightly trimmed for slide fit,
never rewritten with new claims, and every asset still needs a
compliance-reviewer PASS on record (`../CLAIMS-STANDARDS.md` §10) before it
publishes, same as any other outward asset.

## Canva

Canva remains available for ad-hoc, one-off assembly only. Any asset that
will run as part of a content batch, a recurring format (the decision
card, dot/trend diagrams, carousel covers), or anything needing exact font
rendering or drawn shapes goes through this pipeline instead.

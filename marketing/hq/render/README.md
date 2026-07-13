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

## Reels (9:16 motion)

`render-reel.cjs` is the motion counterpart to the still pipeline: it takes
the same content JSON shape and produces a Reels-ready 1080x1920, 30fps,
H.264 MP4 that animates the slides as one calm sequence (kinetic typography
per §8 of the identity doc). `reel.css` re-lays the identity out for 9:16
(it imports `carousel.css`, so palette and fonts have one source of truth)
and `reel-template.html` drives deterministic frame-by-frame animation via
`window.__seek(tMs)` — same input, same output, every run.

```
node render-reel.cjs <content.json> <out.mp4>
```

- Each slide becomes a ~3.5s scene with a gentle cross-fade; six slides
  give a ~21s reel.
- Output is SILENT by design. Music or voice is added at post/upload time
  on the platform, where trending audio actually helps distribution —
  never baked into the file.
- ffmpeg is not a repo dependency: on first run the script downloads a
  static linux build to `bin/ffmpeg` (gitignored) and sanity-checks it.
- Example (what produced `out/reel-1/reel-1.mp4`):
  `node render-reel.cjs carousel-1.json out/reel-1/reel-1.mp4`

## Publishing to the dashboard (`publish-previews.cjs`)

The render output is not the finish line — the founder reviews and posts from
the HQ dashboard, so every rendered item must be wired into it. That is one
codified step, never a hand edit:

```
node publish-previews.cjs \
  --id <marketing_content row uuid> \
  --slug <kebab-case, e.g. week2-p1> \
  --carousel out/week2-p1 \
  --reel out/reel-week2-p1/reel-week2-p1.mp4 \
  --caption-file <path to caption text> \
  --hashtags "#one #two #three"
```

It copies the slides and reel into
`../../../web/apps/web/public/marketing-previews/<slug>/` (served by the
dashboard itself — no external bucket, no Vercel/Supabase sign-in wall between
the founder and the file) and prints an idempotent `update marketing_content
... compliance_record || '{...}'::jsonb` statement. The pipeline (the
`marketing-weekly` skill, step 6b) runs that SQL through the Supabase MCP to
set `preview_assets`, `caption` and `hashtags` on the row. The dashboard
content page reads those and renders a playable video, a slide gallery,
per-file download links, and copy buttons for the caption and hashtags.

`--carousel` and `--reel` are each optional (reel-only or carousel-only items
are fine) but at least one is required. The script writes nothing to the
database itself; it only moves files and prints SQL, so it is safe to re-run.
Commit the staged `public/marketing-previews/<slug>/` files — they deploy with
the app.

## Canva

Canva remains available for ad-hoc, one-off assembly only. Any asset that
will run as part of a content batch, a recurring format (the decision
card, dot/trend diagrams, carousel covers), or anything needing exact font
rendering or drawn shapes goes through this pipeline instead.

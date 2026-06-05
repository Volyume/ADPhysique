# Web platform — Phase 5: design standards (all three interfaces)

Status: COMPLETE | Date: 2026-06-05 | Depends on: Phase 0 (identity), Phase 2
(references). Binding for every screen proposal in Phase 6.

The rule from Phase 0: the web is the **same instrument on a bigger screen**, not
a new look. The references that already match Volyume's identity (Whoop for data,
Linear/Stripe for tooling, Phase 2) are the bar. Nothing here may contradict
`src/styles/theme.js` or `docs/DESIGN_SYSTEM.md`.

---

## 1. Volyume web design language

### What stays identical (brand fidelity)
- The **exact palette** (`#0D0D0D` base, the elevation ladder, amber
  `#F5A623`/`#E08C0B`, the semantic + text tokens) and the **accessibility
  swaps**. Ported verbatim to the web token library (Phase 4).
- The **`type` scale and roles**, weight discipline, and **tabular numerals on
  every data value** (`font-variant-numeric: tabular-nums`). One `display`
  element per view.
- **Amber-only accent discipline.** Amber on primary actions, active nav, key
  data only; everything else achromatic. No decorative gradients/orbs/glows;
  gradient only as functional data encoding (volume MEV→MAV→MRV).
- **Dark-only.** No light theme (see §4 for the one nuance).
- The **voice** (British English, no em dashes, no AI tells, data before
  description, no filler, no emoji in functional UI), identical on web.
- Depth from the **tonal ladder, not shadows** (shadows only on floating
  transient surfaces: menus, toasts, command palette).

### Where web is richer than mobile (earned, not decorative)
- **Larger data canvases**: multi-series charts, long time windows, a full-size
  body heatmap, sortable/filterable tables, side-by-side comparison, all
  impossible on a phone and the user web's reason to exist (Phase 3).
- **Hover + focus states**: hover reveals a data point's exact value/tooltip;
  visible focus rings (amber, `primary`) for keyboard users. Mobile has neither.
- **Keyboard**: command palette + shortcuts (admin especially), per the
  Linear/Stripe standard (Phase 2 B).
- **Denser layouts**: multi-column grids where the data relates, the desktop
  affords more without clutter, governed by "hierarchy through contrast".

### What must never appear (anti-AI / anti-template, Phase 0 §A6)
- Off-the-shelf component kits shipped as-is (default shadcn/MUI/Chakra look).
- Three-card dashboards with parallel CTAs added to balance a page; 2×2 stat
  grids by symmetry; decorative icons on every row; hero gradients/orbs;
  centred-feature carousels with dots; "coming soon" placeholders; checkmark-
  bullet walls. Generic SaaS-template chrome of any kind.
- The test (Phase 0): would a lifter who built this for themselves choose it?

---

## 2. Interface-specific standards

### User web (`app.volyume.app`) — premium consumer instrument
Data-rich, calm, identical in feel to the mobile app. The logged-in surface is a
**precision cockpit**: a hero number/state, trend, drill-down (Whoop's
progressive disclosure). The logged-out landing is the one place a touch more
"product marketing" is allowed, but still in voice (no hype, no AI tells), it
must read as the same brand, not a generic SaaS splash.

### Admin (`admin.volyume.app`) — Linear-grade ops tool
Functional, fast, information-dense but not cluttered. **5-9 core elements per
view**, progressive disclosure, everything one click away but never in your face
(Stripe pattern, Phase 2 B). Keyboard/command-palette first. Sub-100ms-feeling
interactions (speed is design). Same dark palette; density higher than the
consumer app; tone purely functional.

### B2B coach (`coaches.volyume.app`) — professional, trust-inspiring, learnable
Same instrument, tuned for a coach who is not heavily technical: clear primary
actions, an unmistakable client list, triage surfaced (who needs attention),
nothing sluggish or buggy (the explicit competitor failing, Phase 2 C). Premium
and authoritative, it represents the coach's business to their clients. The
client-facing experience is the full Volyume app (already best-in-class).

---

## 3. Typography on web

- Same `type` roles. Map mobile px → web with a fluid scale: body 16px (the
  premium body size already chosen), `display` up to ~48-56px on wide viewports
  (one per view), headings via `clamp()` so they breathe on desktop without
  breaking the ramp. Negative tracking on display/headings only; positive on
  labels/captions; emphasis by weight/colour, never italic/underline.
- **Line length**: cap running copy at ~64-72ch for readability (desktop's main
  typographic risk is over-wide lines). Data tables ignore this (they are
  tabular, not prose).
- System font stack (SF/Roboto/Segoe) matching mobile; Inter remains the
  deferred optional upgrade and, if adopted, applies to web first.

---

## 4. Colour on web

- **Dark-first for all three** (brand-locked, Phase 0). No light theme at launch.
- **One nuance, the logged-out marketing/landing** may use the dark palette with
  more generous whitespace and larger type, but stays `#0D0D0D` + amber, it is
  not a light page. (If a light variant is ever wanted for, say, a printable
  report, it is a contained export style, not a theme.)
- **Web-specific tokens derived from the palette** (not invented colours):
  - Hover: a +1 step on the elevation ladder (`surface`→`surfaceElevated`), or a
    `withAlpha(primary, 0.08)` wash on interactive rows.
  - Focus ring: `primary` (`#F5A623`), 2px, offset, visible (WCAG 2.4.7).
  - Selection/active: `primaryBg` (`rgba(245,166,35,0.12)`).
  - Data-viz: the existing chart tokens (`chartLine`, `chartFill`) + the volume
    band mapping (`volumeStatusColor`) + the colour-blind-safe swaps. No new
    chart palette is introduced.

---

## 5. Data visualisation standards

- **Reuse the mobile chart language exactly**: amber line + faint amber fill,
  tabular axis labels, `paddedDomain`/`plotPoints` geometry. On web this is the
  shared `chartGeometry.js` rendered as **SVG** (Phase 4); optionally `visx` for
  richer interaction, never a lib that imposes its own look.
- **Conventions**: one accent series in amber; secondary/comparison series in a
  muted neutral (never a second bright hue, accent discipline). Volume uses the
  green→amber→red band (the one sanctioned functional gradient). Every value
  label tabular. Hover tooltips show the exact figure + date.
- **Progressive disclosure**: headline figure first, trend second, full detail on
  interaction (Whoop/Stripe). Never a wall of competing charts (Phase 2 B/D).

---

## 6. Copy and tone for web

- **User web**: the mobile voice unchanged, direct, precise, data before
  description, British English, no em dashes, no AI tells, no emoji, no filler.
  Precision Coaching™ branding consistent.
- **Admin**: functional and terse, labels and verbs, no marketing voice at all
  ("Suspend account", "Send to 1,240 inactive users", "Delivery 92%").
- **B2B**: professional and authoritative, clear and reassuring for a non-
  technical coach, never hype. ("12 clients need attention", "Assign plan",
  "Sarah hasn't logged in 6 days").
- The banned-jargon and anti-AI rules from `CLAUDE.md` apply to **every string in
  all three interfaces**, identical to mobile. (The 2026-06-05 copy audit that
  cleaned the mobile app is the standard the web must meet from line one.)

---

## 7. Implementation guardrails (mirror the mobile CI rules)
1. All colours/spacing/type from the web token library, never raw hex/px/
   font literals (port the mobile CI guards to the web repo).
2. `Card`/`Button`/`PressableCard` primitives; no hand-rolled surfaces.
3. `prefers-reduced-motion` gates every animation (mirror the mobile rule).
4. Every data value uses the tabular-numeral utility.
5. Check this document + Phase 0 before adding any UI; resolve conflicts at
   design level before code.

Next: Phase 6a — user web application, screen-by-screen proposal (presented for
approval before Phase 6b).

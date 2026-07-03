# S2 — The BEST Way to Share TWO Progress Photos in ONE Share

**Scope.** ONE focused execution question for the **founder-approved** two-photo
before/after card (§3.8): given two photos + each date + bodyweight-per-photo +
elapsed time + wordmark, calm register, Pro-gated, ED/calm-withheld,
exported through the existing **Skia → expo-sharing → expo-media-library**
pipeline — what MECHANISM should the share use, across every surface and
platform? Not *whether* to build it (decided), and not the layout/composition
craft (settled in `S1-sharecard-execution-growth.md`). This picks the
**delivery mechanism** and hardens the export.

**Builds on, does not repeat:** S1 (layout, stat placement, aspect-ratio set,
growth loop) and `_FRAMEWORK-AND-SPEC.md` §3.8 + PART 2 safety. Read those
first; S2 assumes them.

**Evidence tags.** `[OBSERVED]` = product/reviews/community use; `[DOCUMENTED]`
= vendor/help/spec/code; `[INFERRED]` = engineering/design reasoning onto
VOLYUME. URLs inline; full list at end.

---

## THE HEADLINE (one sentence)

**Every surface and every platform produces the SAME artefact: ONE composited
PNG with both photos, both dates, both weights, the elapsed badge and the
wordmark drawn into it — shared as a single file.** Multi-attach, animation and
"story-native as a different asset" are all rejected; the reasons are below and
several are hard technical constraints, not preferences.

---

## 1. THE DECIDING CONSTRAINT — the existing pipeline only ships ONE file

Before comparing mechanisms on taste, one fact removes most of the field:

- **`Sharing.shareAsync(url, options)` takes a SINGLE local file URL.** The Expo
  doc defines the parameter literally as *"Local file URL to share"* — one URL,
  one file. There is no multi-URI form. `[DOCUMENTED]`
  (https://docs.expo.dev/versions/latest/sdk/sharing/)
- VOLYUME's live code uses exactly this — `Sharing.shareAsync` on the single
  encoded PNG (`ShareCardScreen.js:307-330`, confirmed in S1 A0). `[DOCUMENTED:
  code]`
- Sharing **two** raw files would need `ACTION_SEND_MULTIPLE` (Android) /
  `UIActivityViewController` with an array (iOS) — i.e. a **different, new
  sharing dependency** (e.g. `react-native-share`). CLAUDE.md §2: *"Never add
  dependencies without asking."* And S1 A0's whole finding is *"no new
  dependency, no new renderer."* `[DOCUMENTED: CLAUDE.md]`

So the multi-attach mechanism is not merely worse — **it is not reachable from
the sanctioned pipeline at all.** That alone settles it. Everything below
explains why that constraint happens to point at the right answer anyway.

---

## 2. MECHANISM COMPARISON (the four candidates)

### (a) Composited SINGLE IMAGE — the two photos drawn into one card ✅ WINNER

The Skia renderer draws both `SkImage`s, both caption plates, the elapsed badge
and the footer onto **one** offscreen surface, encodes **one** PNG, shares
**one** file. This is exactly the S1 build. Sub-variants, judged as an exported
still:

- **Side-by-side two-up** — the default (S1 A1). Reads as *change in one
  glance*, is the native language of r/progresspics and the MacroFactor/MFP
  builders, and is the **least dramatic** framing (no reveal). `[DOCUMENTED /
  OBSERVED, S1]`
- **Stacked / vertical** — the 9:16 story composition only (two portraits each
  get a landscape-ish cell). `[INFERRED, S1 A1]`
- **Slider frozen at a divider** — rejected as an export: a frozen wipe reads as
  one mis-registered photo with a mysterious seam, and it is the most
  transformation-coded format. `[INFERRED, S1 A1]` Note the slider stays a
  *live interactive comparison view inside the app* (`_FRAMEWORK` §3.6); it just
  never becomes the shared artefact.

**Why it wins beyond the pipeline constraint:** it is the only mechanism that
**carries the dates, weights, elapsed time and wordmark with the image.** Those
are burned into the pixels, so they survive every recompression, reshare,
screenshot and download-and-repost. The whole growth loop (S1 B7) depends on
the wordmark travelling *inside* the picture; only a composite guarantees that.

### (b) Multi-image share intent — attach the two RAW photos as two files ❌

- **Not reachable** from `expo-sharing` (§1). `[DOCUMENTED]`
- Even with a new dependency, it **loses everything that is not a photo**: dates,
  weights, elapsed badge and wordmark are metadata/overlays that simply don't
  exist on two raw JPEGs. The card's entire point evaporates. `[INFERRED]`
- **Receiving apps render two attachments inconsistently and usually worse:**
  - **iMessage / WhatsApp / DM** show two **separate bubbles / thumbnails** in
    arrival order — no guaranteed side-by-side, no shared caption, the viewer
    scrolls between two loose images. `[INFERRED from platform behaviour]`
  - **Instagram flatly rejects share-intent images that don't match its rules** —
    the documented failure is *"Couldn't share to Instagram. You can only share
    multiple photos and videos in the Instagram app."* Multi-file intents to IG
    are unreliable and often bounce the user into IG's own picker, breaking the
    flow. `[DOCUMENTED]`
    (https://github.com/react-native-share/react-native-share/issues/1442)
  - A **carousel** (two swipeable slides) only exists if the user manually builds
    it *inside* Instagram — you cannot hand IG a finished carousel via a share
    intent. `[DOCUMENTED, IG behaviour]` And a carousel is a *transformation
    swipe* ("before" slide → "after" slide), the exact reveal register S1/E1
    forbid. `[DOCUMENTED / INFERRED]`
    (https://mergeimages.net/blog/instagram-carousel-vs-single-post)

  **Confirmed:** multi-attach loses dates/branding and reads worse. It is
  rejected on availability, on content-loss, and on inconsistent rendering.

### (c) Animated A/B toggle (GIF / short MP4) ❌ RULED OUT

- **Feasibility:** poor within the sanctioned stack — Skia here encodes a still
  PNG (`encodeToBase64`, S1 A0); GIF/MP4 assembly means a **new encoder
  dependency** and video export path. `[DOCUMENTED: code + CLAUDE.md deps rule]`
- **Register:** a toggling/wiping before→after loop **IS the "transformation
  reel"** — the single most ED-harmful physique format. The literature is
  explicit that two time-point images animated as a reveal keep *"the spotlight
  exactly where eating disorders love it: on the body,"* drive body-checking and
  comparison, and predict body dissatisfaction and negative mood. `[DOCUMENTED]`
  (https://emilyprogram.com/blog/the-problem-with-before-and-after-photos/ ,
  https://firststepsed.co.uk/blog/why-before-and-after-photos-can-be-harmful-in-eating-disorder-recovery/)
- This collides head-on with `_FRAMEWORK` PART 2 and E1 §2.4 (no transformation
  reveals). **Ruled out on safety before feasibility even matters.** `[DOCUMENTED]`

### (d) Story-native two-panel (9:16 stacked) — a FORMAT, not a mechanism ✅

This is **not a fourth mechanism** — it is mechanism (a) at a different aspect
ratio, and it already exists in the system (`H = W*16/9`, S1 A5). Two portraits
stacked in one 9:16 composite, shared as one PNG via the existing
share-sheet-to-Stories route (`handleShareToStories`, `ShareCardScreen.js:307`).
Keep it, produce it as a composite exactly like square/4:5. It is an *offered
format of the winner*, so it inherits every advantage of (a). `[DOCUMENTED: code
+ S1 A5]`

---

## 3. RECOMMENDATION TABLE — mechanism × surface × platform → produce

Every cell resolves to **one composited PNG, shared as one file.** The only
thing that varies is the **aspect-ratio preset** (all three are composites; all
side-by-side except story = stacked, per S1 A5).

| VOLYUME surface | User's likely destination | Produce | Aspect preset | Mechanism |
|---|---|---|---|---|
| **(i) Dedicated before/after card** (`BeforeAfterShareSheet`) | any | composited PNG → share-sheet | **Square 1:1 default**; offer 4:5 + 9:16 | single image (a) |
| **(ii) Ad-hoc "Share" from the comparison view** | any | the SAME composited card (never the raw pair) | inherit the card's chosen preset (default square) | single image (a) |
| **(iii) Single-photo viewer share** | any | composited **single-photo** card (one photo + its date/weight + wordmark) — NOT two photos, NOT a raw file | Square 1:1 | single image (a) |

| Destination platform | Best artefact | Aspect | Platform note |
|---|---|---|---|
| **Instagram feed** | 1 composited PNG | 4:5 (1080×1350); grid crops 3:4 → keep content centred | never hand IG a carousel via intent; the composite IS the post `[DOCUMENTED, S1 A5/B8]` |
| **Instagram / FB Stories** | 1 composited PNG (stacked) | 9:16 (1080×1920) | existing `handleShareToStories` route, no FB App ID `[DOCUMENTED, code]` |
| **Reddit r/progresspics, r/bodybuilding** | 1 composited PNG | square 1:1 or 4:5 (both accepted) | side-by-side IS the native format; on-image dates/weights/elapsed align with the standardized title `[DOCUMENTED, S1 B8]` |
| **WhatsApp / iMessage / DM (send to coach/friend)** | 1 composited PNG | square 1:1 (travels everywhere) | the dominant *private* use; one image = one clean bubble, dates+branding intact vs two loose bubbles `[DOCUMENTED / INFERRED]` |
| **X** | 1 composited PNG | square 1:1 or 4:5 | single-image post; inline preview shows the whole card `[INFERRED]` |

**Reading of the table:** the mechanism column is constant. There is no
platform, and no in-app surface, for which loose multi-attach or an animation
beats the single composite. Surface (iii) is the only nuance — it composites
**one** photo, not two, but still as a branded card, never a raw file dump.

---

## 4. WHY THE COMPOSITED SINGLE IMAGE WINS (consolidated)

1. **It is the only mechanism the sanctioned pipeline supports** —
   `shareAsync` = one file (§1). `[DOCUMENTED]`
2. **It is the only mechanism that carries the non-photo payload** — dates,
   weights, elapsed badge, wordmark live in the pixels or nowhere. `[INFERRED]`
3. **It renders identically everywhere** — one PNG is one PNG on IG, Reddit,
   WhatsApp, iMessage and X; two attachments render three different wrong ways
   (separate bubbles, IG rejection, manual carousel). `[DOCUMENTED / INFERRED]`
4. **It is the calmest framing** — a static side-by-side is the least dramatic
   of all options; the rejected ones (frozen slider, GIF toggle, IG carousel)
   are precisely the transformation-reveal formats E1/PART 2 forbid.
   `[DOCUMENTED]`
5. **It powers the growth loop** — the wordmark only travels on reshare if it is
   *inside* the image; a composite guarantees that, loose files never do.
   `[OBSERVED, S1 B7]`
6. **WYSIWYG** — the same Skia code draws the preview and the export (S1 A0), so
   the user shares exactly what they confirmed. `[DOCUMENTED: code]`

---

## 5. EXCEPTIONS — where anything other than "one composite" applies

- **None for the SHARED artefact.** Every share, every surface, every platform =
  one composited PNG. There is no sanctioned exception.
- **Not a share, but adjacent — "Save to Photos":** `MediaLibrary.saveToLibrary`
  also saves the **single composited PNG** (S1 A0), not the two originals. If a
  user wants the raw originals in their camera roll they already have them from
  capture — the card feature never exports loose files.
- **In-app only (never shared):** the live before/after **slider** and
  **onion-skin overlay** (`_FRAMEWORK` §3.6) are interactive comparison views.
  They are mechanisms for *looking*, never for *sharing*; the share affordance on
  those views produces the composite (surface ii). No frozen-slider export.
- **Surface (iii) single-photo share:** composites ONE photo into a branded card
  — a deliberate, minor divergence from "two photos", still a single composite,
  still never a raw file.

---

## 6. CONCRETE ADDITIONS TO THE B4 BUILD (beyond S1)

S1 already specifies the layout, the three aspect presets and the stat
placement. S2 adds the **mechanism guarantees and the export robustness** B4
must implement:

**Mechanism guarantees (make them structural, not incidental):**
- B4's export path calls `Sharing.shareAsync` / `MediaLibrary.saveToLibraryAsync`
  on **exactly one** encoded PNG — same as the existing card. No
  `ACTION_SEND_MULTIPLE`, no second file, no new share dependency. `[per §1]`
- Aspect-ratio set to ship: **square 1:1 (default) · portrait 4:5 · story 9:16**;
  square/4:5 = side-by-side, story = **stacked** (the one-line `cardHeight`
  additions from S1 A5). The story variant is a *composite preset*, produced the
  same way as the others — not a separate multi-attach path.
- Comparison-view "Share" (surface ii) and single-photo-viewer "Share" (surface
  iii) both route into the **same** `drawProgress` composite — never a raw-photo
  share. Surface (iii) uses a one-photo layout of the same card.

**Robustness guards (the two-photo failure modes — new vs the one-photo card):**
Because this card decodes **two** user photos into `SkImage`s (vs one today), it
has failure modes the current card doesn't. Guard each:
1. **Missing / undecodable photo.** If either
   `Skia.Image.MakeImageFromEncoded` returns null (deleted file, corrupt JPEG,
   read failure), the two-photo composite **must not** render a blank/black cell
   and must not throw into the share sheet. Guard: verify **both** `SkImage`s are
   non-null *before* compositing; if either fails, abort with a calm toast
   (*"That photo could not be opened"*, house `components/Toast`, per CLAUDE.md
   error convention) and do not open the share sheet. `[INFERRED: code pattern]`
2. **Mismatched aspect / portrait vs landscape.** Two photos of different
   dimensions must still fill **identical cells** — `drawImageCover` centre-crops
   both to the same cell (S1 A4), so mismatch never produces unequal cells; add
   a test asserting both cells receive identical `dst` rects regardless of source
   aspect. `[INFERRED]`
3. **Decode / memory pressure (two full-res JPEGs at once).** Two large captures
   decoded simultaneously roughly **doubles** peak memory vs the current card —
   the `_FRAMEWORK` "bounded decode" rule (§3.4) applies here too. Guard: draw
   into the fixed 1080-wide design space and let `drawImageCover` scale down;
   don't hold two full-res bitmaps longer than the single `drawProgress` pass;
   release/scope the `SkImage`s to the render. Reliability is the #1 churn driver
   in this category (`_FRAMEWORK` §1.1.6), so this guard is load-bearing.
   `[INFERRED / DOCUMENTED: _FRAMEWORK]`
4. **Encode failure.** If `encodeToBase64` returns empty (offscreen surface
   failure), abort with a calm toast and telemetry (`logError('ProgressCard.export',
   …)`), never share an empty/partial file. `[INFERRED: code convention]`
5. **ED/calm suppression is a hard gate BEFORE any of this.** Per §3.8 the whole
   card is **withheld** under open-ED-flag OR calm mode (fail-closed) — the
   suppression check must sit *ahead* of compose/encode/share so a suppressed
   user never reaches the two-photo export at all. `[DOCUMENTED: _FRAMEWORK §3.8
   + PART 2]`

**Net for B4:** the build is unchanged in *what it draws* (S1) and gains a
**single-file export contract** plus a **two-image robustness pass** (both
`SkImage`s validated, identical cells, bounded decode, calm-abort on any
failure) that the one-photo card never needed.

---

## SOURCES

- VOLYUME research (build on): `research/progress-photos/S1-sharecard-execution-growth.md`,
  `research/progress-photos/_FRAMEWORK-AND-SPEC.md` (§3.6, §3.8, PART 2),
  `CLAUDE.md` (no-new-deps; ED-safety; share-card rules).
- VOLYUME code (per S1 A0): `src/screens/ShareCardScreen.js` (`shareAsync`,
  `handleShareToStories`, `saveToLibraryAsync`), `src/lib/shareCard/drawShareCard.js`.
- Expo Sharing — `shareAsync(url, options)`, *"Local file URL to share"* (one
  file): https://docs.expo.dev/versions/latest/sdk/sharing/
- Instagram rejects mismatched share intents — *"You can only share multiple
  photos and videos in the Instagram app"*:
  https://github.com/react-native-share/react-native-share/issues/1442
- Android multi-file sharing needs `ACTION_SEND_MULTIPLE` (a different intent /
  dependency): https://developer.android.com/training/sharing/send
- Instagram carousel = swipeable slides built inside IG, not shippable via
  intent; carousel = a before→after reveal:
  https://mergeimages.net/blog/instagram-carousel-vs-single-post ,
  https://metricool.com/instagram-carousels/
- Before/after & transformation-reel ED harm (rules out animated A/B):
  https://emilyprogram.com/blog/the-problem-with-before-and-after-photos/ ,
  https://firststepsed.co.uk/blog/why-before-and-after-photos-can-be-harmful-in-eating-disorder-recovery/ ,
  https://www.tandfonline.com/doi/full/10.1080/2159676X.2020.1836511
- Instagram 2026 aspect ratios (feed 4:5, grid crop 3:4, square 1:1, story 9:16)
  — see S1 A5/B8 sources (Buffer, HeyOrca).

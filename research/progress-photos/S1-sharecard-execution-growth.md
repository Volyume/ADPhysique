# S1 — Two-Photo Progress Share Card: Execution & Shareability-as-Growth

**Scope.** The best EXECUTION and GROWTH-LOOP design for a **founder-approved**
two-photo before/after PROGRESS SHARE CARD in VOLYUME (calm, premium, ED-safe
physique app). This card is decided — the research is *how to build it well*,
never *whether* to build it.

**Decided contents (premium-ised below, not relitigated).** Two photos · each
photo's DATE · bodyweight-at-each-photo · elapsed time ("14 weeks") · the
Volyume wordmark. Register: neutral, progress/date-led, never
transformation-culture hype, never shame.

**Method.** Read VOLYUME's live Skia share-card system
(`src/lib/shareCard/drawShareCard.js`, `src/screens/ShareCardScreen.js`), its
design tokens (`src/styles/theme.js`), the E15 materials policy, and the sibling
comparison-UX research (`M1-comparison-ux.md`); then mined real
fitness/physique products and platform specs for premium-vs-cheap tells and the
reshare growth loop.

**Evidence tags.** `[OBSERVED]` = seen in product/reviews/community use;
`[DOCUMENTED]` = stated in a vendor/help/spec page; `[INFERRED]` =
design/engineering reasoning mapped onto VOLYUME's code. URLs inline; full list
at end.

---

## 0. FOUNDER-DECISION DEPENDENCY — surfaced, not parked (READ FIRST)

This is flagged per the no-silent-corner-cutting rule; it is **not** a
relitigation of the card's contents.

**Bodyweight-on-a-share-image contradicts a currently-locked rule.** Two live
constraints say the opposite of what this card does:

- `CLAUDE.md` (GDPR / data-minimisation): *"share cards never include
  name/bodyweight/measurements/private notes."*
- `ShareCardScreen.js:479` prints this to the user today: *"Name, bodyweight,
  measurements and private notes are never included."*
- `M1-comparison-ux.md` (the sibling research) states as a rule: *"no
  weight/measurement burned into a share image (share-card rule)."*

The founder has decided this card **does** show bodyweight. That is a legitimate,
explicit exception — but it must be **recorded as a decision** (a
`docs/decisions-*.md` entry) and **reconciled in code**, because right now the
card and the app's own printed promise conflict. Recommended reconciliation
(safe, consistent with existing patterns — not a downgrade of the feature):

1. **Weight is a toggle, defaulted ON** (contents are decided-in), exactly like
   the weekly recap's `showProgress` switch (`ShareCardScreen.js:91`). A user
   who wants photos+dates+elapsed-only can drop the numbers.
2. **Force-stripped under `suppress`** (open ED flag OR calm mode), reusing the
   *exact* mechanism the weekly recap already uses (`ShareCardScreen.js:90-91`,
   `greatWeek.js`): under suppress the weights vanish and the toggle is hidden;
   the neutral photos + dates + elapsed still render. This keeps the ED-safety
   guarantee tier-blind and fail-safe. `[INFERRED]`
3. **Card-specific privacy note.** Replace the "bodyweight … never included"
   line for this card type with: *"Only the two photos, their dates, weights and
   elapsed time you chose are included. Your name, measurements and private
   notes are never included."*
4. **Name/measurements stay banned.** The exception is bodyweight only.

**One founder micro-decision remains (do not pre-decide):** under an open ED
flag, should the card **strip the weights** (recommended, matches weekly recap)
or **be withheld entirely** (a body photo + numbers is more body-checking-coded
than a stats card)? Surface both; let the founder choose.

---

## PART A — EXECUTION

### A0. The house system this card must join (confirmed by reading the code)

The task's description of the mechanism is **correct**. Verified in
`src/screens/ShareCardScreen.js` + `src/lib/shareCard/drawShareCard.js`:

- **One Skia renderer for preview AND export** — `drawShareCard()` draws onto an
  offscreen `Skia.Surface.MakeOffscreen`, `encodeToBase64()`; the same code path
  feeds the on-screen `<Image>` preview and the 1080-px PNG, so what you see is
  what you share (`ShareCardScreen.js:216-267`). A new card is a new
  `cardType`/`drawX()` branch in `drawShareCard()` (`drawShareCard.js:494-506`) —
  **no new dependency, no new renderer.** `[DOCUMENTED: code]`
- **Shares via `expo-sharing`** (`Sharing.shareAsync`, share-sheet route to
  IG/FB Stories, `ShareCardScreen.js:307-330`); **saves via `expo-media-library`**
  (`MediaLibrary.saveToLibraryAsync`, `:272-297`). `[DOCUMENTED: code]`
- **Already draws user photos as `SkImages`.** `takeGymPhoto()` reads a camera
  capture to base64 → `Skia.Image.MakeImageFromEncoded` → `bgPhoto`
  (`ShareCardScreen.js:231-248`); `drawImageCover()` renders it object-fit-cover,
  centre-crop, with a near-black scrim for legibility
  (`drawShareCard.js:132-157`). **This is exactly the primitive the two-photo
  card needs, twice.** `[DOCUMENTED: code]`

**House conventions the new card MUST match** (all from `drawShareCard.js`):

| Convention | Value in code | Where |
|---|---|---|
| Design space | 1080-wide, everything `* s` where `s = W/1080` | `:499` |
| Aspect | square `H=W`; story `H=W*16/9` (default `'square'`) | `cardHeight` `:481`; `ShareCardScreen.js:79` |
| Outer padding | `pad = round(W*0.074)` (≈80px @1080) | `:251,322,361,409` |
| Top signature | 8-px amber accent bar full-width | `drawAccentBar` `:159` |
| Background | vertical near-black gradient (`bg1→bg0→bg2`); photo-cover + scrim when a photo is the background | `drawBackground` `:141-157` |
| Card radius | 16 `* s` on plates/boxes | `:212,306` |
| Footer brand | centred wordmark (~logo, not stamp) + `SMARTER TRAINING` amber tagline + amber underline; `volyume.app` on story only | `drawFooter` `:163-187` |
| Palette (whitelisted offline canvas) | bg0 `#0D0D0D`, accent `#F5A623`, gold `#FFD700`, text `#FFF`, textSecondary `#9E9E9E`, border `#343431`, divider `rgba(255,255,255,0.06)` | `PALETTE` `:31-37` |
| Type | system typeface (regular+bold), **measured** with `measure()`; `fitFont()` shrink-to-fit; `wrapText()` greedy wrap | `:54-127` |
| Photo scrim | `rgba(bg0, 0.62)` over cover-fit image | `:146` |

The `PALETTE` intentionally mirrors `theme.js` tokens (`accent`=`colors.primary`
`#F5A623`, `gold`=`colors.gold`, `bg0`=`colors.background`), so the card reads as
the same product. `[DOCUMENTED: code + theme.js:36,49,96]`

**E15 relevance = restraint.** The materials policy (`theme.js:9-25`) allows
**exactly one** Skia glow in the whole app (Home Start button); *no other bloom,
gradient orb or glow is permitted.* So the progress card gets **no glow, no
bloom** — depth comes from the surface ladder + hairline borders + the photo
scrims only. Rolling numbers / count-up motion (E15) are irrelevant to a static
exported PNG. This is a feature, not a limitation: restraint is the premium tell
here. `[DOCUMENTED: theme.js:9-25]`

---

### A1. Two-photo layout for a STATIC EXPORTED image

Three candidates, judged as an **exported still** (the slider's whole appeal —
dragging — is gone once it's a PNG):

- **Side-by-side (two-up).** Both photos visible at once, equal cells, a hairline
  gutter. `[INFERRED]` **This is the strongest default.** It is the native
  language of the destination: MacroFactor's builder composites two photos
  `[DOCUMENTED]`, MFP builds a "side-by-side" `[DOCUMENTED]`, and r/progresspics
  is overwhelmingly side-by-side collages `[OBSERVED]`. A viewer reads *change*
  in one glance, and — critically for a calm app — two dated photos beside each
  other is the **least dramatic** framing (no reveal, no wipe).
- **Before/after slider frozen at a fixed divider.** A single diagonal/vertical
  seam with the earlier photo on one side, later on the other. `[INFERRED]`
  *Reject as default.* Exported static, a frozen wipe reads as one half-and-half
  photo with a mysterious seam — it looks like a mis-registration, not a
  comparison, unless the two shots are pixel-identical in pose (they never are).
  It is also the most "transformation-coded" format (`M1` §C1) — wrong register.
- **Stacked (one above the other).** Earlier on top, later below. `[INFERRED]`
  *Keep as the STORY (9:16) variant only.* Two portrait photos stacked in a tall
  9:16 frame each get a natural landscape-ish cell; side-by-side in 9:16 makes
  each photo a thin sliver. So: **side-by-side for square/feed, stacked for
  story.**

**Recommendation.** DEFAULT = **side-by-side two-up**. Offer **stacked**
automatically as the story-format composition (the screen already switches
layout by `isSquare`, `drawShareCard.js:112`). Do **not** ship a frozen-slider
export.

---

### A2. Stat placement (2 dates + 2 weights + elapsed-time badge)

The composition problem is *which stat belongs to which photo*. Solve it by
**anchoring per-photo stats to their photo, and the shared stat to the pair:**

- **Per-photo caption plate.** At the **bottom of each photo cell**, a short
  scrim bar (`rgba(bg0, 0.62)`, the existing photo-scrim tone, `drawShareCard.js:146`)
  carrying that photo's **date · weight**, e.g. `3 Mar 2026 · 82.4 kg`. Because
  it sits *on its own photo*, there is zero ambiguity about which weight is
  which — the single biggest legibility win. Weight uses **tabular figures**
  (`type.num()`, `theme.js:495`) so digits don't jitter. Weight is the
  toggle-able / suppress-able element (§0). `[INFERRED]`
- **Elapsed-time badge = the quiet headline.** Elapsed time belongs to *the
  pair*, not either photo, so it is the one **centred** element: a hairline-
  bordered pill at the **top**, reading `14 WEEKS` (reuse the intensity-badge
  construction, `drawIntensityBadge` `:189-203`: fill `rgba(accent,0.125)`,
  stroke `rgba(accent,0.38)`, centred caps text). This is the emotional anchor,
  stated neutrally as *time elapsed* — never "transformation", never an arrow.
  `[INFERRED]`
- **Scrims/plates rule.** Text over a photo gets a plate **only where it sits**
  (a bottom caption bar), never a full-frame dark veil that muddies the image.
  Text in the header/footer sits on the card's own gradient, no plate needed.
  Photo-dominant: plates are ~14-18% of each cell's height, not more.
  `[INFERRED]`

Layout order, top→bottom: amber accent bar → centred `14 WEEKS` badge → two
photo cells (each with its date·weight caption plate) → footer wordmark block.
Uncluttered, photo-led, every number unambiguous.

---

### A3. Wordmark / branding — marketing, not a watermark

Use the **existing `drawFooter`** unchanged (`drawShareCard.js:163-187`): a
**centred** wordmark sized to ~23% of card width, the `SMARTER TRAINING` amber
tagline, an amber underline, and `volyume.app` on the story format. `[DOCUMENTED:
code]` This already reads as a **logo lock-up / brand sign-off**, the way a good
poster is signed at the foot — not a defensive stamp.

Premium-vs-cheap tells for branding specifically `[INFERRED]` / `[OBSERVED]`:

- **One brand moment, at the foot.** A single centred wordmark = marketing. A
  **repeated/tiled/diagonal watermark** across the photos = cheap, defensive,
  and gets cropped out (which *kills* the growth loop — §B7). Strava's branded
  activity cards spread precisely because the mark is a tasteful single lock-up
  people don't feel compelled to crop. `[OBSERVED]`
- **Never overlay the wordmark on a body.** Keep it in the footer band on the
  card's own background, never floating on the photo.
- **Legible but not shouty:** the amber wordmark on near-black is on-brand and
  readable at feed-thumbnail size, which is what makes it discoverable when
  reshared.

---

### A4. Premium-vs-cheap checklist (typography, spacing, framing, gutter, radius)

**Premium tells** `[INFERRED]` (grounded in the code + MacroFactor's harmonised
finish `[DOCUMENTED]` and the MFP clunk report `[OBSERVED]`):

- **Identical cells.** Both photos rendered to the *same* cell size and the
  *same* `drawImageCover` centre-crop treatment — equal width, equal height,
  equal radius. Mismatched cell sizes/crops is the #1 cheap tell.
- **Consistent 16-px corner radius** on both cells (house card radius,
  `radius.lg`, `theme.js:309`).
- **Hairline gutter** between the two cells (~`round(14*s)`, the stat-box gap
  `:208`), not a fat dead band; a single divider hairline, `PALETTE.divider`.
- **Neutral, harmonised background** behind the photos — the near-black house
  gradient (or MacroFactor's "match the photo tones" option) so the eye stays on
  the bodies, not the chrome. `[DOCUMENTED: MacroFactor dynamic theming]`
- **Generous outer padding** (`W*0.074`) — the app's existing breathing room.
- **Tabular figures** for weights and dates (`type.num`), British date format
  (`3 Mar 2026`, matching `formatLongDate`, `ShareCardScreen.js:145-150`).
- **No hype furniture:** no "BEFORE/AFTER" banner, no arrows, no fire/percent
  badges, no drop-shadow pile-up (the materials policy forbids shadow-as-
  elevation in dark; use the surface ladder, `theme.js:9-14`).

**Cheap tells to avoid** `[OBSERVED]` / `[INFERRED]`:

- Two photos at **different crops/zoom/aspect** so the pair looks like two
  unrelated pictures (this is what makes a frozen slider fail, §A1).
- **Broken/inconsistent scaling** — MFP's Android progress-photo zoom bug is the
  canonical "instantly cheap" data point. `[OBSERVED]`
- A **full-frame dark veil** over the photos to force text legibility (kills the
  image); use per-caption plates instead.
- **Tiled/diagonal watermark**; wordmark on the body; clashing non-token colours.
- Clutter: dates+weights floating loose in the header where the viewer must
  guess which belongs to which photo (§A2 solves this).

---

### A5. Aspect ratios per platform + composing two PORTRAIT photos

Platform specs (2026) `[DOCUMENTED]`:

- **IG feed portrait:** upload **1080×1350, 4:5** (Instagram's recommended feed
  ratio; portrait out-performs square/landscape for feed real estate).
- **IG profile grid crop:** now **3:4** — the grid crops a 4:5 post, so **keep
  key content centred** to survive the grid preview.
- **Square:** **1080×1080, 1:1.**
- **Stories / Reels:** **1080×1920, 9:16**, full-bleed.

**Composing two PORTRAIT body photos without ugly crops** `[INFERRED]`:

- **Side-by-side in 1:1 or 4:5 is ideal** for two portraits: each cell becomes a
  half-width column (~1:2 proportion) — a *naturally portrait* cell that a
  portrait body photo fills with almost no crop via `drawImageCover`. This is
  why square/feed side-by-side works and story side-by-side does not.
- **Story (9:16): stack** the two portraits (each cell ~landscape); side-by-side
  would slice each to a sliver.
- The system currently supports **square (default) + story (9:16)**
  (`cardHeight`, `drawShareCard.js:481-483`). Adding **4:5 portrait** is a
  one-line `cardHeight` case (`H = round(W*5/4)`) and is worth it: 4:5 is IG
  feed's recommended ratio and gives the two portraits the most vertical room.

**Recommendation.** Ship **three formats for this card type:**
1. **Square 1:1 — the DEFAULT** (house default `ShareCardScreen.js:79`, posts
   cleanly everywhere, survives the 3:4 grid crop when content is centred,
   side-by-side reads perfectly). Universal, calmest, lowest-risk.
2. **Portrait 4:5** — offered for users optimising an IG **feed** post
   (max real estate; small `cardHeight` addition). Side-by-side.
3. **Story 9:16** — stacked variant, the existing share-sheet-to-Stories route.

Keeping square the default honours the house convention and the founder's
prior "square default" direction; 4:5 and story are the *offered alternatives*.

---

## PART B — SHAREABILITY AS A BRANDED GROWTH LOOP

### B6. What makes someone genuinely WANT to post (not merely be able to)

`[INFERRED]` from the calm-design north star + `[DOCUMENTED]` category behaviour:

- **The intrinsic pull is seeing your own two photos, dated, side by side.** For
  a calm app the proud moment is the *user's own realisation* looking at the
  comparison — not an app-manufactured "milestone unlocked!". The card's job is
  to make that private realisation **cleanly shareable**, then get out of the
  way. Offer, never engineer, the moment.
- **Natural proud moments** where a Share affordance should simply *exist*
  (always available, never popped): (a) the instant a user builds a comparison
  in the progress-photo comparison view (`M1` P1 two-up — the exact surface this
  card exports); (b) when a user opens a check-in they chose to view; (c) an
  elapsed round-number they'll notice themselves ("12 weeks", "6 months") — shown
  as a quiet, dismissable affordance *inside the comparison view they already
  opened*, never a push.
- **Private sharing is the dominant real use.** MacroFactor's own framing is
  *"send your before-and-after to a trainer, coach, or friend"* first, social
  second. `[DOCUMENTED]` The biggest "want to share" is a **1:1 send to a coach
  or friend** — design for that (the share-sheet already covers it), don't
  assume every share is a public post.

### B7. How branded cards drive DISCOVERY when reshared (the free loop)

`[OBSERVED]` / `[INFERRED]`:

- **The loop:** user reshares the card → the footer wordmark + `SMARTER
  TRAINING` + `volyume.app` are seen by the poster's followers → a viewer who
  likes the clean, calm look searches the name / taps the handle → install. The
  **legible-but-tasteful wordmark IS the marketing spend** — zero cost, runs on
  the user's own proud moment.
- **Real precedent:** Strava's branded activity/route cards and MacroFactor's
  harmonised before/after images circulate on IG and Reddit *with the brand
  visible* precisely because the mark is a single tasteful lock-up people don't
  crop. `[OBSERVED]` The failure mode is the opposite: an aggressive tiled
  watermark gets cropped or screenshots-around, and the loop breaks — reinforcing
  §A3's "one brand moment, at the foot."
- **Design implication:** the footer must survive a **feed thumbnail** (small,
  centred, high-contrast amber-on-black) and must **never** be on a body (crop
  bait). Restraint *is* the growth strategy.

### B8. Platforms this audience posts to + each format's conventions

`[DOCUMENTED]` / `[OBSERVED]`:

- **IG feed** — 4:5 (1080×1350); grid crops 3:4, centre key content. The card as
  a clean single feed post.
- **IG / FB Stories** — 9:16 stacked; the **existing** share-sheet route
  (`handleShareToStories`, `ShareCardScreen.js:307`). No new dependency, no
  Facebook App ID (founder decision already recorded, `:299-306`).
- **Reddit r/progresspics** — **side-by-side collage is the native format**, and
  the subreddit's standardized title carries the exact stats this card shows:
  `Gender/Age/Height [Weight before > after = delta] (time period) title`, e.g.
  `M/28/5'10" [90kg > 78kg = 12kg] (14 weeks)`. `[DOCUMENTED]` The card's
  on-image dates/weights/elapsed **align cleanly** with what the community
  expects. *Caveat:* Reddit is skeptical of app self-promo — a **small tasteful**
  wordmark is fine; an aggressive brand stamp gets called out. Square or 4:5
  both accepted.
- **DM / WhatsApp / email to a coach or friend** — the dominant *private* share
  (MacroFactor's primary framing). `[DOCUMENTED]` The share-sheet already serves
  this; it needs no branding restraint but benefits from it anyway.

### B9. THE ANTI-PATTERN — exactly what to NEVER do

The research on fitness apps is unambiguous: **nagging, guilt, streaks and
shame-framing demotivate users and drive uninstalls** — *"when notifications
start feeling like nagging, users either mute them or uninstall,"* and
shame/streak pressure *"leads users to give up entirely — the opposite of what
these tools are supposed to do."* `[DOCUMENTED: studyfinds / Newsweek / PMC]`
For an ED-safe app this is doubly disqualifying (weight/food-adjacent
suppression, calm voice).

**NEVER (hard rules for this card):** `[INFERRED]` from the constitution + the
evidence above:

- **No push/notification nagging to share** ("You haven't shared your
  progress!", "Share your 14-week milestone!"). Weight/food-adjacent
  notifications are suppressed under an ED flag anyway; a share-nag is banned
  outright regardless of flag.
- **No guilt or streak framing** ("Don't break your sharing streak", "Your
  friends are sharing").
- **No share-gating** — never lock a feature/reward behind sharing; no
  "share to unlock".
- **No auto-generated hype** — no pre-filled captions, no "🔥 Incredible
  transformation!", no arrows, no "before → after", no %-change readout, no
  auto-added app-promo text the user didn't write.
- **No default-public anything.** Every share is an explicit user tap, opt-in,
  originating from a surface the user already chose to open.
- **No transformation-culture register** — neutral, date-led, calm; the elapsed
  badge says time, not triumph (`COACHING_VOICE_SYNTHESIS_LOCKED.md`).

**Instead:** the card **earns** its shares by being genuinely share-worthy, and
is **offered — never pushed** — as a quiet, always-available affordance at the
natural proud moment (the user viewing their own comparison). Availability, not
persuasion.

---

## RECOMMENDED CARD DESIGN DIRECTION (mapped onto the Skia system)

**Add one `cardType: 'progress'` branch** to `drawShareCard()` (a new
`drawProgress()`, sibling to `drawSession/drawPR/drawMilestone/drawWeeklyRecap`),
reusing the existing primitives. No new dependency; no second renderer.

- **Formats:** `square 1:1` (DEFAULT) · `portrait 4:5` (one-line `cardHeight`
  addition, `H=round(W*5/4)`) · `story 9:16` (existing). Square/4:5 →
  **side-by-side**; story → **stacked**.
- **Frame:** 8-px amber `drawAccentBar`; near-black gradient `drawBackground`;
  `pad = round(W*0.074)`.
- **Top:** centred **`14 WEEKS`** elapsed badge — intensity-badge construction
  (`rgba(accent,.125)` fill, `rgba(accent,.38)` hairline stroke, caps).
- **Photos:** two equal cells via a new `drawPhotoCell` wrapping `drawImageCover`
  (centre-crop cover), 16-px radius, hairline `PALETTE.divider` gutter
  (`~14*s`). Both photos identical cell size + identical crop treatment.
- **Per-photo caption plate:** bottom scrim bar (`rgba(bg0,0.62)`) with
  `DATE · WEIGHT` in tabular figures; British date; weight toggle-able +
  suppress-able (§0).
- **Footer:** existing `drawFooter` untouched — centred wordmark +
  `SMARTER TRAINING` + amber underline (+ `volyume.app` on story).
- **Colour/type/spacing:** entirely from the whitelisted `PALETTE` (which mirrors
  `theme.js`: accent `#F5A623`, gold `#FFD700`, bg0 `#0D0D0D`, text hierarchy
  `#FFF/#9E9E9E/#9B9B9B`), measured system typeface, `fitFont`/`wrapText`,
  `radius.lg`=16, `pad`=`W*0.074`.
- **E15 materials:** **no glow/bloom** (policy: the only sanctioned glow is Home
  Start); depth from surface ladder + hairline borders + photo scrims only.
- **ED-safety:** reuse the `suppress` path (ED flag / calm mode) to strip weights
  and hide the toggle; card-specific privacy note; name/measurements never
  included. Founder to decide strip-weights vs withhold-card under an open flag.

---

## PREMIUM / CHEAP CHECKLIST (build-time QA)

**Premium ✓**
- [ ] Both photo cells identical width, height, radius (16), crop treatment
- [ ] Hairline gutter + single divider, not a fat dead band
- [ ] Elapsed badge centred (belongs to the pair); date·weight anchored on each
      photo (unambiguous)
- [ ] Neutral harmonised background; photos are the hero
- [ ] Tabular figures; British date format
- [ ] One brand moment, centred, at the foot; survives a feed thumbnail
- [ ] Per-caption scrim plates only; no full-frame veil
- [ ] No glow/bloom (materials policy); depth via surface ladder + hairlines
- [ ] Calm register: elapsed time stated, no arrows/%/"before-after"/hype

**Cheap ✗ (reject)**
- [ ] Mismatched crops/zoom/aspect between the two photos
- [ ] Tiled/diagonal/on-body watermark (crop bait, breaks the loop)
- [ ] Loose header stats where "which weight is which" is ambiguous
- [ ] Full dark veil over the photos
- [ ] Frozen-slider export (reads as mis-registration)
- [ ] Non-token colours, shadow-as-elevation, hype furniture

---

## GROWTH-LOOP DESIGN (summary)

- **Natural share moments (offer, never push):** always-available Share
  affordance inside the progress-photo **comparison view** (the surface this
  card exports); on a check-in the user opened; on a round-number elapsed period
  they'll notice — all quiet, dismissable, in-context. **Zero notifications.**
- **Branding for discovery:** single tasteful footer lock-up (wordmark +
  `SMARTER TRAINING` + `volyume.app`), legible at thumbnail size, never on a
  body, never tiled — so it survives reshare and drives search/install (the
  Strava/MacroFactor loop).
- **Opt-in / no-nag rules:** explicit user tap only; no share-gating; no
  pre-filled hype captions; no default-public; no guilt/streaks; weight
  toggle-able and ED-suppress-able. The card earns shares by being
  share-worthy.

---

## SOURCES

- VOLYUME code (read): `src/lib/shareCard/drawShareCard.js`,
  `src/screens/ShareCardScreen.js`, `src/styles/theme.js`,
  `research/progress-photos/M1-comparison-ux.md`,
  `docs/decisions-2026-07-02-e15-e8-e9.md`, `CLAUDE.md`.
- MacroFactor — Create/share before-and-after (stacked builder, background
  eyedropper, share-sheet, "send to trainer/coach/friend"):
  https://help.macrofactorapp.com/en/articles/123-how-to-create-and-share-before-and-after-photos
- MacroFactor — Body metrics & progress photos (dynamic harmonised theming):
  https://macrofactor.com/body-metrics/
- MyFitnessPal — Progress Photos FAQ (side-by-side comparison builder):
  https://support.myfitnesspal.com/hc/en-us/articles/360032625271-Progress-Photos-FAQs
- MyFitnessPal — Android progress-photo zoom bug (cheap-tell datapoint):
  https://community.myfitnesspal.com/en/discussion/10828258/android-zooming-on-progress-photos
- r/progresspics standardized title format (Gender/Age/Height [before>after=Δ]
  (time) title): https://smoothiegains.com/information-about-the-tops-r-progresspics-posts/ ,
  https://medium.com/@acedb/what-is-being-posted-on-r-progresspics-an-initial-analysis-351e43b5d7c4
- Instagram 2026 sizes — feed 4:5 (1080×1350), grid crop 3:4, square 1080²,
  stories 9:16 (1080×1920): https://buffer.com/resources/instagram-image-size/ ,
  https://www.heyorca.com/blog/instagram-media-specs-best-practices-2026
- Fitness-app nagging / guilt / streak anti-pattern (demotivation, uninstalls):
  https://studyfinds.org/fitness-app-motivation-study-myfitnesspal/ ,
  https://www.newsweek.com/fitness-apps-study-says-they-can-do-more-harm-than-good-10913928 ,
  https://pmc.ncbi.nlm.nih.gov/articles/PMC6604512/

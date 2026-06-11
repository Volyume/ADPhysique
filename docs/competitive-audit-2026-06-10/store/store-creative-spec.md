# Volyume — Store Creative & Conversion Spec

_Store conversion layer: creative + conversion mechanics. Companion to the
listing-copy / keyword work. Covers BOTH stores (Google Play live; Apple
build 14 in Beta App Review)._

**Author note / scope:** this is a research + content spec. No app code touched.
British English throughout, no hype, no em dashes, honest claims only. All
feature claims here respect the FREE vs PRO gating in CLAUDE.md (Pro features are
labelled Pro; free features are never gated behind Pro in creative).

**Input-availability note:** the brief referenced four source files under
`docs/competitive-audit-2026-06-10/` (the baseline, monetisation-research,
onboarding-research, and `impl-COMP-012-trust-row.md`). None of these exist in
the repo at time of writing — the `competitive-audit-2026-06-10/` directory did
not exist until this spec created the `store/` subfolder. This spec is therefore
built from the two live listing docs (`docs/PLAY_STORE_LISTING.md`,
`docs/APP_STORE_CONNECT_LISTING.md`) and verified in-code facts (calorie floors,
the 1.5%/week rapid-loss gate, on-device scanning, offline-first, no data sold).
Where a "verified trust claim" is used below, its in-repo source is cited so the
founder can confirm before it ships in store creative. If the missing audit files
surface later, reconcile any divergent trust claims against them.

---

## 0. The three things this spec decides

1. **The first three screenshots** (90% of visitors never scroll past #3; the
   first three carry the install decision).
2. **The single highest-leverage conversion move** (Google Play Store Listing
   Experiments on the short description + first screenshot — free, native,
   already available on the live listing).
3. **How to show the honesty / safety moat** without it reading as worthy-but-dull
   and without tripping health-claims policy.

---

## 1. Screenshot strategy — what the research says

- **First three screenshots decide the install.** By 2025 roughly 90% of store
  visitors do not scroll past the third screenshot; the first three form a
  mini-story (Value -> Flow -> Trust). [asomobile.net, 2025] [medium/AppScreenshotStudio, 2026]
- **Caption-led beats pure UI.** Short, benefit-driven captions lift page
  conversion by ~20-35% over bare screenshots. Since June 2025 Apple indexes the
  text Apple reads from screenshot captions as searchable metadata, so captions
  now also feed ASO — another reason to lead with words, not chrome.
  [medium/AppScreenshotStudio, 2026] [apptweak.com, 2025]
- **Portrait, device-framed, first frame readable at thumbnail size.** Fitness
  category norm is 9:16 portrait, light device frame, one idea per panel, caption
  in the top third so it survives the gallery crop.
- **Show the unique thing.** Generic "track your workouts" panels are
  table-stakes; the panels that convert show what only this app does. For Volyume
  that is the coach that pauses a cut, the offline-first logging, and "your data
  is never sold". Lead with the category term (discoverability), then pivot fast
  to the moat.
- **Best-in-class read:** Hevy leads on fast, clean set-logging (speed as the
  promise); Strong leads on the log screen itself; Fitbod leads on the
  data-driven "adjusts to you" coaching; MacroFactor leads on the
  adaptive-coaching/macros combination. The pattern: panel 1 = the single
  clearest promise in plain words, not a feature tour. Volyume's plain-words
  promise is "one app for lifting, food and progress" with the honesty hook close
  behind. [gymgod.app, 2026] [findyouredge.app, 2026]

---

## 2. House voice for captions

Rules (from CLAUDE.md): British English (colour, optimise, behaviour); no hype;
no em dashes; honest, plain numbers, no fluff; never call a Pro feature free or
vice versa; no AI claims (the coaching engine is deterministic); no medical
claims (see section 7).

- Short. One idea. Ideally under ~45 characters so it survives the thumbnail.
- Benefit first, mechanism second. "Know if you're progressing. Last set shown
  inline." not "Inline previous-performance display".
- Numbers over adjectives. "400+ exercises", "14 days free, no card".
- Mark Pro panels with a small "Pro" tag in the frame, never in a way that reads
  as a free feature.

---

## 3. Recommended screenshot sequence (8 panels, both stores)

The same 8-panel sequence works for Apple (iPhone 6.9" required, 6.5"
recommended) and Google Play (phone, 9:16). Panels 1-3 are the conversion core
and must stand alone. Panels 4-8 deepen for the scrollers.

For each panel: the on-screen UI, the recommended caption, and 2-3 caption
variants for the key panels (1-3, plus the coaching and safety panels) so the
founder can A/B them.

### Panel 1 — The promise (FREE surface) — CONVERSION CORE
- **On screen:** Train home / weekly overview. Clean, real data. Light device
  frame, dark UI.
- **Recommended caption:** `One app for lifting, food and progress.`
- **Variants:**
  - `Log every set. Track every meal. One app.`
  - `Workout tracker, food diary and coaching in one.`
  - `Train, eat and track without three apps.`
- **Why:** leads with the category benefit (discoverability: "workout tracker")
  and the all-in-one white-space claim, in plain words.

### Panel 2 — The flow (FREE surface) — CONVERSION CORE
- **On screen:** Active workout, a set being logged, rest timer counting, previous
  set shown inline. This is the most-used screen and the speed promise.
- **Recommended caption:** `Log a set in seconds. Last time shown inline.`
- **Variants:**
  - `Fast gym logging. Rest timer starts itself.`
  - `Know if you're progressing, set by set.`
- **Why:** mirrors Hevy/Strong's winning "speed of logging" lead while keeping it
  honest and free-tier.

### Panel 3 — The moat (Pro) — CONVERSION CORE
- **On screen:** Coach output screen showing a real adjustment ("calories held",
  or "added a set to back"), with the plain-English reason text visible.
- **Recommended caption:** `Coaching that tells you exactly what changed and why.`
- **Variants:**
  - `A weekly check-in adjusts your plan. In plain numbers.`
  - `Your plan moves with your progress, not a guess.`
- **Why:** panel 3 is the "trust" slot in the Value-Flow-Trust arc. Volyume's
  trust differentiator is transparency of the coaching, so show the reason text,
  not just a number. Tag "Pro".

### Panel 4 — The honesty hook: the cut that pauses (Pro)
- **On screen:** The coach "held" state. Real copy from the app: weight dropped
  too fast, so the cut is paused, with the plain-language explanation and the
  support signpost visible but not lurid.
- **Recommended caption:** `It would rather pause your cut than push you.`
- **Variants:**
  - `Drops too fast, your cut pauses. On purpose.`
  - `Most apps keep cutting. This one stops.`
- **Why:** this is the single most differentiated thing the app does and the
  strongest trust signal. See section 6 for how to keep it converting rather than
  worthy, and section 7 for the health-claims guardrails. Tag "Pro".

### Panel 5 — Offline-first (FREE surface)
- **On screen:** Logging working with an airplane / no-signal indicator visible;
  data on device.
- **Recommended caption:** `Works with no signal. Your phone is the source of truth.`
- **Variants:**
  - `No internet needed. Logs in the basement gym.`
- **Why:** offline-first is an architectural moat (CLAUDE.md) and a concrete
  gym-life benefit. Plain, visual, easy to believe.

### Panel 6 — Food diary + on-device scan (Pro)
- **On screen:** Food diary, daily macro rings, barcode scan in progress.
- **Recommended caption:** `Scan a barcode. Hit your macros. Read on your device.`
- **Variants:**
  - `Food diary, barcode scan and macros that fit your phase.`
- **Why:** "read on your device" doubles as the privacy proof (camera processed
  on-device, no image uploaded — matches the Data Safety declaration). Tag "Pro".

### Panel 7 — Progress (FREE surface)
- **On screen:** Volume by muscle group + weight trend + a personal best.
- **Recommended caption:** `See what is actually changing, not just what you did.`
- **Variants:**
  - `Volume by muscle, weight trend, personal bests.`

### Panel 8 — Privacy + trial (mixed)
- **On screen:** A clean trust panel: no social feed, data never sold, CSV export,
  plus the trial terms.
- **Recommended caption:** `Your data is never sold. Try Pro free for 14 days, no card.`
- **Variants:**
  - `No feed. No selling your data. Export anytime.`
- **Why:** closes on the two strongest no-objection closers (privacy + a riskless
  trial). Keep the trial wording identical to the listing copy.

**Store-specific note:** Apple captions are the screenshot image text (Apple
indexes it since June 2025), so bake the caption into the rendered PNG. Google
Play has no separate caption field either — same approach (text on the image).
Keep the rendered caption text identical across both stores for consistency, then
let the Store Listing Experiment (section 5) vary panel 1.

---

## 4. App preview video — does it move the needle here

- **Yes, for this category.** Adding a preview video to an otherwise-identical
  App Store page has shown ~20% (and, post-autoplay, materially higher)
  conversion lift; effect is strongest for "complex / new-to-market" apps, which
  describes an all-in-one coaching app with a non-obvious moat.
  [splitmetrics.com, 2025] [appdemovideos.com, 2025]
- **Apple:** up to 3 app previews, autoplay muted in the gallery, so the first
  ~3 seconds must read with no sound and carry an on-screen line.
- **Google Play:** a single YouTube link (not a native muted autoplay), so treat
  Play's video as a secondary asset; the screenshots do the heavy lifting on Play.
- **Cost-realistic for a solo founder:** screen-recording based, no film crew.
  Record real device captures of the actual screens, add text overlays and a low
  instrumental bed in any basic editor. Budget: one afternoon.

### Preview shot list (15-25s, 9:16, muted, on-screen text carries it)

| Seconds | On screen | Overlay text |
|---|---|---|
| 0-3 | Active workout, a set logged, rest timer starts | `Log a set in seconds.` |
| 3-7 | Coach output: an adjustment with its plain-English reason | `A weekly check-in moves your plan.` |
| 7-11 | The "held" / paused-cut state, reason visible | `It pauses your cut before you overdo it.` |
| 11-15 | Logging with no-signal indicator | `Works with no signal.` |
| 15-19 | Food diary + barcode scan + macro rings | `Food, macros, barcode. (Pro)` |
| 19-22 | Volume by muscle + weight trend | `See what is actually changing.` |
| 22-25 | Icon + `Free for 14 days, no card` + store badge | `Volyume.` |

Keep the first 3 seconds (the autoplay-visible window) as the single clearest
free-tier promise. Do not lead the video with a Pro feature.

---

## 5. Conversion mechanics — the levers, per store

### Highest-leverage move (do this first)
**Google Play Store Listing Experiments on the short description + panel 1.**
It is native, free, runs against real traffic on the already-live listing, and
the short description is the single most impactful Play conversion lever. Test
the three listing-copy title/short-description variants here before locking
anything. [apptweak.com, 2025] [appradar.com, 2025] Main listing allows up to 5
concurrent experiments. This is the recommended #1 because Play is already live
and earning, so a win compounds immediately.

### Google Play
- **Store Listing Experiments (A/B):** test short description, feature graphic,
  icon, first screenshot, and the YouTube video independently. Document each as a
  one-variable test.
- **Custom Store Listings (CSLs):** up to 50 pages, 5 experiments each. Use these
  for distinct audiences (see section 8). New in 2025: can target churned users
  (downloaded >28 days ago, not opened in 28). [phiture.com, 2025] [asomobile.net, 2025]
- **Short description is the conversion lever**, not just keyword space — first
  impression after the title.

### Apple (build 14 going live)
- **Custom Product Pages (CPPs):** Apple's own page now states **up to 70**
  additional product-page versions (the brief's "35" is out of date — flag).
  Each can vary screenshots, app previews and promotional text, carry its own
  keyword assignment, and (iOS 18+) a per-page deep link. Since July 2025 CPPs can
  surface in organic keyword search, not just paid/owned channels.
  [developer.apple.com/app-store/custom-product-pages, fetched 2026-06-11]
- **Promotional Text (170 chars, no review needed):** the only field you can
  change without resubmitting. Use it for time-sensitive lines (trial terms,
  "new this week") so the description stays stable.
- **Name (30) + Subtitle (30) + Keyword field (100):** the three indexed fields.
  Do not repeat words across them (no double-indexing benefit). See the companion
  `apple-listing-correction.md` for the exact values.
- **In-App Events:** can appear on the product page and in search/Today; a
  realistic Volyume event is a coaching/check-in themed event, but only if it is a
  genuine in-app moment. Lower priority than CPPs and the video for a solo founder.
- **App preview (up to 3, muted autoplay):** ship at least one (section 4).

---

## 6. The honesty angle — making trust convert, not bore

The risk: "it refused to cut my calories", "works with no signal", "your data is
never sold" can read as worthy-but-dull. How to keep them converting:

- **Show the moment, not the value.** Don't caption "we care about safety";
  show the actual paused-cut screen with its real reason text (panel 4). A
  product doing a surprising thing on screen converts; a virtue statement does
  not.
- **Frame as a benefit to the user's goal, not a moral.** "It would rather pause
  your cut than push you" reads as the app being on your side, which serves the
  physique goal, rather than as a lecture.
- **Use contrast sparingly and honestly.** "Most apps keep cutting. This one
  stops." is a true category contrast and converts on differentiation, but do not
  name competitors and do not overuse the trope.
- **Make the abstract concrete and visual.** Offline = a no-signal indicator in a
  real gym log. Privacy = "read on your device" shown on the scan screen. Trust
  claims convert when they are demonstrated in UI, not asserted in prose.
- **Trust vs flash:** for a small indie app with a real moat, trust converts the
  considered buyer (the serious lifter comparing 3 apps), which is exactly
  Volyume's audience. Lead 1-2 with the relatable promise/flow (broad appeal),
  then let 3-5 carry the trust differentiators that win the comparison.

---

## 7. ED-safety positioning — the genuine constraint (read before writing creative)

The app has hard calorie floors (1,500 kcal men, 1,200 kcal women) and a
1.5%/week rapid-loss gate with Beat UK signposting (CLAUDE.md; in-code at
`src/lib/nutritionEngine.js` and the MOVE_* docs). Positioning the safety stance
in store creative carries two real risks:

1. **Health-claims / metadata policy risk.** Apple rejects unverifiable health
   claims in metadata and requires apps to disclose methodology behind accuracy
   claims; subtitles "should not make unverifiable product claims".
   [developer.apple.com/app-store/review/guidelines, 2026] Google's Health apps
   policy is similar. **Do not** phrase the safety system as preventing,
   treating, or protecting against eating disorders, or as a medical safeguard.
   That is a health claim and an over-reach.
2. **Wrong-audience risk.** Research shows weight/fitness-tracking apps can feed
   disordered eating, and ED-recovery marketing on ad platforms is restricted.
   [Beat, 2025] [ScienceDirect 2024 systematic review] Lurid "we stop eating
   disorders" creative can both trip policy and attract distressed users the app
   is not a treatment for.

**Safe positioning (what TO say):**
- Frame it as the coach being conservative and evidence-led: "It would rather
  pause your cut than push you" (a behaviour of the product, not a medical claim).
- "Changes hold until there is real data" — accuracy/conservatism, not treatment.
- Keep the existing "Not medical advice" disclaimer in the description (already
  present in both listing docs — keep it).

**Avoid (what NOT to say) in any store field, screenshot, or video:**
- Any wording that says the app prevents, detects, treats, screens for, or
  protects against eating disorders or any condition.
- Specific calorie-floor numbers as a marketing boast ("never below 1,200 kcal").
  State conservatism qualitatively; the numbers live in the app, not the store.
- "Safe weight loss", "healthy weight loss" as a promised outcome — outcome
  claims invite the unverifiable-claim rejection.

**FLAG — needs a health-claims compliance check before publishing:** panel 4's
caption and any promotional-text or description line that touches the
pause-the-cut behaviour. Recommended reviewer: read against Apple Review
Guideline 1.4.1 / 5.x health and the Google Play Health apps policy. The
companion `apple-listing-correction.md` marks the specific strings.

---

## 8. Custom page / audience recommendations

Distinct audiences worth a CPP (Apple) or CSL (Play). Keep each page's visuals
matched to the channel that drives to it (consistency between ad creative and
landing page is the documented CPP conversion driver). [mobileaction.co, 2025]

| Page / audience | Lead panel + caption focus | Channel |
|---|---|---|
| **Default** | Panel 1 all-in-one promise | Organic search |
| **Serious lifters / physique** | Panel 3 coaching + panel 4 honesty | Lifting-content social, Reddit |
| **Macro / nutrition searchers** | Panel 6 food diary + macros, deep-link to diary | "macro tracker" keyword, nutrition channels |
| **Privacy / offline-minded** | Panels 5 + 8 (offline, data never sold) | Privacy-leaning communities |
| **Churned re-engagement (Play only)** | Panel 3 "what changed since you left" | Play churned-user targeting |

Deep-link (iOS 18+) each CPP to the matching in-app destination so discovery
lands on value, not the home screen.

---

## 9. Build checklist

- [ ] Render 8 screenshot PNGs per store size with baked-in captions (panels 1-3
      first; they carry the install).
- [ ] Produce one 15-25s muted preview (Apple); reuse as a YouTube link (Play).
- [ ] Apple: set up the default page + 4 CPPs (section 8), assign keywords +
      deep links.
- [ ] Play: queue panel-1 + short-description Store Listing Experiment as the
      first test (highest-leverage move).
- [ ] Route panel 4 / pause-the-cut copy through a health-claims compliance
      check (section 7) before it ships.
- [ ] Confirm every Pro panel is tagged Pro; confirm no free feature is shown as
      Pro-gated.

---

## Sources

- Screenshots / first-three / caption-led:
  https://asomobile.net/en/blog/screenshots-for-app-store-and-google-play-in-2025-a-complete-guide/ (2025);
  https://medium.com/@AppScreenshotStudio/app-store-screenshots-that-convert-the-2026-design-guide-4438994689d6 (2026);
  https://www.apptweak.com/en/aso-blog/how-to-optimize-your-app-screenshots (2025)
- Preview video:
  https://splitmetrics.com/blog/create-app-preview-video-app-store-ios/ (2025);
  https://www.appdemovideos.com/do-app-preview-videos-increase-conversions/ (2025)
- Apple Custom Product Pages (primary):
  https://developer.apple.com/app-store/custom-product-pages/ (fetched 2026-06-11)
- Google Play experiments / CSLs:
  https://www.apptweak.com/en/aso-blog/store-listing-experiments-a-guide-to-play-store-a-b-testing (2025);
  https://phiture.com/asostack/google-play-custom-store-listings/ (2025);
  https://asomobile.net/en/blog/custom-store-listing-in-google-play/ (2025)
- Health-claims policy:
  https://developer.apple.com/app-store/review/guidelines/ (2026)
- ED / responsible-marketing risk:
  https://www.beateatingdisorders.org.uk/get-information-and-support/about-eating-disorders/research/online-advertising-and-eating-disorders/ (2025);
  https://www.sciencedirect.com/science/article/pii/S174014452400158X (2024)
- Best-in-class app context:
  https://gymgod.app/blog/macrofactor-vs-hevy (2026);
  https://www.findyouredge.app/news/best-strength-training-apps-2026 (2026)
